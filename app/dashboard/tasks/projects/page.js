'use client'

import { useState, useEffect } from 'react'
import { FaProjectDiagram, FaPlus, FaUsers, FaTasks, FaCalendarAlt } from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

export default function ProjectsPage() {
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchProjects()
    }
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      // For now, we'll show a placeholder since projects API isn't implemented yet
      setProjects([])
    } catch (error) {
      console.error('Error fetching projects:', error)
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
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div className="flex items-center mb-4 sm:mb-0">
              <FaProjectDiagram className="text-blue-600 mr-3 text-2xl" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                <p className="text-gray-600">Manage and track project progress</p>
              </div>
            </div>

            {(user.role === 'admin' || user.role === 'hr' || user.role === 'manager') && (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <FaPlus className="mr-2" />
                Create Project
              </button>
            )}
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Projects</p>
                  <p className="text-3xl font-bold text-blue-900">0</p>
                </div>
                <FaProjectDiagram className="text-blue-500 text-2xl" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Active Projects</p>
                  <p className="text-3xl font-bold text-green-900">0</p>
                </div>
                <FaTasks className="text-green-500 text-2xl" />
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Team Members</p>
                  <p className="text-3xl font-bold text-yellow-900">0</p>
                </div>
                <FaUsers className="text-yellow-500 text-2xl" />
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Deadlines</p>
                  <p className="text-3xl font-bold text-purple-900">0</p>
                </div>
                <FaCalendarAlt className="text-purple-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <FaProjectDiagram className="text-gray-400 text-4xl mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Project Management Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              Create and manage projects, assign team members, track progress, and set deadlines.
            </p>
            <div className="text-sm text-gray-500">
              Features include:
              <ul className="mt-2 space-y-1">
                <li>• Project creation and management</li>
                <li>• Team assignment and collaboration</li>
                <li>• Progress tracking and milestones</li>
                <li>• Deadline management and notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RoleBasedAccess>
  )
}
