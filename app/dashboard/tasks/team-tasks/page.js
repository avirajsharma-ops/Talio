'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FaUsers, FaTasks, FaPlus, FaFilter, FaSearch, FaCalendarAlt, 
  FaClock, FaUser, FaCheckCircle, FaExclamationTriangle,
  FaEdit, FaEye, FaUserCheck, FaUserTimes, FaChartBar
} from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function TeamTasksPage() {
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({})
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchTeamTasks()
      fetchTeamMembers()
    } else {
      router.push('/login')
    }
  }, [])

  const fetchTeamTasks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      let view = 'team'
      if (user?.role === 'hr') view = 'department'
      else if (user?.role === 'admin') view = 'organization'

      const response = await fetch(`/api/tasks?view=${view}&status=${filter}&assignee=${memberFilter}&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data.data.tasks || [])
        setStats(data.data.summary || {})
      } else {
        console.error('Failed to fetch team tasks')
      }
    } catch (error) {
      console.error('Error fetching team tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token')
      let endpoint = '/api/employees?status=active'
      
      if (user?.role === 'manager') {
        endpoint += `&reportingManager=${user.userId}`
      } else if (user?.role === 'hr') {
        endpoint += `&department=${user.department}`
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const approveTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'completed',
          notes: 'Task approved by manager'
        })
      })

      if (response.ok) {
        fetchTeamTasks() // Refresh tasks
      }
    } catch (error) {
      console.error('Error approving task:', error)
    }
  }

  const requestRevision = async (taskId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'in_progress',
          notes: 'Revision requested by manager'
        })
      })

      if (response.ok) {
        fetchTeamTasks() // Refresh tasks
      }
    } catch (error) {
      console.error('Error requesting revision:', error)
    }
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

  const isOverdue = (dueDate, status) => {
    return new Date(dueDate) < new Date() && !['completed', 'cancelled'].includes(status)
  }

  const getAssigneeNames = (assignedTo) => {
    if (!assignedTo || assignedTo.length === 0) return 'Unassigned'
    return assignedTo.map(a => `${a.employee?.firstName} ${a.employee?.lastName}`).join(', ')
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaUsers className="mr-3 text-blue-600" />
                {user.role === 'manager' ? 'Team Tasks' : 
                 user.role === 'hr' ? 'Department Tasks' : 'All Tasks'}
              </h1>
              <p className="text-gray-600">
                {user.role === 'manager' ? 'Manage and monitor your team\'s tasks' :
                 user.role === 'hr' ? 'Manage department tasks and assignments' :
                 'Manage all organizational tasks'}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/dashboard/tasks/create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FaPlus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
              
              <button
                onClick={() => router.push('/dashboard/tasks/assign')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <FaUsers className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalTasks || 0}</p>
                </div>
                <FaTasks className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{stats.completedTasks || 0}</p>
                </div>
                <FaCheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.inProgressTasks || 0}</p>
                </div>
                <FaClock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-900">{stats.overdueTasks || 0}</p>
                </div>
                <FaExclamationTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilter('assigned')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'assigned' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Assigned
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilter('review')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'review' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Review
              </button>
            </div>

            <div className="flex space-x-4">
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Team Members</option>
                {teamMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
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
                {filter === 'all' ? 'No tasks available for your team.' : `No ${filter} tasks found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div key={task._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
                        {isOverdue(task.dueDate, task.status) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Overdue
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaCalendarAlt className="w-4 h-4 mr-1" />
                          Due: {formatDate(task.dueDate)}
                        </div>
                        <div className="flex items-center">
                          <FaUser className="w-4 h-4 mr-1" />
                          Assigned to: {getAssigneeNames(task.assignedTo)}
                        </div>
                        <div className="flex items-center">
                          <FaChartBar className="w-4 h-4 mr-1" />
                          Progress: {task.progress}%
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {task.status === 'review' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => approveTask(task._id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
                          >
                            <FaUserCheck className="w-3 h-3 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => requestRevision(task._id)}
                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 flex items-center"
                          >
                            <FaUserTimes className="w-3 h-3 mr-1" />
                            Revise
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center"
                      >
                        <FaEye className="w-3 h-3 mr-1" />
                        View
                      </button>

                      <button
                        onClick={() => router.push(`/dashboard/tasks/assign?taskId=${task._id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                      >
                        <FaUsers className="w-3 h-3 mr-1" />
                        Assign
                      </button>
                    </div>
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
