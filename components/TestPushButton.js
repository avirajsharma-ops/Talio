'use client'

import { useState } from 'react'
import { FaBell } from 'react-icons/fa'
import toast from 'react-hot-toast'

/**
 * Test Push Notification Button
 * Allows users to send a test push notification to themselves
 */
export default function TestPushButton() {
  const [isSending, setIsSending] = useState(false)

  const sendTestNotification = async () => {
    setIsSending(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please login first')
        setIsSending(false)
        return
      }

      const response = await fetch('/api/test-push', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Test notification sent! Check your device.', {
          duration: 5000,
          icon: '🎉',
        })
      } else {
        toast.error(data.message || 'Failed to send test notification', {
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification', {
        duration: 5000,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <button
      onClick={sendTestNotification}
      disabled={isSending}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <FaBell className={isSending ? 'animate-bounce' : ''} />
      {isSending ? 'Sending...' : 'Test Push Notification'}
    </button>
  )
}

