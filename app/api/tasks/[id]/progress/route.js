import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// PUT - Update task progress
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

    const { id } = params
    const { progress, status, notes, timeSpent, completionNotes, deliverables } = await request.json()

    const task = await Project.findById(id)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user can update progress
    const canUpdate = await checkProgressUpdatePermission(employeeId, task, decoded.role)
    if (!canUpdate.allowed) {
      return NextResponse.json(
        { success: false, message: canUpdate.reason },
        { status: 403 }
      )
    }

    const oldProgress = task.progress
    const oldStatus = task.status

    // Update progress
    if (progress !== undefined) {
      task.updateProgress(progress, employeeId, notes)
    }

    // Update status if provided
    if (status && status !== task.status) {
      task.status = status
      
      // Add status history
      task.statusHistory.push({
        status: `Status changed from ${oldStatus} to ${status}`,
        changedBy: employeeId,
        changedAt: new Date(),
        reason: notes || 'Status update'
      })

      // Handle completion
      if (status === 'completed') {
        task.completedAt = new Date()
        task.completedBy = employeeId
        task.progress = 100

        if (completionNotes) {
          task.completionNotes = completionNotes
        }

        // Add deliverables if provided
        if (deliverables && deliverables.length > 0) {
          task.deliverables = deliverables.map(deliverable => ({
            ...deliverable,
            deliveredAt: new Date()
          }))
        }

        // Calculate efficiency
        task.calculateEfficiency()
      }
    }

    // Add time entry if provided
    if (timeSpent && timeSpent > 0) {
      const now = new Date()
      const startTime = new Date(now.getTime() - (timeSpent * 60 * 1000)) // timeSpent in minutes
      
      task.addTimeEntry(employeeId, startTime, now, notes || 'Progress update')
    }

    await task.save()

    // Update parent task progress if this is a subtask
    if (task.parentTask) {
      await updateParentTaskProgress(task.parentTask)
    }

    // Update project progress if task is part of a project
    if (task.project) {
      await updateProjectProgress(task.project)
    }

    // Populate the updated task
    await task.populate([
      { path: 'assignedBy', select: 'firstName lastName employeeCode' },
      { path: 'assignedTo.employee', select: 'firstName lastName employeeCode' },
      { path: 'completedBy', select: 'firstName lastName employeeCode' },
      { path: 'statusHistory.changedBy', select: 'firstName lastName' }
    ])

    return NextResponse.json({
      success: true,
      message: 'Task progress updated successfully',
      data: {
        task,
        progressChange: progress !== undefined ? progress - oldProgress : 0,
        statusChange: status !== oldStatus
      }
    })

  } catch (error) {
    console.error('Update task progress error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update task progress' },
      { status: 500 }
    )
  }
}

// POST - Add time entry to task
export async function POST(request, { params }) {
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

    const { id } = params
    const { startTime, endTime, duration, description, billable } = await request.json()

    const task = await Project.findById(id)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user can log time
    const canLogTime = await checkTimeLogPermission(employeeId, task)
    if (!canLogTime.allowed) {
      return NextResponse.json(
        { success: false, message: canLogTime.reason },
        { status: 403 }
      )
    }

    let timeEntry = {
      employee: employeeId,
      description: description || 'Time logged',
      billable: billable || false,
      createdAt: new Date()
    }

    // Calculate duration based on provided data
    if (startTime && endTime) {
      timeEntry.startTime = new Date(startTime)
      timeEntry.endTime = new Date(endTime)
      timeEntry.duration = Math.round((timeEntry.endTime - timeEntry.startTime) / (1000 * 60))
    } else if (duration) {
      timeEntry.duration = duration
      timeEntry.endTime = new Date()
      timeEntry.startTime = new Date(timeEntry.endTime.getTime() - (duration * 60 * 1000))
    } else {
      return NextResponse.json(
        { success: false, message: 'Either startTime/endTime or duration is required' },
        { status: 400 }
      )
    }

    // Validate duration
    if (timeEntry.duration <= 0) {
      return NextResponse.json(
        { success: false, message: 'Duration must be greater than 0' },
        { status: 400 }
      )
    }

    task.timeEntries.push(timeEntry)

    // Update total actual hours
    task.actualHours = task.timeEntries.reduce((total, entry) => 
      total + (entry.duration / 60), 0)

    // Update metrics
    task.metrics.timeSpent = task.timeEntries.reduce((total, entry) => 
      total + entry.duration, 0)

    // Calculate efficiency if estimated hours are available
    if (task.estimatedHours) {
      task.calculateEfficiency()
    }

    await task.save()

    // Populate the updated task
    await task.populate([
      { path: 'timeEntries.employee', select: 'firstName lastName employeeCode' },
      { path: 'timeEntries.approvedBy', select: 'firstName lastName employeeCode' }
    ])

    return NextResponse.json({
      success: true,
      message: 'Time entry added successfully',
      data: {
        timeEntry: task.timeEntries[task.timeEntries.length - 1],
        totalHours: task.actualHours,
        efficiency: task.metrics.efficiency
      }
    })

  } catch (error) {
    console.error('Add time entry error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to add time entry' },
      { status: 500 }
    )
  }
}

