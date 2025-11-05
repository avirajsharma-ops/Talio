import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import { sendOneSignalNotification } from '@/lib/onesignal'

export async function POST(request) {
  try {
    await connectDB()

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload: decoded } = await jwtVerify(token, secret)

    // Get current user's employee data to check if they're a department head
    const currentUser = await User.findById(decoded.userId)
    const currentEmployee = await Employee.findOne({ userId: decoded.userId })

    // Check if user has permission (admin, hr, department_head role, or isDepartmentHead flag)
    const hasPermission = ['admin', 'hr', 'department_head'].includes(decoded.role) ||
                         (currentEmployee && currentEmployee.isDepartmentHead)

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to send notifications' },
        { status: 403 }
      )
    }

    const data = await request.json()
    const { title, message, url, targetType, targetDepartment, targetUsers, targetRoles, scheduleType, scheduledFor } = data

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message are required' },
        { status: 400 }
      )
    }

    // Determine if user is department head (by role or flag)
    const isDeptHead = decoded.role === 'department_head' || (currentEmployee && currentEmployee.isDepartmentHead)

    // Department heads (non-admin/hr) cannot use 'department' or 'role' target types
    if (isDeptHead && !['admin', 'hr'].includes(decoded.role)) {
      if (targetType === 'department') {
        return NextResponse.json(
          { success: false, message: 'Department heads can only send to their own department members' },
          { status: 403 }
        )
      }
      if (targetType === 'role') {
        return NextResponse.json(
          { success: false, message: 'Department heads cannot send notifications by role' },
          { status: 403 }
        )
      }
    }

    // Determine target user IDs based on targetType
    let userIds = []

    if (targetType === 'all') {
      // Department heads can only send to their department
      if (isDeptHead) {
        const deptEmployees = await Employee.find({
          department: currentEmployee.department,
          status: 'active'
        }).select('userId')

        const employeeUserIds = deptEmployees.map(e => e.userId).filter(Boolean)
        userIds = employeeUserIds.map(id => id.toString())
      } else {
        // Admin and HR can send to all
        const users = await User.find({}).select('_id')
        userIds = users.map(u => u._id.toString())
      }
    } else if (targetType === 'department') {
      // Department heads can only send to their own department
      let deptId = targetDepartment
      if (isDeptHead) {
        deptId = currentEmployee.department
      }

      const deptEmployees = await Employee.find({
        department: deptId,
        status: 'active'
      }).select('userId')

      const employeeUserIds = deptEmployees.map(e => e.userId).filter(Boolean)
      userIds = employeeUserIds.map(id => id.toString())
    } else if (targetType === 'role') {
      if (!targetRoles || targetRoles.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Please select at least one role' },
          { status: 400 }
        )
      }

      // Department heads can only send to users in their department
      if (isDeptHead) {
        const deptEmployees = await Employee.find({
          department: currentEmployee.department,
          status: 'active'
        }).select('userId')

        const employeeUserIds = deptEmployees.map(e => e.userId).filter(Boolean)
        const users = await User.find({
          _id: { $in: employeeUserIds },
          role: { $in: targetRoles }
        }).select('_id')

        userIds = users.map(u => u._id.toString())
      } else {
        const users = await User.find({
          role: { $in: targetRoles }
        }).select('_id')

        userIds = users.map(u => u._id.toString())
      }
    } else if (targetType === 'specific') {
      if (!targetUsers || targetUsers.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Please select at least one user' },
          { status: 400 }
        )
      }

      // Department heads can only send to users in their department
      if (isDeptHead) {
        const deptEmployees = await Employee.find({
          department: currentEmployee.department,
          status: 'active'
        }).select('userId')

        const employeeUserIds = deptEmployees.map(e => e.userId?.toString()).filter(Boolean)

        // Filter targetUsers to only include users from department
        userIds = targetUsers.filter(userId => employeeUserIds.includes(userId.toString()))
      } else {
        userIds = targetUsers
      }
    }

    if (userIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No users found matching the criteria' },
        { status: 400 }
      )
    }

    // If scheduled for later, create scheduled notification
    if (scheduleType === 'scheduled' && scheduledFor) {
      const ScheduledNotification = (await import('@/models/ScheduledNotification')).default
      
      const scheduledNotif = await ScheduledNotification.create({
        title,
        message,
        url: url || '/dashboard',
        targetType,
        targetDepartment: targetType === 'department' ? (isDeptHead ? currentEmployee.department : targetDepartment) : null,
        targetUsers: targetType === 'specific' ? userIds : [],
        targetRoles: targetType === 'role' ? targetRoles : [],
        scheduledFor: new Date(scheduledFor),
        createdBy: currentEmployee._id,
        createdByRole: decoded.role,
        recipientCount: userIds.length
      })

      return NextResponse.json({
        success: true,
        message: `Notification scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        data: scheduledNotif
      })
    }

    // Send notification immediately
    const result = await sendOneSignalNotification({
      userIds,
      title,
      message,
      url: url || '/dashboard',
      data: {
        type: 'custom',
        sentBy: currentEmployee._id.toString()
      }
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message || 'Failed to send notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${userIds.length} user(s)`,
      data: {
        recipientCount: userIds.length,
        oneSignalResponse: result
      }
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send notification' },
      { status: 500 }
    )
  }
}

