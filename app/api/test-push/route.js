import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/pushNotification'
import { verifyToken } from '@/lib/auth'

/**
 * Test push notification endpoint
 * Send a test notification to the logged-in user
 */
export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    console.log('[Test Push] Sending test notification to user:', userId)

    // Send test notification
    const result = await sendPushToUser(
      userId,
      {
        title: '🎉 Test Notification',
        body: 'This is a test push notification from Talio HRMS! If you see this, push notifications are working correctly.',
      },
      {
        eventType: 'test',
        clickAction: '/dashboard',
        icon: '/icons/icon-192x192.png',
        data: {
          testTime: new Date().toISOString(),
          type: 'test',
        },
      }
    )

    if (result.success) {
      console.log('[Test Push] ✅ Test notification sent successfully')
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully! Check your device.',
        result,
      })
    } else {
      console.error('[Test Push] ❌ Failed to send test notification:', result.error)
      return NextResponse.json({
        success: false,
        message: 'Failed to send test notification',
        error: result.error,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Test Push] Error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

