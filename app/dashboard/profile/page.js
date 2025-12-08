'use client'

import { useState, useEffect, useRef } from 'react'
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaCheck,
  FaCamera,
  FaSearchPlus,
  FaSearchMinus,
  FaUndo,
  FaRedo,
  FaSun,
  FaAdjust,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'
import { formatDesignation, formatDepartments, getLevelNameFromNumber } from '@/lib/formatters'
import TiltWrapper from "@/components/TiltWrapper";


export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedEmployee, setEditedEmployee] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  // Use imported getLevelNameFromNumber for level name lookup
  const getLevelName = getLevelNameFromNumber

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
          Authorization: `Bearer ${token}`,
        },
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
        console.log('Loading from localStorage:', parsedUser)
        setUser(parsedUser)

        // Extract employee data - handle both structures
        let employeeData = null
        if (parsedUser.employeeId && typeof parsedUser.employeeId === 'object') {
          // Employee data is in employeeId object
          employeeData = {
            ...parsedUser.employeeId,
            // Fallback to top-level fields if not in employeeId
            dateOfBirth: parsedUser.employeeId.dateOfBirth || parsedUser.dateOfBirth,
            gender: parsedUser.employeeId.gender || parsedUser.gender,
            address: parsedUser.employeeId.address || parsedUser.address,
            emergencyContact: parsedUser.employeeId.emergencyContact || parsedUser.emergencyContact,
            designation: parsedUser.employeeId.designation || parsedUser.designation,
            department: parsedUser.employeeId.department || parsedUser.department,
            departments: parsedUser.employeeId.departments || parsedUser.departments,
          }
        } else {
          // Build employee object from top-level fields
          employeeData = {
            _id: parsedUser.employeeId,
            employeeCode: parsedUser.employeeCode,
            firstName: parsedUser.firstName,
            lastName: parsedUser.lastName,
            email: parsedUser.email,
            phone: parsedUser.phone,
            dateOfBirth: parsedUser.dateOfBirth,
            gender: parsedUser.gender,
            address: parsedUser.address,
            designation: parsedUser.designation,
            designationLevel: parsedUser.designationLevel,
            designationLevelName: parsedUser.designationLevelName,
            department: parsedUser.department,
            departments: parsedUser.departments,
            profilePicture: parsedUser.profilePicture,
            status: parsedUser.status,
            dateOfJoining: parsedUser.dateOfJoining,
            emergencyContact: parsedUser.emergencyContact,
          }
        }

        console.log('Extracted employee data:', employeeData)
        setEmployee(employeeData)
        setEditedEmployee(employeeData)
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
    setEditedEmployee((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedFieldChange = (parent, field, value) => {
    setEditedEmployee((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
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
      y: e.clientY - imagePosition.y,
    })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
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
      y: touch.clientY - imagePosition.y,
    })
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const touch = e.touches[0]
    setImagePosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
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
    ctx.drawImage(img, offsetX - size / 2, offsetY - size / 2, drawWidth, drawHeight)

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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePicture: croppedImage }),
      })

      const result = await response.json()
      if (result.success) {
        setEmployee((prev) => ({ ...prev, profilePicture: croppedImage }))
        setEditedEmployee((prev) => ({ ...prev, profilePicture: croppedImage }))
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
        gender: editedEmployee.gender,
      }

      const response = await fetch(`/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()
      if (result.success) {
        // Update local state
        const updatedEmployee = { ...employee, ...updateData }
        setEmployee(updatedEmployee)
        setEditedEmployee(updatedEmployee)

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
        if (storedUser.employeeId && typeof storedUser.employeeId === 'object') {
          storedUser.employeeId = { ...storedUser.employeeId, ...updateData }
        }
        // Update top-level fields
        Object.assign(storedUser, updateData)
        localStorage.setItem('user', JSON.stringify(storedUser))

        setIsEditing(false)
        toast.success('Profile updated successfully!')
      } else {
        toast.error(result.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || !employee) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-slate-300 border-t-blue-600" />
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Loading your profile…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container pb-14 md:pb-6 px-2 sm:px-4 lg:px-8">
      <div className="max-w-[1400px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Profile
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              View and manage your personal and employment information.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                employee.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
              }`}
            >
              <span className="h-2 w-2 rounded-full mr-1.5 bg-current" />
              {employee.status === 'active'
                ? 'Active Employee'
                : employee.status?.toUpperCase() || 'ACTIVE'}
            </span>

            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <FaEdit className="text-xs" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  <FaTimes className="text-xs" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60"
                >
                  <FaSave className="text-xs" />
                  <span>{saving ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
             <TiltWrapper>
    <div
      style={{ backgroundColor: 'var(--color-accent-profile)' }}
      className="
        rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden
        shadow-xl shadow-slate-900/20
        transition-all duration-300 transform-gpu
      "
    >
      {/* Subtle overlay */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
      </div>

      <div className="relative">
        {/* Profile Picture + Info */}
        <div className="flex items-start gap-5 sm:gap-6 mb-8">
          {/* Profile picture */}
          <div className="relative flex-shrink-0">
            <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full 
                overflow-hidden bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 
                flex items-center justify-center shadow-xl shadow-black/30 ring-4 ring-white/30">
              {employee.profilePicture ? (
                <img
                  src={employee.profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl sm:text-5xl font-bold text-white">
                  {employee.firstName?.[0]}
                  {employee.lastName?.[0]}
                </span>
              )}
            </div>

            {/* Camera Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute -bottom-1.5 -right-1.5 w-10 h-10 sm:w-11 sm:h-11 rounded-full 
                flex items-center justify-center shadow-lg shadow-black/40 
                border-[3px] border-white disabled:opacity-60"
              style={{ backgroundColor: '#4FC3F7' }}
            >
              {uploadingImage ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FaCamera className="text-white text-sm" />
              )}
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>

          {/* Employee Info */}
          <div className="flex-1 pt-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70 mb-2">
              EMPLOYEE ID
            </p>
            <p className="text-sm font-semibold text-white/90 mb-4 break-all">
              {employee.employeeCode}
            </p>

            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight text-white mb-2 truncate">
              {employee.firstName} {employee.lastName}
            </h2>

            <p className="text-xs sm:text-sm text-white/80">
              {employee.designation ? (
                <>
                  {employee.designationLevelName ||
                  getLevelName(employee.designationLevel || employee.designation.level)
                    ? `(${employee.designationLevelName ||
                        getLevelName(employee.designationLevel || employee.designation.level)
                      }) • ${employee.designation.title}`
                    : employee.designation.title || 'N/A'}
                </>
              ) : (
                'N/A'
              )}
            </p>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 mr-1.5" />
            {employee.workLocation || 'Work location not set'}
          </span>

          {employee.department && (
            <span className="inline-flex items-center rounded-full bg-black/15 px-3 py-1 text-xs font-medium backdrop-blur text-white/90">
              {formatDepartments(employee)}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className={`h-12 rounded-2xl text-sm font-semibold shadow-md shadow-black/25 
              ${employee.status === 'active'
                ? 'bg-emerald-500/95 text-white'
                : 'bg-slate-700/90 text-slate-50'
              }`}
          >
            {employee.status === 'active' ? 'Active' : employee.status?.toUpperCase()}
          </button>

          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="h-12 rounded-2xl text-sm font-semibold bg-white/90 text-slate-900 shadow-md shadow-black/20 hover:bg-white"
            >
              <FaEdit className="inline-block mr-2 text-sm" /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex-1 h-12 rounded-2xl bg-white/15 text-white border border-white/30 text-xs font-semibold"
              >
                <FaTimes />
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-black/30"
              >
                <FaSave />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </TiltWrapper>
          </div>

          {/* Right Side: Details */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            {/* Personal Information */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-900/5 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    Personal Information
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Basic details that help us identify and contact you.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Email (read-only) */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/70 shadow-xs">
                  <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/40">
                    <FaEnvelope className="text-white text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-blue-700 tracking-wide uppercase mb-1.5">
                      Email Address
                    </p>
                    <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                      {employee.email}
                    </p>
                    <p className="text-[11px] text-blue-700/70 mt-1">
                      This field is managed by your organization.
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/70 shadow-xs">
                  <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/40">
                    <FaPhone className="text-white text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-emerald-700 tracking-wide uppercase mb-1.5">
                      Phone Number
                    </p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedEmployee.phone || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9+\-() ]/g, '')
                          handleFieldChange('phone', value)
                        }}
                        pattern="[0-9+\-() ]*"
                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-sm sm:text-base">
                        {employee.phone || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date of birth */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200/70 shadow-xs">
                  <div className="w-11 h-11 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/40">
                    <FaCalendarAlt className="text-white text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-purple-700 tracking-wide uppercase mb-1.5">
                      Date of Birth
                    </p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedEmployee.dateOfBirth
                            ? new Date(editedEmployee.dateOfBirth)
                                .toISOString()
                                .split('T')[0]
                            : ''
                        }
                        onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-sm sm:text-base">
                        {employee.dateOfBirth
                          ? new Date(employee.dateOfBirth).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200/70 shadow-xs">
                  <div className="w-11 h-11 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-pink-500/40">
                    <FaUser className="text-white text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-pink-700 tracking-wide uppercase mb-1.5">
                      Gender
                    </p>
                    {isEditing ? (
                      <select
                        value={editedEmployee.gender || ''}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        className="w-full px-3 py-2 border border-pink-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    ) : (
                      <p className="font-semibold text-slate-900 text-sm sm:text-base capitalize">
                        {employee.gender || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200/70 shadow-xs sm:col-span-2">
                  <div className="w-11 h-11 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/40">
                    <FaMapMarkerAlt className="text-white text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-rose-700 tracking-wide uppercase mb-1.5">
                      Address
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editedEmployee.address || ''}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none"
                        placeholder="Enter complete address"
                        rows="2"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-sm sm:text-base whitespace-pre-line">
                        {employee.address || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Blood Group */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/70 shadow-xs">
                  <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/40">
                    <FaUser className="text-white text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-amber-700 tracking-wide uppercase mb-1.5">
                      Blood Group
                    </p>
                    {isEditing ? (
                      <select
                        value={editedEmployee.bloodGroup || ''}
                        onChange={(e) => handleFieldChange('bloodGroup', e.target.value)}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
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
                      <p className="font-semibold text-slate-900 text-sm sm:text-base">
                        {employee.bloodGroup || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Employment Information */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-900/5 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    Employment Information
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Details about your current role and reporting structure.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-indigo-700 tracking-wide uppercase mb-1.5">
                    Date of Joining
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {employee.dateOfJoining
                      ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-teal-700 tracking-wide uppercase mb-1.5">
                    Employment Type
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base capitalize">
                    {employee.employmentType || 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-cyan-700 tracking-wide uppercase mb-1.5">
                    Department(s)
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {formatDepartments(employee)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-violet-700 tracking-wide uppercase mb-1.5">
                    Designation
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {formatDesignation(employee.designation, employee)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-amber-700 tracking-wide uppercase mb-1.5">
                    Reporting Manager
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {employee.reportingManager
                      ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
                      : 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-emerald-700 tracking-wide uppercase mb-1.5">
                    Work Location
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {employee.workLocation || 'N/A'}
                  </p>
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-900/5 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    Emergency Contact
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Person we should reach out to in case of any emergency.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Name */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-rose-700 tracking-wide uppercase mb-1.5">
                    Contact Name
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEmployee.emergencyContact?.name || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('emergencyContact', 'name', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="Enter contact name"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      {employee.emergencyContact?.name || 'N/A'}
                    </p>
                  )}
                </div>

                {/* Relationship */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 border border-fuchsia-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-fuchsia-700 tracking-wide uppercase mb-1.5">
                    Relationship
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEmployee.emergencyContact?.relationship || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('emergencyContact', 'relationship', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-fuchsia-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                      placeholder="e.g., Spouse, Parent, Sibling"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      {employee.emergencyContact?.relationship || 'N/A'}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-lime-50 to-lime-100 border border-lime-200/70 shadow-xs">
                  <p className="text-[11px] font-medium text-lime-700 tracking-wide uppercase mb-1.5">
                    Phone Number
                  </p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedEmployee.emergencyContact?.phone || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9+\-() ]/g, '')
                        handleNestedFieldChange('emergencyContact', 'phone', value)
                      }}
                      pattern="[0-9+\-() ]*"
                      className="w-full px-3 py-2 border border-lime-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-all"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      {employee.emergencyContact?.phone || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      <ModalPortal show={showImageEditor}>
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full h-full sm:max-w-5xl sm:max-h-[95vh] sm:h-auto overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm flex-shrink-0">
              <div className="flex flex-col">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                  Edit Profile Picture
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crop, adjust and fine-tune how your profile photo looks.
                </p>
              </div>
              <button
                onClick={closeImageEditor}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                title="Close"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row lg:p-6 lg:gap-6 bg-slate-50/60">
              {/* Preview area */}
              <div className="lg:flex-[2] flex-shrink-0 sticky top-0 bg-slate-50 z-10 lg:static rounded-none lg:rounded-2xl">
                <div className="bg-slate-100 rounded-none lg:rounded-2xl overflow-hidden relative h-[300px] sm:h-[350px] lg:h-[450px] border border-slate-200/80">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="relative overflow-hidden rounded-full bg-slate-200 shadow-2xl shadow-slate-900/20 border-[6px] border-white"
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
                          transformOrigin: 'center center',
                        }}
                        draggable={false}
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1.5 rounded-full text-[11px] shadow-lg">
                    Drag to reposition • Use controls to adjust
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="lg:flex-1 overflow-y-auto p-4 sm:p-6 lg:p-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Zoom */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 col-span-2 sm:col-span-1 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <FaSearchPlus className="text-slate-500 text-xs" />
                        Zoom
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        {Math.round(imageScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setImageScale(Math.max(0.5, imageScale - 0.1))}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FaSearchMinus className="inline mr-1" />
                        Zoom out
                      </button>
                      <button
                        onClick={() => setImageScale(Math.min(3, imageScale + 0.1))}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FaSearchPlus className="inline mr-1" />
                        Zoom in
                      </button>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 col-span-2 sm:col-span-1 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <FaUndo className="text-slate-500 text-xs" />
                        Rotation
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        {imageRotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={imageRotation}
                      onChange={(e) => setImageRotation(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setImageRotation((imageRotation - 90 + 360) % 360)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FaUndo className="inline mr-1" /> 90°
                      </button>
                      <button
                        onClick={() => setImageRotation((imageRotation + 90) % 360)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FaRedo className="inline mr-1" /> 90°
                      </button>
                    </div>
                  </div>

                  {/* Brightness */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 col-span-2 sm:col-span-1 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <FaSun className="text-slate-500 text-xs" />
                        Brightness
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        {imageBrightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={imageBrightness}
                      onChange={(e) => setImageBrightness(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 col-span-2 sm:col-span-1 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <FaAdjust className="text-slate-500 text-xs" />
                        Contrast
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        {imageContrast}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={imageContrast}
                      onChange={(e) => setImageContrast(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 col-span-2 sm:col-span-1 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <FaAdjust className="text-slate-500 text-xs" />
                        Saturation
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        {imageSaturation}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={imageSaturation}
                      onChange={(e) => setImageSaturation(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  {/* Reset */}
                  <button
                    onClick={resetImageEditor}
                    className="col-span-2 sm:col-span-1 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center justify-center"
                  >
                    Reset all adjustments
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50/80 backdrop-blur-sm flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={closeImageEditor}
                disabled={uploadingImage}
                className="px-4 sm:px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-full hover:bg-slate-50 transition-colors text-xs sm:text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImage}
                disabled={uploadingImage}
                className="px-4 sm:px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-black transition-colors text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
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
