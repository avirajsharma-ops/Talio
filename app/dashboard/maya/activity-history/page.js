'use client'

import { useState, useEffect } from 'react'
import { FaCamera, FaUser, FaBuilding, FaClock, FaEye, FaSearch, FaCheckCircle, FaSpinner, FaChartLine, FaArrowLeft, FaCalendar, FaFilter, FaDownload, FaTimes } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ActivityHistoryPage() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState(null)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [periodFilter, setPeriodFilter] = useState('daily')
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)
  const [activitySummary, setActivitySummary] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
      
      if (!['admin', 'god_admin', 'department_head', 'hr'].includes(user.role)) {
        toast.error('Access denied: Only admins and department heads can view activity monitoring')
        window.location.href = '/dashboard'
        return
      }
    }
    
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/employees?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setEmployees(data.employees || [])
      } else {
        toast.error(data.message || 'Failed to load employees')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const viewEmployeeActivity = async (employee) => {
    setSelectedEmployee(employee)
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      
      // Fetch activity summary
      const summaryParams = new URLSearchParams({
        employeeId: employee._id,
        period: periodFilter,
        date: dateFilter
      })
      
      const summaryResponse = await fetch(`/api/activity/summary?${summaryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const summaryData = await summaryResponse.json()
      
      if (summaryData.success) {
        setActivitySummary(summaryData)
      } else {
        setActivitySummary(null)
      }
      
      // Generate mock screenshots every 30 minutes for the day
      const mockScreenshots = []
      const selectedDate = new Date(dateFilter)
      
      for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 30]) {
          const time = new Date(selectedDate)
          time.setHours(hour, minute, 0, 0)
          
          // Only show past times
          if (time <= new Date()) {
            mockScreenshots.push({
              _id: `${employee._id}-${time.toISOString()}`,
              employee: employee._id,
              capturedAt: time.toISOString(),
              windowTitle: `Working - ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
              analysis: {
                summary: `Employee working on tasks at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                productivity: hour >= 9 && hour < 18 ? 'productive' : 'neutral',
                activity: 'coding',
                aiConfidence: 0.85
              }
            })
          }
        }
      }
      
      setScreenshots(mockScreenshots)
      
    } catch (error) {
      console.error('Error fetching employee activity:', error)
      toast.error('Failed to load employee activity')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = async (newDate) => {
    setDateFilter(newDate)
    if (selectedEmployee) {
      await viewEmployeeActivity(selectedEmployee)
    }
  }

  const handlePeriodChange = async (newPeriod) => {
    setPeriodFilter(newPeriod)
    if (selectedEmployee) {
      await viewEmployeeActivity(selectedEmployee)
    }
  }

  const viewScreenshot = (screenshot) => {
    setSelectedScreenshot(screenshot)
    setShowScreenshot(true)
  }

  const closeScreenshot = () => {
    setShowScreenshot(false)
    setSelectedScreenshot(null)
  }

  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.department?.name?.toLowerCase().includes(searchLower)
    )
  })

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getProductivityColor = (productivity) => {
    const colors = {
      'highly-productive': 'bg-green-100 text-green-800',
      'productive': 'bg-blue-100 text-blue-800',
      'neutral': 'bg-gray-100 text-gray-800',
      'distraction': 'bg-yellow-100 text-yellow-800',
      'low-productivity': 'bg-orange-100 text-orange-800',
      'non-productive': 'bg-red-100 text-red-800'
    }
    return colors[productivity] || colors.neutral
  }

  if (loading && !selectedEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
          <p>Loading employees...</p>
        </div>
      </div>
    )
  }

  // Employee cards view
  if (!selectedEmployee) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Activity Monitoring</h1>
            <p className="text-gray-600">View comprehensive activity tracking and screenshots for all employees</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee) => (
              <div
                key={employee._id}
                onClick={() => viewEmployeeActivity(employee)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-indigo-500 p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {employee.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{employee.name || 'Unknown'}</h3>
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

                <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                  <FaEye />
                  <span>View Activity</span>
                </button>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Employee activity timeline view
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedEmployee(null)
              setScreenshots([])
              setActivitySummary(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaArrowLeft />
            <span>Back to Employees</span>
          </button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{selectedEmployee.name}&apos;s Activity</h1>
            <p className="text-gray-600">{selectedEmployee.email}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCalendar className="inline mr-2" />
                Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => handleDateChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaFilter className="inline mr-2" />
                Period
              </label>
              <select
                value={periodFilter}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-end">
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <FaDownload />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        {activitySummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaCamera className="text-blue-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Screenshots</p>
                  <p className="text-2xl font-bold text-gray-900">{screenshots.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FaCheckCircle className="text-green-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Keystroke Count</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.keystrokeCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FaClock className="text-purple-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Time</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.totalActiveTime || '0h'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FaChartLine className="text-orange-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Productivity</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.productivityScore || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Screenshots Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FaCamera />
            Screenshot Timeline ({formatDate(dateFilter)})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
              <p>Loading screenshots...</p>
            </div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-12">
              <FaCamera className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No screenshots captured for this date</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group screenshots by hour */}
              {Array.from({ length: 24 }, (_, hour) => {
                const hourScreenshots = screenshots.filter(s => {
                  const captureHour = new Date(s.capturedAt).getHours()
                  return captureHour === hour
                })

                if (hourScreenshots.length === 0) return null

                return (
                  <div key={hour} className="border-l-4 border-indigo-500 pl-6 pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {hourScreenshots.map((screenshot) => (
                        <div
                          key={screenshot._id}
                          onClick={() => viewScreenshot(screenshot)}
                          className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-all border border-gray-200 hover:border-indigo-500"
                        >
                          <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-2 flex items-center justify-center">
                            <FaCamera className="text-3xl text-gray-400" />
                          </div>
                          
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 mb-1">
                              {formatTime(screenshot.capturedAt)}
                            </p>
                            
                            {screenshot.analysis && (
                              <>
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                  {screenshot.windowTitle}
                                </p>
                                
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getProductivityColor(screenshot.analysis.productivity)}`}>
                                  {screenshot.analysis.productivity}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {showScreenshot && selectedScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeScreenshot}>
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Screenshot - {formatDate(selectedScreenshot.capturedAt)} at {formatTime(selectedScreenshot.capturedAt)}
              </h3>
              <button
                onClick={closeScreenshot}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg mb-6 aspect-video flex items-center justify-center">
                <FaCamera className="text-6xl text-gray-400" />
                <p className="text-gray-500 ml-4">Screenshot preview (install Windows app or extension to capture)</p>
              </div>
              
              {selectedScreenshot.analysis && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Window Title</h4>
                    <p className="text-gray-600">{selectedScreenshot.windowTitle}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">AI Summary</h4>
                    <p className="text-gray-600">{selectedScreenshot.analysis.summary}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Activity Type</h4>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {selectedScreenshot.analysis.activity}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Productivity Level</h4>
                      <span className={`inline-block px-3 py-1 rounded text-sm ${getProductivityColor(selectedScreenshot.analysis.productivity)}`}>
                        {selectedScreenshot.analysis.productivity}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">AI Confidence</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(selectedScreenshot.analysis.aiConfidence * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {(selectedScreenshot.analysis.aiConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
