'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaClock, FaRedo, FaPaperPlane, FaUsers, FaBuilding, FaUserTag, FaCalendar, FaTrash, FaEdit, FaPause, FaPlay, FaHistory } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function NotificationManagement() {
  const [activeTab, setActiveTab] = useState('send')
  const [userRole, setUserRole] = useState('')
  const [userDepartment, setUserDepartment] = useState(null)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [checkingApiKey, setCheckingApiKey] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
    }

    const employeeData = localStorage.getItem('employee')
    if (employeeData) {
      const employee = JSON.parse(employeeData)
      setUserDepartment(employee.department?._id || employee.department)
      // Check if employee data has isDepartmentHead flag
      if (employee.isDepartmentHead) {
        setIsDepartmentHead(true)
      }
    }

    checkDepartmentHead()
    checkApiKeyStatus()
  }, [])

  // Check if user is a department head
  const checkDepartmentHead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/team/check-head', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success && data.isDepartmentHead) {
        setIsDepartmentHead(true)
      }
    } catch (error) {
      console.error('Error checking department head:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check if OneSignal API key is configured
  const checkApiKeyStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setApiKeyConfigured(data.configured)
      }
    } catch (error) {
      console.error('Error checking API key status:', error)
    } finally {
      setCheckingApiKey(false)
    }
  }

  // Check if user has access
  const hasAccess = ['admin', 'hr', 'department_head'].includes(userRole) || isDepartmentHead

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary-500)' }}></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'send', name: 'Send Notification', icon: FaPaperPlane },
    { id: 'scheduled', name: 'Scheduled', icon: FaClock },
    { id: 'recurring', name: 'Recurring', icon: FaRedo },
    { id: 'history', name: 'History', icon: FaHistory }
  ]

  // Add config tab for admin only
  if (userRole === 'admin') {
    tabs.push({ id: 'config', name: 'Configuration', icon: FaBell })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FaBell className="text-primary-500" />
          <span>Notification Management</span>
        </h2>
        <p className="text-gray-600 mb-6">Send, schedule, and manage push notifications</p>
      </div>

      {/* API Key Warning Banner */}
      {!checkingApiKey && !apiKeyConfigured && userRole === 'admin' && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                OneSignal API Key Not Configured
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Notifications cannot be sent until you configure the OneSignal REST API key.
                <button
                  onClick={() => setActiveTab('config')}
                  className="ml-1 font-semibold underline hover:text-yellow-900"
                >
                  Click here to configure
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'send' && <SendNotificationTab userRole={userRole} userDepartment={userDepartment} isDepartmentHead={isDepartmentHead} apiKeyConfigured={apiKeyConfigured} />}
        {activeTab === 'scheduled' && <ScheduledNotificationsTab userRole={userRole} userDepartment={userDepartment} isDepartmentHead={isDepartmentHead} />}
        {activeTab === 'recurring' && <RecurringNotificationsTab userRole={userRole} userDepartment={userDepartment} isDepartmentHead={isDepartmentHead} />}
        {activeTab === 'history' && <NotificationHistoryTab userRole={userRole} userDepartment={userDepartment} isDepartmentHead={isDepartmentHead} />}
        {activeTab === 'config' && userRole === 'admin' && <ConfigurationTab apiKeyConfigured={apiKeyConfigured} onConfigUpdate={checkApiKeyStatus} />}
      </div>
    </div>
  )
}

