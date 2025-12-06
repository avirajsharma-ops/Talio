'use client'

import { FaClock, FaSignInAlt, FaSignOutAlt, FaCheckCircle } from 'react-icons/fa'
import { useMemo } from 'react'

// Helper to calculate displayed status based on time and settings
function getDisplayedStatus(todayAttendance, companySettings) {
  // If user has an attendance record with check-in, show actual status
  if (todayAttendance?.checkIn) {
    if (todayAttendance.workFromHome) return { status: 'wfh', label: 'WFH', bgColor: 'bg-purple-100' }
    if (todayAttendance.status === 'present') return { status: 'present', label: 'Present', bgColor: 'bg-green-100' }
    if (todayAttendance.status === 'half-day') return { status: 'half-day', label: 'Half Day', bgColor: 'bg-yellow-100' }
    if (todayAttendance.status === 'in-progress') return { status: 'in-progress', label: 'In Progress', bgColor: 'bg-blue-100' }
    if (todayAttendance.status === 'on-leave') return { status: 'on-leave', label: 'On Leave', bgColor: 'bg-orange-100' }
    if (todayAttendance.status === 'absent') return { status: 'absent', label: 'Absent', bgColor: 'bg-red-100' }
    return { status: 'in-progress', label: 'In Progress', bgColor: 'bg-blue-100' }
  }

  // If on approved leave
  if (todayAttendance?.status === 'on-leave') {
    return { status: 'on-leave', label: 'On Leave', bgColor: 'bg-orange-100' }
  }

  // If attendance record exists with absent status (e.g., auto-marked)
  if (todayAttendance?.status === 'absent') {
    return { status: 'absent', label: 'Absent', bgColor: 'bg-red-100' }
  }

  // No check-in yet - calculate based on time and thresholds
  const now = new Date()
  const checkInTime = companySettings?.checkInTime || '09:00'
  const absentThresholdMinutes = companySettings?.absentThresholdMinutes || 60

  // Parse check-in time
  const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number)
  
  // Create office start time for today
  const officeStart = new Date(now)
  officeStart.setHours(checkInHour, checkInMinute, 0, 0)

  // Calculate absent threshold time (checkIn + absentThresholdMinutes)
  const absentThresholdTime = new Date(officeStart)
  absentThresholdTime.setMinutes(absentThresholdTime.getMinutes() + absentThresholdMinutes)

  // If it's before office hours, show "Not Started"
  if (now < officeStart) {
    return { status: 'not-started', label: 'Not Started', bgColor: 'bg-gray-100' }
  }

  // If current time is past the absent threshold, show "Absent"
  if (now >= absentThresholdTime) {
    return { status: 'absent', label: 'Absent', bgColor: 'bg-red-100' }
  }

  // Between office start and absent threshold - show "Not Checked In"
  return { status: 'not-checked-in', label: 'Not Checked In', bgColor: 'bg-amber-100' }
}

export default function QuickGlanceWidget({
  todayAttendance,
  remainingTime,
  isCountingDown,
  formatCountdown,
  companySettings,
}) {
  // Calculate displayed status
  const displayedStatus = useMemo(() => 
    getDisplayedStatus(todayAttendance, companySettings),
    [todayAttendance, companySettings]
  )

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
          <div className={`rounded-lg p-3 ${displayedStatus.bgColor}`}>
            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 capitalize">
              {displayedStatus.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
