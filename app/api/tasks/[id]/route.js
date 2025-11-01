import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// GET - Fetch single task by ID
export async function GET(request, { params }) {
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
    const employeeId = currentUser?.employeeId

    const taskId = params.id

    // Find the task (exclude deleted tasks by default)
    const task = await Task.findOne({ _id: taskId, isDeleted: { $ne: true } })
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode department')
      .populate('project', 'name projectCode')
      .populate('parentTask', 'title taskNumber')
      .populate('subtasks', 'title taskNumber status progress dueDate')

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this task
    const hasPermission = await checkTaskViewPermission(employeeId, task, decoded.role)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view this task' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })

  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PUT - Update task
export async function PUT(request, { params }) {
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
    const employeeId = currentUser?.employeeId

    const taskId = params.id
    const updateData = await request.json()

    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to update this task
    const hasPermission = await checkTaskUpdatePermission(employeeId, task, decoded.role)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update this task' },
        { status: 403 }
      )
    }

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode department')
      .populate('project', 'name projectCode')

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    })

  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE - Delete task (soft delete)
export async function DELETE(request, { params }) {
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
    const employeeId = currentUser?.employeeId

    const taskId = params.id
    const body = await request.json()
    const deletionReason = body?.reason || 'No reason provided'

    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete this task
    const hasPermission = await checkTaskDeletePermission(employeeId, task, decoded.role)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to delete this task' },
        { status: 403 }
      )
    }

    // Soft delete - mark as deleted instead of removing
    await Task.findByIdAndUpdate(taskId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: employeeId,
      deletionReason: deletionReason
    })

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })

  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete task' },
      { status: 500 }
    )
  }
}

// Helper function to check task view permission
async function checkTaskViewPermission(userId, task, userRole) {
  try {
    // Admin and HR can view all tasks
    if (['admin', 'hr'].includes(userRole)) {
      return true
    }

    // Check if user is assigned to the task
    const isAssigned = task.assignedTo.some(assignment => {
      const empId = assignment.employee?._id || assignment.employee
      return empId.toString() === userId.toString()
    })
    if (isAssigned) {
      return true
    }

    // Check if user created the task (handle both populated and non-populated)
    const assignedById = task.assignedBy?._id || task.assignedBy
    if (assignedById && assignedById.toString() === userId.toString()) {
      return true
    }

    // For managers, check if any assignee reports to them
    if (userRole === 'manager') {
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)
      const teamMembers = await Employee.find({
        reportingManager: userId,
        _id: { $in: assigneeIds }
      })
      if (teamMembers.length > 0) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

// Helper function to check task update permission
async function checkTaskUpdatePermission(userId, task, userRole) {
  try {
    // Admin can update all tasks
    if (userRole === 'admin') {
      return true
    }

    // Task creator can update (handle both populated and non-populated)
    const assignedById = task.assignedBy?._id || task.assignedBy
    if (assignedById && assignedById.toString() === userId.toString()) {
      return true
    }

    // HR can update tasks in their department
    if (userRole === 'hr') {
      const user = await Employee.findById(userId)
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)
      const assignees = await Employee.find({
        _id: { $in: assigneeIds }
      })
      const sameDepAssignees = assignees.filter(emp => emp.department === user.department)
      if (sameDepAssignees.length > 0) {
        return true
      }
    }

    // Managers can update tasks for their team members
    if (userRole === 'manager') {
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)
      const teamMembers = await Employee.find({
        reportingManager: userId,
        _id: { $in: assigneeIds }
      })
      if (teamMembers.length > 0) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

// Helper function to check task delete permission
async function checkTaskDeletePermission(userId, task, userRole) {
  try {
    // Only the task creator can delete
    const assignedById = task.assignedBy?._id || task.assignedBy
    if (assignedById && assignedById.toString() === userId.toString()) {
      return true
    }

    return false
  } catch (error) {
    console.error('Delete permission check error:', error)
    return false
  }
}
