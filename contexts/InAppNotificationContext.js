'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import InAppNotification from '@/components/InAppNotification'
import { useSocket } from './SocketContext'
import { playNotificationSound } from '@/utils/audio'

const InAppNotificationContext = createContext({
  showNotification: () => {}
})

export function InAppNotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const { onNewMessage, onTaskUpdate, onAnnouncement, onGeofenceApproval } = useSocket()
  const pathname = usePathname()

  const showNotification = useCallback((notification) => {
    const id = Date.now() + Math.random()
    const newNotification = { ...notification, id }

    setNotifications(prev => [...prev, newNotification])

    // Play notification sound
    playNotificationSound()
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Listen for new messages via Socket.IO
  useEffect(() => {
    if (!onNewMessage) {
      console.log('[InAppNotification] onNewMessage not available yet')
      return
    }

    console.log('[InAppNotification] Setting up message listener')

    const unsubscribe = onNewMessage((data) => {
      console.log('[InAppNotification] Raw message data received:', data)

      const { chatId, message, senderId } = data

      if (!message) {
        console.warn('[InAppNotification] No message in data')
        return
      }

      // Get current user ID
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        console.warn('[InAppNotification] No user in localStorage')
        return
      }

      const user = JSON.parse(userStr)
      const currentUserId = user.employeeId || user._id

      // Normalize IDs to strings for comparison
      const currentUserIdStr = typeof currentUserId === 'object' ? currentUserId._id || currentUserId.toString() : currentUserId.toString()
      const messageSenderId = senderId || message?.sender?._id || message?.sender
      const messageSenderIdStr = typeof messageSenderId === 'object' ? messageSenderId._id || messageSenderId.toString() : messageSenderId?.toString()

      // Only show notification if:
      // 1. Message is NOT from current user
      // 2. User is NOT on the chat page OR not viewing this specific chat
      const isOnChatPage = pathname?.startsWith('/dashboard/chat')
      const isFromCurrentUser = messageSenderIdStr === currentUserIdStr
      const shouldShowNotification = !isFromCurrentUser && !isOnChatPage

      console.log('[InAppNotification] Message received:', {
        chatId,
        currentUserId: currentUserIdStr,
        messageSenderId: messageSenderIdStr,
        isFromCurrentUser,
        isOnChatPage,
        shouldShowNotification,
        pathname
      })

      if (shouldShowNotification) {
        const senderName = message.sender?.firstName
          ? `${message.sender.firstName} ${message.sender.lastName || ''}`
          : 'Someone'

        const notificationData = {
          title: `New message from ${senderName}`,
          message: message.content || message.text || message.fileName || 'Sent a file',
          url: `/dashboard/chat?chatId=${chatId}`,
          type: 'message'
        }

        console.log('[InAppNotification] Showing notification:', notificationData)
        showNotification(notificationData)
      } else {
        console.log('[InAppNotification] Not showing notification - conditions not met')
      }
    })

    return unsubscribe
  }, [onNewMessage, pathname, showNotification])

  // Listen for task updates via Socket.IO
  useEffect(() => {
    if (!onTaskUpdate) return

    const unsubscribe = onTaskUpdate((data) => {
      const { task, action } = data

      // Get current user ID
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const user = JSON.parse(userStr)
      const currentUserId = user.employeeId || user._id

      // Only show notification if task update is relevant to current user
      const isAssignedToMe = task?.assignedTo?._id === currentUserId || task?.assignedTo === currentUserId
      const isCreatedByMe = task?.createdBy?._id === currentUserId || task?.createdBy === currentUserId

      if (isAssignedToMe || isCreatedByMe) {
        let title = 'Task Update'
        let message = task?.title || 'A task has been updated'

        if (action === 'assigned') {
          title = 'New Task Assigned'
          message = `You have been assigned: ${task?.title}`
        } else if (action === 'completed') {
          title = 'Task Completed'
          message = `Task completed: ${task?.title}`
        } else if (action === 'status_update') {
          title = 'Task Status Updated'
          message = `${task?.title} - Status: ${task?.status}`
        }

        showNotification({
          title,
          message,
          url: `/dashboard/tasks/my-tasks`,
          type: action === 'assigned' ? 'task_assigned' : 'task_status_update'
        })
      }
    })

    return unsubscribe
  }, [onTaskUpdate, showNotification])

  // Listen for announcements via Socket.IO
  useEffect(() => {
    if (!onAnnouncement) return

    const unsubscribe = onAnnouncement((data) => {
      const { announcement } = data

      showNotification({
        title: 'New Announcement',
        message: announcement?.title || 'A new announcement has been posted',
        url: `/dashboard/announcements`,
        type: 'announcement'
      })
    })

    return unsubscribe
  }, [onAnnouncement, showNotification])

  // Listen for geofence approval/rejection events via Socket.IO
  useEffect(() => {
    if (!onGeofenceApproval) return

    const unsubscribe = onGeofenceApproval((data) => {
      const { action, log, notification } = data

      const isApproved = action === 'approved'
      const icon = isApproved ? '✅' : '❌'

      showNotification({
        title: `${icon} ${notification.title}`,
        message: notification.body,
        url: notification.url || '/dashboard/geofence',
        type: 'geofence_approval'
      })
    })

    return unsubscribe
  }, [onGeofenceApproval, showNotification])

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Render notifications */}
      <div className="fixed top-20 md:top-4 right-0 left-0 md:left-auto md:right-4 z-[9999] pointer-events-none">
        <div className="flex flex-col gap-3 p-4 md:p-0 pointer-events-auto max-w-sm mx-auto md:mx-0">
          {notifications.map((notification) => (
            <InAppNotification
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      </div>
    </InAppNotificationContext.Provider>
  )
}

export function useInAppNotification() {
  const context = useContext(InAppNotificationContext)
  if (!context) {
    throw new Error('useInAppNotification must be used within InAppNotificationProvider')
  }
  return context
}

