// Removed
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getUserIdFromToken } from '@/utils/jwt'

/**
 * OneSignal Initialization Component with Custom Subscription Flow
 * Flow: 1) User logs in → 2) Show OneSignal banner → 3) User subscribes → 4) Request native permission → 5) Save Player ID
 * Re-prompts on every session if permission was denied
 */
export default function OneSignalInit() {
  const pathname = usePathname()
  const router = useRouter()
  const [showCustomBanner, setShowCustomBanner] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check if user is logged in
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      const loggedIn = !!(token && user)
      setIsLoggedIn(loggedIn)
      console.log('[OneSignalInit] Login status:', loggedIn)
    }

    checkLoginStatus()

    // Listen for storage changes (login/logout events)
    window.addEventListener('storage', checkLoginStatus)
    return () => window.removeEventListener('storage', checkLoginStatus)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Don't initialize on login page
    if (pathname === '/login') return

    // Only initialize if user is logged in
    if (!isLoggedIn) {
      console.log('[OneSignalInit] User not logged in, skipping initialization')
      return
    }

    // Only show on dashboard pages
    if (!pathname?.startsWith('/dashboard')) {
      console.log('[OneSignalInit] Not on dashboard, skipping initialization')
      return
    }

    console.log('[OneSignalInit] Starting initialization...')

    initOneSignal()
  }, [pathname, isLoggedIn])

  const initOneSignal = async () => {
    try {
      // Wait for OneSignal SDK to be loaded
      if (!window.OneSignal) {
        console.log('[OneSignalInit] Waiting for OneSignal SDK...')
        setTimeout(initOneSignal, 100)
        return
      }

      console.log('[OneSignalInit] ✅ OneSignal SDK loaded, initializing...')

      // Initialize OneSignal
      await window.OneSignal.init({
        appId: 'd39b9d6c-e7b9-4bae-ad23-66b382b358f2',
        safari_web_id: 'web.onesignal.auto.42873e37-42b9-4e5d-9423-af83e9e44ff4',

        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        autoResubscribe: true,

        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/OneSignalSDKWorker.js',

        notifyButton: {
          enable: false // Use custom UI
        },

        welcomeNotification: {
          disable: true
        },

        // DISABLE ALL AUTO-PROMPTS - we control the flow
        promptOptions: {
          slidedown: {
            enabled: false, // We'll use custom banner
            autoPrompt: false
          }
        }
      })

      console.log('[OneSignalInit] ✅ OneSignal initialized')

      // Get auth token and user ID
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('[OneSignalInit] No auth token - user not logged in')
        return
      }

      // Decode JWT to get user ID
      const userId = getUserIdFromToken(token)

      if (!userId) {
        console.log('[OneSignalInit] No user ID found in token')
        return
      }

      // Set external user ID immediately
      await window.OneSignal.login(userId)
      console.log('[OneSignal] ✅ User logged in with external ID:', userId)

      // Check current subscription status
      const permission = window.OneSignal.Notifications.permission
      const isOptedIn = window.OneSignal.User.PushSubscription.optedIn
      const playerId = window.OneSignal.User.PushSubscription.id

      console.log('[OneSignal] Current status:', {
        userId,
        permission,
        isOptedIn,
        playerId: playerId || 'Not subscribed'
      })

      // Check if user is already subscribed in our database
      const dbStatus = await checkSubscriptionStatus(token)

      if (dbStatus?.isSubscribed && playerId) {
        // Already subscribed - verify Player ID is saved
        console.log('[OneSignal] ✅ User already subscribed')

        // Make sure Player ID is saved in database
        if (!dbStatus.oneSignalPlayerId || dbStatus.oneSignalPlayerId !== playerId) {
          await savePlayerIdToDatabase(playerId, token)
        }
      } else if (permission && isOptedIn && playerId) {
        // Has permission and is opted in, but not in our database
        console.log('[OneSignal] User has permission, saving Player ID...')
        await savePlayerIdToDatabase(playerId, token)
      } else {
        // Not subscribed - check if we should show banner
        const shouldPrompt = await shouldShowPrompt(dbStatus, permission)

        if (shouldPrompt) {
          console.log('[OneSignalInit] Showing subscription banner...')
          setShowCustomBanner(true)
        } else {
          console.log('[OneSignalInit] Skipping prompt based on user history')
        }
      }

      // Listen for subscription changes
      window.OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
        console.log('[OneSignal] Subscription changed:', event)

        const newPlayerId = window.OneSignal.User.PushSubscription.id
        if (newPlayerId) {
          await savePlayerIdToDatabase(newPlayerId, token)
          setShowCustomBanner(false)
        }
      })

      // Listen for permission changes
      window.OneSignal.Notifications.addEventListener('permissionChange', async (isGranted) => {
        console.log('[OneSignal] Permission changed:', isGranted)

        // Update permission status in database
        if (token) {
          await fetch('/api/onesignal/permission-status', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: isGranted ? 'granted' : 'denied'
            })
          })
        }

        if (isGranted) {
          const newPlayerId = window.OneSignal.User.PushSubscription.id
          if (newPlayerId) {
            await savePlayerIdToDatabase(newPlayerId, token)
            setShowCustomBanner(false)
          }
        }
      })

      // Listen for notification clicks
      window.OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('[OneSignal] Notification clicked:', event)
        const data = event.notification.additionalData
        if (data?.url) {
          router.push(data.url)
        }
      })

    } catch (error) {
      console.error('[OneSignalInit] Error:', error)
    }
  }

  const checkSubscriptionStatus = async (token) => {
    try {
      const response = await fetch('/api/onesignal/subscribe', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.data
      }
    } catch (error) {
      console.error('[OneSignal] Error checking subscription status:', error)
    }
    return null
  }

  /**
   * Determine if we should show the subscription prompt
   * Re-prompt on every session if permission was denied
   */
  const shouldShowPrompt = async (dbStatus, currentPermission) => {
    // If permission is denied, always re-prompt on new session
    if (currentPermission === 'denied') {
      console.log('[OneSignalInit] Permission denied, will re-prompt this session')
      return true
    }

    // If permission is default (never asked), show prompt
    if (!currentPermission || currentPermission === 'default') {
      console.log('[OneSignalInit] Permission not requested yet, showing prompt')
      return true
    }

    // If permission is granted but not subscribed, show prompt
    if (currentPermission === 'granted' && !dbStatus?.isSubscribed) {
      console.log('[OneSignalInit] Permission granted but not subscribed, showing prompt')
      return true
    }

    return false
  }

  const savePlayerIdToDatabase = async (playerId, token) => {
    try {
      console.log('[OneSignal] Saving Player ID to database:', playerId)

      const response = await fetch('/api/onesignal/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ playerId })
      })

      const data = await response.json()

      if (data.success) {
        console.log('[OneSignal] ✅ Player ID saved to database')
      } else {
        console.error('[OneSignal] ❌ Failed to save Player ID:', data.error)
      }
    } catch (error) {
      console.error('[OneSignal] Error saving Player ID:', error)
    }
  }

  const handleSubscribe = async () => {
    setIsSubscribing(true)

    try {
      console.log('[OneSignal] User clicked subscribe button')

      const token = localStorage.getItem('token')

      // Update last prompted timestamp
      if (token) {
        await fetch('/api/onesignal/subscribe', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }

      // STEP 1: Opt in to OneSignal (this creates the subscription)
      console.log('[OneSignal] Step 1: Opting in to OneSignal...')
      await window.OneSignal.User.PushSubscription.optIn()

      // Wait a bit for OneSignal subscription to initialize
      await new Promise(resolve => setTimeout(resolve, 500))

      // STEP 2: Request native notification permission
      console.log('[OneSignal] Step 2: Requesting native notification permission...')
      const permissionGranted = await window.OneSignal.Notifications.requestPermission()

      console.log('[OneSignal] Permission result:', permissionGranted)

      // Update permission status in database
      if (token) {
        await fetch('/api/onesignal/permission-status', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: permissionGranted ? 'granted' : 'denied'
          })
        })
      }

      // Wait for subscription to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // STEP 3: Get the Player ID and save to database
      const playerId = window.OneSignal.User.PushSubscription.id

      if (playerId) {
        console.log('[OneSignal] ✅ Subscribed! Player ID:', playerId)

        // Save to database
        await savePlayerIdToDatabase(playerId, token)

        // Hide banner
        setShowCustomBanner(false)
      } else {
        console.warn('[OneSignal] ⚠️ No Player ID received')

        // If permission was denied, we still hide the banner
        // It will re-appear on next session
        if (!permissionGranted) {
          console.log('[OneSignal] Permission denied, will re-prompt on next session')
          setShowCustomBanner(false)
        }
      }

    } catch (error) {
      console.error('[OneSignal] Error during subscription:', error)
      alert('Failed to subscribe to notifications. Please try again.')
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleDismiss = async () => {
    console.log('[OneSignal] User dismissed banner')

    // Update last prompted timestamp
    const token = localStorage.getItem('token')
    if (token) {
      await fetch('/api/onesignal/subscribe', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    }

    setShowCustomBanner(false)
  }

  if (!showCustomBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Banner */}
      <div className="relative bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Stay Updated with Notifications
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Get instant updates for messages, tasks, leave approvals, and important announcements. You'll be asked to allow notifications in the next step.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
              >
                {isSubscribing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Subscribing...
                  </span>
                ) : (
                  'Enable Notifications'
                )}
              </button>
              <button
                onClick={handleDismiss}
                disabled={isSubscribing}
                className="flex-1 sm:flex-none px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
