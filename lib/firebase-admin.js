import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
let app
let isInitialized = false

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('[Firebase Admin] No credentials found. Using default credentials.')
      // Don't throw error during build time - just mark as not initialized
      isInitialized = false
      app = null
    } else {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
      isInitialized = true
      console.log('[Firebase Admin] Initialized successfully')
    }
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error)
    isInitialized = false
    app = null
  }
} else {
  app = admin.apps[0]
  isInitialized = true
}

/**
 * Send push notification to a single device
 * @param {string} fcmToken - FCM token of the device
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} data - Additional data payload (optional)
 * @returns {Promise<Object>} Send result
 */
export async function sendPushNotification(fcmToken, notification, data = {}) {
  try {
    if (!isInitialized || !app) {
      console.log('[Firebase Admin] Not initialized. Skipping notification.')
      return { success: false, error: 'Firebase Admin not initialized' }
    }

    if (!fcmToken) {
      throw new Error('FCM token is required')
    }

    // Convert all data values to strings (FCM requirement)
    const stringData = {}
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        stringData[key] = String(data[key])
      }
    })

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...stringData,
        clickAction: String(data.clickAction || '/dashboard'),
        click_action: String(data.clickAction || '/dashboard'),
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: data.clickAction || '/dashboard',
        },
        notification: {
          icon: notification.icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          requireInteraction: false,
          vibrate: [200, 100, 200],
          silent: false,
          renotify: true,
          tag: data.eventType || 'talio-notification',
        },
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#192A5A',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          channelId: 'talio_notifications',
          priority: 'high',
          visibility: 'public',
          notificationCount: 1,
        },
        data: {
          clickAction: data.clickAction || '/dashboard',
        },
      },
    }

    console.log('[Firebase Admin] Sending notification:', {
      title: notification.title,
      body: notification.body,
      token: fcmToken.substring(0, 20) + '...',
    })

    const response = await admin.messaging().send(message)
    console.log('[Firebase Admin] ✅ Notification sent successfully:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[Firebase Admin] ❌ Error sending notification:', error.message)
    console.error('[Firebase Admin] Error details:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload (optional)
 * @returns {Promise<Object>} Send result with success and failure counts
 */
export async function sendPushNotificationToMultiple(fcmTokens, notification, data = {}) {
  try {
    if (!isInitialized || !app) {
      console.log('[Firebase Admin] Not initialized. Skipping notification.')
      return { success: false, error: 'Firebase Admin not initialized' }
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      throw new Error('At least one FCM token is required')
    }

    // Convert all data values to strings (FCM requirement)
    const stringData = {}
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        stringData[key] = String(data[key])
      }
    })

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...stringData,
        clickAction: String(data.clickAction || '/dashboard'),
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: data.clickAction || '/dashboard',
        },
        notification: {
          icon: notification.icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          requireInteraction: false,
          vibrate: [200, 100, 200],
        },
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#192A5A',
          sound: 'default',
          channelId: 'talio_notifications',
          clickAction: data.clickAction || '/dashboard',
        },
      },
      tokens: fcmTokens,
    }

    console.log('[Firebase Admin] Sending batch notification:', {
      title: notification.title,
      body: notification.body,
      tokenCount: fcmTokens.length,
    })

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log('[Firebase Admin] ✅ Batch notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    })

    // Log failures for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`[Firebase Admin] Failed to send to token ${idx}:`, resp.error?.message)
        }
      })
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    }
  } catch (error) {
    console.error('[Firebase Admin] Error sending batch notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification to a topic
 * @param {string} topic - Topic name
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload (optional)
 * @returns {Promise<Object>} Send result
 */
export async function sendPushNotificationToTopic(topic, notification, data = {}) {
  try {
    if (!isInitialized || !app) {
      console.log('[Firebase Admin] Not initialized. Skipping notification.')
      return { success: false, error: 'Firebase Admin not initialized' }
    }

    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    }

    const response = await admin.messaging().send(message)
    console.log('[Firebase Admin] Topic notification sent successfully:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[Firebase Admin] Error sending topic notification:', error)
    return { success: false, error: error.message }
  }
}

export default app

