'use client'

import { useChatWidget } from '@/contexts/ChatWidgetContext'
import FloatingChatWidget from './FloatingChatWidget'
import ChatPopup from './ChatPopup'

export default function ChatWidgetContainer() {
  const { openChats, isAutoMinimized } = useChatWidget()

  // Calculate visible (non-minimized) index for each chat
  const getVisibleIndex = (chatId) => {
    let visibleIndex = 0
    for (const chat of openChats) {
      if (chat._id === chatId) break
      if (!isAutoMinimized(chat._id)) {
        visibleIndex++
      }
    }
    return visibleIndex
  }

  return (
    <>
      {/* Floating button and chat list */}
      <FloatingChatWidget />
      
      {/* Individual chat popups */}
      {openChats.map((chat, actualIndex) => {
        const visibleIndex = isAutoMinimized(chat._id) ? actualIndex : getVisibleIndex(chat._id)
        return <ChatPopup key={chat._id} chat={chat} index={visibleIndex} />
      })}
    </>
  )
}
