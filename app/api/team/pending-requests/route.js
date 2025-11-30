import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'
import Employee from '@/models/Employee'
import Leave from '@/models/Leave'
import Task from '@/models/Task'
import User from '@/models/User'

export const dynamic = 'force-dynamic'


// GET - Fetch all pending requests for department head
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
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Check if user is a department head
    const department = await Department.findOne({ 
      head: user.employeeId,
      isActive: true 
    })

    if (!department) {
      return NextResponse.json({ 
        success: false, 
        message: 'You are not a department head' 
      }, { status: 403 })
    }

    // Get all team members (employees in the department)
    const teamMembers = await Employee.find({ 
      department: department._id,
      status: 'active'
    }).select('_id')

    const teamMemberIds = teamMembers.map(emp => emp._id)

    // Get pending leave requests
    const pendingLeaves = await Leave.find({
      employee: { $in: teamMemberIds },
      status: 'pending'
    })
      .populate('employee', 'firstName lastName employeeCode profilePicture')
      .populate('leaveType', 'name')
      .sort({ createdAt: -1 })
      .limit(10)

    // Get pending task approvals (tasks that are completed but need approval)
    const pendingTasks = await Task.find({
      'assignedTo.employee': { $in: teamMemberIds },
      status: 'completed',
      requiresApproval: true,
      approvalStatus: 'pending'
    })
      .populate('assignedTo.employee', 'firstName lastName employeeCode profilePicture')
      .populate('assignedBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        department: {
          id: department._id,
          name: department.name,
          code: department.code
        },
        teamMembersCount: teamMemberIds.length,
        pendingLeaves: pendingLeaves.length,
        pendingTasks: pendingTasks.length,
        recentLeaves: pendingLeaves.slice(0, 5),
        recentTasks: pendingTasks.slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Get pending requests error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

