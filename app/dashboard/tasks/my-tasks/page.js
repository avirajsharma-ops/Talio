'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FaTasks, FaPlus, FaFilter, FaSearch, FaCalendarAlt,
  FaClock, FaUser, FaCheckCircle, FaExclamationTriangle,
  FaEdit, FaEye, FaPlay, FaPause, FaCheck, FaTrash
} from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchMyTasks()
    } else {
      router.push('/login')
    }
  }, [])

  const fetchMyTasks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      let queryParams = new URLSearchParams({
        view: 'personal',
        page: '1',
        limit: '50'
      })

      if (filter !== 'all') {
        if (filter === 'overdue') {
          queryParams.append('overdue', 'true')
        } else {
          queryParams.append('status', filter)
        }
      }

      if (searchTerm) {
        queryParams.append('search', searchTerm)
      }

      const response = await fetch(`/api/tasks?${queryParams.toString()}&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Tasks API response:', data)
        if (data.success) {
          setTasks(data.data.tasks || [])
          setStats(data.data.stats || {})
          console.log('Tasks loaded:', data.data.tasks?.length || 0)
        } else {
          console.error('API Error:', data.message)
          setTasks([])
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('Failed to fetch tasks:', response.status, errorData.message)
        setTasks([])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const updateTaskProgress = async (taskId, progress, status) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress, status })
      })

      if (response.ok) {
        fetchMyTasks() // Refresh tasks
      }
    } catch (error) {
      console.error('Error updating task progress:', error)
    }
  }

  const acceptTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          taskId, 
          action: 'accept',
          reason: 'Task accepted'
        })
      })

      if (response.ok) {
        fetchMyTasks() // Refresh tasks
      }
    } catch (error) {
      console.error('Error accepting task:', error)
    }
  }

  const rejectTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId,
          action: 'reject',
          reason: 'Task rejected'
        })
      })

      if (response.ok) {
        fetchMyTasks() // Refresh tasks
      }
    } catch (error) {
      console.error('Error rejecting task:', error)
    }
  }

  const canDeleteTask = (task) => {
    if (!user || !task) return false
    const myId = user.employeeId || user.id || user._id
    const assignedById = task.assignedBy?._id || task.assignedBy

    // Admin can delete any task
    if (user.role === 'admin') return true

    // Task creator can delete
    if (assignedById && assignedById.toString() === myId.toString()) return true

    // HR can delete tasks in their department
    if (user.role === 'hr') {
      const userDept = user.department
      const hasAssigneeInDept = task.assignedTo?.some(assignment => {
        const emp = assignment.employee
        return emp?.department === userDept
      })
      if (hasAssigneeInDept) return true
    }

    // Manager can delete tasks for their team members
    if (user.role === 'manager') {
      const hasDirectReport = task.assignedTo?.some(assignment => {
        const emp = assignment.employee
        return emp?.reportingManager?._id?.toString() === myId.toString() ||
               emp?.reportingManager?.toString() === myId.toString()
      })
      if (hasDirectReport) return true
    }

    return false
  }

  const handleDeleteClick = (task) => {
    setTaskToDelete(task)
    setShowDeleteModal(true)
  }

  const deleteTask = async () => {
    if (!taskToDelete || !deleteReason.trim()) return

    try {
      setDeleting(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: deleteReason })
      })

      if (response.ok) {
        setShowDeleteModal(false)
        setTaskToDelete(null)
        setDeleteReason('')
        fetchMyTasks() // Refresh tasks
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-purple-100 text-purple-800',
      'on_hold': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': 'bg-red-200 text-red-900',
      'urgent': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDate, status) => {
    return new Date(dueDate) < new Date() && !['completed', 'cancelled'].includes(status)
  }

  const getMyAssignment = (task) => {
    const myId = user?.employeeId || user?.id || user?._id
    return task.assignedTo?.find(a => a.employee?._id === myId || a.employee === myId)
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === 'all') return matchesSearch
    if (filter === 'pending') return matchesSearch && task.status === 'assigned'
    if (filter === 'in_progress') return matchesSearch && task.status === 'in_progress'
    if (filter === 'completed') return matchesSearch && task.status === 'completed'
    if (filter === 'overdue') return matchesSearch && isOverdue(task.dueDate, task.status)
    
    return matchesSearch
  })

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <RoleBasedAccess allowedRoles={['admin', 'hr', 'manager', 'employee']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaTasks className="mr-3 text-blue-600" />
                My Tasks
              </h1>
              <p className="text-gray-600">Manage your assigned tasks and track progress</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/dashboard/tasks/create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FaPlus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
              
              <button
                onClick={() => router.push('/dashboard/tasks')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col space-y-4 mb-6">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilter('assigned')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === 'assigned' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter('overdue')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === 'overdue' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Overdue
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-auto sm:max-w-md">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <FaTasks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500">
                {filter === 'all' ? 'You don\'t have any tasks assigned yet.' : `No ${filter} tasks found.`}
              </p>
              <button
                onClick={() => router.push('/dashboard/tasks/create')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Task
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const myAssignment = getMyAssignment(task)
                return (
                  <div key={task._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        {/* Title and Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{task.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {isOverdue(task.dueDate, task.status) && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-gray-600 mb-3 text-sm sm:text-base break-words">{task.description}</p>
                        )}

                        {/* Task Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500 mb-3">
                          <div className="flex items-center">
                            <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span>Due: {formatDate(task.dueDate)}</span>
                          </div>
                          <div className="flex items-center">
                            <FaUser className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span>By: {task.assignedBy?.firstName} {task.assignedBy?.lastName}</span>
                          </div>
                          {task.project && (
                            <div className="flex items-center">
                              <FaTasks className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                              <span>Project: {task.project.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{task.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4">
                        {myAssignment?.status === 'pending' && (
                          <>
                            <button
                              onClick={() => acceptTask(task._id)}
                              className="bg-green-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-green-700 transition-colors flex-1 sm:flex-none"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => rejectTask(task._id)}
                              className="bg-red-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-red-700 transition-colors flex-1 sm:flex-none"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {myAssignment?.status === 'accepted' && task.status !== 'completed' && (
                          <>
                            {task.status === 'assigned' && (
                              <button
                                onClick={() => updateTaskProgress(task._id, 10, 'in_progress')}
                                className="bg-blue-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-blue-700 transition-colors flex items-center justify-center flex-1 sm:flex-none"
                              >
                                <FaPlay className="w-3 h-3 mr-1" />
                                Start
                              </button>
                            )}

                            {task.status === 'in_progress' && (task.progress || 0) < 100 && (
                              <button
                                onClick={() => updateTaskProgress(task._id, 100, 'review')}
                                className="bg-green-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-green-700 transition-colors flex items-center justify-center flex-1 sm:flex-none"
                              >
                                <FaCheck className="w-3 h-3 mr-1" />
                                Complete
                              </button>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                          className="bg-gray-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-gray-700 transition-colors flex items-center justify-center flex-1 sm:flex-none"
                        >
                          <FaEye className="w-3 h-3 mr-1" />
                          View
                        </button>

                        {canDeleteTask(task) && (
                          <button
                            onClick={() => handleDeleteClick(task)}
                            className="bg-red-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-red-700 transition-colors flex items-center justify-center flex-1 sm:flex-none"
                          >
                            <FaTrash className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Task</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "<strong>{taskToDelete.title}</strong>"?
              This action will mark the task as deleted but preserve it in the task history.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="3"
                placeholder="Please provide a reason for deleting this task..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setTaskToDelete(null)
                  setDeleteReason('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={deleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleting || !deleteReason.trim()}
              >
                {deleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleBasedAccess>
  )
}
