'use client'

import { useChatWidget } from '@/contexts/ChatWidgetContext'
import FloatingChatWidget from './FloatingChatWidget'
import ChatPopup from './ChatPopup'

export default function ChatWidgetContainer() {
  const { openChats } = useChatWidget()

  return (
    <>
      {/* Floating button and chat list */}
      <FloatingChatWidget />
      
      {/* Individual chat popups */}
      {openChats.map((chat, index) => (
        <ChatPopup key={chat._id} chat={chat} index={index} />
      ))}
    </>
  )
}
