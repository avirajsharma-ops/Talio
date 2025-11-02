'use client'

import { 
  FaUsers, FaClock, FaCalendarAlt, FaChartLine, 
  FaArrowUp, FaArrowDown, FaTasks, FaAward,
  FaExclamationCircle, FaCheckCircle
} from 'react-icons/fa'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const managerStatsData = [
  { title: 'Team Members', value: '24', change: '+2', icon: FaUsers, color: 'bg-blue-500', trend: 'up' },
  { title: 'Team Attendance', value: '92%', change: '+3%', icon: FaClock, color: 'bg-green-500', trend: 'up' },
  { title: 'Pending Leaves', value: '5', change: '+2', icon: FaCalendarAlt, color: 'bg-yellow-500', trend: 'up' },
  { title: 'Active Projects', value: '8', change: '+1', icon: FaTasks, color: 'bg-purple-500', trend: 'up' },
  { title: 'Team Performance', value: '87%', change: '+5%', icon: FaChartLine, color: 'bg-indigo-500', trend: 'up' },
  { title: 'Completed Goals', value: '12', change: '+4', icon: FaAward, color: 'bg-teal-500', trend: 'up' },
]

const teamAttendanceData = [
  { name: 'Mon', present: 22, absent: 2 },
  { name: 'Tue', present: 23, absent: 1 },
  { name: 'Wed', present: 21, absent: 3 },
  { name: 'Thu', present: 24, absent: 0 },
  { name: 'Fri', present: 22, absent: 2 },
]

const performanceData = [
  { month: 'Jul', performance: 82 },
  { month: 'Aug', performance: 85 },
  { month: 'Sep', performance: 83 },
  { month: 'Oct', performance: 87 },
  { month: 'Nov', performance: 89 },
  { month: 'Dec', performance: 87 },
]

export default function ManagerDashboard({ user }) {
  return (
    <div className="page-container space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-3 sm:p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Manager Dashboard</h1>
        <p className="text-purple-100 text-sm sm:text-base">Lead your team to success and track performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {managerStatsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-3 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-xs sm:text-sm font-medium truncate">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stat.value}</h3>
                <div className="flex items-center mt-1 sm:mt-2">
                  {stat.trend === 'up' ? (
                    <FaArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1 flex-shrink-0" />
                  ) : (
                    <FaArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mr-1 flex-shrink-0" />
                  )}
                  <span className={`text-xs sm:text-sm font-medium truncate ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm ml-1 hidden sm:inline">vs last month</span>
                </div>
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
        {/* Team Attendance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Attendance This Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamAttendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="#10b981" name="Present" />
              <Bar dataKey="absent" fill="#ef4444" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Performance']} />
              <Legend />
              <Line type="monotone" dataKey="performance" stroke="#8b5cf6" strokeWidth={3} name="Team Performance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Management & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Team Activities</h3>
          <div className="space-y-4">
            {[
              { action: 'Project milestone completed', name: 'Sarah - Mobile App Phase 2', time: '2 hours ago', color: 'bg-green-100 text-green-800' },
              { action: 'Leave request submitted', name: 'Mike - Annual leave Dec 20-24', time: '4 hours ago', color: 'bg-blue-100 text-blue-800' },
              { action: 'Performance review completed', name: 'Jennifer - Q4 Review', time: '1 day ago', color: 'bg-purple-100 text-purple-800' },
              { action: 'Training completed', name: 'David - React Advanced Course', time: '2 days ago', color: 'bg-yellow-100 text-yellow-800' },
              { action: 'Goal achieved', name: 'Team - Sprint 12 Completion', time: '3 days ago', color: 'bg-indigo-100 text-indigo-800' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${activity.color.split(' ')[0]}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.name}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Manager Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manager Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Review Leaves', icon: FaCalendarAlt, href: '/dashboard/leave/approvals', color: 'bg-green-500' },
              { name: 'Team Performance', icon: FaChartLine, href: '/dashboard/performance/reviews', color: 'bg-blue-500' },
              { name: 'Create Review', icon: FaAward, href: '/dashboard/performance/create', color: 'bg-purple-500' },
              { name: 'Mark Attendance', icon: FaClock, href: '/dashboard/attendance', color: 'bg-red-500' },
            ].map((action, index) => (
              <a
                key={index}
                href={action.href}
                className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className={`${action.color} p-3 rounded-lg mb-3`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 text-center">{action.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Team Members & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-3">
            {[
              { name: 'Sarah Johnson', role: 'Senior Developer', status: 'Present', avatar: 'SJ' },
              { name: 'Mike Chen', role: 'Frontend Developer', status: 'Present', avatar: 'MC' },
              { name: 'Jennifer Davis', role: 'UI/UX Designer', status: 'On Leave', avatar: 'JD' },
              { name: 'David Wilson', role: 'Backend Developer', status: 'Present', avatar: 'DW' },
              { name: 'Lisa Brown', role: 'QA Engineer', status: 'Present', avatar: 'LB' },
            ].map((member, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  member.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Leave Approvals */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Leave Approvals</h3>
          <div className="space-y-4">
            {[
              { name: 'Mike Chen', type: 'Annual Leave', dates: 'Dec 20-24, 2024', days: '5 days' },
              { name: 'David Wilson', type: 'Sick Leave', dates: 'Dec 18, 2024', days: '1 day' },
              { name: 'Lisa Brown', type: 'Personal Leave', dates: 'Dec 22-23, 2024', days: '2 days' },
            ].map((request, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{request.name}</h4>
                  <span className="text-xs text-gray-500">{request.days}</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">{request.type} • {request.dates}</p>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    Approve
                  </button>
                  <button className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
