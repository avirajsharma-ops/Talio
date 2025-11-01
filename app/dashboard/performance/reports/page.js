'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaDownload, FaChartBar, FaUsers, FaTrophy, FaCalendarAlt, FaFilter } from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

export default function PerformanceReportsPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [reportData, setReportData] = useState({
    departmentPerformance: [],
    performanceTrends: [],
    ratingDistribution: [],
    goalCompletion: []
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
      // Mock data for reports
      const mockData = {
        departmentPerformance: [
          { department: 'Engineering', avgRating: 4.2, employees: 25, completedGoals: 18 },
          { department: 'Marketing', avgRating: 3.8, employees: 12, completedGoals: 9 },
          { department: 'Sales', avgRating: 4.0, employees: 18, completedGoals: 14 },
          { department: 'HR', avgRating: 4.1, employees: 8, completedGoals: 6 },
          { department: 'Finance', avgRating: 3.9, employees: 10, completedGoals: 8 }
        ],
        performanceTrends: [
          { month: 'Jan', avgRating: 3.8, reviews: 15 },
          { month: 'Feb', avgRating: 3.9, reviews: 18 },
          { month: 'Mar', avgRating: 4.0, reviews: 22 },
          { month: 'Apr', avgRating: 4.1, reviews: 20 },
          { month: 'May', avgRating: 4.0, reviews: 25 },
          { month: 'Jun', avgRating: 4.2, reviews: 28 }
        ],
        ratingDistribution: [
          { rating: '5 Stars', count: 25, percentage: 35 },
          { rating: '4 Stars', count: 30, percentage: 42 },
          { rating: '3 Stars', count: 12, percentage: 17 },
          { rating: '2 Stars', count: 3, percentage: 4 },
          { rating: '1 Star', count: 1, percentage: 2 }
        ],
        goalCompletion: [
          { quarter: 'Q1', completed: 85, total: 100, percentage: 85 },
          { quarter: 'Q2', completed: 92, total: 110, percentage: 84 },
          { quarter: 'Q3', completed: 78, total: 95, percentage: 82 },
          { quarter: 'Q4', completed: 88, total: 105, percentage: 84 }
        ]
      }
      
      setReportData(mockData)
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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { title: 'Total Reviews', value: '128', icon: FaChartBar, color: 'bg-blue-500' },
          { title: 'Avg Rating', value: '4.1', icon: FaTrophy, color: 'bg-yellow-500' },
          { title: 'Goal Completion', value: '84%', icon: FaUsers, color: 'bg-green-500' },
          { title: 'Top Performers', value: '25', icon: FaTrophy, color: 'bg-purple-500' },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Department Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Department Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgRating" fill="#3B82F6" name="Avg Rating" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Trends */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.performanceTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgRating" stroke="#10B981" name="Avg Rating" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Rating Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.ratingDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {reportData.ratingDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Goal Completion */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Goal Completion by Quarter</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.goalCompletion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="percentage" fill="#F59E0B" name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
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
