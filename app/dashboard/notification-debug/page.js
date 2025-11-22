'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa'
import { getUserIdFromToken } from '@/utils/jwt'

export default function NotificationDebugPage() {
  const [debugInfo, setDebugInfo] = useState({
    browserSupport: false,
    permission: 'default',
    oneSignalInitialized: false,
    oneSignalSubscribed: false,
    oneSignalUserId: null,
    oneSignalPlayerId: null,
    serviceWorkerRegistered: false,
    serviceWorkerActive: false
  })
  const [testResult, setTestResult] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  const checkNotificationStatus = async () => {
    const info = {
      browserSupport: 'Notification' in window && 'serviceWorker' in navigator,
      permission: Notification?.permission || 'not-supported',
      oneSignalInitialized: false,
      oneSignalSubscribed: false,
      oneSignalUserId: null,
      oneSignalPlayerId: null,
      serviceWorkerRegistered: false,
      serviceWorkerActive: false
    }

    // Check OneSignal status
    if (window.OneSignal) {
      try {
        info.oneSignalInitialized = true

        // Check if user is subscribed
        const isPushSupported = await window.OneSignal.Notifications.isPushSupported()
        const permission = await window.OneSignal.Notifications.permissionNative
        const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn

        info.oneSignalSubscribed = isSubscribed
        info.permission = permission

        // Get user ID
        const userId = await window.OneSignal.User.getExternalId()
        info.oneSignalUserId = userId

        // Get player ID (OneSignal subscription ID)
        const playerId = await window.OneSignal.User.PushSubscription.id
        info.oneSignalPlayerId = playerId

        console.log('[Debug] OneSignal Status:', {
          isPushSupported,
          permission,
          isSubscribed,
          userId,
          playerId
        })
      } catch (error) {
        console.error('[Debug] Error checking OneSignal status:', error)
      }
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        info.serviceWorkerRegistered = !!registration
        info.serviceWorkerActive = registration?.active?.state === 'activated'
      } catch (error) {
        console.error('[Debug] Error checking service worker:', error)
      }
    }

    setDebugInfo(info)
  }

  const requestPermission = async () => {
    try {
      if (window.OneSignal) {
        await window.OneSignal.Notifications.requestPermission()
        await checkNotificationStatus()
      } else {
        const permission = await Notification.requestPermission()
        setDebugInfo(prev => ({ ...prev, permission }))
      }
    } catch (error) {
      console.error('[Debug] Error requesting permission:', error)
      alert('Error requesting permission: ' + error.message)
    }
  }

  const subscribeToOneSignal = async () => {
    try {
      if (!window.OneSignal) {
        alert('OneSignal not initialized. Please refresh the page.')
        return
      }

      // Request permission first
      await window.OneSignal.Notifications.requestPermission()

      // Login user
      const token = localStorage.getItem('token')
      const userId = getUserIdFromToken(token)
      if (userId) {
        await window.OneSignal.login(userId)
        console.log('[Debug] Logged in to OneSignal with user ID:', userId)
      }

      await checkNotificationStatus()
      alert('Successfully subscribed to notifications!')
    } catch (error) {
      console.error('[Debug] Error subscribing:', error)
      alert('Error subscribing: ' + error.message)
    }
  }

  const sendTestNotification = async () => {
    setSending(true)
    setTestResult(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '🧪 Test Notification',
          message: 'This is a test notification from the debug page. If you see this, notifications are working!',
          url: '/dashboard/notification-debug'
        })
      })

      const result = await response.json()
      console.log('[Debug] Test notification result:', result)

      setTestResult(result)
    } catch (error) {
      console.error('[Debug] Error sending test notification:', error)
      setTestResult({
        success: false,
        message: error.message
      })
    } finally {
      setSending(false)
    }
  }

  const showBrowserNotification = async () => {
    try {
      if (Notification.permission !== 'granted') {
        await Notification.requestPermission()
      }

      if (Notification.permission === 'granted') {
        new Notification('🧪 Browser Test Notification', {
          body: 'This is a direct browser notification (not via OneSignal)',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png'
        })
      }
    } catch (error) {
      console.error('[Debug] Error showing browser notification:', error)
      alert('Error: ' + error.message)
    }
  }

  const StatusIcon = ({ status }) => {
    if (status === true) return <FaCheckCircle className="text-green-500" />
    if (status === false) return <FaTimesCircle className="text-red-500" />
    return <FaExclamationTriangle className="text-yellow-500" />
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaBell className="text-blue-600" />
          Notification Debug Panel
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Diagnose and test push notification functionality
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Browser Support</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Notifications API</span>
              <StatusIcon status={debugInfo.browserSupport} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Permission Status</span>
              <span className={`text-sm font-medium ${debugInfo.permission === 'granted' ? 'text-green-600' :
                  debugInfo.permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                {debugInfo.permission}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Service Worker</span>
              <StatusIcon status={debugInfo.serviceWorkerRegistered} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">SW Active</span>
              <StatusIcon status={debugInfo.serviceWorkerActive} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3">OneSignal Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Initialized</span>
              <StatusIcon status={debugInfo.oneSignalInitialized} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Subscribed</span>
              <StatusIcon status={debugInfo.oneSignalSubscribed} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User ID</span>
              <span className="text-xs text-gray-500 truncate max-w-[150px]">
                {debugInfo.oneSignalUserId || 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Player ID</span>
              <span className="text-xs text-gray-500 truncate max-w-[150px]">
                {debugInfo.oneSignalPlayerId || 'Not set'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={checkNotificationStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh Status
          </button>

          <button
            onClick={requestPermission}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            disabled={debugInfo.permission === 'granted'}
          >
            🔔 Request Permission
          </button>

          <button
            onClick={subscribeToOneSignal}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            disabled={!debugInfo.oneSignalInitialized}
          >
            ✅ Subscribe to OneSignal
          </button>

          <button
            onClick={showBrowserNotification}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            disabled={debugInfo.permission !== 'granted'}
          >
            🧪 Test Browser Notification
          </button>

          <button
            onClick={sendTestNotification}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors md:col-span-2"
            disabled={sending || !debugInfo.oneSignalSubscribed}
          >
            {sending ? '⏳ Sending...' : '📤 Send Test via API'}
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-lg shadow p-6 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
          <h3 className="font-semibold text-gray-800 mb-2">Test Result</h3>
          <pre className="text-xs bg-white p-3 rounded overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-gray-800 mb-3">📋 Understanding Notifications</h3>
        <div className="space-y-3 text-sm text-gray-700 mb-4">
          <div className="bg-white p-3 rounded border border-yellow-300">
            <h4 className="font-semibold text-gray-800 mb-1">🔔 Browser Permission</h4>
            <p>This is the browser-level permission to show notifications. You grant this when you click "Allow" in the browser prompt.</p>
          </div>
          <div className="bg-white p-3 rounded border border-yellow-300">
            <h4 className="font-semibold text-gray-800 mb-1">📬 OneSignal Subscription</h4>
            <p>This is a separate subscription to receive push notifications via OneSignal. Even if permission is granted, you need to subscribe to actually receive notifications.</p>
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-2">🔧 Troubleshooting Steps</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li><strong>Check Browser Support:</strong> All indicators should be green</li>
          <li><strong>Grant Permission:</strong> If permission is "default" or "denied", click "Request Permission"</li>
          <li><strong>Subscribe to OneSignal:</strong> Even with permission granted, you MUST click "Subscribe to OneSignal" to receive notifications</li>
          <li><strong>Verify User ID:</strong> Make sure you're logged in and User ID is set</li>
          <li><strong>Test Browser Notification:</strong> Verify browser notifications work independently</li>
          <li><strong>Test Full Pipeline:</strong> Click "Send Test via API" to test end-to-end</li>
          <li><strong>Check Console:</strong> Press F12 and look for [OneSignal] logs</li>
        </ol>
      </div>
    </div>
  )
}

