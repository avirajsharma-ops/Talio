'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * OneSignal Initialization Component with Custom Subscription Flow
 * Flow: 1) Show OneSignal banner → 2) User subscribes → 3) Request native permission → 4) Save Player ID
 */
export default function OneSignalInit() {
  const pathname = usePathname()
  const router = useRouter()
  const [showCustomBanner, setShowCustomBanner] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Don't initialize on login page
    if (pathname === '/login') return

    console.log('[OneSignalInit] Starting initialization...')

    initOneSignal()
  }, [pathname])

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
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userId = payload.userId

      if (!userId) {
        console.log('[OneSignalInit] No user ID found in token')
        return
      }

      // Set external user ID immediately
      await window.OneSignal.login(userId)
      console.log('[OneSignal] ✅ User logged in with external ID:', userId)

      // Check current subscription status
      const permission = await window.OneSignal.Notifications.permission
      const isOptedIn = await window.OneSignal.User.PushSubscription.optedIn
      const playerId = await window.OneSignal.User.PushSubscription.id

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
        // Not subscribed - show custom banner
        console.log('[OneSignal] User not subscribed, showing banner...')
        setShowCustomBanner(true)
      }

      // Listen for subscription changes
      window.OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
        console.log('[OneSignal] Subscription changed:', event)
        
        const newPlayerId = await window.OneSignal.User.PushSubscription.id
        if (newPlayerId) {
          await savePlayerIdToDatabase(newPlayerId, token)
          setShowCustomBanner(false)
        }
      })

      // Listen for permission changes
      window.OneSignal.Notifications.addEventListener('permissionChange', async (isGranted) => {
        console.log('[OneSignal] Permission changed:', isGranted)
        
        if (isGranted) {
          const newPlayerId = await window.OneSignal.User.PushSubscription.id
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

      // Check if already has permission
      const currentPermission = await window.OneSignal.Notifications.permission
      
      if (!currentPermission) {
        // Step 1: Opt in to OneSignal (this will trigger the native permission prompt)
        console.log('[OneSignal] Requesting permission...')
        await window.OneSignal.User.PushSubscription.optIn()
        
        // Wait a bit for subscription to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Get the Player ID
      const playerId = await window.OneSignal.User.PushSubscription.id
      
      if (playerId) {
        console.log('[OneSignal] ✅ Subscribed! Player ID:', playerId)
        
        // Save to database
        await savePlayerIdToDatabase(playerId, token)
        
        // Hide banner
        setShowCustomBanner(false)
      } else {
        console.warn('[OneSignal] ⚠️ No Player ID received')
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
                Get instant updates for messages, tasks, leave approvals, and important announcements. We'll only send you relevant notifications.
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
