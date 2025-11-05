'use client'

import { useState, useEffect, useRef } from 'react'
import { FaUserPlus, FaUsers, FaTimes, FaFile, FaImage, FaFilePdf, FaUser, FaComments, FaArrowLeft } from 'react-icons/fa'

export default function ChatPage() {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [chatSearchQuery] = useState('')
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [employees, setEmployees] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [groupName, setGroupName] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchChats()
    fetchEmployees()

    // Poll for new chats every 5 seconds
    const chatInterval = setInterval(() => {
      fetchChats()
    }, 5000)

    return () => clearInterval(chatInterval)
  }, [])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id)

      // Poll for new messages every 3 seconds when chat is selected
      const messageInterval = setInterval(() => {
        fetchMessages(selectedChat._id)
      }, 3000)

      return () => clearInterval(messageInterval)
    }
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      console.log('Chats API response:', result)
      if (result.success) {
        setChats(result.data)
        setCurrentUserId(result.currentUserId)
        console.log('Chats loaded:', result.data.length)
      } else {
        console.error('Failed to load chats:', result.message)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      console.log('Employees API response:', result)
      if (result.success) {
        setEmployees(result.data)
        console.log('Employees loaded:', result.data.length)
      } else {
        console.error('Failed to load employees:', result.message)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchMessages = async (chatId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) setMessages(result.data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat || sending) return
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chat/${selectedChat._id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message })
      })
      const result = await response.json()
      if (result.success) {
        setMessages([...messages, result.data])
        setMessage('')
        setShowEmojiPicker(false)
        fetchChats()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedChat) return
    setUploadingFile(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      const uploadResult = await uploadResponse.json()
      
      if (uploadResult.success) {
        const response = await fetch(`/api/chat/${selectedChat._id}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Sent a file: ${uploadResult.data.fileName}`,
            fileUrl: uploadResult.data.fileUrl,
            fileName: uploadResult.data.fileName,
            fileType: uploadResult.data.fileType,
            fileSize: uploadResult.data.fileSize
          })
        })
        const result = await response.json()
        if (result.success) {
          setMessages([...messages, result.data])
          fetchChats()
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleCreateChat = async (employeeId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGroup: false, participants: [employeeId] })
      })
      const result = await response.json()
      if (result.success) {
        fetchChats()
        setSelectedChat(result.data)
        setShowNewChatModal(false)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedEmployees.length === 0) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGroup: true, participants: selectedEmployees, name: groupName })
      })
      const result = await response.json()
      if (result.success) {
        fetchChats()
        setSelectedChat(result.data)
        setShowGroupModal(false)
        setGroupName('')
        setSelectedEmployees([])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.name
    const other = chat.participants.find(p => p._id !== currentUserId)
    return other ? `${other.firstName} ${other.lastName}` : 'Unknown'
  }

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return null
    const other = chat.participants.find(p => p._id !== currentUserId)
    return other?.profilePicture
  }

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <FaImage className="text-blue-500 text-2xl" />
    if (fileType === 'application/pdf') return <FaFilePdf className="text-red-500 text-2xl" />
    return <FaFile className="text-gray-500 text-2xl" />
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatTime = (date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatMessageTime = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)

    // If today, show time
    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    // If yesterday
    if (diffDays === 1) {
      return 'Yesterday ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    // If within a week, show day name
    if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    // Otherwise show date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getDateSeparator = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const filteredChats = chats.filter(chat =>
    getChatName(chat).toLowerCase().includes(chatSearchQuery.toLowerCase())
  )

  const filteredEmployees = employeeSearchQuery.trim()
    ? employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(employeeSearchQuery.toLowerCase())
      )
    : employees.slice(0, 10) // Show first 10 employees by default

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      {/* Hide header when chat is selected on mobile */}
      {!selectedChat && (
        <div className="fixed top-[72px] left-0 right-0 z-[45] bg-white md:relative md:top-auto md:left-auto md:right-auto md:z-auto md:px-0 md:pt-0 md:pb-0 md:mb-4 flex items-center justify-between md:bg-transparent md:page-container shadow-sm md:shadow-none">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">Chat</h1>
            <p className="text-xs md:text-sm lg:text-base text-gray-600 mt-1">Connect with your team</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewChatModal(true)}
              className="bg-[#6B7FFF] text-white w-14 h-14 rounded-full hover:bg-[#5A6EEE] transition-colors flex items-center justify-center shadow-md"
              title="New Chat"
            >
              <FaUserPlus className="text-base" />
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className="bg-[#00D9A5] text-white w-14 h-14 rounded-full hover:bg-[#00C794] transition-colors flex items-center justify-center shadow-md"
              title="New Group"
            >
              <FaUsers className="text-base" />
            </button>
          </div>
        </div>
      )}

      {/* Chat Container - Full screen edge-to-edge when chat selected */}
      <div className={`overflow-hidden ${
        selectedChat
          ? 'fixed top-[60px] left-0 right-0 bottom-[70px] z-[60] bg-white md:relative md:top-auto md:left-auto md:right-auto md:bottom-auto md:rounded-2xl md:shadow-md'
          : '-m-2 mt-[3em] p-0 md:mt-0 md:mx-0 md:rounded-2xl md:shadow-md bg-white'
      }`} style={{
        height: selectedChat ? 'calc(100vh - 130px)' : 'calc(100vh - 232px)',
        maxHeight: selectedChat ? 'calc(100vh - 130px)' : 'calc(100vh - 160px)'
      }}>
        <div className="grid grid-cols-1 md:grid-cols-3 h-full -ml-4 -mr-4 md:ml-0 md:mr-0">
          {/* Chat List - Hide on mobile when chat is selected */}
          <div className={`border-r border-gray-100 flex flex-col h-full bg-white ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Chat list header - no search, clean design */}
            <div className="flex-shrink-0 px-4 py-4 md:px-6 md:py-5 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Chats</h2>
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                <>
                  {filteredChats.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => setSelectedChat(chat)}
                      className={`px-4 md:px-6 py-3.5 md:py-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                        selectedChat?._id === chat._id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-[#6B7FFF] to-[#5A6EEE] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {getChatAvatar(chat) ? (
                            <img src={getChatAvatar(chat)} alt="" className="w-full h-full object-cover" />
                          ) : chat.isGroup ? (
                            <FaUsers className="text-white text-lg" />
                          ) : (
                            <FaUser className="text-white text-lg" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate text-[15px]">{getChatName(chat)}</h3>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{chat.lastMessageAt ? formatTime(chat.lastMessageAt) : ''}</span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Chat Messages - Full screen on mobile */}
          <div className={`md:col-span-2 flex flex-col h-full overflow-hidden ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
            {selectedChat ? (
              <>
                {/* Chat Header - Clean minimal design */}
                <div className="px-4 py-4 md:px-6 md:py-5 bg-white flex items-center gap-3 flex-shrink-0 border-b border-gray-100">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="text-gray-600 hover:text-gray-900 -ml-1 md:hidden"
                    title="Back to chats"
                  >
                    <FaArrowLeft className="text-xl" />
                  </button>
                  <div className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[#6B7FFF] to-[#5A6EEE] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getChatAvatar(selectedChat) ? (
                      <img src={getChatAvatar(selectedChat)} alt="" className="w-full h-full object-cover" />
                    ) : selectedChat.isGroup ? (
                      <FaUsers className="text-white text-base" />
                    ) : (
                      <FaUser className="text-white text-lg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg md:text-base truncate">{getChatName(selectedChat)}</h3>
                  </div>
                </div>

                {/* Messages Area - Clean white background with scroll */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 md:pb-6 md:px-6 md:py-6 space-y-4 bg-white md:bg-gray-50 min-h-0">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <FaComments className="text-5xl mb-3 opacity-30" />
                      <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMine = msg.sender._id === currentUserId
                      const showDateSeparator = idx === 0 || getDateSeparator(messages[idx - 1].createdAt) !== getDateSeparator(msg.createdAt)

                      return (
                        <div key={idx}>
                          {/* Date separator */}
                          {showDateSeparator && (
                            <div className="flex justify-center mb-4 mt-2">
                              <span className="text-xs text-gray-400 bg-gray-100 md:bg-white px-3 py-1 rounded-full">
                                {getDateSeparator(msg.createdAt)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`max-w-[80%] sm:max-w-sm ${isMine ? '' : 'flex items-start gap-2.5'}`}>
                              {!isMine && (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6B7FFF] to-[#5A6EEE] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {msg.sender.profilePicture ? (
                                    <img src={msg.sender.profilePicture} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <FaUser className="text-white text-sm" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1">
                                {msg.fileUrl ? (
                                  <div className={`px-4 py-3 rounded-2xl ${isMine ? 'bg-gradient-to-r from-[#6B7FFF] to-[#5A6EEE] text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                                    {msg.fileType?.startsWith('image/') ? (
                                      <img
                                        src={msg.fileUrl}
                                        alt={msg.fileName}
                                        className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setLightboxImage(msg.fileUrl)}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-3">
                                        {getFileIcon(msg.fileType)}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold truncate">{msg.fileName}</p>
                                          <p className="text-xs opacity-75">{formatFileSize(msg.fileSize)}</p>
                                        </div>
                                      </div>
                                    )}
                                    {msg.content && <p className="text-[15px] leading-relaxed mb-1">{msg.content}</p>}
                                    <p className="text-xs mt-1 opacity-75">{formatMessageTime(msg.createdAt)}</p>
                                  </div>
                                ) : (
                                  <div className={`px-4 py-3 rounded-2xl ${isMine ? 'bg-gradient-to-r from-[#6B7FFF] to-[#5A6EEE] text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                                    {!isMine && selectedChat.isGroup && <p className="text-xs font-semibold mb-1 opacity-90">{msg.sender.firstName} {msg.sender.lastName}</p>}
                                    <p className="text-[15px] leading-relaxed mb-1">{msg.content}</p>
                                    <p className="text-xs opacity-75">{formatMessageTime(msg.createdAt)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Minimal clean design */}
                <div className="fixed bottom-[72px] left-0 right-0 px-4 py-4 bg-white z-[100] border-t border-gray-100 md:relative md:bottom-auto md:left-auto md:right-auto md:px-6 md:py-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 flex-shrink-0 ml-1"
                      title="Attach file"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Ok, see U in a bar after work"
                      className="flex-1 px-4 py-2.5 md:py-2 border-0 rounded-lg focus:outline-none text-[15px] bg-gray-50 text-gray-900 placeholder-gray-400"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                      className="text-gray-400 hover:text-[#6B7FFF] transition-colors disabled:opacity-30 flex-shrink-0 mr-1"
                      title="Send message"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
                <div className="text-center">
                  <FaComments className="text-6xl mx-auto mb-4 opacity-30" />
                  <p className="text-base text-gray-400">Select a chat to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">New Chat</h2>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
              {filteredEmployees.length === 0 ? (
                <div className="text-center text-gray-500 py-8 text-sm">
                  {employeeSearchQuery ? 'No employees found' : 'No employees available'}
                </div>
              ) : (
                <>
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp._id}
                      onClick={() => handleCreateChat(emp._id)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden">
                        {emp.profilePicture ? (
                          <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{emp.firstName[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-gray-500">{emp.designation?.title || 'Employee'}</p>
                      </div>
                    </div>
                  ))}
                  {!employeeSearchQuery && employees.length > 10 && (
                    <div className="text-center text-xs text-gray-500 py-2 border-t">
                      Showing 10 of {employees.length} employees. Use search to find more.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">New Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3"
              />
              <input
                type="text"
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto scrollbar-hide">
              {filteredEmployees.length === 0 ? (
                <div className="text-center text-gray-500 py-8 text-sm">
                  {employeeSearchQuery ? 'No employees found' : 'No employees available'}
                </div>
              ) : (
                <>
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp._id}
                      onClick={() => {
                        if (selectedEmployees.includes(emp._id)) {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== emp._id))
                        } else {
                          setSelectedEmployees([...selectedEmployees, emp._id])
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                        selectedEmployees.includes(emp._id) ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden">
                        {emp.profilePicture ? (
                          <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{emp.firstName[0]}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-gray-500">{emp.designation?.title || 'Employee'}</p>
                      </div>
                      {selectedEmployees.includes(emp._id) && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <FaTimes className="text-white text-xs" />
                        </div>
                      )}
                    </div>
                  ))}
                  {!employeeSearchQuery && employees.length > 10 && (
                    <div className="text-center text-xs text-gray-500 py-2 border-t">
                      Showing 10 of {employees.length} employees. Use search to find more.
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedEmployees.length === 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 text-sm font-semibold"
            >
              Create Group ({selectedEmployees.length} members)
            </button>
          </div>
        </div>
      )}

      {/* Lightbox for images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[200] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-[201]"
            title="Close"
          >
            <FaTimes className="text-3xl" />
          </button>
          <div className="relative max-w-7xl max-h-full">
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
