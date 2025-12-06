'use client'

import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { FaClock, FaSignInAlt, FaSignOutAlt, FaCalendarAlt, FaEdit, FaCheck, FaTimes, FaExclamationCircle, FaPlus, FaChevronLeft, FaChevronRight, FaList, FaTh } from 'react-icons/fa'
import OvertimePrompt, { useOvertimeCheck } from '@/components/OvertimePrompt'

export default function AttendancePage() {
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [user, setUser] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'list'
  
  // Overtime check hook
  const { hasPendingRequest, pendingRequest, refresh: refreshOvertime } = useOvertimeCheck()
  const [showOvertimePrompt, setShowOvertimePrompt] = useState(false)
  
  // Correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [selectedDayForEdit, setSelectedDayForEdit] = useState(null)
  const [correctionForm, setCorrectionForm] = useState({
    correctionType: 'both',
    requestedCheckIn: '',
    requestedCheckOut: '',
    requestedStatus: '',
    reason: ''
  })
  const [submittingCorrection, setSubmittingCorrection] = useState(false)
  
  // My correction requests
  const [myCorrections, setMyCorrections] = useState([])
  const [showMyCorrections, setShowMyCorrections] = useState(false)
  
  // Pending approvals (for admins/HRs/dept heads)
  const [pendingCorrections, setPendingCorrections] = useState([])
  const [showPendingApprovals, setShowPendingApprovals] = useState(false)
  const [canApprove, setCanApprove] = useState(false)
  
  // Missing entry modal
  const [showMissingEntryModal, setShowMissingEntryModal] = useState(false)
  const [missingEntryForm, setMissingEntryForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    reason: ''
  })
  
  // Show overtime prompt when there's a pending request
  useEffect(() => {
    if (hasPendingRequest && pendingRequest) {
      setShowOvertimePrompt(true)
    }
  }, [hasPendingRequest, pendingRequest])

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
      
      // Check if user can approve corrections
      const role = parsedUser.role
      if (['god_admin', 'admin', 'hr', 'department_head', 'manager'].includes(role)) {
        setCanApprove(true)
        fetchPendingCorrections()
      }

      if (empId) {
        fetchTodayAttendance(empId)
        fetchAttendance(empId)
        fetchMyCorrections()
      } else {
        console.error('❌ No valid employee ID found in user object')
        toast.error('Employee ID not found. Please log in again.')
      }
    }
  }, [])

  const fetchMyCorrections = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance/corrections?type=my', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setMyCorrections(data.data)
      }
    } catch (error) {
      console.error('Fetch my corrections error:', error)
    }
  }

  const fetchPendingCorrections = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance/corrections?type=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setPendingCorrections(data.data)
      }
    } catch (error) {
      console.error('Fetch pending corrections error:', error)
    }
  }

  const handleCorrectionRequest = async () => {
    if (!selectedRecord || !correctionForm.reason) {
      toast.error('Please provide a reason for the correction')
      return
    }

    setSubmittingCorrection(true)
    try {
      const token = localStorage.getItem('token')
      
      // Get the date from the selected record (use selectedDayForEdit or record date)
      const recordDate = selectedDayForEdit || selectedRecord.date
      const dateOnly = new Date(recordDate).toISOString().split('T')[0]
      
      // Build the full datetime strings using the record's date and user's time input
      let requestedCheckIn = undefined
      let requestedCheckOut = undefined
      
      if (correctionForm.requestedCheckIn && ['check-in', 'both'].includes(correctionForm.correctionType)) {
        // Combine the record date with the time input
        requestedCheckIn = `${dateOnly}T${correctionForm.requestedCheckIn}:00`
      }
      
      if (correctionForm.requestedCheckOut && ['check-out', 'both'].includes(correctionForm.correctionType)) {
        // Combine the record date with the time input
        requestedCheckOut = `${dateOnly}T${correctionForm.requestedCheckOut}:00`
      }
      
      const response = await fetch('/api/attendance/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attendanceId: selectedRecord._id,
          correctionType: correctionForm.correctionType,
          requestedCheckIn,
          requestedCheckOut,
          requestedStatus: correctionForm.requestedStatus || undefined,
          reason: correctionForm.reason
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Correction request submitted successfully')
        setShowCorrectionModal(false)
        setSelectedRecord(null)
        setSelectedDayForEdit(null)
        setCorrectionForm({ correctionType: 'both', requestedCheckIn: '', requestedCheckOut: '', requestedStatus: '', reason: '' })
        fetchMyCorrections()
      } else {
        toast.error(data.message || 'Failed to submit correction request')
      }
    } catch (error) {
      console.error('Correction request error:', error)
      toast.error('Failed to submit correction request')
    } finally {
      setSubmittingCorrection(false)
    }
  }

  const handleMissingEntryRequest = async () => {
    // Use selectedDayForMissingEntry if available, otherwise use form date
    const dateToUse = selectedDayForMissingEntry || missingEntryForm.date
    
    if (!dateToUse || !missingEntryForm.reason) {
      toast.error('Please provide date and reason')
      return
    }

    setSubmittingCorrection(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: dateToUse,
          correctionType: 'missing-entry',
          requestedCheckIn: missingEntryForm.checkIn ? `${dateToUse}T${missingEntryForm.checkIn}:00` : undefined,
          requestedCheckOut: missingEntryForm.checkOut ? `${dateToUse}T${missingEntryForm.checkOut}:00` : undefined,
          reason: missingEntryForm.reason
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Missing entry request submitted successfully')
        setShowMissingEntryModal(false)
        setSelectedDayForMissingEntry(null)
        setMissingEntryForm({ date: '', checkIn: '', checkOut: '', reason: '' })
        fetchMyCorrections()
      } else {
        toast.error(data.message || 'Failed to submit request')
      }
    } catch (error) {
      console.error('Missing entry request error:', error)
      toast.error('Failed to submit request')
    } finally {
      setSubmittingCorrection(false)
    }
  }

  const handleApproveReject = async (correctionId, action, comments = '') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance/corrections', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          correctionId,
          action,
          reviewerComments: comments
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Correction ${action}d successfully`)
        fetchPendingCorrections()
        fetchMyCorrections()
        // Refresh attendance data to show updated values after approval
        if (user && action === 'approve') {
          fetchAttendance(getEmployeeId(user))
          fetchTodayAttendance(getEmployeeId(user))
        }
      } else {
        toast.error(data.message || `Failed to ${action} correction`)
      }
    } catch (error) {
      console.error(`${action} correction error:`, error)
      toast.error(`Failed to ${action} correction`)
    }
  }

  // Helper function to format datetime for input (preserves local time)
  const formatDateTimeForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    // Format as YYYY-MM-DDTHH:MM in local time
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Helper function to format time only for input (HH:MM)
  const formatTimeForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // State to track selected day for missing entry
  const [selectedDayForMissingEntry, setSelectedDayForMissingEntry] = useState(null)

  const openCorrectionModal = (record) => {
    setSelectedRecord(record)
    setSelectedDayForEdit(record.date) // Store the date for the correction
    setCorrectionForm({
      correctionType: 'both',
      requestedCheckIn: formatTimeForInput(record.checkIn),
      requestedCheckOut: formatTimeForInput(record.checkOut),
      requestedStatus: record.status,
      reason: ''
    })
    setShowCorrectionModal(true)
  }

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

  const fetchAttendance = async (employeeId, monthDate = currentMonth) => {
    try {
      const token = localStorage.getItem('token')
      const month = monthDate.getMonth() + 1
      const year = monthDate.getFullYear()

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

  // Calendar navigation
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    setCurrentMonth(newMonth)
    if (user) {
      fetchAttendance(getEmployeeId(user), newMonth)
    }
  }

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    setCurrentMonth(newMonth)
    if (user) {
      fetchAttendance(getEmployeeId(user), newMonth)
    }
  }

  // Helper to format date as YYYY-MM-DD in local timezone (for use outside useMemo)
  const getLocalDateKeyHelper = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Create pending corrections lookup map by date and attendance ID
  const pendingCorrectionsMap = useMemo(() => {
    const map = { byDate: {}, byAttendanceId: {} }
    myCorrections.forEach(correction => {
      if (correction.status === 'pending') {
        // Map by date
        if (correction.date) {
          const dateKey = getLocalDateKeyHelper(new Date(correction.date))
          map.byDate[dateKey] = correction
        }
        // Map by attendance ID
        if (correction.attendance?._id || correction.attendance) {
          const attendanceId = correction.attendance?._id || correction.attendance
          map.byAttendanceId[attendanceId] = correction
        }
      }
    })
    return map
  }, [myCorrections])

  // Helper to check if a day has a pending correction
  const getPendingCorrectionForDay = (dayData) => {
    if (!dayData) return null
    // Check by attendance ID first
    if (dayData.record?._id && pendingCorrectionsMap.byAttendanceId[dayData.record._id]) {
      return pendingCorrectionsMap.byAttendanceId[dayData.record._id]
    }
    // Check by date
    if (dayData.date && pendingCorrectionsMap.byDate[dayData.date]) {
      return pendingCorrectionsMap.byDate[dayData.date]
    }
    return null
  }

  // Helper to check if a record has a pending correction
  const getPendingCorrectionForRecord = (record) => {
    if (!record) return null
    // Check by attendance ID
    if (record._id && pendingCorrectionsMap.byAttendanceId[record._id]) {
      return pendingCorrectionsMap.byAttendanceId[record._id]
    }
    // Check by date
    if (record.date) {
      const dateKey = getLocalDateKeyHelper(new Date(record.date))
      if (pendingCorrectionsMap.byDate[dateKey]) {
        return pendingCorrectionsMap.byDate[dateKey]
      }
    }
    return null
  }

  // Calendar data generation
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    // Helper to format date as YYYY-MM-DD in local timezone
    const getLocalDateKey = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    // Get today's date in local format
    const todayKey = getLocalDateKey(new Date())

    // Create attendance lookup map
    const attendanceMap = {}
    attendance.forEach(record => {
      const recordDate = new Date(record.date)
      const dateKey = getLocalDateKey(recordDate)
      attendanceMap[dateKey] = record
    })

    const days = []
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null, record: null })
    }
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = getLocalDateKey(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      days.push({
        day,
        date: dateKey,
        record: attendanceMap[dateKey] || null,
        isToday: dateKey === todayKey,
        isFuture: date > today
      })
    }

    return days
  }, [currentMonth, attendance])

  // Get status color for calendar cell
  const getStatusColor = (record, isFuture) => {
    if (isFuture) return 'bg-gray-50'
    if (!record) return 'bg-gray-100/80' // No record - potentially absent
    switch (record.status) {
      case 'present': return 'bg-green-100/70'
      case 'in-progress': return 'bg-orange-100/70'
      case 'half-day': return 'bg-yellow-100/70'
      case 'late': return 'bg-amber-100/70'
      case 'absent': return 'bg-red-100/70'
      case 'on-leave': return 'bg-blue-100/70'
      case 'holiday': return 'bg-purple-100/70'
      default: return 'bg-gray-100/70'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-700'
      case 'in-progress': return 'text-orange-700'
      case 'half-day': return 'text-yellow-700'
      case 'late': return 'text-amber-700'
      case 'absent': return 'text-red-700'
      case 'on-leave': return 'text-blue-700'
      case 'holiday': return 'text-purple-700'
      default: return 'text-gray-700'
    }
  }

  const openDayEditModal = (dayData) => {
    if (dayData.isFuture) return
    if (dayData.record) {
      openCorrectionModal(dayData.record)
    } else {
      // No record - open missing entry modal for this date
      setSelectedDayForMissingEntry(dayData.date)
      setMissingEntryForm({
        date: dayData.date,
        checkIn: '',
        checkOut: '',
        reason: ''
      })
      setShowMissingEntryModal(true)
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
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your attendance and work hours</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowMissingEntryModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <FaPlus />
            <span>Report Missing Entry</span>
          </button>
          <button
            onClick={() => setShowMyCorrections(!showMyCorrections)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FaEdit />
            <span>My Requests ({myCorrections.length})</span>
          </button>
          {canApprove && pendingCorrections.length > 0 && (
            <button
              onClick={() => setShowPendingApprovals(!showPendingApprovals)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <FaExclamationCircle />
              <span>Pending Approvals ({pendingCorrections.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Approvals Section (for admins/HRs/dept heads) */}
      {showPendingApprovals && pendingCorrections.length > 0 && (
        <div className="bg-purple-50 rounded-lg shadow-md p-6 mb-6 border border-purple-200">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">Pending Correction Approvals</h2>
          <div className="space-y-4">
            {pendingCorrections.map((correction) => (
              <div key={correction._id} className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {correction.employee?.firstName} {correction.employee?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Date: {formatDate(correction.date)} | Type: {correction.correctionType}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong>Current:</strong> {formatTime(correction.currentCheckIn)} - {formatTime(correction.currentCheckOut)} ({correction.currentStatus})
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>Requested:</strong> {correction.requestedCheckIn ? formatTime(correction.requestedCheckIn) : 'N/A'} - {correction.requestedCheckOut ? formatTime(correction.requestedCheckOut) : 'N/A'} {correction.requestedStatus ? `(${correction.requestedStatus})` : ''}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 italic">&quot;{correction.reason}&quot;</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveReject(correction._id, 'approve')}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      title="Approve"
                    >
                      <FaCheck />
                    </button>
                    <button
                      onClick={() => {
                        const comment = prompt('Reason for rejection (optional):')
                        handleApproveReject(correction._id, 'reject', comment || '')
                      }}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      title="Reject"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Correction Requests */}
      {showMyCorrections && (
        <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">My Correction Requests</h2>
          {myCorrections.length === 0 ? (
            <p className="text-gray-500">No correction requests submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {myCorrections.map((correction) => (
                <div key={correction._id} className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{formatDate(correction.date)}</p>
                      <p className="text-sm text-gray-600">Type: {correction.correctionType}</p>
                      <p className="text-sm text-gray-500 italic">&quot;{correction.reason}&quot;</p>
                    </div>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      correction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      correction.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {correction.status}
                    </span>
                  </div>
                  {correction.reviewerComments && (
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>Reviewer:</strong> {correction.reviewerComments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Attendance History - Calendar & List View */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">My Attendance - {user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500 mt-1">Click on any day to edit or report missing entry</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FaTh className="w-4 h-4" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FaList className="w-4 h-4" />
                <span>List</span>
              </button>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <FaChevronLeft />
              </button>
              <span className="text-lg font-medium text-gray-800 min-w-[140px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-400"></div>
            <span className="text-xs text-gray-600">Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-400"></div>
            <span className="text-xs text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-400"></div>
            <span className="text-xs text-gray-600">Half Day</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400"></div>
            <span className="text-xs text-gray-600">Late</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-400"></div>
            <span className="text-xs text-gray-600">Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-400"></div>
            <span className="text-xs text-gray-600">On Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-400"></div>
            <span className="text-xs text-gray-600">Holiday</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
            <span className="text-xs text-gray-600">No Record</span>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="overflow-x-auto overflow-y-visible p-2 -m-2">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((dayData, index) => {
                const pendingCorrection = dayData.day ? getPendingCorrectionForDay(dayData) : null
                const hasPending = !!pendingCorrection
                
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] p-2 rounded-lg transition-all
                      ${dayData.day === null ? 'bg-transparent' : 
                        `${getStatusColor(dayData.record, dayData.isFuture)} ${!dayData.isFuture && !hasPending ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`
                      }
                      ${dayData.isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                      ${hasPending ? 'bg-yellow-50/50' : ''}
                    `}
                    onClick={() => dayData.day && !hasPending && openDayEditModal(dayData)}
                  >
                    {dayData.day && (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-bold ${dayData.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                            {dayData.day}
                          </span>
                          {!dayData.isFuture && (
                            hasPending ? (
                              <span 
                                className="px-1.5 py-0.5 text-[9px] font-semibold bg-yellow-100 text-yellow-700 rounded border border-yellow-300"
                                title="Correction request pending"
                              >
                                Pending
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDayEditModal(dayData)
                                }}
                                className="p-1 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600"
                                title="Edit"
                              >
                                <FaEdit className="w-3 h-3" />
                              </button>
                            )
                          )}
                        </div>
                        
                        {dayData.record ? (
                          <div className="space-y-1">
                            <span className={`text-xs font-medium capitalize ${getStatusTextColor(dayData.record.status)}`}>
                              {dayData.record.status === 'in-progress' ? 'In Progress' : dayData.record.status}
                            </span>
                            <div className="text-[10px] text-gray-500">
                              {dayData.record.checkIn && (
                                <div>In: {formatTime(dayData.record.checkIn)}</div>
                              )}
                              {dayData.record.checkOut && (
                                <div>Out: {formatTime(dayData.record.checkOut)}</div>
                              )}
                              {dayData.record.workHours && (
                                <div className="font-medium">{dayData.record.workHours}h</div>
                              )}
                            </div>
                            {hasPending && (
                              <div className="text-[9px] text-yellow-600 font-medium mt-1">
                                Edit requested
                              </div>
                            )}
                          </div>
                        ) : !dayData.isFuture ? (
                          <div className="text-xs text-gray-400 mt-1">
                            {hasPending ? (
                              <span className="text-yellow-600">Entry requested</span>
                            ) : (
                              'No record'
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No attendance records found for this month
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => {
                    const pendingCorrection = getPendingCorrectionForRecord(record)
                    const hasPending = !!pendingCorrection
                    
                    return (
                      <tr key={record._id} className={`hover:bg-gray-50 ${hasPending ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(record.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(record.checkIn)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(record.checkOut)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.workHours ? `${record.workHours}h` : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'half-day' ? 'bg-yellow-100 text-yellow-800' :
                            record.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                            record.status === 'late' ? 'bg-amber-100 text-amber-800' :
                            record.status === 'on-leave' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status === 'in-progress' ? 'In Progress' : record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasPending ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium border border-yellow-300">
                              <FaClock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => openCorrectionModal(record)}
                              className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              title="Request Correction"
                            >
                              <FaEdit />
                              <span className="text-sm">Correct</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Monthly Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {attendance.filter(r => r.status === 'present').length}
              </p>
              <p className="text-sm text-green-700">Present Days</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {attendance.filter(r => r.status === 'absent').length}
              </p>
              <p className="text-sm text-red-700">Absent Days</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {attendance.filter(r => r.status === 'late').length}
              </p>
              <p className="text-sm text-amber-700">Late Days</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {attendance.filter(r => r.status === 'half-day').length}
              </p>
              <p className="text-sm text-yellow-700">Half Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Correction Request Modal */}
      {showCorrectionModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Request Attendance Correction</h3>
            
            {/* Display the date from selectedRecord - not editable */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-blue-800">
                <FaCalendarAlt className="inline mr-2" />
                Date: {formatDate(selectedRecord.date)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Current: {formatTime(selectedRecord.checkIn)} - {formatTime(selectedRecord.checkOut)} ({selectedRecord.status})
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correction Type</label>
                <select
                  value={correctionForm.correctionType}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="check-in">Check-In Time</option>
                  <option value="check-out">Check-Out Time</option>
                  <option value="both">Both Times</option>
                  <option value="status">Status Only</option>
                </select>
              </div>

              {['check-in', 'both'].includes(correctionForm.correctionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Check-In Time</label>
                  <input
                    type="time"
                    value={correctionForm.requestedCheckIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedCheckIn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {['check-out', 'both'].includes(correctionForm.correctionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Check-Out Time</label>
                  <input
                    type="time"
                    value={correctionForm.requestedCheckOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedCheckOut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {correctionForm.correctionType === 'status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Status</label>
                  <select
                    value={correctionForm.requestedStatus}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="present">Present</option>
                    <option value="half-day">Half Day</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Correction *</label>
                <textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="Please explain why this correction is needed..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCorrectionModal(false)
                  setSelectedRecord(null)
                  setSelectedDayForEdit(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrectionRequest}
                disabled={submittingCorrection || !correctionForm.reason}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submittingCorrection ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Entry Modal */}
      {showMissingEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Report Missing Entry</h3>
            <p className="text-sm text-gray-600 mb-4">Submit a request to add attendance for a day you forgot to clock in/out.</p>
            
            <div className="space-y-4">
              {/* Show date as read-only info box when selected from calendar */}
              {selectedDayForMissingEntry ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-800">
                    <FaCalendarAlt className="inline mr-2" />
                    Date: {formatDate(selectedDayForMissingEntry)}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={missingEntryForm.date}
                    onChange={(e) => setMissingEntryForm({ ...missingEntryForm, date: e.target.value })}
                    max={formatDateLocal(new Date())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-In Time</label>
                <input
                  type="time"
                  value={missingEntryForm.checkIn}
                  onChange={(e) => setMissingEntryForm({ ...missingEntryForm, checkIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-Out Time</label>
                <input
                  type="time"
                  value={missingEntryForm.checkOut}
                  onChange={(e) => setMissingEntryForm({ ...missingEntryForm, checkOut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={missingEntryForm.reason}
                  onChange={(e) => setMissingEntryForm({ ...missingEntryForm, reason: e.target.value })}
                  placeholder="Why did you miss clocking in/out?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowMissingEntryModal(false)
                  setSelectedDayForMissingEntry(null)
                  setMissingEntryForm({ date: '', checkIn: '', checkOut: '', reason: '' })
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleMissingEntryRequest}
                disabled={submittingCorrection || (!selectedDayForMissingEntry && !missingEntryForm.date) || !missingEntryForm.reason}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {submittingCorrection ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Prompt Modal */}
      {showOvertimePrompt && (
        <OvertimePrompt
          userId={user?._id}
          onClose={() => {
            setShowOvertimePrompt(false)
            refreshOvertime()
          }}
          onResponse={(isOvertime, data) => {
            if (!isOvertime && data?.checkOutTime) {
              // Refresh attendance data if user was clocked out
              if (user) {
                fetchAttendance(getEmployeeId(user))
                fetchTodayAttendance(getEmployeeId(user))
              }
            }
          }}
        />
      )}
    </div>
  )
}

