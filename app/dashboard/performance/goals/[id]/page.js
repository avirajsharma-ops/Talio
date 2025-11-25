'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaEdit, FaTrash, FaBullseye, FaCalendar, FaUser, FaCheckCircle, FaClock } from 'react-icons/fa'

export default function GoalDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchGoal()
  }, [params.id])

  const fetchGoal = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockGoal = {
        _id: params.id,
        employee: { 
          _id: 'emp1',
          firstName: 'John', 
          lastName: 'Doe', 
          employeeCode: 'EMP001',
          department: 'Engineering',
          position: 'Senior Developer'
        },
        title: 'Complete Project Alpha',
        description: 'Lead the development of Project Alpha, a critical customer-facing application that will improve user experience and increase customer satisfaction. This project involves coordinating with multiple teams, implementing new technologies, and ensuring timely delivery.',
        category: 'Project Management',
        priority: 'high',
        status: 'in-progress',
        progress: 75,
        startDate: '2024-01-01T00:00:00.000Z',
        dueDate: '2025-03-31T00:00:00.000Z',
        createdBy: { 
          _id: 'mgr1',
          firstName: 'Jane', 
          lastName: 'Smith',
          position: 'Engineering Manager'
        },
        milestones: [
          {
            _id: 'm1',
            title: 'Requirements Gathering',
            description: 'Complete stakeholder interviews and document requirements',
            dueDate: '2024-02-15T00:00:00.000Z',
            completed: true,
            completedDate: '2024-02-10T00:00:00.000Z'
          },
          {
            _id: 'm2',
            title: 'System Design',
            description: 'Create technical architecture and system design documents',
            dueDate: '2024-03-30T00:00:00.000Z',
            completed: true,
            completedDate: '2024-03-25T00:00:00.000Z'
          },
          {
            _id: 'm3',
            title: 'Development Phase 1',
            description: 'Implement core functionality and basic features',
            dueDate: '2024-06-30T00:00:00.000Z',
            completed: true,
            completedDate: '2024-06-28T00:00:00.000Z'
          },
          {
            _id: 'm4',
            title: 'Development Phase 2',
            description: 'Implement advanced features and integrations',
            dueDate: '2024-12-31T00:00:00.000Z',
            completed: false
          },
          {
            _id: 'm5',
            title: 'Testing and Deployment',
            description: 'Complete testing, bug fixes, and production deployment',
            dueDate: '2025-03-31T00:00:00.000Z',
            completed: false
          }
        ],
        comments: 'John has shown excellent leadership in this project. The team is on track to meet the deadline.',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-12-15T00:00:00.000Z'
      }
      
      setGoal(mockGoal)
    } catch (error) {
      console.error('Fetch goal error:', error)
      toast.error('Failed to fetch goal details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      // Mock delete - replace with actual API call
      toast.success('Goal deleted successfully')
      router.push('/dashboard/performance/goals')
    } catch (error) {
      console.error('Delete goal error:', error)
      toast.error('Failed to delete goal')
    }
  }

  const handleProgressUpdate = async (newProgress) => {
    try {
      // Mock update - replace with actual API call
      setGoal(prev => ({ ...prev, progress: newProgress }))
      toast.success('Progress updated successfully')
    } catch (error) {
      console.error('Update progress error:', error)
      toast.error('Failed to update progress')
    }
  }

  const canManageGoals = () => {
    return user && ['admin', 'hr', 'manager'].includes(user.role)
  }

  const canUpdateProgress = () => {
    return user && (user.role === 'employee' || canManageGoals())
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Goal Not Found</h1>
          <p className="text-gray-600 mb-4">The goal you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/dashboard/performance/goals')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back to Goals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Goal Details</h1>
            <p className="text-gray-600 mt-1">{goal.title}</p>
          </div>
        </div>
        {canManageGoals() && (
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/dashboard/performance/goals/edit/${goal._id}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <FaEdit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <FaTrash className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goal Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {goal.employee.firstName.charAt(0)}{goal.employee.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{goal.title}</h2>
                  <p className="text-gray-600">{goal.employee.firstName} {goal.employee.lastName}</p>
                  <p className="text-gray-600">{goal.employee.employeeCode} • {goal.employee.position}</p>
                  <p className="text-gray-600">{goal.employee.department}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(goal.status)}`}>
                    {goal.status.replace('-', ' ')}
                  </span>
                  <span className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(goal.priority)}`}>
                    {goal.priority} priority
                  </span>
                </div>
                {isOverdue(goal.dueDate, goal.status) && (
                  <span className="text-red-600 font-medium text-sm">Overdue</span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-gray-800">Progress</span>
                <span className="text-lg font-bold text-primary-600">{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    goal.progress === 100 ? 'bg-green-500' : 
                    goal.progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
              {canUpdateProgress() && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Progress
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    onChange={(e) => handleProgressUpdate(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">{goal.description}</p>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Milestones</h3>
            <div className="space-y-4">
              {goal.milestones.map((milestone, index) => (
                <div key={milestone._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                        milestone.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {milestone.completed ? <FaCheckCircle className="w-4 h-4" /> : <FaClock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${milestone.completed ? 'text-green-800' : 'text-gray-800'}`}>
                          {milestone.title}
                        </h4>
                        <p className="text-gray-600 text-sm mt-1">{milestone.description}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Due: {new Date(milestone.dueDate).toLocaleDateString()}</p>
                      {milestone.completed && milestone.completedDate && (
                        <p className="text-green-600">
                          Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          {goal.comments && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Comments</h3>
              <p className="text-gray-700 leading-relaxed">{goal.comments}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Goal Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Goal Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FaCalendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{new Date(goal.startDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaCalendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{new Date(goal.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaUser className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-medium">{goal.createdBy.firstName} {goal.createdBy.lastName}</p>
                  <p className="text-sm text-gray-500">{goal.createdBy.position}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{goal.category}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Progress</span>
                <span className="font-bold text-primary-600">{goal.progress}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Milestones</span>
                <span className="font-medium">{goal.milestones.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">
                  {goal.milestones.filter(m => m.completed).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining</span>
                <span className="font-medium text-blue-600">
                  {goal.milestones.filter(m => !m.completed).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
