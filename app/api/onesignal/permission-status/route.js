import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

/**
 * Update notification permission status
 * POST /api/onesignal/permission-status
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
    const { status } = body

    if (!status || !['granted', 'denied', 'default'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid permission status' },
        { status: 400 }
      )
    }

    await connectDB()

    // Prepare update data
    const updateData = {
      notificationPermissionStatus: status
    }

    if (status === 'granted') {
      updateData.notificationPermissionGrantedAt = new Date()
    } else if (status === 'denied') {
      updateData.notificationPermissionDeniedAt = new Date()
    }

    // Update user with permission status
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('email notificationPermissionStatus notificationPermissionGrantedAt notificationPermissionDeniedAt')

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`[OneSignal] ✅ Permission status updated for user ${user.email}: ${status}`)

    return NextResponse.json({
      success: true,
      message: 'Permission status updated successfully',
      data: {
        userId: user._id,
        email: user.email,
        permissionStatus: user.notificationPermissionStatus,
        grantedAt: user.notificationPermissionGrantedAt,
        deniedAt: user.notificationPermissionDeniedAt
      }
    })

  } catch (error) {
    console.error('[OneSignal] Error updating permission status:', error)
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
 * Get notification permission status
 * GET /api/onesignal/permission-status
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
      'email notificationPermissionStatus notificationPermissionGrantedAt notificationPermissionDeniedAt'
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
        permissionStatus: user.notificationPermissionStatus,
        grantedAt: user.notificationPermissionGrantedAt,
        deniedAt: user.notificationPermissionDeniedAt
      }
    })

  } catch (error) {
    console.error('[OneSignal] Error getting permission status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

