/**
 * Firebase Client SDK - Clean Implementation
 * Handles web push notifications
 */

import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase app
let firebaseApp = null
let messaging = null

/**
 * Initialize Firebase app
 */
function initializeFirebase() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig)
      console.log('[Firebase Client] ✅ Initialized')
    } else {
      firebaseApp = getApps()[0]
      console.log('[Firebase Client] Using existing app')
    }
    return firebaseApp
  } catch (error) {
    console.error('[Firebase Client] ❌ Initialization error:', error.message)
    return null
  }
}

/**
 * Get Firebase Messaging instance
 */
async function getFirebaseMessaging() {
  if (typeof window === 'undefined') {
    return null
  }

  if (messaging) {
    return messaging
  }

  try {
    const supported = await isSupported()
    if (!supported) {
      console.warn('[Firebase Client] Messaging not supported in this browser')
      return null
    }

    const app = initializeFirebase()
    if (!app) {
      return null
    }

    messaging = getMessaging(app)
    return messaging
  } catch (error) {
    console.error('[Firebase Client] ❌ Messaging error:', error.message)
    return null
  }
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export async function requestFCMToken() {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('[Firebase Client] Notifications not supported')
      return null
    }

    // Request permission
    const permission = await Notification.requestPermission()
    console.log('[Firebase Client] Permission:', permission)

    if (permission !== 'granted') {
      console.warn('[Firebase Client] Permission denied')
      return null
    }

    // Get messaging instance
    const messaging = await getFirebaseMessaging()
    if (!messaging) {
      return null
    }

    // Get VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('[Firebase Client] ❌ VAPID key not configured')
      console.error('[Firebase Client] Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env')
      return null
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })
        console.log('[Firebase Client] ✅ Service worker registered')

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        })

        if (token) {
          console.log('[Firebase Client] ✅ FCM token obtained')
          return token
        } else {
          console.warn('[Firebase Client] No token received')
          return null
        }
      } catch (swError) {
        console.error('[Firebase Client] ❌ Service worker error:', swError.message)
        return null
      }
    } else {
      console.warn('[Firebase Client] Service workers not supported')
      return null
    }

  } catch (error) {
    console.error('[Firebase Client] ❌ Token request error:', error.message)
    return null
  }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Callback function to handle messages
 */
export function onForegroundMessage(callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  getFirebaseMessaging().then(messaging => {
    if (!messaging) {
      return
    }

    onMessage(messaging, (payload) => {
      console.log('[Firebase Client] Foreground message:', payload)
      callback(payload)
    })
  })
}

/**
 * Save FCM token to backend
 * @param {string} token - FCM token
 * @param {string} device - Device type ('web', 'android', 'ios')
 * @returns {Promise<boolean>} Success status
 */
export async function saveFCMToken(token, device = 'web') {
  try {
    const response = await fetch('/api/fcm/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, device })
    })

    if (response.ok) {
      console.log('[Firebase Client] ✅ Token saved to backend')
      return true
    } else {
      console.error('[Firebase Client] ❌ Failed to save token:', response.statusText)
      return false
    }
  } catch (error) {
    console.error('[Firebase Client] ❌ Save token error:', error.message)
    return false
  }
}

export default {
  requestFCMToken,
  onForegroundMessage,
  saveFCMToken
}