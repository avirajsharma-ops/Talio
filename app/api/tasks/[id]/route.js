import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

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
    const task = await Project.findOne({ _id: taskId, isDeleted: { $ne: true } })
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode department')
      .populate('parentProject', 'title projectNumber')
      .populate('subProjects', 'title projectNumber status progress dueDate')
      .populate('approvedBy', 'firstName lastName employeeCode designation')
      .populate({
        path: 'approvedBy',
        populate: {
          path: 'designation',
          select: 'title levelName'
        }
      })
      .populate('managerRemarks.addedBy', 'firstName lastName employeeCode')

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

    const task = await Project.findById(taskId)
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
    const updatedTask = await Project.findByIdAndUpdate(
      taskId,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode department')

    // Log activity for task update
    await logActivity({
      employeeId: employeeId,
      type: 'task_update',
      action: 'Updated task',
      details: `"${updatedTask.title}"`,
      relatedModel: 'Task',
      relatedId: taskId
    })

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

    const task = await Project.findById(taskId)
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
    await Project.findByIdAndUpdate(taskId, {
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

    // Check if user is a department head
    const Department = (await import('@/models/Department')).default
    const isDepartmentHead = await Department.findOne({
      head: userId,
      isActive: true
    })

    if (isDepartmentHead) {
      // Department heads can view all tasks in their department
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)
      const departmentMembers = await Employee.find({
        department: isDepartmentHead._id,
        _id: { $in: assigneeIds }
      })
      if (departmentMembers.length > 0) {
        return true
      }
    }

    // For managers, check if any assignee reports to them or is in same department
    if (userRole === 'manager') {
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)

      // Check direct reports
      const teamMembers = await Employee.find({
        reportingManager: userId,
        _id: { $in: assigneeIds }
      })
      if (teamMembers.length > 0) {
        return true
      }

      // Check same department
      const currentEmployee = await Employee.findById(userId)
      if (currentEmployee && currentEmployee.department) {
        const departmentMembers = await Employee.find({
          department: currentEmployee.department,
          _id: { $in: assigneeIds }
        })
        if (departmentMembers.length > 0) {
          return true
        }
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

    // Check if user is a department head
    const Department = (await import('@/models/Department')).default
    const isDepartmentHead = await Department.findOne({
      head: userId,
      isActive: true
    })

    if (isDepartmentHead) {
      // Department heads can update all tasks in their department
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)
      const departmentMembers = await Employee.find({
        department: isDepartmentHead._id,
        _id: { $in: assigneeIds }
      })
      if (departmentMembers.length > 0) {
        return true
      }
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

    // Managers can update tasks for their team members or same department
    if (userRole === 'manager') {
      const assigneeIds = task.assignedTo.map(a => a.employee?._id || a.employee)

      // Check direct reports
      const teamMembers = await Employee.find({
        reportingManager: userId,
        _id: { $in: assigneeIds }
      })
      if (teamMembers.length > 0) {
        return true
      }

      // Check same department
      const currentEmployee = await Employee.findById(userId)
      if (currentEmployee && currentEmployee.department) {
        const departmentMembers = await Employee.find({
          department: currentEmployee.department,
          _id: { $in: assigneeIds }
        })
        if (departmentMembers.length > 0) {
          return true
        }
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
