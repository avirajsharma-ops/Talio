// Firebase Client SDK Configuration
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics'

// Firebase configuration
// Talio HRMS Firebase Project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Check if we're in a build environment (SSR/SSG during build)
const isBuildTime = typeof window === 'undefined' && !process.env.NEXT_RUNTIME

// Debug: Log config to check if env vars are loaded (only at runtime)
if (!isBuildTime) {
  console.log('[Firebase] Config check:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasStorageBucket: !!firebaseConfig.storageBucket,
    hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId,
    projectId: firebaseConfig.projectId, // Show actual value for debugging
  })
}

// Initialize Firebase
let app
let isFirebaseAvailable = false

if (!getApps().length) {
  // Check if Firebase config is available
  const hasRequiredConfig = firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId

  if (!hasRequiredConfig) {
    // During build time, this is expected - just log a warning
    if (isBuildTime) {
      console.log('[Firebase] Skipping initialization during build time (env vars not available)')
    } else {
      // At runtime, this is a problem
      console.error('[Firebase] Missing required configuration. Please check your environment variables.')
      console.error('[Firebase] Required env vars: NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_APP_ID')
    }
    app = null
    isFirebaseAvailable = false
  } else {
    try {
      app = initializeApp(firebaseConfig)
      isFirebaseAvailable = true
      if (!isBuildTime) {
        console.log('[Firebase] App initialized successfully')
      }
    } catch (error) {
      console.error('[Firebase] Initialization error:', error)
      app = null
      isFirebaseAvailable = false
    }
  }
} else {
  app = getApps()[0]
  isFirebaseAvailable = true
}

// Initialize Firebase Analytics (only in browser)
let analytics = null
if (typeof window !== 'undefined' && app && isFirebaseAvailable) {
  isAnalyticsSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app)
      console.log('[Firebase] Analytics initialized successfully')
    }
  }).catch(error => {
    console.warn('[Firebase] Analytics not supported:', error)
  })
}

// Initialize Firebase Cloud Messaging
let messaging = null

/**
 * Get Firebase Messaging instance
 * Only works in browser environment
 */
export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined') {
    return null
  }

  // Check if Firebase app is available
  if (!app || !isFirebaseAvailable) {
    console.warn('[Firebase] Firebase app not initialized. Messaging not available.')
    return null
  }

  try {
    const supported = await isSupported()
    if (!supported) {
      console.warn('[Firebase] Messaging not supported in this browser')
      return null
    }

    if (!messaging) {
      messaging = getMessaging(app)
    }
    return messaging
  } catch (error) {
    console.error('[Firebase] Error getting messaging instance:', error)
    return null
  }
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export const requestFCMToken = async () => {
  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) {
      console.warn('[Firebase] Messaging not available')
      return null
    }

    // Request notification permission
    const permission = await Notification.requestPermission()
    console.log('[Firebase] Notification permission:', permission)

    if (permission !== 'granted') {
      console.warn('[Firebase] Notification permission denied')
      return null
    }

    // Get FCM token with service worker registration
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('[Firebase] VAPID key not configured')
      return null
    }

    // Wait for service worker to be ready
    if ('serviceWorker' in navigator) {
      try {
        // Check if Firebase service worker is already registered
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')

        if (!registration) {
          console.log('[Firebase] Waiting for service worker registration...')
          // Wait for the service worker to register
          registration = await navigator.serviceWorker.ready
        }

        console.log('[Firebase] Service worker ready:', registration.scope)

        // Get FCM token with the service worker registration
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        })

        console.log('[Firebase] FCM token obtained:', token)

        // Save token to localStorage
        localStorage.setItem('fcm-token', token)

        return token
      } catch (swError) {
        console.error('[Firebase] Service worker error:', swError)
        // Fallback: try without explicit service worker registration
        const token = await getToken(messaging, { vapidKey })
        if (token) {
          localStorage.setItem('fcm-token', token)
          return token
        }
        return null
      }
    } else {
      console.warn('[Firebase] Service workers not supported')
      return null
    }
  } catch (error) {
    console.error('[Firebase] Error getting FCM token:', error)
    return null
  }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Callback function to handle messages
 */
export const onForegroundMessage = async (callback) => {
  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) {
      return
    }

    onMessage(messaging, (payload) => {
      console.log('[Firebase] Foreground message received:', payload)
      callback(payload)
    })
  } catch (error) {
    console.error('[Firebase] Error setting up foreground message listener:', error)
  }
}

/**
 * Save FCM token to backend
 * @param {string} token - FCM token
 * @param {string} userId - User ID
 */
export const saveFCMTokenToBackend = async (token, userId) => {
  try {
    const authToken = localStorage.getItem('token')
    const response = await fetch('/api/fcm/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ token, userId })
    })

    const data = await response.json()
    console.log('[Firebase] Token saved to backend:', data)
    return data
  } catch (error) {
    console.error('[Firebase] Error saving token to backend:', error)
    return null
  }
}

/**
 * Get stored FCM token from localStorage
 */
export const getStoredFCMToken = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('fcm-token')
}

/**
 * Check if FCM is initialized and token exists
 */
export const isFCMReady = () => {
  return !!getStoredFCMToken()
}

/**
 * Get Firebase Analytics instance
 */
export const getFirebaseAnalytics = () => {
  return analytics
}

/**
 * Check if Firebase is available and initialized
 */
export const checkFirebaseAvailable = () => {
  return isFirebaseAvailable && !!app
}

export default app

