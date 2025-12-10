'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useSocket } from './SocketContext'

const UnreadMessagesContext = createContext({
  unreadCount: 0,
  unreadChats: {},
  markChatAsRead: () => {},
  refreshUnreadCount: () => {}
})

export function UnreadMessagesProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadChats, setUnreadChats] = useState({}) // { chatId: count }
  const { onNewMessage } = useSocket()

  // Fetch unread count from API
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/chat/unread', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        // Don't log error for auth issues, just return silently
        if (response.status === 401) return
        console.error('[UnreadMessages] API error:', response.status)
        return
      }
      
      const result = await response.json()
      
      if (result.success) {
        setUnreadCount(result.totalUnread)
        setUnreadChats(result.unreadByChat || {})
      }
    } catch (error) {
      // Silently ignore fetch errors (network issues, etc.)
      // This prevents console spam when user is not logged in or server is unreachable
      if (error.name !== 'TypeError') {
        console.error('[UnreadMessages] Error fetching unread count:', error)
      }
    }
  }

  // Mark chat as read
  const markChatAsRead = async (chatId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/chat/${chatId}/mark-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        // Update local state
        setUnreadChats(prev => {
          const newUnread = { ...prev }
          const chatUnread = newUnread[chatId] || 0
          setUnreadCount(prevCount => Math.max(0, prevCount - chatUnread))
          delete newUnread[chatId]
          return newUnread
        })
      }
    } catch (error) {
      console.error('[UnreadMessages] Error marking chat as read:', error)
    }
  }

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!onNewMessage) {
      console.log('[UnreadMessages] onNewMessage not available yet')
      return
    }

    console.log('[UnreadMessages] Setting up message listener')

    const unsubscribe = onNewMessage((data) => {
      console.log('[UnreadMessages] Raw message data received:', data)

      const { chatId, message, senderId } = data

      if (!message) {
        console.warn('[UnreadMessages] No message in data')
        return
      }

      // Get current user ID
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        console.warn('[UnreadMessages] No user in localStorage')
        return
      }

      const user = JSON.parse(userStr)
      const currentUserId = user.employeeId || user._id

      // Normalize IDs to strings for comparison
      const currentUserIdStr = typeof currentUserId === 'object' ? currentUserId._id || currentUserId.toString() : currentUserId.toString()
      const messageSenderId = senderId || message?.sender?._id || message?.sender
      const messageSenderIdStr = typeof messageSenderId === 'object' ? messageSenderId._id || messageSenderId.toString() : messageSenderId?.toString()

      console.log('[UnreadMessages] New message received:', {
        chatId,
        currentUserId: currentUserIdStr,
        messageSenderId: messageSenderIdStr,
        isFromCurrentUser: messageSenderIdStr === currentUserIdStr
      })

      // Only increment unread count if message is NOT from current user
      if (messageSenderIdStr !== currentUserIdStr) {
        console.log('[UnreadMessages] Incrementing unread count for chat:', chatId)

        // Increment unread count for this chat
        setUnreadChats(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || 0) + 1
        }))

        setUnreadCount(prev => prev + 1)
      } else {
        console.log('[UnreadMessages] Message is from current user, not incrementing unread count')
      }
    })

    return unsubscribe
  }, [onNewMessage])

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <UnreadMessagesContext.Provider value={{
      unreadCount,
      unreadChats,
      markChatAsRead,
      refreshUnreadCount: fetchUnreadCount
    }}>
      {children}
    </UnreadMessagesContext.Provider>
  )
}

export function useUnreadMessages() {
  const context = useContext(UnreadMessagesContext)
  if (!context) {
    throw new Error('useUnreadMessages must be used within UnreadMessagesProvider')
  }
  return context
}

