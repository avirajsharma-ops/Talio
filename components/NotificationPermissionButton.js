'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaBellSlash, FaCheck } from 'react-icons/fa'

/**
 * Notification Permission Button Component
 * Allows users to enable/disable push notifications
 */
export default function NotificationPermissionButton() {
  const [permission, setPermission] = useState('default')
  const [isOptedIn, setIsOptedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    checkPermissionStatus()
    
    // Check every 2 seconds for permission changes
    const interval = setInterval(checkPermissionStatus, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const checkPermissionStatus = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return
      }

      const perm = await window.OneSignal.Notifications.permission
      setPermission(perm ? 'granted' : 'default')

      if (perm) {
        const optedIn = await window.OneSignal.User.PushSubscription.optedIn
        setIsOptedIn(optedIn)
      }
    } catch (error) {
      console.error('[Notification Permission] Error checking status:', error)
    }
  }

  const handleEnableNotifications = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        alert('OneSignal is not loaded yet. Please try again in a moment.')
        return
      }

      setIsLoading(true)

      // Request permission
      const granted = await window.OneSignal.Notifications.requestPermission()
      
      if (granted) {
        console.log('[Notification Permission] Permission granted')
        setPermission('granted')
        setIsOptedIn(true)
        setShowPrompt(false)
        
        // Show success message
        if (typeof window !== 'undefined' && window.toast) {
          window.toast.success('Notifications enabled! You will now receive important updates.')
        }
      } else {
        console.log('[Notification Permission] Permission denied')
        setPermission('denied')
        
        // Show info message
        if (typeof window !== 'undefined' && window.toast) {
          window.toast.error('Notifications blocked. Please enable them in your browser settings.')
        }
      }
    } catch (error) {
      console.error('[Notification Permission] Error requesting permission:', error)
      
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Failed to enable notifications. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return
      }

      setIsLoading(true)

      // Opt out of notifications
      await window.OneSignal.User.PushSubscription.optOut()
      setIsOptedIn(false)
      
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.success('Notifications disabled')
      }
    } catch (error) {
      console.error('[Notification Permission] Error disabling notifications:', error)
      
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Failed to disable notifications')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show if permission is denied
  if (permission === 'denied') {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <FaBellSlash className="w-4 h-4" />
        <span className="hidden sm:inline">Notifications Blocked</span>
      </div>
    )
  }

  // Show enabled status
  if (permission === 'granted' && isOptedIn) {
    return (
      <button
        onClick={handleDisableNotifications}
        disabled={isLoading}
        className="flex items-center space-x-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
        title="Click to disable notifications"
      >
        <FaCheck className="w-3 h-3" />
        <span className="hidden sm:inline">Notifications On</span>
      </button>
    )
  }

  // Show enable button
  return (
    <button
      onClick={handleEnableNotifications}
      disabled={isLoading}
      className="flex items-center space-x-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
      title="Enable push notifications"
    >
      <FaBell className="w-3 h-3" />
      <span className="hidden sm:inline">
        {isLoading ? 'Enabling...' : 'Enable Notifications'}
      </span>
    </button>
  )
}

/**
 * Notification Permission Popup Component
 * Shows a popup to request notification permission
 */
export function NotificationPermissionPopup() {
  const [show, setShow] = useState(false)
  const [permission, setPermission] = useState('default')

  useEffect(() => {
    // Check if we should show the popup
    const checkShouldShow = async () => {
      try {
        if (typeof window === 'undefined' || !window.OneSignal) {
          return
        }

        // Check if user has already dismissed the popup
        const dismissed = localStorage.getItem('notification-popup-dismissed')
        if (dismissed === 'true') {
          return
        }

        // Check current permission
        const perm = await window.OneSignal.Notifications.permission
        setPermission(perm ? 'granted' : 'default')

        // Show popup after 5 seconds if permission is not granted
        if (!perm) {
          setTimeout(() => {
            setShow(true)
          }, 5000)
        }
      } catch (error) {
        console.error('[Notification Popup] Error:', error)
      }
    }

    checkShouldShow()
  }, [])

  const handleEnable = async () => {
    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        return
      }

      const granted = await window.OneSignal.Notifications.requestPermission()
      
      if (granted) {
        setShow(false)
        localStorage.setItem('notification-popup-dismissed', 'true')
        
        if (typeof window !== 'undefined' && window.toast) {
          window.toast.success('Notifications enabled!')
        }
      }
    } catch (error) {
      console.error('[Notification Popup] Error:', error)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('notification-popup-dismissed', 'true')
  }

  if (!show || permission === 'granted') {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FaBell className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Stay Updated
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Enable notifications to receive important updates about tasks, messages, and approvals.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleEnable}
              className="flex-1 bg-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

