import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { SignJWT } from 'jose'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    console.log('🔵 Google OAuth Callback - Start')
    console.log('Code received:', code ? 'Yes' : 'No')
    console.log('Error from Google:', error)

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
    }

    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

    // Prepare token exchange parameters
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/google/callback`
    console.log('Redirect URI:', redirectUri)
    console.log('Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
    }

    console.log('✅ Token exchange successful')

    const tokens = await tokenResponse.json()
    console.log('✅ Tokens received')

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text()
      console.error('❌ Failed to get user info:', errorText)
      return NextResponse.redirect(new URL('/login?error=user_info_failed', request.url))
    }

    const googleUser = await userInfoResponse.json()
    console.log('✅ Google user info received:', googleUser.email)

    await connectDB()
    console.log('✅ Connected to database')

    // Check if user exists in database
    let user = await User.findOne({ email: googleUser.email })
    console.log('User found in database:', user ? 'Yes' : 'No')

    // Only allow login if user exists in database
    if (!user) {
      console.log('❌ Google login attempt for non-existent user:', googleUser.email)
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account is deactivated:', googleUser.email)
      return NextResponse.redirect(new URL('/login?error=account_deactivated', request.url))
    }

    console.log('✅ User is active')

    // Fetch employee data separately to avoid populate issues
    let employeeData = null
    if (user.employeeId) {
      try {
        employeeData = await Employee.findById(user.employeeId)
        console.log('✅ Employee data fetched')
      } catch (error) {
        console.error('⚠️ Error fetching employee data:', error)
      }
    }

    // Update last login
    try {
      await User.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } },
        { timestamps: false }
      )
      console.log('✅ Last login updated')
    } catch (error) {
      console.error('⚠️ Failed to update lastLogin:', error)
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const token = await new SignJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    console.log('✅ JWT token created')

    // Prepare user data for response (similar to login API)
    // NOTE: We exclude profilePicture from cookie to avoid size limits
    const userData = {
      id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      // Include employee data if available (excluding profilePicture)
      ...(employeeData && {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        designation: employeeData.designation,
        department: employeeData.department,
        employeeNumber: employeeData.employeeNumber,
      })
    }

    console.log('✅ User data prepared:', {
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName
    })

    // Create response with redirect to auth callback page
    // This page will transfer cookie data to localStorage
    const response = NextResponse.redirect(new URL('/auth/callback', request.url))

    // Set token cookie (httpOnly for security)
    response.cookies.set('token', token, {
      httpOnly: false, // Changed to false so client can read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Set user data in cookie for client-side access
    response.cookies.set('user', JSON.stringify(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    console.log('✅ Google OAuth login successful for:', googleUser.email)
    console.log('🔵 Redirecting to auth callback page to set localStorage')

    return response

  } catch (error) {
    console.error('❌ Google OAuth callback error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url))
  }
}

