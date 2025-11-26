'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FaTasks, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaPlus, FaUsers, FaCalendarAlt, FaHistory
} from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function TasksPage() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchTaskStats()
    } else {
      router.push('/login')
    }
  }, [])

  const fetchTaskStats = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks?view=personal&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.stats) {
          setStats(data.data.stats)
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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
    <RoleBasedAccess allowedRoles={['admin', 'hr', 'manager', 'employee']}>
      <div className="space-y-6 pb-24 md:pb-0">
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <FaTasks className="mr-3 text-blue-600" />
                Project Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                {user.role === 'admin' ? 'Manage Projects across the entire organization' :
                 user.role === 'hr' ? 'Manage department and organizational Projects' :
                 user.role === 'manager' ? 'Manage your team Projects and assignments' :
                 'Manage your personal Projects and collaborate with colleagues'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/dashboard/tasks/create')}
                className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
              >
                <FaPlus className="mr-2" />
                Create Projects
              </button>

              <button
                onClick={() => router.push('/dashboard/tasks/my-tasks')}
                className="bg-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                My Projects
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Projects</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-900">
                    {loading ? '...' : stats.totalTasks}
                  </p>
                </div>
                <FaTasks className="text-blue-500 text-lg sm:text-xl" />
              </div>
            </div>

            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-900">
                    {loading ? '...' : stats.completedTasks}
                  </p>
                </div>
                <FaCheckCircle className="text-green-500 text-lg sm:text-xl" />
              </div>
            </div>

            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-yellow-600 font-medium">In Progress</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-900">
                    {loading ? '...' : stats.inProgressTasks}
                  </p>
                </div>
                <FaClock className="text-yellow-500 text-lg sm:text-xl" />
              </div>
            </div>

            <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-orange-600 font-medium">Pending</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-900">
                    {loading ? '...' : stats.pendingTasks}
                  </p>
                </div>
                <FaCalendarAlt className="text-orange-500 text-lg sm:text-xl" />
              </div>
            </div>

            <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-red-600 font-medium">Overdue</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-900">
                    {loading ? '...' : stats.overdueTasks}
                  </p>
                </div>
                <FaExclamationTriangle className="text-red-500 text-lg sm:text-xl" />
              </div>
            </div>
          </div>

          {/* Role-specific Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              onClick={() => router.push('/dashboard/tasks/my-tasks')}
              className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <div className="flex items-center mb-2">
                <FaTasks className="text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-900">My Projects</h3>
              </div>
              <p className="text-sm text-blue-700">View and manage your assigned Projects</p>
            </div>

            <div
              onClick={() => router.push('/dashboard/tasks/create')}
              className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors border border-green-200"
            >
              <div className="flex items-center mb-2">
                <FaPlus className="text-green-600 mr-2" />
                <h3 className="font-semibold text-green-900">Create Projects</h3>
              </div>
              <p className="text-sm text-green-700">Create new Projects for yourself or others</p>
            </div>

            {(user.role === 'manager' || user.role === 'hr' || user.role === 'admin') && (
              <div
                onClick={() => router.push('/dashboard/tasks/team-tasks')}
                className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors border border-yellow-200"
              >
                <div className="flex items-center mb-2">
                  <FaUsers className="text-yellow-600 mr-2" />
                  <h3 className="font-semibold text-yellow-900">
                    {user.role === 'manager' ? 'Team Projects' :
                     user.role === 'hr' ? 'Department Projects' : 'All Projects'}
                  </h3>
                </div>
                <p className="text-sm text-yellow-700">
                  {user.role === 'manager' ? 'Manage your team\'s Projects' :
                   user.role === 'hr' ? 'Manage department Projects' : 'Manage all organizational Projects'}
                </p>
              </div>
            )}

            {user.role === 'employee' && (
              <div
                onClick={() => router.push('/dashboard/tasks/create')}
                className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                <div className="flex items-center mb-2">
                  <FaUsers className="text-indigo-600 mr-2" />
                  <h3 className="font-semibold text-indigo-900">Assign to Colleague</h3>
                </div>
                <p className="text-sm text-indigo-700">Assign Projects to your colleagues</p>
              </div>
            )}

            <div
              onClick={() => router.push('/dashboard/tasks/history')}
              className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors border border-purple-200"
            >
              <div className="flex items-center mb-2">
                <FaHistory className="text-purple-600 mr-2" />
                <h3 className="font-semibold text-purple-900">Projects History</h3>
              </div>
              <p className="text-sm text-purple-700">View all projects including deleted ones</p>
            </div>
          </div>
        </div>
      </div>
    </RoleBasedAccess>
  )
}
