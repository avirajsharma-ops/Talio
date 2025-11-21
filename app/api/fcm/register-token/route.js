/**
 * FCM Token Registration API
 * Registers FCM tokens for push notifications
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

/**
 * POST /api/fcm/register-token
 * Register or update FCM token for a user
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
    const { token, device = 'web' } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      )
    }

    // Validate device type
    const validDevices = ['web', 'android', 'ios']
    if (!validDevices.includes(device)) {
      return NextResponse.json(
        { success: false, message: 'Invalid device type' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if token already exists
    const existingTokenIndex = user.fcmTokens?.findIndex(t => t.token === token)

    if (existingTokenIndex !== -1) {
      // Update existing token
      user.fcmTokens[existingTokenIndex].lastUsed = new Date()
      user.fcmTokens[existingTokenIndex].device = device
      console.log(`[FCM] Token updated for user ${user.email}: ${device}`)
    } else {
      // Add new token
      if (!user.fcmTokens) {
        user.fcmTokens = []
      }

      user.fcmTokens.push({
        token,
        device,
        createdAt: new Date(),
        lastUsed: new Date()
      })

      // Keep only last 5 tokens per device type
      const deviceTokens = user.fcmTokens.filter(t => t.device === device)
      if (deviceTokens.length > 5) {
        // Remove oldest tokens
        const tokensToRemove = deviceTokens
          .sort((a, b) => a.lastUsed - b.lastUsed)
          .slice(0, deviceTokens.length - 5)
          .map(t => t.token)

        user.fcmTokens = user.fcmTokens.filter(t => !tokensToRemove.includes(t.token))
      }

      console.log(`[FCM] Token registered for user ${user.email}: ${device}`)
    }

    // Save user
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Token registered successfully',
      device,
      tokenCount: user.fcmTokens.length
    })

  } catch (error) {
    console.error('[FCM] Registration error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/fcm/register-token
 * Remove FCM token for a user
 */
export async function DELETE(request) {
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
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user and remove token
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Remove token
    user.fcmTokens = user.fcmTokens?.filter(t => t.token !== token) || []
    await user.save()

    console.log(`[FCM] Token removed for user ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Token removed successfully'
    })

  } catch (error) {
    console.error('[FCM] Delete error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}