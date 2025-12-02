import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ScheduledNotification from '@/models/ScheduledNotification'
import Notification from '@/models/Notification'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import { sendPushToUsers } from '@/lib/pushNotification'

export async function GET(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured')
      return NextResponse.json(
        { success: false, message: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized access attempt')
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Find all pending scheduled notifications that are due
    const now = new Date()
    const dueNotifications = await ScheduledNotification.find({
      status: 'pending',
      scheduledFor: { $lte: now }
    }).populate('targetDepartment')

    console.log(`[Cron] Found ${dueNotifications.length} due notifications`)

    let processedCount = 0
    let failedCount = 0

    for (const scheduledNotif of dueNotifications) {
      try {
        console.log(`[Cron] Processing notification: ${scheduledNotif._id}`)

        // Determine target user IDs based on targetType
        let userIds = []

        if (scheduledNotif.targetType === 'all') {
          const users = await User.find({}).select('_id')
          userIds = users.map(u => u._id.toString())
        } else if (scheduledNotif.targetType === 'department') {
          const deptEmployees = await Employee.find({
            department: scheduledNotif.targetDepartment,
            status: 'active'
          }).select('_id')

          const employeeIds = deptEmployees.map(e => e._id)
          const users = await User.find({ employeeId: { $in: employeeIds } }).select('_id')
          userIds = users.map(u => u._id.toString())
        } else if (scheduledNotif.targetType === 'role') {
          const users = await User.find({
            role: { $in: scheduledNotif.targetRoles }
          }).select('_id')
          userIds = users.map(u => u._id.toString())
        } else if (scheduledNotif.targetType === 'specific') {
          userIds = scheduledNotif.targetUsers.map(id => id.toString())
        }

        if (userIds.length === 0) {
          console.warn(`[Cron] No users found for notification ${scheduledNotif._id}`)
          scheduledNotif.status = 'failed'
          scheduledNotif.failureReason = 'No users found matching criteria'
          await scheduledNotif.save()
          failedCount++
          continue
        }

        console.log(`[Cron] Sending to ${userIds.length} users`)

        // Create notification records in database for each user
        const notificationRecords = []
        const sendTime = new Date()

        for (const userId of userIds) {
          notificationRecords.push({
            user: userId,
            title: scheduledNotif.title,
            message: scheduledNotif.message,
            url: scheduledNotif.url || '/dashboard',
            type: 'custom',
            priority: 'medium',
            data: {
              sentBy: scheduledNotif.createdBy.toString()
            },
            sentBy: scheduledNotif.createdBy,
            sentByRole: scheduledNotif.createdByRole,
            deliveryStatus: {
              fcm: { sent: false }
            },
            createdAt: sendTime
          })
        }

        // Save all notifications to database
        let savedNotifications = []
        try {
          savedNotifications = await Notification.insertMany(notificationRecords)
          console.log(`[Cron] Saved ${savedNotifications.length} notification records to database`)
        } catch (dbError) {
          console.error('[Cron] Error saving notifications:', dbError)
        }

        // Send Firebase push notification
        let pushResult = { success: false }
        try {
          pushResult = await sendPushToUsers(
            userIds,
            {
              title: scheduledNotif.title,
              body: scheduledNotif.message
            },
            {
              data: {
                type: 'custom',
                sentBy: scheduledNotif.createdBy.toString(),
                url: scheduledNotif.url || '/dashboard'
              },
              url: scheduledNotif.url || '/dashboard',
              type: 'custom'
            }
          )

          if (pushResult.success && savedNotifications.length > 0) {
            await Notification.updateMany(
              { _id: { $in: savedNotifications.map(n => n._id) } },
              {
                'deliveryStatus.fcm.sent': true,
                'deliveryStatus.fcm.sentAt': sendTime
              }
            )
          }

          console.log(`[Cron] Push notification result:`, pushResult.success ? 'success' : 'failed')
        } catch (firebaseError) {
          console.error('[Cron] Firebase error:', firebaseError)
        }

        // Update scheduled notification status
        scheduledNotif.status = pushResult.success || savedNotifications.length > 0 ? 'sent' : 'failed'
        scheduledNotif.sentAt = sendTime
        scheduledNotif.recipientCount = userIds.length
        
        if (!pushResult.success && savedNotifications.length === 0) {
          scheduledNotif.failureReason = 'Failed to send notification'
        }
        
        await scheduledNotif.save()

        if (scheduledNotif.status === 'sent') {
          processedCount++
        } else {
          failedCount++
        }

      } catch (notifError) {
        console.error(`[Cron] Error processing notification ${scheduledNotif._id}:`, notifError)
        
        try {
          scheduledNotif.status = 'failed'
          scheduledNotif.failureReason = notifError.message
          await scheduledNotif.save()
        } catch (saveError) {
          console.error('[Cron] Failed to update notification status:', saveError)
        }
        
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} notifications, ${failedCount} failed`,
      data: {
        total: dueNotifications.length,
        processed: processedCount,
        failed: failedCount
      }
    })
  } catch (error) {
    console.error('[Cron] Process scheduled notifications error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process scheduled notifications' },
      { status: 500 }
    )
  }
}
