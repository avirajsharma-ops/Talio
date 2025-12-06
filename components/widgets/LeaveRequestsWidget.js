'use client'

import { useRouter } from 'next/navigation'
import { FaCheck, FaTimes } from 'react-icons/fa'

export default function LeaveRequestsWidget({
  leaveRequests = [],
  onApprove,
  onReject
}) {
  const router = useRouter()

  return (
    <div className="rounded-lg p-4 sm:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Leave Requests</h3>
        <button
          onClick={() => router.push('/dashboard/leave/approvals')}
          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          View All
        </button>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No leave requests found</p>
          </div>
        ) : (
          leaveRequests.slice(0, 5).map((request) => (
            <div
              key={request._id}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {request.employee?.firstName?.charAt(0)}{request.employee?.lastName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {request.employee?.firstName} {request.employee?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {request.leaveType?.name} - {request.numberOfDays} day(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                  }`}>
                  {request.status}
                </span>

                {request.status === 'pending' && onApprove && onReject && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onApprove(request._id)}
                      className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                      title="Approve"
                    >
                      <FaCheck className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onReject(request._id)}
                      className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                      title="Reject"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
