import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ScheduledNotification from '@/models/ScheduledNotification'
import RecurringNotification from '@/models/RecurringNotification'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { sendOneSignalNotification } from '@/lib/onesignal'
import { sendPushToUsers } from '@/lib/pushNotification'

/**
 * This endpoint should be called by a cron job every minute
 * to process scheduled and recurring notifications
 * 
 * You can use services like:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - External cron services (cron-job.org, etc.)
 * 
 * Example cron expression: * * * * * (every minute)
 */
export async function GET(request) {
  try {
    await connectDB()

    // Verify cron secret to prevent unauthorized access
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const results = {
      scheduled: { processed: 0, sent: 0, failed: 0 },
      recurring: { processed: 0, sent: 0, failed: 0 }
    }

    // Process scheduled notifications
    const scheduledNotifications = await ScheduledNotification.find({
      status: 'pending',
      scheduledFor: { $lte: now }
    }).populate('createdBy', 'firstName lastName')

    for (const notification of scheduledNotifications) {
      results.scheduled.processed++

      try {
        // Get target user IDs
        const userIds = await getTargetUserIds(notification)

        if (userIds.length === 0) {
          notification.status = 'failed'
          notification.error = 'No users found matching the criteria'
          await notification.save()
          results.scheduled.failed++
          continue
        }

        // Send notification
        const result = await sendOneSignalNotification({
          userIds,
          title: notification.title,
          message: notification.message,
          url: notification.url || '/dashboard',
          data: {
            type: 'scheduled',
            notificationId: notification._id.toString()
          }
        })

        // Send Firebase push notification
        let firebasePushResult = { success: false }
        try {
          console.log(`[Firebase] Sending scheduled notification to ${userIds.length} user(s)`)
          
          firebasePushResult = await sendPushToUsers(
            userIds,
            {
              title: notification.title,
              body: notification.message
            },
            {
              data: {
                type: 'scheduled',
                notificationId: notification._id.toString(),
                url: notification.url || '/dashboard'
              },
              url: notification.url || '/dashboard',
              type: 'scheduled'
            }
          )

          if (firebasePushResult.success) {
            console.log(`[Firebase] Scheduled notification sent successfully to ${firebasePushResult.successCount || userIds.length} user(s)`)
          }
        } catch (firebaseError) {
          console.error('[Firebase] Error sending scheduled notification:', firebaseError)
        }

        if (result.success || firebasePushResult.success) {
          notification.status = 'sent'
          notification.sentAt = now
          notification.successCount = userIds.length
          results.scheduled.sent++
        } else {
          notification.status = 'failed'
          notification.error = result.message || 'Failed to send notification'
          notification.failureCount = userIds.length
          results.scheduled.failed++
        }

        await notification.save()
      } catch (error) {
        console.error('Error processing scheduled notification:', error)
        notification.status = 'failed'
        notification.error = error.message
        await notification.save()
        results.scheduled.failed++
      }
    }

    // Process recurring notifications
    const recurringNotifications = await RecurringNotification.find({
      isActive: true,
      nextScheduledAt: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).populate('createdBy', 'firstName lastName')

    for (const notification of recurringNotifications) {
      results.recurring.processed++

      try {
        // Get target user IDs
        const userIds = await getTargetUserIds(notification)

        if (userIds.length === 0) {
          console.log(`No users found for recurring notification ${notification._id}`)
          // Still update next schedule even if no users found
          notification.nextScheduledAt = notification.calculateNextSchedule()
          await notification.save()
          results.recurring.failed++
          continue
        }

        // Send notification
        const result = await sendOneSignalNotification({
          userIds,
          title: notification.title,
          message: notification.message,
          url: notification.url || '/dashboard',
          data: {
            type: 'recurring',
            notificationId: notification._id.toString()
          }
        })

        // Send Firebase push notification
        let firebasePushResult = { success: false }
        try {
          console.log(`[Firebase] Sending recurring notification to ${userIds.length} user(s)`)
          
          firebasePushResult = await sendPushToUsers(
            userIds,
            {
              title: notification.title,
              body: notification.message
            },
            {
              data: {
                type: 'recurring',
                notificationId: notification._id.toString(),
                url: notification.url || '/dashboard'
              },
              url: notification.url || '/dashboard',
              type: 'recurring'
            }
          )

          if (firebasePushResult.success) {
            console.log(`[Firebase] Recurring notification sent successfully to ${firebasePushResult.successCount || userIds.length} user(s)`)
          }
        } catch (firebaseError) {
          console.error('[Firebase] Error sending recurring notification:', firebaseError)
        }

        // Update statistics
        notification.lastSentAt = now
        notification.totalSent++

        if (result.success || firebasePushResult.success) {
          notification.totalSuccess += userIds.length
          results.recurring.sent++
        } else {
          notification.totalFailure += userIds.length
          results.recurring.failed++
        }

        // Calculate next scheduled time
        notification.nextScheduledAt = notification.calculateNextSchedule()
        
        // If no next schedule (end date passed), deactivate
        if (!notification.nextScheduledAt) {
          notification.isActive = false
        }

        await notification.save()
      } catch (error) {
        console.error('Error processing recurring notification:', error)
        notification.totalFailure++
        notification.nextScheduledAt = notification.calculateNextSchedule()
        await notification.save()
        results.recurring.failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications processed successfully',
      data: results
    })
  } catch (error) {
    console.error('Process notifications error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process notifications' },
      { status: 500 }
    )
  }
}

// Helper function to get target user IDs based on notification settings
async function getTargetUserIds(notification) {
  let userIds = []

  if (notification.targetType === 'all') {
    const users = await User.find({}).select('_id')
    userIds = users.map(u => u._id.toString())
  } else if (notification.targetType === 'department') {
    const deptEmployees = await Employee.find({ 
      department: notification.targetDepartment,
      status: 'active'
    }).select('_id')
    
    const employeeIds = deptEmployees.map(e => e._id.toString())
    const users = await User.find({ 
      employeeId: { $in: employeeIds }
    }).select('_id')
    
    userIds = users.map(u => u._id.toString())
  } else if (notification.targetType === 'role') {
    const users = await User.find({ 
      role: { $in: notification.targetRoles }
    }).select('_id')
    
    userIds = users.map(u => u._id.toString())
  } else if (notification.targetType === 'specific') {
    userIds = notification.targetUsers.map(u => u.toString())
  }

  return userIds
}

