import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Project from '@/models/Project'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

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

    const milestone = await Task.findById(milestoneId)
    if (!milestone) {
      return NextResponse.json({ success: false, message: 'Milestone not found' }, { status: 404 })
    }

    // Handle milestone completion
    if (body.complete === true) {
      if (!body.completionRemark || !body.completionRemark.trim()) {
        return NextResponse.json({
          success: false,
          message: 'Completion remark is required'
        }, { status: 400 })
      }

      milestone.status = 'completed'
      milestone.progress = 100
      milestone.completionRemark = body.completionRemark
      milestone.completedAt = new Date()
      milestone.completedBy = employeeId

      // Add to progress history
      milestone.progressHistory.push({
        progress: 100,
        remark: body.completionRemark,
        updatedBy: employeeId,
        updatedAt: new Date()
      })

      // Add timeline entry to task
      const task = await Task.findById(milestone.task)
      if (task) {
        task.statusHistory.push({
          status: `Task completed: ${milestone.title}`,
          changedBy: employeeId,
          reason: body.completionRemark
        })
        await task.save()
      }

      // Log activity for milestone completion
      await logActivity({
        employeeId: employeeId,
        type: 'milestone_complete',
        action: 'Completed milestone',
        details: `"${milestone.title}" - ${body.completionRemark}`,
        metadata: {
          milestoneId: milestone._id,
          taskId: milestone.task
        },
        relatedModel: 'Milestone',
        relatedId: milestone._id
      })
    }
    // Update progress with remark (legacy support)
    else if (body.progress !== undefined) {
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

    const updatedMilestone = await Task.findById(milestoneId)
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

    const milestone = await Task.findById(milestoneId)
    if (!milestone) {
      return NextResponse.json({ success: false, message: 'Milestone not found' }, { status: 404 })
    }

    // Soft delete
    milestone.isDeleted = true
    milestone.deletedAt = new Date()
    milestone.deletedBy = employeeId
    await milestone.save()

    // Add timeline entry to task
    const task = await Task.findById(milestone.task)
    if (task) {
      task.statusHistory.push({
        status: `Milestone deleted: ${milestone.title}`,
        changedBy: employeeId,
        reason: 'Milestone removed from task'
      })
      await task.save()
    }

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
    const milestones = await Task.find({ task: taskId, isDeleted: false })

    if (milestones.length === 0) {
      // No milestones, keep task progress as is
      return
    }

    // Calculate progress based on completion ratio
    const completedMilestones = milestones.filter(m => m.status === 'completed').length
    const totalMilestones = milestones.length
    const averageProgress = Math.round((completedMilestones / totalMilestones) * 100)

    // Get the task to check current status
    const task = await Task.findById(taskId)

    // Update task progress
    task.progress = averageProgress

    // DO NOT auto-complete task when progress reaches 100%
    // Employee must manually send task for review using "Send for Review" button
    // Only auto-update status from 'assigned' to 'in_progress' when work starts
    if (averageProgress > 0 && task.status === 'assigned') {
      task.status = 'in_progress'
      task.statusHistory.push({
        status: 'Project status changed to in_progress',
        changedBy: null,
        reason: 'Work started on milestones'
      })
    }

    await task.save()

  } catch (error) {
    console.error('Update task progress error:', error)
  }
}

