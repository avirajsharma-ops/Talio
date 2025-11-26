/**
 * OneSignal Token Registration API (Legacy FCM endpoint)
 * This endpoint is kept for backward compatibility but now uses OneSignal
 */

import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

/**
 * POST /api/fcm/register-token
 * Register user with OneSignal (backward compatible endpoint)
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
    const { payload: decoded } = await jwtVerify(token, secret)

    // Parse request body
    const { token: oneSignalId, device = 'web' } = await request.json()

    if (!oneSignalId) {
      return NextResponse.json(
        { success: false, message: 'OneSignal ID is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user
    const user = await User.findById(decoded.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`[OneSignal] User ${user.email} registered with device: ${device}`)

    return NextResponse.json({
      success: true,
      message: 'Registered with OneSignal successfully',
      device
    })

  } catch (error) {
    console.error('[OneSignal] Registration error:', error)
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