import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.message },
        { status: 401 }
      )
    }

    // Only admin can view all users
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Access denied. Admin only.' },
        { status: 403 }
      )
    }

    await connectDB()

    // Fetch all users with passwords and populate employee data
    const users = await User.find({})
      .select('+password') // Include password field
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: users,
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
