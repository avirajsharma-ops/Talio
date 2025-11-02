'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  FaUsers, FaClock, FaCalendarAlt, FaMoneyBillWave,
  FaChartLine, FaBriefcase, FaArrowUp, FaArrowDown,
  FaUserPlus, FaBuilding, FaExclamationTriangle, FaEye,
  FaEdit, FaCheck, FaTimes, FaSearch
} from 'react-icons/fa'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AdminDashboard({ user }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    employees: [],
    departments: [],
    leaveRequests: [],
    attendanceData: [],
    departmentStats: [],
    recentActivities: [],
    pendingApprovals: []
  })
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeSearch, setEmployeeSearch] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')

      // Fetch all data in parallel
      const [
        employeesRes,
        departmentsRes,
        leaveRequestsRes,
        attendanceRes
      ] = await Promise.all([
        fetch('/api/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/departments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/leave', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/attendance/summary', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const [employeesData, departmentsData, leaveData, attendanceData] = await Promise.all([
        employeesRes.json(),
        departmentsRes.json(),
        leaveRequestsRes.json(),
        attendanceRes.json()
      ])

      setDashboardData({
        employees: employeesData.success ? employeesData.data : [],
        departments: departmentsData.success ? departmentsData.data : [],
        leaveRequests: leaveData.success ? leaveData.data : [],
        attendanceData: attendanceData.success ? attendanceData.data : [],
        departmentStats: departmentsData.success ? calculateDepartmentStats(departmentsData.data) : [],
        pendingApprovals: leaveData.success ? leaveData.data.filter(req => req.status === 'pending') : []
      })
    } catch (error) {
      console.error('Fetch dashboard data error:', error)
      toast.error('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const calculateDepartmentStats = (departments) => {
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']
    return departments.map((dept, index) => ({
      name: dept.name,
      value: dept.employeeCount || 0,
      color: colors[index % colors.length]
    }))
  }

  const getStatsData = () => {
    // Safety checks to ensure arrays exist
    const employees = Array.isArray(dashboardData.employees) ? dashboardData.employees : []
    const leaveRequests = Array.isArray(dashboardData.leaveRequests) ? dashboardData.leaveRequests : []
    const pendingApprovals = Array.isArray(dashboardData.pendingApprovals) ? dashboardData.pendingApprovals : []
    const departments = Array.isArray(dashboardData.departments) ? dashboardData.departments : []

    const totalEmployees = employees.length
    const activeEmployees = employees.filter(emp => emp.status === 'active').length
    const onLeaveToday = leaveRequests.filter(req => {
      if (req.status !== 'approved') return false
      const today = new Date()
      const startDate = new Date(req.startDate)
      const endDate = new Date(req.endDate)
      return today >= startDate && today <= endDate
    }).length
    const pendingApprovalsCount = pendingApprovals.length
    const totalDepartments = departments.length

    return [
      { title: 'Total Employees', value: totalEmployees, icon: FaUsers, color: 'bg-blue-500', href: '/dashboard/employees' },
      { title: 'Active Employees', value: activeEmployees, icon: FaClock, color: 'bg-green-500', href: '/dashboard/employees' },
      { title: 'On Leave Today', value: onLeaveToday, icon: FaCalendarAlt, color: 'bg-yellow-500', href: '/dashboard/leave/requests' },
      { title: 'Pending Approvals', value: pendingApprovalsCount, icon: FaChartLine, color: 'bg-purple-500', href: '/dashboard/leave/approvals' },
      { title: 'Departments', value: totalDepartments, icon: FaBuilding, color: 'bg-teal-500', href: '/dashboard/departments' },
      { title: 'System Health', value: 'Good', icon: FaExclamationTriangle, color: 'bg-green-500', href: '/dashboard/settings' },
    ]
  }
  const handleLeaveAction = async (leaveId, action, reason = '') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/leave/${leaveId}/action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason,
          approvedBy: user.employeeId._id,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Leave request ${action}d successfully`)
        fetchDashboardData() // Refresh data
      } else {
        toast.error(data.message || `Failed to ${action} leave request`)
      }
    } catch (error) {
      console.error(`${action} leave error:`, error)
      toast.error(`Failed to ${action} leave request`)
    }
  }

  const viewEmployeeDetails = (employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const statsData = getStatsData()

  return (
    <div className="page-container space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard </h1>
        <p className="text-blue-100">Complete system overview and management controls</p>
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => router.push('/dashboard/employees/add')}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <FaUserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/leave/approvals')}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <FaCheck className="w-4 h-4" />
            <span>Approve Leaves ({Array.isArray(dashboardData.pendingApprovals) ? dashboardData.pendingApprovals.length : 0})</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {statsData.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-3 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(stat.href)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-xs sm:text-sm font-medium truncate">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-2 sm:p-4 rounded-lg flex-shrink-0`}>
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
          {(Array.isArray(dashboardData.departmentStats) && dashboardData.departmentStats.length > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.departmentStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dashboardData.departmentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No department data available
            </div>
          )}
        </div>

        {/* Recent Leave Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Leave Requests</h3>
            <button
              onClick={() => router.push('/dashboard/leave/approvals')}
              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {(Array.isArray(dashboardData.leaveRequests) ? dashboardData.leaveRequests : []).slice(0, 5).map((request) => (
              <div key={request._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {request.employee?.firstName?.charAt(0)}{request.employee?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.employee?.firstName} {request.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.leaveType?.name} - {request.numberOfDays} day(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </span>
                  {request.status === 'pending' && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleLeaveAction(request._id, 'approve')}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Approve"
                      >
                        <FaCheck className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleLeaveAction(request._id, 'reject', 'Rejected by admin')}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Reject"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!Array.isArray(dashboardData.leaveRequests) || dashboardData.leaveRequests.length === 0) && (
              <div className="text-center text-gray-500 py-8">
                No leave requests found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Management Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="md:flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold  md:mt-0 mt-3 md:mb-0 mb-4 text-gray-900">Employee Management</h3>
          <div className="flex space-x-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => router.push('/dashboard/employees')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              View All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(Array.isArray(dashboardData.employees) ? dashboardData.employees : [])
                .filter(emp =>
                  employeeSearch === '' ||
                  `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                  emp.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase())
                )
                .slice(0, 10)
                .map((employee) => (
                <tr key={employee._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' :
                      employee.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewEmployeeDetails(employee)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/employees/edit/${employee._id}`)}
                        className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Edit Employee"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Add Employee', icon: FaUserPlus, href: '/dashboard/employees/add', color: 'bg-green-500' },
            { name: 'Manage Departments', icon: FaBuilding, href: '/dashboard/departments', color: 'bg-blue-500' },
            { name: 'Leave Types', icon: FaCalendarAlt, href: '/dashboard/leave-types', color: 'bg-purple-500' },
            { name: 'Leave Allocations', icon: FaMoneyBillWave, href: '/dashboard/leave/allocations', color: 'bg-red-500' },
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className={`${action.color} p-3 rounded-lg mb-3`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 text-center">{action.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Employee Details Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Employee Details</h2>
              <button
                onClick={() => {
                  setShowEmployeeModal(false)
                  setSelectedEmployee(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h3>
                    <p className="text-gray-600">{selectedEmployee.employeeCode}</p>
                    <p className="text-sm text-gray-500">{selectedEmployee.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.department?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Designation:</span>
                    <span className="ml-2 font-medium">
                      {selectedEmployee.designation?.levelName && selectedEmployee.designation?.title
                        ? `${selectedEmployee.designation.levelName} - ${selectedEmployee.designation.title}`
                        : selectedEmployee.designation?.title || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      selectedEmployee.status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedEmployee.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Join Date:</span>
                    <span className="ml-2 font-medium">
                      {selectedEmployee.dateOfJoining ? new Date(selectedEmployee.dateOfJoining).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowEmployeeModal(false)
                    router.push(`/dashboard/employees/${selectedEmployee._id}`)
                  }}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  View Full Profile
                </button>
                <button
                  onClick={() => {
                    setShowEmployeeModal(false)
                    router.push(`/dashboard/employees/edit/${selectedEmployee._id}`)
                  }}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => {
                    setShowEmployeeModal(false)
                    router.push(`/dashboard/leave/requests?employee=${selectedEmployee._id}`)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  View Leaves
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
