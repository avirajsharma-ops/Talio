import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { logActivity } from '@/lib/activityLogger'
import { sendPushToUser } from '@/lib/pushNotification'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export async function POST(request, { params }) {
  try {
    await connectDB()

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET)
    const employeeId = decoded.userId

    // Get request body
    const body = await request.json()
    const { action, reason, estimatedActualProgress, remark } = body

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    // Find the task
    const task = await Task.findById(params.id)
      .populate('assignedBy', 'firstName lastName')
      .populate('assignedTo.employee', 'firstName lastName department reportingManager')

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user is manager or TL
    const user = await Employee.findById(employeeId)
    if (!['manager', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Only managers and admins can approve/reject tasks' },
        { status: 403 }
      )
    }

    // Check if task is in review status (awaiting approval)
    if (task.status !== 'review') {
      return NextResponse.json(
        { success: false, message: 'Only tasks in review status can be approved or rejected' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      task.approvalStatus = 'approved'
      task.approvedBy = employeeId
      task.approvedAt = new Date()
      // Move from 'review' to 'completed' when approved
      task.status = 'completed'

      // Add remark if provided
      if (remark) {
        task.managerRemarks.push({
          remark,
          addedBy: employeeId,
          addedAt: new Date()
        })
      }

      task.statusHistory.push({
        status: 'Task approved and completed',
        changedBy: employeeId,
        reason: remark || 'Task approved by manager'
      })
    } else if (action === 'reject') {
      if (!reason || !reason.trim()) {
        return NextResponse.json(
          { success: false, message: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      task.approvalStatus = 'rejected'
      task.rejectionReason = reason
      // Move back to 'assigned' (pending) status when rejected
      // Employee can update and mark complete again to send for review
      task.status = 'assigned'
      // Reset progress to 0 to allow employee to update and resubmit
      task.progress = 0

      // Add remark
      task.managerRemarks.push({
        remark: reason,
        addedBy: employeeId,
        addedAt: new Date()
      })

      task.statusHistory.push({
        status: 'Task rejected and moved back to assigned (pending)',
        changedBy: employeeId,
        reason
      })
    }

    await task.save()

    // Populate for response
    await task.populate('approvedBy', 'firstName lastName')

    // Log activity for task approval/rejection
    await logActivity({
      employeeId: employeeId,
      type: action === 'approve' ? 'task_approve' : 'task_reject',
      action: action === 'approve' ? 'Approved task' : 'Rejected task',
      details: `"${task.title}"${action === 'reject' ? ` - ${reason}` : ''}`,
      relatedModel: 'Task',
      relatedId: task._id
    })

    // Send push notification to task assignees and emit Socket.IO event
    try {
      const assignedEmployeeIds = task.assignedTo.map(a => a.employee)
      const assignedUsers = await User.find({ employeeId: { $in: assignedEmployeeIds } }).select('_id')
      const assignedUserIds = assignedUsers.map(u => u._id.toString())

      if (assignedUserIds.length > 0) {
        const approver = await Employee.findById(employeeId).select('firstName lastName')
        const approverName = approver ? `${approver.firstName} ${approver.lastName}` : 'Manager'
        const status = action === 'approve' ? 'approved' : 'rejected'

        // Send push notification to each assigned user
        for (const userId of assignedUserIds) {
          try {
            await sendPushToUser(
              userId,
              {
                title: `Task ${status === 'approved' ? 'Approved' : 'Rejected'}`,
                body: `${approverName} has ${status} your task: ${task.title}${action === 'reject' && reason ? ` - Reason: ${reason}` : ''}`,
              },
              {
                eventType: status === 'approved' ? 'taskApproved' : 'taskRejected',
                clickAction: `/dashboard/tasks/${task._id}`,
                icon: '/icon-192x192.png',
                data: {
                  taskId: task._id.toString(),
                  status,
                  approverName,
                  reason: action === 'reject' ? reason : null,
                },
              }
            )
          } catch (pushError) {
            console.error(`Failed to send push notification to user ${userId}:`, pushError)
          }
        }

        // Emit Socket.IO event for real-time notification
        try {
          const io = global.io
          if (io) {
            const eventName = action === 'approve' ? 'task-approved' : 'task-rejected'
            assignedUserIds.forEach(userId => {
              io.to(`user:${userId}`).emit(eventName, {
                _id: task._id.toString(),
                title: task.title,
                approverName: approverName,
                reason: action === 'reject' ? reason : null
              })
            })
            console.log(`Socket.IO ${eventName} event emitted to ${assignedUserIds.length} user(s)`)
          }
        } catch (socketError) {
          console.error('Failed to emit Socket.IO task status event:', socketError)
        }

        console.log(`Task ${status} notification sent to ${assignedUserIds.length} user(s)`)
      }
    } catch (notifError) {
      console.error('Failed to send task status notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: `Task ${action}d successfully`,
      data: task
    })
  } catch (error) {
    console.error('Task approval error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process approval', error: error.message },
      { status: 500 }
    )
  }
}

// Add remark to task (managers can add remarks anytime)
export async function PUT(request, { params }) {
  try {
    await connectDB()

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET)
    const employeeId = decoded.userId

    // Get request body
    const body = await request.json()
    const { remark } = body

    if (!remark || !remark.trim()) {
      return NextResponse.json(
        { success: false, message: 'Remark is required' },
        { status: 400 }
      )
    }

    // Find the task
    const task = await Task.findById(params.id)

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user is manager or admin
    const user = await Employee.findById(employeeId)
    if (!['manager', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Only managers and admins can add remarks' },
        { status: 403 }
      )
    }

    // Add remark
    task.managerRemarks.push({
      remark,
      addedBy: employeeId,
      addedAt: new Date()
    })

    await task.save()

    // Populate for response
    await task.populate('managerRemarks.addedBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Remark added successfully',
      data: task
    })
  } catch (error) {
    console.error('Add remark error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to add remark', error: error.message },
      { status: 500 }
    )
  }
}

