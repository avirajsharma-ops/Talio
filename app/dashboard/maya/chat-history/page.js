'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FaComments, FaCalendar, FaUser, FaSearch, FaRobot, FaClock, FaTimes, FaBuilding, FaSpinner, FaStar } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ChatHistoryPage() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [portalContainer, setPortalContainer] = useState(null)

  // Set up portal container on mount
  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  // Open modal with animation
  const openConversationModal = useCallback((conversation) => {
    setSelectedConversation(conversation)
    setIsModalOpen(true)
    setIsModalClosing(false)
  }, [])

  // Close modal with animation
  const closeConversationModal = useCallback(() => {
    setIsModalClosing(true)
    setTimeout(() => {
      setSelectedConversation(null)
      setIsModalOpen(false)
      setIsModalClosing(false)
    }, 200) // Match animation duration
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
      setCurrentUser(user)

      if (['admin', 'god_admin', 'department_head', 'hr', 'manager'].includes(user.role)) {
        // For admins/department heads/managers, show employees
        fetchEmployees(user)
      } else {
        // For regular users, show only their own chat directly
        fetchOwnChatHistory()
      }
    }
  }, [])

  const fetchEmployees = async (user) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Fetch all employees - the API already includes userId information
      const response = await fetch('/api/employees?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        let employeeList = []
        const rawEmployees = data.data || []

        employeeList = rawEmployees.map(emp => ({
          // Use the userId._id if available (from /api/employees which joins with User model)
          _id: emp.userId?._id || emp._id,
          employeeId: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          department: emp.department,
          designation: emp.designation,
          profilePicture: emp.profilePicture,
          isCurrentUser: false
        }))

        // For department heads and managers, filter to only show team members
        if (user.role === 'department_head' || user.role === 'manager') {
          // Fetch team members to get the list of employee IDs in this department
          const teamResponse = await fetch('/api/team/members', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const teamData = await teamResponse.json()

          if (teamData.success && teamData.data) {
            const teamEmployeeIds = teamData.data.map(m => m._id?.toString())
            employeeList = employeeList.filter(emp =>
              teamEmployeeIds.includes(emp.employeeId?.toString())
            )
          }
        }

        // Create current user's card and add at the beginning
        const currentUserCard = {
          _id: user.id,
          name: user.name || user.email?.split('@')[0] || 'You',
          email: user.email,
          department: user.department || null,
          designation: user.designation || null,
          isCurrentUser: true
        }

        // Filter out current user from the list if they're already there
        employeeList = employeeList.filter(emp =>
          emp._id !== user.id &&
          emp.email !== user.email &&
          emp.employeeId?.toString() !== user.employeeId?.toString()
        )

        // Add current user at the beginning
        setEmployees([currentUserCard, ...employeeList])
      } else {
        toast.error(data.message || 'Failed to load employees')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const fetchOwnChatHistory = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/maya/chat-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setConversations(data.history || [])
      } else {
        toast.error('Failed to load chat history')
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
      toast.error('Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }

  const viewEmployeeChats = async (employee) => {
    setSelectedEmployee(employee)
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      
      // Fetch all conversations for this employee
      const response = await fetch(`/api/maya/chat-history?userId=${employee._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setConversations(data.history || [])
      } else {
        setConversations([])
        toast.error('No chat history found for this employee')
      }
      
    } catch (error) {
      console.error('Error fetching employee chats:', error)
      toast.error('Failed to load employee chat history')
    } finally {
      setLoading(false)
    }
  }

  const viewConversation = (conversation) => {
    openConversationModal(conversation)
  }

  const closeConversation = () => {
    closeConversationModal()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0 || diffDays === 1) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return diffDays === 0 ? `Today ${hours}:${minutes}` : `Yesterday ${hours}:${minutes}`
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getConversationTitle = (messages) => {
    if (!messages || messages.length === 0) return 'Empty Conversation'
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (firstUserMessage) {
      const firstLine = firstUserMessage.content.split('\n')[0]
      return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '')
    }
    return 'Conversation'
  }

  const getConversationPreview = (messages) => {
    if (!messages || messages.length === 0) return 'No messages'
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 100) + (firstUserMessage.content.length > 100 ? '...' : '')
    }
    return messages[0].content.substring(0, 100)
  }

  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.department?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Modal Portal - render in all views
  const renderModal = () => {
    if (!isModalOpen || !selectedConversation || !portalContainer) return null

    return createPortal(
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-200 ease-out ${
          isModalClosing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          zIndex: 2147483649,
          backgroundColor: isModalClosing ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: isModalClosing ? 'blur(0px)' : 'blur(4px)',
          WebkitBackdropFilter: isModalClosing ? 'blur(0px)' : 'blur(4px)',
          transition: 'background-color 200ms ease-out, backdrop-filter 200ms ease-out, opacity 200ms ease-out'
        }}
        onClick={closeConversation}
      >
        <div
          className={`bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-200 ease-out ${
            isModalClosing
              ? 'opacity-0 scale-95 translate-y-4'
              : 'opacity-100 scale-100 translate-y-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center rounded-t-xl">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaRobot className="text-indigo-600" />
              Conversation Details
            </h2>
            <button
              onClick={closeConversation}
              className="text-gray-500 hover:text-gray-700 text-2xl transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <FaTimes />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <FaClock />
                {formatDate(selectedConversation.lastMessageAt)}
              </span>
              <span className="text-sm text-gray-600">
                {selectedConversation.totalMessages || selectedConversation.messages?.length || 0} messages
              </span>
            </div>

            <div className="space-y-4">
              {selectedConversation.messages && selectedConversation.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <FaRobot className="text-white text-sm" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : message.role === 'assistant'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-50 text-yellow-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.timestamp && (
                      <p className="text-xs mt-2 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <FaUser className="text-white text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      portalContainer
    )
  }

  // Regular user view (own chat history only)
  if (userRole && !['admin', 'god_admin', 'department_head', 'hr'].includes(userRole)) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FaRobot className="text-indigo-600" />
                My MAYA Chat History
              </h1>
              <p className="text-gray-600">View your conversation history with MAYA</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              {loading ? (
                <div className="text-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
                  <p>Loading chat history...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <FaComments className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No conversations found</p>
                  <p className="text-gray-400 text-sm mt-2">Start chatting with MAYA to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => viewConversation(conv)}
                      className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {getConversationTitle(conv.messages)}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {getConversationPreview(conv.messages)}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {conv.totalMessages || conv.messages?.length || 0} messages
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {renderModal()}
      </>
    )
  }

  // Admin/Manager view (all employees)
  if (loading && !selectedEmployee) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
            <p>Loading employees...</p>
          </div>
        </div>
        {renderModal()}
      </>
    )
  }

  // Employee cards view
  if (!selectedEmployee) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FaRobot className="text-indigo-600" />
                Team MAYA Chat History
              </h1>
              <p className="text-gray-600">View MAYA conversation history for all team members</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees by name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee._id}
                  onClick={() => viewEmployeeChats(employee)}
                  className={`rounded-lg shadow hover:shadow-lg transition-all cursor-pointer flex flex-col ${
                    employee.isCurrentUser
                      ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-400 hover:border-indigo-600'
                      : 'bg-white border border-gray-200 hover:border-indigo-500'
                  }`}
                >
                  <div className="p-6 flex-1">
                    {employee.isCurrentUser && (
                      <div className="flex items-center gap-2 mb-3 text-indigo-600">
                        <FaStar className="text-sm" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Your History</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                        employee.isCurrentUser
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-700 ring-4 ring-indigo-200'
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                      }`}>
                        {employee.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${employee.isCurrentUser ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {employee.isCurrentUser ? 'You' : (employee.name || 'Unknown')}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaBuilding className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{employee.department?.name || 'No Department'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaUser className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{employee.designation?.title || 'No Designation'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Button aligned to bottom */}
                  <div className="px-6 pb-6">
                    <button className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      employee.isCurrentUser
                        ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}>
                      <FaComments />
                      <span>{employee.isCurrentUser ? 'View My Chats' : 'View Chats'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No employees found</p>
              </div>
            )}
          </div>
        </div>
        {renderModal()}
      </>
    )
  }

  // Employee chat list view
  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedEmployee(null)
                setConversations([])
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <FaTimes className="text-gray-500" />
              <span>Back to Employees</span>
            </button>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FaRobot className="text-indigo-600" />
                {selectedEmployee.name}&apos;s MAYA Chats
              </h1>
              <p className="text-gray-600">{selectedEmployee.email}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="text-center py-12">
                <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
                <p>Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <FaComments className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No conversations found</p>
                <p className="text-gray-400 text-sm mt-2">This employee hasn&apos;t chatted with MAYA yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => viewConversation(conv)}
                    className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 flex-1">
                        {getConversationTitle(conv.messages)}
                      </h4>
                      <span className="text-xs text-gray-500 ml-4">
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {getConversationPreview(conv.messages)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaComments />
                        {conv.totalMessages || conv.messages?.length || 0} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock />
                        {formatDate(conv.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {renderModal()}
    </>
  )
}
