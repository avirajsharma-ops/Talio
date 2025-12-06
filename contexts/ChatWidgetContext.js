'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ChatWidgetContext = createContext(null)

export function ChatWidgetProvider({ children }) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const [openChats, setOpenChats] = useState([]) // Array of open chat windows
  const [widgetPosition, setWidgetPosition] = useState({ x: null, y: null })
  const [chatPositions, setChatPositions] = useState({}) // { chatId: { x, y } }
  const [triggerSource, setTriggerSource] = useState('button') // 'button' or 'sidebar'
  const [focusedChatId, setFocusedChatId] = useState(null) // Track which chat is on top
  const zIndexCounter = useRef(10000) // Counter for z-index management

  // Toggle main chat list widget - always reset position to open near source
  const toggleWidget = useCallback((source = 'button') => {
    setTriggerSource(source)
    // Reset widget position so it opens at the default position for this source
    setWidgetPosition({ x: null, y: null })
    setIsWidgetOpen(prev => !prev)
  }, [])

  const openWidget = useCallback((source = 'button') => {
    setTriggerSource(source)
    // Reset widget position so it opens at the default position for this source
    setWidgetPosition({ x: null, y: null })
    setIsWidgetOpen(true)
  }, [])

  const closeWidget = useCallback(() => {
    setIsWidgetOpen(false)
  }, [])

  // Open a specific chat in a new popup window
  const openChat = useCallback((chat) => {
    setOpenChats(prev => {
      // Don't duplicate
      if (prev.some(c => c._id === chat._id)) {
        // If already open, just bring to front
        setFocusedChatId(chat._id)
        zIndexCounter.current += 1
        return prev
      }
      return [...prev, chat]
    })
    // Set this chat as focused
    setFocusedChatId(chat._id)
    zIndexCounter.current += 1
  }, [])

  // Close a specific chat popup and reset positions for auto-alignment
  const closeChat = useCallback((chatId) => {
    setOpenChats(prev => prev.filter(c => c._id !== chatId))
    // Clear ALL positions so remaining chats auto-realign
    setChatPositions({})
    // Clear focused if it was the closed chat
    setFocusedChatId(prev => prev === chatId ? null : prev)
  }, [])

  // Close all chat popups
  const closeAllChats = useCallback(() => {
    setOpenChats([])
    setChatPositions({})
    setFocusedChatId(null)
  }, [])

  // Reset all chat positions to trigger auto-alignment
  const resetChatPositions = useCallback(() => {
    setChatPositions({})
  }, [])

  // Update widget position (for dragging)
  const updateWidgetPosition = useCallback((x, y) => {
    setWidgetPosition({ x, y })
  }, [])

  // Update chat popup position (for dragging)
  const updateChatPosition = useCallback((chatId, x, y) => {
    setChatPositions(prev => ({
      ...prev,
      [chatId]: { x, y }
    }))
  }, [])

  // Bring chat to front (z-index management) - just update focused state, don't reorder
  const bringToFront = useCallback((chatId) => {
    setFocusedChatId(chatId)
    zIndexCounter.current += 1
  }, [])
  
  // Get z-index for a chat
  const getZIndex = useCallback((chatId) => {
    if (chatId === focusedChatId) {
      return zIndexCounter.current
    }
    // Non-focused chats get base z-index
    return 10000
  }, [focusedChatId])

  const value = {
    isWidgetOpen,
    openChats,
    widgetPosition,
    chatPositions,
    triggerSource,
    focusedChatId,
    toggleWidget,
    openWidget,
    closeWidget,
    openChat,
    closeChat,
    closeAllChats,
    updateWidgetPosition,
    updateChatPosition,
    bringToFront,
    resetChatPositions,
    getZIndex
  }

  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
    </ChatWidgetContext.Provider>
  )
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext)
  if (!context) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider')
  }
  return context
}
