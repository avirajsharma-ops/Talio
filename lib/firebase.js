// Firebase Client SDK Configuration
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

// Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
let app
if (!getApps().length) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
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

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('[Firebase] VAPID key not configured')
      return null
    }

    const token = await getToken(messaging, { vapidKey })
    console.log('[Firebase] FCM token obtained:', token)

    // Save token to localStorage
    localStorage.setItem('fcm-token', token)

    return token
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

export default app

