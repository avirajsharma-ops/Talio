import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import Notification from '@/models/Notification'
import { sendFCMNotification } from '@/lib/firebaseAdmin'

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

    console.log('[Notifications] Current user:', {
      userId: decoded.userId,
      role: decoded.role,
      hasEmployeeId: !!currentUser?.employeeId
    })

    // Find employee by reverse lookup (User has employeeId field)
    let currentEmployee = null
    let userDepartment = null
    if (currentUser && currentUser.employeeId) {
      currentEmployee = await Employee.findById(currentUser.employeeId)

      // Check if this employee is a department head
      if (currentEmployee) {
        userDepartment = await Department.findOne({
          head: currentEmployee._id,
          isActive: true
        })
      }

      console.log('[Notifications] Current employee:', {
        employeeId: currentEmployee?._id,
        isDepartmentHead: !!userDepartment,
        department: currentEmployee?.department,
        headOfDepartment: userDepartment?._id
      })
    }

    // Check if user has permission (admin, hr, department_head role, or is a department head)
    const hasPermission = ['admin', 'hr', 'department_head'].includes(decoded.role) ||
                         !!userDepartment

    console.log('[Notifications] Permission check:', {
      role: decoded.role,
      hasPermission,
      isDepartmentHead: !!userDepartment
    })

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

    // Determine if user is department head (by role or by being head of a department)
    const isDeptHead = decoded.role === 'department_head' || !!userDepartment

    // Department heads need an employee record to send notifications
    if (isDeptHead && !['admin', 'hr'].includes(decoded.role) && !currentEmployee) {
      return NextResponse.json(
        { success: false, message: 'Employee record not found. Please contact administrator.' },
        { status: 403 }
      )
    }

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
      if (isDeptHead && !['admin', 'hr'].includes(decoded.role)) {
        const deptEmployees = await Employee.find({
          department: userDepartment._id,
          status: 'active'
        }).select('_id')

        const employeeIds = deptEmployees.map(e => e._id)
        const users = await User.find({ employeeId: { $in: employeeIds } }).select('_id')
        userIds = users.map(u => u._id.toString())
      } else {
        // Admin and HR can send to all
        const users = await User.find({}).select('_id')
        userIds = users.map(u => u._id.toString())
      }
    } else if (targetType === 'department') {
      // Department heads can only send to their own department
      let deptId = targetDepartment
      if (isDeptHead && !['admin', 'hr'].includes(decoded.role)) {
        deptId = userDepartment._id
      }

      const deptEmployees = await Employee.find({
        department: deptId,
        status: 'active'
      }).select('_id')

      const employeeIds = deptEmployees.map(e => e._id)
      const users = await User.find({ employeeId: { $in: employeeIds } }).select('_id')
      userIds = users.map(u => u._id.toString())
    } else if (targetType === 'role') {
      if (!targetRoles || targetRoles.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Please select at least one role' },
          { status: 400 }
        )
      }

      // Department heads can only send to users in their department
      if (isDeptHead && !['admin', 'hr'].includes(decoded.role)) {
        const deptEmployees = await Employee.find({
          department: userDepartment._id,
          status: 'active'
        }).select('_id')

        const employeeIds = deptEmployees.map(e => e._id)
        const users = await User.find({
          employeeId: { $in: employeeIds },
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
      if (isDeptHead && !['admin', 'hr'].includes(decoded.role)) {
        const deptEmployees = await Employee.find({
          department: userDepartment._id,
          status: 'active'
        }).select('_id')

        const employeeIds = deptEmployees.map(e => e._id.toString())
        console.log('Department employees found:', employeeIds.length)

        // Get users for these employees
        const deptUsers = await User.find({
          employeeId: { $in: employeeIds }
        }).select('_id')

        const deptUserIds = deptUsers.map(u => u._id.toString())
        console.log('Department users found:', deptUserIds.length)
        console.log('Target users selected:', targetUsers.length)

        // Filter targetUsers to only include users from department
        userIds = targetUsers.filter(userId => deptUserIds.includes(userId.toString()))
        console.log('Filtered user IDs:', userIds.length)
      } else {
        userIds = targetUsers
      }
    }

    console.log('Target type:', targetType)
    console.log('User IDs found:', userIds.length)
    console.log('Is dept head:', isDeptHead)
    console.log('User department:', userDepartment?._id)

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
        targetDepartment: targetType === 'department' ? (isDeptHead && !['admin', 'hr'].includes(decoded.role) && userDepartment ? userDepartment._id : targetDepartment) : null,
        targetUsers: targetType === 'specific' ? userIds : [],
        targetRoles: targetType === 'role' ? targetRoles : [],
        scheduledFor: new Date(scheduledFor),
        createdBy: currentEmployee ? currentEmployee._id : decoded.userId,
        createdByRole: decoded.role,
        recipientCount: userIds.length
      })

      return NextResponse.json({
        success: true,
        message: `Notification scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        data: scheduledNotif
      })
    }

    // Create notification records in database for each user
    const notificationRecords = []
    const now = new Date()

    for (const userId of userIds) {
      const notificationData = {
        user: userId,
        title,
        message,
        url: url || '/dashboard',
        type: 'custom',
        priority: 'medium',
        data: {
          sentBy: currentEmployee ? currentEmployee._id.toString() : decoded.userId
        },
        sentBy: currentEmployee ? currentEmployee._id : null,
        sentByRole: decoded.role,
        deliveryStatus: {
          fcm: { sent: false }
        },
        createdAt: now
      }
      notificationRecords.push(notificationData)
    }

    // Save all notifications to database
    let savedNotifications = []
    try {
      savedNotifications = await Notification.insertMany(notificationRecords)
      console.log(`[Database] Saved ${savedNotifications.length} notification(s) to database`)
    } catch (dbError) {
      console.error('[Database] Error saving notifications:', dbError)
      // Continue even if database save fails
    }

    // Get FCM tokens for all target users
    const usersWithTokens = await User.find({
      _id: { $in: userIds },
      'fcmTokens.0': { $exists: true }
    }).select('fcmTokens')

    // Collect all FCM tokens
    const fcmTokens = []
    usersWithTokens.forEach(user => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        user.fcmTokens.forEach(tokenObj => {
          if (tokenObj.token) {
            fcmTokens.push(tokenObj.token)
          }
        })
      }
    })

    console.log(`[FCM] Found ${fcmTokens.length} FCM token(s) for ${userIds.length} user(s)`)

    // Send notification via Firebase Cloud Messaging
    let fcmResult = { success: false, message: 'No FCM tokens found' }
    if (fcmTokens.length > 0) {
      try {
        fcmResult = await sendFCMNotification({
          tokens: fcmTokens,
          title,
          body: message,
          data: {
            type: 'custom',
            sentBy: currentEmployee ? currentEmployee._id.toString() : decoded.userId,
            url: url || '/dashboard'
          },
          icon: '/icons/icon-192x192.png'
        })

        if (fcmResult.success) {
          console.log(`[FCM] Notification sent: ${fcmResult.successCount} success, ${fcmResult.failureCount} failures`)

          // Update delivery status in database
          if (savedNotifications.length > 0) {
            await Notification.updateMany(
              { _id: { $in: savedNotifications.map(n => n._id) } },
              {
                'deliveryStatus.fcm.sent': true,
                'deliveryStatus.fcm.sentAt': new Date(),
                'deliveryStatus.fcm.successCount': fcmResult.successCount,
                'deliveryStatus.fcm.failureCount': fcmResult.failureCount
              }
            )
          }
        } else {
          console.warn(`[FCM] Failed to send notification:`, fcmResult.message)
        }
      } catch (fcmError) {
        console.error('[FCM] Error sending notification:', fcmError)
        fcmResult = { success: false, message: fcmError.message }
      }
    } else {
      console.warn('[FCM] No FCM tokens found for target users')
    }

    // Success if FCM succeeded OR notifications saved to DB
    const notificationSent = fcmResult.success || savedNotifications.length > 0

    if (!notificationSent) {
      console.warn('[Notification] FCM failed and database save failed')
      return NextResponse.json(
        { success: false, message: 'Failed to send notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${userIds.length} user(s)`,
      data: {
        recipientCount: userIds.length,
        savedToDatabase: savedNotifications.length,
        fcmSuccess: fcmResult.success,
        fcmTokensFound: fcmTokens.length,
        fcmSuccessCount: fcmResult.successCount || 0,
        fcmFailureCount: fcmResult.failureCount || 0,
        methods: {
          database: savedNotifications.length > 0 ? 'saved' : 'failed',
          fcm: fcmResult.success ? 'sent' : 'failed'
        }
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

