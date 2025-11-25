'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FaTasks, FaSearch, FaPlus, FaUsers, FaBuilding,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaCalendarAlt
} from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function DepartmentTasksPage() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchTasks()
    } else {
      router.push('/login')
    }
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks?view=department&status=${statusFilter}&department=${departmentFilter}&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTasks(data.data.tasks || [])
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [statusFilter, departmentFilter, searchTerm, user])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" />
      case 'in-progress':
        return <FaClock className="text-yellow-500" />
      case 'pending':
        return <FaCalendarAlt className="text-orange-500" />
      case 'overdue':
        return <FaExclamationTriangle className="text-red-500" />
      default:
        return <FaTasks className="text-gray-500" />
    }
  }

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'in-progress':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'pending':
        return `${baseClasses} bg-orange-100 text-orange-800`
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
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
    <RoleBasedAccess allowedRoles={['hr', 'admin']}>
      <div className="space-y-6 pb-24 md:pb-0">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div className="flex items-center mb-4 sm:mb-0">
              <FaBuilding className="text-blue-600 mr-3 text-2xl" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Department Tasks</h1>
                <p className="text-gray-600">Manage tasks across all departments</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard/tasks/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <FaPlus className="mr-2" />
              Create Task
            </button>
          </div>

          {/* Department Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {loading ? '...' : tasks.length}
                  </p>
                </div>
                <FaTasks className="text-blue-500 text-xl" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {loading ? '...' : tasks.filter(t => t.status === 'completed').length}
                  </p>
                </div>
                <FaCheckCircle className="text-green-500 text-xl" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {loading ? '...' : tasks.filter(t => t.status === 'in-progress').length}
                  </p>
                </div>
                <FaClock className="text-yellow-500 text-xl" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-900">
                    {loading ? '...' : tasks.filter(t => t.status === 'overdue').length}
                  </p>
                </div>
                <FaExclamationTriangle className="text-red-500 text-xl" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              <option value="hr">Human Resources</option>
              <option value="it">Information Technology</option>
              <option value="finance">Finance</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
            </select>
          </div>

          {/* Tasks Display */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <FaBuilding className="text-gray-400 text-4xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Department Tasks Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
                  ? 'No tasks match your current filters.'
                  : 'No department tasks have been created yet.'}
              </p>
              <button
                onClick={() => router.push('/dashboard/tasks/create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Department Task
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <div key={task._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {getStatusIcon(task.status)}
                      <h3 className="ml-2 text-lg font-semibold text-gray-900 truncate">{task.title}</h3>
                    </div>
                    <span className={getStatusBadge(task.status)}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <FaUsers className="mr-2" />
                      <span>Assigned to: {task.assignedTo?.firstName} {task.assignedTo?.lastName}</span>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center">
                        <FaCalendarAlt className="mr-2" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                      className="w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleBasedAccess>
  )
}
