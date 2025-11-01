'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  FaTasks, FaArrowLeft, FaCalendarAlt, FaUser, FaClock,
  FaCheckCircle, FaPlay, FaPause, FaCheck, FaEdit, FaTrash
} from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function TaskDetailsPage() {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [milestones, setMilestones] = useState([])
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', dueDate: '' })
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [milestoneProgress, setMilestoneProgress] = useState(0)
  const [milestoneRemark, setMilestoneRemark] = useState('')
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchTaskDetails()
      fetchMilestones()
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

  const deleteTask = async () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deletion')
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: deleteReason })
      })

      if (response.ok) {
        alert('Task deleted successfully')
        router.push('/dashboard/tasks')
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    } finally {
      setUpdating(false)
      setShowDeleteModal(false)
    }
  }

  const canDeleteTask = () => {
    if (!user || !task) {
      console.log('canDeleteTask: user or task missing', { user: !!user, task: !!task })
      return false
    }
    const myId = user.employeeId || user.id || user._id
    const assignedById = task.assignedBy?._id || task.assignedBy

    // Admin can delete any task
    if (user.role === 'admin') {
      return true
    }

    // Task creator can delete
    if (assignedById && assignedById.toString() === myId.toString()) {
      return true
    }

    // HR can delete tasks in their department
    if (user.role === 'hr') {
      // Check if any assignee is in the same department
      const userDept = user.department
      const hasAssigneeInDept = task.assignedTo?.some(assignment => {
        const emp = assignment.employee
        return emp?.department === userDept
      })
      if (hasAssigneeInDept) {
        return true
      }
    }

    // Manager can delete tasks for their team members
    if (user.role === 'manager') {
      // Check if any assignee reports to this manager
      const hasDirectReport = task.assignedTo?.some(assignment => {
        const emp = assignment.employee
        return emp?.reportingManager?._id?.toString() === myId.toString() ||
               emp?.reportingManager?.toString() === myId.toString()
      })
      if (hasDirectReport) {
        return true
      }
    }

    console.log('canDeleteTask: No permission', {
      userRole: user.role,
      myId: myId.toString(),
      assignedById: assignedById?.toString(),
      userDept: user.department
    })

    return false
  }

  const fetchMilestones = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}/milestones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMilestones(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
    }
  }

  const createMilestone = async () => {
    if (!newMilestone.title.trim()) {
      alert('Milestone title is required')
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMilestone)
      })

      if (response.ok) {
        setShowMilestoneModal(false)
        setNewMilestone({ title: '', description: '', dueDate: '' })
        fetchMilestones()
        fetchTaskDetails() // Refresh to update overall progress
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to create milestone')
      }
    } catch (error) {
      console.error('Error creating milestone:', error)
      alert('Failed to create milestone')
    } finally {
      setUpdating(false)
    }
  }

  const updateMilestoneProgress = async (milestoneId) => {
    if (!milestoneRemark.trim()) {
      alert('Remark is required when updating progress')
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          progress: milestoneProgress,
          remark: milestoneRemark
        })
      })

      if (response.ok) {
        setEditingMilestone(null)
        setMilestoneProgress(0)
        setMilestoneRemark('')
        fetchMilestones()
        fetchTaskDetails() // Refresh to update overall progress
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to update milestone')
      }
    } catch (error) {
      console.error('Error updating milestone:', error)
      alert('Failed to update milestone')
    } finally {
      setUpdating(false)
    }
  }

  const deleteMilestone = async (milestoneId) => {
    if (!confirm('Are you sure you want to delete this milestone?')) {
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchMilestones()
        fetchTaskDetails() // Refresh to update overall progress
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to delete milestone')
      }
    } catch (error) {
      console.error('Error deleting milestone:', error)
      alert('Failed to delete milestone')
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
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-0">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
              >
                <FaArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                  <FaTasks className="mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Task Details</span>
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm">#{task.taskNumber}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {myAssignment?.status === 'pending' && (
                <>
                  <button
                    onClick={acceptTask}
                    disabled={updating}
                    className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={rejectTask}
                    disabled={updating}
                    className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs sm:text-sm"
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
                      className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                    >
                      <FaPlay className="w-3 h-3 mr-2" />
                      Start Task
                    </button>
                  )}

                  {task.status === 'in_progress' && (task.progress || 0) < 100 && (
                    <button
                      onClick={() => updateTaskProgress(100, 'review')}
                      disabled={updating}
                      className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                    >
                      <FaCheck className="w-3 h-3 mr-2" />
                      Mark Complete
                    </button>
                  )}
                </>
              )}

              {canDeleteTask() && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={updating}
                  className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                >
                  <FaTrash className="w-3 h-3 mr-2" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Task Information */}
          <div className="space-y-6">
            {/* Title and Status */}
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3">{task.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority} priority
                </span>
                {isOverdue() && (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{task.description}</p>
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Milestones</p>
                  <button
                    onClick={() => setShowMilestoneModal(true)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Add Milestone
                  </button>
                </div>
                {milestones && milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.map((milestone) => (
                      <div key={milestone._id} className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                            {milestone.description && (
                              <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                            )}
                            {milestone.dueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteMilestone(milestone._id)}
                            className="text-red-600 hover:text-red-800 text-xs ml-2"
                            disabled={updating}
                          >
                            <FaTrash />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Progress</span>
                            <span className="text-xs font-semibold text-gray-900">{milestone.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${milestone.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Update Progress */}
                        {editingMilestone === milestone._id ? (
                          <div className="mt-3 p-2 bg-gray-50 rounded">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Update Progress
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={milestoneProgress}
                              onChange={(e) => setMilestoneProgress(parseInt(e.target.value))}
                              className="w-full mb-2"
                            />
                            <div className="text-center text-sm font-semibold mb-2">{milestoneProgress}%</div>
                            <textarea
                              value={milestoneRemark}
                              onChange={(e) => setMilestoneRemark(e.target.value)}
                              placeholder="Add a remark (required)"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
                              rows="2"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateMilestoneProgress(milestone._id)}
                                disabled={updating || !milestoneRemark.trim()}
                                className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMilestone(null)
                                  setMilestoneProgress(0)
                                  setMilestoneRemark('')
                                }}
                                className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingMilestone(milestone._id)
                              setMilestoneProgress(milestone.progress)
                              setMilestoneRemark('')
                            }}
                            className="mt-2 text-blue-600 hover:underline text-xs"
                          >
                            Update Progress
                          </button>
                        )}

                        {/* Progress History */}
                        {milestone.progressHistory && milestone.progressHistory.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-2">Progress History</p>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {milestone.progressHistory.slice().reverse().map((history, idx) => (
                                <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="font-semibold">{history.progress}%</span>
                                    <span className="text-gray-500">
                                      {new Date(history.updatedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-700">{history.remark}</p>
                                  <p className="text-gray-500 mt-1">
                                    by {history.updatedBy?.firstName} {history.updatedBy?.lastName}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm text-center py-4">No milestones yet. Add one to track progress!</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Task</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this task? This action will mark the task as deleted but preserve it in the task history.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for deletion *
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter reason for deleting this task..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteReason('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteTask}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={updating || !deleteReason.trim()}
                >
                  {updating ? 'Deleting...' : 'Delete Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Creation Modal */}
        {showMilestoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Milestone</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Milestone title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Milestone description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowMilestoneModal(false)
                    setNewMilestone({ title: '', description: '', dueDate: '' })
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={createMilestone}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={updating || !newMilestone.title.trim()}
                >
                  {updating ? 'Creating...' : 'Create Milestone'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleBasedAccess>
  )
}
