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
  const [completingMilestone, setCompletingMilestone] = useState(null)
  const [milestoneCompletionRemark, setMilestoneCompletionRemark] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState('approve')
  const [approvalReason, setApprovalReason] = useState('')
  const [estimatedProgress, setEstimatedProgress] = useState(0)
  const [managerRemark, setManagerRemark] = useState('')
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [completionRemarks, setCompletionRemarks] = useState('')
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

    // Get current user's employee ID
    const myId = user.employeeId?._id || user.employeeId || user.id || user._id

    // Get task creator's ID
    const assignedById = task.assignedBy?._id || task.assignedBy

    console.log('canDeleteTask check:', {
      myId: myId?.toString(),
      assignedById: assignedById?.toString(),
      task: task.title
    })

    // Only the task creator can delete
    if (assignedById && myId) {
      return assignedById.toString() === myId.toString()
    }

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

  const completeMilestone = async (milestoneId) => {
    if (!milestoneCompletionRemark.trim()) {
      alert('Completion remark is required')
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
          complete: true,
          completionRemark: milestoneCompletionRemark
        })
      })

      if (response.ok) {
        setCompletingMilestone(null)
        setMilestoneCompletionRemark('')
        fetchMilestones()
        fetchTaskDetails() // Refresh to update overall progress
        alert('Milestone marked as completed')
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to complete milestone')
      }
    } catch (error) {
      console.error('Error completing milestone:', error)
      alert('Failed to complete milestone')
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

  const handleApproval = async () => {
    if (approvalAction === 'reject' && !approvalReason.trim()) {
      alert('Rejection reason is required')
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: approvalAction,
          reason: approvalReason,
          estimatedActualProgress: approvalAction === 'reject' ? estimatedProgress : undefined,
          remark: approvalReason
        })
      })

      if (response.ok) {
        setShowApprovalModal(false)
        setApprovalReason('')
        setEstimatedProgress(0)
        fetchTaskDetails()
        alert(`Task ${approvalAction}d successfully`)
      } else {
        const data = await response.json()
        alert(data.message || `Failed to ${approvalAction} task`)
      }
    } catch (error) {
      console.error('Error processing approval:', error)
      alert(`Failed to ${approvalAction} task`)
    } finally {
      setUpdating(false)
    }
  }

  const addManagerRemark = async () => {
    if (!managerRemark.trim()) {
      alert('Remark is required')
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          remark: managerRemark
        })
      })

      if (response.ok) {
        setShowRemarkModal(false)
        setManagerRemark('')
        fetchTaskDetails()
        alert('Remark added successfully')
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to add remark')
      }
    } catch (error) {
      console.error('Error adding remark:', error)
      alert('Failed to add remark')
    } finally {
      setUpdating(false)
    }
  }

  const canApproveTask = () => {
    if (!user || !task) return false
    return ['manager', 'admin'].includes(user.role) && task.status === 'review'
  }

  const openReviewModal = () => {
    setShowReviewModal(true)
    setCompletionRemarks('')
  }

  const sendForReview = async () => {
    if (!completionRemarks.trim()) {
      alert('Please provide completion remarks before sending for review')
      return
    }

    try {
      setUpdating(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          progress: 100,
          status: 'review',
          approvalStatus: 'pending',
          completionRemarks: completionRemarks
        })
      })

      if (response.ok) {
        alert('Task sent for review successfully')
        setShowReviewModal(false)
        setCompletionRemarks('')
        fetchTaskDetails()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to send task for review')
      }
    } catch (error) {
      console.error('Error sending task for review:', error)
      alert('Failed to send task for review')
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

              {myAssignment?.status === 'accepted' && task.status !== 'completed' && task.status !== 'review' && (
                <>
                  {task.status === 'assigned' && task.approvalStatus !== 'rejected' && (
                    <button
                      onClick={() => updateTaskProgress(10, 'in_progress')}
                      disabled={updating}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                    >
                      <FaPlay className="w-3 h-3 mr-2" />
                      Start Task
                    </button>
                  )}

                  {task.status === 'assigned' && task.approvalStatus === 'rejected' && (
                    <button
                      onClick={openReviewModal}
                      disabled={updating}
                      className="bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                    >
                      <FaCheck className="w-3 h-3 mr-2" />
                      Send for Review
                    </button>
                  )}

                  {task.status === 'in_progress' && (task.progress || 0) < 100 && (
                    <button
                      onClick={() => updateTaskProgress(100, 'in_progress')}
                      disabled={updating}
                      className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                    >
                      <FaCheck className="w-3 h-3 mr-2" />
                      Mark Complete
                    </button>
                  )}

                  {(task.status === 'in_progress' || task.status === 'assigned') && (task.progress || 0) === 100 && (
                    <button
                      onClick={openReviewModal}
                      disabled={updating}
                      className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                    >
                      <FaCheckCircle className="w-3 h-3 mr-2" />
                      Send for Review
                    </button>
                  )}
                </>
              )}

              {/* Manager Approval Buttons */}
              {canApproveTask() && task.approvalStatus === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setApprovalAction('approve')
                      setShowApprovalModal(true)
                    }}
                    disabled={updating}
                    className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                  >
                    <FaCheckCircle className="w-3 h-3 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setApprovalAction('reject')
                      setEstimatedProgress(task.progress || 0)
                      setShowApprovalModal(true)
                    }}
                    disabled={updating}
                    className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                  >
                    <FaPause className="w-3 h-3 mr-2" />
                    Reject
                  </button>
                </>
              )}

              {/* Manager Remark Button */}
              {['manager', 'admin'].includes(user?.role) && (
                <button
                  onClick={() => setShowRemarkModal(true)}
                  disabled={updating}
                  className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-xs sm:text-sm flex items-center"
                >
                  <FaEdit className="w-3 h-3 mr-2" />
                  Add Remark
                </button>
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
            {/* Rejection Alert */}
            {task.approvalStatus === 'rejected' && task.rejectionReason && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start">
                  <FaExclamationTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-red-800 font-semibold text-sm sm:text-base">Task Rejected</h3>
                    <p className="text-red-700 text-xs sm:text-sm mt-1">
                      <strong>Reason:</strong> {task.rejectionReason}
                    </p>
                    <p className="text-red-600 text-xs mt-2">
                      Please review the feedback, make necessary changes, and send the task for review again.
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Approval Status */}
            {task.status === 'completed' && task.approvalStatus && (
              <div className={`p-4 sm:p-6 rounded-lg ${
                task.approvalStatus === 'approved' ? 'bg-green-50 border-2 border-green-200' :
                task.approvalStatus === 'rejected' ? 'bg-red-50 border-2 border-red-200' :
                'bg-yellow-50 border-2 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Approval Status
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                    task.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    task.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.approvalStatus.toUpperCase()}
                  </span>
                </div>

                {task.approvedBy && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {task.approvalStatus === 'approved' ? 'Approved by:' : 'Reviewed by:'}
                    </p>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {task.approvedBy.firstName?.[0]}{task.approvedBy.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {task.approvedBy.firstName} {task.approvedBy.lastName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {task.approvedBy.designation?.levelName && task.approvedBy.designation?.title
                            ? `(${task.approvedBy.designation.levelName}) - ${task.approvedBy.designation.title}`
                            : task.approvedBy.designation?.title || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {task.approvedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        {task.approvalStatus === 'approved' ? 'Approved' : 'Reviewed'} on: {new Date(task.approvedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                )}

                {task.rejectionReason && (
                  <div className="bg-white p-4 rounded-lg border border-red-200 mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">Rejection Reason:</p>
                    <p className="text-sm text-gray-700">{task.rejectionReason}</p>
                  </div>
                )}

                {task.estimatedActualProgress !== undefined && task.estimatedActualProgress !== null && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Estimated Actual Progress:</p>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.estimatedActualProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 min-w-[45px]">
                        {task.estimatedActualProgress}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manager Remarks */}
            {task.managerRemarks && task.managerRemarks.length > 0 && (
              <div className="bg-purple-50 border-2 border-purple-200 p-4 sm:p-6 rounded-lg">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Manager Remarks</h3>
                <div className="space-y-3">
                  {task.managerRemarks.map((remark, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                      <div className="flex items-start space-x-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-600 font-semibold text-xs">
                            {remark.addedBy?.firstName?.[0]}{remark.addedBy?.lastName?.[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {remark.addedBy?.firstName} {remark.addedBy?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(remark.addedAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 ml-11">{remark.remark}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

                        {/* Status Badge */}
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {milestone.status === 'completed' ? '✓ Completed' :
                             milestone.status === 'in_progress' ? 'In Progress' :
                             'Not Started'}
                          </span>
                        </div>

                        {/* Complete Milestone */}
                        {milestone.status !== 'completed' && (
                          completingMilestone === milestone._id ? (
                            <div className="mt-3 p-2 bg-gray-50 rounded">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Completion Remark <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={milestoneCompletionRemark}
                                onChange={(e) => setMilestoneCompletionRemark(e.target.value)}
                                placeholder="Describe what was accomplished in this milestone..."
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
                                rows="3"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => completeMilestone(milestone._id)}
                                  disabled={updating || !milestoneCompletionRemark.trim()}
                                  className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  {updating ? 'Completing...' : 'Mark Complete'}
                                </button>
                                <button
                                  onClick={() => {
                                    setCompletingMilestone(null)
                                    setMilestoneCompletionRemark('')
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
                                setCompletingMilestone(milestone._id)
                                setMilestoneCompletionRemark('')
                              }}
                              className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                              disabled={updating}
                            >
                              <FaCheckCircle className="inline mr-1" />
                              Mark as Complete
                            </button>
                          )
                        )}

                        {/* Completion Info */}
                        {milestone.status === 'completed' && milestone.completionRemark && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs font-medium text-green-800 mb-1">Completion Remark:</p>
                            <p className="text-xs text-green-700">{milestone.completionRemark}</p>
                            {milestone.completedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Completed on {new Date(milestone.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
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
                    max={task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {task?.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Milestone due date cannot exceed task deadline: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
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

        {/* Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve Task' : 'Reject Task'}
              </h3>
              <div className="space-y-4">
                {approvalAction === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Actual Progress
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={estimatedProgress}
                      onChange={(e) => setEstimatedProgress(parseInt(e.target.value))}
                      className="w-full mb-2"
                    />
                    <div className="text-center text-sm font-semibold">{estimatedProgress}%</div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {approvalAction === 'approve' ? 'Remark (Optional)' : 'Reason'}
                    {approvalAction === 'reject' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder={approvalAction === 'approve' ? 'Add a remark...' : 'Explain why this task is being rejected...'}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalModal(false)
                    setApprovalReason('')
                    setEstimatedProgress(0)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproval}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                  disabled={updating || (approvalAction === 'reject' && !approvalReason.trim())}
                >
                  {updating ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manager Remark Modal */}
        {showRemarkModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Manager Remark</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remark <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={managerRemark}
                    onChange={(e) => setManagerRemark(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="Add your remark..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRemarkModal(false)
                    setManagerRemark('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={addManagerRemark}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={updating || !managerRemark.trim()}
                >
                  {updating ? 'Adding...' : 'Add Remark'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send for Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Send Task for Review</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide completion remarks describing what you've accomplished and any important notes for the reviewer.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="5"
                  placeholder="Describe what you've completed, any challenges faced, and any notes for the reviewer..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false)
                    setCompletionRemarks('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={sendForReview}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={updating || !completionRemarks.trim()}
                >
                  {updating ? 'Sending...' : 'Send for Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleBasedAccess>
  )
}
