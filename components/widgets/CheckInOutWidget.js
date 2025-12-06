'use client'

import { FaUser, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa'
import { formatDesignation } from '@/lib/formatters'

export default function CheckInOutWidget({
  user,
  employeeData,
  todayAttendance,
  attendanceLoading,
  onClockIn,
  onClockOut,
}) {
  return (
    <div
      style={{ background: 'var(--color-accent-gradient)' }}
      className="rounded-2xl shadow-md p-4 sm:p-6 text-white"
    >
      {/* User Profile Section */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0">
          {employeeData?.profilePicture ? (
            <img src={employeeData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <FaUser className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          )}
        </div>
        <div>
          <p className="text-xs text-gray-300 mb-0.5">
            ID: {employeeData?.employeeCode || user?.employeeCode || user?.employeeNumber || '---'}
          </p>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wide">
            {employeeData ? `${employeeData.firstName} ${employeeData.lastName}` :
              (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User')}
          </h2>
          {(employeeData?.designation || user?.designation) && (
            <p className="text-xs text-gray-300 mt-0.5">
              {formatDesignation(employeeData?.designation || user?.designation)}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onClockIn}
          disabled={attendanceLoading || (todayAttendance && todayAttendance.checkIn)}
          className="btn-theme-primary disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center flex-1 gap-2"
        >
          <FaSignInAlt className="w-4 h-4" />
          <span>Check In</span>
        </button>
        <button
          onClick={onClockOut}
          disabled={attendanceLoading || !todayAttendance || !todayAttendance.checkIn || todayAttendance.checkOut}
          className="btn-theme-secondary disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center flex-1 gap-2"
        >
          <FaSignOutAlt className="w-4 h-4" />
          <span>Check Out</span>
        </button>
      </div>
    </div>
  )
}
