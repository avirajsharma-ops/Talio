'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  FaClock, FaCalendarAlt, FaMoneyBillWave, FaFileAlt,
  FaArrowUp, FaArrowDown, FaGraduationCap, FaAward,
  FaCheckCircle, FaExclamationCircle, FaUser, FaBullhorn,
  FaExclamationTriangle, FaGift, FaSignInAlt, FaSignOutAlt
} from 'react-icons/fa'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDesignation } from '@/lib/formatters'

export default function EmployeeDashboard({ user }) {
  const [announcements, setAnnouncements] = useState([])
  const [holidays, setHolidays] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [todayTasks, setTodayTasks] = useState([])
  const [recentActivities, setRecentActivities] = useState([])

  useEffect(() => {
    fetchDashboardData()
    if (user?.employeeId?._id) {
      fetchTodayAttendance()
    }
    fetchTodayTasks()
    fetchRecentActivities()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Fetch all dashboard data in parallel
      const [announcementsRes, holidaysRes, statsRes] = await Promise.all([
        fetch('/api/announcements?limit=5', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/holidays?limit=5', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/employee-stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const [announcementsData, holidaysData, statsData] = await Promise.all([
        announcementsRes.json(),
        holidaysRes.json(),
        statsRes.json()
      ])

      if (announcementsData.success) {
        setAnnouncements(announcementsData.data)
      }

      if (holidaysData.success) {
        setHolidays(holidaysData.data)
      }

      if (statsData.success) {
        setDashboardStats(statsData.data)
      }
    } catch (error) {
      console.error('Fetch dashboard data error:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayAttendance = async () => {
    try {
      const token = localStorage.getItem('token')
      const today = new Date().toISOString().split('T')[0]

      const response = await fetch(`/api/attendance?employeeId=${user.employeeId._id}&date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success && data.data.length > 0) {
        setTodayAttendance(data.data[0])
      }
    } catch (error) {
      console.error('Fetch today attendance error:', error)
    }
  }

  const handleClockIn = async () => {
    if (!user?.employeeId?._id) return
    setAttendanceLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: user.employeeId._id,
          type: 'clock-in',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Clocked in successfully!')
        setTodayAttendance(data.data)
      } else {
        toast.error(data.message || 'Failed to clock in')
      }
    } catch (error) {
      console.error('Clock in error:', error)
      toast.error('An error occurred while clocking in')
    } finally {
      setAttendanceLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!user?.employeeId?._id) return
    setAttendanceLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: user.employeeId._id,
          type: 'clock-out',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Clocked out successfully! 👋')
        setTodayAttendance(data.data)
      } else {
        toast.error(data.message || 'Failed to clock out')
      }
    } catch (error) {
      console.error('Clock out error:', error)
      toast.error('An error occurred while clocking out')
    } finally {
      setAttendanceLoading(false)
    }
  }

  const fetchTodayTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const today = new Date().toISOString().split('T')[0]

      const response = await fetch(`/api/tasks?view=personal&dueDate=${today}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setTodayTasks(data.data || [])
      }
    } catch (error) {
      console.error('Fetch today tasks error:', error)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('token')

      // Fetch today's activities from the new activity API
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/activities?date=${today}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const activities = (data.data || []).map(activity => {
          const activityTime = new Date(activity.createdAt)
          const timeDiff = Date.now() - activityTime.getTime()
          const minsAgo = Math.floor(timeDiff / (1000 * 60))
          const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))

          let timeStr = ''
          if (minsAgo < 1) {
            timeStr = 'Just now'
          } else if (minsAgo < 60) {
            timeStr = `${minsAgo} min${minsAgo > 1 ? 's' : ''} ago`
          } else {
            timeStr = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
          }

          // Map activity type to color
          const colorMap = {
            'attendance_checkin': 'bg-green-100 text-green-800',
            'attendance_checkout': 'bg-blue-100 text-blue-800',
            'leave_apply': 'bg-yellow-100 text-yellow-800',
            'task_create': 'bg-purple-100 text-purple-800',
            'task_update': 'bg-blue-100 text-blue-800',
            'task_complete': 'bg-green-100 text-green-800',
            'task_review': 'bg-yellow-100 text-yellow-800',
            'milestone_create': 'bg-indigo-100 text-indigo-800',
            'milestone_complete': 'bg-green-100 text-green-800',
            'profile_update': 'bg-blue-100 text-blue-800',
            'expense_submit': 'bg-yellow-100 text-yellow-800',
            'goal_create': 'bg-indigo-100 text-indigo-800',
            'goal_complete': 'bg-green-100 text-green-800',
          }

          return {
            action: activity.action,
            details: activity.details || '',
            time: timeStr,
            color: colorMap[activity.type] || 'bg-gray-100 text-gray-800'
          }
        })

        setRecentActivities(activities)
      }
    } catch (error) {
      console.error('Fetch recent activities error:', error)
      // Fallback to empty array
      setRecentActivities([])
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return FaExclamationTriangle
      case 'medium': return FaBullhorn
      case 'low': return FaCheckCircle
      default: return FaBullhorn
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  // Create dynamic stats data
  const employeeStatsData = dashboardStats ? [
    {
      title: 'Hours This Month',
      value: `${dashboardStats.stats.hoursThisMonth.value}h`,
      change: `${dashboardStats.stats.hoursThisMonth.change >= 0 ? '+' : ''}${dashboardStats.stats.hoursThisMonth.change}h`,
      icon: FaClock,
      color: 'bg-blue-500',
      trend: dashboardStats.stats.hoursThisMonth.trend
    },
    {
      title: 'Leave Balance',
      value: `${dashboardStats.stats.leaveBalance.value} days`,
      change: `${dashboardStats.stats.leaveBalance.change >= 0 ? '+' : ''}${dashboardStats.stats.leaveBalance.change}`,
      icon: FaCalendarAlt,
      color: 'bg-green-500',
      trend: dashboardStats.stats.leaveBalance.trend
    },
    {
      title: 'This Month Salary',
      value: `₹${dashboardStats.stats.thisMonthSalary.value.toLocaleString()}`,
      change: `${dashboardStats.stats.thisMonthSalary.change >= 0 ? '+' : ''}₹${Math.abs(dashboardStats.stats.thisMonthSalary.change).toLocaleString()}`,
      icon: FaMoneyBillWave,
      color: 'bg-purple-500',
      trend: dashboardStats.stats.thisMonthSalary.trend
    },
    {
      title: 'Pending Tasks',
      value: `${dashboardStats.stats.pendingTasks.value}`,
      change: `${dashboardStats.stats.pendingTasks.change >= 0 ? '+' : ''}${dashboardStats.stats.pendingTasks.change}`,
      icon: FaFileAlt,
      color: 'bg-yellow-500',
      trend: dashboardStats.stats.pendingTasks.trend
    },
    {
      title: 'Completed Courses',
      value: `${dashboardStats.stats.completedCourses.value}`,
      change: `${dashboardStats.stats.completedCourses.change >= 0 ? '+' : ''}${dashboardStats.stats.completedCourses.change}`,
      icon: FaGraduationCap,
      color: 'bg-indigo-500',
      trend: dashboardStats.stats.completedCourses.trend
    },
    {
      title: 'Performance Score',
      value: `${dashboardStats.stats.performanceScore.value}%`,
      change: `${dashboardStats.stats.performanceScore.change >= 0 ? '+' : ''}${dashboardStats.stats.performanceScore.change}%`,
      icon: FaAward,
      color: 'bg-teal-500',
      trend: dashboardStats.stats.performanceScore.trend
    },
  ] : []

  return (
    <div className="page-container space-y-5 sm:space-y-8">
      {/* Check-In/Check-Out Section - Compact Design */}
      <div style={{ backgroundColor: '#1A295A' }} className="rounded-2xl shadow-md p-4 sm:p-6 text-white">
        {/* User Profile Section */}
        <div className="flex items-center gap-3 mb-4">
          {/* Profile Picture */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0">
            {dashboardStats?.employee?.profilePicture || user?.employeeId?.profilePicture ? (
              <img
                src={dashboardStats?.employee?.profilePicture || user.employeeId.profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <FaUser className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </div>

          {/* User Name and ID */}
          <div>
            <p className="text-xs text-gray-300 mb-0.5">
              ID: {dashboardStats?.employee?.employeeId || user?.employeeId?.employeeCode || '---'}
            </p>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wide">
              {dashboardStats?.employee?.name ||
               (user?.employeeId?.firstName && user?.employeeId?.lastName
                ? `${user.employeeId.firstName} ${user.employeeId.lastName}`
                : 'User')}
            </h2>
            {dashboardStats?.employee?.designation && (
              <p className="text-xs text-gray-300 mt-0.5">
                {formatDesignation(dashboardStats.employee.designation)}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleClockIn}
            disabled={attendanceLoading || (todayAttendance && todayAttendance.checkIn)}
            className="bg-white text-gray-800 hover:bg-gray-100 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center flex-1"
          >
            <span>Check In</span>
          </button>

          <button
            onClick={handleClockOut}
            disabled={attendanceLoading || !todayAttendance || !todayAttendance.checkIn || todayAttendance.checkOut}
            className="bg-transparent border-2 border-white text-white hover:bg-white hover:bg-opacity-10 disabled:border-gray-500 disabled:text-gray-500 disabled:cursor-not-allowed px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center flex-1"
          >
            <span>Check Out</span>
          </button>
        </div>
      </div>

      {/* Quick Glance Section - Separate Card */}
      <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-2xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Quick Glance</h3>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Check In Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                <FaSignInAlt className="w-2.5 h-2.5 text-gray-600" />
              </div>
              <p className="text-xs font-medium text-gray-600">Check In Time</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                {todayAttendance?.checkIn
                  ? new Date(todayAttendance.checkIn).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                  : '--:--'}
              </p>
            </div>
          </div>

          {/* Check Out Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                <FaSignOutAlt className="w-2.5 h-2.5 text-gray-600" />
              </div>
              <p className="text-xs font-medium text-gray-600">Check Out Time</p>
            </div>
            <div className="bg-red-100 rounded-lg p-3">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                {todayAttendance?.checkOut
                  ? new Date(todayAttendance.checkOut).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                  : '--:--'}
              </p>
            </div>
          </div>

          {/* Work Hours */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                <FaClock className="w-2.5 h-2.5 text-gray-600" />
              </div>
              <p className="text-xs font-medium text-gray-600">Work Hours</p>
            </div>
            <div className="bg-yellow-100 rounded-lg p-3">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                {todayAttendance?.workHours
                  ? `${todayAttendance.workHours}h`
                  : '--:--'}
              </p>
            </div>
          </div>

          {/* Work Status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                <FaCheckCircle className="w-2.5 h-2.5 text-gray-600" />
              </div>
              <p className="text-xs font-medium text-gray-600">Work Status</p>
            </div>
            <div className={`rounded-lg p-3 ${
              todayAttendance?.status === 'present' ? 'bg-green-100' :
              todayAttendance?.status === 'half-day' ? 'bg-yellow-100' :
              todayAttendance?.status === 'in-progress' ? 'bg-blue-100' :
              todayAttendance?.workFromHome ? 'bg-purple-100' :
              todayAttendance?.status === 'on-leave' ? 'bg-orange-100' :
              'bg-red-100'
            }`}>
              <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 capitalize">
                {todayAttendance?.workFromHome ? 'WFH' :
                 todayAttendance?.status === 'present' ? 'Present' :
                 todayAttendance?.status === 'half-day' ? 'Half Day' :
                 todayAttendance?.status === 'in-progress' ? 'In Progress' :
                 todayAttendance?.status === 'on-leave' ? 'On Leave' :
                 'Absent'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <FaBullhorn className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Latest Announcements</h2>
            </div>
            <a href="/dashboard/announcements" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              View All
            </a>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((announcement) => {
              const PriorityIcon = getPriorityIcon(announcement.priority)
              return (
                <div key={announcement._id} className={`p-3 sm:p-4 rounded-lg border-l-4 ${getPriorityColor(announcement.priority)}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-start space-x-3 flex-1">
                      <PriorityIcon className="w-4 h-4 sm:w-5 sm:h-5 mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{announcement.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs text-gray-500 space-y-1 sm:space-y-0">
                          <span>By {announcement.createdBy?.firstName} {announcement.createdBy?.lastName}</span>
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full self-start sm:self-auto ${
                      announcement.priority === 'high' ? 'bg-red-100 text-red-800' :
                      announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming Holidays */}
      {holidays.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <FaGift className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Upcoming Holidays</h2>
            </div>
            <a href="/dashboard/holidays" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              View All
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {holidays.slice(0, 3).map((holiday) => (
              <div key={holiday._id} className="bg-gradient-to-r from-green-50 to-blue-50 p-3 sm:p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{holiday.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {new Date(holiday.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {employeeStatsData.map((stat, index) => (
          <div key={index} style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg p-3 sm:p-6 transition-all">
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
                  <span className={`text-xs sm:text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-500' :
                    stat.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm ml-1 hidden sm:inline">vs last month</span>
                </div>
              </div>
              <div className={`${stat.color} p-3 sm:p-4 rounded-lg flex-shrink-0 ml-3`}>
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
        {/* Daily Hours */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">Daily Working Hours (Last 7 Days)</h3>
          </div>
          <div className="h-80 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dashboardStats?.attendanceData || []}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis
                  dataKey="date"
                  fontSize={9}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#9ca3af"
                />
                <YAxis
                  fontSize={9}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#9ca3af"
                  width={35}
                />
                <Tooltip
                  formatter={(value) => [`${value} hours`, 'Working Hours']}
                  labelStyle={{ fontSize: '11px', color: '#374151' }}
                  contentStyle={{ fontSize: '11px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Hours Worked"
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Balance */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">Leave Balance Trend</h3>
          </div>
          <div className="h-80 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardStats?.leaveData || []}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis
                  dataKey="month"
                  fontSize={9}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#9ca3af"
                />
                <YAxis
                  fontSize={9}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#9ca3af"
                  width={35}
                />
                <Tooltip
                  labelStyle={{ fontSize: '11px', color: '#374151' }}
                  contentStyle={{ fontSize: '11px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="used" fill="#ef4444" name="Used" radius={[8, 8, 0, 0]} />
                <Bar dataKey="available" fill="#10b981" name="Available" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Personal Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Recent Activities */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg p-3 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-4">My Recent Activities</h3>
          <div className="space-y-3 sm:space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3 border-b border-gray-100 last:border-0 space-y-1 sm:space-y-0">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activity.color.split(' ')[0]}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.details}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 self-start sm:self-auto ml-5 sm:ml-0">{activity.time}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No recent activities</p>
            )}
          </div>
        </div>

        {/* Employee Quick Actions */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg p-3 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {[
              { name: 'Mark Attendance', icon: FaClock, href: '/dashboard/attendance', color: 'bg-green-500' },
              { name: 'Apply Leave', icon: FaCalendarAlt, href: '/dashboard/leave/apply', color: 'bg-blue-500' },
              { name: 'View Payslip', icon: FaMoneyBillWave, href: '/dashboard/payroll/payslips', color: 'bg-purple-500' },
              { name: 'My Profile', icon: FaUser, href: '/dashboard/profile', color: 'bg-red-500' },
            ].map((action, index) => (
              <a
                key={index}
                href={action.href}
                className="flex flex-col items-center justify-center p-3 sm:p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className={`${action.color} p-2 sm:p-3 rounded-lg mb-2 sm:mb-3`}>
                  <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">{action.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Personal Information & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Today's Schedule */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg p-3 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-4">Today&apos;s Tasks</h3>
          <div className="space-y-3">
            {todayTasks.length > 0 ? (
              todayTasks.map((task, index) => (
                <div key={task._id || index} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100 last:border-0 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'in_progress' ? 'bg-blue-500' :
                      task.status === 'assigned' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        #{task.taskNumber} - {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.priority && (
                          <span className={`inline-block mr-2 ${
                            task.priority === 'high' ? 'text-red-600' :
                            task.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                        {task.progress || 0}% complete
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full self-start sm:self-auto ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No tasks due today</p>
            )}
          </div>
        </div>

        {/* Learning Progress */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg p-3 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-4">Learning Progress</h3>
          <div className="space-y-4">
            {[
              { course: 'React Advanced Concepts', progress: 100, status: 'Completed' },
              { course: 'Node.js Best Practices', progress: 75, status: 'In Progress' },
              { course: 'Database Optimization', progress: 45, status: 'In Progress' },
              { course: 'DevOps Fundamentals', progress: 0, status: 'Not Started' },
            ].map((course, index) => (
              <div key={index} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-1 sm:space-y-0">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate pr-2">{course.course}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full self-start sm:self-auto ${
                    course.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    course.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {course.status}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      course.progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">{course.progress}% complete</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
