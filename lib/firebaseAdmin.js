// Firebase Admin SDK Configuration
import admin from 'firebase-admin'

// Initialize Firebase Admin
let app

if (!admin.apps.length) {
  try {
    // Initialize with service account credentials
    // You can either use a service account JSON file or environment variables

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Option 1: Use service account JSON from environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      })
    } else if (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) {
      // Option 2: Use individual environment variables
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      })
    } else {
      console.error('[Firebase Admin] ⚠️ Missing Firebase credentials!')
      console.error('[Firebase Admin] Required environment variables:')
      console.error('  - FIREBASE_PROJECT_ID')
      console.error('  - FIREBASE_CLIENT_EMAIL')
      console.error('  - FIREBASE_PRIVATE_KEY')
      console.error('[Firebase Admin] Push notifications will NOT work until credentials are configured.')
      console.error('[Firebase Admin] See FIREBASE_ENV_SETUP.md for setup instructions.')

      // Initialize with minimal config to prevent crashes, but FCM won't work
      app = null
      throw new Error('Firebase Admin credentials not configured')
    }

    console.log('[Firebase Admin] Initialized successfully')
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error)
  }
} else {
  app = admin.apps[0]
}

/**
 * Send notification to specific FCM tokens
 * @param {Object} options - Notification options
 * @param {Array<string>} options.tokens - Array of FCM tokens
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Additional data payload
 * @param {string} [options.imageUrl] - Notification image URL
 * @param {string} [options.icon] - Notification icon URL
 * @returns {Promise<Object>} Send result
 */
export async function sendFCMNotification({
  tokens,
  title,
  body,
  data = {},
  imageUrl = null,
  icon = null
}) {
  try {
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        message: 'No tokens provided'
      }
    }

    // Prepare notification payload
    const notification = {
      title,
      body
    }

    if (imageUrl) {
      notification.imageUrl = imageUrl
    }

    if (icon) {
      notification.icon = icon
    }

    // Prepare message
    const message = {
      notification,
      data: {
        ...data,
        click_action: data.url || '/dashboard',
        timestamp: new Date().toISOString()
      },
      webpush: {
        fcmOptions: {
          link: data.url || '/dashboard'
        },
        notification: {
          icon: icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          vibrate: [200, 100, 200],
          requireInteraction: false
        }
      },
      android: {
        priority: 'high',
        notification: {
          icon: icon || 'ic_notification',
          color: '#192A5A',
          sound: 'default',
          channelId: 'talio_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    }

    // Send to multiple tokens
    const results = {
      success: true,
      successCount: 0,
      failureCount: 0,
      results: []
    }

    // Send in batches of 500 (FCM limit)
    const batchSize = 500
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize)

      try {
        const response = await admin.messaging().sendEachForMulticast({
          ...message,
          tokens: batch
        })

        results.successCount += response.successCount
        results.failureCount += response.failureCount
        results.results.push(...response.responses)

        console.log(`[Firebase Admin] Batch ${Math.floor(i / batchSize) + 1}: ${response.successCount} success, ${response.failureCount} failures`)
      } catch (batchError) {
        console.error(`[Firebase Admin] Batch error:`, batchError)
        results.failureCount += batch.length
      }
    }

    console.log(`[Firebase Admin] Total: ${results.successCount} success, ${results.failureCount} failures`)

    return results
  } catch (error) {
    console.error('[Firebase Admin] Error sending notification:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

/**
 * Send notification to a topic
 * @param {Object} options - Notification options
 * @param {string} options.topic - Topic name
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Additional data payload
 * @returns {Promise<Object>} Send result
 */
export async function sendFCMToTopic({
  topic,
  title,
  body,
  data = {},
  imageUrl = null,
  icon = null
}) {
  try {
    const message = {
      topic,
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
        ...(icon && { icon })
      },
      data: {
        ...data,
        click_action: data.url || '/dashboard',
        timestamp: new Date().toISOString()
      },
      webpush: {
        fcmOptions: {
          link: data.url || '/dashboard'
        }
      }
    }

    const response = await admin.messaging().send(message)
    console.log('[Firebase Admin] Message sent to topic:', response)

    return {
      success: true,
      messageId: response
    }
  } catch (error) {
    console.error('[Firebase Admin] Error sending to topic:', error)
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

/**
 * Subscribe tokens to a topic
 * @param {Array<string>} tokens - FCM tokens
 * @param {string} topic - Topic name
 */
export async function subscribeToTopic(tokens, topic) {
  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic)
    console.log('[Firebase Admin] Subscribed to topic:', response)
    return response
  } catch (error) {
    console.error('[Firebase Admin] Error subscribing to topic:', error)
    throw error
  }
}

/**
 * Unsubscribe tokens from a topic
 * @param {Array<string>} tokens - FCM tokens
 * @param {string} topic - Topic name
 */
export async function unsubscribeFromTopic(tokens, topic) {
  try {
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic)
    console.log('[Firebase Admin] Unsubscribed from topic:', response)
    return response
  } catch (error) {
    console.error('[Firebase Admin] Error unsubscribing from topic:', error)
    throw error
  }
}

export default admin

