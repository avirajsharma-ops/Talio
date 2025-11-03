'use client'

import { useEffect, useState } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  registerServiceWorker
} from '@/utils/notifications'

/**
 * Hook to initialize and manage notifications
 */
export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    const supported = isNotificationSupported()
    setIsSupported(supported)

    if (!supported) {
      return
    }

    // Get current permission
    const currentPermission = getNotificationPermission()
    setPermission(currentPermission)

    // Register service worker
    const initServiceWorker = async () => {
      try {
        await registerServiceWorker()
        
        // Load custom service worker code
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready
          
          // Add custom notification handlers
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
              console.log('Notification clicked:', event.data)
            }
          })
        }
        
        setIsReady(true)
      } catch (error) {
        console.error('Failed to initialize service worker:', error)
      }
    }

    initServiceWorker()

    // Listen for permission changes
    const checkPermission = () => {
      const newPermission = getNotificationPermission()
      if (newPermission !== permission) {
        setPermission(newPermission)
      }
    }

    const interval = setInterval(checkPermission, 2000)

    return () => clearInterval(interval)
  }, [])

  return {
    isSupported,
    permission,
    isGranted: permission === 'granted',
    isReady
  }
}

/**
 * Hook to initialize notifications on app load
 */
export function useNotificationInit() {
  const notifications = useNotifications()

  useEffect(() => {
    if (notifications.isReady && notifications.isGranted) {
      console.log('Notifications are ready and permission granted')
    }
  }, [notifications.isReady, notifications.isGranted])

  return notifications
}

