/**
 * Send Notification API
 * Test endpoint to send push notifications via OneSignal
 */

import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendOneSignalNotification } from '@/lib/onesignal'

/**
 * POST /api/fcm/send-notification
 * Send a test notification to a user
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
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token, secret)

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

    console.log(`[OneSignal API] Sending notification to user ${targetUser._id}`)
    console.log(`[OneSignal API] User: ${targetUser.email}`)

    // Send notification
    const result = await sendOneSignalNotification({
      userIds: [targetUser._id.toString()],
      title,
      body,
      data,
      url: data.url || '/dashboard'
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
      user: {
        email: targetUser.email,
        name: targetUser.name
      }
    })

  } catch (error) {
    console.error('[OneSignal API] Send error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}