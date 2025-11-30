'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  FaTasks, FaCalendarAlt, FaFilter, FaSearch, FaProjectDiagram,
  FaCheck, FaPlay, FaEye, FaClock, FaExclamationTriangle,
  FaChevronDown, FaCheckCircle, FaTimes, FaSpinner
} from 'react-icons/fa'
import { playNotificationSound, NotificationSoundTypes } from '@/lib/notificationSounds'

const statusColors = {
  'todo': 'bg-gray-100 text-gray-700 border-gray-200',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'review': 'bg-purple-100 text-purple-700 border-purple-200',
  'completed': 'bg-green-100 text-green-700 border-green-200',
  'rejected': 'bg-red-100 text-red-700 border-red-200',
  'blocked': 'bg-orange-100 text-orange-700 border-orange-200'
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
}

export default function MyTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    period: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [respondingTo, setRespondingTo] = useState(null)
  const [rejectRemark, setRejectRemark] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  
  // Auto-refresh refs
  const refreshIntervalRef = useRef(null)
  const lastFetchRef = useRef(Date.now())

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.priority !== 'all') params.append('priority', filters.priority)
      if (filters.period !== 'all') params.append('period', filters.period)

      const response = await fetch(`/api/projects/my-tasks?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setTasks(prev => {
          // Only update if data changed to prevent layout shifts
          if (JSON.stringify(prev) !== JSON.stringify(data.data)) {
            return data.data
          }
          return prev
        })
      } else if (!silent) {
        toast.error(data.message || 'Failed to load tasks')
      }
    } catch (error) {
      console.error('Fetch tasks error:', error)
      if (!silent) toast.error('An error occurred')
    } finally {
      if (!silent) setLoading(false)
      lastFetchRef.current = Date.now()
    }
  }, [filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Auto-refresh every 10 seconds for real-time sync
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => fetchTasks(true), 10000)
    
    // Also refresh on window focus
    const handleFocus = () => {
      if (Date.now() - lastFetchRef.current > 5000) {
        fetchTasks(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchTasks])

  const handleRespondToAssignment = async (task, action) => {
    try {
      setRespondingTo(task._id)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${task.project._id}/tasks/${task._id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action,
          reason: action === 'reject' ? rejectRemark : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        if (action === 'accept') {
          playNotificationSound(NotificationSoundTypes.SUCCESS)
        } else {
          playNotificationSound(NotificationSoundTypes.UPDATE)
        }
        toast.success(data.message)
        fetchTasks()
        setShowRejectModal(false)
        setRejectRemark('')
        setSelectedTask(null)
      } else {
        playNotificationSound(NotificationSoundTypes.WARNING)
        toast.error(data.message)
      }
    } catch (error) {
      playNotificationSound(NotificationSoundTypes.WARNING)
      toast.error('Failed to respond to assignment')
    } finally {
      setRespondingTo(null)
    }
  }

  const handleUpdateStatus = async (task, newStatus) => {
    try {
      setRespondingTo(task._id)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${task.project._id}/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      if (data.success) {
        if (newStatus === 'completed') {
          playNotificationSound(NotificationSoundTypes.SUCCESS)
        } else {
          playNotificationSound(NotificationSoundTypes.UPDATE)
        }
        toast.success('Task updated')
        fetchTasks()
      } else {
        playNotificationSound(NotificationSoundTypes.WARNING)
        toast.error(data.message)
      }
    } catch (error) {
      playNotificationSound(NotificationSoundTypes.WARNING)
      toast.error('Failed to update task')
    } finally {
      setRespondingTo(null)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (task) => {
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
  }

  const isDueToday = (task) => {
    if (!task.dueDate) return false
    const today = new Date()
    const due = new Date(task.dueDate)
    return due.toDateString() === today.toDateString()
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.project?.name?.toLowerCase().includes(query)
    )
  })

  // Group tasks by date for today view
  const todayTasks = filteredTasks.filter(isDueToday)
  const overdueTasks = filteredTasks.filter(t => isOverdue(t) && !isDueToday(t))
  const upcomingTasks = filteredTasks.filter(t => !isOverdue(t) && !isDueToday(t))
  const pendingAcceptance = filteredTasks.filter(t => t.assignmentStatus === 'pending')

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t)).length,
    pendingAcceptance: tasks.filter(t => t.assignmentStatus === 'pending').length
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Tasks</h1>
          <p className="text-gray-600">View and manage your tasks across all projects</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FaTasks className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-semibold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FaClock className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Accept</p>
              <p className="font-semibold text-gray-800">{stats.pendingAcceptance}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FaTasks className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">To Do</p>
              <p className="font-semibold text-gray-800">{stats.todo}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaPlay className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">In Progress</p>
              <p className="font-semibold text-gray-800">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCheckCircle className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="font-semibold text-gray-800">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FaExclamationTriangle className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Overdue</p>
              <p className="font-semibold text-gray-800">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <FaFilter className="mr-2" />
            Filters
            <FaChevronDown className={`ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pending Acceptance Tasks */}
      {pendingAcceptance.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaClock className="text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Pending Acceptance</h2>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
              {pendingAcceptance.length}
            </span>
          </div>
          <div className="grid gap-4">
            {pendingAcceptance.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onAccept={() => handleRespondToAssignment(task, 'accept')}
                onReject={() => { setSelectedTask(task); setShowRejectModal(true) }}
                onStatusChange={handleUpdateStatus}
                onViewProject={() => router.push(`/dashboard/projects/${task.project._id}`)}
                respondingTo={respondingTo}
                isPendingAcceptance
              />
            ))}
          </div>
        </div>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaExclamationTriangle className="text-red-500" />
            <h2 className="text-lg font-semibold text-gray-800">Overdue</h2>
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
              {overdueTasks.length}
            </span>
          </div>
          <div className="grid gap-4">
            {overdueTasks.filter(t => t.assignmentStatus !== 'pending').map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleUpdateStatus}
                onViewProject={() => router.push(`/dashboard/projects/${task.project._id}`)}
                respondingTo={respondingTo}
                isOverdue
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaCalendarAlt className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800">Due Today</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
              {todayTasks.length}
            </span>
          </div>
          <div className="grid gap-4">
            {todayTasks.filter(t => t.assignmentStatus !== 'pending').map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleUpdateStatus}
                onViewProject={() => router.push(`/dashboard/projects/${task.project._id}`)}
                respondingTo={respondingTo}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.filter(t => t.assignmentStatus !== 'pending').length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaTasks className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Tasks</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
              {upcomingTasks.filter(t => t.assignmentStatus !== 'pending').length}
            </span>
          </div>
          <div className="grid gap-4">
            {upcomingTasks.filter(t => t.assignmentStatus !== 'pending').map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleUpdateStatus}
                onViewProject={() => router.push(`/dashboard/projects/${task.project._id}`)}
                respondingTo={respondingTo}
              />
            ))}
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FaTasks className="mx-auto text-4xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No tasks found</h3>
          <p className="text-gray-500">Tasks assigned to you will appear here</p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Reject Assignment</h3>
              <button
                onClick={() => { setShowRejectModal(false); setSelectedTask(null); setRejectRemark('') }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this task assignment.
              </p>
              <textarea
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedTask(null); setRejectRemark('') }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespondToAssignment(selectedTask, 'reject')}
                disabled={respondingTo === selectedTask._id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {respondingTo === selectedTask._id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({ task, onAccept, onReject, onStatusChange, onViewProject, respondingTo, isPendingAcceptance, isOverdue }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const isUpdating = respondingTo === task._id

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${
      isOverdue ? 'border-red-200' : 
      isPendingAcceptance ? 'border-yellow-200' : 
      'border-gray-100'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-medium text-gray-800">{task.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[task.status]}`}>
                  {task.status.replace('-', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
                  {task.priority}
                </span>
                {isPendingAcceptance && (
                  <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 border border-yellow-200">
                    Pending Acceptance
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button
                  onClick={onViewProject}
                  className="flex items-center gap-1 hover:text-primary-600"
                >
                  <FaProjectDiagram className="text-xs" />
                  {task.project?.name}
                </button>
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                    <FaCalendarAlt className="text-xs" />
                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {isPendingAcceptance ? (
            <>
              <button
                onClick={onReject}
                disabled={isUpdating}
                className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
              >
                {isUpdating ? <FaSpinner className="animate-spin" /> : 'Reject'}
              </button>
              <button
                onClick={onAccept}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isUpdating ? <FaSpinner className="animate-spin" /> : <><FaCheck /> Accept</>}
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                disabled={task.status === 'completed' || isUpdating}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
              >
                {isUpdating ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <>
                    Update Status
                    <FaChevronDown className="text-xs" />
                  </>
                )}
              </button>
              
              {showStatusMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {['todo', 'in-progress', 'review', 'completed'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(task, status)
                        setShowStatusMenu(false)
                      }}
                      disabled={task.status === status}
                      className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 ${
                        task.status === status ? 'font-medium text-gray-900' : ''
                      }`}
                    >
                      {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
