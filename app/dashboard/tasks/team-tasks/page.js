'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  FaTasks, FaUsers, FaSearch, FaClock, FaCheckCircle, 
  FaChartLine, FaComments, FaHistory, FaChevronDown,
  FaChevronUp, FaCalendarAlt, FaUser, FaPaperPlane, FaFlag
} from 'react-icons/fa'

export default function TeamTasksPage() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)
  const [department, setDepartment] = useState(null)
  const [showTimeline, setShowTimeline] = useState({})
  const [showComments, setShowComments] = useState({})
  const [newComment, setNewComment] = useState({})
  const [commentType, setCommentType] = useState({})
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchTeamTasks()
    }
  }, [])

  const fetchTeamTasks = async (filterParams = {}) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filterParams.status) params.append('status', filterParams.status)
      if (filterParams.priority) params.append('priority', filterParams.priority)

      const response = await fetch(`/api/tasks/team?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setTasks(data.data)
        setIsDepartmentHead(data.meta.isDepartmentHead)
        setDepartment(data.meta.department)
      } else {
        toast.error(data.message || 'Failed to fetch team Projects')
      }
    } catch (error) {
      console.error('Error fetching team Projects:', error)
      toast.error('Failed to fetch team Projects')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchTeamTasks(newFilters)
  }

  const toggleTimeline = (taskId) => {
    setShowTimeline(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const toggleComments = (taskId) => {
    setShowComments(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const handleAddComment = async (taskId) => {
    if (!newComment[taskId]?.trim()) {
      toast.error('Please enter a comment')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks/team', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          content: newComment[taskId],
          type: commentType[taskId] || 'comment'
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Comment added successfully')
        setNewComment(prev => ({ ...prev, [taskId]: '' }))
        setCommentType(prev => ({ ...prev, [taskId]: 'comment' }))
        fetchTeamTasks(filters)
      } else {
        toast.error(data.message || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      review: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
      critical: 'text-red-800 font-bold'
    }
    return colors[priority] || 'text-gray-600'
  }

  const getTimelineColor = (type) => {
    const colors = {
      created: 'bg-blue-100 text-blue-600',
      status_change: 'bg-yellow-100 text-yellow-600',
      approved: 'bg-green-100 text-green-600',
      rejected: 'bg-red-100 text-red-600',
      time_logged: 'bg-purple-100 text-purple-600',
      checklist_completed: 'bg-green-100 text-green-600',
      comment: 'bg-indigo-100 text-indigo-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const filteredTasks = tasks.filter(task => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return task.title.toLowerCase().includes(searchLower) ||
             task.description?.toLowerCase().includes(searchLower)
    }
    return true
  })

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:p-6 lg:p-8 pb-24 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <FaUsers className="text-blue-600 mr-3 text-2xl" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Team Projects</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {department?.name} Department
              {isDepartmentHead && <span className="ml-2 text-blue-600 font-medium">(Department Head)</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <FaTasks className="text-blue-500 text-xl sm:text-2xl" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-yellow-600 font-medium">In Progress</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-900">
                {tasks.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
            <FaClock className="text-yellow-500 text-xl sm:text-2xl" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-purple-600 font-medium">In Review</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-900">
                {tasks.filter(t => t.status === 'review').length}
              </p>
            </div>
            <FaChartLine className="text-purple-500 text-xl sm:text-2xl" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-900">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
            <FaCheckCircle className="text-green-500 text-xl sm:text-2xl" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Projects..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={() => {
              setFilters({ status: '', priority: '', search: '' })
              fetchTeamTasks()
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading team projects...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaTasks className="text-gray-400 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No projects Found</h3>
          <p className="text-gray-600">
            {filters.search || filters.status || filters.priority 
              ? 'Try adjusting your filters' 
              : 'No Projects assigned to your team yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`text-xs font-medium flex items-center ${getPriorityColor(task.priority)}`}>
                        <FaFlag className="mr-1" />
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <FaUser className="mr-2 text-gray-400" />
                    <span className="font-medium mr-1">Assigned by:</span>
                    {task.assignedBy?.firstName} {task.assignedBy?.lastName}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FaUsers className="mr-2 text-gray-400" />
                    <span className="font-medium mr-1">Assigned to:</span>
                    {task.assignedTo?.length} member(s)
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FaCalendarAlt className="mr-2 text-gray-400" />
                    <span className="font-medium mr-1">Due:</span>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => toggleTimeline(task._id)}
                    className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <FaHistory className="mr-2" />
                    Timeline ({task.timeline?.length || 0})
                    {showTimeline[task._id] ? <FaChevronUp className="ml-2" /> : <FaChevronDown className="ml-2" />}
                  </button>
                  <button
                    onClick={() => toggleComments(task._id)}
                    className="flex items-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm"
                  >
                    <FaComments className="mr-2" />
                    Comments ({task.comments?.length || 0})
                    {showComments[task._id] ? <FaChevronUp className="ml-2" /> : <FaChevronDown className="ml-2" />}
                  </button>
                </div>

                {showTimeline[task._id] && task.timeline && task.timeline.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FaHistory className="mr-2" />
                      Project Timeline
                    </h4>
                    <div className="space-y-3">
                      {task.timeline.map((event, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${getTimelineColor(event.type)}`}>
                            <FaClock className="h-3 w-3" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{event.description}</p>
                            {event.reason && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{event.reason}"</p>
                            )}
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              {event.actor ? (
                                <>
                                  <span>{event.actor.firstName} {event.actor.lastName}</span>
                                  <span>•</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-gray-400">System</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{new Date(event.date).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showComments[task._id] && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FaComments className="mr-2" />
                      Comments
                    </h4>
                    
                    {task.comments && task.comments.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {task.comments.map((comment, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="bg-blue-100 p-1 rounded-full">
                                  <FaUser className="h-3 w-3 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {comment.author?.firstName} {comment.author?.lastName}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                            {comment.type !== 'comment' && (
                              <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {comment.type.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <select
                        value={commentType[task._id] || 'comment'}
                        onChange={(e) => setCommentType(prev => ({ ...prev, [task._id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="comment">Comment</option>
                        <option value="status_update">Status Update</option>
                        <option value="question">Question</option>
                        <option value="blocker">Blocker</option>
                        <option value="solution">Solution</option>
                      </select>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder={isDepartmentHead ? "Add a remark or comment..." : "Add a comment..."}
                          value={newComment[task._id] || ''}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [task._id]: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(task._id)
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <button
                          onClick={() => handleAddComment(task._id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <FaPaperPlane className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
