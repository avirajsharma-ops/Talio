'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  FaProjectDiagram, FaPlus, FaUsers, FaTasks, FaCalendarAlt, 
  FaChartLine, FaFilter, FaSearch, FaClock, FaCheckCircle 
} from 'react-icons/fa'

export default function ProjectsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    planning: 0
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchProjects()
    }
  }, [])

  const fetchProjects = async (statusFilter = null) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      let url = '/api/projects'
      if (statusFilter) {
        url += `?status=${statusFilter}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setProjects(data.data)
        calculateStats(data.data)
      } else {
        toast.error(data.message || 'Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (projectsData) => {
    setStats({
      total: projectsData.length,
      active: projectsData.filter(p => p.status === 'active').length,
      completed: projectsData.filter(p => p.status === 'completed').length,
      planning: projectsData.filter(p => p.status === 'planning').length
    })
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    if (newFilter === 'all') {
      fetchProjects()
    } else {
      fetchProjects(newFilter)
    }
  }

  const filteredProjects = projects.filter(project => {
    if (searchTerm) {
      return project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             project.projectCode?.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-600'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getHealthColor = (health) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    }
    return colors[health] || 'bg-gray-500'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
      critical: 'text-red-800 font-bold'
    }
    return colors[priority] || 'text-gray-600'
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:p-6 lg:p-8 pb-14 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <FaProjectDiagram className="text-blue-600 mr-3 text-2xl" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 text-sm sm:text-base">Manage and track project progress</p>
          </div>
        </div>

        {(user.role === 'admin' || user.role === 'hr' || user.role === 'manager') && (
          <button
            onClick={() => router.push('/dashboard/projects/create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <FaPlus className="mr-2" />
            Create Project
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FaProjectDiagram className="text-blue-500 text-xl sm:text-2xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium">Active</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-900">{stats.active}</p>
            </div>
            <FaTasks className="text-green-500 text-xl sm:text-2xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Planning</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.planning}</p>
            </div>
            <FaClock className="text-blue-500 text-xl sm:text-2xl" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <FaCheckCircle className="text-gray-500 text-xl sm:text-2xl" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('planning')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'planning' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => handleFilterChange('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleFilterChange('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'completed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaProjectDiagram className="text-gray-400 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Projects Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first project'}
          </p>
          {(user.role === 'admin' || user.role === 'hr' || user.role === 'manager') && !searchTerm && (
            <button
              onClick={() => router.push('/dashboard/projects/create')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <FaPlus className="mr-2" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              onClick={() => router.push(`/dashboard/projects/${project._id}`)}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.projectCode}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${getHealthColor(project.health)} flex-shrink-0 ml-2 mt-1`} 
                     title={`Health: ${project.health}`}
                />
              </div>

              {/* Description */}
              {project.summary && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.summary}</p>
              )}

              {/* Status and Priority */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority.toUpperCase()}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-200">
                <div className="flex items-center">
                  <FaUsers className="mr-1" />
                  <span>{project.team?.filter(t => t.isActive).length || 0} members</span>
                </div>
                <div className="flex items-center">
                  <FaCalendarAlt className="mr-1" />
                  <span>{new Date(project.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

