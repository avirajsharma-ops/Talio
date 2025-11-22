import { NextResponse } from 'next/server'
import { sendOneSignalNotification } from '@/lib/onesignal'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Notification from '@/models/Notification'

/**
 * Test endpoint for Android push notifications
 * POST /api/test-notification
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, type = 'message', customTitle, customMessage } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Get user to verify FCM tokens exist
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No FCM tokens found for user. Please login on Android app first.',
          userId: user._id,
          email: user.email
        },
        { status: 400 }
      )
    }

    // Prepare test notification based on type
    const notifications = {
      message: {
        title: customTitle || '💬 Test Message Notification',
        message: customMessage || 'This is a test message. If you see this, your WhatsApp-like notifications are working! App can be killed.',
        type: 'message',
        data: {
          chatId: 'test-chat-' + Date.now(),
          senderId: 'test-sender',
          url: '/chat/test'
        }
      },
      task: {
        title: customTitle || '📋 Test Task Notification',
        message: customMessage || 'You have been assigned a test task. Check if vibration pattern is different from messages!',
        type: 'task',
        data: {
          taskId: 'test-task-' + Date.now(),
          url: '/tasks/test'
        }
      },
      announcement: {
        title: customTitle || '📢 Test Announcement',
        message: customMessage || 'This is a test announcement. Notice the longer vibration pattern!',
        type: 'announcement',
        data: {
          announcementId: 'test-announcement-' + Date.now(),
          url: '/announcements/test'
        }
      },
      general: {
        title: customTitle || '🔔 Test General Notification',
        message: customMessage || 'This is a general test notification.',
        type: 'system',
        data: {
          url: '/dashboard'
        }
      }
    }

    const notification = notifications[type] || notifications.message

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🧪 TEST NOTIFICATION`)
    console.log('='.repeat(80))
    console.log(`User: ${user.email} (${user._id})`)
    console.log(`Type: ${type}`)
    console.log(`Title: ${notification.title}`)
    console.log('='.repeat(80) + '\n')

    console.log(`\n🚀 Sending notification via OneSignal:`)
    console.log(`   User ID: ${user._id}`)
    console.log(`   Type: ${notification.type}`)
    console.log(`   Title: ${notification.title}`)
    console.log(`   Message: ${notification.message}`)
    console.log('')

    // Send notification via OneSignal
    const result = await sendOneSignalNotification({
      userIds: [user._id.toString()],
      title: notification.title,
      message: notification.message,
      data: {
        ...notification.data,
        type: notification.type,
        title: notification.title,
        body: notification.message,
        message: notification.message
      },
      url: '/dashboard'
    })

    console.log(`\n📊 Test Result:`)
    console.log(`   Success: ${result.success}`)
    if (result.error) {
      console.log(`   Error: ${result.message || result.error}`)
    }
    console.log('')

    // Save to database
    try {
      const notificationType = notification.type === 'message' ? 'chat' :
        notification.type === 'task' ? 'task' :
          notification.type === 'announcement' ? 'announcement' : 'system'

      await Notification.create({
        user: user._id,
        title: notification.title,
        message: notification.message,
        type: notificationType,
        url: notification.data?.url || '/dashboard',
        icon: '/icons/icon-192x192.png',
        data: notification.data || {},
        deliveryStatus: {
          socketIO: {
            sent: false
          },
          oneSignal: {
            sent: result.successCount > 0,
            sentAt: result.successCount > 0 ? new Date() : null
          }
        }
      })
      console.log('✅ Saved notification to database')
    } catch (dbError) {
      console.error('❌ Failed to save to database:', dbError.message)
    }

    return NextResponse.json({
      success: result.success && result.successCount > 0,
      message: result.success && result.successCount > 0
        ? '✅ Test notification sent! Check your Android device.'
        : '❌ Failed to send notification',
      details: {
        type,
        fcmSuccess: result.successCount || 0,
        fcmFailure: result.failureCount || 0,
        fcmTokensCount: user.fcmTokens.length,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        },
        notification: {
          title: notification.title,
          message: notification.message,
          type: notification.type
        },
        instructions: [
          '1. Make sure your Android app is FORCE STOPPED (Settings → Apps → Talio → Force Stop)',
          '2. Check your notification panel',
          '3. You should see the notification with sound and vibration',
          '4. Check ADB logs: adb logcat | grep TalioFCM'
        ]
      },
      error: result.success ? null : (result.message || 'Unknown error')
    })
  } catch (error) {
    console.error('❌ Test notification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Get test information
 * GET /api/test-notification
 */
export async function GET() {
  return NextResponse.json({
    message: 'Android Push Notification Test Endpoint',
    usage: {
      method: 'POST',
      endpoint: '/api/test-notification',
      body: {
        userId: 'string (required) - User ID to send test notification to',
        type: 'string (optional) - message | task | announcement | general (default: message)',
        customTitle: 'string (optional) - Custom notification title',
        customMessage: 'string (optional) - Custom notification message'
      },
      example: {
        userId: '507f1f77bcf86cd799439011',
        type: 'message'
      }
    },
    testScenarios: [
      {
        name: 'Message Notification',
        type: 'message',
        channel: 'talio_messages',
        vibration: 'Short-short-short (250ms)',
        led: 'Blue'
      },
      {
        name: 'Task Notification',
        type: 'task',
        channel: 'talio_tasks',
        vibration: 'Medium-medium (300ms)',
        led: 'Green'
      },
      {
        name: 'Announcement Notification',
        type: 'announcement',
        channel: 'talio_announcements',
        vibration: 'Long-long (500ms)',
        led: 'Yellow'
      },
      {
        name: 'General Notification',
        type: 'system',
        channel: 'talio_general',
        vibration: 'Default',
        led: 'White'
      }
    ],
    instructions: [
      '1. Get your user ID from the database or login response',
      '2. Force stop the Android app (Settings → Apps → Talio → Force Stop)',
      '3. Send POST request to this endpoint with userId and type',
      '4. Check your Android device notification panel',
      '5. Monitor logs: adb logcat | grep TalioFCM'
    ]
  })
}

