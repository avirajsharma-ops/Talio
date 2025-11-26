'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiClock, FiUser, FiCalendar, FiTrash2, FiSearch, FiFilter } from 'react-icons/fi'

export default function TaskHistoryPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deletedOnly, setDeletedOnly] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 })

  useEffect(() => {
    fetchTaskHistory()
  }, [statusFilter, deletedOnly, pagination.page])

  const fetchTaskHistory = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20'
      })
      
      if (statusFilter) params.append('status', statusFilter)
      if (deletedOnly) params.append('deletedOnly', 'true')
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/tasks/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTasks(data.data)
          setPagination(data.pagination)
        }
      }
    } catch (error) {
      console.error('Error fetching task history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchTaskHistory()
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-orange-100 text-orange-800',
      review: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      overdue: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
      critical: 'text-red-700'
    }
    return colors[priority] || 'text-gray-500'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Project History</h1>
          <p className="text-sm sm:text-base text-gray-600">View all projects including deleted ones</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={deletedOnly}
                  onChange={(e) => setDeletedOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm sm:text-base text-gray-700">Deleted Only</span>
              </label>
            </div>
          </form>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task._id}
                className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${
                  task.isDeleted ? 'border-l-4 border-red-500 bg-red-50' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <Link
                        href={task.isDeleted ? '#' : `/dashboard/tasks/${task._id}`}
                        className={`font-semibold text-gray-900 hover:text-blue-600 ${
                          task.isDeleted ? 'pointer-events-none text-gray-500' : ''
                        }`}
                      >
                        {task.title}
                      </Link>
                      {task.isDeleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          <FiTrash2 className="w-3 h-3" />
                          Deleted
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>

                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiUser className="w-4 h-4" />
                        {task.taskNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiCalendar className="w-4 h-4" />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.isDeleted && task.deletedAt && (
                        <span className="flex items-center gap-1 text-red-600">
                          <FiTrash2 className="w-4 h-4" />
                          Deleted: {new Date(task.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {task.isDeleted && task.deletionReason && (
                      <p className="mt-2 text-sm text-red-600 italic">
                        Reason: {task.deletionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 items-start">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

