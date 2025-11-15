import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { sendPushToUser } from '@/lib/pushNotification'

export const dynamic = 'force-dynamic'

/**
 * Save FCM token for a user
 * POST /api/fcm/save-token
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
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { token: fcmToken, userId } = body

    if (!fcmToken) {
      return NextResponse.json(
        { success: false, message: 'FCM token is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user and update FCM token
    const user = await User.findById(userId || decoded.userId)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Initialize fcmTokens array if it doesn't exist
    if (!user.fcmTokens) {
      user.fcmTokens = []
    }

    // Check if token already exists
    const tokenExists = user.fcmTokens.some(t => t.token === fcmToken)
    const isFirstToken = user.fcmTokens.length === 0

    if (!tokenExists) {
      // Add new token
      user.fcmTokens.push({
        token: fcmToken,
        device: 'web', // Can be 'web', 'android', 'ios'
        createdAt: new Date(),
        lastUsed: new Date()
      })

      console.log(`[FCM] New token added for user ${user._id}`)
    } else {
      // Update lastUsed timestamp
      const tokenIndex = user.fcmTokens.findIndex(t => t.token === fcmToken)
      user.fcmTokens[tokenIndex].lastUsed = new Date()

      console.log(`[FCM] Token updated for user ${user._id}`)
    }

    // Remove old tokens (keep only last 5 per user)
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, 5)
    }

    await user.save()

    // Send welcome notification if this is the first token (user just enabled notifications)
    if (isFirstToken && !tokenExists) {
      try {
        // Get employee data for personalized greeting
        let employeeData = null
        if (user.employeeId) {
          try {
            employeeData = await Employee.findById(user.employeeId)
          } catch (error) {
            console.error('[FCM] Error fetching employee data:', error)
          }
        }

        const name = employeeData
          ? [employeeData.firstName, employeeData.lastName].filter(Boolean).join(' ')
          : user.email.split('@')[0]

        // Send welcome notification
        await sendPushToUser(
          user._id,
          {
            title: '🎉 Welcome to Talio!',
            body: `Hi ${name}! You'll now receive important updates and notifications.`,
          },
          {
            eventType: 'welcome',
            clickAction: '/dashboard',
            icon: '/icon-192x192.png',
            data: {
              type: 'welcome',
              timestamp: new Date().toISOString(),
            },
          }
        )

        console.log(`[FCM] Welcome notification sent to ${user.email}`)
      } catch (pushError) {
        console.error('[FCM] Failed to send welcome notification:', pushError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'FCM token saved successfully',
      tokenCount: user.fcmTokens.length,
      isFirstToken: isFirstToken && !tokenExists
    })

  } catch (error) {
    console.error('[FCM] Error saving token:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get FCM tokens for a user
 * GET /api/fcm/save-token
 */
export async function GET(request) {
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
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user
    const user = await User.findById(decoded.userId).select('fcmTokens')

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      tokens: user.fcmTokens || [],
      count: user.fcmTokens?.length || 0
    })

  } catch (error) {
    console.error('[FCM] Error getting tokens:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Delete FCM token for a user
 * DELETE /api/fcm/save-token
 */
export async function DELETE(request) {
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
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { token: fcmToken } = body

    if (!fcmToken) {
      return NextResponse.json(
        { success: false, message: 'FCM token is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user and remove FCM token
    const user = await User.findById(decoded.userId)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Remove token
    if (user.fcmTokens) {
      user.fcmTokens = user.fcmTokens.filter(t => t.token !== fcmToken)
      await user.save()
    }

    return NextResponse.json({
      success: true,
      message: 'FCM token removed successfully'
    })

  } catch (error) {
    console.error('[FCM] Error deleting token:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    )
  }
}

