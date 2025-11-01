import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { SignJWT } from 'jose'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

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
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info:', await userInfoResponse.text())
      return NextResponse.redirect(new URL('/login?error=user_info_failed', request.url))
    }

    const googleUser = await userInfoResponse.json()

    await connectDB()

    // Check if user exists
    let user = await User.findOne({ email: googleUser.email }).populate('employeeId')

    if (!user) {
      // Create new user using the create-user API logic
      const createUserResponse = await fetch(`${request.nextUrl.origin}/api/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: googleUser.email,
          firstName: googleUser.given_name || googleUser.name.split(' ')[0] || 'User',
          lastName: googleUser.family_name || googleUser.name.split(' ').slice(1).join(' ') || '',
          profilePicture: googleUser.picture || '',
          role: 'employee',
          googleId: googleUser.id,
        }),
      })

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json()
        console.error('Failed to create user:', errorData)
        return NextResponse.redirect(new URL('/login?error=user_creation_failed', request.url))
      }

      const createUserData = await createUserResponse.json()
      user = await User.findById(createUserData.user.id).populate('employeeId')
    } else {
      // Update last login
      user.lastLogin = new Date()
      await user.save()
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.redirect(new URL('/login?error=account_deactivated', request.url))
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

    // Return user data
    const userData = {
      id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    }

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Also set user data in cookie for client-side access
    response.cookies.set('user', JSON.stringify(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url))
  }
}

