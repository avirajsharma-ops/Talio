import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Milestone from '@/models/Milestone'
import Task from '@/models/Task'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// PUT - Update milestone progress
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

    const currentUser = await User.findById(decoded.userId).select('employeeId')
    const employeeId = currentUser?.employeeId

    const milestoneId = params.id
    const body = await request.json()

    const milestone = await Milestone.findById(milestoneId)
    if (!milestone) {
      return NextResponse.json({ success: false, message: 'Milestone not found' }, { status: 404 })
    }

    // Update progress with remark
    if (body.progress !== undefined) {
      if (!body.remark || !body.remark.trim()) {
        return NextResponse.json(
          { success: false, message: 'Remark is required when updating progress' },
          { status: 400 }
        )
      }

      milestone.progress = body.progress
      milestone.progressHistory.push({
        progress: body.progress,
        remark: body.remark,
        updatedBy: employeeId,
        updatedAt: new Date()
      })
    }

    // Update other fields if provided
    if (body.title) milestone.title = body.title
    if (body.description !== undefined) milestone.description = body.description
    if (body.dueDate !== undefined) milestone.dueDate = body.dueDate

    await milestone.save()

    // Update task progress based on all milestones
    await updateTaskProgress(milestone.task)

    const updatedMilestone = await Milestone.findById(milestoneId)
      .populate('createdBy', 'firstName lastName employeeCode')
      .populate('progressHistory.updatedBy', 'firstName lastName employeeCode')

    return NextResponse.json({
      success: true,
      data: updatedMilestone
    })

  } catch (error) {
    console.error('Update milestone error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

// DELETE - Delete milestone
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

    const currentUser = await User.findById(decoded.userId).select('employeeId')
    const employeeId = currentUser?.employeeId

    const milestoneId = params.id

    const milestone = await Milestone.findById(milestoneId)
    if (!milestone) {
      return NextResponse.json({ success: false, message: 'Milestone not found' }, { status: 404 })
    }

    // Soft delete
    milestone.isDeleted = true
    milestone.deletedAt = new Date()
    milestone.deletedBy = employeeId
    await milestone.save()

    // Update task progress based on remaining milestones
    await updateTaskProgress(milestone.task)

    return NextResponse.json({
      success: true,
      message: 'Milestone deleted successfully'
    })

  } catch (error) {
    console.error('Delete milestone error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete milestone' },
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

    // Get the task to check current status
    const task = await Task.findById(taskId)

    // Update task progress
    task.progress = averageProgress

    // Auto-update status when progress reaches 100%
    if (averageProgress === 100 && task.status !== 'completed') {
      task.status = 'completed'
      task.approvalStatus = 'pending'
      task.statusHistory.push({
        status: 'Task auto-completed (100% progress)',
        changedBy: null,
        reason: 'All milestones completed'
      })
    } else if (averageProgress > 0 && averageProgress < 100 && task.status === 'assigned') {
      task.status = 'in_progress'
    }

    await task.save()

  } catch (error) {
    console.error('Update task progress error:', error)
  }
}

