'use client'

import { useState, useEffect } from 'react'
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaEdit, FaSave, FaTimes, FaCheck } from 'react-icons/fa'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedEmployee, setEditedEmployee] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setUser(result.data.user)
        setEmployee(result.data.employee)
        setEditedEmployee(result.data.employee)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Fallback to localStorage
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setEmployee(parsedUser.employeeId)
        setEditedEmployee(parsedUser.employeeId)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = () => {
    setEditedEmployee({ ...employee })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditedEmployee({ ...employee })
    setIsEditing(false)
  }

  const handleFieldChange = (field, value) => {
    setEditedEmployee(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedFieldChange = (parent, field, value) => {
    setEditedEmployee(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }))
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')

      // Prepare update data
      const updateData = {
        phone: editedEmployee.phone,
        address: editedEmployee.address,
        emergencyContact: editedEmployee.emergencyContact,
        bloodGroup: editedEmployee.bloodGroup,
        dateOfBirth: editedEmployee.dateOfBirth,
        gender: editedEmployee.gender
      }

      const response = await fetch(`/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()
      if (result.success) {
        setEmployee(editedEmployee)
        setIsEditing(false)
        // Show success message briefly
        const successMsg = document.createElement('div')
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        successMsg.textContent = '✓ Profile updated successfully!'
        document.body.appendChild(successMsg)
        setTimeout(() => successMsg.remove(), 3000)
      } else {
        alert(result.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || !employee) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="page-container pb-14 md:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage your profile information</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-semibold shadow-md"
            >
              <FaEdit />
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
              >
                <FaTimes />
                <span className="hidden sm:inline">Cancel</span>
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
              >
                <FaSave />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Profile Card - Navy Blue Background */}
        <div className="lg:col-span-1">
          <div style={{ backgroundColor: '#1A295A' }} className="rounded-2xl shadow-md p-6 text-white">
            <div className="flex flex-col items-center">
              {/* Profile Picture */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-4">
                {employee.profilePicture ? (
                  <img
                    src={employee.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                  </span>
                )}
              </div>

              {/* Employee ID */}
              <p className="text-xs text-gray-300 mb-2">
                ID: {employee.employeeCode}
              </p>

              {/* Name */}
              <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
                {employee.firstName} {employee.lastName}
              </h2>

              {/* Designation */}
              <p className="text-sm text-gray-300 mt-1">
                {employee.designation?.levelName && employee.designation?.title
                  ? `(${employee.designation.levelName}) - ${employee.designation.title}`
                  : employee.designation?.title || 'N/A'}
              </p>

              {/* Department */}
              <p className="text-xs text-gray-400 mt-0.5">
                {employee.department?.name || 'N/A'}
              </p>

              {/* Status Badge */}
              <span className={`mt-4 px-4 py-2 rounded-full text-sm font-semibold ${
                employee.status === 'active' ? 'bg-green-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {employee.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email - Not Editable */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FaEnvelope className="text-blue-600 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email (Cannot be edited)</p>
                  <p className="font-semibold text-gray-800 text-sm truncate">{employee.email}</p>
                </div>
              </div>

              {/* Phone - Editable */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FaPhone className="text-green-600 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedEmployee.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm">{employee.phone || 'N/A'}</p>
                  )}
                </div>
              </div>

              {/* Date of Birth - Editable */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FaCalendarAlt className="text-purple-600 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedEmployee.dateOfBirth ? new Date(editedEmployee.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm">
                      {employee.dateOfBirth
                        ? new Date(employee.dateOfBirth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              {/* Gender - Editable */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <FaUser className="text-pink-600 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Gender</p>
                  {isEditing ? (
                    <select
                      value={editedEmployee.gender || ''}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm capitalize">
                      {employee.gender || 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              {/* Address - Editable */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 sm:col-span-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FaMapMarkerAlt className="text-red-600 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  {isEditing ? (
                    <textarea
                      value={editedEmployee.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter address"
                      rows="2"
                    />
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm">
                      {employee.address || 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              {/* Blood Group - Editable */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <FaUser className="text-orange-600 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                  {isEditing ? (
                    <select
                      value={editedEmployee.bloodGroup || ''}
                      onChange={(e) => handleFieldChange('bloodGroup', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm">
                      {employee.bloodGroup || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Date of Joining</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {employee.dateOfJoining
                    ? new Date(employee.dateOfJoining).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Employment Type</p>
                <p className="font-semibold text-gray-800 text-sm capitalize">
                  {employee.employmentType || 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Department</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {employee.department?.name || 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Designation</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {employee.designation?.levelName && employee.designation?.title
                    ? `(${employee.designation.levelName}) - ${employee.designation.title}`
                    : employee.designation?.title || 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Reporting Manager</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {employee.reportingManager
                    ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
                    : 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Work Location</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {employee.workLocation || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Emergency Contact Name - Editable */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Contact Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedEmployee.emergencyContact?.name || ''}
                    onChange={(e) => handleNestedFieldChange('emergencyContact', 'name', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contact name"
                  />
                ) : (
                  <p className="font-semibold text-gray-800 text-sm">
                    {employee.emergencyContact?.name || 'N/A'}
                  </p>
                )}
              </div>

              {/* Emergency Contact Relationship - Editable */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Relationship</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedEmployee.emergencyContact?.relationship || ''}
                    onChange={(e) => handleNestedFieldChange('emergencyContact', 'relationship', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                ) : (
                  <p className="font-semibold text-gray-800 text-sm">
                    {employee.emergencyContact?.relationship || 'N/A'}
                  </p>
                )}
              </div>

              {/* Emergency Contact Phone - Editable */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedEmployee.emergencyContact?.phone || ''}
                    onChange={(e) => handleNestedFieldChange('emergencyContact', 'phone', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="font-semibold text-gray-800 text-sm">
                    {employee.emergencyContact?.phone || 'N/A'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

