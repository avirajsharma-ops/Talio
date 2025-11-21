/**
 * Send Notification API
 * Test endpoint to send push notifications
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendPushNotification } from '@/lib/firebaseAdmin'

/**
 * POST /api/fcm/send-notification
 * Send a test notification to a user
 */
export async function POST(request) {
  try {
    // Get session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const { userId, title, body, data = {}, imageUrl = null, deviceType = null } = await request.json()

    if (!title || !body) {
      return NextResponse.json(
        { success: false, message: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find target user (or use current user if no userId provided)
    const targetUser = userId
      ? await User.findById(userId)
      : await User.findOne({ email: session.user.email })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Get FCM tokens
    let tokens = targetUser.fcmTokens || []

    // Filter by device type if specified
    if (deviceType) {
      tokens = tokens.filter(t => t.device === deviceType)
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: deviceType
            ? `No ${deviceType} tokens found for user`
            : 'No FCM tokens found for user'
        },
        { status: 404 }
      )
    }

    // Extract token strings
    const tokenStrings = tokens.map(t => t.token)

    console.log(`[FCM API] Sending notification to ${tokenStrings.length} token(s)`)
    console.log(`[FCM API] User: ${targetUser.email}`)
    console.log(`[FCM API] Device types: ${tokens.map(t => t.device).join(', ')}`)

    // Send notification
    const result = await sendPushNotification({
      tokens: tokenStrings,
      title,
      body,
      data,
      imageUrl
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors,
      user: {
        email: targetUser.email,
        name: targetUser.name
      },
      tokens: {
        total: tokenStrings.length,
        devices: tokens.map(t => t.device)
      }
    })

  } catch (error) {
    console.error('[FCM API] Send error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}