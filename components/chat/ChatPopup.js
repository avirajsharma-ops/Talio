'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FaTimes, FaPaperPlane, FaUsers, FaPaperclip, FaFile, FaFilePdf, FaMinus, FaExpand, FaCompress } from 'react-icons/fa'
import { useChatWidget } from '@/contexts/ChatWidgetContext'
import { useSocket } from '@/contexts/SocketContext'
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext'
import { useTheme } from '@/contexts/ThemeContext'
import { playNotificationSound } from '@/utils/audio'

export default function ChatPopup({ chat, index }) {
  const { closeChat, chatPositions, updateChatPosition, bringToFront, triggerSource, widgetPosition, getZIndex, focusedChatId } = useChatWidget()
  const { isConnected, joinChat, leaveChat, onNewMessage, sendTyping, sendStopTyping, onUserTyping, onUserStopTyping } = useSocket()
  const { markChatAsRead, unreadChats } = useUnreadMessages()
  const { theme } = useTheme()

  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [animationState, setAnimationState] = useState('normal') // 'normal', 'minimizing', 'maximizing'
  const [minimizedUnread, setMinimizedUnread] = useState(0) // Track unread while minimized

  const popupRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  const primaryColor = theme?.primary?.[500] || '#3B82F6'
  const primaryDark = theme?.primary?.[600] || '#2563EB'
  
  // Get z-index from context - focused chat gets highest z-index
  const zIndex = getZIndex(chat._id)
  const isFocused = focusedChatId === chat._id
  
  // Get unread count for this chat
  const unreadCount = unreadChats?.[chat._id] || 0

  // Glass morphism styles
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
  }
  
  // Animation keyframes for genie effect
  const genieMinimizeAnimation = `
    @keyframes genieMinimize {
      0% {
        transform: scale(1) translateY(0);
        opacity: 1;
        border-radius: 16px;
      }
      50% {
        transform: scale(0.5, 0.8) translateY(50%);
        opacity: 0.8;
        border-radius: 12px;
      }
      100% {
        transform: scale(0.3, 0.1) translateY(100%);
        opacity: 0;
        border-radius: 8px;
      }
    }
    @keyframes genieMaximize {
      0% {
        transform: scale(0.3, 0.1) translateY(100%);
        opacity: 0;
        border-radius: 8px;
      }
      50% {
        transform: scale(0.5, 0.8) translateY(50%);
        opacity: 0.8;
        border-radius: 12px;
      }
      100% {
        transform: scale(1) translateY(0);
        opacity: 1;
        border-radius: 16px;
      }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
  `

  // Handle minimize with animation
  const handleMinimize = () => {
    setAnimationState('minimizing')
    setMinimizedUnread(unreadCount) // Capture current unread count
    setTimeout(() => {
      setIsMinimized(true)
      setAnimationState('normal')
    }, 300)
  }
  
  // Handle maximize with animation
  const handleMaximize = () => {
    setIsMinimized(false)
    setAnimationState('maximizing')
    bringToFront?.(chat._id)
    markChatAsRead?.(chat._id)
    setMinimizedUnread(0)
    setTimeout(() => {
      setAnimationState('normal')
    }, 300)
  }
  
  // Track unread messages while minimized
  useEffect(() => {
    if (isMinimized && unreadCount > minimizedUnread) {
      setMinimizedUnread(unreadCount)
    }
  }, [isMinimized, unreadCount, minimizedUnread])

  // Get current user
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const parsed = JSON.parse(user)
        setCurrentUserId(parsed._id || parsed.id)
        const empId = parsed.employeeId?._id || parsed.employeeId || parsed.employee?._id || parsed.employee
        setCurrentEmployeeId(empId)
      } catch (e) {}
    }
  }, [])

  // Get chat name
  const getChatName = () => {
    if (chat.isGroup) return chat.name || 'Group Chat'
    const otherParticipant = chat.participants?.find(p => {
      const pId = p._id || p
      return pId !== currentEmployeeId && pId !== currentUserId
    })
    if (otherParticipant) {
      return `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || otherParticipant.email || 'User'
    }
    return 'Chat'
  }

  // Get initials
  const getInitials = () => {
    const name = getChatName()
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  // Join chat room and fetch messages
  useEffect(() => {
    if (chat._id) {
      fetchMessages()
      markChatAsRead?.(chat._id)
      
      if (isConnected) {
        joinChat?.(chat._id)
      }
      
      return () => {
        if (isConnected) {
          leaveChat?.(chat._id)
        }
      }
    }
  }, [chat._id, isConnected])

  // Listen for new messages
  useEffect(() => {
    if (!chat._id || !onNewMessage) return

    const unsubscribe = onNewMessage((data) => {
      const { chatId, message: newMessage } = data
      if (chatId === chat._id && newMessage) {
        setMessages(prev => {
          if (prev.some(msg => msg._id === newMessage._id)) return prev
          const senderId = newMessage.sender?._id || newMessage.sender
          if (senderId !== currentEmployeeId && senderId !== currentUserId) {
            playNotificationSound?.()
          }
          return [...prev, newMessage]
        })
        markChatAsRead?.(chat._id)
      }
    })

    return unsubscribe
  }, [chat._id, currentUserId, currentEmployeeId, onNewMessage, markChatAsRead])

  // Listen for typing
  useEffect(() => {
    if (!chat._id) return

    const unsubTyping = onUserTyping?.((data) => {
      if (data.chatId === chat._id && data.userId !== currentUserId && data.userId !== currentEmployeeId) {
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.userName }))
      }
    })

    const unsubStopTyping = onUserStopTyping?.((data) => {
      if (data.chatId === chat._id) {
        setTypingUsers(prev => {
          const newTyping = { ...prev }
          delete newTyping[data.userId]
          return newTyping
        })
      }
    })

    return () => {
      unsubTyping?.()
      unsubStopTyping?.()
    }
  }, [chat._id, currentUserId, currentEmployeeId])

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch(`/api/chat/${chat._id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setMessages(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || sending) return

    const messageContent = message.trim()
    setMessage('')
    setSending(true)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chat/${chat._id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: messageContent })
      })
      
      const data = await response.json()
      if (!response.ok) {
        console.error('Send message error:', data)
        setMessage(messageContent) // Restore message on error
      }
      
      sendStopTyping?.(chat._id)
    } catch (error) {
      console.error('Error sending message:', error)
      setMessage(messageContent) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (e) => {
    setMessage(e.target.value)
    
    sendTyping?.(chat._id)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping?.(chat._id)
    }, 2000)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // File upload - first upload to server, then send message with file info
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const token = localStorage.getItem('token')
      
      // Step 1: Upload the file
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      })
      
      const uploadData = await uploadResponse.json()
      
      if (!uploadResponse.ok || !uploadData.success) {
        console.error('File upload error:', uploadData)
        return
      }
      
      // Step 2: Send message with file info
      const { fileUrl, fileName, fileType, fileSize } = uploadData.data
      
      const messageResponse = await fetch(`/api/chat/${chat._id}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: '',
          fileUrl,
          fileName,
          fileType,
          fileSize
        })
      })
      
      const messageData = await messageResponse.json()
      if (!messageResponse.ok) {
        console.error('Message send error:', messageData)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.popup-content')) return
    isDragging.current = true
    bringToFront?.(chat._id)
    const rect = popupRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    const x = e.clientX - dragOffset.current.x
    const y = e.clientY - dragOffset.current.y
    updateChatPosition?.(chat._id, x, y)
  }, [chat._id, updateChatPosition])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  // Calculate position - place chat windows side by side near the widget
  const getDefaultPosition = () => {
    if (typeof window === 'undefined') return { x: 640, y: 100 }
    
    const chatWidth = isExpanded ? 480 : 360
    const chatHeight = isExpanded ? 580 : 450
    const gap = 16 // Equal gap between chat windows
    const screenPadding = 20 // Padding from screen edges
    const bottomOffset = 24 // Distance from bottom
    const widgetWidth = 340
    const widgetHeight = 480
    
    // Get widget's actual position
    let widgetX, widgetY
    
    if (widgetPosition.x !== null && widgetPosition.y !== null) {
      // Widget was manually dragged - position chats near it
      widgetX = widgetPosition.x
      widgetY = widgetPosition.y
    } else if (triggerSource === 'sidebar') {
      // Widget is near sidebar (left: 280px)
      widgetX = 280
      widgetY = window.innerHeight - widgetHeight - bottomOffset
    } else {
      // Widget is near floating button (bottom right)
      widgetX = window.innerWidth - 88 - widgetWidth
      widgetY = window.innerHeight - widgetHeight - 88
    }
    
    // Position chat popups to the RIGHT of the widget, side by side
    const startX = widgetX + widgetWidth + gap
    
    // Simple side-by-side calculation: each chat gets its slot based on index
    const x = startX + (index * (chatWidth + gap))
    
    // All chats at the same Y level (aligned with widget bottom)
    const y = window.innerHeight - chatHeight - bottomOffset
    
    // Check if this position would go off screen
    let finalX = x
    let finalY = y
    
    // If chat goes off right edge, wrap to position LEFT of widget
    if (finalX + chatWidth > window.innerWidth - screenPadding) {
      // Calculate how many fit on the right side
      const chatsOnRight = Math.floor((window.innerWidth - startX - screenPadding) / (chatWidth + gap))
      const leftIndex = index - chatsOnRight
      
      if (leftIndex >= 0) {
        // Position to the left of widget
        finalX = widgetX - gap - chatWidth - (leftIndex * (chatWidth + gap))
      }
    }
    
    // Ensure within screen bounds
    finalX = Math.max(screenPadding, Math.min(finalX, window.innerWidth - chatWidth - screenPadding))
    finalY = Math.max(screenPadding, Math.min(finalY, window.innerHeight - chatHeight - screenPadding))
    
    return { x: finalX, y: finalY }
  }

  const position = chatPositions?.[chat._id] || getDefaultPosition()

  // Typing indicator
  const typingText = Object.values(typingUsers).length > 0
    ? `${Object.values(typingUsers).join(', ')} typing...`
    : null

  // Check if message is from current user
  const isMyMessage = (msg) => {
    const senderId = msg.sender?._id || msg.sender
    return senderId === currentEmployeeId || senderId === currentUserId
  }

  // Render file message
  const renderFileMessage = (msg) => {
    if (msg.fileType?.startsWith('image/')) {
      return (
        <img 
          src={msg.fileUrl} 
          alt={msg.fileName}
          className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90"
        />
      )
    }
    
    const isPdf = msg.fileType === 'application/pdf'
    return (
      <a 
        href={msg.fileUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
      >
        {isPdf ? <FaFilePdf className="w-5 h-5" /> : <FaFile className="w-5 h-5" />}
        <span className="text-sm truncate max-w-[150px]">{msg.fileName}</span>
      </a>
    )
  }

  // Minimized state with notification bubble
  if (isMinimized) {
    return (
      <>
        <style>{genieMinimizeAnimation}</style>
        <div
          className="fixed rounded-xl cursor-pointer overflow-visible"
          style={{ 
            bottom: '12px', 
            right: `${24 + (index * 200)}px`,
            width: '180px',
            zIndex,
            animation: 'slideIn 0.3s ease-out',
            transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease',
            ...glassStyle,
            background: 'rgba(255, 255, 255, 0.9)',
          }}
          onClick={handleMaximize}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
        >
          {/* Notification Badge */}
          {minimizedUnread > 0 && (
            <div 
              className="absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-xs font-bold px-1.5 shadow-lg"
              style={{ 
                backgroundColor: '#EF4444',
                animation: 'pulse 2s infinite, bounce 0.5s ease-out',
                zIndex: zIndex + 1
              }}
            >
              {minimizedUnread > 99 ? '99+' : minimizedUnread}
            </div>
          )}
          
          <div 
            className="px-3 py-2.5 flex items-center justify-between rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0">
                {chat.isGroup ? <FaUsers className="w-3.5 h-3.5" /> : getInitials()}
              </div>
              <span className="text-white text-sm font-medium truncate">{getChatName()}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeChat?.(chat._id)
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0 hover:scale-110"
              style={{ backgroundColor: 'white' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-3 h-3" fill={primaryDark}>
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
              </svg>
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{genieMinimizeAnimation}</style>
      <div
        ref={popupRef}
        className="fixed rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: isExpanded ? '480px' : '360px',
          height: isExpanded ? '580px' : '450px',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex,
          ...glassStyle,
          transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s ease, height 0.3s ease, box-shadow 0.2s ease',
          animation: animationState === 'minimizing' 
            ? 'genieMinimize 0.3s ease-in forwards' 
            : animationState === 'maximizing' 
              ? 'genieMaximize 0.3s ease-out forwards'
              : 'slideIn 0.4s ease-out',
          boxShadow: isFocused 
            ? `0 20px 50px rgba(0, 0, 0, 0.2), 0 0 0 2px ${primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.5)`
            : '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        }}
        onClick={() => bringToFront?.(chat._id)}
      >
        {/* Header */}
        <div 
          className="px-3 py-2.5 flex items-center justify-between cursor-move select-none"
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryDark}ee)`,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 text-white min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium flex-shrink-0 shadow-sm">
              {chat.isGroup ? <FaUsers className="w-4 h-4" /> : getInitials()}
            </div>
            <div className="min-w-0">
              <span className="font-medium text-sm truncate block">{getChatName()}</span>
              <span className="text-[10px] text-white/70">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: 'white' }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-3.5 h-3.5" fill={primaryDark}>
                  <path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H96v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V384h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-3.5 h-3.5" fill={primaryDark}>
                  <path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"/>
                </svg>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleMinimize()
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: 'white' }}
              title="Minimize"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-3.5 h-3.5" fill={primaryDark}>
                <path d="M432 256c0 17.7-14.3 32-32 32H48c-17.7 0-32-14.3-32-32s14.3-32 32-32H400c17.7 0 32 14.3 32 32z"/>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeChat?.(chat._id)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: 'white' }}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-3.5 h-3.5" fill={primaryDark}>
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="popup-content flex-1 overflow-y-auto p-3 space-y-3"
          style={{ background: 'rgba(248, 250, 252, 0.5)' }}
        >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div>
              <div 
                className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
              ></div>
              <p className="text-gray-500 text-xs mt-2">Loading messages...</p>
            </div>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, idx) => {
            const isMine = isMyMessage(msg)
            return (
              <div key={msg._id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                    isMine 
                      ? 'text-white rounded-br-md shadow-sm' 
                      : 'text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                  style={isMine ? { 
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`,
                  } : {
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {!isMine && chat.isGroup && (
                    <p className="text-xs font-semibold mb-1" style={{ color: primaryColor }}>
                      {msg.sender?.firstName || 'User'}
                    </p>
                  )}
                  {msg.fileUrl ? renderFileMessage(msg) : (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-1.5 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <FaUsers className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">Say hi to start the conversation! 👋</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingText && (
        <div className="px-3 py-1.5" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
          <p className="text-xs text-gray-500 italic flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
            {typingText}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="popup-content p-3" style={{ background: 'rgba(255, 255, 255, 0.7)' }}>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl transition-colors"
            style={{ background: 'rgba(0, 0, 0, 0.05)' }}
            title="Attach file"
          >
            <FaPaperclip className="w-4 h-4 text-gray-500" />
          </button>
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ 
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="p-2.5 rounded-xl text-white transition-all disabled:opacity-50 hover:opacity-90 shadow-sm"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`,
            }}
            title="Send message"
          >
            <FaPaperPlane className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
