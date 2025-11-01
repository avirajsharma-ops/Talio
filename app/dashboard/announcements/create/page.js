'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaBullhorn, FaUsers, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa'

export default function CreateAnnouncementPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    targetAudience: 'all',
    expiryDate: '',
    isActive: true,
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      
      // Check if user is admin
      if (parsedUser.role !== 'admin') {
        toast.error('Access denied. Only Admin can create announcements.')
        router.push('/dashboard')
        return
      }
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          createdBy: user.employeeId._id,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Announcement created successfully')
        router.push('/dashboard/announcements')
      } else {
        toast.error(data.message || 'Failed to create announcement')
      }
    } catch (error) {
      console.error('Create announcement error:', error)
      toast.error('Failed to create announcement')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return FaExclamationTriangle
      case 'medium': return FaBullhorn
      case 'low': return FaCalendarAlt
      default: return FaBullhorn
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <FaBullhorn className="w-8 h-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-gray-800">Create Announcement</h1>
        </div>
        <p className="text-gray-600">Create a new announcement for employees</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter announcement title..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows="6"
              placeholder="Enter announcement content..."
            />
          </div>

          {/* Priority and Target Audience Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <div className="mt-2 flex items-center space-x-2">
                {React.createElement(getPriorityIcon(formData.priority), {
                  className: `w-4 h-4 ${getPriorityColor(formData.priority)}`
                })}
                <span className={`text-sm ${getPriorityColor(formData.priority)}`}>
                  {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority
                </span>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience *
              </label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Employees</option>
                <option value="managers">Managers Only</option>
                <option value="hr">HR Department</option>
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
              </select>
              <div className="mt-2 flex items-center space-x-2">
                <FaUsers className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600">
                  {formData.targetAudience === 'all' ? 'All Employees' : formData.targetAudience.charAt(0).toUpperCase() + formData.targetAudience.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty for permanent announcement
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Publish announcement immediately
            </label>
          </div>

          {/* Preview */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary-500">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-gray-900">
                  {formData.title || 'Announcement Title'}
                </h4>
                <div className="flex items-center space-x-2">
                  {React.createElement(getPriorityIcon(formData.priority), {
                    className: `w-4 h-4 ${getPriorityColor(formData.priority)}`
                  })}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    formData.priority === 'high' ? 'bg-red-100 text-red-800' :
                    formData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {formData.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {formData.content || 'Announcement content will appear here...'}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>Target: {formData.targetAudience === 'all' ? 'All Employees' : formData.targetAudience}</span>
                {formData.expiryDate && (
                  <span>Expires: {new Date(formData.expiryDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard/announcements')}
              className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