// Helper functions
async function checkProgressUpdatePermission(userId, task, userRole) {
  try {
    const user = await Employee.findById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Task assignees can update progress
    const isAssignee = task.assignedTo.some(a =>
      a.employee.toString() === userId.toString() && a.status === 'accepted')

    if (isAssignee) {
      return { allowed: true, reason: 'task_assignee' }
    }

    // Task creator can update progress
    if (task.assignedBy.toString() === userId.toString()) {
      return { allowed: true, reason: 'task_creator' }
    }

    // Admin and HR can update any task
    if (['admin', 'hr'].includes(userRole)) {
      return { allowed: true, reason: 'elevated_permissions' }
    }

    // Managers can update their team's tasks
    if (userRole === 'manager') {
      const assignees = await Employee.find({
        _id: { $in: task.assignedTo.map(a => a.employee) }
      })

      const canUpdateAll = assignees.every(assignee =>
        assignee.reportingManager?.toString() === userId.toString())

      if (canUpdateAll) {
        return { allowed: true, reason: 'manager_authority' }
      }
    }

    return { allowed: false, reason: 'insufficient_permissions' }

  } catch (error) {
    console.error('Permission check error:', error)
    return { allowed: false, reason: 'permission_check_failed' }
  }
}

async function checkTimeLogPermission(userId, task) {
  try {
    // Task assignees can log time
    const isAssignee = task.assignedTo.some(a => 
      a.employee.toString() === userId.toString() && a.status === 'accepted')
    
    if (isAssignee) {
      return { allowed: true, reason: 'task_assignee' }
    }

    // Task creator can log time
    if (task.assignedBy.toString() === userId.toString()) {
      return { allowed: true, reason: 'task_creator' }
    }

    return { allowed: false, reason: 'not_authorized_to_log_time' }

  } catch (error) {
    console.error('Time log permission check error:', error)
    return { allowed: false, reason: 'permission_check_failed' }
  }
}

async function updateParentTaskProgress(parentTaskId) {
  try {
    const parentTask = await Project.findById(parentTaskId)
    if (!parentTask) return

    // Get all subtasks
    const subtasks = await Project.find({ parentTask: parentTaskId })
    
    if (subtasks.length > 0) {
      // Calculate average progress of subtasks
      const totalProgress = subtasks.reduce((sum, subtask) => sum + subtask.progress, 0)
      const avgProgress = Math.round(totalProgress / subtasks.length)
      
      parentTask.progress = avgProgress
      
      // Update status based on subtask completion
      const completedSubtasks = subtasks.filter(st => st.status === 'completed').length
      
      if (completedSubtasks === subtasks.length) {
        parentTask.status = 'completed'
        parentTask.completedAt = new Date()
      } else if (subtasks.some(st => st.status === 'in_progress')) {
        parentTask.status = 'in_progress'
      }
      
      await parentTask.save()
    }

  } catch (error) {
    console.error('Update parent task progress error:', error)
  }
}

async function updateProjectProgress(projectId) {
  try {
    const Project = require('@/models/Project').default
    const project = await Project.findById(projectId)
    if (!project) return

    // Get all tasks for this project
    const projectTasks = await Project.find({ project: projectId })
    
    if (projectTasks.length > 0) {
      // Calculate project progress based on task completion
      const totalProgress = projectTasks.reduce((sum, task) => sum + task.progress, 0)
      const avgProgress = Math.round(totalProgress / projectTasks.length)
      
      project.progress = avgProgress
      
      // Update analytics
      project.analytics.totalTasks = projectTasks.length
      project.analytics.completedTasks = projectTasks.filter(t => t.status === 'completed').length
      project.analytics.overdueTasks = projectTasks.filter(t => 
        t.dueDate < new Date() && !['completed', 'cancelled'].includes(t.status)).length
      
      await project.save()
    }

  } catch (error) {
    console.error('Update project progress error:', error)
  }
}
