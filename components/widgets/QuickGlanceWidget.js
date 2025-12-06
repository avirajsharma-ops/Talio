'use client'

import { FaClock, FaSignInAlt, FaSignOutAlt, FaCheckCircle } from 'react-icons/fa'

export default function QuickGlanceWidget({
  todayAttendance,
  remainingTime,
  isCountingDown,
  formatCountdown,
}) {
  return (
    <div style={{ backgroundColor: 'var(--color-bg-card)' }} className="rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-800">Quick Glance</h3>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isCountingDown
              ? remainingTime > 3600 ? 'bg-green-100'
                : remainingTime > 1800 ? 'bg-yellow-100'
                  : 'bg-red-100'
              : 'bg-gray-100'
            }`}>
            <FaClock className={`w-3.5 h-3.5 ${isCountingDown
                ? remainingTime > 3600 ? 'text-green-600'
                  : remainingTime > 1800 ? 'text-yellow-600'
                    : 'text-red-600'
                : 'text-gray-600'
              }`} />
            <span className={`text-sm sm:text-base font-bold ${isCountingDown
                ? remainingTime > 3600 ? 'text-green-700'
                  : remainingTime > 1800 ? 'text-yellow-700'
                    : 'text-red-700'
                : 'text-gray-700'
              }`}>
              {formatCountdown(remainingTime)}
            </span>
          </div>
        </div>
      </div>

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
              {todayAttendance?.workHours ? `${todayAttendance.workHours}h` : '--:--'}
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
          <div className={`rounded-lg p-3 ${todayAttendance?.status === 'present' ? 'bg-green-100' :
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
  )
}
