'use client'

import { useRouter } from 'next/navigation'

export default function KPIStatsWidget({ statsData }) {
  const router = useRouter()

  return (
    <div className="p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Key Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer bg-gray-50 hover:bg-gray-100"
              onClick={() => stat.href && router.push(stat.href)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium truncate">{stat.title}</p>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                </div>
                <div className={`${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
