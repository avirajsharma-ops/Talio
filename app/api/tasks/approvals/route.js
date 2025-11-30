import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import { verifyToken } from '@/lib/auth'

// GET - Fetch tasks pending approval for managers/department heads
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const currentUser = await User.findById(decoded.userId).select('employeeId role')
    const currentEmployeeId = currentUser?.employeeId

    if (!currentEmployeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Check if user is a department head
    const isDepartmentHead = await Department.findOne({
      head: currentEmployeeId,
      isActive: true
    })

    // Get employee to find their department
    const employee = await Employee.findById(currentEmployeeId).select('department')
    
    // Build query
    let query = {}
    
    // Filter based on status
    if (status === 'pending') {
      query.status = 'review'
      query.approvalStatus = { $in: [null, 'pending'] }
    } else if (status === 'approved') {
      query.approvalStatus = 'approved'
    } else if (status === 'rejected') {
      query.approvalStatus = 'rejected'
    }
    // 'all' status shows everything

    // Restrict to tasks where current user is the assigner or is department head
    if (decoded.role === 'admin' || decoded.role === 'god_admin') {
      // Admins can see all
    } else if (isDepartmentHead) {
      // Department heads can see tasks from their department
      const departmentEmployees = await Employee.find({
        department: isDepartmentHead._id,
        isActive: true
      }).select('_id')
      const employeeIds = departmentEmployees.map(e => e._id)
      
      query.$or = [
        { assignedBy: currentEmployeeId },
        { 'assignedTo.employee': { $in: employeeIds } }
      ]
    } else if (decoded.role === 'manager' || decoded.role === 'hr') {
      // Managers can see tasks they assigned
      query.assignedBy = currentEmployeeId
    } else {
      // Regular employees can only see tasks they assigned
      query.assignedBy = currentEmployeeId
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName employeeCode email')
      .populate('assignedTo.employee', 'firstName lastName employeeCode email')
      .populate('approvedBy', 'firstName lastName employeeCode')
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: tasks,
      meta: {
        total: tasks.length,
        isDepartmentHead: !!isDepartmentHead
      }
    })
  } catch (error) {
    console.error('Fetch approvals error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}
