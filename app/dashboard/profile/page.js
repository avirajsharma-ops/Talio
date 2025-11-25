'use client'

import { useState, useEffect, useRef } from 'react'
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaEdit, FaSave, FaTimes, FaCheck, FaCamera, FaSearchPlus, FaSearchMinus, FaUndo, FaRedo, FaSun, FaAdjust } from 'react-icons/fa'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedEmployee, setEditedEmployee] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  // Helper to get level name from level number
  const getLevelName = (level) => {
    const levelMap = {
      1: 'Entry Level',
      2: 'Junior',
      3: 'Mid Level',
      4: 'Senior',
      5: 'Lead',
      6: 'Manager',
      7: 'Director',
      8: 'Executive'
    }
    return levelMap[level] || ''
  }

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

    // Create a circular clipping path
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Apply filters
    ctx.filter = `brightness(${imageBrightness}%) contrast(${imageContrast}%) saturate(${imageSaturation}%)`

    // Calculate the image dimensions to match object-cover behavior
    const imgAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = 1 // Square container (300x300 in preview, 400x400 in output)

    let drawWidth, drawHeight, offsetX, offsetY

    if (imgAspect > containerAspect) {
      // Image is wider - fit to height
      drawHeight = size
      drawWidth = size * imgAspect
      offsetX = -(drawWidth - size) / 2
      offsetY = 0
    } else {
      // Image is taller - fit to width
      drawWidth = size
      drawHeight = size / imgAspect
      offsetX = 0
      offsetY = -(drawHeight - size) / 2
    }

    // Apply transformations
    ctx.translate(size / 2, size / 2)
    ctx.rotate((imageRotation * Math.PI) / 180)
    ctx.scale(imageScale, imageScale)
    ctx.translate(imagePosition.x, imagePosition.y)

    // Draw the image
    ctx.drawImage(
      img,
      offsetX - size / 2,
      offsetY - size / 2,
      drawWidth,
      drawHeight
    )

    ctx.restore()

    return canvas.toDataURL('image/jpeg', 0.95)
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
          {/* <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Profile</h1> */}
          {/* <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage your profile information</p> */}
        </div>
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Profile Card - Theme Accent Background */}
        <div className="lg:col-span-1">
          <div style={{ backgroundColor: 'var(--color-accent-profile)' }} className="rounded-2xl shadow-md p-6 sm:p-8 text-white">
            {/* Profile Picture + Info Row */}
            <div className="flex items-start gap-4 sm:gap-6 mb-8">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  {employee.profilePicture ? (
                    <img
                      src={employee.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-bold text-white">
                      {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </span>
                  )}
                </div>

                {/* Camera Icon Button - Cyan/Teal Background */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-1 right-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10 border-3 border-white"
                  style={{ backgroundColor: '#4FC3F7' }}
                  title="Change profile picture"
                >
                  {uploadingImage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaCamera className="text-white text-base sm:text-lg" />
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

              {/* Employee Info */}
              <div className="flex-1 pt-2">
                {/* Employee ID */}
                <p className="text-sm sm:text-base text-gray-300 mb-1">
                  ID:{employee.employeeCode}
                </p>

                {/* Name */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                  {employee.firstName} {employee.lastName}
                </h2>

                {/* Designation & Department */}
                <div className="text-sm sm:text-base text-gray-300">
                  <p>
                    {employee.designation ? (
                      <>
                        {employee.designation.levelName || getLevelName(employee.designation.level)
                          ? `(${employee.designation.levelName || getLevelName(employee.designation.level)}) - ${employee.designation.title}`
                          : employee.designation.title || 'N/A'}
                      </>
                    ) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex gap-3 sm:gap-4">
              {/* Status Badge - Green */}
              <div className="flex-1">
                <button className={`w-full h-12 sm:h-14 px-4 rounded-xl text-base sm:text-lg font-bold text-center transition-colors ${
                  employee.status === 'active'
                    ? 'bg-[#4CAF50] hover:bg-[#45a049] text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}>
                  {employee.status === 'active' ? 'Active' : employee.status?.toUpperCase() || 'ACTIVE'}
                </button>
              </div>

              {/* Edit Profile Button - Blue */}
              <div className="flex-1">
                {!isEditing ? (
                  <button
                    onClick={handleEditClick}
                    className="w-full h-12 sm:h-14 px-4 rounded-xl text-base sm:text-lg font-bold text-center transition-colors bg-[#2196F3] hover:bg-[#1976D2] text-white flex items-center justify-center gap-2"
                  >
                    <FaEdit className="text-base sm:text-lg" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-300 flex items-center justify-center gap-1 text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                      <FaTimes />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 bg-[#4CAF50] text-white px-3 py-2 rounded-xl hover:bg-[#45a049] flex items-center justify-center gap-1 text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                      <FaSave />
                      <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                )}
              </div>
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
                  {employee.designation ? (
                    <>
                      {employee.designation.levelName || getLevelName(employee.designation.level)
                        ? `(${employee.designation.levelName || getLevelName(employee.designation.level)}) - ${employee.designation.title}`
                        : employee.designation.title || 'N/A'}
                    </>
                  ) : 'N/A'}
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
      <ModalPortal show={showImageEditor}>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:max-w-5xl sm:max-h-[95vh] sm:h-auto overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800">Edit Profile Picture</h2>
              <button
                onClick={closeImageEditor}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                title="Close"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row lg:p-6 lg:gap-6">
              {/* Preview Area - Sticky on mobile */}
              <div className="lg:flex-[2] flex-shrink-0 sticky top-0 bg-white z-10 lg:static">
                <div className="bg-gray-100 rounded-none lg:rounded-xl overflow-hidden relative h-[300px] sm:h-[350px] lg:h-[450px]">
                  {/* Circular Crop Preview */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="relative overflow-hidden rounded-full bg-white shadow-2xl"
                      style={{ width: '260px', height: '260px' }}
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
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs">
                    Drag to reposition • Use controls to adjust
                  </div>
                </div>
              </div>

              {/* Controls - Scrollable on mobile, 2x2 grid */}
              <div className="lg:flex-1 overflow-y-auto p-4 sm:p-6 lg:p-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Zoom Control */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <FaSearchPlus className="text-gray-600 text-xs" />
                        Zoom
                      </label>
                      <span className="text-xs font-medium text-gray-600">{Math.round(imageScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setImageScale(Math.max(0.5, imageScale - 0.1))}
                        className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FaSearchMinus className="inline" />
                      </button>
                      <button
                        onClick={() => setImageScale(Math.min(3, imageScale + 0.1))}
                        className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FaSearchPlus className="inline" />
                      </button>
                    </div>
                  </div>

                  {/* Rotation Control */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <FaUndo className="text-gray-600 text-xs" />
                        Rotation
                      </label>
                      <span className="text-xs font-medium text-gray-600">{imageRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={imageRotation}
                      onChange={(e) => setImageRotation(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setImageRotation((imageRotation - 90 + 360) % 360)}
                        className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FaUndo className="inline" /> 90°
                      </button>
                      <button
                        onClick={() => setImageRotation((imageRotation + 90) % 360)}
                        className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FaRedo className="inline" /> 90°
                      </button>
                    </div>
                  </div>

                  {/* Brightness Control */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <FaSun className="text-gray-600 text-xs" />
                        Brightness
                      </label>
                      <span className="text-xs font-medium text-gray-600">{imageBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={imageBrightness}
                      onChange={(e) => setImageBrightness(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                  </div>

                  {/* Contrast Control */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <FaAdjust className="text-gray-600 text-xs" />
                        Contrast
                      </label>
                      <span className="text-xs font-medium text-gray-600">{imageContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={imageContrast}
                      onChange={(e) => setImageContrast(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                  </div>

                  {/* Saturation Control */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <FaAdjust className="text-gray-600 text-xs" />
                        Saturation
                      </label>
                      <span className="text-xs font-medium text-gray-600">{imageSaturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={imageSaturation}
                      onChange={(e) => setImageSaturation(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={resetImageEditor}
                    className="col-span-2 sm:col-span-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>

            {/* Footer - Sticky at bottom */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={closeImageEditor}
                disabled={uploadingImage}
                className="px-4 sm:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImage}
                disabled={uploadingImage}
                className="px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
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
      </ModalPortal>
    </div>
  )
}

