'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  requestFCMToken,
  saveFCMTokenToBackend,
  onForegroundMessage,
  getStoredFCMToken
} from '@/lib/firebase'
/**
 * Firebase Cloud Messaging Initialization Component
 * Initializes FCM for push notifications (background only)
 * In-app notifications are handled by InAppNotificationContext via Socket.IO
 */
export default function FirebaseInit() {
  const router = useRouter()
  const [isAppVisible, setIsAppVisible] = useState(true)

  // Track app visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsAppVisible(!document.hidden)
      console.log('[FirebaseInit] App visibility changed:', !document.hidden ? 'visible' : 'hidden')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    console.log('[FirebaseInit] Starting initialization...')

    const initFirebase = async () => {
      try {
        // Register service worker first
        if ('serviceWorker' in navigator) {
          try {
            console.log('[FirebaseInit] Registering service worker...')

            // Check if already registered
            const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')

            if (!existingRegistration) {
              // Register the Firebase messaging service worker
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/',
                updateViaCache: 'none'
              })

              console.log('[FirebaseInit] ✅ Service worker registered:', registration.scope)
            } else {
              console.log('[FirebaseInit] ✅ Service worker already registered')
            }

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready
            console.log('[FirebaseInit] ✅ Service worker ready')
          } catch (swError) {
            console.error('[FirebaseInit] Service worker registration failed:', swError)
            // Continue anyway - Firebase will try to register its own SW
          }
        }

        // Check if user is logged in
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
          console.log('[FirebaseInit] User not logged in, skipping FCM initialization')
          return
        }

        const user = JSON.parse(userStr)
        const userId = user._id || user.id

        console.log('[FirebaseInit] User logged in:', userId)

        // Always request a fresh token on login to ensure it's valid
        console.log('[FirebaseInit] Requesting FCM token...')

        const fcmToken = await requestFCMToken()

        if (fcmToken) {
          console.log('[FirebaseInit] ✅ FCM token obtained')

          // Save token to backend (will update lastUsed timestamp)
          const saveResult = await saveFCMTokenToBackend(fcmToken, userId)

          if (saveResult && saveResult.success) {
            console.log('[FirebaseInit] ✅ Token saved to backend')
          } else {
            console.warn('[FirebaseInit] ⚠️ Failed to save token to backend')
          }
        } else {
          console.warn('[FirebaseInit] ⚠️ Failed to get FCM token - user may have denied permission')
        }

        // Set up foreground message listener (for background notifications only)
        // In-app notifications are now handled by InAppNotificationContext via Socket.IO
        onForegroundMessage((payload) => {
          console.log('[FirebaseInit] Foreground message received:', payload)
          console.log('[FirebaseInit] App is visible:', isAppVisible)

          const title = payload.notification?.title || 'Talio HRMS'
          const body = payload.notification?.body || 'You have a new notification'
          const url = payload.data?.click_action || payload.fcmOptions?.link || '/dashboard'

          // Only show browser notification if app is not visible
          // When app is visible, Socket.IO handles in-app notifications
          if (!isAppVisible && Notification.permission === 'granted') {
            console.log('[FirebaseInit] Showing browser notification (app hidden)')

            const options = {
              body,
              icon: payload.notification?.icon || '/icons/icon-192x192.png',
              badge: '/icons/icon-96x96.png',
              tag: 'talio-notification',
              data: payload.data,
              vibrate: [200, 100, 200],
              requireInteraction: false
            }

            if (payload.notification?.image) {
              options.image = payload.notification.image
            }

            const notification = new Notification(title, options)

            // Handle notification click
            notification.onclick = () => {
              router.push(url)
              notification.close()
            }
          } else {
            console.log('[FirebaseInit] App is visible - Socket.IO handles in-app notifications')
          }
        })

        // Set global flag to indicate Firebase is ready
        window.FirebaseReady = true
        console.log('[FirebaseInit] ✅ Firebase initialized successfully')

      } catch (error) {
        console.error('[FirebaseInit] Initialization error:', error)
      }
    }

    // Initialize Firebase
    initFirebase()

    // Re-initialize when user logs in
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue) {
        console.log('[FirebaseInit] User logged in, re-initializing...')
        initFirebase()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [router])

  return null // This component doesn't render anything
}

/**
 * Hook to request Firebase notification permission
 */
export function useFirebasePermission() {
  const requestPermission = async () => {
    try {
      const fcmToken = await requestFCMToken()

      if (fcmToken) {
        console.log('[Firebase] Permission granted, token:', fcmToken)

        // Save to backend
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          await saveFCMTokenToBackend(fcmToken, user._id || user.id)
        }

        return true
      }

      return false
    } catch (error) {
      console.error('[Firebase] Error requesting permission:', error)
      return false
    }
  }

  const getPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default'
    }
    return Notification.permission
  }

  const isOptedIn = () => {
    return !!getStoredFCMToken() && Notification.permission === 'granted'
  }

  return {
    requestPermission,
    getPermission,
    isOptedIn
  }
}

