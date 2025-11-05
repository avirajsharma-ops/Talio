import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendOneSignalNotification, sendOneSignalBroadcast } from '@/lib/onesignal'

/**
 * POST /api/onesignal/send
 * Send push notification via OneSignal
 */
export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      userIds,
      title,
      message,
      url,
      data,
      icon,
      broadcast = false
    } = body

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message are required' },
        { status: 400 }
      )
    }

    let result

    if (broadcast) {
      // Send to all users
      result = await sendOneSignalBroadcast({
        title,
        message,
        url,
        data,
        icon
      })
    } else {
      // Send to specific users
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { success: false, message: 'User IDs are required for targeted notifications' },
          { status: 400 }
        )
      }

      result = await sendOneSignalNotification({
        userIds,
        title,
        message,
        url,
        data,
        icon
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Notification sent successfully'
    })
  } catch (error) {
    console.error('[OneSignal API] Error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

