'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * OneSignal Initialization Component
 * Initializes OneSignal for push notifications
 */
export default function OneSignalInit() {
  const router = useRouter()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Initialize OneSignal
    const initOneSignal = async () => {
      try {
        // Load OneSignal SDK
        window.OneSignalDeferred = window.OneSignalDeferred || []
        
        window.OneSignalDeferred.push(async function(OneSignal) {
          console.log('[OneSignal] Initializing...')
          
          await OneSignal.init({
            appId: "f7b9d1a1-5095-4be8-8a74-2af13058e7b2",
            safari_web_id: "web.onesignal.auto.42873e37-42b9-4e5d-9423-af83e9e44ff4",
            
            // Notification settings
            allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
            
            // Auto-resubscribe
            autoResubscribe: true,
            
            // Service worker path
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerUpdaterPath: '/OneSignalSDKWorker.js',
            
            // Notification prompt settings
            notifyButton: {
              enable: false, // We'll use custom UI
            },
            
            // Welcome notification (disabled)
            welcomeNotification: {
              disable: true
            },
            
            // Prompt options
            promptOptions: {
              slidedown: {
                enabled: false, // We'll use custom prompt
                actionMessage: "We'd like to show you notifications for important updates",
                acceptButtonText: "Allow",
                cancelButtonText: "No Thanks",
                categories: {
                  tags: [
                    {
                      tag: "messages",
                      label: "Chat Messages"
                    },
                    {
                      tag: "tasks",
                      label: "Task Updates"
                    },
                    {
                      tag: "leave",
                      label: "Leave Approvals"
                    },
                    {
                      tag: "announcements",
                      label: "Announcements"
                    }
                  ]
                }
              }
            }
          })

          console.log('[OneSignal] Initialized successfully')

          // Get user ID from localStorage
          const token = localStorage.getItem('token')
          if (token) {
            try {
              // Decode JWT to get user ID
              const payload = JSON.parse(atob(token.split('.')[1]))
              const userId = payload.userId
              
              if (userId) {
                // Set external user ID for targeting
                await OneSignal.login(userId)
                console.log('[OneSignal] User logged in:', userId)
                
                // Set user tags for segmentation
                await OneSignal.User.addTags({
                  userId: userId,
                  platform: 'web',
                  appVersion: '1.0.0'
                })
                console.log('[OneSignal] User tags set')
              }
            } catch (error) {
              console.error('[OneSignal] Error setting user ID:', error)
            }
          }

          // Listen for permission changes
          OneSignal.Notifications.addEventListener('permissionChange', (isGranted) => {
            console.log('[OneSignal] Permission changed:', isGranted)
            
            // Save preference to localStorage
            localStorage.setItem('onesignal-permission', isGranted ? 'granted' : 'denied')
          })

          // Listen for notification clicks
          OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('[OneSignal] Notification clicked:', event)
            
            // Handle notification click
            const data = event.notification.additionalData
            if (data && data.url) {
              router.push(data.url)
            }
          })

          // Listen for foreground notifications
          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            console.log('[OneSignal] Foreground notification:', event)
            
            // You can prevent the notification from displaying
            // event.preventDefault()
            
            // Or modify the notification
            // event.notification.title = 'Modified Title'
          })

          // Check current permission status
          const permission = await OneSignal.Notifications.permission
          console.log('[OneSignal] Current permission:', permission)
          
          // If permission is granted, ensure we're subscribed
          if (permission) {
            const isPushSupported = await OneSignal.Notifications.isPushSupported()
            console.log('[OneSignal] Push supported:', isPushSupported)
            
            if (isPushSupported) {
              const isOptedIn = await OneSignal.User.PushSubscription.optedIn
              console.log('[OneSignal] Opted in:', isOptedIn)
            }
          }
        })
      } catch (error) {
        console.error('[OneSignal] Initialization error:', error)
      }
    }

    // Load OneSignal script
    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    script.onload = () => {
      console.log('[OneSignal] SDK loaded')
      initOneSignal()
    }
    script.onerror = (error) => {
      console.error('[OneSignal] Failed to load SDK:', error)
    }
    
    document.head.appendChild(script)

    // Cleanup
    return () => {
      // Remove script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [router])

  return null // This component doesn't render anything
}

/**
 * Hook to request OneSignal notification permission
 */
export function useOneSignalPermission() {
  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        console.warn('[OneSignal] SDK not loaded yet')
        return false
      }

      const permission = await window.OneSignal.Notifications.requestPermission()
      console.log('[OneSignal] Permission requested:', permission)
      return permission
    } catch (error) {
      console.error('[OneSignal] Error requesting permission:', error)
      return false
    }
  }

  const getPermission = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return false
      }

      const permission = await window.OneSignal.Notifications.permission
      return permission
    } catch (error) {
      console.error('[OneSignal] Error getting permission:', error)
      return false
    }
  }

  const isOptedIn = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return false
      }

      const optedIn = await window.OneSignal.User.PushSubscription.optedIn
      return optedIn
    } catch (error) {
      console.error('[OneSignal] Error checking opt-in status:', error)
      return false
    }
  }

  return {
    requestPermission,
    getPermission,
    isOptedIn
  }
}

/**
 * Hook to manage OneSignal user
 */
export function useOneSignalUser() {
  const login = async (userId) => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        console.warn('[OneSignal] SDK not loaded yet')
        return false
      }

      await window.OneSignal.login(userId)
      console.log('[OneSignal] User logged in:', userId)
      return true
    } catch (error) {
      console.error('[OneSignal] Error logging in user:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return false
      }

      await window.OneSignal.logout()
      console.log('[OneSignal] User logged out')
      return true
    } catch (error) {
      console.error('[OneSignal] Error logging out user:', error)
      return false
    }
  }

  const setTags = async (tags) => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return false
      }

      await window.OneSignal.User.addTags(tags)
      console.log('[OneSignal] Tags set:', tags)
      return true
    } catch (error) {
      console.error('[OneSignal] Error setting tags:', error)
      return false
    }
  }

  return {
    login,
    logout,
    setTags
  }
}

