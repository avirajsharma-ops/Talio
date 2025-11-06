'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  requestFCMToken, 
  saveFCMTokenToBackend, 
  onForegroundMessage,
  getStoredFCMToken 
} from '@/lib/firebase'

/**
 * Firebase Cloud Messaging Initialization Component
 * Initializes FCM for push notifications
 */
export default function FirebaseInit() {
  const router = useRouter()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    console.log('[FirebaseInit] Starting initialization...')

    const initFirebase = async () => {
      try {
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

        // Check if we already have a token
        let fcmToken = getStoredFCMToken()

        if (!fcmToken) {
          console.log('[FirebaseInit] No FCM token found, requesting new token...')
          
          // Request FCM token
          fcmToken = await requestFCMToken()

          if (fcmToken) {
            console.log('[FirebaseInit] ✅ FCM token obtained')
            
            // Save token to backend
            await saveFCMTokenToBackend(fcmToken, userId)
          } else {
            console.warn('[FirebaseInit] Failed to get FCM token')
          }
        } else {
          console.log('[FirebaseInit] ✅ FCM token already exists')
          
          // Verify token is still valid by saving to backend
          await saveFCMTokenToBackend(fcmToken, userId)
        }

        // Set up foreground message listener
        onForegroundMessage((payload) => {
          console.log('[FirebaseInit] Foreground message received:', payload)

          // Show browser notification
          if (Notification.permission === 'granted') {
            const title = payload.notification?.title || 'Talio HRMS'
            const options = {
              body: payload.notification?.body || 'You have a new notification',
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
              const url = payload.data?.click_action || payload.fcmOptions?.link || '/dashboard'
              router.push(url)
              notification.close()
            }
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

