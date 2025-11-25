'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserIdFromToken } from '@/utils/jwt'

export default function TestOneSignalPage() {
  const router = useRouter()
  const [status, setStatus] = useState({
    initialized: false,
    permission: null,
    subscribed: false,
    userId: null,
    playerId: null,
    loading: true,
    error: null
  })
  const [testResult, setTestResult] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    checkOneSignalStatus()
  }, [])

  const checkOneSignalStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Wait for OneSignal to be ready
      if (!window.OneSignal) {
        throw new Error('OneSignal SDK not loaded')
      }

      await window.OneSignal.init({
        appId: 'd39b9d6c-e7b9-4bae-ad23-66b382b358f2'
      })

      const permission = await window.OneSignal.Notifications.permission
      const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn
      const playerId = await window.OneSignal.User.PushSubscription.id

      // Get user ID from token
      const token = localStorage.getItem('token')
      let userId = null
      if (token) {
        userId = getUserIdFromToken(token)
      }

      setStatus({
        initialized: true,
        permission,
        subscribed: isSubscribed,
        userId,
        playerId,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error checking OneSignal status:', error)
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }

  const requestPermission = async () => {
    try {
      await window.OneSignal.Slidedown.promptPush()
      // Recheck status after prompt
      setTimeout(checkOneSignalStatus, 1000)
    } catch (error) {
      console.error('Error requesting permission:', error)
      alert('Error requesting permission: ' + error.message)
    }
  }

  const subscribeUser = async () => {
    try {
      await window.OneSignal.User.PushSubscription.optIn()

      // Login with user ID if available
      let userId = status.userId
      if (!userId) {
        const token = localStorage.getItem('token')
        userId = getUserIdFromToken(token)
      }

      if (userId) {
        await window.OneSignal.login(userId)
        console.log('[Debug] Logged in to OneSignal with user ID:', userId)
      }

      // Recheck status
      setTimeout(checkOneSignalStatus, 1000)
    } catch (error) {
      console.error('Error subscribing:', error)
      alert('Error subscribing: ' + error.message)
    }
  }

  const sendTestNotification = async () => {
    if (!status.userId) {
      alert('Please login first')
      return
    }

    setSending(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: status.userId,
          type: 'message',
          customTitle: '🧪 Test from OneSignal Test Page',
          customMessage: 'If you see this, OneSignal is working perfectly!'
        })
      })

      const data = await response.json()
      setTestResult(data)

      if (data.success) {
        alert('✅ Test notification sent! Check your device.')
      } else {
        alert('❌ Failed to send: ' + (data.error || data.message))
      }
    } catch (error) {
      console.error('Error sending test:', error)
      setTestResult({ success: false, error: error.message })
      alert('Error sending test: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">OneSignal Test Page</h1>

          {/* Status Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Status</h2>

            {status.loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : status.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-700">Error: {status.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">Initialized:</span>
                  <span className={status.initialized ? 'text-green-600' : 'text-red-600'}>
                    {status.initialized ? '✅ Yes' : '❌ No'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-medium">Permission:</span>
                  <span className={status.permission ? 'text-green-600' : 'text-yellow-600'}>
                    {status.permission ? '✅ Granted' : '⚠️ Not Granted'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-medium">Subscribed:</span>
                  <span className={status.subscribed ? 'text-green-600' : 'text-red-600'}>
                    {status.subscribed ? '✅ Yes' : '❌ No'}
                  </span>
                </div>

                {status.userId && (
                  <div className="flex items-center gap-3">
                    <span className="font-medium">User ID:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {status.userId}
                    </code>
                  </div>
                )}

                {status.playerId && (
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Player ID:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm break-all">
                      {status.playerId}
                    </code>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={checkOneSignalStatus}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Status
            </button>
          </div>

          {/* Actions Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {!status.permission && (
                <button
                  onClick={requestPermission}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Request Permission
                </button>
              )}

              {status.permission && !status.subscribed && (
                <button
                  onClick={subscribeUser}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Subscribe to Notifications
                </button>
              )}

              {status.subscribed && (
                <button
                  onClick={sendTestNotification}
                  disabled={sending}
                  className={`w-full px-4 py-2 text-white rounded ${sending
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-600'
                    }`}
                >
                  {sending ? 'Sending...' : 'Send Test Notification'}
                </button>
              )}
            </div>
          </div>

          {/* Test Result Section */}
          {testResult && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Test Result</h2>
              <div className={`border rounded p-4 ${testResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                }`}>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Make sure you're logged in</li>
              <li>Click "Request Permission" if permission not granted</li>
              <li>Click "Subscribe to Notifications" if not subscribed</li>
              <li>Click "Send Test Notification" to test</li>
              <li>Check your device for the notification</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
