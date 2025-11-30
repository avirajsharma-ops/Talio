import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import ProjectMember from '@/models/ProjectMember'
import Task from '@/models/Task'
import TaskAssignee from '@/models/TaskAssignee'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { 
  checkProjectAccess, 
  calculateCompletionPercentage,
  createTimelineEvent 
} from '@/lib/projectService'
import { 
  notifyTaskStatusChanged,
  notifyTaskAssigned
} from '@/lib/projectNotifications'

// GET - Get single task details
export async function GET(request, { params }) {
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

    const { projectId, taskId } = await params

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const task = await Task.findById(taskId)
      .populate('project', 'name status projectHead')
      .populate('createdBy', 'firstName lastName profilePicture')
      .populate('assignedBy', 'firstName lastName')
      .populate('parentTask', 'title status')

    if (!task || task.project._id.toString() !== projectId) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    // Get assignees
    const assignees = await TaskAssignee.find({ task: taskId })
      .populate('user', 'firstName lastName profilePicture employeeCode email')
      .populate('assignedBy', 'firstName lastName')

    // Get subtasks
    const subTasks = await Task.find({ parentTask: taskId })
      .populate('createdBy', 'firstName lastName')
      .select('title status priority dueDate')

    // Check if current user is an assignee
    const userAssignment = assignees.find(a => 
      a.user._id.toString() === user.employeeId.toString()
    )

    return NextResponse.json({
      success: true,
      data: {
        ...task.toObject(),
        assignees,
        subTasks,
        isAssignee: !!userAssignment,
        userAssignmentStatus: userAssignment?.assignmentStatus,
        isCreator: task.createdBy._id.toString() === user.employeeId.toString(),
        isProjectHead: task.project.projectHead.toString() === user.employeeId.toString()
      }
    })
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// PUT - Update task
export async function PUT(request, { params }) {
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

    const { projectId, taskId } = await params

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const task = await Task.findById(taskId)
    if (!task || task.project.toString() !== projectId) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Check permissions
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    const isCreator = task.createdBy.toString() === user.employeeId.toString()
    const isProjectHead = project.projectHead.toString() === user.employeeId.toString()
    
    // Check if user is an accepted assignee
    const userAssignment = await TaskAssignee.findOne({
      task: taskId,
      user: user.employeeId,
      assignmentStatus: 'accepted'
    })
    const isAssignedAndAccepted = !!userAssignment

    const body = await request.json()
    const { 
      title, 
      description, 
      status, 
      priority, 
      dueDate, 
      startDate,
      tags,
      estimatedHours,
      actualHours,
      order
    } = body

    // For status changes, only the assigned person (who accepted), project head, or admin can update
    if (status && status !== task.status) {
      if (!isAssignedAndAccepted && !isAdmin && !isProjectHead) {
        return NextResponse.json({ 
          success: false, 
          message: 'Only the assigned person or project head can update task status' 
        }, { status: 403 })
      }
    }

    // For other updates, allow creator, project head, admin, or assignee
    const canUpdate = isAdmin || isCreator || isProjectHead || isAssignedAndAccepted

    if (!canUpdate) {
      return NextResponse.json({ 
        success: false, 
        message: 'You do not have permission to update this task' 
      }, { status: 403 })
    }

    const updates = {}
    const changes = []
    const oldStatus = task.status

    if (title && title !== task.title) {
      updates.title = title
      changes.push(`Title changed to "${title}"`)
    }
    if (description !== undefined && description !== task.description) {
      updates.description = description
      changes.push('Description updated')
    }
    if (status && status !== task.status) {
      updates.status = status
      changes.push(`Status changed from ${oldStatus} to ${status}`)
      
      if (status === 'completed') {
        updates.completedAt = new Date()
      }
    }
    if (priority && priority !== task.priority) {
      updates.priority = priority
      changes.push(`Priority changed to ${priority}`)
    }
    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null
    }
    if (startDate !== undefined) {
      updates.startDate = startDate ? new Date(startDate) : null
    }
    if (tags) {
      updates.tags = tags
    }
    if (estimatedHours !== undefined) {
      updates.estimatedHours = estimatedHours
    }
    if (actualHours !== undefined) {
      updates.actualHours = actualHours
    }
    if (order !== undefined) {
      updates.order = order
    }

    await Task.findByIdAndUpdate(taskId, updates)

    const updaterEmployee = await Employee.findById(user.employeeId)

    // Create timeline events
    if (status && status !== oldStatus) {
      // Create timeline event (don't await to speed up response)
      createTimelineEvent({
        project: projectId,
        type: 'task_status_changed',
        createdBy: user.employeeId,
        relatedTask: taskId,
        description: `Task "${task.title}" status changed from ${oldStatus} to ${status}`,
        metadata: { taskTitle: task.title, oldStatus, newStatus: status }
      }).catch(console.error)

      // Notify relevant users (non-blocking)
      TaskAssignee.find({ 
        task: taskId, 
        assignmentStatus: 'accepted' 
      }).select('user').then(assignees => {
        const notifyEmployeeIds = [
          task.createdBy,
          ...assignees.map(a => a.user)
        ].filter(id => id.toString() !== user.employeeId.toString())

        User.find({ 
          employeeId: { $in: notifyEmployeeIds } 
        }).select('_id').then(notifyUsers => {
          notifyTaskStatusChanged(
            project, 
            task, 
            updaterEmployee, 
            notifyUsers.map(u => u._id),
            oldStatus,
            status
          ).catch(console.error)
        }).catch(console.error)
      }).catch(console.error)

      // Recalculate completion percentage if status changed (non-blocking)
      calculateCompletionPercentage(projectId).catch(console.error)
    } else if (changes.length > 0) {
      createTimelineEvent({
        project: projectId,
        type: 'task_updated',
        createdBy: user.employeeId,
        relatedTask: taskId,
        description: changes.join(', '),
        metadata: { changes, updates }
      }).catch(console.error)
    }

    const updatedTask = await Task.findById(taskId)
      .populate('createdBy', 'firstName lastName profilePicture')
      .populate('assignedBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// DELETE - Delete/Archive task (only project head and admins can delete)
export async function DELETE(request, { params }) {
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

    const { projectId, taskId } = await params

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const task = await Task.findById(taskId)
    if (!task || task.project.toString() !== projectId) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Check permissions - only project head and admins can delete
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    const isProjectHead = project.projectHead.toString() === user.employeeId.toString()

    if (!isAdmin && !isProjectHead) {
      return NextResponse.json({ 
        success: false, 
        message: 'Only project head or admin can delete tasks' 
      }, { status: 403 })
    }

    const taskTitle = task.title

    // Delete the task and its assignees
    await TaskAssignee.deleteMany({ task: taskId })
    await Task.findByIdAndDelete(taskId)

    // Recalculate completion percentage (non-blocking)
    calculateCompletionPercentage(projectId).catch(console.error)

    // Create timeline event (non-blocking)
    createTimelineEvent({
      project: projectId,
      type: 'task_deleted',
      createdBy: user.employeeId,
      description: `Task "${taskTitle}" was deleted`,
      metadata: { taskTitle }
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
