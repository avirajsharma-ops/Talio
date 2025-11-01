'use client'

import { useState } from 'react'
import { FaComments, FaSearch, FaUser, FaPaperPlane } from 'react-icons/fa'

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null)
  const [message, setMessage] = useState('')

  const dummyChats = [
    {
      id: 1,
      name: 'Team Alpha',
      lastMessage: 'Great work on the project!',
      time: '10:30 AM',
      unread: 3,
      type: 'group'
    },
    {
      id: 2,
      name: 'John Doe',
      lastMessage: 'Can we schedule a meeting?',
      time: '9:15 AM',
      unread: 1,
      type: 'direct'
    },
    {
      id: 3,
      name: 'HR Department',
      lastMessage: 'Leave application approved',
      time: 'Yesterday',
      unread: 0,
      type: 'group'
    },
    {
      id: 4,
      name: 'Sarah Smith',
      lastMessage: 'Thanks for the update',
      time: 'Yesterday',
      unread: 0,
      type: 'direct'
    }
  ]

  const dummyMessages = [
    {
      id: 1,
      sender: 'John Doe',
      message: 'Hey, how are you?',
      time: '9:00 AM',
      isSelf: false
    },
    {
      id: 2,
      sender: 'You',
      message: 'I am good, thanks! How about you?',
      time: '9:05 AM',
      isSelf: true
    },
    {
      id: 3,
      sender: 'John Doe',
      message: 'Can we schedule a meeting?',
      time: '9:15 AM',
      isSelf: false
    }
  ]

  return (
    <div className="page-container pb-14 md:pb-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Chat</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Connect with your team</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
          {/* Chat List */}
          <div className={`border-r border-gray-200 ${selectedChat ? 'hidden md:block' : 'block'}`}>
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 73px)' }}>
              {dummyChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <FaUser className="text-white text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800 truncate">{chat.name}</h3>
                        <span className="text-xs text-gray-500">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`md:col-span-2 flex flex-col ${selectedChat ? 'block' : 'hidden md:flex'}`}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden text-gray-600 hover:text-gray-800"
                  >
                    ←
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <FaUser className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{selectedChat.name}</h3>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 130px)' }}>
                  {dummyMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.isSelf
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {!msg.isSelf && (
                          <p className="text-xs font-semibold mb-1">{msg.sender}</p>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.isSelf ? 'text-blue-100' : 'text-gray-500'}`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors">
                      <FaPaperPlane />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FaComments className="text-6xl mx-auto mb-4" />
                  <p className="text-lg">Select a chat to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

