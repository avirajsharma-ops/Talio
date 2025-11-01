'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  FaTasks, FaArrowLeft, FaCalendarAlt, FaUser, FaClock, 
  FaCheckCircle, FaPlay, FaPause, FaCheck, FaEdit
} from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function TaskDetailsPage() {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchTaskDetails()
    } else {
      router.push('/login')
    }
  }, [params.id])

  const fetchTaskDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTask(data.data)
        } else {
          console.error('Failed to fetch task:', data.message)
        }
      } else {
        console.error('Failed to fetch task')
      }
    } catch (error) {
      console.error('Error fetching task:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskProgress = async (progress, status) => {
    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress, status })
      })

      if (response.ok) {
        fetchTaskDetails() // Refresh task data
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setUpdating(false)
    }
  }

  const acceptTask = async () => {
    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          taskId: params.id, 
          action: 'accept',
          reason: 'Task accepted'
        })
      })

      if (response.ok) {
        fetchTaskDetails() // Refresh task data
      }
    } catch (error) {
      console.error('Error accepting task:', error)
    } finally {
      setUpdating(false)
    }
  }

  const rejectTask = async () => {
    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          taskId: params.id, 
          action: 'reject',
          reason: 'Task rejected'
        })
      })

      if (response.ok) {
        fetchTaskDetails() // Refresh task data
      }
    } catch (error) {
      console.error('Error rejecting task:', error)
    } finally {
      setUpdating(false)
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMyAssignment = () => {
    if (!task || !user) return null
    const myEmpId = user.employeeId || user.id || user._id
    return task.assignedTo?.find(assignment =>
      assignment.employee?._id === myEmpId || assignment.employee === myEmpId
    )
  }

  const isOverdue = () => {
    if (!task) return false
    return new Date(task.dueDate) < new Date() && !['completed', 'cancelled'].includes(task.status)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">The task you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const myAssignment = getMyAssignment()

  return (
    <RoleBasedAccess allowedRoles={['admin', 'hr', 'manager', 'employee']}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <FaTasks className="mr-3 text-blue-600" />
                  Task Details
                </h1>
                <p className="text-gray-600 text-sm">#{task.taskNumber}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              {myAssignment?.status === 'pending' && (
                <>
                  <button
                    onClick={acceptTask}
                    disabled={updating}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={rejectTask}
                    disabled={updating}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                  >
                    Reject
                  </button>
                </>
              )}

              {myAssignment?.status === 'accepted' && task.status !== 'completed' && (
                <>
                  {task.status === 'assigned' && (
                    <button
                      onClick={() => updateTaskProgress(10, 'in_progress')}
                      disabled={updating}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"
                    >
                      <FaPlay className="w-3 h-3 mr-2" />
                      Start Task
                    </button>
                  )}
                  
                  {task.status === 'in_progress' && (task.progress || 0) < 100 && (
                    <button
                      onClick={() => updateTaskProgress(100, 'review')}
                      disabled={updating}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"
                    >
                      <FaCheck className="w-3 h-3 mr-2" />
                      Mark Complete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Task Information */}
          <div className="space-y-6">
            {/* Title and Status */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority} priority
                </span>
                {isOverdue() && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>
              
              {task.description && (
                <p className="text-gray-700 text-base leading-relaxed">{task.description}</p>
              )}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">{task.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Task Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center text-sm">
                  <FaCalendarAlt className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Due Date:</span>
                  <span className="ml-2 font-medium">{formatDate(task.dueDate)}</span>
                </div>

                <div className="flex items-center text-sm">
                  <FaUser className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Assigned By:</span>
                  <span className="ml-2 font-medium">
                    {task.assignedBy?.firstName} {task.assignedBy?.lastName}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <FaClock className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Estimated Hours:</span>
                  <span className="ml-2 font-medium">{task.estimatedHours || 0} hours</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-sm">
                  <FaTasks className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium capitalize">{task.category}</span>
                </div>

                {task.project && (
                  <div className="flex items-center text-sm">
                    <FaTasks className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-600">Project:</span>
                    <span className="ml-2 font-medium">{task.project.name}</span>
                  </div>
                )}

                <div className="flex items-center text-sm">
                  <FaCalendarAlt className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 font-medium">{formatDate(task.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Assigned To</h3>
              <div className="space-y-2">
                {task.assignedTo?.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <FaUser className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {assignment.employee?.firstName} {assignment.employee?.lastName}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">{assignment.role}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hierarchy */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hierarchy</h3>
              {task.parentTask && (
                <div className="p-3 bg-gray-50 rounded-lg mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Parent Task</p>
                    <p className="font-medium text-gray-900">#{task.parentTask.taskNumber} — {task.parentTask.title}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/tasks/${task.parentTask._id}`)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </button>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Subtasks</p>
                  <button
                    onClick={() => router.push(`/dashboard/tasks/create?parent=${task._id}`)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Create subtask
                  </button>
                </div>
                {task.subtasks && task.subtasks.length > 0 ? (
                  <ul className="space-y-2">
                    {task.subtasks.map((st) => (
                      <li key={st._id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <p className="font-medium text-gray-900">#{st.taskNumber} — {st.title}</p>
                          <p className="text-xs text-gray-600">{st.status} • {st.progress || 0}%</p>
                        </div>
                        <button
                          onClick={() => router.push(`/dashboard/tasks/${st._id}`)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Open
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm">No subtasks</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleBasedAccess>
  )
}
