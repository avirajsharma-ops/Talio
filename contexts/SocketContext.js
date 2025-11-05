'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    // Get user ID from localStorage
    const userData = localStorage.getItem('user')
    let userId = null
    if (userData) {
      const user = JSON.parse(userData)
      userId = user.employeeId || user._id
      setCurrentUserId(userId)
    }

    // Initialize Socket.IO connection
    const socketInstance = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ [Socket.IO Client] Connected:', socketInstance.id)
      setIsConnected(true)

      // Authenticate user if we have userId
      if (userId) {
        socketInstance.emit('authenticate', userId)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('❌ [Socket.IO Client] Disconnected')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('⚠️ [Socket.IO Client] Connection error:', error)
      setIsConnected(false)
    })

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 [Socket.IO Client] Reconnected after ${attemptNumber} attempts`)
      setIsConnected(true)

      // Re-authenticate after reconnection
      if (userId) {
        socketInstance.emit('authenticate', userId)
      }
    })

    setSocket(socketInstance)

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Join a chat room
  const joinChat = useCallback((chatId) => {
    if (socket && isConnected) {
      socket.emit('join-chat', chatId)
      console.log(`👤 [Socket.IO Client] Joining chat:${chatId}`)
    }
  }, [socket, isConnected])

  // Leave a chat room
  const leaveChat = useCallback((chatId) => {
    if (socket && isConnected) {
      socket.emit('leave-chat', chatId)
      console.log(`👋 [Socket.IO Client] Leaving chat:${chatId}`)
    }
  }, [socket, isConnected])

  // Send a message
  const sendMessage = useCallback((chatId, message) => {
    if (socket && isConnected) {
      socket.emit('send-message', { chatId, message })
      console.log(`💬 [Socket.IO Client] Sending message to chat:${chatId}`)
    }
  }, [socket, isConnected])

  // Send typing indicator
  const sendTyping = useCallback((chatId, userId, userName) => {
    if (socket && isConnected) {
      socket.emit('typing', { chatId, userId, userName })
    }
  }, [socket, isConnected])

  // Send stop typing indicator
  const sendStopTyping = useCallback((chatId, userId) => {
    if (socket && isConnected) {
      socket.emit('stop-typing', { chatId, userId })
    }
  }, [socket, isConnected])

  // Mark message as read
  const markAsRead = useCallback((chatId, messageId, userId) => {
    if (socket && isConnected) {
      socket.emit('mark-read', { chatId, messageId, userId })
    }
  }, [socket, isConnected])

  // Subscribe to new messages
  const onNewMessage = useCallback((callback) => {
    if (socket) {
      socket.on('new-message', callback)
      return () => socket.off('new-message', callback)
    }
  }, [socket])

  // Subscribe to typing events
  const onUserTyping = useCallback((callback) => {
    if (socket) {
      socket.on('user-typing', callback)
      return () => socket.off('user-typing', callback)
    }
  }, [socket])

  // Subscribe to stop typing events
  const onUserStopTyping = useCallback((callback) => {
    if (socket) {
      socket.on('user-stop-typing', callback)
      return () => socket.off('user-stop-typing', callback)
    }
  }, [socket])

  // Subscribe to user joined events
  const onUserJoined = useCallback((callback) => {
    if (socket) {
      socket.on('user-joined', callback)
      return () => socket.off('user-joined', callback)
    }
  }, [socket])

  // Subscribe to user left events
  const onUserLeft = useCallback((callback) => {
    if (socket) {
      socket.on('user-left', callback)
      return () => socket.off('user-left', callback)
    }
  }, [socket])

  // Subscribe to message read events
  const onMessageRead = useCallback((callback) => {
    if (socket) {
      socket.on('message-read', callback)
      return () => socket.off('message-read', callback)
    }
  }, [socket])

  const value = {
    socket,
    isConnected,
    currentUserId,
    joinChat,
    leaveChat,
    sendMessage,
    sendTyping,
    sendStopTyping,
    markAsRead,
    onNewMessage,
    onUserTyping,
    onUserStopTyping,
    onUserJoined,
    onUserLeft,
    onMessageRead
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

