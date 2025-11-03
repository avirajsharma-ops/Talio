'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaTasks, FaUsers, FaArrowLeft, FaSearch, FaFilter } from 'react-icons/fa'
import TaskAssignment from '@/components/tasks/TaskAssignment'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function AssignTaskPage() {
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
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

  useEffect(() => {
    filterTasks()
  }, [tasks, searchTerm, statusFilter])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Fetch tasks based on user role
      let view = 'personal'
      if (user?.role === 'manager') view = 'team'
      else if (user?.role === 'hr') view = 'department'
      else if (user?.role === 'admin') view = 'organization'

      const response = await fetch(`/api/tasks?view=${view}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data.data.tasks || [])
      } else {
        console.error('Failed to fetch tasks')
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.taskNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    setFilteredTasks(filtered)
  }

  const handleTaskSelect = (task) => {
    setSelectedTask(task)
  }

  const handleAssignmentComplete = () => {
    setSelectedTask(null)
    fetchTasks() // Refresh tasks
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-purple-100 text-purple-800',
      'on_hold': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': 'bg-red-200 text-red-900',
      'urgent': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <FaUsers className="mr-2 sm:mr-3 text-blue-600" />
                  Assign Project
                </h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
                  {user.role === 'admin' ? 'Assign Projects to any employee in the organization' :
                   user.role === 'hr' ? 'Assign Projects to employees in your department' :
                   user.role === 'manager' ? 'Assign Projects to your team members' :
                   'Assign Projects to your colleagues'}
                </p>
                <p className="text-xs text-gray-600 sm:hidden">
                  Assign Projects to your colleagues
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard/tasks/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
            >
              Create New...
            </button>
          </div>

          {selectedTask ? (
            /* Task Assignment Interface */
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
                    <p className="text-sm text-gray-600">Project #{selectedTask.taskNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span>Due: {formatDate(selectedTask.dueDate)}</span>
                </div>
                
                {selectedTask.description && (
                  <p className="text-gray-700 mt-2">{selectedTask.description}</p>
                )}
              </div>

              <TaskAssignment
                taskId={selectedTask._id}
                currentAssignees={selectedTask.assignedTo || []}
                onAssignmentChange={handleAssignmentComplete}
                mode="manage"
              />
            </div>
          ) : (
            /* Task Selection Interface */
            <div className="space-y-4 sm:space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search Projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>

                <div className="flex space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  >
                    <option value="all">All Status</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Tasks List */}
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <FaTasks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No Projects match your current filters.' 
                      : 'No Projects available for assignment.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => handleTaskSelect(task)}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                            <span className="text-sm text-gray-500">#{task.taskNumber}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          
                          {task.description && (
                            <p className="text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Due: {formatDate(task.dueDate)}</span>
                            <span>Created by: {task.assignedBy?.firstName} {task.assignedBy?.lastName}</span>
                            {task.assignedTo && task.assignedTo.length > 0 && (
                              <span>Assigned to: {task.assignedTo.length} person(s)</span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                            Assign
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleBasedAccess>
  )
}
