'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaClock, FaRedo, FaPaperPlane, FaUsers, FaBuilding, FaUserTag, FaCalendar, FaTrash, FaEdit, FaPause, FaPlay, FaHistory } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('send')
  const [userRole, setUserRole] = useState('')
  const [userDepartment, setUserDepartment] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
    }

    const employeeData = localStorage.getItem('employee')
    if (employeeData) {
      const employee = JSON.parse(employeeData)
      setUserDepartment(employee.department)
    }
  }, [])

  // Check if user has access
  const hasAccess = ['admin', 'hr', 'department_head'].includes(userRole)

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'send', name: 'Send Notification', icon: FaPaperPlane },
    { id: 'scheduled', name: 'Scheduled', icon: FaClock },
    { id: 'recurring', name: 'Recurring', icon: FaRedo },
    { id: 'history', name: 'History', icon: FaHistory }
  ]

  return (
    <div className="p-3 sm:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FaBell className="text-blue-600" />
          Notification Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Send, schedule, and manage push notifications
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        {activeTab === 'send' && <SendNotificationTab userRole={userRole} userDepartment={userDepartment} />}
        {activeTab === 'scheduled' && <ScheduledNotificationsTab userRole={userRole} userDepartment={userDepartment} />}
        {activeTab === 'recurring' && <RecurringNotificationsTab userRole={userRole} userDepartment={userDepartment} />}
        {activeTab === 'history' && <NotificationHistoryTab userRole={userRole} userDepartment={userDepartment} />}
      </div>
    </div>
  )
}

// Send Notification Tab
function SendNotificationTab({ userRole, userDepartment }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    url: '/dashboard',
    targetType: 'all',
    targetDepartment: '',
    targetUsers: [],
    targetRoles: [],
    scheduleType: 'now'
  })
  const [sending, setSending] = useState(false)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    fetchDepartments()
    fetchEmployees()
  }, [])

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
      const response = await fetch('/api/employees', {
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
        toast.success(data.message || 'Notification sent successfully!')
        setFormData({
          title: '',
          message: '',
          url: '/dashboard',
          targetType: 'all',
          targetDepartment: '',
          targetUsers: [],
          targetRoles: [],
          scheduleType: 'now'
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notification Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Notification Content</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter notification title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter notification message"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action URL
          </label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="/dashboard"
          />
          <p className="text-xs text-gray-500 mt-1">URL to open when notification is clicked</p>
        </div>
      </div>

      {/* Target Audience */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Target Audience</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send To *
          </label>
          <select
            value={formData.targetType}
            onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="all">All Users</option>
            {userRole !== 'department_head' && <option value="department">Specific Department</option>}
            <option value="role">Specific Role</option>
            <option value="specific">Specific Users</option>
          </select>
        </div>

        {formData.targetType === 'department' && userRole !== 'department_head' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Department
            </label>
            <select
              value={formData.targetDepartment}
              onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.targetType === 'role' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Roles
            </label>
            <div className="space-y-2">
              {['admin', 'hr', 'manager', 'employee', 'department_head'].map(role => (
                <label key={role} className="flex items-center space-x-2">
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
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm capitalize">{role.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <FaPaperPlane className="w-4 h-4" />
          <span>{sending ? 'Sending...' : 'Send Notification'}</span>
        </button>
      </div>
    </form>
  )
}

// Placeholder tabs - will be implemented
function ScheduledNotificationsTab({ userRole, userDepartment }) {
  return (
    <div className="text-center py-12">
      <FaClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Scheduled Notifications</h3>
      <p className="text-gray-500">Schedule notifications to be sent at a specific time</p>
    </div>
  )
}

function RecurringNotificationsTab({ userRole, userDepartment }) {
  return (
    <div className="text-center py-12">
      <FaRedo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Recurring Notifications</h3>
      <p className="text-gray-500">Set up notifications that repeat on a schedule</p>
    </div>
  )
}

function NotificationHistoryTab({ userRole, userDepartment }) {
  return (
    <div className="text-center py-12">
      <FaHistory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Notification History</h3>
      <p className="text-gray-500">View all sent notifications</p>
    </div>
  )
}

