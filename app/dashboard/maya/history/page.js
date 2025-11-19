'use client'

import { useState, useEffect } from 'react'
import { FaRobot, FaUser, FaClock, FaCalendar, FaFilter, FaSearch } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function MayaChatHistoryPage() {
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchChatHistory()
    }
  }, [])

  const fetchChatHistory = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/maya/chat-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.history || [])
      } else {
        toast.error('Failed to load chat history')
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
      toast.error('Error loading chat history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredHistory = chatHistory.filter(session => {
    const matchesSearch = searchTerm === '' || 
      session.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesDate = dateFilter === 'all' || (() => {
      const sessionDate = new Date(session.lastMessageAt)
      const now = new Date()
      const daysDiff = Math.floor((now - sessionDate) / (1000 * 60 * 60 * 24))
      
      if (dateFilter === 'today') return daysDiff === 0
      if (dateFilter === 'week') return daysDiff <= 7
      if (dateFilter === 'month') return daysDiff <= 30
      return true
    })()

    return matchesSearch && matchesDate
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaRobot className="text-blue-600" />
          MAYA Chat History
        </h1>
        <p className="text-gray-600 mt-1">View your conversation history with MAYA</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FaRobot className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No chat history found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((session) => (
            <div key={session._id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FaCalendar className="text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-800">Session {session.sessionId.slice(-8)}</p>
                    <p className="text-sm text-gray-500">{session.totalMessages} messages</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FaClock />
                  {formatDate(session.lastMessageAt)}
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {session.messages.slice(-5).map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`p-2 rounded-full ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {msg.role === 'user' ? <FaUser className="text-blue-600" /> : <FaRobot className="text-gray-600" />}
                      </div>
                      <div className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.functionCall && (
                          <p className="text-xs mt-2 opacity-75">
                            Function: {msg.functionCall.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


