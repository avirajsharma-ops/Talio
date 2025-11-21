import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

/**
 * Save OneSignal Player ID to user profile
 * POST /api/onesignal/subscribe
 */
export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = await jwtVerify(token, JWT_SECRET)
    const userId = decoded.payload.userId

    const body = await request.json()
    const { playerId, subscriptionId } = body

    // OneSignal Player ID and Subscription ID are the same thing
    const oneSignalPlayerId = playerId || subscriptionId

    if (!oneSignalPlayerId) {
      return NextResponse.json(
        { success: false, error: 'OneSignal Player ID is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Update user with OneSignal Player ID
    const user = await User.findByIdAndUpdate(
      userId,
      {
        oneSignalPlayerId,
        oneSignalSubscribedAt: new Date(),
        oneSignalLastPromptedAt: new Date()
      },
      { new: true }
    ).select('email oneSignalPlayerId oneSignalSubscribedAt')

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`[OneSignal] ✅ Player ID saved for user ${user.email}: ${oneSignalPlayerId}`)

    return NextResponse.json({
      success: true,
      message: 'OneSignal subscription saved successfully',
      data: {
        userId: user._id,
        email: user.email,
        oneSignalPlayerId: user.oneSignalPlayerId,
        subscribedAt: user.oneSignalSubscribedAt
      }
    })

  } catch (error) {
    console.error('[OneSignal] Error saving subscription:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Get OneSignal subscription status
 * GET /api/onesignal/subscribe
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = await jwtVerify(token, JWT_SECRET)
    const userId = decoded.payload.userId

    await connectDB()

    const user = await User.findById(userId).select(
      'email oneSignalPlayerId oneSignalSubscribedAt oneSignalLastPromptedAt'
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        isSubscribed: !!user.oneSignalPlayerId,
        oneSignalPlayerId: user.oneSignalPlayerId,
        subscribedAt: user.oneSignalSubscribedAt,
        lastPromptedAt: user.oneSignalLastPromptedAt
      }
    })

  } catch (error) {
    console.error('[OneSignal] Error getting subscription status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Update last prompted timestamp
 * PUT /api/onesignal/subscribe
 */
export async function PUT(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = await jwtVerify(token, JWT_SECRET)
    const userId = decoded.payload.userId

    await connectDB()

    const user = await User.findByIdAndUpdate(
      userId,
      { oneSignalLastPromptedAt: new Date() },
      { new: true }
    ).select('email oneSignalLastPromptedAt')

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Last prompted timestamp updated',
      data: {
        lastPromptedAt: user.oneSignalLastPromptedAt
      }
    })

  } catch (error) {
    console.error('[OneSignal] Error updating last prompted:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