// Send Notification Tab
function SendNotificationTab({ userRole, userDepartment, isDepartmentHead, apiKeyConfigured }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    url: '/dashboard',
    scheduleType: 'now',
    scheduledFor: '',
    targetType: 'all',
    targetDepartment: '',
    targetRoles: [],
    targetUsers: []
  })
  const [sending, setSending] = useState(false)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    fetchDepartments()
    fetchEmployees()
  }, [isDepartmentHead, userRole, userDepartment])

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setDepartments(data.data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      console.log('Employees fetched:', data)
      if (data.success) {
        // Filter employees based on role
        let filteredEmployees = data.data

        // If department head, only show employees from their department
        if (isDepartmentHead && !['admin', 'hr'].includes(userRole)) {
          filteredEmployees = data.data.filter(emp => {
            const empDeptId = emp.department?._id || emp.department
            return empDeptId && empDeptId.toString() === userDepartment?.toString()
          })
        }

        setEmployees(filteredEmployees)
        console.log('Filtered employees:', filteredEmployees.length)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success(formData.scheduleType === 'now' ? 'Notification sent successfully!' : 'Notification scheduled successfully!')
        setFormData({
          title: '',
          message: '',
          url: '/dashboard',
          scheduleType: 'now',
          scheduledFor: '',
          targetType: 'all',
          targetDepartment: '',
          targetRoles: [],
          targetUsers: []
        })
      } else {
        toast.error(data.message || 'Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const isDeptHead = userRole === 'department_head' || isDepartmentHead

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Key Warning */}
      {!apiKeyConfigured && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Cannot Send Notifications
              </h3>
              <p className="mt-1 text-sm text-red-700">
                OneSignal API key is not configured. Notifications cannot be sent until an administrator configures the API credentials.
                {userRole === 'admin' && (
                  <span> Please go to the <strong>Configuration</strong> tab to set up OneSignal.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Notification Content</h3>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter notification title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter notification message"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Action URL
          </label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="/dashboard"
          />
        </div>
      </div>

      {/* Schedule Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>

        <div className="flex gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="now"
              checked={formData.scheduleType === 'now'}
              onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-900">Send Now</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="scheduled"
              checked={formData.scheduleType === 'scheduled'}
              onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-900">Schedule for Later</span>
          </label>
        </div>

        {formData.scheduleType === 'scheduled' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              required
            />
          </div>
        )}
      </div>

      {/* Target Audience */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Target Audience</h3>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Send To
          </label>
          <select
            value={formData.targetType}
            onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
            className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <option value="all">{isDeptHead && !['admin', 'hr'].includes(userRole) ? 'All Department Members' : 'All Employees'}</option>
            {!isDeptHead && <option value="department">Specific Department</option>}
            {!isDeptHead && <option value="role">Specific Role</option>}
            <option value="specific">Specific Users</option>
          </select>
        </div>

        {formData.targetType === 'department' && !isDeptHead && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Department
            </label>
            <select
              value={formData.targetDepartment}
              onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
              className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              required
            >
              <option value="">Select a department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.targetType === 'role' && !isDeptHead && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Roles ({formData.targetRoles.length} selected)
            </label>
            <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-gray-50">
              {['admin', 'hr', 'manager', 'employee', 'department_head'].map(role => (
                <label key={role} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.targetRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, targetRoles: [...formData.targetRoles, role] })
                      } else {
                        setFormData({ ...formData, targetRoles: formData.targetRoles.filter(r => r !== role) })
                      }
                    }}
                    className="rounded text-primary-500 w-4 h-4 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-900 capitalize flex-1">{role.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            {formData.targetRoles.length > 0 && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetRoles: [] })}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {formData.targetType === 'specific' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Users ({formData.targetUsers.length} selected)
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {isDeptHead && !['admin', 'hr'].includes(userRole) ? 'No employees found in your department' : 'No employees found'}
                </p>
              ) : (
                <div className="space-y-2">
                  {employees.map(emp => {
                    const userId = emp.userId?._id || emp.userId
                    if (!userId) return null

                    return (
                      <label
                        key={emp._id}
                        className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.targetUsers.includes(userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, targetUsers: [...formData.targetUsers, userId] })
                            } else {
                              setFormData({ ...formData, targetUsers: formData.targetUsers.filter(id => id !== userId) })
                            }
                          }}
                          className="rounded text-primary-500 w-4 h-4 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {emp.firstName} {emp.lastName}
                            </span>
                            {emp.isDepartmentHead && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                                Dept Head
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-1 text-xs text-gray-500 mt-0.5">
                            <span className="truncate">{emp.department?.name || 'No Department'}</span>
                            {emp.designation?.title && (
                              <>
                                <span>•</span>
                                <span className="truncate">{emp.designation.title}</span>
                              </>
                            )}
                            {emp.userId?.role && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{emp.userId.role}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <p className="text-xs text-gray-500">
                {employees.length} employee{employees.length !== 1 ? 's' : ''} available
              </p>
              {formData.targetUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, targetUsers: [] })}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={sending || !apiKeyConfigured}
          className="px-6 py-2.5 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-colors"
          style={{
            backgroundColor: sending || !apiKeyConfigured ? '#9CA3AF' : 'var(--color-primary-600)'
          }}
          onMouseEnter={(e) => {
            if (!sending && apiKeyConfigured) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'
            }
          }}
          onMouseLeave={(e) => {
            if (!sending && apiKeyConfigured) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'
            }
          }}
          title={!apiKeyConfigured ? 'OneSignal API key not configured' : ''}
        >
          <FaPaperPlane className="w-4 h-4" />
          <span>{sending ? 'Sending...' : formData.scheduleType === 'now' ? 'Send Notification' : 'Schedule Notification'}</span>
        </button>
      </div>
    </form>
  )
}

// Scheduled Notifications Tab
function ScheduledNotificationsTab({ userRole, userDepartment, isDepartmentHead }) {
  const [scheduledNotifications, setScheduledNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledNotifications()
  }, [])

  const fetchScheduledNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/scheduled', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setScheduledNotifications(data.data)
      }
    } catch (error) {
      console.error('Error fetching scheduled notifications:', error)
      toast.error('Failed to load scheduled notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled notification?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/notifications/scheduled?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Scheduled notification cancelled')
        fetchScheduledNotifications()
      } else {
        toast.error(data.message || 'Failed to cancel notification')
      }
    } catch (error) {
      console.error('Error cancelling notification:', error)
      toast.error('Failed to cancel notification')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary-500)' }}></div>
        <p className="mt-4 text-gray-600">Loading scheduled notifications...</p>
      </div>
    )
  }

  if (scheduledNotifications.length === 0) {
    return (
      <div className="text-center py-12">
        <FaClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Scheduled Notifications</h3>
        <p className="text-gray-500">You haven't scheduled any notifications yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {scheduledNotifications.map((notification) => (
        <div key={notification._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <FaClock className="w-3 h-3" />
                  <span>Scheduled: {new Date(notification.scheduledFor).toLocaleString()}</span>
                </span>
                <span className={`px-2 py-1 rounded-full ${
                  notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {notification.status}
                </span>
              </div>
            </div>
            {notification.status === 'pending' && (
              <button
                onClick={() => handleCancel(notification._id)}
                className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1"
              >
                <FaTrash className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Create Recurring Notification Form Component
function CreateRecurringForm({ formData, setFormData, handleSubmit, creating, departments, employees, isDeptHead }) {
  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Create Recurring Notification</h4>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
          style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
          placeholder="e.g., Daily Standup Reminder"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message *
        </label>
        <textarea
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
          style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
          placeholder="Enter notification message..."
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Frequency *
        </label>
        <select
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
          style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom (Specific Days)</option>
        </select>
      </div>

      {/* Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time *
        </label>
        <input
          type="time"
          required
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
          style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
        />
      </div>

      {/* Days of Week (for weekly/custom) */}
      {(formData.frequency === 'weekly' || formData.frequency === 'custom') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days of Week *
          </label>
          <div className="border border-gray-300 rounded-lg p-4 space-y-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <label key={day} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.daysOfWeek.includes(day)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, daysOfWeek: [...formData.daysOfWeek, day] })
                    } else {
                      setFormData({ ...formData, daysOfWeek: formData.daysOfWeek.filter(d => d !== day) })
                    }
                  }}
                  className="rounded w-4 h-4"
                  style={{ accentColor: 'var(--color-primary-500)' }}
                />
                <span className="text-sm font-medium text-gray-800">{day}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Day of Month (for monthly) */}
      {formData.frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day of Month *
          </label>
          <input
            type="number"
            min="1"
            max="31"
            required
            value={formData.dayOfMonth}
            onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
            style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
          />
        </div>
      )}

      {/* Target Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Send To *
        </label>
        <select
          value={formData.targetType}
          onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
          className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        >
          <option value="all">{isDeptHead ? 'All Department Members' : 'All Users'}</option>
          {!isDeptHead && <option value="department">Specific Department</option>}
          {!isDeptHead && <option value="role">Specific Role</option>}
          <option value="users">Specific Users</option>
        </select>
      </div>

      {/* Department Selection */}
      {formData.targetType === 'department' && !isDeptHead && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Department
          </label>
          <select
            value={formData.targetDepartment}
            onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
            className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <option value="">Select a department</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Role Selection */}
      {formData.targetType === 'role' && !isDeptHead && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Roles ({formData.targetRoles.length} selected)
          </label>
          <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-gray-50">
            {['admin', 'hr', 'manager', 'employee', 'department_head'].map(role => (
              <label key={role} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.targetRoles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, targetRoles: [...formData.targetRoles, role] })
                    } else {
                      setFormData({ ...formData, targetRoles: formData.targetRoles.filter(r => r !== role) })
                    }
                  }}
                  className="rounded text-primary-500 w-4 h-4 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-900 capitalize">{role.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* User Selection */}
      {formData.targetType === 'users' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Users ({formData.targetUsers.length} selected)
          </label>
          <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
            {employees.map(emp => (
              <label key={emp._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.targetUsers.includes(emp.userId?._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, targetUsers: [...formData.targetUsers, emp.userId?._id] })
                    } else {
                      setFormData({ ...formData, targetUsers: formData.targetUsers.filter(id => id !== emp.userId?._id) })
                    }
                  }}
                  className="rounded w-4 h-4"
                  style={{ accentColor: 'var(--color-primary-500)' }}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({emp.designation})</span>
                  {emp.isDepartmentHead && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Dept Head</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Click Action URL
        </label>
        <input
          type="text"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
          style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
          placeholder="/dashboard"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="submit"
          disabled={creating}
          className="px-6 py-2 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          style={{
            backgroundColor: creating ? '#9CA3AF' : 'var(--color-primary-600)'
          }}
          onMouseEnter={(e) => {
            if (!creating) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'
            }
          }}
          onMouseLeave={(e) => {
            if (!creating) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'
            }
          }}
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <FaRedo className="w-4 h-4" />
              <span>Create Recurring Notification</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// Recurring Notifications Tab
function RecurringNotificationsTab({ userRole, userDepartment, isDepartmentHead }) {
  const [recurringNotifications, setRecurringNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    url: '/dashboard',
    frequency: 'daily',
    time: '09:00',
    daysOfWeek: [],
    dayOfMonth: 1,
    targetType: 'all',
    targetDepartment: '',
    targetRoles: [],
    targetUsers: []
  })
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchRecurringNotifications()
    if (showCreateForm) {
      fetchDepartments()
      fetchEmployees()
    }
  }, [showCreateForm])

  const fetchRecurringNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/recurring', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setRecurringNotifications(data.data)
      }
    } catch (error) {
      console.error('Error fetching recurring notifications:', error)
      toast.error('Failed to load recurring notifications')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setDepartments(data.data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const isDeptHead = userRole === 'department_head' || isDepartmentHead

      let url = '/api/employees?limit=1000'
      if (isDeptHead && userDepartment) {
        url += `&department=${userDepartment}`
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setEmployees(data.data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreating(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Recurring notification created successfully!')
        setShowCreateForm(false)
        setFormData({
          title: '',
          message: '',
          url: '/dashboard',
          frequency: 'daily',
          time: '09:00',
          daysOfWeek: [],
          dayOfMonth: 1,
          targetType: 'all',
          targetDepartment: '',
          targetRoles: [],
          targetUsers: []
        })
        fetchRecurringNotifications()
      } else {
        toast.error(data.message || 'Failed to create recurring notification')
      }
    } catch (error) {
      console.error('Error creating recurring notification:', error)
      toast.error('Failed to create recurring notification')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/recurring', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, isActive: !currentStatus })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Notification ${!currentStatus ? 'activated' : 'paused'}`)
        fetchRecurringNotifications()
      } else {
        toast.error(data.message || 'Failed to update notification')
      }
    } catch (error) {
      console.error('Error updating notification:', error)
      toast.error('Failed to update notification')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this recurring notification?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/notifications/recurring?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Recurring notification deleted')
        fetchRecurringNotifications()
      } else {
        toast.error(data.message || 'Failed to delete notification')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary-500)' }}></div>
        <p className="mt-4 text-gray-600">Loading recurring notifications...</p>
      </div>
    )
  }

  const isDeptHead = userRole === 'department_head' || isDepartmentHead

  return (
    <div className="space-y-4">
      {/* Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {recurringNotifications.length > 0 ? `Recurring Notifications (${recurringNotifications.length})` : 'Recurring Notifications'}
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2"
          style={{ backgroundColor: 'var(--color-primary-600)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'}
        >
          {showCreateForm ? (
            <>
              <FaTrash className="w-4 h-4" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <FaRedo className="w-4 h-4" />
              <span>Create Recurring Notification</span>
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateRecurringForm
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleCreateSubmit}
          creating={creating}
          departments={departments}
          employees={employees}
          isDeptHead={isDeptHead}
        />
      )}

      {/* Empty State */}
      {!showCreateForm && recurringNotifications.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FaRedo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Recurring Notifications</h3>
          <p className="text-gray-500 mb-4">You haven't set up any recurring notifications yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
            style={{ backgroundColor: 'var(--color-primary-600)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'}
          >
            <FaRedo className="w-4 h-4" />
            <span>Create Your First Recurring Notification</span>
          </button>
        </div>
      )}

      {/* Notifications List */}
      {recurringNotifications.length > 0 && (
        <div className="space-y-4">
          {recurringNotifications.map((notification) => (
        <div key={notification._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  notification.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {notification.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <FaRedo className="w-3 h-3" />
                  <span className="capitalize">{notification.frequency}</span>
                </span>
                {notification.nextScheduledAt && (
                  <span className="flex items-center space-x-1">
                    <FaClock className="w-3 h-3" />
                    <span>Next: {new Date(notification.nextScheduledAt).toLocaleString()}</span>
                  </span>
                )}
                <span>Sent: {notification.totalSent || 0} times</span>
              </div>
            </div>
            <div className="ml-4 flex space-x-2">
              <button
                onClick={() => handleToggleActive(notification._id, notification.isActive)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                  notification.isActive
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {notification.isActive ? <FaPause className="w-3 h-3" /> : <FaPlay className="w-3 h-3" />}
                <span>{notification.isActive ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                onClick={() => handleDelete(notification._id)}
                className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1"
              >
                <FaTrash className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Notification History Tab
function NotificationHistoryTab({ userRole, userDepartment, isDepartmentHead }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/scheduled?status=sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load notification history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary-500)' }}></div>
        <p className="mt-4 text-gray-600">Loading notification history...</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <FaHistory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Notification History</h3>
        <p className="text-gray-500">No notifications have been sent yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((notification) => (
        <div key={notification._id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <FaClock className="w-3 h-3" />
                  <span>Sent: {new Date(notification.sentAt).toLocaleString()}</span>
                </span>
                <span className="text-green-600">
                  ✓ {notification.successCount || 0} delivered
                </span>
                {notification.failureCount > 0 && (
                  <span className="text-red-600">
                    ✗ {notification.failureCount} failed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Configuration Tab (Admin Only)
function ConfigurationTab({ apiKeyConfigured, onConfigUpdate }) {
  const [formData, setFormData] = useState({
    appId: '',
    restApiKey: ''
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    fetchCurrentConfig()
  }, [])

  const fetchCurrentConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success && data.config) {
        setFormData({
          appId: data.config.appId || '',
          restApiKey: data.config.restApiKey || ''
        })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('OneSignal configuration saved successfully!')
        onConfigUpdate() // Refresh API key status
      } else {
        toast.error(data.message || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const testConfiguration = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Configuration test successful! OneSignal is working.')
      } else {
        toast.error(data.message || 'Configuration test failed')
      }
    } catch (error) {
      console.error('Error testing config:', error)
      toast.error('Failed to test configuration')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary-500)' }}></div>
        <p className="mt-4 text-gray-600">Loading configuration...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border-l-4 ${
        apiKeyConfigured
          ? 'bg-green-50 border-green-400'
          : 'bg-yellow-50 border-yellow-400'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {apiKeyConfigured ? (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              apiKeyConfigured ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {apiKeyConfigured ? 'OneSignal is Configured' : 'OneSignal Not Configured'}
            </h3>
            <p className={`mt-1 text-sm ${
              apiKeyConfigured ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {apiKeyConfigured
                ? 'Your OneSignal integration is active and ready to send notifications.'
                : 'Please configure your OneSignal API credentials below to enable push notifications.'}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">OneSignal Configuration</h3>

          <div className="space-y-4">
            {/* App ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OneSignal App ID
              </label>
              <input
                type="text"
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                placeholder="f7b9d1a1-5095-4be8-8a74-2af13058e7b2"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Find this in your OneSignal dashboard under Settings → Keys & IDs
              </p>
            </div>

            {/* REST API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OneSignal REST API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.restApiKey}
                  onChange={(e) => setFormData({ ...formData, restApiKey: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-500)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  placeholder="Enter your REST API Key"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Find this in your OneSignal dashboard under Settings → Keys & IDs → REST API Key
              </p>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-primary-800)' }}>How to get your OneSignal credentials:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: 'var(--color-primary-700)' }}>
              <li>Go to <a href="https://app.onesignal.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-primary-700)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-900)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary-700)'}>OneSignal Dashboard</a></li>
              <li>Select your app or create a new one</li>
              <li>Navigate to Settings → Keys & IDs</li>
              <li>Copy the App ID and REST API Key</li>
              <li>Paste them in the fields above</li>
            </ol>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={testConfiguration}
            disabled={!apiKeyConfigured}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Test Configuration
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: saving ? '#9CA3AF' : 'var(--color-primary-600)'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'
              }
            }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}

