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

// POST - Send test push notification to current user
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

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { success: false, message: 'Push notifications not configured. VAPID keys missing.' },
        { status: 500 }
      )
    }

    // Get all subscriptions for the current user
    const subscriptions = await PushSubscription.find({
      user: decoded.userId
    })

    console.log(`Found ${subscriptions.length} subscriptions for user ${decoded.userId}`)

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No push subscriptions found. Please enable notifications first.',
          debug: {
            userId: decoded.userId,
            vapidConfigured: true
          }
        },
        { status: 404 }
      )
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: '🧪 Test Notification',
      body: 'This is a test notification from Talio HRMS. Your notifications are working!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: {
        url: '/dashboard',
        type: 'test'
      },
      tag: 'talio-test-notification',
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

          console.log('Sending test notification to endpoint:', sub.endpoint.substring(0, 50) + '...')
          await webpush.sendNotification(pushSubscription, payload)
          
          // Update last used timestamp
          sub.lastUsed = new Date()
          await sub.save()

          return { success: true, userId: sub.user }
        } catch (error) {
          console.error('Failed to send test push notification:', error)
          
          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410) {
            console.log('Removing invalid subscription')
            await PushSubscription.findByIdAndDelete(sub._id)
          }
          
          return { success: false, userId: sub.user, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: successful > 0,
      message: `Test notifications sent: ${successful} successful, ${failed} failed`,
      data: {
        total: results.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
      }
    })

  } catch (error) {
    console.error('Send test push notification error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to send test push notification', error: error.message },
      { status: 500 }
    )
  }
}

