'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaUserPlus, FaCheckCircle, FaClock, FaListAlt } from 'react-icons/fa'

export default function OnboardingPage() {
  const [onboardings, setOnboardings] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchOnboardings()
  }, [])

  const fetchOnboardings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/onboarding', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setOnboardings(data.data)
      }
    } catch (error) {
      console.error('Fetch onboarding error:', error)
      toast.error('Failed to fetch onboarding records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Onboarding</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage employee onboarding process</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/onboarding/create')}
          className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <FaUserPlus className="w-4 h-4" />
          <span>New Onboarding</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Onboarding</h3>
            <FaListAlt className="text-primary-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">{onboardings.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">In Progress</h3>
            <FaClock className="text-yellow-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">
            {onboardings.filter(o => o.status === 'in-progress').length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed</h3>
            <FaCheckCircle className="text-green-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">
            {onboardings.filter(o => o.status === 'completed').length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</h3>
            <FaClock className="text-orange-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">
            {onboardings.filter(o => o.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Onboarding List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Onboarding Records</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading onboarding records...</p>
          </div>
        ) : onboardings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No onboarding records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {onboardings.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.employee?.employeeCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.assignedTo?.firstName} {record.assignedTo?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${record.completionPercentage || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {record.completionPercentage || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'completed' ? 'bg-green-100 text-green-800' :
                        record.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

