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

    console.log('[OneSignalInit] Starting initialization...')

    // Initialize OneSignal
    const initOneSignal = async () => {
      try {
        // Make OneSignal globally available immediately
        window.OneSignalDeferred = window.OneSignalDeferred || []

        console.log('[OneSignalInit] Pushing init function to OneSignalDeferred queue...')

        window.OneSignalDeferred.push(async function(OneSignal) {
          console.log('[OneSignalInit] ✅ OneSignal SDK loaded, initializing...')

          await OneSignal.init({
            appId: "d39b9d6c-e7b9-4bae-ad23-66b382b358f2",
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

            // Prompt options - DISABLE auto-prompt, use custom banner instead
            promptOptions: {
              slidedown: {
                enabled: false, // Disable OneSignal's native prompt
                autoPrompt: false, // Don't auto-prompt
                prompts: [
                  {
                    type: "push",
                    autoPrompt: true,
                    text: {
                      actionMessage: "Notifications are required to use this app. Please enable notifications to receive important updates.",
                      acceptButton: "Enable Notifications",
                      cancelButton: "Cancel"
                    },
                    delay: {
                      pageViews: 1,
                      timeDelay: 2 // Show after 2 seconds
                    }
                  }
                ],
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
            },

            // Show native prompt immediately if not subscribed
            showNativePrompt: true,

            // Persistent prompt - shows banner if notifications are disabled
            persistentPrompt: {
              enabled: true,
              autoPrompt: true,
              text: {
                actionMessage: "Notifications are required. Please enable notifications.",
                acceptButton: "Enable",
                cancelButton: "" // Empty to hide cancel button
              }
            }
          })

          console.log('[OneSignalInit] ✅ OneSignal initialized successfully')

          // Set global flag to indicate OneSignal is ready
          window.OneSignalReady = true
          console.log('[OneSignalInit] Set window.OneSignalReady = true')

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
                console.log('[OneSignal] User logged in with external ID:', userId)

                // Set user tags for segmentation
                await OneSignal.User.addTags({
                  userId: userId,
                  platform: 'web',
                  appVersion: '1.0.0',
                  lastLogin: new Date().toISOString()
                })
                console.log('[OneSignal] User tags set')

                // Check subscription status
                const isSubscribed = await OneSignal.User.PushSubscription.optedIn
                const permission = await OneSignal.Notifications.permissionNative
                const playerId = await OneSignal.User.PushSubscription.id

                console.log('[OneSignal] Current status:', {
                  userId,
                  permission,
                  isSubscribed,
                  playerId: playerId || 'Not subscribed'
                })

                // If permission is already granted, subscribe the user
                if (permission) {
                  console.log('[OneSignal] Permission granted, ensuring user is subscribed...')
                  if (!isSubscribed) {
                    await OneSignal.User.PushSubscription.optIn()
                    console.log('[OneSignal] ✅ User subscribed to push notifications')
                  } else {
                    console.log('[OneSignal] ✅ User is already subscribed to push notifications')
                  }
                } else {
                  console.log('[OneSignal] ⚠️ User has not granted notification permission')
                  console.log('[OneSignal] User will be prompted via notification banner')
                }
              }
            } catch (error) {
              console.error('[OneSignal] Error during user setup:', error)
            }
          } else {
            console.log('[OneSignal] No auth token found - user not logged in')
          }

          // Listen for permission changes
          OneSignal.Notifications.addEventListener('permissionChange', async (isGranted) => {
            console.log('[OneSignal] Permission changed:', isGranted)
            
            // Save preference to localStorage
            localStorage.setItem('onesignal-permission', isGranted ? 'granted' : 'denied')

            // If permission granted, ensure user is logged in and subscribed
            if (isGranted) {
              const token = localStorage.getItem('token')
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]))
                  const userId = payload.userId
                  
                  if (userId) {
                    // Login user with external ID
                    await OneSignal.login(userId)
                    console.log('[OneSignal] User logged in with ID:', userId)
                    
                    // Subscribe to push notifications
                    await OneSignal.User.PushSubscription.optIn()
                    console.log('[OneSignal] ✅ User subscribed after permission grant')
                    
                    // Set user tags
                    await OneSignal.User.addTags({
                      userId: userId,
                      platform: 'web',
                      appVersion: '1.0.0',
                      lastLogin: new Date().toISOString()
                    })
                  }
                } catch (error) {
                  console.error('[OneSignal] Error subscribing after permission grant:', error)
                }
              }
            }
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

              // If not opted in, subscribe
              if (!isOptedIn) {
                console.log('[OneSignal] Subscribing user...')
                await OneSignal.User.PushSubscription.optIn()
              }
            }
          } else {
            // Permission not granted - show slidedown immediately and persistently
            console.log('[OneSignal] Permission not granted, showing slidedown...')

            // Function to show prompt
            const showPrompt = async () => {
              try {
                // Check if slidedown is available
                if (OneSignal.Slidedown) {
                  console.log('[OneSignal] Triggering slidedown prompt...')
                  await OneSignal.Slidedown.promptPush()
                } else {
                  console.log('[OneSignal] Slidedown not available, using direct prompt...')
                  await OneSignal.Notifications.requestPermission()
                }
              } catch (error) {
                console.error('[OneSignal] Error showing prompt:', error)
              }
            }

            // Show prompt after 2 seconds
            setTimeout(showPrompt, 2000)

            // Keep checking and showing prompt every 30 seconds if still not granted
            const promptInterval = setInterval(async () => {
              const currentPermission = await OneSignal.Notifications.permission
              if (!currentPermission) {
                console.log('[OneSignal] Still not granted, showing prompt again...')
                showPrompt()
              } else {
                console.log('[OneSignal] Permission granted, stopping prompt interval')
                clearInterval(promptInterval)
              }
            }, 30000) // Check every 30 seconds
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

