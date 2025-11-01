import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Employee from '@/models/Employee'
import User from '@/models/User'

// GET - Fetch all employees for chat
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

    // Get current user
    const currentUserDoc = await User.findById(decoded.userId).select('employeeId role')
    if (!currentUserDoc || !currentUserDoc.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Fetch all active employees except current user
    const employees = await Employee.find({
      _id: { $ne: currentUserDoc.employeeId },
      status: 'active'
    })
      .select('firstName lastName employeeCode profilePicture email designation department')
      .populate('designation', 'title')
      .populate('department', 'name')
      .sort({ firstName: 1 })
      .lean()

    // Get all users to filter out admins
    const allUsers = await User.find({ isActive: true }).select('employeeId role').lean()
    const adminEmployeeIds = allUsers
      .filter(u => u.role === 'admin')
      .map(u => u.employeeId?.toString())

    // Filter out admin users
    const filteredEmployees = employees.filter(emp =>
      !adminEmployeeIds.includes(emp._id.toString())
    )

    return NextResponse.json({
      success: true,
      data: filteredEmployees
    })
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

