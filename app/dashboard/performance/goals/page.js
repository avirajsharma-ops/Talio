'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaPlus, FaEye, FaEdit, FaTrash, FaBullseye, FaSearch, FaFilter, FaCalendarAlt } from 'react-icons/fa'

export default function PerformanceGoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchGoals()
    }
  }, [])

  const fetchGoals = async () => {
    try {
      // Mock data for now
      const mockGoals = [
        {
          _id: '1',
          employee: { firstName: 'John', lastName: 'Doe', employeeCode: 'EMP001' },
          title: 'Complete Project Alpha',
          description: 'Lead the development of Project Alpha and deliver on time',
          category: 'Project Management',
          priority: 'high',
          status: 'in-progress',
          progress: 75,
          startDate: '2024-01-01',
          dueDate: '2025-03-31',
          createdBy: { firstName: 'Jane', lastName: 'Smith' }
        },
        {
          _id: '2',
          employee: { firstName: 'Alice', lastName: 'Johnson', employeeCode: 'EMP002' },
          title: 'Improve Technical Skills',
          description: 'Complete advanced JavaScript and React certification',
          category: 'Skill Development',
          priority: 'medium',
          status: 'not-started',
          progress: 0,
          startDate: '2024-02-01',
          dueDate: '2025-06-30',
          createdBy: { firstName: 'Bob', lastName: 'Wilson' }
        },
        {
          _id: '3',
          employee: { firstName: 'Mike', lastName: 'Brown', employeeCode: 'EMP003' },
          title: 'Team Leadership',
          description: 'Successfully lead a team of 5 developers',
          category: 'Leadership',
          priority: 'high',
          status: 'completed',
          progress: 100,
          startDate: '2024-01-15',
          dueDate: '2024-12-31',
          createdBy: { firstName: 'Sarah', lastName: 'Davis' }
        }
      ]
      
      setGoals(mockGoals)
    } catch (error) {
      console.error('Fetch goals error:', error)
      toast.error('Failed to fetch performance goals')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      // Mock delete
      setGoals(goals.filter(g => g._id !== goalId))
      toast.success('Goal deleted successfully')
    } catch (error) {
      console.error('Delete goal error:', error)
      toast.error('Failed to delete goal')
    }
  }

  const canManageGoals = () => {
    return user && ['admin', 'hr', 'manager'].includes(user.role)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'not-started': return 'bg-gray-100 text-gray-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'on-hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (dueDate, status) => {
    return status !== 'completed' && new Date(dueDate) < new Date()
  }

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = searchTerm === '' || 
      `${goal.employee.firstName} ${goal.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.title.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || goal.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Performance Goals</h1>
          <p className="text-gray-600 mt-1">Manage employee goals and objectives</p>
        </div>
        {canManageGoals() && (
          <button
            onClick={() => router.push('/dashboard/performance/goals/create')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { title: 'Total Goals', value: goals.length, color: 'bg-blue-500' },
          { title: 'Completed', value: goals.filter(g => g.status === 'completed').length, color: 'bg-green-500' },
          { title: 'In Progress', value: goals.filter(g => g.status === 'in-progress').length, color: 'bg-yellow-500' },
          { title: 'Overdue', value: goals.filter(g => isOverdue(g.dueDate, g.status)).length, color: 'bg-red-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-4 rounded-lg`}>
                <FaBullseye className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search goals or employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="not-started">Not Started</option>
                <option value="on-hold">On Hold</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaBullseye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-500">
            {canManageGoals() ? 'Create your first performance goal to get started.' : 'No performance goals have been set yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => (
            <div key={goal._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {goal.employee.firstName.charAt(0)}{goal.employee.lastName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(goal.priority)}`}>
                        {goal.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{goal.employee.firstName} {goal.employee.lastName} ({goal.employee.employeeCode})</p>
                    <p className="text-gray-700 mb-3">{goal.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            goal.progress === 100 ? 'bg-green-500' : 
                            goal.progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FaCalendarAlt className="w-4 h-4" />
                        <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                        {isOverdue(goal.dueDate, goal.status) && (
                          <span className="text-red-600 font-medium">(Overdue)</span>
                        )}
                      </div>
                      <span>Category: {goal.category}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(goal.status)}`}>
                    {goal.status.replace('-', ' ')}
                  </span>
                  {canManageGoals() && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/performance/goals/${goal._id}`)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Goal"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/performance/goals/edit/${goal._id}`)}
                        className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Edit Goal"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal._id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Goal"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-gray-100">
                <span>Created by: {goal.createdBy.firstName} {goal.createdBy.lastName}</span>
                <span>Start Date: {new Date(goal.startDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
