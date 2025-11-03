import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { SignJWT } from 'jose'

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

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password').populate('employeeId')

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
console.log(user,456);

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
        await user.save()
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

    // Update last login
    user.lastLogin = new Date()
    await user.save()

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

    // Fetch full employee data if employeeId exists
    let employeeData = null
    if (user.employeeId) {
      try {
        const Employee = (await import('@/models/Employee')).default
        employeeData = await Employee.findById(user.employeeId)
          .populate('designation')
          .populate('department')
          .lean()
      } catch (error) {
        console.error('Error fetching employee data:', error)
      }
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

