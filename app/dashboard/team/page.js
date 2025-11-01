'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function TeamDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)
  const [teamData, setTeamData] = useState(null)

  useEffect(() => {
    checkDepartmentHead()
  }, [])

  const checkDepartmentHead = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/team/check-head', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success && data.isDepartmentHead) {
        setIsDepartmentHead(true)
        fetchTeamData()
      } else {
        setIsDepartmentHead(false)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking department head:', error)
      setLoading(false)
    }
  }

  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/team/pending-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTeamData(data.data)
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-14 md:pb-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isDepartmentHead) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-4 sm:p-6 lg:p-8 pb-14 md:pb-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">This section is only available to department heads.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-4 sm:p-6 lg:p-8 pb-14 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-1">
          {teamData?.department?.name} Department
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {teamData?.teamMembersCount || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Leaves</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {teamData?.pendingLeaves || 0}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {teamData?.pendingTasks || 0}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(teamData?.pendingLeaves || 0) + (teamData?.pendingTasks || 0)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leave Approvals */}
        <div 
          onClick={() => router.push('/dashboard/team/leave-approvals')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Leave Approvals</h2>
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Review and approve leave requests from your team members
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {teamData?.pendingLeaves || 0} pending requests
            </span>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View All →
            </button>
          </div>
        </div>

        {/* Task Approvals */}
        <div 
          onClick={() => router.push('/dashboard/team/task-approvals')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Task Approvals</h2>
            <div className="bg-purple-100 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Review and approve completed tasks from your team
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {teamData?.pendingTasks || 0} pending approvals
            </span>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View All →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {(teamData?.recentLeaves?.length > 0 || teamData?.recentTasks?.length > 0) && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Pending Items</h2>
          
          {teamData?.recentLeaves?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Leave Requests</h3>
              <div className="space-y-2">
                {teamData.recentLeaves.map((leave) => (
                  <div key={leave._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {leave.leaveType?.name} - {leave.numberOfDays} days
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamData?.recentTasks?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Task Approvals</h3>
              <div className="space-y-2">
                {teamData.recentTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          Assigned by: {task.assignedBy?.firstName} {task.assignedBy?.lastName}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

