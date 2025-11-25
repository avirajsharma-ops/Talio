'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaDownload, FaChartBar, FaUsers, FaTrophy, FaCalendarAlt, FaFilter } from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import CustomTooltip, { CustomPieTooltip } from '@/components/charts/CustomTooltip'

export default function PerformanceReportsPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [reportData, setReportData] = useState({
    departmentPerformance: [],
    performanceTrends: [],
    ratingDistribution: [],
    goalCompletion: [],
    totalReviews: 0,
    totalTasks: 0,
    completedTasks: 0,
    taskCompletionRate: 0,
    avgRating: 0,
    avgPerformanceScore: 0,
    goalCompletionRate: 0,
    topPerformers: 0
  })
  const [selectedPeriod, setSelectedPeriod] = useState('2024')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchReportData()
    }
  }, [selectedPeriod, selectedDepartment])

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('token')

      // Fetch performance calculations, reviews, goals, and tasks from API
      const [performanceResponse, reviewsResponse, goalsResponse, tasksResponse] = await Promise.all([
        fetch('/api/performance/calculate', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/performance/reviews', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/performance/goals', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/tasks?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const performanceData = await performanceResponse.json()
      const reviewsData = await reviewsResponse.json()
      const goalsData = await goalsResponse.json()
      const tasksData = await tasksResponse.json()

      const performanceMetrics = performanceData.success ? performanceData.data : []
      const reviews = reviewsData.success ? reviewsData.data : []
      const goals = goalsData.success ? goalsData.data : []
      const tasks = tasksData.success ? tasksData.data : []

      // Calculate department performance using performance metrics
      const deptMap = {}

      // Use performance metrics which include both reviews and project data
      performanceMetrics.forEach(metric => {
        const dept = metric.employee?.department?.name || 'Unknown'
        if (!deptMap[dept]) {
          deptMap[dept] = {
            totalScore: 0,
            count: 0,
            employees: new Set(),
            completedTasks: 0,
            totalTasks: 0,
            onTimeRate: 0
          }
        }
        deptMap[dept].totalScore += metric.metrics.performanceScore || 0
        deptMap[dept].count += 1
        deptMap[dept].employees.add(metric.employee?._id)
        deptMap[dept].completedTasks += metric.metrics.completedTasks || 0
        deptMap[dept].totalTasks += metric.metrics.totalTasks || 0
        deptMap[dept].onTimeRate += metric.metrics.onTimeRate || 0
      })

      const departmentPerformance = Object.keys(deptMap).map(dept => ({
        department: dept,
        avgScore: deptMap[dept].count > 0 ? (deptMap[dept].totalScore / deptMap[dept].count).toFixed(1) : 0,
        employees: deptMap[dept].employees.size,
        completedTasks: deptMap[dept].completedTasks,
        totalTasks: deptMap[dept].totalTasks,
        taskCompletionRate: deptMap[dept].totalTasks > 0
          ? ((deptMap[dept].completedTasks / deptMap[dept].totalTasks) * 100).toFixed(1)
          : 0,
        avgOnTimeRate: deptMap[dept].count > 0 ? (deptMap[dept].onTimeRate / deptMap[dept].count).toFixed(1) : 0
      })).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore))

      // Calculate performance trends (last 6 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const trendsMap = {}
      reviews.forEach(review => {
        const date = new Date(review.reviewDate || review.createdAt)
        const monthKey = `${monthNames[date.getMonth()]}`
        if (!trendsMap[monthKey]) {
          trendsMap[monthKey] = { totalRating: 0, count: 0 }
        }
        trendsMap[monthKey].totalRating += review.overallRating || 0
        trendsMap[monthKey].count += 1
      })

      const performanceTrends = Object.keys(trendsMap).map(month => ({
        month,
        avgRating: trendsMap[month].count > 0 ? (trendsMap[month].totalRating / trendsMap[month].count).toFixed(1) : 0,
        reviews: trendsMap[month].count
      }))

      // Calculate rating distribution
      const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      reviews.forEach(review => {
        const rating = Math.round(review.overallRating || 0)
        if (rating >= 1 && rating <= 5) {
          ratingCounts[rating]++
        }
      })

      const totalReviews = reviews.length || 1
      const ratingDistribution = [
        { rating: '5 Stars', count: ratingCounts[5], percentage: Math.round((ratingCounts[5] / totalReviews) * 100) },
        { rating: '4 Stars', count: ratingCounts[4], percentage: Math.round((ratingCounts[4] / totalReviews) * 100) },
        { rating: '3 Stars', count: ratingCounts[3], percentage: Math.round((ratingCounts[3] / totalReviews) * 100) },
        { rating: '2 Stars', count: ratingCounts[2], percentage: Math.round((ratingCounts[2] / totalReviews) * 100) },
        { rating: '1 Star', count: ratingCounts[1], percentage: Math.round((ratingCounts[1] / totalReviews) * 100) }
      ]

      // Calculate goal completion by quarter
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
      const goalCompletion = quarters.map((quarter, index) => {
        const quarterGoals = goals.filter(g => {
          const date = new Date(g.dueDate || g.createdAt)
          const month = date.getMonth()
          return Math.floor(month / 3) === index
        })
        const completed = quarterGoals.filter(g => g.status === 'completed').length
        const total = quarterGoals.length || 1
        return {
          quarter,
          completed,
          total,
          percentage: Math.round((completed / total) * 100)
        }
      })

      // Calculate overall metrics
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      const avgPerformanceScore = performanceMetrics.length > 0
        ? (performanceMetrics.reduce((sum, p) => sum + (p.metrics.performanceScore || 0), 0) / performanceMetrics.length).toFixed(1)
        : 0
      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      const topPerformers = performanceMetrics.filter(p => p.metrics.performanceScore >= 85).length

      setReportData({
        departmentPerformance,
        performanceTrends,
        ratingDistribution,
        goalCompletion,
        totalReviews: reviews.length,
        totalTasks,
        completedTasks,
        taskCompletionRate,
        avgRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviews.length).toFixed(1) : 0,
        avgPerformanceScore,
        goalCompletionRate: goals.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0,
        topPerformers
      })
    } catch (error) {
      console.error('Fetch report data error:', error)
      toast.error('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (type) => {
    // Mock export functionality
    toast.success(`${type} report exported successfully`)
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex md:justify-between md:items-center md:flex-row flex-col mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Performance Reports</h1>
          <p className="text-gray-600 mt-1">Analyze performance data and trends</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => exportReport('PDF')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
          >
            <FaDownload className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => exportReport('Excel')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <FaDownload className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FaCalendarAlt className="text-gray-400 w-4 h-4" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-400 w-4 h-4" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
        {[
          { title: 'Total Reviews', value: reportData.totalReviews || 0, icon: FaChartBar, color: 'bg-blue-500' },
          { title: 'Total Projects', value: reportData.totalTasks || 0, icon: FaChartBar, color: 'bg-indigo-500' },
          { title: 'Avg Performance', value: reportData.avgPerformanceScore || '0', icon: FaTrophy, color: 'bg-yellow-500' },
          { title: 'Project Completion', value: `${reportData.taskCompletionRate || 0}%`, icon: FaUsers, color: 'bg-green-500' },
          { title: 'Goal Completion', value: `${reportData.goalCompletionRate || 0}%`, icon: FaUsers, color: 'bg-teal-500' },
          { title: 'Top Performers', value: reportData.topPerformers || 0, icon: FaTrophy, color: 'bg-purple-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-4 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 mb-6">
        {/* Department Performance */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">Department Performance (Score & Task Completion)</h3>
          </div>
          <div className="h-80 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.departmentPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="department" fontSize={9} tick={{ fontSize: 9, fill: '#6b7280' }} stroke="#9ca3af" />
                <YAxis fontSize={9} tick={{ fontSize: 9, fill: '#6b7280' }} stroke="#9ca3af" width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="avgScore" fill="#3B82F6" name="Avg Performance Score" radius={[8, 8, 0, 0]} />
                <Bar dataKey="taskCompletionRate" fill="#10B981" name="Task Completion %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Trends */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">Performance Trends</h3>
          </div>
          <div className="h-80 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.performanceTrends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="month" fontSize={9} tick={{ fontSize: 9, fill: '#6b7280' }} stroke="#9ca3af" />
                <YAxis fontSize={9} tick={{ fontSize: 9, fill: '#6b7280' }} stroke="#9ca3af" width={35} />
                <Tooltip
                  labelStyle={{ fontSize: '11px', color: '#374151' }}
                  contentStyle={{ fontSize: '11px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="avgRating" stroke="#10B981" strokeWidth={2} name="Avg Rating" dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Distribution */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">Rating Distribution</h3>
          </div>
          <div className="h-80 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.ratingDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.ratingDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  labelStyle={{ fontSize: '11px', color: '#374151' }}
                  contentStyle={{ fontSize: '11px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goal Completion */}
        <div style={{ backgroundColor: '#EEF3FF' }} className="rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">Goal Completion by Quarter</h3>
          </div>
          <div className="h-80 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.goalCompletion} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="quarter" fontSize={9} tick={{ fontSize: 9, fill: '#6b7280' }} stroke="#9ca3af" />
                <YAxis fontSize={9} tick={{ fontSize: 9, fill: '#6b7280' }} stroke="#9ca3af" width={35} />
                <Tooltip content={<CustomTooltip valueFormatter={(value) => `${value}%`} />} />
                <Bar dataKey="percentage" fill="#F59E0B" name="Completion %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Performers</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Goals
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.departmentPerformance.map((dept, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dept.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.avgRating}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.completedGoals}/{dept.employees}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">Strong Performance</h3>
              <p className="text-sm text-green-700 mt-1">
                Engineering department shows highest average rating of 4.2 with 72% goal completion rate.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800">Improvement Opportunity</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Marketing department has potential for growth with focused training programs.
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800">Trend Analysis</h3>
              <p className="text-sm text-blue-700 mt-1">
                Overall performance ratings have improved by 10% compared to last quarter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
