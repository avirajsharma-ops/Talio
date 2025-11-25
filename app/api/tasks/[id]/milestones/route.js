import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// GET - Fetch all milestones (subProjects) for a task/project
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

    const taskId = params.id

    // Verify task exists and get its subProjects
    const task = await Project.findById(taskId)
      .populate({
        path: 'subProjects',
        match: { isDeleted: { $ne: true } },
        populate: [
          { path: 'assignedBy', select: 'firstName lastName employeeCode' },
          { path: 'assignedTo.employee', select: 'firstName lastName employeeCode' }
        ],
        options: { sort: { createdAt: 1 } }
      })

    if (!task) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: task.subProjects || []
    })

  } catch (error) {
    console.error('Get milestones error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST - Create a new milestone (subProject)
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

    const currentUser = await User.findById(decoded.userId).select('employeeId')
    const employeeId = currentUser?.employeeId

    const parentTaskId = params.id
    const body = await request.json()

    // Verify parent task exists
    const parentTask = await Project.findById(parentTaskId)
    if (!parentTask) {
      return NextResponse.json({ success: false, message: 'Parent task not found' }, { status: 404 })
    }

    // Create milestone as a subProject
    const milestone = await Project.create({
      parentProject: parentTaskId,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      assignedBy: employeeId,
      assignedTo: body.assignedTo || [{ employee: employeeId, role: 'owner' }],
      assignmentType: 'self_assigned',
      status: 'assigned',
      priority: body.priority || 'medium',
      category: body.category || 'other',
      progress: 0
    })

    // Add milestone to parent's subProjects array
    parentTask.subProjects.push(milestone._id)
    await parentTask.save()

    // Update parent task progress based on all subProjects
    await updateTaskProgress(parentTaskId)

    const populatedMilestone = await Project.findById(milestone._id)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode')

    return NextResponse.json({
      success: true,
      data: populatedMilestone
    }, { status: 201 })

  } catch (error) {
    console.error('Create milestone error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}

// Helper function to update task progress based on milestones
async function updateTaskProgress(taskId) {
  try {
    const task = await Project.findById(taskId).populate('subProjects')

    if (!task || !task.subProjects || task.subProjects.length === 0) {
      // No milestones, keep task progress as is
      return
    }

    // Calculate average progress from subProjects
    const totalProgress = task.subProjects.reduce((sum, sp) => sum + (sp.progress || 0), 0)
    const averageProgress = Math.round(totalProgress / task.subProjects.length)

    // Update task progress
    task.progress = averageProgress
    await task.save()

  } catch (error) {
    console.error('Update task progress error:', error)
  }
}

