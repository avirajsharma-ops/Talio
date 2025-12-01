'use client'

import { FaFileAlt, FaDownload, FaChartBar } from 'react-icons/fa'
import MobilePageWrapper, { MobileGrid } from '@/components/mobile/MobileComponents'

export default function ReportsPage() {
  const reports = [
    {
      id: 1,
      name: 'Attendance Report',
      description: 'Monthly attendance summary for all employees',
      category: 'Attendance',
      icon: FaChartBar,
    },
    {
      id: 2,
      name: 'Leave Report',
      description: 'Leave balance and usage report',
      category: 'Leave',
      icon: FaFileAlt,
    },
    {
      id: 3,
      name: 'Payroll Report',
      description: 'Monthly payroll summary and breakdown',
      category: 'Payroll',
      icon: FaFileAlt,
    },
    {
      id: 4,
      name: 'Performance Report',
      description: 'Employee performance reviews and ratings',
      category: 'Performance',
      icon: FaChartBar,
    },
    {
      id: 5,
      name: 'Recruitment Report',
      description: 'Hiring statistics and candidate pipeline',
      category: 'Recruitment',
      icon: FaFileAlt,
    },
    {
      id: 6,
      name: 'Employee Directory',
      description: 'Complete list of all employees with details',
      category: 'Employee',
      icon: FaFileAlt,
    },
  ]

  return (
    <MobilePageWrapper
      title="Reports"
      subtitle="Generate and download various reports"
    >
      {/* Reports Grid */}
      <MobileGrid cols={3} className="mb-8">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Icon className="text-2xl text-primary-500" />
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  {report.category}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {report.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <button className="w-full btn-mobile bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2">
                <FaDownload className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>
          )
        })}
      </MobileGrid>

      {/* Custom Report Section */}
      <div className="card-mobile">
        <h2 className="text-responsive-xl font-bold text-gray-800 mb-4">Custom Report</h2>
        <p className="text-responsive-sm text-gray-600 mb-6">
          Create a custom report with specific parameters
        </p>
        <MobileGrid cols={3} className="mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select className="input-mobile w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Select Type</option>
              <option>Attendance</option>
              <option>Leave</option>
              <option>Payroll</option>
              <option>Performance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              className="input-mobile w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              className="input-mobile w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </MobileGrid>
        <div className="flex justify-end">
          <button className="btn-mobile bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
            <FaDownload className="w-4 h-4" />
            <span>Generate Custom Report</span>
          </button>
        </div>
      </div>
    </MobilePageWrapper>
  )
}

