'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaTimes } from 'react-icons/fa'
import { requestFCMToken, getStoredFCMToken } from '@/lib/firebase'

/**
 * Persistent Firebase Cloud Messaging Subscription Banner
 * Shows when user is logged in but not subscribed to FCM
 * Handles both permission and subscription separately
 */
export default function NotificationBanner() {
  const [show, setShow] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token')
      const loggedIn = !!token
      setIsLoggedIn(loggedIn)

      if (!loggedIn) {
        setShow(false)
        setIsLoading(false)
        return false
      }
      return true
    }

    const checkNotificationStatus = async () => {
      try {
        // First check if user is logged in
        if (!checkLoginStatus()) {
          console.log('[NotificationBanner] User not logged in, hiding banner')
          return
        }

        console.log('[NotificationBanner] User is logged in, checking Firebase...')

        // Wait for Firebase to be ready
        if (typeof window === 'undefined' || !window.FirebaseReady) {
          console.log('[NotificationBanner] Firebase not ready yet, retrying in 1s...')
          setTimeout(checkNotificationStatus, 1000)
          return
        }

        console.log('[NotificationBanner] ✅ Firebase is ready, checking status...')

        // Check browser notification permission
        const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default'
        setPermissionStatus(permission)
        console.log('[NotificationBanner] Permission:', permission)

        // Check if FCM token exists (indicates subscription)
        const fcmToken = getStoredFCMToken()
        const subscribed = !!fcmToken && permission === 'granted'
        setIsSubscribed(subscribed)
        console.log('[NotificationBanner] Subscribed:', subscribed, 'Token exists:', !!fcmToken)

        console.log('[NotificationBanner] ✅ Status check complete:', {
          permission,
          subscribed,
          hasFCMToken: !!fcmToken,
          isLoggedIn: true,
          willShowBanner: !subscribed
        })

        // Show banner if user is logged in but NOT subscribed to FCM
        // Permission can be granted, but subscription might not be active
        if (!subscribed) {
          console.log('[NotificationBanner] 🔔 SHOWING BANNER - User not subscribed')
          setShow(true)
        } else {
          console.log('[NotificationBanner] ✓ Hiding banner - User already subscribed')
          setShow(false)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('[NotificationBanner] ❌ Error checking status:', error)
        // Show banner on error to be safe
        setShow(true)
        setIsLoading(false)
      }
    }

    // Initial check
    checkNotificationStatus()

    // Check permission status every 5 seconds
    const interval = setInterval(async () => {
      // Only check if user is still logged in
      if (!checkLoginStatus()) {
        return
      }

      if (window.FirebaseReady) {
        try {
          const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default'
          const fcmToken = getStoredFCMToken()
          const subscribed = !!fcmToken && perm === 'granted'

          setPermissionStatus(perm)
          setIsSubscribed(subscribed)

          console.log('[NotificationBanner] Periodic check:', { perm, subscribed, hasFCMToken: !!fcmToken })

          // Show banner only if not subscribed (regardless of permission)
          setShow(!subscribed)
        } catch (error) {
          console.error('[NotificationBanner] Error in periodic check:', error)
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleSubscribe = async () => {
    try {
      console.log('[NotificationBanner] Subscribe button clicked')
      console.log('[NotificationBanner] Current status:', { permissionStatus, isSubscribed })

      if (typeof window === 'undefined') {
        console.error('[NotificationBanner] Window not available')
        alert('Please try again in a moment.')
        return
      }

      // Get user ID from token
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('[NotificationBanner] No auth token found')
        alert('Please log in again to enable notifications.')
        return
      }

      let userId
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.userId

        if (!userId) {
          console.error('[NotificationBanner] No user ID in token')
          alert('Invalid user session. Please log in again.')
          return
        }
      } catch (error) {
        console.error('[NotificationBanner] Error parsing token:', error)
        alert('Invalid user session. Please log in again.')
        return
      }

      console.log('[NotificationBanner] Requesting FCM token for user:', userId)

      // Request FCM token (this will also request permission if needed)
      const fcmToken = await requestFCMToken()

      if (!fcmToken) {
        console.error('[NotificationBanner] Failed to get FCM token')
        alert('Failed to subscribe to notifications. Please check your browser settings and try again.')
        return
      }

      console.log('[NotificationBanner] ✅ FCM token obtained')

      // Update state
      setIsSubscribed(true)
      setPermissionStatus('granted')
      setShow(false)

      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Successfully Subscribed!', {
          body: 'You will now receive important updates, messages, and alerts from Talio HRMS.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'subscription-success'
        })
      }

      console.log('[NotificationBanner] ✅ Subscription successful!')
    } catch (error) {
      console.error('[NotificationBanner] Error during subscription:', error)
      alert('Failed to subscribe to notifications. Error: ' + error.message)
    }
  }

  // Don't show if loading or user not logged in
  if (isLoading || !isLoggedIn || !show) {
    return null
  }

  // Determine banner message based on status
  const getBannerMessage = () => {
    if (permissionStatus === 'denied') {
      return {
        title: '🔕 Notifications Blocked',
        message: 'Notifications are blocked in your browser. Please enable them in browser settings to receive updates.',
        buttonText: 'Open Settings Guide',
        buttonAction: () => window.open('/dashboard/notification-debug', '_blank')
      }
    }

    if (permissionStatus !== 'granted') {
      return {
        title: '🔔 Enable Notifications',
        message: 'Allow browser notifications to receive important updates about tasks, messages, and announcements.',
        buttonText: 'Enable & Subscribe',
        buttonAction: handleSubscribe
      }
    }

    // Permission granted but not subscribed to FCM
    return {
      title: '📬 Complete Notification Setup',
      message: 'You have allowed notifications, but need to subscribe to receive push notifications.',
      buttonText: 'Subscribe Now',
      buttonAction: handleSubscribe
    }
  }

  const bannerConfig = getBannerMessage()

  return (
    <div className="fixed top-20 left-0 right-0 z-[55] px-4 md:px-6 animate-slideDown">
      <div
        className="max-w-4xl mx-auto rounded-lg shadow-lg overflow-hidden"
        style={{
          background: permissionStatus === 'denied'
            ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
            : 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)'
        }}
      >
        <div className="flex items-center justify-between p-4 gap-4">
          {/* Icon and Message */}
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-white bg-opacity-20 p-2.5 rounded-lg">
              <FaBell className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm md:text-base">
                {bannerConfig.title}
              </h3>
              <p className="text-white text-opacity-90 text-xs md:text-sm">
                {bannerConfig.message}
              </p>
              {/* Show current status for debugging */}
              <p className="text-white text-opacity-70 text-xs mt-1">
                Status: Permission {permissionStatus} • Subscribed {isSubscribed ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={bannerConfig.buttonAction}
              className="bg-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-opacity-90 transition-all shadow-md whitespace-nowrap"
              style={{ color: permissionStatus === 'denied' ? '#DC2626' : 'var(--color-primary-600)' }}
            >
              {bannerConfig.buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

