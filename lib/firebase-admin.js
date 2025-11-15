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

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/icon-192x192.png',
      },
      data: {
        ...data,
        clickAction: data.clickAction || '/',
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: data.clickAction || '/',
        },
        notification: {
          icon: notification.icon || '/icon-192x192.png',
          badge: notification.badge || '/icon-192x192.png',
          requireInteraction: data.requireInteraction || false,
        },
      },
    }

    const response = await admin.messaging().send(message)
    console.log('[Firebase Admin] Notification sent successfully:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[Firebase Admin] Error sending notification:', error)
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

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        clickAction: data.clickAction || '/',
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: data.clickAction || '/',
        },
        notification: {
          icon: notification.icon || '/icon-192x192.png',
          badge: notification.badge || '/icon-192x192.png',
        },
      },
      tokens: fcmTokens,
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log('[Firebase Admin] Batch notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    })

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

