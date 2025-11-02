'use client'

import { useState, useEffect, useRef } from 'react'
import { FaSearch, FaUserPlus, FaUsers, FaPaperPlane, FaSmile, FaPaperclip, FaTimes, FaFile, FaImage, FaFilePdf, FaUser, FaComments, FaArrowLeft } from 'react-icons/fa'

export default function ChatPage() {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [employees, setEmployees] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [groupName, setGroupName] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const emojis = ['😀', '😂', '😍', '🥰', '��', '🤔', '👍', '👏', '🙏', '❤️', '🎉', '🔥', '✨', '💯', '👌', '🚀']

  useEffect(() => {
    fetchChats()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id)
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
    <div className="page-container pb-14 md:pb-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Chat</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Connect with your team</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <FaUserPlus /> <span className="hidden sm:inline">New</span>
          </button>
          <button
            onClick={() => setShowGroupModal(true)}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <FaUsers /> <span className="hidden sm:inline">Group</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
          <div className={`border-r border-gray-200 ${selectedChat ? 'hidden md:block' : 'block'}`}>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 73px)' }}>
              {filteredChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <div
                    key={chat._id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat?._id === chat._id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                          <h3 className="font-semibold text-gray-800 truncate text-sm">{getChatName(chat)}</h3>
                          <span className="text-xs text-gray-500">{chat.lastMessageAt ? formatTime(chat.lastMessageAt) : ''}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`md:col-span-2 flex flex-col ${selectedChat ? 'block' : 'hidden md:flex'}`}>
            {selectedChat ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden text-gray-600 hover:text-gray-800"
                  >
                    <FaArrowLeft />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden">
                    {getChatAvatar(selectedChat) ? (
                      <img src={getChatAvatar(selectedChat)} alt="" className="w-full h-full object-cover" />
                    ) : selectedChat.isGroup ? (
                      <FaUsers className="text-white" />
                    ) : (
                      <FaUser className="text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{getChatName(selectedChat)}</h3>
                    <p className="text-xs text-gray-500">{selectedChat.isGroup ? `${selectedChat.participants.length} members` : 'Online'}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100% - 130px)' }}>
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMine = msg.sender._id === currentUserId
                      return (
                        <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md ${isMine ? '' : 'flex items-start gap-2'}`}>
                            {!isMine && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {msg.sender.profilePicture ? (
                                  <img src={msg.sender.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white text-xs font-bold">{msg.sender.firstName?.[0]}</span>
                                )}
                              </div>
                            )}
                            <div>
                              {msg.fileUrl ? (
                                <div className={`px-4 py-3 rounded-lg ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                  {msg.fileType?.startsWith('image/') ? (
                                    <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded mb-2" />
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      {getFileIcon(msg.fileType)}
                                      <div>
                                        <p className="text-sm font-semibold">{msg.fileName}</p>
                                        <p className="text-xs opacity-75">{formatFileSize(msg.fileSize)}</p>
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-xs mt-2 opacity-75">{formatTime(msg.createdAt)}</p>
                                </div>
                              ) : (
                                <div className={`px-4 py-2 rounded-lg ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                  {!isMine && <p className="text-xs font-semibold mb-1">{msg.sender.firstName} {msg.sender.lastName}</p>}
                                  <p className="text-sm">{msg.content}</p>
                                  <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>{formatTime(msg.createdAt)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200">
                  {showEmojiPicker && (
                    <div className="mb-2 p-2 bg-gray-50 rounded-lg flex flex-wrap gap-2">
                      {emojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMessage(message + emoji)}
                          className="text-2xl hover:bg-gray-200 rounded p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="text-gray-500 hover:text-gray-700 p-2"
                    >
                      <FaPaperclip className="text-xl" />
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-gray-500 hover:text-gray-700 p-2"
                    >
                      <FaSmile className="text-xl" />
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                      className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
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
    </div>
  )
}
