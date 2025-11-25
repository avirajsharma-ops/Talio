import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import Designation from '@/models/Designation'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// GET - Fetch all team members for department head
export async function GET(request) {
  try {
    await connectDB()

    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user to find employee ID
    const user = await User.findById(decoded.userId).select('employeeId').lean()
    
    if (!user || !user.employeeId) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    // Get user role
    const userDoc = await User.findById(decoded.userId).select('role').lean()
    const userRole = userDoc?.role

    let teamMembers = []
    let department = null

    // Check if user is a department head
    department = await Department.findOne({
      head: user.employeeId,
      isActive: true
    }).lean()

    if (department) {
      // User is department head - get all team members in the department
      teamMembers = await Employee.find({
        department: department._id,
        status: 'active'
      })
        .populate('designation', 'title level levelName')
        .populate('reportingManager', 'firstName lastName employeeCode')
        .select('firstName lastName employeeCode email phone dateOfJoining designation reportingManager profilePicture skills')
        .sort({ firstName: 1 })
        .lean()
    } else if (userRole === 'manager') {
      // User is manager - get direct reports
      teamMembers = await Employee.find({
        reportingManager: user.employeeId,
        status: 'active'
      })
        .populate('designation', 'title level levelName')
        .populate('department', 'name')
        .select('firstName lastName employeeCode email phone dateOfJoining designation department profilePicture skills')
        .sort({ firstName: 1 })
        .lean()

      // Get manager's department for context
      const managerEmployee = await Employee.findById(user.employeeId).select('department').populate('department', 'name').lean()
      department = managerEmployee?.department
    } else {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only department heads and managers can view team members.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: teamMembers,
      meta: {
        total: teamMembers.length,
        department: department,
        role: userRole
      }
    })

  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch team members', error: error.message },
      { status: 500 }
    )
  }
}

