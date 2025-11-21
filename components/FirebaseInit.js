'use client'

/**
 * Firebase Initialization Component
 * Handles FCM token registration and foreground message listening
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { requestFCMToken, saveFCMToken, onForegroundMessage } from '@/lib/firebase'

export default function FirebaseInit() {
  const { data: session, status } = useSession()
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [tokenRegistered, setTokenRegistered] = useState(false)

  useEffect(() => {
    // Only run on client side and when user is authenticated
    if (typeof window === 'undefined' || status !== 'authenticated' || !session) {
      return
    }

    // Check if already registered
    const registered = localStorage.getItem('fcm_token_registered')
    if (registered === 'true') {
      setTokenRegistered(true)
      return
    }

    // Request FCM token after a short delay
    const timer = setTimeout(async () => {
      try {
        console.log('[FirebaseInit] Requesting FCM token...')

        const token = await requestFCMToken()

        if (token) {
          console.log('[FirebaseInit] Token obtained, saving to backend...')

          const saved = await saveFCMToken(token, 'web')

          if (saved) {
            console.log('[FirebaseInit] ✅ Token registered successfully')
            localStorage.setItem('fcm_token_registered', 'true')
            localStorage.setItem('fcm_token', token)
            setPermissionGranted(true)
            setTokenRegistered(true)
          }
        }
      } catch (error) {
        console.error('[FirebaseInit] Error:', error)
      }
    }, 2000) // Wait 2 seconds after login

    return () => clearTimeout(timer)
  }, [session, status])

  // Listen for foreground messages
  useEffect(() => {
    if (!tokenRegistered) {
      return
    }

    console.log('[FirebaseInit] Setting up foreground message listener...')

    onForegroundMessage((payload) => {
      console.log('[FirebaseInit] Foreground message received:', payload)

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = payload.notification?.title || payload.data?.title || 'Talio HRMS'
        const body = payload.notification?.body || payload.data?.body || payload.data?.message || ''

        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: payload.data?.tag || 'talio-notification',
          data: payload.data
        })
      }
    })
  }, [tokenRegistered])

  // Don't render anything
  return null
}