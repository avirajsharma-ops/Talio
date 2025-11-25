'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaClock, FaSignInAlt, FaSignOutAlt, FaCalendarAlt } from 'react-icons/fa'

export default function AttendancePage() {
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [user, setUser] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Helper function to safely get employeeId
  const getEmployeeId = (userObj) => {
    if (!userObj) return null
    // Check if employeeId._id exists and is valid
    if (userObj.employeeId?._id && userObj.employeeId._id !== 'undefined') {
      return userObj.employeeId._id
    }
    // Check if employeeId is a direct string and is valid
    if (userObj.employeeId && typeof userObj.employeeId === 'string' && userObj.employeeId !== 'undefined') {
      return userObj.employeeId
    }
    // Fallback to user._id
    if (userObj._id && userObj._id !== 'undefined') {
      return userObj._id
    }
    // Fallback to user.id
    if (userObj.id && userObj.id !== 'undefined') {
      return userObj.id
    }
    return null
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      console.log('📊 User object:', parsedUser)
      console.log('📊 employeeId field:', parsedUser.employeeId)
      console.log('📊 _id field:', parsedUser._id)

      setUser(parsedUser)
      // Handle both object and string formats for employeeId
      const empId = parsedUser.employeeId?._id || parsedUser.employeeId || parsedUser._id
      console.log('📊 Extracted empId:', empId)

      if (empId) {
        fetchTodayAttendance(empId)
        fetchAttendance(empId)
      } else {
        console.error('❌ No valid employee ID found in user object')
        toast.error('Employee ID not found. Please log in again.')
      }
    }
  }, [])

  const fetchTodayAttendance = async (employeeId) => {
    try {
      const token = localStorage.getItem('token')
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(
        `/api/attendance?employeeId=${employeeId}&date=${today}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      const data = await response.json()
      if (data.success && data.data.length > 0) {
        setTodayAttendance(data.data[0])
      }
    } catch (error) {
      console.error('Fetch today attendance error:', error)
    }
  }

  const fetchAttendance = async (employeeId) => {
    try {
      const token = localStorage.getItem('token')
      const date = new Date(selectedDate)
      const month = date.getMonth() + 1
      const year = date.getFullYear()

      const response = await fetch(
        `/api/attendance?employeeId=${employeeId}&month=${month}&year=${year}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      const data = await response.json()
      if (data.success) {
        setAttendance(data.data)
      }
    } catch (error) {
      console.error('Fetch attendance error:', error)
    }
  }

  const handleClockIn = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Get user's location
      let latitude = null
      let longitude = null
      let address = 'Location not available'

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            })
          })

          latitude = position.coords.latitude
          longitude = position.coords.longitude

          // Try to get address from coordinates
          try {
            const geocodeResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const geocodeData = await geocodeResponse.json()
            address = geocodeData.display_name || 'Location detected'
          } catch (geocodeError) {
            console.warn('Geocoding failed:', geocodeError)
            address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }
        } catch (geoError) {
          console.warn('Geolocation error:', geoError)
          toast.error('Location access denied. Please enable location services.')
        }
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: getEmployeeId(user),
          type: 'clock-in',
          latitude,
          longitude,
          address,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Clocked in successfully')
        setTodayAttendance(data.data)
        fetchAttendance(getEmployeeId(user))
      } else {
        toast.error(data.message || 'Failed to clock in')
      }
    } catch (error) {
      console.error('Clock in error:', error)
      toast.error('An error occurred while clocking in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Get user's location
      let latitude = null
      let longitude = null
      let address = 'Location not available'

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            })
          })

          latitude = position.coords.latitude
          longitude = position.coords.longitude

          // Try to get address from coordinates
          try {
            const geocodeResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const geocodeData = await geocodeResponse.json()
            address = geocodeData.display_name || 'Location detected'
          } catch (geocodeError) {
            console.warn('Geocoding failed:', geocodeError)
            address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }
        } catch (geoError) {
          console.warn('Geolocation error:', geoError)
        }
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: getEmployeeId(user),
          type: 'clock-out',
          latitude,
          longitude,
          address,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Clocked out successfully')
        setTodayAttendance(data.data)
        fetchAttendance(getEmployeeId(user))
      } else {
        toast.error(data.message || 'Failed to clock out')
      }
    } catch (error) {
      console.error('Clock out error:', error)
      toast.error('An error occurred while clocking out')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
        <p className="text-gray-600 mt-1">Track your attendance and work hours</p>
      </div>

      {/* Clock In/Out Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Today&apos;s Attendance</h2>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center space-x-2">
                <FaClock className="text-primary-500" />
                <span>Check In: {formatTime(todayAttendance?.checkIn)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaClock className="text-primary-500" />
                <span>Check Out: {formatTime(todayAttendance?.checkOut)}</span>
              </div>
              {todayAttendance?.workHours && (
                <div className="flex items-center space-x-2">
                  <FaClock className="text-green-500" />
                  <span className="font-semibold">
                    Work Hours: {todayAttendance.workHours}h
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleClockIn}
              disabled={loading || (todayAttendance && todayAttendance.checkIn)}
              className="btn-theme-primary flex items-center p-8 space-x-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <FaSignInAlt />
              <span>Clock In</span>
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading || !todayAttendance || !todayAttendance.checkIn || todayAttendance.checkOut}
              className="btn-theme-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed p-8 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <FaSignOutAlt />
              <span>Clock Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Attendance History</h2>
          <div className="flex items-center space-x-2">
            <FaCalendarAlt className="text-gray-400" />
            <input
              type="month"
              value={selectedDate.substring(0, 7)}
              onChange={(e) => {
                setSelectedDate(e.target.value + '-01')
                if (user) {
                  fetchAttendance(getEmployeeId(user))
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.checkIn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.checkOut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.workHours ? `${record.workHours}h` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          record.status === 'half-day' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

