'use client'

import { useEffect, useState } from 'react'
import {
  FaUsers, FaCalendarAlt, FaUserPlus,
  FaArrowUp, FaArrowDown, FaBriefcase, FaFileAlt,
  FaExclamationCircle, FaUserClock, FaUserTimes,
  FaChartLine, FaExclamationTriangle
} from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Fetch HR dashboard data
const fetchHRStats = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/dashboard/hr-stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Error fetching HR stats:', error)
    return null
  }
}

export default function HRDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchHRStats()
      setStats(data)
      setLoading(false)
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    )
  }

  // Create stats cards data from API response
  const hrStatsData = stats ? [
    {
      title: 'Total Employees',
      value: stats.totalEmployees.value.toString(),
      change: `${stats.totalEmployees.changePercent}%`,
      icon: FaUsers,
      color: 'bg-blue-500',
      trend: stats.totalEmployees.trend
    },
    {
      title: 'Active Today',
      value: `${stats.activeToday.value}/${stats.activeToday.total}`,
      change: `${stats.activeToday.percentage}%`,
      icon: FaUserClock,
      color: 'bg-green-500',
      trend: 'up'
    },
    {
      title: 'On Leave Today',
      value: stats.onLeaveToday.value.toString(),
      change: `${stats.onLeaveToday.percentage}%`,
      icon: FaCalendarAlt,
      color: 'bg-yellow-500',
      trend: 'neutral'
    },
    {
      title: 'Late Today',
      value: stats.lateToday.value.toString(),
      change: `${stats.lateToday.percentage}%`,
      icon: FaUserTimes,
      color: 'bg-red-500',
      trend: 'down'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals.leaves.toString(),
      change: 'Leaves',
      icon: FaExclamationCircle,
      color: 'bg-orange-500',
      trend: 'neutral'
    },
    {
      title: 'Open Positions',
      value: stats.openPositions.value.toString(),
      change: 'Active',
      icon: FaBriefcase,
      color: 'bg-purple-500',
      trend: 'up'
    },
    {
      title: 'PIP Cases',
      value: stats.pipCases.value.toString(),
      change: 'Active',
      icon: FaExclamationTriangle,
      color: 'bg-red-600',
      trend: 'neutral'
    },
    {
      title: 'Attrition Rate',
      value: `${stats.attritionRate.value}%`,
      change: `${stats.attritionRate.leftThisMonth} left`,
      icon: FaChartLine,
      color: 'bg-indigo-500',
      trend: stats.attritionRate.value > 5 ? 'up' : 'down'
    }
  ] : []

  return (
    <div className="page-container space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-3 sm:p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">HR Dashboard 👥</h1>
        <p className="text-green-100 text-sm sm:text-base">Manage people, processes, and organizational growth</p>
        {stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.totalEmployees.value}</div>
              <div className="text-green-100 text-sm">Total Employees</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.genderRatio.malePercent}% / {stats.genderRatio.femalePercent}%</div>
              <div className="text-green-100 text-sm">Male / Female</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.attendanceRate.value}%</div>
              <div className="text-green-100 text-sm">Attendance Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.newHires.value}</div>
              <div className="text-green-100 text-sm">New Hires</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {hrStatsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-3 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-xs sm:text-sm font-medium truncate">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stat.value}</h3>
                <div className="flex items-center mt-1 sm:mt-2">
                  {stat.trend === 'up' ? (
                    <FaArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1 flex-shrink-0" />
                  ) : stat.trend === 'down' ? (
                    <FaArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mr-1 flex-shrink-0" />
                  ) : null}
                  <span className={`text-xs sm:text-sm font-medium truncate ${
                    stat.trend === 'up' ? 'text-green-500' :
                    stat.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`${stat.color} p-2 sm:p-4 rounded-lg flex-shrink-0`}>
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Distribution & Gender Ratio */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.departmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gender Ratio */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Male', value: stats.genderRatio.male, color: '#3b82f6' },
                    { name: 'Female', value: stats.genderRatio.female, color: '#ec4899' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Male', value: stats.genderRatio.male, color: '#3b82f6' },
                    { name: 'Female', value: stats.genderRatio.female, color: '#ec4899' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Key Metrics Row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Attendance Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Attendance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Present</span>
                <span className="font-semibold text-green-600">{stats.activeToday.value}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">On Leave</span>
                <span className="font-semibold text-yellow-600">{stats.onLeaveToday.value}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Late</span>
                <span className="font-semibold text-red-600">{stats.lateToday.value}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Attendance Rate</span>
                  <span className="font-bold text-blue-600">{stats.attendanceRate.value}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Attrition Rate</span>
                <span className={`font-semibold ${stats.attritionRate.value > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.attritionRate.value}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">PIP Cases</span>
                <span className={`font-semibold ${stats.pipCases.value > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.pipCases.value}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Open Positions</span>
                <span className="font-semibold text-blue-600">{stats.openPositions.value}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Payroll Status</span>
                  <span className={`font-bold ${stats.payrollStatus.generated ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stats.payrollStatus.generated ? 'Generated' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/dashboard/employees/add"
                className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FaUserPlus className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-blue-900">Add Employee</span>
              </a>
              <a
                href="/dashboard/leave/approvals"
                className="flex items-center p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <FaCalendarAlt className="w-5 h-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-yellow-900">
                  Review Leaves ({stats.pendingApprovals.leaves})
                </span>
              </a>
              <a
                href="/dashboard/recruitment"
                className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <FaBriefcase className="w-5 h-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-purple-900">Manage Jobs</span>
              </a>
              <a
                href="/dashboard/reports"
                className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FaFileAlt className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-green-900">Generate Reports</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Alerts & Notifications */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            {stats.pipCases.value > 0 && (
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <FaExclamationTriangle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    {stats.pipCases.value} employee(s) on Performance Improvement Plan
                  </p>
                  <p className="text-xs text-red-700">Requires immediate attention</p>
                </div>
              </div>
            )}

            {stats.attritionRate.value > 5 && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <FaChartLine className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    High attrition rate: {stats.attritionRate.value}%
                  </p>
                  <p className="text-xs text-yellow-700">Consider retention strategies</p>
                </div>
              </div>
            )}

            {stats.lateToday.value > (stats.totalEmployees.value * 0.1) && (
              <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                <FaUserTimes className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    High late arrivals today: {stats.lateToday.value} employees
                  </p>
                  <p className="text-xs text-orange-700">Review attendance policies</p>
                </div>
              </div>
            )}

            {!stats.payrollStatus.generated && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <FaFileAlt className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Payroll pending for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-blue-700">Generate payslips before month end</p>
                </div>
              </div>
            )}

            {stats.pendingApprovals.leaves > 0 && (
              <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                <FaCalendarAlt className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    {stats.pendingApprovals.leaves} leave request(s) pending approval
                  </p>
                  <p className="text-xs text-purple-700">Review and approve pending requests</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
