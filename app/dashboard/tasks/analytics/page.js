'use client'

import { useState, useEffect } from 'react'
import { FaChartBar, FaChartLine, FaChartPie, FaTasks } from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function TaskAnalyticsPage() {
  const [user, setUser] = useState(null)
  const [analytics, setAnalytics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    averageCompletionTime: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchAnalytics()
    }
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks?view=analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.stats) {
          setAnalytics(data.data.stats)
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <RoleBasedAccess allowedRoles={['admin', 'hr', 'manager']}>
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center mb-6">
            <FaChartBar className="text-blue-600 mr-3 text-2xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Analytics</h1>
              <p className="text-gray-600">Comprehensive task performance insights</p>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {loading ? '...' : analytics.totalTasks}
                  </p>
                </div>
                <FaTasks className="text-blue-500 text-2xl" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-900">
                    {loading ? '...' : `${analytics.completionRate}%`}
                  </p>
                </div>
                <FaChartPie className="text-green-500 text-2xl" />
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {loading ? '...' : analytics.inProgressTasks}
                  </p>
                </div>
                <FaChartLine className="text-yellow-500 text-2xl" />
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Overdue</p>
                  <p className="text-3xl font-bold text-red-900">
                    {loading ? '...' : analytics.overdueTasks}
                  </p>
                </div>
                <FaChartBar className="text-red-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <FaChartLine className="text-gray-400 text-4xl mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Advanced Analytics Coming Soon</h3>
            <p className="text-gray-600">
              Detailed charts, performance trends, and productivity insights will be available in the next update.
            </p>
          </div>
        </div>
      </div>
    </RoleBasedAccess>
  )
}
