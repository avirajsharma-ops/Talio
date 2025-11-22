'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaTimes } from 'react-icons/fa'
import { getUserIdFromToken } from '@/utils/jwt'

/**
 * Persistent banner that prompts users to enable notifications
 * Shows when notifications are not enabled
 */
export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    checkNotificationStatus()

    // Check status every 5 seconds
    const interval = setInterval(checkNotificationStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  const checkNotificationStatus = async () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setShow(false)
      return
    }

    const currentPermission = Notification.permission
    setPermission(currentPermission)

    // Check OneSignal subscription status
    if (window.OneSignal) {
      try {
        const subscribed = await window.OneSignal.User.PushSubscription.optedIn
        setIsSubscribed(subscribed)

        // Show banner if permission is not granted OR not subscribed to OneSignal
        setShow(currentPermission !== 'granted' || !subscribed)
      } catch (error) {
        console.error('[NotificationBanner] Error checking OneSignal status:', error)
        setShow(currentPermission !== 'granted')
      }
    } else {
      // OneSignal not loaded yet, just check permission
      setShow(currentPermission !== 'granted')
    }
  }

  const handleEnableNotifications = async () => {
    setRequesting(true)

    try {
      if (window.OneSignal) {
        // Use OneSignal to request permission
        await window.OneSignal.Notifications.requestPermission()

        // Login user if we have a token
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const userId = getUserIdFromToken(token)
            if (userId) {
              await window.OneSignal.login(userId)
              console.log('[NotificationBanner] User logged in to OneSignal:', userId)
            }
          } catch (error) {
            console.error('[NotificationBanner] Error logging in to OneSignal:', error)
          }
        }

        // Opt in to push notifications
        await window.OneSignal.User.PushSubscription.optIn()
        console.log('[NotificationBanner] Successfully subscribed to notifications')

        // Recheck status
        await checkNotificationStatus()
      } else {
        // Fallback to browser notification API
        const result = await Notification.requestPermission()
        setPermission(result)

        if (result === 'granted') {
          setShow(false)
        }
      }
    } catch (error) {
      console.error('[NotificationBanner] Error enabling notifications:', error)
      alert('Failed to enable notifications. Please check your browser settings.')
    } finally {
      setRequesting(false)
    }
  }

  const handleDismiss = () => {
    // Hide for this session only
    setShow(false)

    // Store dismissal in sessionStorage (not localStorage, so it shows again on next visit)
    sessionStorage.setItem('notification-banner-dismissed', 'true')
  }

  // Don't show if dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('notification-banner-dismissed')
    if (dismissed === 'true') {
      setShow(false)
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-[60px] left-0 right-0 z-[100] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <FaBell className="text-2xl flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold text-sm md:text-base">
                {permission === 'denied'
                  ? '🔕 Notifications are blocked'
                  : !isSubscribed && permission === 'granted'
                    ? '⚠️ Complete notification setup'
                    : '🔔 Enable notifications to stay updated'
                }
              </p>
              <p className="text-xs md:text-sm opacity-90 mt-0.5">
                {permission === 'denied'
                  ? 'Please enable notifications in your browser settings to receive important updates'
                  : !isSubscribed && permission === 'granted'
                    ? 'Click "Enable" to complete your notification subscription'
                    : 'Get instant alerts for messages, tasks, announcements, and more'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {permission !== 'denied' && (
              <button
                onClick={handleEnableNotifications}
                disabled={requesting}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {requesting ? '⏳ Enabling...' : '✅ Enable'}
              </button>
            )}

            {permission === 'denied' && (
              <a
                href="/dashboard/notification-debug"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                📋 Help
              </a>
            )}

            <button
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Dismiss"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

