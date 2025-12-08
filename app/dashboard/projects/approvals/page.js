'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  FaArrowLeft, FaCheck, FaTimes, FaTrash, FaProjectDiagram,
  FaClock, FaCheckCircle, FaTimesCircle, FaFilter, FaSpinner,
  FaExclamationTriangle, FaTasks, FaUser, FaCalendarAlt, FaEye
} from 'react-icons/fa'
import { playNotificationSound, NotificationSoundTypes } from '@/lib/notificationSounds'

const requestTypeLabels = {
  'task_deletion': 'Task Deletion',
  'task_completion': 'Task Completion',
  'task_review': 'Task Review',
  'project_completion': 'Project Completion',
  'member_removal': 'Member Removal',
  'all': 'All Types'
}

const requestTypeColors = {
  'task_deletion': 'bg-red-100 text-red-700 border-red-200',
  'task_completion': 'bg-green-100 text-green-700 border-green-200',
  'task_review': 'bg-blue-100 text-blue-700 border-blue-200',
  'project_completion': 'bg-purple-100 text-purple-700 border-purple-200',
  'member_removal': 'bg-orange-100 text-orange-700 border-orange-200'
}

const requestTypeIcons = {
  'task_deletion': FaTrash,
  'task_completion': FaCheckCircle,
  'task_review': FaEye,
  'project_completion': FaProjectDiagram,
  'member_removal': FaUser
}

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'approved': 'bg-green-100 text-green-700',
  'rejected': 'bg-red-100 text-red-700'
}

export default function ApprovalsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [typeStats, setTypeStats] = useState({})
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectComment, setRejectComment] = useState('')

  // Auto-refresh refs
  const refreshIntervalRef = useRef(null)
  const lastFetchRef = useRef(Date.now())

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ status: statusFilter })
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }
      const response = await fetch(`/api/projects/approvals?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setRequests(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.data)) {
            // Play sound if new pending requests arrived
            if (silent && statusFilter === 'pending' && data.data.length > prev.length) {
              playNotificationSound(NotificationSoundTypes.ALERT)
            }
            return data.data
          }
          return prev
        })
        if (data.stats) {
          setStats(data.stats)
        }
        if (data.typeStats) {
          setTypeStats(data.typeStats)
        }
        lastFetchRef.current = Date.now()
      } else if (!silent) {
        toast.error(data.message || 'Failed to fetch requests')
      }
    } catch (error) {
      console.error('Fetch requests error:', error)
      if (!silent) toast.error('An error occurred')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchRequests()
  }, [statusFilter, typeFilter, fetchRequests])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchRequests(true)
    }, 10000)

    const handleFocus = () => {
      if (Date.now() - lastFetchRef.current > 5000) {
        fetchRequests(true)
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchRequests])

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/approvals/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'approve' })
      })

      const data = await response.json()
      if (data.success) {
        playNotificationSound(NotificationSoundTypes.SUCCESS)
        toast.success('Request approved')
        fetchRequests()
      } else {
        playNotificationSound(NotificationSoundTypes.WARNING)
        toast.error(data.message)
      }
    } catch (error) {
      playNotificationSound(NotificationSoundTypes.WARNING)
      toast.error('Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    try {
      setProcessingId(selectedRequest._id)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/approvals/${selectedRequest._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'reject', comment: rejectComment })
      })

      const data = await response.json()
      if (data.success) {
        playNotificationSound(NotificationSoundTypes.UPDATE)
        toast.success('Request rejected')
        setShowRejectModal(false)
        setSelectedRequest(null)
        setRejectComment('')
        fetchRequests()
      } else {
        playNotificationSound(NotificationSoundTypes.WARNING)
        toast.error(data.message)
      }
    } catch (error) {
      playNotificationSound(NotificationSoundTypes.WARNING)
      toast.error('Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Request Approvals</h1>
            <p className="text-gray-500 text-sm">Manage pending requests for your projects</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div 
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            statusFilter === 'pending' ? 'border-yellow-400' : 'border-gray-100 hover:border-yellow-200'
          }`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FaClock className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>
        <div 
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            statusFilter === 'approved' ? 'border-green-400' : 'border-gray-100 hover:border-green-200'
          }`}
          onClick={() => setStatusFilter('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FaCheckCircle className="text-green-600 text-xl" />
            </div>
          </div>
        </div>
        <div 
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            statusFilter === 'rejected' ? 'border-red-400' : 'border-gray-100 hover:border-red-200'
          }`}
          onClick={() => setStatusFilter('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <FaTimesCircle className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Type Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter by Type</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              typeFilter === 'all' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Types
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
              {stats.pending + stats.approved + stats.rejected}
            </span>
          </button>
          {['task_completion', 'task_review', 'task_deletion', 'project_completion', 'member_removal'].map(type => {
            const IconComponent = requestTypeIcons[type]
            const count = typeStats[type] || 0
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  typeFilter === type 
                    ? `${requestTypeColors[type]} border-2` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {IconComponent && <IconComponent className="text-sm" />}
                {requestTypeLabels[type]}
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    typeFilter === type ? 'bg-white/30' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaCheckCircle className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {statusFilter === 'pending' ? 'No pending requests' : `No ${statusFilter} requests`}
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'pending' 
              ? 'All caught up! No requests need your attention right now.'
              : `You don't have any ${statusFilter} requests yet.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request._id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${requestTypeColors[request.type]}`}>
                      {requestTypeLabels[request.type]}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <FaCalendarAlt className="mr-1" />
                    {formatDate(request.createdAt)}
                  </div>
                </div>

                {/* Project Info */}
                <div className="flex items-center gap-2 mb-3">
                  <FaProjectDiagram className="text-gray-400" />
                  <span className="font-medium text-gray-700">{request.project?.name}</span>
                </div>

                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {request.type === 'task_deletion' && request.relatedTask && (
                    <div className="flex items-start gap-3">
                      <FaTasks className="text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-800">{request.relatedTask.title || request.metadata?.taskTitle}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Status: {request.relatedTask.status} • Priority: {request.relatedTask.priority || request.metadata?.taskPriority}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {request.reason && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Requester Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                      {request.requestedBy?.profilePicture ? (
                        <img 
                          src={request.requestedBy.profilePicture} 
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {request.requestedBy?.firstName?.[0]}{request.requestedBy?.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">
                        {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">Requested by</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request._id)}
                        disabled={processingId === request._id}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        {processingId === request._id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaCheck />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request)
                          setShowRejectModal(true)
                        }}
                        disabled={processingId === request._id}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        {processingId === request._id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaTimes />
                        )}
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Reviewed Info */}
                  {request.status !== 'pending' && request.reviewedBy && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                        <span className="font-medium">
                          {request.reviewedBy?.firstName} {request.reviewedBy?.lastName}
                        </span>
                      </p>
                      {request.reviewedAt && (
                        <p className="text-xs text-gray-500">{formatDate(request.reviewedAt)}</p>
                      )}
                      {request.reviewerComment && (
                        <p className="text-sm text-gray-500 mt-1 italic">"{request.reviewerComment}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reject Request</h3>
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to reject this {requestTypeLabels[selectedRequest.type].toLowerCase()} request?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedRequest(null)
                    setRejectComment('')
                  }}
                  className="btn-secondary"
                  disabled={processingId}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingId}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processingId ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
