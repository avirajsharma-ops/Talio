'use client'

import { useState, useEffect } from 'react'
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaEdit } from 'react-icons/fa'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setEmployee(parsedUser.employeeId)
    }
  }, [])

  if (!user || !employee) {
    return (
      <div className="page-container">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-600 mt-1">View and manage your profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-primary-500 flex items-center justify-center text-white text-4xl font-bold mb-4">
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-gray-600">{employee.designation?.title || 'N/A'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {employee.department?.name || 'N/A'}
              </p>
              <span className={`mt-4 px-4 py-2 rounded-full text-sm font-semibold ${
                employee.status === 'active' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {employee.status}
              </span>
              <button className="mt-6 btn-primary w-full flex items-center justify-center space-x-2">
                <FaEdit />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <FaUser className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Employee Code</p>
                  <p className="font-semibold text-gray-800">{employee.employeeCode}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaEnvelope className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-gray-800">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaPhone className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-800">{employee.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaCalendarAlt className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-semibold text-gray-800">
                    {employee.dateOfBirth
                      ? new Date(employee.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaUser className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-semibold text-gray-800 capitalize">
                    {employee.gender || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaMapMarkerAlt className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold text-gray-800">
                    {employee.address?.city || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date of Joining</p>
                <p className="font-semibold text-gray-800">
                  {employee.dateOfJoining
                    ? new Date(employee.dateOfJoining).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Employment Type</p>
                <p className="font-semibold text-gray-800 capitalize">
                  {employee.employmentType || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-semibold text-gray-800">
                  {employee.department?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Designation</p>
                <p className="font-semibold text-gray-800">
                  {employee.designation?.title || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reporting Manager</p>
                <p className="font-semibold text-gray-800">
                  {employee.reportingManager
                    ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Work Location</p>
                <p className="font-semibold text-gray-800">
                  {employee.workLocation || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Contact Name</p>
                <p className="font-semibold text-gray-800">
                  {employee.emergencyContact?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Relationship</p>
                <p className="font-semibold text-gray-800">
                  {employee.emergencyContact?.relationship || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-semibold text-gray-800">
                  {employee.emergencyContact?.phone || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

