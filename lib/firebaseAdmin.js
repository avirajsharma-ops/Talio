/**
 * Firebase Admin SDK - Clean Implementation
 * Handles push notifications for both Android and Web
 */

import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
let firebaseApp = null

function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0]
      console.log('[Firebase Admin] Using existing app')
      return firebaseApp
    }

    // Option 1: Use service account JSON (RECOMMENDED)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      })

      console.log('[Firebase Admin] ✅ Initialized with service account JSON')
      console.log(`[Firebase Admin] Project: ${serviceAccount.project_id}`)
      return firebaseApp
    }

    // Option 2: Use individual environment variables
    if (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) {

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      })

      console.log('[Firebase Admin] ✅ Initialized with individual credentials')
      console.log(`[Firebase Admin] Project: ${process.env.FIREBASE_PROJECT_ID}`)
      return firebaseApp
    }

    // No credentials found
    console.error('[Firebase Admin] ❌ No Firebase credentials found!')
    console.error('[Firebase Admin] Required: FIREBASE_SERVICE_ACCOUNT_KEY')
    console.error('[Firebase Admin] OR: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY')
    console.error('[Firebase Admin] See FIREBASE_CREDENTIALS_REQUIRED.md for setup')
    return null

  } catch (error) {
    console.error('[Firebase Admin] ❌ Initialization error:', error.message)
    return null
  }
}

/**
 * Send push notification to FCM tokens
 * Works for both Android and Web tokens
 *
 * @param {Object} options
 * @param {string[]} options.tokens - Array of FCM tokens
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Custom data payload
 * @param {string} [options.imageUrl] - Image URL for notification
 * @returns {Promise<Object>} Result with success/failure counts
 */
export async function sendPushNotification({ tokens, title, body, data = {}, imageUrl = null }) {
  try {
    // Initialize Firebase Admin if not already done
    const app = initializeFirebaseAdmin()
    if (!app) {
      return {
        success: false,
        message: 'Firebase Admin not initialized',
        successCount: 0,
        failureCount: tokens?.length || 0
      }
    }

    // Validate inputs
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        message: 'No tokens provided',
        successCount: 0,
        failureCount: 0
      }
    }

    if (!title || !body) {
      return {
        success: false,
        message: 'Title and body are required',
        successCount: 0,
        failureCount: tokens.length
      }
    }

    console.log(`[Firebase Admin] Sending notification to ${tokens.length} token(s)`)
    console.log(`[Firebase Admin] Title: ${title}`)

    // Prepare notification payload (for web and foreground Android)
    const notification = {
      title,
      body
    }

    if (imageUrl) {
      notification.imageUrl = imageUrl
    }

    // Prepare data payload (CRITICAL for Android background/killed state)
    // All values must be strings
    const dataPayload = {
      title: String(title),
      body: String(body),
      message: String(body),
      timestamp: String(Date.now()),
      click_action: String(data.url || data.click_action || '/dashboard'),
      ...Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key])
        return acc
      }, {})
    }

    // Build message
    const message = {
      notification,
      data: dataPayload,
      // Android-specific options
      android: {
        priority: 'high',
        notification: {
          channelId: data.channelId || 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      // Web-specific options
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          requireInteraction: false,
          tag: data.tag || 'talio-notification'
        },
        fcmOptions: {
          link: data.url || data.click_action || '/dashboard'
        }
      }
    }

    // Send to all tokens (FCM supports up to 500 tokens per batch)
    const batchSize = 500
    let successCount = 0
    let failureCount = 0
    const errors = []

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize)

      try {
        const response = await admin.messaging().sendEachForMulticast({
          ...message,
          tokens: batch
        })

        successCount += response.successCount
        failureCount += response.failureCount

        // Log errors for debugging
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = {
              token: batch[idx].substring(0, 20) + '...',
              error: resp.error?.code || 'unknown',
              message: resp.error?.message || 'Unknown error'
            }
            errors.push(error)
            console.error(`[Firebase Admin] Token failed:`, error)
          }
        })

      } catch (batchError) {
        console.error(`[Firebase Admin] Batch error:`, batchError.message)
        failureCount += batch.length
      }
    }

    console.log(`[Firebase Admin] ✅ Sent: ${successCount} success, ${failureCount} failures`)

    return {
      success: successCount > 0,
      message: `Sent to ${successCount} device(s)`,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error) {
    console.error('[Firebase Admin] ❌ Send error:', error.message)
    return {
      success: false,
      message: error.message,
      successCount: 0,
      failureCount: tokens?.length || 0
    }
  }
}

// Initialize on module load
initializeFirebaseAdmin()

export default { sendPushNotification }