'use client'

import { useEffect, useState } from 'react'
import { requestFCMToken, onForegroundMessage, saveFCMTokenToBackend } from '@/lib/firebase'
import toast from 'react-hot-toast'

export default function PushNotificationProvider({ children, userId }) {
  const [permissionStatus, setPermissionStatus] = useState('default')
  const [showPermissionBanner, setShowPermissionBanner] = useState(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    // Check current permission status
    const currentPermission = Notification.permission
    setPermissionStatus(currentPermission)

    // Show banner if permission is not granted and user is logged in
    if (currentPermission === 'default' && userId) {
      // Wait a bit before showing the banner (don't annoy users immediately)
      const timer = setTimeout(() => {
        setShowPermissionBanner(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }

    // If permission is already granted, request token
    if (currentPermission === 'granted' && userId) {
      initializePushNotifications()
    }
  }, [userId])

  const initializePushNotifications = async () => {
    try {
      console.log('[Push] Initializing push notifications...')
      
      // Request FCM token
      const token = await requestFCMToken()
      
      if (token) {
        console.log('[Push] FCM token obtained:', token)
        
        // Save token to backend
        const result = await saveFCMTokenToBackend(token, userId)
        
        if (result && result.success) {
          console.log('[Push] Token saved to backend successfully')
          
          // Set up foreground message listener
          onForegroundMessage((payload) => {
            console.log('[Push] Foreground message received:', payload)
            
            // Show toast notification
            const title = payload.notification?.title || 'New Notification'
            const body = payload.notification?.body || ''
            
            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <img
                        className="h-10 w-10 rounded-full"
                        src="/icon-192x192.png"
                        alt="Talio HRMS"
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="mt-1 text-sm text-gray-500">{body}</p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id)
                      // Navigate to the click action URL if provided
                      const clickAction = payload.data?.clickAction || payload.fcmOptions?.link
                      if (clickAction) {
                        window.location.href = clickAction
                      }
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none"
                  >
                    View
                  </button>
                </div>
              </div>
            ), {
              duration: 5000,
              position: 'top-right',
            })
          })
        } else {
          console.error('[Push] Failed to save token to backend')
        }
      } else {
        console.log('[Push] Failed to obtain FCM token')
      }
    } catch (error) {
      console.error('[Push] Error initializing push notifications:', error)
    }
  }

  const handleEnableNotifications = async () => {
    try {
      const token = await requestFCMToken()
      
      if (token) {
        setPermissionStatus('granted')
        setShowPermissionBanner(false)
        toast.success('Push notifications enabled!')
        
        // Initialize push notifications
        await initializePushNotifications()
      } else {
        setPermissionStatus('denied')
        setShowPermissionBanner(false)
        toast.error('Failed to enable push notifications')
      }
    } catch (error) {
      console.error('[Push] Error enabling notifications:', error)
      toast.error('Failed to enable push notifications')
    }
  }

  const handleDismissBanner = () => {
    setShowPermissionBanner(false)
    // Remember that user dismissed the banner (store in localStorage)
    localStorage.setItem('push-notification-banner-dismissed', 'true')
  }

  return (
    <>
      {children}
      
      {/* Permission Banner */}
      {showPermissionBanner && permissionStatus === 'default' && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white shadow-lg rounded-lg p-4 border border-gray-200 z-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-gray-900">Enable Push Notifications</h3>
              <p className="mt-1 text-sm text-gray-500">
                Stay updated with real-time notifications for tasks, attendance, and more.
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={handleEnableNotifications}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                >
                  Enable
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

