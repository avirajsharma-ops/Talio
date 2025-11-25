'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaPlane, FaCheckCircle, FaClock } from 'react-icons/fa'

export default function TravelPage() {
  const [travels, setTravels] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        if (parsedUser?.employeeId?._id) {
          fetchTravels(parsedUser.employeeId._id)
        } else {
          console.error('Employee ID not found in user data')
          toast.error('Employee information not found. Please login again.')
          setLoading(false)
        }
      } else {
        console.error('No user data found')
        toast.error('Please login to view travel requests')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      toast.error('Error loading user information. Please login again.')
      setLoading(false)
    }
  }, [])

  const fetchTravels = async (employeeId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/travel?employeeId=${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setTravels(data.data || [])
      } else {
        console.error('API Error:', data.message)
        toast.error(data.message || 'Failed to fetch travel requests')
      }
    } catch (error) {
      console.error('Fetch travel error:', error)
      toast.error('Failed to fetch travel requests')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Travel</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your business travel requests</p>
        </div>
        <button className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto">
          <FaPlus className="w-4 h-4" />
          <span>New Travel Request</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Trips</h3>
            <FaPlane className="text-primary-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">{travels.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Approved</h3>
            <FaCheckCircle className="text-green-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">
            {travels.filter(t => t.status === 'approved').length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
            <FaClock className="text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {travels.filter(t => t.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Travel Requests Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">My Travel Requests</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading travel requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {travels.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No travel requests found
                    </td>
                  </tr>
                ) : (
                  travels.map((travel) => (
                    <tr key={travel._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {travel?.destination || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{travel?.travelMode || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {travel?.startDate ? new Date(travel.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {travel?.endDate ? new Date(travel.endDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {travel?.purpose || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          travel?.status === 'approved' ? 'bg-green-100 text-green-800' :
                          travel?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {travel?.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

