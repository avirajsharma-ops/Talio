import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Employee from '@/models/Employee'
import User from '@/models/User'

// GET - Fetch current user's profile
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await dbConnect()

    // Fetch user with populated employee data
    const user = await User.findById(decoded.userId)
      .populate({
        path: 'employeeId',
        populate: [
          { path: 'designation', select: 'title level' },
          { path: 'department', select: 'name code' },
          { path: 'reportingManager', select: 'firstName lastName employeeCode' }
        ]
      })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role
        },
        employee: user.employeeId
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

