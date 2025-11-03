'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaTimes, FaCheck } from 'react-icons/fa'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  hasUserDismissedNotificationPrompt,
  markNotificationPromptDismissed,
  saveNotificationPreference
} from '@/utils/notifications'

export default function NotificationPermissionPopup() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    if (!isNotificationSupported()) {
      return
    }

    // Check current permission status
    const currentPermission = getNotificationPermission()
    
    // If already granted, don't show prompt
    if (currentPermission === 'granted') {
      setPermissionGranted(true)
      return
    }

    // If already denied, don't show prompt
    if (currentPermission === 'denied') {
      return
    }

    // Check if user has dismissed the prompt before
    if (hasUserDismissedNotificationPrompt()) {
      return
    }

    // Show prompt after 5 seconds
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const handleEnableNotifications = async () => {
    setIsRequesting(true)

    try {
      const permission = await requestNotificationPermission()
      
      if (permission === 'granted') {
        setPermissionGranted(true)
        saveNotificationPreference(true)
        setShowPrompt(false)
        
        // Show a test notification
        setTimeout(async () => {
          await showNotification('🎉 Notifications Enabled!', {
            body: 'You will now receive important updates from Talio HRMS.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            tag: 'notification-success',
            requireInteraction: false,
            actions: [
              {
                action: 'view',
                title: 'View Dashboard'
              }
            ]
          })
        }, 500)
      } else {
        console.log('Notification permission denied')
        setShowPrompt(false)
        markNotificationPromptDismissed()
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  // Removed dismiss and not now handlers - popup is now compulsory

  if (!showPrompt) {
    return null
  }

  return (
    <>
      {/* Backdrop - Non-dismissible */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[100] animate-fade-in"
      />

      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-md animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white relative">
            
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-full">
                <FaBell className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Enable Notifications</h3>
                <p className="text-blue-100 text-sm mt-1">Stay updated with Talio HRMS</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Get instant notifications for:
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-start space-x-3">
                <FaCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Task assignments and updates</span>
              </li>
              <li className="flex items-start space-x-3">
                <FaCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Leave request approvals</span>
              </li>
              <li className="flex items-start space-x-3">
                <FaCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Important announcements</span>
              </li>
              <li className="flex items-start space-x-3">
                <FaCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Attendance reminders</span>
              </li>
            </ul>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleEnableNotifications}
                disabled={isRequesting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isRequesting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <FaBell className="w-4 h-4" />
                    <span>Enable Notifications</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Notifications are required to use this app
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to check notification status
export function useNotificationStatus() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState('default')

  useEffect(() => {
    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())

    // Listen for permission changes
    const checkPermission = () => {
      setPermission(getNotificationPermission())
    }

    // Check permission periodically (some browsers don't fire events)
    const interval = setInterval(checkPermission, 1000)

    return () => clearInterval(interval)
  }, [])

  return { isSupported, permission, isGranted: permission === 'granted' }
}

