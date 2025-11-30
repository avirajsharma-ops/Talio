'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaCheckCircle, FaTimesCircle, FaUser, FaFileAlt, FaCalendarAlt, FaTag, FaTasks, FaHistory } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ProjectApprovals() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [action, setAction] = useState('')
  const [remarks, setRemarks] = useState('')
  const [processing, setProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')

  useEffect(() => {
    fetchTaskApprovals()
  }, [statusFilter])

  const fetchTaskApprovals = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/approvals?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setTasks(data.data || [])
      } else {
        toast.error(data.message || 'Failed to fetch approvals')
      }
    } catch (error) {
      console.error('Error fetching project approvals:', error)
      toast.error('Failed to fetch project approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (task, actionType) => {
    setSelectedTask(task)
    setAction(actionType)
    setShowModal(true)
  }

  const submitAction = async () => {
    if (!selectedTask || !action) return

    setProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${selectedTask._id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          remarks
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setTasks(tasks.filter(t => t._id !== selectedTask._id))
        setShowModal(false)
        setSelectedTask(null)
        setRemarks('')
        toast.success(`Project ${action} successfully!`)
      } else {
        toast.error(data.message || 'Failed to process project')
      }
    } catch (error) {
      console.error('Error processing project:', error)
      toast.error('An error occurred while processing the project')
    } finally {
      setProcessing(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      review: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-14 md:pb-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-4 sm:p-6 lg:p-8 pb-14 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FaArrowLeft className="h-5 w-5 mr-2" />
            Back to Project Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaTasks className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Project Approvals</h1>
              <p className="text-gray-600 mt-1">
                {statusFilter === 'pending' ? `${tasks.length} pending project ${tasks.length === 1 ? 'approval' : 'approvals'}` :
                 statusFilter === 'completed' ? `${tasks.length} completed ${tasks.length === 1 ? 'project' : 'projects'}` :
                 `${tasks.length} ${tasks.length === 1 ? 'project' : 'projects'}`}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{tasks.filter(t => t.status === 'review').length}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <FaTasks className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.approvalStatus === 'approved').length}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <FaCheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{tasks.filter(t => t.approvalStatus === 'rejected').length}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <FaTimesCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <FaHistory className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === 'pending'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Pending Approvals
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === 'approved'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === 'rejected'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">
              {statusFilter === 'pending' ? 'There are no pending project approvals at the moment.' :
               statusFilter === 'approved' ? 'No approved projects found.' :
               statusFilter === 'rejected' ? 'No rejected projects found.' :
               'No projects found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    {/* Task Title */}
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="bg-purple-100 p-2 rounded-full mt-1">
                        <FaFileAlt className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {task.title}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {task.projectNumber && (
                            <span className="text-sm text-gray-500">#{task.projectNumber}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-900 line-clamp-2">{task.description}</p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {task.progress !== undefined && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium text-gray-900">{task.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Task Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <FaUser className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Assigned by:</span>
                        <span className="font-medium text-gray-900">
                          {task.assignedBy?.firstName} {task.assignedBy?.lastName}
                        </span>
                      </div>
                      {task.priority && (
                        <div className="flex items-center space-x-2 text-sm">
                          <FaTag className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Priority:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center space-x-2 text-sm">
                          <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Due Date:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {task.completionRemarks && (
                        <div className="flex items-start space-x-2 text-sm col-span-2">
                          <FaFileAlt className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-600">Completion Notes:</span>
                          <span className="text-gray-900">{task.completionRemarks}</span>
                        </div>
                      )}
                    </div>

                    {/* Assigned To */}
                    {task.assignedTo && task.assignedTo.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 font-medium mb-2">Assigned To:</p>
                        <div className="flex flex-wrap gap-2">
                          {task.assignedTo.slice(0, 5).map((assigned, index) => (
                            <div key={index} className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-full">
                              <FaUser className="h-3 w-3 text-blue-600" />
                              <span className="text-sm text-blue-900">
                                {assigned.employee?.firstName} {assigned.employee?.lastName}
                              </span>
                              {assigned.role && (
                                <span className="text-xs text-blue-600">({assigned.role})</span>
                              )}
                            </div>
                          ))}
                          {task.assignedTo.length > 5 && (
                            <span className="text-sm text-gray-500">+{task.assignedTo.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {statusFilter === 'pending' && task.status === 'review' && (
                    <div className="flex md:flex-col space-x-3 md:space-x-0 md:space-y-3 mt-4 md:mt-0 md:ml-6" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleAction(task, 'approved')}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg transition-colors"
                      >
                        <FaCheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleAction(task, 'rejected')}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors"
                      >
                        <FaTimesCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                  {task.approvalStatus === 'approved' && (
                    <div className="flex items-center mt-4 md:mt-0 md:ml-6">
                      <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm flex items-center gap-2">
                        <FaCheckCircle className="h-4 w-4" />
                        Approved
                      </span>
                    </div>
                  )}
                  {task.approvalStatus === 'rejected' && (
                    <div className="flex items-center mt-4 md:mt-0 md:ml-6">
                      <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium text-sm flex items-center gap-2">
                        <FaTimesCircle className="h-4 w-4" />
                        Rejected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {action === 'approved' ? 'Approve' : 'Reject'} Project
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to {action === 'approved' ? 'approve' : 'reject'} the project{' '}
              <span className="font-semibold">"{selectedTask?.title}"</span>?
            </p>

            {/* Remarks */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks {action === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={action === 'rejected' ? 'Please provide a reason for rejection' : 'Optional remarks'}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedTask(null)
                  setRemarks('')
                }}
                disabled={processing}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={processing || (action === 'rejected' && !remarks.trim())}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  action === 'approved' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : `Confirm ${action === 'approved' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
