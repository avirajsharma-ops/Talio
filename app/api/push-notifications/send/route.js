import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import PushSubscription from '@/models/PushSubscription'
import { verifyToken } from '@/lib/auth'
import webpush from 'web-push'

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:avi2001raj@gmail.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidEmail,
    vapidPublicKey,
    vapidPrivateKey
  )
}

// POST - Send push notification
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const { userIds, title, body, icon, badge, data, url } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User IDs are required' },
        { status: 400 }
      )
    }

    if (!title || !body) {
      return NextResponse.json(
        { success: false, message: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { success: false, message: 'Push notifications not configured. VAPID keys missing.' },
        { status: 500 }
      )
    }

    // Get all subscriptions for the specified users
    const subscriptions = await PushSubscription.find({
      user: { $in: userIds }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No push subscriptions found for specified users' },
        { status: 404 }
      )
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      data: {
        url: url || '/dashboard',
        ...data
      },
      tag: 'talio-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })

    // Send push notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth
            }
          }

          await webpush.sendNotification(pushSubscription, payload)
          
          // Update last used timestamp
          sub.lastUsed = new Date()
          await sub.save()

          return { success: true, userId: sub.user }
        } catch (error) {
          console.error('Failed to send push notification:', error)
          
          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410) {
            await PushSubscription.findByIdAndDelete(sub._id)
          }
          
          return { success: false, userId: sub.user, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      message: `Push notifications sent: ${successful} successful, ${failed} failed`,
      data: {
        total: results.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
      }
    })

  } catch (error) {
    console.error('Send push notification error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to send push notifications' },
      { status: 500 }
    )
  }
}

