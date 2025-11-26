'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FaDesktop, FaClock, FaChartBar, FaEye, FaCalendar, FaSpinner, FaSearch, FaBuilding, FaUser, FaStar, FaTimes, FaImage, FaArrowLeft } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ProductivityMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [monitoringLogs, setMonitoringLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [portalContainer, setPortalContainer] = useState(null)

  // Set up portal container on mount
  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  // Fetch current user from localStorage (same pattern as chat-history)
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      console.log('[Productivity Monitoring] Current user:', user)
      console.log('[Productivity Monitoring] User role:', user.role)
      setCurrentUser(user)
    } else {
      console.log('[Productivity Monitoring] No user data found in localStorage')
      setLoading(false)
    }
  }, [])

  // Determine if user can view all employees
  const canViewAllEmployees = useCallback(() => {
    if (!currentUser) return false
    return ['admin', 'god_admin', 'hr', 'department_head'].includes(currentUser.role)
  }, [currentUser])

  // Fetch employees for admin/department head view
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!currentUser) return

      console.log('[Productivity Monitoring] canViewAllEmployees:', canViewAllEmployees())
      console.log('[Productivity Monitoring] Current user role:', currentUser.role)

      if (!canViewAllEmployees()) {
        // Regular employee - load their own monitoring directly
        console.log('[Productivity Monitoring] Regular employee - loading own history')
        setLoading(true)
        const empId = currentUser.employeeId?._id || currentUser.employeeId
        console.log('[Productivity Monitoring] Employee ID for own history:', empId)
        await fetchMonitoringLogs(empId)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        console.log('[Productivity Monitoring] Fetching employees for admin/dept head view')

        // Fetch all employees (same pattern as chat-history)
        const response = await fetch('/api/employees?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        console.log('[Productivity Monitoring] Employees API response:', data.success, 'count:', data.data?.length)

        if (data.success) {
          const rawEmployees = data.data || []

          let employeeList = rawEmployees.map(emp => ({
            _id: emp._id, // Use employee _id directly for monitoring API
            employeeId: emp._id,
            userId: emp.userId?._id,
            name: `${emp.firstName} ${emp.lastName}`,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            department: emp.department,
            designation: emp.designation,
            profilePicture: emp.profilePicture,
            isCurrentUser: false
          }))

          console.log('[Productivity Monitoring] Employee list count before filtering:', employeeList.length)

          // For department heads, filter to only show team members
          if (currentUser.role === 'department_head') {
            console.log('[Productivity Monitoring] Department head - fetching team members')
            const teamResponse = await fetch('/api/team/members', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            const teamData = await teamResponse.json()
            console.log('[Productivity Monitoring] Team members response:', teamData.success, 'count:', teamData.data?.length)

            if (teamData.success && teamData.data) {
              const teamEmployeeIds = teamData.data.map(m => m._id?.toString())
              console.log('[Productivity Monitoring] Team employee IDs:', teamEmployeeIds)
              employeeList = employeeList.filter(emp =>
                teamEmployeeIds.includes(emp.employeeId?.toString())
              )
              console.log('[Productivity Monitoring] Filtered employee list count:', employeeList.length)
            }
          }

          // Create current user's card - use firstName/lastName if available
          const currentUserName = currentUser.firstName && currentUser.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.name || currentUser.email?.split('@')[0] || 'You'

          // Get current user's employeeId for monitoring API
          const currentUserEmployeeId = currentUser.employeeId?._id || currentUser.employeeId

          const currentUserCard = {
            _id: currentUserEmployeeId || currentUser.id, // Use employeeId for monitoring API
            employeeId: currentUserEmployeeId,
            userId: currentUser.id,
            name: currentUserName,
            email: currentUser.email,
            department: currentUser.department || null,
            designation: currentUser.designation || null,
            profilePicture: currentUser.profilePicture || null,
            isCurrentUser: true
          }

          console.log('[Productivity Monitoring] Current user card:', currentUserCard)

          // Filter out current user from the list if they're already there
          const currentUserIdStr = currentUser.id?.toString()
          const currentUserEmpIdStr = currentUserEmployeeId?.toString()

          employeeList = employeeList.filter(emp => {
            const isDuplicate =
              emp.userId?.toString() === currentUserIdStr ||
              emp.email === currentUser.email ||
              emp.employeeId?.toString() === currentUserEmpIdStr
            return !isDuplicate
          })

          console.log('[Productivity Monitoring] Final employee list count (excluding current user):', employeeList.length)

          // Add current user at the beginning
          setEmployees([currentUserCard, ...employeeList])
        } else {
          console.error('[Productivity Monitoring] Failed to load employees:', data.message)
          toast.error(data.message || 'Failed to load employees')
        }
      } catch (error) {
        console.error('[Productivity Monitoring] Error fetching employees:', error)
        toast.error('Failed to load employees')
      } finally {
        setLoading(false)
      }
    }

    if (currentUser) {
      fetchEmployees()
    }
  }, [currentUser, canViewAllEmployees])

  // Fetch monitoring logs for a specific employee
  const fetchMonitoringLogs = async (employeeId) => {
    console.log('[Productivity Monitoring] Fetching logs for employee ID:', employeeId)
    try {
      const token = localStorage.getItem('token')
      const url = employeeId
        ? `/api/maya/screen-monitor/history?employeeId=${employeeId}&includeScreenshot=true`
        : '/api/maya/screen-monitor/history?includeScreenshot=true'

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      console.log('[Productivity Monitoring] Monitoring logs response:', data.success, 'logs count:', data.logs?.length)

      if (data.success) {
        setMonitoringLogs(data.logs || [])
      } else {
        console.error('[Productivity Monitoring] Failed to fetch logs:', data.error)
        setMonitoringLogs([])
      }
    } catch (error) {
      console.error('[Productivity Monitoring] Error fetching monitoring logs:', error)
      setMonitoringLogs([])
    }
  }

  // View employee's monitoring history
  const viewEmployeeMonitoring = async (employee) => {
    console.log('[Productivity Monitoring] Viewing employee:', employee.name, 'ID:', employee._id, 'employeeId:', employee.employeeId)
    setSelectedEmployee(employee)
    setLoading(true)
    // Use employeeId field if available, otherwise fallback to _id
    const idToFetch = employee.employeeId || employee._id
    await fetchMonitoringLogs(idToFetch)
    setLoading(false)
  }

  // Back to employees list
  const backToEmployees = () => {
    setSelectedEmployee(null)
    setMonitoringLogs([])
  }

  // Open screenshot modal
  const openScreenshotModal = useCallback((log) => {
    setSelectedLog(log)
    setIsModalOpen(true)
    setIsModalClosing(false)
  }, [])

  // Close screenshot modal
  const closeScreenshotModal = useCallback(() => {
    setIsModalClosing(true)
    setTimeout(() => {
      setSelectedLog(null)
      setIsModalOpen(false)
      setIsModalClosing(false)
    }, 200)
  }, [])

  // Filter employees by search
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.department?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Get productivity color
  const getProductivityColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Render screenshot modal
  const renderModal = () => {
    if (!isModalOpen || !selectedLog || !portalContainer) return null

    return createPortal(
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-200 ease-out ${
          isModalClosing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          zIndex: 2147483649,
          backgroundColor: isModalClosing ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.7)',
          backdropFilter: isModalClosing ? 'blur(0px)' : 'blur(4px)',
          WebkitBackdropFilter: isModalClosing ? 'blur(0px)' : 'blur(4px)',
          transition: 'background-color 200ms ease-out, backdrop-filter 200ms ease-out, opacity 200ms ease-out'
        }}
        onClick={closeScreenshotModal}
      >
        <div
          className={`bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-200 ease-out ${
            isModalClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Productivity Capture Details</h2>
              <p className="text-sm text-gray-500">{formatTimestamp(selectedLog.createdAt)}</p>
            </div>
            <button
              onClick={closeScreenshotModal}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Screenshot Image */}
            {selectedLog.screenshot?.data ? (
              <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={`data:${selectedLog.screenshot.mimeType || 'image/png'};base64,${selectedLog.screenshot.data}`}
                  alt="Screen capture"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="mb-6 bg-gray-100 rounded-lg p-12 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <FaDesktop className="text-6xl mx-auto mb-4" />
                  <p>No screenshot available</p>
                </div>
              </div>
            )}

            {/* Analysis Info */}
            {selectedLog.analysis && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                  <p className="text-gray-600">{selectedLog.analysis.summary || 'No summary available'}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Activity</p>
                    <p className="text-lg font-bold text-blue-900">{selectedLog.analysis.activity || 'N/A'}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">Productivity</p>
                    <p className="text-lg font-bold text-purple-900 capitalize">{selectedLog.analysis.productivityLevel || 'N/A'}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Applications</p>
                    <p className="text-lg font-bold text-green-900">{selectedLog.analysis.applications?.length || 0}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-yellow-600 font-medium">Status</p>
                    <p className="text-lg font-bold text-yellow-900 capitalize">{selectedLog.status || 'N/A'}</p>
                  </div>
                </div>

                {selectedLog.analysis.applications?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Detected Applications</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.analysis.applications.map((app, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Request Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Requested By:</span>
                <span className="ml-2 font-medium text-gray-800">{selectedLog.requestedByName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Target Employee:</span>
                <span className="ml-2 font-medium text-gray-800">{selectedLog.targetEmployeeName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Department:</span>
                <span className="ml-2 font-medium text-gray-800">{selectedLog.targetDepartmentName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Reason:</span>
                <span className="ml-2 font-medium text-gray-800">{selectedLog.reason || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>,
      portalContainer
    )
  }

  // Render monitoring logs timeline
  const renderMonitoringTimeline = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        </div>
      )
    }

    if (monitoringLogs.length === 0) {
      return (
        <div className="text-center py-16">
          <FaDesktop className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Productivity History</h3>
          <p className="text-gray-500">No productivity captures have been recorded yet.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {monitoringLogs.map((log) => (
          <div
            key={log._id}
            onClick={() => openScreenshotModal(log)}
            className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 hover:border-indigo-300"
          >
            {/* Screenshot Thumbnail */}
            <div className="w-full sm:w-48 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {log.screenshot?.data ? (
                <img
                  src={`data:${log.screenshot.mimeType || 'image/png'};base64,${log.screenshot.data}`}
                  alt="Screenshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaDesktop className="text-4xl text-gray-400" />
              )}
            </div>

            {/* Log Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {log.analysis?.activity || 'Productivity Capture'}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProductivityColor(log.analysis?.productivityLevel)}`}>
                  {log.analysis?.productivityLevel || 'Pending'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {log.analysis?.summary || 'Analysis pending...'}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <FaClock className="text-indigo-500" />
                  <span>{formatTimestamp(log.createdAt)}</span>
                </div>
                {log.analysis?.applications?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <FaDesktop className="text-green-500" />
                    <span>{log.analysis.applications.slice(0, 2).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* View Button */}
            <div className="flex items-center">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <FaImage />
                <span>View</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ============ Main Return ============

  // Loading state
  if (loading && !currentUser) {
    return (
      <div className="p-3 sm:p-6 pb-20 md:pb-6 flex items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
      </div>
    )
  }

  // Regular employee - show their own monitoring directly
  if (!canViewAllEmployees()) {
    return (
      <div className="p-3 sm:p-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaDesktop className="text-indigo-600" />
            My Productivity History
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            View your productivity monitoring and activity history
          </p>
        </div>

        {/* Monitoring Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {renderMonitoringTimeline()}
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <FaEye className="text-blue-600 text-xl flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Privacy Notice</h3>
              <p className="text-sm text-blue-800">
                Productivity monitoring captures periodic screenshots to track activity and application usage.
                All data is securely stored and only accessible to authorized personnel.
              </p>
            </div>
          </div>
        </div>

        {renderModal()}
      </div>
    )
  }

  // Admin/Department Head - show employee cards or selected employee's history
  return (
    <div className="p-3 sm:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FaDesktop className="text-indigo-600" />
          {selectedEmployee ? `${selectedEmployee.name}'s Productivity History` : 'Team Productivity Monitoring'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {selectedEmployee
            ? 'View productivity monitoring history and activity data'
            : 'View productivity monitoring history for all team members'}
        </p>
      </div>

      {selectedEmployee ? (
        // Selected employee's monitoring history view
        <>
          {/* Back Button */}
          <button
            onClick={backToEmployees}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-6 text-gray-700"
          >
            <FaArrowLeft className="text-gray-500" />
            <span>Back to Employees</span>
          </button>

          {/* Employee Info Card */}
          <div className={`rounded-lg shadow-md p-6 mb-6 ${
            selectedEmployee.isCurrentUser
              ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-400'
              : 'bg-white'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                selectedEmployee.isCurrentUser
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-700'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                {selectedEmployee.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedEmployee.isCurrentUser ? 'You' : selectedEmployee.name}
                </h2>
                <p className="text-gray-500">{selectedEmployee.email}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <FaBuilding className="text-gray-400" />
                    {selectedEmployee.department?.name || 'No Department'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaUser className="text-gray-400" />
                    {selectedEmployee.designation?.title || 'No Designation'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monitoring Timeline */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaClock className="text-indigo-600" />
              Activity Timeline
            </h3>
            {renderMonitoringTimeline()}
          </div>
        </>
      ) : (
        // Employee cards grid view
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Employee Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner className="animate-spin text-4xl text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee._id}
                  onClick={() => viewEmployeeMonitoring(employee)}
                  className={`rounded-lg shadow hover:shadow-lg transition-all cursor-pointer flex flex-col ${
                    employee.isCurrentUser
                      ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-400 hover:border-indigo-600'
                      : 'bg-white border border-gray-200 hover:border-indigo-500'
                  }`}
                >
                  <div className="p-6 flex-1">
                    {employee.isCurrentUser && (
                      <div className="flex items-center gap-2 mb-3 text-indigo-600">
                        <FaStar className="text-sm" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Your History</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                        employee.isCurrentUser
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-700 ring-4 ring-indigo-200'
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                      }`}>
                        {employee.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${employee.isCurrentUser ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {employee.isCurrentUser ? 'You' : (employee.name || 'Unknown')}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaBuilding className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{employee.department?.name || 'No Department'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaUser className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{employee.designation?.title || 'No Designation'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Button aligned to bottom */}
                  <div className="px-6 pb-6">
                    <button className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      employee.isCurrentUser
                        ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}>
                      <FaDesktop />
                      <span>{employee.isCurrentUser ? 'View My Productivity' : 'View Productivity'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredEmployees.length === 0 && !loading && (
            <div className="text-center py-16">
              <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Employees Found</h3>
              <p className="text-gray-500">Try adjusting your search criteria.</p>
            </div>
          )}
        </>
      )}

      {/* Privacy Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <FaEye className="text-blue-600 text-xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-1">Privacy Notice</h3>
            <p className="text-sm text-blue-800">
              Productivity monitoring captures periodic screenshots to track activity and application usage.
              All data is securely stored and only accessible to authorized personnel.
            </p>
          </div>
        </div>
      </div>

      {renderModal()}
    </div>
  )
}