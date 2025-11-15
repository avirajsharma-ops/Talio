import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// POST - Register/Update FCM token for a user
export async function POST(request) {
  try {
    // Get and verify auth token
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

    const body = await request.json()
    const { fcmToken, device = 'web' } = body

    if (!fcmToken) {
      return NextResponse.json(
        { success: false, message: 'FCM token is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find the user
    const user = await User.findById(decoded.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if this token already exists for this user
    const existingTokenIndex = user.fcmTokens.findIndex(
      (t) => t.token === fcmToken
    )

    if (existingTokenIndex !== -1) {
      // Update existing token's timestamp
      user.fcmTokens[existingTokenIndex].createdAt = new Date()
      user.fcmTokens[existingTokenIndex].device = device
    } else {
      // Add new token
      user.fcmTokens.push({
        token: fcmToken,
        device: device,
        createdAt: new Date(),
      })
    }

    // Keep only the last 5 tokens per user (to avoid storing too many old tokens)
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens.slice(-5)
    }

    await user.save()

    console.log(`[FCM] Token registered for user ${user.email}:`, {
      device,
      tokenCount: user.fcmTokens.length,
    })

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        tokenCount: user.fcmTokens.length,
      },
    })
  } catch (error) {
    console.error('[FCM] Error registering token:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to register FCM token' },
      { status: 500 }
    )
  }
}

// DELETE - Remove FCM token
export async function DELETE(request) {
  try {
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

    const body = await request.json()
    const { fcmToken } = body

    if (!fcmToken) {
      return NextResponse.json(
        { success: false, message: 'FCM token is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findById(decoded.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Remove the token
    user.fcmTokens = user.fcmTokens.filter((t) => t.token !== fcmToken)
    await user.save()

    console.log(`[FCM] Token removed for user ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'FCM token removed successfully',
    })
  } catch (error) {
    console.error('[FCM] Error removing token:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove FCM token' },
      { status: 500 }
    )
  }
}

