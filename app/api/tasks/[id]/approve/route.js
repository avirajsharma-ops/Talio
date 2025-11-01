import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import Employee from '@/models/Employee'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export async function POST(request, { params }) {
  try {
    await dbConnect()

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

    // Check if task is in completed status
    if (task.status !== 'completed') {
      return NextResponse.json(
        { success: false, message: 'Only completed tasks can be approved or rejected' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      task.approvalStatus = 'approved'
      task.approvedBy = employeeId
      task.approvedAt = new Date()
      
      // Add remark if provided
      if (remark) {
        task.managerRemarks.push({
          remark,
          addedBy: employeeId,
          addedAt: new Date()
        })
      }

      task.statusHistory.push({
        status: 'Task approved',
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
      task.status = 'assigned' // Move back to assigned
      
      // Set estimated actual progress if provided
      if (estimatedActualProgress !== undefined) {
        task.estimatedActualProgress = estimatedActualProgress
        task.progress = estimatedActualProgress
      }

      // Add remark
      task.managerRemarks.push({
        remark: reason,
        addedBy: employeeId,
        addedAt: new Date()
      })

      task.statusHistory.push({
        status: 'Task rejected and moved back to assigned',
        changedBy: employeeId,
        reason
      })
    }

    await task.save()

    // Populate for response
    await task.populate('approvedBy', 'firstName lastName')

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
    await dbConnect()

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

