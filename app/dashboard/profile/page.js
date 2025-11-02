'use client'

import { useState, useEffect, useRef } from 'react'
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaEdit, FaSave, FaTimes, FaCheck, FaCamera, FaSearchPlus, FaSearchMinus, FaUndo, FaRedo, FaSun, FaAdjust } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedEmployee, setEditedEmployee] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageScale, setImageScale] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [imageBrightness, setImageBrightness] = useState(100)
  const [imageContrast, setImageContrast] = useState(100)
  const [imageSaturation, setImageSaturation] = useState(100)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

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

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    // Read the file and open editor
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result)
      setShowImageEditor(true)
      // Reset editor state
      setImageScale(1)
      setImageRotation(0)
      setImageBrightness(100)
      setImageContrast(100)
      setImageSaturation(100)
      setImagePosition({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({
      x: touch.clientX - imagePosition.x,
      y: touch.clientY - imagePosition.y
    })
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const touch = e.touches[0]
    setImagePosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const resetImageEditor = () => {
    setImageScale(1)
    setImageRotation(0)
    setImageBrightness(100)
    setImageContrast(100)
    setImageSaturation(100)
    setImagePosition({ x: 0, y: 0 })
  }

  const closeImageEditor = () => {
    setShowImageEditor(false)
    setSelectedImage(null)
    resetImageEditor()
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getCroppedImage = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const size = 400 // Output size

    canvas.width = size
    canvas.height = size

    const img = imageRef.current
    if (!img) return null

    // Apply transformations
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate((imageRotation * Math.PI) / 180)
    ctx.scale(imageScale, imageScale)

    // Apply filters
    ctx.filter = `brightness(${imageBrightness}%) contrast(${imageContrast}%) saturate(${imageSaturation}%)`

    // Draw image centered with position offset
    const drawSize = size / imageScale
    ctx.drawImage(
      img,
      -drawSize / 2 + imagePosition.x / imageScale,
      -drawSize / 2 + imagePosition.y / imageScale,
      drawSize,
      drawSize
    )

    ctx.restore()

    return canvas.toDataURL('image/jpeg', 0.9)
  }

  const handleSaveImage = async () => {
    try {
      setUploadingImage(true)

      const croppedImage = getCroppedImage()
      if (!croppedImage) {
        toast.error('Failed to process image')
        return
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture: croppedImage })
      })

      const result = await response.json()
      if (result.success) {
        setEmployee(prev => ({ ...prev, profilePicture: croppedImage }))
        setEditedEmployee(prev => ({ ...prev, profilePicture: croppedImage }))
        toast.success('Profile picture updated successfully!')

        // Update localStorage user data if it has employeeId
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsedUser = JSON.parse(userData)
          if (parsedUser.employeeId) {
            parsedUser.employeeId.profilePicture = croppedImage
            localStorage.setItem('user', JSON.stringify(parsedUser))
          }
        }

        closeImageEditor()
      } else {
        toast.error(result.message || 'Failed to update profile picture')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
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
              <div className="relative mb-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
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

                {/* Camera Icon Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Change profile picture"
                >
                  {uploadingImage ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaCamera className="text-white text-sm sm:text-base" />
                  )}
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
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

      {/* Image Editor Modal */}
      {showImageEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Edit Profile Picture</h2>
              <button
                onClick={closeImageEditor}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Preview Area */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-100 rounded-xl overflow-hidden relative" style={{ height: '400px' }}>
                    {/* Circular Crop Preview */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="relative overflow-hidden rounded-full bg-white shadow-2xl"
                        style={{ width: '300px', height: '300px' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <img
                          ref={imageRef}
                          src={selectedImage}
                          alt="Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale}) rotate(${imageRotation}deg)`,
                            filter: `brightness(${imageBrightness}%) contrast(${imageContrast}%) saturate(${imageSaturation}%)`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            transformOrigin: 'center center'
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                      Drag to reposition • Use controls to adjust
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-4">
                  {/* Zoom Control */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaSearchPlus className="text-blue-600" />
                        Zoom
                      </label>
                      <span className="text-xs text-gray-500">{Math.round(imageScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setImageScale(Math.max(0.5, imageScale - 0.1))}
                        className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                      >
                        <FaSearchMinus className="inline" />
                      </button>
                      <button
                        onClick={() => setImageScale(Math.min(3, imageScale + 0.1))}
                        className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                      >
                        <FaSearchPlus className="inline" />
                      </button>
                    </div>
                  </div>

                  {/* Rotation Control */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaUndo className="text-blue-600" />
                        Rotation
                      </label>
                      <span className="text-xs text-gray-500">{imageRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={imageRotation}
                      onChange={(e) => setImageRotation(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setImageRotation((imageRotation - 90 + 360) % 360)}
                        className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                      >
                        <FaUndo className="inline" /> 90°
                      </button>
                      <button
                        onClick={() => setImageRotation((imageRotation + 90) % 360)}
                        className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                      >
                        <FaRedo className="inline" /> 90°
                      </button>
                    </div>
                  </div>

                  {/* Brightness Control */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaSun className="text-yellow-600" />
                        Brightness
                      </label>
                      <span className="text-xs text-gray-500">{imageBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={imageBrightness}
                      onChange={(e) => setImageBrightness(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                    />
                  </div>

                  {/* Contrast Control */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaAdjust className="text-purple-600" />
                        Contrast
                      </label>
                      <span className="text-xs text-gray-500">{imageContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={imageContrast}
                      onChange={(e) => setImageContrast(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                  {/* Saturation Control */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaAdjust className="text-pink-600" />
                        Saturation
                      </label>
                      <span className="text-xs text-gray-500">{imageSaturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={imageSaturation}
                      onChange={(e) => setImageSaturation(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                    />
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={resetImageEditor}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeImageEditor}
                disabled={uploadingImage}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImage}
                disabled={uploadingImage}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    Save Picture
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

