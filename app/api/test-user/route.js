import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email parameter required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await User.findOne({ email }).select('+password').populate('employeeId')
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
        email: email
      })
    }

    // Find employee
    const employee = await Employee.findOne({ email })

    return NextResponse.json({
      success: true,
      message: 'User found',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          hasPassword: !!user.password,
          passwordLength: user.password ? user.password.length : 0,
          passwordStartsWith: user.password ? user.password.substring(0, 10) + '...' : null,
          employeeId: user.employeeId?._id,
          createdAt: user.createdAt
        },
        employee: employee ? {
          id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          employeeCode: employee.employeeCode,
          status: employee.status,
          createdAt: employee.createdAt
        } : null
      }
    })

  } catch (error) {
    console.error('Test user error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
