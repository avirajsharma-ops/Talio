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
      // Ensure we get a string ID, not an object
      const rawId = user.employeeId || user._id
      userId = typeof rawId === 'object' ? rawId._id || rawId.toString() : rawId
      setCurrentUserId(userId)
      console.log('🔑 [Socket.IO Client] User ID:', userId)
    }

    // Initialize Socket.IO connection
    // Use window.location.origin to connect to the same server
    const socketInstance = io(window.location.origin, {
      path: '/api/socketio',
      transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
      autoConnect: true
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

  // Subscribe to task update events
  const onTaskUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('task-update', callback)
      return () => socket.off('task-update', callback)
    }
  }, [socket])

  // Subscribe to announcement events
  const onAnnouncement = useCallback((callback) => {
    if (socket) {
      socket.on('new-announcement', callback)
      return () => socket.off('new-announcement', callback)
    }
  }, [socket])

  // Subscribe to message reaction events
  const onMessageReaction = useCallback((callback) => {
    if (socket) {
      socket.on('message-reaction', callback)
      return () => socket.off('message-reaction', callback)
    }
  }, [socket])

  // Subscribe to message deleted events
  const onMessageDeleted = useCallback((callback) => {
    if (socket) {
      socket.on('message-deleted', callback)
      return () => socket.off('message-deleted', callback)
    }
  }, [socket])

  // Subscribe to geofence approval events
  const onGeofenceApproval = useCallback((callback) => {
    if (socket) {
      socket.on('geofence-approval', callback)
      return () => socket.off('geofence-approval', callback)
    }
  }, [socket])

  // Subscribe to leave status update events
  const onLeaveStatusUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('leave-status-update', callback)
      return () => socket.off('leave-status-update', callback)
    }
  }, [socket])

  // Subscribe to expense status update events
  const onExpenseStatusUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('expense-status-update', callback)
      return () => socket.off('expense-status-update', callback)
    }
  }, [socket])

  // Subscribe to travel status update events
  const onTravelStatusUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('travel-status-update', callback)
      return () => socket.off('travel-status-update', callback)
    }
  }, [socket])

  // Subscribe to project assignment events
  const onProjectAssignment = useCallback((callback) => {
    if (socket) {
      socket.on('project-assignment', callback)
      return () => socket.off('project-assignment', callback)
    }
  }, [socket])

  // Subscribe to performance review events
  const onPerformanceReview = useCallback((callback) => {
    if (socket) {
      socket.on('performance-review', callback)
      return () => socket.off('performance-review', callback)
    }
  }, [socket])

  // Subscribe to helpdesk ticket events
  const onHelpdeskTicket = useCallback((callback) => {
    if (socket) {
      socket.on('helpdesk-ticket', callback)
      return () => socket.off('helpdesk-ticket', callback)
    }
  }, [socket])

  // Subscribe to document events
  const onDocumentUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('document-update', callback)
      return () => socket.off('document-update', callback)
    }
  }, [socket])

  // Subscribe to asset events
  const onAssetUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('asset-update', callback)
      return () => socket.off('asset-update', callback)
    }
  }, [socket])

  // Subscribe to payroll events
  const onPayrollUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('payroll-update', callback)
      return () => socket.off('payroll-update', callback)
    }
  }, [socket])

  // Subscribe to onboarding events
  const onOnboardingUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('onboarding-update', callback)
      return () => socket.off('onboarding-update', callback)
    }
  }, [socket])

  // Subscribe to offboarding events
  const onOffboardingUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('offboarding-update', callback)
      return () => socket.off('offboarding-update', callback)
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
    onMessageRead,
    onTaskUpdate,
    onAnnouncement,
    onMessageReaction,
    onMessageDeleted,
    onGeofenceApproval,
    onLeaveStatusUpdate,
    onExpenseStatusUpdate,
    onTravelStatusUpdate,
    onProjectAssignment,
    onPerformanceReview,
    onHelpdeskTicket,
    onDocumentUpdate,
    onAssetUpdate,
    onPayrollUpdate,
    onOnboardingUpdate,
    onOffboardingUpdate
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

