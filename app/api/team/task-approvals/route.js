import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'
import Designation from '@/models/Designation'
import Employee from '@/models/Employee'
import Project from '@/models/Project'
import User from '@/models/User'

// GET - Fetch all pending task approvals for department
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

    // Get all team members in the department
    const teamMembers = await Employee.find({
      department: department._id,
      status: 'active'
    }).select('_id')

    const teamMemberIds = teamMembers.map(emp => emp._id)

    // Get query parameter for status filter
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'pending'

    // Build query based on status filter
    let taskQuery = {
      $or: [
        // Tasks assigned to team members
        { 'assignedTo.employee': { $in: teamMemberIds } },
        // Tasks created by team members
        { 'assignedBy': { $in: teamMemberIds } }
      ]
    }

    if (statusFilter === 'pending') {
      // Pending approvals - tasks in 'review' status
      taskQuery.status = 'review'
      taskQuery.$and = [
        {
          $or: [
            { approvalStatus: 'pending' },
            { approvalStatus: null }
          ]
        }
      ]
    } else if (statusFilter === 'completed') {
      // Completed tasks - tasks that have been approved
      taskQuery.status = 'completed'
      taskQuery.approvalStatus = 'approved'
    } else if (statusFilter === 'all') {
      // All tasks in review or completed status
      taskQuery.status = { $in: ['review', 'completed'] }
    }

    // Get task approvals based on filter
    const pendingTasks = await Project.find(taskQuery)
      .populate({
        path: 'assignedTo.employee',
        select: 'firstName lastName employeeCode profilePicture email',
        populate: {
          path: 'designation',
          select: 'name level'
        }
      })
      .populate({
        path: 'assignedBy',
        select: 'firstName lastName employeeCode',
        populate: {
          path: 'designation',
          select: 'name level'
        }
      })
      .populate('parentTask', 'title taskNumber')
      .populate('project', 'name projectCode')
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: pendingTasks
    })
  } catch (error) {
    console.error('Get task approvals error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST - Approve or reject task
export async function POST(request) {
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

    const body = await request.json()
    const { taskId, action, remarks } = body

    if (!taskId || !action) {
      return NextResponse.json({ 
        success: false, 
        message: 'Task ID and action are required' 
      }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid action. Must be "approved" or "rejected"' 
      }, { status: 400 })
    }

    // Get the task
    const task = await Project.findById(taskId)
      .populate('assignedTo.employee', 'department')

    if (!task) {
      return NextResponse.json({ 
        success: false, 
        message: 'Task not found' 
      }, { status: 404 })
    }

    // Verify at least one assignee belongs to the department
    const belongsToDepartment = task.assignedTo.some(
      assigned => assigned.employee.department.toString() === department._id.toString()
    )

    if (!belongsToDepartment) {
      return NextResponse.json({ 
        success: false, 
        message: 'This task is not assigned to anyone in your department' 
      }, { status: 403 })
    }

    // Update task approval status
    task.approvalStatus = action
    task.approvedBy = user.employeeId
    task.approvedAt = new Date()

    // Update task status based on approval action
    if (action === 'approved') {
      // Move from 'review' to 'completed' when approved
      task.status = 'completed'
    } else if (action === 'rejected') {
      // Move back to 'assigned' (pending) status when rejected
      // Employee can update and mark complete again to send for review
      task.status = 'assigned'
      // Reset progress to allow employee to update and resubmit
      task.progress = 0
      // Reset approval status so it can be resubmitted
      task.approvalStatus = null
    }

    // Add manager remarks
    if (remarks) {
      if (!task.managerRemarks) {
        task.managerRemarks = []
      }
      task.managerRemarks.push({
        remark: remarks,
        addedBy: user.employeeId,
        addedAt: new Date()
      })
    }

    // Update approval workflow
    if (task.approvalWorkflow && task.approvalWorkflow.length > 0) {
      const currentLevel = task.currentApprovalLevel || 0
      if (task.approvalWorkflow[currentLevel]) {
        task.approvalWorkflow[currentLevel].status = action
        task.approvalWorkflow[currentLevel].approvedAt = new Date()
        task.approvalWorkflow[currentLevel].comments = remarks || ''
      }
    }

    await task.save()

    const updatedTask = await Project.findById(taskId)
      .populate({
        path: 'assignedTo.employee',
        select: 'firstName lastName employeeCode profilePicture email',
        populate: {
          path: 'designation',
          select: 'name level'
        }
      })
      .populate({
        path: 'assignedBy',
        select: 'firstName lastName employeeCode',
        populate: {
          path: 'designation',
          select: 'name level'
        }
      })
      .populate({
        path: 'approvedBy',
        select: 'firstName lastName employeeCode',
        populate: {
          path: 'designation',
          select: 'name level'
        }
      })
      .populate('parentTask', 'title taskNumber')
      .populate('project', 'name projectCode')
      .lean()

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: `Task ${action} successfully`
    })
  } catch (error) {
    console.error('Approve/reject task error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

