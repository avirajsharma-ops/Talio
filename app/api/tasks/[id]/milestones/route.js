import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Milestone from '@/models/Milestone'
import Task from '@/models/Task'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// GET - Fetch all milestones for a task
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

    // Verify task exists
    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    // Fetch milestones
    const milestones = await Milestone.find({ 
      task: taskId, 
      isDeleted: false 
    })
      .populate('createdBy', 'firstName lastName employeeCode')
      .populate('progressHistory.updatedBy', 'firstName lastName employeeCode')
      .sort({ order: 1 })

    return NextResponse.json({
      success: true,
      data: milestones
    })

  } catch (error) {
    console.error('Get milestones error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST - Create a new milestone
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

    const taskId = params.id
    const body = await request.json()

    // Verify task exists
    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    // Get the highest order number
    const lastMilestone = await Milestone.findOne({ task: taskId, isDeleted: false })
      .sort({ order: -1 })
    const nextOrder = lastMilestone ? lastMilestone.order + 1 : 0

    // Create milestone
    const milestone = await Milestone.create({
      task: taskId,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      order: nextOrder,
      createdBy: employeeId,
      progress: 0,
      progressHistory: []
    })

    // Update task progress based on all milestones
    await updateTaskProgress(taskId)

    const populatedMilestone = await Milestone.findById(milestone._id)
      .populate('createdBy', 'firstName lastName employeeCode')

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
    const milestones = await Milestone.find({ task: taskId, isDeleted: false })
    
    if (milestones.length === 0) {
      // No milestones, keep task progress as is
      return
    }

    // Calculate average progress
    const totalProgress = milestones.reduce((sum, m) => sum + m.progress, 0)
    const averageProgress = Math.round(totalProgress / milestones.length)

    // Update task progress
    await Task.findByIdAndUpdate(taskId, {
      progress: averageProgress
    })

  } catch (error) {
    console.error('Update task progress error:', error)
  }
}

