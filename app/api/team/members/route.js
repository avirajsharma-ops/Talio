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

    // Check if user is a department head
    const department = await Department.findOne({ 
      head: user.employeeId,
      isActive: true 
    }).lean()

    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only department heads can view team members.' },
        { status: 403 }
      )
    }

    // Get all team members in the department (including the department head)
    const teamMembers = await Employee.find({
      department: department._id,
      status: 'active'
    })
      .populate('designation', 'name level')
      .populate('reportingManager', 'firstName lastName employeeCode')
      .select('firstName lastName employeeCode email phone dateOfJoining designation reportingManager profilePicture skills')
      .sort({ firstName: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: teamMembers,
      meta: {
        total: teamMembers.length,
        department: department
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

