import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Department from '@/models/Department'
import User from '@/models/User'

// GET - Check if user is a department head
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

    // Get user's employee ID
    const user = await User.findById(decoded.userId).select('employeeId')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Check if user is a department head
    const department = await Department.findOne({ 
      head: user.employeeId,
      isActive: true 
    }).select('name code')

    return NextResponse.json({
      success: true,
      isDepartmentHead: !!department,
      department: department || null
    })
  } catch (error) {
    console.error('Check department head error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

