import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'
import User from '@/models/User'
import Employee from '@/models/Employee'

export const dynamic = 'force-dynamic'


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

    await connectDB()

    // Get user's employee ID
    const user = await User.findById(decoded.userId).select('employeeId')

    let employeeId = user?.employeeId;
    
    // If user doesn't have employeeId directly, try to find employee by userId
    if (!employeeId) {
      const employee = await Employee.findOne({ userId: decoded.userId }).select('_id');
      employeeId = employee?._id;
    }

    if (!employeeId) {
      return NextResponse.json({ 
        success: true, 
        isDepartmentHead: false,
        department: null,
        departmentId: null,
        message: 'Employee not found' 
      })
    }

    // Check if user is a department head (via Department.head or Department.heads[] field)
    const department = await Department.findOne({ 
      $or: [
        { head: employeeId },
        { heads: employeeId }
      ],
      isActive: true 
    }).select('name code _id')

    console.log('[Check Head API] Result:', { 
      userId: decoded.userId, 
      employeeId: employeeId?.toString(), 
      isDepartmentHead: !!department,
      departmentId: department?._id?.toString(),
      departmentName: department?.name
    });

    return NextResponse.json({
      success: true,
      isDepartmentHead: !!department,
      department: department || null,
      departmentId: department?._id || null,
      departmentName: department?.name || null
    })
  } catch (error) {
    console.error('Check department head error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

