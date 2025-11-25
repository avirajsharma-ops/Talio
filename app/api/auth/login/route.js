import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Designation from '@/models/Designation'
import CompanySettings from '@/models/CompanySettings'
import { SignJWT } from 'jose'
import { sendLoginAlertEmail } from '@/lib/mailer'
import { sendPushToUser } from '@/lib/pushNotification'

export async function POST(request) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    console.log('Login attempt for:', email)

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Please provide email and password' },
        { status: 400 }
      )
    }

    // Find user and include password field (without populate to avoid schema error)
    const user = await User.findOne({ email }).select('+password')

    console.log('User found:', user ? 'Yes' : 'No')

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Your account has been deactivated' },
        { status: 401 }
      )
    }

    // Check password using bcrypt comparison
    let isPasswordMatch = false

    try {
      isPasswordMatch = await user.comparePassword(password)
    } catch (error) {
      console.log('Bcrypt comparison failed, trying plain text for legacy users:', error.message)
      // Fallback for legacy users with plain text passwords
      isPasswordMatch = user.password === password

      // If plain text match, update to hashed password
      if (isPasswordMatch) {
        console.log('Legacy user detected, updating password hash')
        user.password = password // This will trigger the pre-save hook to hash it
        await user.save({ validateBeforeSave: false })
      }
    }

    console.log('Password match:', isPasswordMatch)
    console.log('User email:', user.email)

    if (!isPasswordMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last login without triggering full validation (handles legacy data)
    const lastLogin = new Date()
    try {
      await User.updateOne(
        { _id: user._id },
        { $set: { lastLogin } },
        { timestamps: false }
      )
      user.lastLogin = lastLogin
    } catch (error) {
      console.error('Failed to update lastLogin:', error)
    }

    // Create JWT token
    const secretValue = process.env.JWT_SECRET
    if (!secretValue) {
      console.error('JWT_SECRET environment variable is missing')
      return NextResponse.json(
        { message: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }
    const secret = new TextEncoder().encode(secretValue)
    const token = await new SignJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // Fetch full employee data if employeeId exists
    let employeeData = null
    if (user.employeeId) {
      try {
        employeeData = await Employee.findById(user.employeeId)
          .populate('designation')
          .populate('department')
          .lean()
      } catch (error) {
        console.error('Error fetching employee data:', error)
      }
    }

    // Best-effort: send login alert email to the user (controlled by admin settings)
    try {
      const companySettings = await CompanySettings.findOne().lean().catch(() => null)

      const emailNotificationsEnabled =
        companySettings?.notifications?.emailNotifications !== false

      const loginEmailEnabled =
        companySettings?.notifications?.emailEvents?.login !== false

      if (emailNotificationsEnabled && loginEmailEnabled) {
        const userAgent = request.headers.get('user-agent') || undefined
        const ipAddress =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          undefined

        const name = employeeData
          ? [employeeData.firstName, employeeData.lastName].filter(Boolean).join(' ')
          : undefined

        await sendLoginAlertEmail({
          to: user.email,
          name,
          loginTime: user.lastLogin || new Date(),
          userAgent,
          ipAddress,
        })
      }
    } catch (emailError) {
      console.error('Failed to send login alert email:', emailError)
    }

    // Best-effort: send push notification for login
    try {
      const name = employeeData
        ? [employeeData.firstName, employeeData.lastName].filter(Boolean).join(' ')
        : user.email.split('@')[0]

      const currentHour = new Date().getHours()
      let greeting = 'Hello'
      let emoji = '👋'
      if (currentHour < 12) {
        greeting = 'Good Morning'
        emoji = '🌅'
      } else if (currentHour < 17) {
        greeting = 'Good Afternoon'
        emoji = '☀️'
      } else {
        greeting = 'Good Evening'
        emoji = '🌙'
      }

      await sendPushToUser(
        user._id,
        {
          title: `${emoji} ${greeting}, ${name}!`,
          body: `Welcome back to Talio! You've successfully logged in.`,
        },
        {
          eventType: 'login',
          clickAction: '/dashboard',
          icon: '/icon-192x192.png',
          data: {
            loginTime: new Date().toISOString(),
            type: 'login',
          },
        }
      )
    } catch (pushError) {
      console.error('Failed to send login push notification:', pushError)
    }

    // Return user data without password, including employee details
    const userData = {
      id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      // Include employee data if available
      ...(employeeData && {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        profilePicture: employeeData.profilePicture,
        designation: employeeData.designation,
        department: employeeData.department,
        employeeNumber: employeeData.employeeNumber,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData,
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

