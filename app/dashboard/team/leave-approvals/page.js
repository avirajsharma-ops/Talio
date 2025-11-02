'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaUser, FaFileAlt } from 'react-icons/fa'

export default function LeaveApprovals() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [leaves, setLeaves] = useState([])
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [action, setAction] = useState('')
  const [comments, setComments] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchLeaveApprovals()
  }, [])

  const fetchLeaveApprovals = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/team/leave-approvals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setLeaves(data.data)
      }
    } catch (error) {
      console.error('Error fetching leave approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (leave, actionType) => {
    setSelectedLeave(leave)
    setAction(actionType)
    setShowModal(true)
  }

  const submitAction = async () => {
    if (!selectedLeave || !action) return

    setProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/team/leave-approvals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leaveId: selectedLeave._id,
          action,
          comments
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Remove the leave from the list
        setLeaves(leaves.filter(l => l._id !== selectedLeave._id))
        setShowModal(false)
        setSelectedLeave(null)
        setComments('')
        alert(`Leave request ${action} successfully!`)
      } else {
        alert(data.message || 'Failed to process leave request')
      }
    } catch (error) {
      console.error('Error processing leave:', error)
      alert('An error occurred while processing the leave request')
    } finally {
      setProcessing(false)
    }
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
            onClick={() => router.push('/dashboard/team')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FaArrowLeft className="h-5 w-5 mr-2" />
            Back to Team Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-gray-600 mt-1">
            {leaves.length} pending leave {leaves.length === 1 ? 'request' : 'requests'}
          </p>
        </div>

        {/* Leave Requests List */}
        {leaves.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">There are no pending leave requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div key={leave._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    {/* Employee Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <FaUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {leave.employee?.employeeCode} • {leave.employee?.designation?.title}
                        </p>
                      </div>
                    </div>

                    {/* Leave Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <FaFileAlt className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900">{leave.leaveType?.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-900">{leave.numberOfDays} days</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <FaClock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">From:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <FaClock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">To:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    {leave.reason && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-600 font-medium mb-1">Reason:</p>
                        <p className="text-sm text-gray-900">{leave.reason}</p>
                      </div>
                    )}

                    {/* Application Number */}
                    <p className="text-xs text-gray-500">
                      Application: {leave.applicationNumber} • Applied on {new Date(leave.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex md:flex-col space-x-3 md:space-x-0 md:space-y-3 mt-4 md:mt-0 md:ml-6">
                    <button
                      onClick={() => handleAction(leave, 'approved')}
                      className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg transition-colors"
                    >
                      <FaCheckCircle className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleAction(leave, 'rejected')}
                      className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors"
                    >
                      <FaTimesCircle className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
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
              {action === 'approved' ? 'Approve' : 'Reject'} Leave Request
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to {action === 'approved' ? 'approve' : 'reject'} the leave request from{' '}
              <span className="font-semibold">
                {selectedLeave?.employee?.firstName} {selectedLeave?.employee?.lastName}
              </span>?
            </p>

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {action === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={action === 'rejected' ? 'Please provide a reason for rejection' : 'Optional comments'}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedLeave(null)
                  setComments('')
                }}
                disabled={processing}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={processing || (action === 'rejected' && !comments.trim())}
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

