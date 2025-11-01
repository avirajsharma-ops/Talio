import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// POST - Assign or reassign task to employees
export async function POST(request) {
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
    const userRole = currentUser?.role || decoded.role

    const { taskId, assignees, action, reason } = await request.json()

    if (!taskId || !assignees || assignees.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Task ID and assignees are required' },
        { status: 400 }
      )
    }

    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canModify = await checkTaskModificationPermission(employeeId, task, userRole)
    if (!canModify.allowed) {
      return NextResponse.json(
        { success: false, message: canModify.reason },
        { status: 403 }
      )
    }

    // Validate assignment permissions for each assignee
    for (const assignee of assignees) {
      const canAssign = await checkAssignmentPermission(employeeId, assignee.employee, userRole)
      if (!canAssign.allowed) {
        return NextResponse.json(
          { success: false, message: `Cannot assign to ${assignee.employee}: ${canAssign.reason}` },
          { status: 403 }
        )
      }
    }

    let actionType = action || 'assign'
    let message = ''

    switch (actionType) {
      case 'assign':
        // Add new assignees
        for (const assignee of assignees) {
          const existingAssignment = task.assignedTo.find(a => 
            a.employee.toString() === assignee.employee.toString())
          
          if (!existingAssignment) {
            task.assignedTo.push({
              employee: assignee.employee,
              role: assignee.role || 'owner',
              assignedAt: new Date(),
              status: 'pending'
            })

            // Add to assignment history
            task.assignmentHistory.push({
              action: 'assigned',
              to: assignee.employee,
              performedBy: employeeId,
              timestamp: new Date(),
              reason: reason || 'Task assignment'
            })
          }
        }
        message = 'Task assigned successfully'
        break

      case 'reassign':
        // Remove existing assignments and add new ones
        const oldAssignees = task.assignedTo.map(a => a.employee)
        task.assignedTo = []

        for (const assignee of assignees) {
          task.assignedTo.push({
            employee: assignee.employee,
            role: assignee.role || 'owner',
            assignedAt: new Date(),
            status: 'pending'
          })

          // Add to assignment history
          task.assignmentHistory.push({
            action: 'reassigned',
            from: oldAssignees[0], // Primary old assignee
            to: assignee.employee,
            performedBy: employeeId,
            timestamp: new Date(),
            reason: reason || 'Task reassignment'
          })
        }
        message = 'Task reassigned successfully'
        break

      case 'delegate':
        // Delegate from current user to new assignees
        const currentAssignment = task.assignedTo.find(a =>
          a.employee.toString() === employeeId.toString())

        if (!currentAssignment) {
          return NextResponse.json(
            { success: false, message: 'You are not assigned to this task' },
            { status: 403 }
          )
        }

        // Mark current assignment as delegated
        currentAssignment.status = 'delegated'
        currentAssignment.delegatedTo = assignees[0].employee

        // Add new assignments
        for (const assignee of assignees) {
          task.assignedTo.push({
            employee: assignee.employee,
            role: assignee.role || 'owner',
            assignedAt: new Date(),
            status: 'pending'
          })

          // Add to assignment history
          task.assignmentHistory.push({
            action: 'delegated',
            from: employeeId,
            to: assignee.employee,
            performedBy: employeeId,
            timestamp: new Date(),
            reason: reason || 'Task delegation'
          })
        }
        message = 'Task delegated successfully'
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update task status if needed
    if (task.status === 'draft') {
      task.status = 'assigned'
    }

    await task.save()

    // Populate the updated task
    await task.populate([
      { path: 'assignedBy', select: 'firstName lastName employeeCode' },
      { path: 'assignedTo.employee', select: 'firstName lastName employeeCode' },
      { path: 'assignmentHistory.from', select: 'firstName lastName' },
      { path: 'assignmentHistory.to', select: 'firstName lastName' },
      { path: 'assignmentHistory.performedBy', select: 'firstName lastName' }
    ])

    return NextResponse.json({
      success: true,
      message,
      data: task
    })

  } catch (error) {
    console.error('Task assignment error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to assign task' },
      { status: 500 }
    )
  }
}

