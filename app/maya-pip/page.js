'use client'

import { useState, useEffect, useRef } from 'react'
import { FaPaperPlane, FaTimes, FaMinus, FaRobot } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

export default function MayaPIPPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load initial greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm Maya, your AI assistant. How can I help you today?"
    }])
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/maya/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Connection error. Please check your network.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isMinimized) {
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 cursor-pointer"
        onClick={() => setIsMinimized(false)}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <FaRobot className="text-white text-4xl" />
      </div>
    )
  }

  const handleClose = () => {
    // Close Maya PIP and show blob
    if (window.talioDesktop?.minimizeMayaToBlob) {
      window.talioDesktop.minimizeMayaToBlob()
    } else if (window.talioDesktop?.toggleMayaPIP) {
      window.talioDesktop.toggleMayaPIP(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
      {/* Header - draggable area - fixed height */}
      <div
        className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-700 p-3 flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <FaRobot className="text-white text-sm" />
          </div>
          <span className="text-white font-semibold text-sm">Maya Assistant</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="Minimize"
          >
            <FaMinus className="text-white text-xs" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="Close to blob"
          >
            <FaTimes className="text-white text-xs" />
          </button>
        </div>
      </div>

      {/* Messages - scrollable area with proper padding */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-50">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-2.5 rounded-xl text-sm ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-2.5 rounded-xl shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0 p-2 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Maya..."
            className="flex-1 px-3 py-2 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaPaperPlane className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  )
}

