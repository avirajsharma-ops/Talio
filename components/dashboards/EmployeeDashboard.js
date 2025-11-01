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
        toast.success('Clocked in successfully! 🎉')
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

      // Fetch recent tasks (last 5 updated)
      const tasksResponse = await fetch(`/api/tasks?view=personal&limit=5&sort=-updatedAt`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const activities = []

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        const tasks = tasksData.data || []

        tasks.forEach(task => {
          const timeDiff = Date.now() - new Date(task.updatedAt).getTime()
          const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
          const daysAgo = Math.floor(hoursAgo / 24)

          let timeStr = ''
          if (daysAgo > 0) {
            timeStr = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
          } else if (hoursAgo > 0) {
            timeStr = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
          } else {
            timeStr = 'Just now'
          }

          let action = 'Task updated'
          let color = 'bg-blue-100 text-blue-800'

          if (task.status === 'completed') {
            action = 'Task completed'
            color = 'bg-green-100 text-green-800'
          } else if (task.status === 'in_progress') {
            action = 'Task in progress'
            color = 'bg-yellow-100 text-yellow-800'
          } else if (task.status === 'assigned') {
            action = 'Task assigned'
            color = 'bg-purple-100 text-purple-800'
          }

          activities.push({
            action,
            details: task.title,
            time: timeStr,
            color
          })
        })
      }

      // Add attendance activity if checked in today
      if (todayAttendance?.checkIn) {
        const checkInTime = new Date(todayAttendance.checkIn)
        const timeDiff = Date.now() - checkInTime.getTime()
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))

        activities.unshift({
          action: 'Clocked in',
          details: `Started work at ${checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
          time: hoursAgo > 0 ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` : 'Just now',
          color: 'bg-green-100 text-green-800'
        })
      }

      setRecentActivities(activities.slice(0, 5))
    } catch (error) {
      console.error('Fetch recent activities error:', error)
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
    <div className="page-container space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg p-3 sm:p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Dashboard 🌟</h1>
        <p className="text-teal-100 text-sm sm:text-base">Track your work, growth, and achievements</p>
        {dashboardStats?.employee && (
          <div className="mt-3 text-teal-100 text-sm">
            <p>Welcome back, {dashboardStats.employee.name}!</p>
          </div>
        )}
      </div>

      {/* Check-In/Check-Out Section */}
      <div className="bg-gradient-to-br from-teal-700 via-cyan-500 to-blue-500 rounded-2xl shadow-xl p-4 sm:p-6 text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Left Side - Info */}
          <div className="flex-1 w-full">
            <div className="flex items-center space-x-3 mb-3 sm:mb-4">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full">
                <FaClock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Quick Attendance</h2>
                <p className="text-teal-100 text-xs sm:text-sm">Mark your attendance for today</p>
              </div>
            </div>

            {/* Attendance Status */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {/* Check In Time */}
                <div className="bg-white bg-opacity-10 rounded-lg p-2 sm:p-3">
                  <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                    <FaSignInAlt className="w-3 h-3 sm:w-4 sm:h-4 text-green-300" />
                    <p className="text-xs font-medium text-teal-100">Check In</p>
                  </div>
                  <p className="text-base sm:text-xl font-bold">
                    {todayAttendance?.checkIn
                      ? new Date(todayAttendance.checkIn).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '--:--'}
                  </p>
                  {todayAttendance?.checkInStatus && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      todayAttendance.checkInStatus === 'on-time' ? 'bg-green-500' :
                      todayAttendance.checkInStatus === 'late' ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                      {todayAttendance.checkInStatus === 'on-time' ? '✓ On Time' :
                       todayAttendance.checkInStatus === 'late' ? '⚠ Late' : '⭐ Early'}
                    </span>
                  )}
                </div>

                {/* Check Out Time */}
                <div className="bg-white bg-opacity-10 rounded-lg p-2 sm:p-3">
                  <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                    <FaSignOutAlt className="w-3 h-3 sm:w-4 sm:h-4 text-orange-300" />
                    <p className="text-xs font-medium text-teal-100">Check Out</p>
                  </div>
                  <p className="text-base sm:text-xl font-bold">
                    {todayAttendance?.checkOut
                      ? new Date(todayAttendance.checkOut).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '--:--'}
                  </p>
                  {todayAttendance?.checkOutStatus && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      todayAttendance.checkOutStatus === 'on-time' ? 'bg-green-500' :
                      todayAttendance.checkOutStatus === 'early' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}>
                      {todayAttendance.checkOutStatus === 'on-time' ? '✓ On Time' :
                       todayAttendance.checkOutStatus === 'early' ? '⚠ Early' : '⭐ Late'}
                    </span>
                  )}
                </div>

                {/* Work Hours */}
                <div className="bg-white bg-opacity-10 rounded-lg p-2 sm:p-3">
                  <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                    <FaClock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-300" />
                    <p className="text-xs font-medium text-teal-100">Work Hours</p>
                  </div>
                  <p className="text-base sm:text-xl font-bold">
                    {todayAttendance?.workHours
                      ? `${todayAttendance.workHours}h`
                      : '--'}
                  </p>
                  {todayAttendance?.status && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      todayAttendance.status === 'present' ? 'bg-green-500' :
                      todayAttendance.status === 'half-day' ? 'bg-yellow-500' :
                      todayAttendance.status === 'in-progress' ? 'bg-blue-500' : 'bg-red-500'
                    }`}>
                      {todayAttendance.status === 'present' ? '✓ Full Day' :
                       todayAttendance.status === 'half-day' ? '½ Half Day' :
                       todayAttendance.status === 'in-progress' ? '⏳ In Progress' : '✗ Absent'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Action Buttons */}
          <div className="flex flex-row sm:flex-col gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={handleClockIn}
              disabled={attendanceLoading || (todayAttendance && todayAttendance.checkIn)}
              className="group relative bg-white text-teal-600 hover:bg-teal-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 flex-1 lg:min-w-[180px]"
            >
              <FaSignInAlt className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Clock In</span>
              {todayAttendance?.checkIn && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  ✓
                </span>
              )}
            </button>

            <button
              onClick={handleClockOut}
              disabled={attendanceLoading || !todayAttendance || !todayAttendance.checkIn || todayAttendance.checkOut}
              className="group relative bg-white text-orange-600 hover:bg-orange-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 flex-1 lg:min-w-[180px]"
            >
              <FaSignOutAlt className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Clock Out</span>
              {todayAttendance?.checkOut && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  ✓
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Office Timing Info */}
        <div className="mt-3 sm:mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 sm:p-3">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-xs">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Office: 11:00 AM - 7:00 PM</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full"></div>
              <span>Full Day: 8+ hrs</span>
            </div>
            {/* <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"></div>
              <span>Half Day:  hrs</span>
            </div> */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {employeeStatsData.map((stat, index) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Daily Hours */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Daily Working Hours (Last 7 Days)</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardStats?.attendanceData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${value} hours`, 'Working Hours']}
                  labelStyle={{ fontSize: '12px' }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Hours Worked"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Leave Balance Trend</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardStats?.leaveData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  labelStyle={{ fontSize: '12px' }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="used" fill="#ef4444" name="Used" />
                <Bar dataKey="available" fill="#10b981" name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Personal Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">My Recent Activities</h3>
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
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
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
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Today&apos;s Schedule</h3>
          <div className="space-y-3">
            {[
              { time: '9:00 AM', task: 'Daily standup meeting', status: 'completed' },
              { time: '10:30 AM', task: 'Code review session', status: 'completed' },
              { time: '2:00 PM', task: 'Client presentation', status: 'upcoming' },
              { time: '4:00 PM', task: 'Team retrospective', status: 'upcoming' },
              { time: '5:30 PM', task: 'Documentation update', status: 'pending' },
            ].map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-100 last:border-0 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{item.task}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full self-start sm:self-auto ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Progress */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
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
