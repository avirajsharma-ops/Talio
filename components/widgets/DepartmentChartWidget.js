'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CustomPieTooltip } from '@/components/charts/CustomTooltip'

export default function DepartmentChartWidget({ departmentStats = [] }) {
  if (!departmentStats || departmentStats.length === 0) {
    return (
      <div className="rounded-lg p-4 sm:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Department Distribution</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No department data available
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-800">Department Distribution</h3>
      </div>
      <div className="h-72 sm:h-80 pr-4 sm:pr-6 pb-4 sm:pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={departmentStats}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {departmentStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
