'use client'

import { useState, useEffect } from 'react'
import { FaComments, FaUser, FaBuilding, FaClock, FaEye, FaSearch, FaFilter } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function EmployeeChatsPage() {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    // Get user role
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
      
      // Check if user has permission
      if (!['admin', 'god_admin', 'department_head'].includes(user.role)) {
        toast.error('Access denied: Only admins and department heads can view employee chats')
        window.location.href = '/dashboard'
        return
      }
    }
    
    fetchEmployeeChats()
  }, [page])

  const fetchEmployeeChats = async (employeeId = null) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (employeeId) {
        params.append('employeeId', employeeId)
      }
      
      const response = await fetch(`/api/maya/employee-chats?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setChats(data.chats || [])
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
        }
      } else {
        toast.error(data.message || 'Failed to load employee chats')
      }
    } catch (error) {
      console.error('Error fetching employee chats:', error)
      toast.error('Failed to load employee chats')
    } finally {
      setLoading(false)
    }
  }

  const viewChatDetails = async (sessionId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/maya/employee-chats?sessionId=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success && data.chats.length > 0) {
        setSelectedChat(data.chats[0])
      } else {
        toast.error('Failed to load chat details')
      }
    } catch (error) {
      console.error('Error fetching chat details:', error)
      toast.error('Failed to load chat details')
    }
  }

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      chat.employeeId?.firstName?.toLowerCase().includes(searchLower) ||
      chat.employeeId?.lastName?.toLowerCase().includes(searchLower) ||
      chat.employeeId?.email?.toLowerCase().includes(searchLower) ||
      chat.employeeId?.employeeCode?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMessagePreview = (messages) => {
    if (!messages || messages.length === 0) return 'No messages'
    const lastMsg = messages[messages.length - 1]
    return lastMsg.content.substring(0, 80) + (lastMsg.content.length > 80 ? '...' : '')
  }

  if (loading && chats.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FaComments className="text-purple-600" />
                Employee MAYA Chats
              </h1>
              <p className="text-gray-600 mt-2">
                View and monitor MAYA chat conversations of employees
                {userRole === 'department_head' && ' in your department'}
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Chat List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                <h2 className="text-white font-semibold">
                  Conversations ({filteredChats.length})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FaComments className="mx-auto text-4xl mb-3 opacity-20" />
                    <p>No chat conversations found</p>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => viewChatDetails(chat.sessionId)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-purple-50 ${
                        selectedChat?.sessionId === chat.sessionId ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {chat.employeeId?.firstName?.charAt(0) || 'E'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {chat.employeeId?.firstName} {chat.employeeId?.lastName}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {chat.employeeId?.email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <FaBuilding className="inline" />
                            {chat.employeeId?.department?.name || 'Unknown'}
                          </p>
                          {chat.recentMessages && (
                            <p className="text-xs text-gray-500 mt-2 truncate">
                              {getMessagePreview(chat.recentMessages)}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FaComments />
                              {chat.totalMessages} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <FaClock />
                              {formatDate(chat.lastMessageAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Right: Chat Details */}
          <div className="lg:col-span-2">
            {selectedChat ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-lg">
                        {selectedChat.employeeId?.firstName} {selectedChat.employeeId?.lastName}
                      </h2>
                      <p className="text-sm opacity-90">{selectedChat.employeeId?.email}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{selectedChat.totalMessages} messages</p>
                      <p className="opacity-90">{formatDate(selectedChat.lastMessageAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {selectedChat.messages && selectedChat.messages.length > 0 ? (
                    <div className="space-y-4">
                      {selectedChat.messages.map((message, idx) => (
                        <div
                          key={idx}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : message.role === 'assistant'
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-yellow-50 text-gray-700 border border-yellow-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {message.role === 'user' ? (
                                <FaUser className="text-sm" />
                              ) : (
                                <span>🤖</span>
                              )}
                              <span className="font-semibold text-sm">
                                {message.role === 'user' ? 'Employee' : message.role === 'assistant' ? 'MAYA' : 'System'}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </p>
                            {message.timestamp && (
                              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-purple-100' : 'text-gray-500'}`}>
                                {formatDate(message.timestamp)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-12">
                      <FaComments className="mx-auto text-5xl mb-4 opacity-20" />
                      <p>No messages in this conversation</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow h-full flex items-center justify-center">
                <div className="text-center text-gray-500 p-12">
                  <FaEye className="mx-auto text-6xl mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a conversation to view details</p>
                  <p className="text-sm mt-2">Click on any chat from the list to see the full conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