// PUT - Accept or reject task assignment
export async function PUT(request) {
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

    const { taskId, action, reason } = await request.json()

    if (!taskId || !action) {
      return NextResponse.json(
        { success: false, message: 'Task ID and action are required' },
        { status: 400 }
      )
    }

    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Find the assignment for current user
    const assignment = task.assignedTo.find(a =>
      a.employee.toString() === employeeId.toString())

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: 'You are not assigned to this task' },
        { status: 403 }
      )
    }

    let message = ''

    switch (action) {
      case 'accept':
        assignment.status = 'accepted'
        assignment.acceptedAt = new Date()
        
        // Update task status if all assignees have accepted
        const allAccepted = task.assignedTo.every(a => 
          a.status === 'accepted' || a.status === 'delegated')
        
        if (allAccepted && task.status === 'assigned') {
          task.status = 'in_progress'
        }

        // Add to assignment history
        task.assignmentHistory.push({
          action: 'accepted',
          to: employeeId,
          performedBy: employeeId,
          timestamp: new Date(),
          reason: reason || 'Assignment accepted'
        })

        message = 'Task assignment accepted'
        break

      case 'reject':
        assignment.status = 'rejected'
        assignment.rejectionReason = reason || 'Assignment rejected'
        
        // Add to assignment history
        task.assignmentHistory.push({
          action: 'rejected',
          to: employeeId,
          performedBy: employeeId,
          timestamp: new Date(),
          reason: reason || 'Assignment rejected'
        })

        message = 'Task assignment rejected'
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

    await task.save()

    // Populate the updated task
    await task.populate([
      { path: 'assignedBy', select: 'firstName lastName employeeCode' },
      { path: 'assignedTo.employee', select: 'firstName lastName employeeCode' }
    ])

    return NextResponse.json({
      success: true,
      message,
      data: task
    })

  } catch (error) {
    console.error('Task assignment response error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to respond to assignment' },
      { status: 500 }
    )
  }
}

// Helper functions
async function checkTaskModificationPermission(userId, task, userRole) {
  try {
    const user = await Employee.findById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Task creator can always modify
    if (task.assignedBy.toString() === userId.toString()) {
      return { allowed: true, reason: 'task_creator' }
    }

    // Admin and HR can modify any task
    if (['admin', 'hr'].includes(userRole)) {
      return { allowed: true, reason: 'elevated_permissions' }
    }

    // Managers can modify tasks assigned to their team
    if (userRole === 'manager') {
      const assignees = await Employee.find({
        _id: { $in: task.assignedTo.map(a => a.employee) }
      })

      const canModifyAll = assignees.every(assignee =>
        assignee.reportingManager?.toString() === userId.toString())

      if (canModifyAll) {
        return { allowed: true, reason: 'manager_authority' }
      }
    }

    // Current assignees can modify if task allows it
    const isAssignee = task.assignedTo.some(a =>
      a.employee.toString() === userId.toString())

    if (isAssignee && task.canReassign) {
      return { allowed: true, reason: 'assignee_permissions' }
    }

    return { allowed: false, reason: 'insufficient_permissions' }

  } catch (error) {
    console.error('Permission check error:', error)
    return { allowed: false, reason: 'permission_check_failed' }
  }
}

async function checkAssignmentPermission(assignerId, assigneeId, assignerRole) {
  try {
    // Self assignment is always allowed
    if (assignerId.toString() === assigneeId.toString()) {
      return { allowed: true, reason: 'self_assignment' }
    }

    const assigner = await Employee.findById(assignerId)
    const assignee = await Employee.findById(assigneeId)

    if (!assigner || !assignee) {
      return { allowed: false, reason: 'Employee not found' }
    }

    // Check if assigner is manager of assignee
    if (assignee.reportingManager?.toString() === assignerId.toString()) {
      return { allowed: true, reason: 'manager_to_subordinate' }
    }

    // Check if both are in same department (peer assignment)
    if (assigner.department?.toString() === assignee.department?.toString()) {
      return { allowed: true, reason: 'same_department' }
    }

    // Check if assigner has cross-department assignment permission by role
    if (['admin', 'hr', 'manager'].includes(assignerRole)) {
      return { allowed: true, reason: 'elevated_permissions' }
    }

    return { allowed: false, reason: 'insufficient_permissions' }

  } catch (error) {
    console.error('Permission check error:', error)
    return { allowed: false, reason: 'permission_check_failed' }
  }
}
