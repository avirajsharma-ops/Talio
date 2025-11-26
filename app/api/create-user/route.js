import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { SignJWT } from 'jose'

export async function POST(request) {
  try {
    await connectDB()

    const body = await request.json()
    const { 
      email, 
      password, 
      role, 
      firstName, 
      lastName, 
      phone,
      department,
      designation,
      dateOfJoining,
      employmentType,
      salary,
      profilePicture,
      googleId 
    } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Generate employee code
    const employeeCount = await Employee.countDocuments()
    const employeeCode = `EMP${String(employeeCount + 1).padStart(4, '0')}`

    // Create employee record
    const employeeData = {
      employeeCode,
      firstName: firstName || 'User',
      lastName: lastName || '',
      email,
      phone: phone || '',
      dateOfJoining: dateOfJoining || new Date(),
      employmentType: employmentType || 'full-time',
      status: 'active',
    }

    // Add optional fields if provided
    if (department) employeeData.department = department
    if (designation) employeeData.designation = designation
    if (salary) employeeData.salary = salary
    if (profilePicture) employeeData.profilePicture = profilePicture

    const employee = await Employee.create(employeeData)

    // Create user account
    const userData = {
      email,
      role: role || 'employee',
      employeeId: employee._id,
      isActive: true,
      lastLogin: new Date(),
    }

    // If password is provided, use it; otherwise generate random password
    if (password) {
      userData.password = password
    } else {
      // Generate random password for Google OAuth users
      userData.password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
    }

    // If Google ID is provided, store it (you may need to add this field to User model)
    if (googleId) {
      userData.googleId = googleId
    }

    const user = await User.create(userData)

    // Populate employee data
    const populatedUser = await User.findById(user._id).populate('employeeId')

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const token = await new SignJWT({
      userId: populatedUser._id.toString(),
      email: populatedUser.email,
      role: populatedUser.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // Return user data
    const responseData = {
      id: populatedUser._id,
      email: populatedUser.email,
      role: populatedUser.role,
      employeeId: populatedUser.employeeId,
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      token,
      user: responseData,
    }, { status: 201 })

  } catch (error) {
    console.error('Create user error:', error)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'Email or employee code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create user', error: error.message },
      { status: 500 }
    )
  }
}

// GET - Get user by email (for checking if user exists)
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email }).populate('employeeId')

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const userData = {
      id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    }

    return NextResponse.json({
      success: true,
      user: userData,
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get user', error: error.message },
      { status: 500 }
    )
  }
}

