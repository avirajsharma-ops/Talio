'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaBuilding, FaBriefcase, FaCalendarAlt, FaUmbrellaBeach, FaCog, FaMapMarkerAlt, FaClock, FaImage, FaPalette, FaCheck, FaBell, FaMoneyBillWave } from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { useTheme } from '@/contexts/ThemeContext'

// Dynamically import map component (client-side only)
const GeofenceMap = dynamic(() => import('@/components/GeofenceMap'), { ssr: false })

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [userRole, setUserRole] = useState('')
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
    }
    checkDepartmentHead()
  }, [])

  // Check if user is a department head
  const checkDepartmentHead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/team/check-head', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success && data.isDepartmentHead) {
        setIsDepartmentHead(true)
      }
    } catch (error) {
      console.error('Error checking department head:', error)
    }
  }

  // Define tabs based on user role
  const getTabs = () => {
    const baseTabs = []

    // Admin and HR get company settings
    if (userRole === 'god_admin' || userRole === 'admin' || userRole === 'hr') {
      baseTabs.push(
        { id: 'company', name: 'Company Settings', icon: FaBuilding },
        { id: 'geofencing', name: 'Geofencing', icon: FaMapMarkerAlt },
        { id: 'payroll', name: 'Payroll Settings', icon: FaMoneyBillWave },
      )
    }

    // Admin, HR, and Department Heads get notifications (check both role and isDepartmentHead flag)
    if (userRole === 'god_admin' || userRole === 'admin' || userRole === 'hr' || userRole === 'department_head' || isDepartmentHead) {
      baseTabs.push(
        { id: 'notifications', name: 'Notifications', icon: FaBell }
      )
    }

    // All users get personalization
    baseTabs.push(
      { id: 'personalization', name: 'Personalization', icon: FaPalette }
    )

    return baseTabs
  }

  const tabs = getTabs()

  // Set default active tab based on role
  useEffect(() => {
    if (userRole === 'god_admin' || userRole === 'admin' || userRole === 'hr') {
      setActiveTab('company')
    } else if (userRole === 'department_head' || isDepartmentHead) {
      setActiveTab('notifications')
    } else {
      setActiveTab('personalization')
    }
  }, [userRole, isDepartmentHead])

  return (
    <div className="p-3 sm:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Configure your HRMS system</p>
      </div>

      {/* Horizontal Tabs (All Devices) */}
      <div className="mb-6">
        <div className="border-b border-gray-200" style={{ borderColor: 'var(--color-border)' }}>
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={{
                    borderBottomColor: activeTab === tab.id ? 'var(--color-primary-500)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--color-primary-600)' : 'var(--color-text-secondary)'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        {activeTab === 'company' && <CompanySettingsTab />}
        {activeTab === 'geofencing' && <GeofencingTab />}
        {activeTab === 'payroll' && <PayrollSettingsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'personalization' && <PersonalizationTab />}
      </div>
    </div>
  )
}

// Company Settings Tab (Admin/HR only)
function CompanySettingsTab() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        if (data.data.companyLogo) {
          setLogoPreview(data.data.companyLogo)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) return null

    const formData = new FormData()
    formData.append('file', logoFile)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await response.json()
      if (data.success) {
        return data.fileUrl
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
    }
    return null
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let logoUrl = settings?.companyLogo

      // Upload logo if changed
      if (logoFile) {
        const uploadedUrl = await uploadLogo()
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        }
      }

      const formData = new FormData(e.target)
      const updatedSettings = {
        companyName: formData.get('companyName'),
        companyEmail: formData.get('companyEmail'),
        companyPhone: formData.get('companyPhone'),
        companyWebsite: formData.get('companyWebsite'),
        companyLogo: logoUrl,
        companyAddress: {
          street: formData.get('street'),
          city: formData.get('city'),
          state: formData.get('state'),
          country: formData.get('country'),
          zipCode: formData.get('zipCode'),
        },
        checkInTime: formData.get('checkInTime'),
        checkOutTime: formData.get('checkOutTime'),
        workingDays: Array.from(formData.getAll('workingDays')),
        lateThreshold: parseInt(formData.get('lateThreshold')) || 15,
        absentThresholdMinutes: parseInt(formData.get('absentThresholdMinutes')) || 60,
        halfDayHours: parseFloat(formData.get('halfDayHours')) || 4,
        fullDayHours: parseFloat(formData.get('fullDayHours')) || 8,
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Settings saved successfully!')
        setSettings(data.data)
      } else {
        toast.error(data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Company Settings</h2>
      <p className="text-gray-600 mb-6">Configure your company information and working hours</p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Company Logo */}
        <div className="bg-gray-50 rounded-lg">
          <div className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaImage className="text-primary-500" />
            <span>Company Logo</span>
          </div>
          <div className="flex items-center gap-6">
            {logoPreview && (
              <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <img src={logoPreview} alt="Company Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB</p>
            </div>
          </div>
        </div>

        {/* Company Basic Info */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaBuilding className="text-primary-500" />
            <span>Company Information</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name *</label>
              <input
                type="text"
                name="companyName"
                defaultValue={settings?.companyName}
                required
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company Email</label>
              <input
                type="email"
                name="companyEmail"
                defaultValue={settings?.companyEmail}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="company@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company Phone</label>
              <input
                type="tel"
                name="companyPhone"
                defaultValue={settings?.companyPhone}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company Website</label>
              <input
                type="url"
                name="companyWebsite"
                defaultValue={settings?.companyWebsite}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="https://www.example.com"
              />
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary-500" />
            <span>Company Address</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                name="street"
                defaultValue={settings?.companyAddress?.street}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
              <input
                type="text"
                name="city"
                defaultValue={settings?.companyAddress?.city}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">State / Province</label>
              <input
                type="text"
                name="state"
                defaultValue={settings?.companyAddress?.state}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="NY"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
              <input
                type="text"
                name="country"
                defaultValue={settings?.companyAddress?.country}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="United States"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Zip / Postal Code</label>
              <input
                type="text"
                name="zipCode"
                defaultValue={settings?.companyAddress?.zipCode}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="10001"
              />
            </div>
          </div>
        </div>

        {/* Working Hours & Attendance Settings */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaClock className="text-primary-500" />
            <span>Working Hours & Attendance Settings</span>
          </h3>

          {/* Check-in/Check-out Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in Time *</label>
              <input
                type="time"
                name="checkInTime"
                defaultValue={settings?.checkInTime || '09:00'}
                required
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">Official start time for the workday</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Check-out Time *</label>
              <input
                type="time"
                name="checkOutTime"
                defaultValue={settings?.checkOutTime || '18:00'}
                required
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">Official end time for the workday</p>
            </div>
          </div>

          {/* Attendance Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Late Coming Threshold (minutes)</label>
              <input
                type="number"
                name="lateThreshold"
                defaultValue={settings?.lateThreshold || 15}
                min="0"
                max="120"
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="15"
              />
              <p className="text-xs text-gray-500 mt-1">Grace period before marking as late</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Absent Threshold (minutes)</label>
              <input
                type="number"
                name="absentThresholdMinutes"
                defaultValue={settings?.absentThresholdMinutes || 60}
                min="15"
                max="480"
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="60"
              />
              <p className="text-xs text-gray-500 mt-1">Minutes after check-in time to auto-mark absent</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Half Day Hours</label>
              <input
                type="number"
                name="halfDayHours"
                defaultValue={settings?.halfDayHours || 4}
                min="1"
                max="12"
                step="0.5"
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="4"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum hours for half day</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Day Hours</label>
              <input
                type="number"
                name="fullDayHours"
                defaultValue={settings?.fullDayHours || 8}
                min="1"
                max="24"
                step="0.5"
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="8"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum hours for full day</p>
            </div>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Working Days *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <label key={day} className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="workingDays"
                    value={day}
                    defaultChecked={settings?.workingDays?.includes(day) ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize group-hover:text-primary-600 transition-colors">{day}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Select the days employees are expected to work</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary px-8 py-3"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Geofence Locations Manager Component (must be defined before GeofencingTab)
function GeofenceLocationsManager() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    center: { latitude: 28.6139, longitude: 77.2090 },
    radius: 100,
    isActive: true,
    isPrimary: false,
    strictMode: false,
  })

  // Check if component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [])

  useEffect(() => {
    console.log('🟢 showModal state changed to:', showModal)
  }, [showModal])

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/geofence/locations?activeOnly=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setLocations(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (location = null) => {
    if (location) {
      // Editing existing location
      setEditingLocation(location)
      setFormData({
        name: location.name || '',
        description: location.description || '',
        address: location.address || '',
        center: location.center || { latitude: 28.6139, longitude: 77.2090 },
        radius: location.radius || 100,
        isActive: location.isActive !== undefined ? location.isActive : true,
        isPrimary: location.isPrimary || false,
        strictMode: location.strictMode || false,
      })
      setShowModal(true)
    } else {
      // Adding new location
      setEditingLocation(null)

      // Set default form data first
      const defaultFormData = {
        name: '',
        description: '',
        address: '',
        center: { latitude: 28.6139, longitude: 77.2090 },
        radius: 100,
        isActive: true,
        isPrimary: false,
        strictMode: false,
      }

      setFormData(defaultFormData)

      // Show modal immediately
      setShowModal(true)

      // Try to get current location in the background
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Update form data with current location
            setFormData(prev => ({
              ...prev,
              center: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }))
          },
          (error) => {
            // Keep default location if geolocation fails
            console.error('Error getting location:', error)
          }
        )
      }
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      toast.error('Please enter a location name')
      return
    }

    if (!formData.center || !formData.center.latitude || !formData.center.longitude) {
      toast.error('Please set valid coordinates')
      return
    }

    if (!formData.radius || formData.radius < 10) {
      toast.error('Radius must be at least 10 meters')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editingLocation
        ? `/api/geofence/locations/${editingLocation._id}`
        : '/api/geofence/locations'

      const response = await fetch(url, {
        method: editingLocation ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success(editingLocation ? 'Location updated successfully' : 'Location added successfully')
        fetchLocations()
        setShowModal(false)
        // Reset form data
        setFormData({
          name: '',
          description: '',
          address: '',
          center: { latitude: 28.6139, longitude: 77.2090 },
          radius: 100,
          isActive: true,
          isPrimary: false,
          strictMode: false,
        })
        setEditingLocation(null)
      } else {
        toast.error(data.message || 'Failed to save location')
      }
    } catch (error) {
      console.error('Error saving location:', error)
      toast.error('Failed to save location')
    }
  }

  const handleDelete = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/geofence/locations/${locationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Location deleted successfully')
        fetchLocations()
      } else {
        toast.error(data.message || 'Failed to delete location')
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      toast.error('Failed to delete location')
    }
  }

  const handleMapUpdate = async (newPos, newRadius) => {
    console.log('Map updated:', newPos, newRadius)

    // newPos is an object { lat, lng }
    // First update coordinates and radius
    setFormData(prev => ({
      ...prev,
      center: { latitude: newPos.lat, longitude: newPos.lng },
      radius: newRadius
    }))

    // Reverse geocoding to get address
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newPos.lat},${newPos.lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`
      )
      const data = await response.json()

      console.log('Geocoding response:', data)

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        const address = result.formatted_address

        // Extract location name from address components
        let locationName = ''
        const addressComponents = result.address_components

        // Try to get a meaningful location name
        const locality = addressComponents.find(c => c.types.includes('locality'))
        const sublocality = addressComponents.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))
        const neighborhood = addressComponents.find(c => c.types.includes('neighborhood'))
        const premise = addressComponents.find(c => c.types.includes('premise'))

        if (premise) {
          locationName = premise.long_name
        } else if (neighborhood) {
          locationName = neighborhood.long_name
        } else if (sublocality) {
          locationName = sublocality.long_name
        } else if (locality) {
          locationName = locality.long_name
        }

        console.log('Extracted location name:', locationName)
        console.log('Extracted address:', address)

        // Update form data with address and location name
        setFormData(prev => ({
          ...prev,
          center: { latitude: newPos.lat, longitude: newPos.lng },
          radius: newRadius,
          address: address,
          name: prev.name || locationName // Only update name if it's empty
        }))
      } else {
        console.error('Geocoding failed:', data.status, data.error_message)
      }
    } catch (error) {
      console.error('Error fetching address:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary-500" />
            <span>Office Locations</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">Manage multiple office locations. Employees can check in from any configured location.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
        >
          <FaMapMarkerAlt />
          Add Location
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading locations...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FaMapMarkerAlt className="mx-auto text-4xl text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">No locations configured yet</p>
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
          >
            Add Your First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <div
              key={location._id}
              className={`border-2 rounded-lg p-4 ${
                location.isPrimary ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{location.name}</h4>
                  {location.isPrimary && (
                    <span className="text-yellow-500" title="Primary Location">⭐</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(location)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  {!location.isPrimary && (
                    <button
                      onClick={() => handleDelete(location._id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {location.address && (
                <p className="text-sm text-gray-600 mb-2">{location.address}</p>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                <div>📍 {location.center?.latitude?.toFixed(6)}, {location.center?.longitude?.toFixed(6)}</div>
                <div>📏 Radius: {location.radius}m</div>
                <div className="flex gap-2 mt-2">
                  {location.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Inactive</span>
                  )}
                  {location.strictMode && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Strict</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Rendered using Portal */}
      {isMounted && showModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'none'
          }}
          onClick={() => {
            setShowModal(false)
            setEditingLocation(null)
          }}
        >
          <div
            className="rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{
                borderColor: '#e5e7eb',
                background: 'linear-gradient(to right, #f9fafb, #f3f4f6)'
              }}
            >
              <h3
                className="text-xl font-bold flex items-center gap-3"
                style={{ color: '#111827' }}
              >
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#3b82f6', opacity: 0.1 }}>
                  <FaMapMarkerAlt style={{ color: '#3b82f6' }} size={20} />
                </div>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingLocation(null)
                }}
                className="p-2 rounded-lg transition-all hover:rotate-90 hover:bg-red-100"
                style={{
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6'
                }}
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1" style={{ backgroundColor: '#ffffff' }}>
              {/* Name & Address Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: '#111827' }}
                  >
                    Location Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    style={{
                      backgroundColor: '#f9fafb',
                      border: '1.5px solid #d1d5db',
                      color: '#111827',
                      outline: 'none'
                    }}
                    placeholder="e.g., Main Office, Branch 1"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: '#111827' }}
                  >
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    style={{
                      backgroundColor: '#f9fafb',
                      border: '1.5px solid #d1d5db',
                      color: '#111827',
                      outline: 'none'
                    }}
                    placeholder="Full address (auto-filled from map)"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#111827' }}
                >
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-none"
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1.5px solid #d1d5db',
                    color: '#111827',
                    outline: 'none'
                  }}
                  rows="2"
                  placeholder="Optional description for this location"
                />
              </div>

              {/* Coordinates & Radius Row */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <h4 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>
                  Geofence Coordinates
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: '#6b7280' }}
                    >
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.center.latitude}
                      onChange={(e) => setFormData({
                        ...formData,
                        center: { ...formData.center, latitude: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #d1d5db',
                        color: '#111827',
                        outline: 'none'
                      }}
                      placeholder="28.6139"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: '#6b7280' }}
                    >
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.center.longitude}
                      onChange={(e) => setFormData({
                        ...formData,
                        center: { ...formData.center, longitude: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #d1d5db',
                        color: '#111827',
                        outline: 'none'
                      }}
                      placeholder="77.2090"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: '#6b7280' }}
                    >
                      Radius (meters)
                    </label>
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={formData.radius}
                      onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #d1d5db',
                        color: '#111827',
                        outline: 'none'
                      }}
                      placeholder="100"
                    />
                  </div>
                </div>
                <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                  💡 Drag the marker or resize the circle on the map to adjust the geofence area. Address will auto-fill!
                </p>
              </div>

              {/* Map */}
              <div
                className="rounded-xl overflow-hidden shadow-lg"
                style={{
                  height: '400px',
                  border: '2px solid #d1d5db'
                }}
              >
                <GeofenceMap
                  center={{
                    lat: parseFloat(formData.center.latitude) || 28.6139,
                    lng: parseFloat(formData.center.longitude) || 77.2090
                  }}
                  radius={parseInt(formData.radius) || 100}
                  onUpdate={handleMapUpdate}
                />
              </div>

              {/* Options - Compact */}
              <div className="flex flex-wrap gap-6 p-4 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#111827' }}
                  >
                    Active
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#111827' }}
                  >
                    Primary Location
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.strictMode}
                    onChange={(e) => setFormData({ ...formData, strictMode: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#111827' }}
                  >
                    Strict Mode
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{
                borderColor: '#e5e7eb',
                backgroundColor: '#f9fafb'
              }}
            >
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingLocation(null)
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105 hover:bg-gray-100"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#6b7280',
                  border: '1.5px solid #d1d5db'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-blue-600 shadow-lg"
                style={{
                  backgroundColor: '#3b82f6',
                }}
              >
                {editingLocation ? '✓ Update Location' : '+ Add Location'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Geofencing Tab (Admin/HR only)
function GeofencingTab() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [breakTimings, setBreakTimings] = useState([])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        setBreakTimings(data.data.breakTimings || [])
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const addBreakTiming = () => {
    setBreakTimings([
      ...breakTimings,
      {
        name: '',
        startTime: '13:00',
        endTime: '14:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        isActive: true
      }
    ])
  }

  const updateBreakTiming = (index, field, value) => {
    const updated = [...breakTimings]
    updated[index] = { ...updated[index], [field]: value }
    setBreakTimings(updated)
  }

  const toggleBreakDay = (index, day) => {
    const updated = [...breakTimings]
    const days = updated[index].days || []
    if (days.includes(day)) {
      updated[index].days = days.filter(d => d !== day)
    } else {
      updated[index].days = [...days, day]
    }
    setBreakTimings(updated)
  }

  const removeBreakTiming = (index) => {
    setBreakTimings(breakTimings.filter((_, i) => i !== index))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.target)
      const updatedSettings = {
        geofence: {
          enabled: formData.get('enabled') === 'on',
          strictMode: formData.get('strictMode') === 'on',
          notifyOnExit: formData.get('notifyOnExit') === 'on',
          requireApproval: formData.get('requireApproval') === 'on',
          useMultipleLocations: true, // Always use multiple locations
        },
        breakTimings: breakTimings
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Geofencing settings saved successfully!')
        setSettings(data.data)
      } else {
        toast.error(data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FaMapMarkerAlt className="text-primary-500" />
        <span>Geofencing Settings</span>
      </h2>
      <p className="text-gray-600 mb-6">Configure location tracking and office premises boundaries</p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Enable Geofencing */}
        <div className="bg-gradient-to-r from-blue-50 to-primary-50 border-2 border-primary-200 rounded-lg p-6">
          <label className="flex items-start space-x-4 cursor-pointer group">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings?.geofence?.enabled}
              className="w-6 h-6 mt-1 rounded text-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-base font-bold text-gray-900 group-hover:text-primary-700 transition-colors">Enable Geofencing</span>
              <p className="text-sm text-gray-700 mt-1">Track employee locations and enforce office premises boundaries during work hours</p>
            </div>
          </label>
        </div>

        {/* Office Locations */}
        <GeofenceLocationsManager />

        {/* Geofence Options */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaCog className="text-primary-500" />
            <span>Geofence Enforcement Options</span>
          </h3>
          <div className="space-y-4">
            <label className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group">
              <input
                type="checkbox"
                name="strictMode"
                defaultChecked={settings?.geofence?.strictMode}
                className="mt-1 w-5 h-5 rounded text-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">Strict Mode</span>
                <p className="text-sm text-gray-600 mt-1">Employees must be within the geofence boundary to check in or check out</p>
              </div>
            </label>

            <label className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group">
              <input
                type="checkbox"
                name="notifyOnExit"
                defaultChecked={settings?.geofence?.notifyOnExit}
                className="mt-1 w-5 h-5 rounded text-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">Notify on Exit</span>
                <p className="text-sm text-gray-600 mt-1">Send push notification to employee when they exit the geofence during work hours</p>
              </div>
            </label>

            <label className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group">
              <input
                type="checkbox"
                name="requireApproval"
                defaultChecked={settings?.geofence?.requireApproval}
                className="mt-1 w-5 h-5 rounded text-primary-500 focus:ring-primary-500 focus:ring-2 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">Require Manager Approval</span>
                <p className="text-sm text-gray-600 mt-1">Require department head approval when employee is detected outside geofence during work hours</p>
              </div>
            </label>
          </div>
        </div>

        {/* Break Timings */}
        <div className="bg-white rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FaClock className="text-primary-500" />
                <span>Break Timings</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">Configure break times when geofencing tracking is paused</p>
            </div>
            <button
              type="button"
              onClick={addBreakTiming}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <span>+</span> Add Break
            </button>
          </div>

          {breakTimings.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FaClock className="mx-auto text-gray-400 text-4xl mb-3" />
              <p className="text-gray-600">No break timings configured</p>
              <p className="text-sm text-gray-500 mt-1">Click "Add Break" to configure break times</p>
            </div>
          ) : (
            <div className="space-y-4">
              {breakTimings.map((breakTiming, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={breakTiming.name}
                      onChange={(e) => updateBreakTiming(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg mr-2 focus:ring-2 focus:ring-primary-500"
                      placeholder="Break name (e.g., Lunch Break)"
                    />
                    <label className="flex items-center gap-2 mr-2">
                      <input
                        type="checkbox"
                        checked={breakTiming.isActive}
                        onChange={(e) => updateBreakTiming(index, 'isActive', e.target.checked)}
                        className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBreakTiming(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={breakTiming.startTime}
                        onChange={(e) => updateBreakTiming(index, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={breakTiming.endTime}
                        onChange={(e) => updateBreakTiming(index, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Active Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleBreakDay(index, day)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            breakTiming.days?.includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-primary-600 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Save Geofencing Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DepartmentsTab() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Departments</h2>
        <button className="btn-primary text-sm sm:text-base w-full sm:w-auto">Add Department</button>
      </div>
      <div className="text-gray-600">
        <p className="text-sm sm:text-base mb-3 sm:mb-4">Manage organization departments here.</p>
        <div className="space-y-2 sm:space-y-3">
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Engineering</h3>
              <p className="text-xs sm:text-sm text-gray-500">50 employees</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Human Resources</h3>
              <p className="text-xs sm:text-sm text-gray-500">10 employees</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Sales</h3>
              <p className="text-xs sm:text-sm text-gray-500">25 employees</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DesignationsTab() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Designations</h2>
        <button className="btn-primary text-sm sm:text-base w-full sm:w-auto">Add Designation</button>
      </div>
      <div className="text-gray-600">
        <p className="text-sm sm:text-base mb-3 sm:mb-4">Manage job designations and titles here.</p>
        <div className="space-y-2 sm:space-y-3">
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Software Engineer</h3>
              <p className="text-xs sm:text-sm text-gray-500">Engineering Department</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">HR Manager</h3>
              <p className="text-xs sm:text-sm text-gray-500">Human Resources Department</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HolidaysTab() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Holidays</h2>
        <button className="btn-primary text-sm sm:text-base w-full sm:w-auto">Add Holiday</button>
      </div>
      <div className="text-gray-600">
        <p className="text-sm sm:text-base mb-3 sm:mb-4">Manage company holidays and observances.</p>
        <div className="space-y-2 sm:space-y-3">
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">New Year&apos;s Day</h3>
              <p className="text-xs sm:text-sm text-gray-500">January 1, 2025</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Independence Day</h3>
              <p className="text-xs sm:text-sm text-gray-500">July 4, 2025</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveTypesTab() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Leave Types</h2>
        <button className="btn-primary text-sm sm:text-base w-full sm:w-auto">Add Leave Type</button>
      </div>
      <div className="text-gray-600">
        <p className="text-sm sm:text-base mb-3 sm:mb-4">Configure different types of leaves available.</p>
        <div className="space-y-2 sm:space-y-3">
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Casual Leave</h3>
              <p className="text-xs sm:text-sm text-gray-500">12 days per year</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Sick Leave</h3>
              <p className="text-xs sm:text-sm text-gray-500">10 days per year</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Paid Time Off</h3>
              <p className="text-xs sm:text-sm text-gray-500">15 days per year</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700 text-sm">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GeneralTab() {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">General Settings</h2>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            defaultValue="My Company"
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Company Email
          </label>
          <input
            type="email"
            defaultValue="info@company.com"
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Time Zone
          </label>
          <select className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>UTC</option>
            <option>America/New_York</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
            <option>Asia/Kolkata</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>USD - US Dollar</option>
            <option>EUR - Euro</option>
            <option>GBP - British Pound</option>
            <option>INR - Indian Rupee</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn-primary text-sm sm:text-base w-full sm:w-auto">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function PersonalizationTab() {
  const { currentTheme, changeTheme, themes } = useTheme()

  const themeColors = {
    default: {
      primary: '#3B82F6',
      secondary: '#2563EB',
      border: '#3B82F6',
      bgLight: '#EFF6FF',
    },
    purple: {
      primary: '#A855F7',
      secondary: '#9333EA',
      border: '#A855F7',
      bgLight: '#FAF5FF',
    },
    green: {
      primary: '#22C55E',
      secondary: '#16A34A',
      border: '#22C55E',
      bgLight: '#F0FDF4',
    },
    orange: {
      primary: '#F97316',
      secondary: '#EA580C',
      border: '#F97316',
      bgLight: '#FFF7ED',
    },
    teal: {
      primary: '#14B8A6',
      secondary: '#0D9488',
      border: '#14B8A6',
      bgLight: '#F0FDFA',
    },
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FaPalette style={{ color: 'var(--color-primary-500)' }} />
        <span>Personalization</span>
      </h2>
      <p className="text-gray-600 mb-6">Customize the look and feel of your dashboard</p>

      <div className="rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Theme</h3>
        <p className="text-sm text-gray-600 mb-6">Select a color theme that suits your preference. The theme will be applied across the entire application.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(themes).map((themeKey) => {
            const theme = themes[themeKey]
            const colors = themeColors[themeKey]
            const isActive = currentTheme === themeKey

            return (
              <button
                key={themeKey}
                onClick={() => {
                  changeTheme(themeKey)
                  toast.success(`Theme changed to ${theme.name}!`, {
                    icon: '🎨',
                    duration: 2000,
                  })
                }}
                className="relative p-6 rounded-xl border-2 transition-all hover:shadow-lg"
                style={{
                  borderColor: isActive ? colors.border : '#E5E7EB',
                  backgroundColor: isActive ? colors.bgLight : '#FFFFFF',
                }}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                      }}
                    >
                      <FaCheck className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Theme Preview */}
                <div className="mb-4">
                  <div className="flex gap-2 mb-3">
                    <div
                      className="w-12 h-12 rounded-lg shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                      }}
                    ></div>
                    <div className="flex flex-col gap-1">
                      <div
                        className="w-16 h-3 rounded"
                        style={{
                          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                          opacity: 0.7
                        }}
                      ></div>
                      <div
                        className="w-12 h-3 rounded"
                        style={{
                          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                          opacity: 0.5
                        }}
                      ></div>
                      <div
                        className="w-14 h-3 rounded"
                        style={{
                          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                          opacity: 0.3
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Theme Name */}
                <div className="text-left">
                  <h4 className={`font-bold text-lg mb-1 ${isActive ? 'text-gray-900' : 'text-gray-800'}`}>
                    {theme.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isActive ? 'Currently Active' : 'Click to apply'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div
          className="mt-8 p-4 border rounded-lg"
          style={{
            backgroundColor: 'var(--color-primary-50)',
            borderColor: 'var(--color-primary-200)'
          }}
        >
          <div className="flex items-start gap-3">
            <FaPalette
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              style={{ color: 'var(--color-primary-500)' }}
            />
            <div>
              <h4
                className="font-semibold mb-1"
                style={{ color: 'var(--color-primary-900)' }}
              >
                Theme Preview
              </h4>
              <p
                className="text-sm"
                style={{ color: 'var(--color-primary-700)' }}
              >
                Your selected theme will be applied immediately across all pages. The theme preference is saved in your browser and will persist across sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Payroll Settings Tab (Admin/HR only)
function PayrollSettingsTab() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching payroll settings:', error)
      toast.error('Failed to load payroll settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.target)
      
      const payrollSettings = {
        payroll: {
          workingDaysPerMonth: parseInt(formData.get('workingDaysPerMonth')) || 26,
          
          lateDeduction: {
            enabled: formData.get('lateDeductionEnabled') === 'on',
            type: formData.get('lateDeductionType') || 'fixed',
            value: parseFloat(formData.get('lateDeductionValue')) || 100,
            graceLatesPerMonth: parseInt(formData.get('graceLatesPerMonth')) || 3,
          },
          
          halfDayDeduction: {
            enabled: formData.get('halfDayDeductionEnabled') === 'on',
            type: formData.get('halfDayDeductionType') || 'half-day-salary',
            value: parseFloat(formData.get('halfDayDeductionValue')) || 50,
          },
          
          absentDeduction: {
            enabled: formData.get('absentDeductionEnabled') === 'on',
            type: formData.get('absentDeductionType') || 'full-day-salary',
            value: parseFloat(formData.get('absentDeductionValue')) || 100,
          },
          
          overtime: {
            enabled: formData.get('overtimeEnabled') === 'on',
            rateMultiplier: parseFloat(formData.get('overtimeRateMultiplier')) || 1.5,
            minHoursForOvertime: parseFloat(formData.get('minHoursForOvertime')) || 1,
          },
          
          pfEnabled: formData.get('pfEnabled') === 'on',
          pfPercentage: parseFloat(formData.get('pfPercentage')) || 12,
          esiEnabled: formData.get('esiEnabled') === 'on',
          esiPercentage: parseFloat(formData.get('esiPercentage')) || 0.75,
          professionalTax: {
            enabled: formData.get('professionalTaxEnabled') === 'on',
            amount: parseFloat(formData.get('professionalTaxAmount')) || 200,
          },
          tdsEnabled: formData.get('tdsEnabled') === 'on',
          tdsPercentage: parseFloat(formData.get('tdsPercentage')) || 10,
        }
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payrollSettings)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Payroll settings saved successfully!')
        setSettings(data.data)
      } else {
        toast.error(data.message || 'Failed to save payroll settings')
      }
    } catch (error) {
      console.error('Error saving payroll settings:', error)
      toast.error('Failed to save payroll settings')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading payroll settings...</p>
      </div>
    )
  }

  const payroll = settings?.payroll || {}

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FaMoneyBillWave className="text-green-600" />
        Payroll Settings
      </h2>
      <p className="text-gray-600 mb-6">Configure salary deductions, overtime rules, and statutory compliance</p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaCog className="text-blue-500" />
            General Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Working Days Per Month
              </label>
              <input
                type="number"
                name="workingDaysPerMonth"
                defaultValue={payroll.workingDaysPerMonth || 26}
                min="20"
                max="31"
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Used to calculate daily salary rate</p>
            </div>
          </div>
        </div>

        {/* Attendance-Based Deductions */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaClock className="text-orange-500" />
            Attendance-Based Deductions
          </h3>

          {/* Late Deduction */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">Late Arrival Deduction</h4>
                <p className="text-sm text-gray-600">Deduct from salary when employee arrives late</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="lateDeductionEnabled"
                  defaultChecked={payroll.lateDeduction?.enabled !== false}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Type</label>
                <select
                  name="lateDeductionType"
                  defaultValue={payroll.lateDeduction?.type || 'fixed'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="percentage">Percentage of Salary (%)</option>
                  <option value="per-day-salary">% of Daily Salary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number"
                  name="lateDeductionValue"
                  defaultValue={payroll.lateDeduction?.value || 100}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grace Lates/Month</label>
                <input
                  type="number"
                  name="graceLatesPerMonth"
                  defaultValue={payroll.lateDeduction?.graceLatesPerMonth || 3}
                  min="0"
                  max="31"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">No deduction for first N lates</p>
              </div>
            </div>
          </div>

          {/* Half-Day Deduction */}
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">Half-Day Deduction</h4>
                <p className="text-sm text-gray-600">Deduct when employee works less than full day hours</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="halfDayDeductionEnabled"
                  defaultChecked={payroll.halfDayDeduction?.enabled !== false}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Type</label>
                <select
                  name="halfDayDeductionType"
                  defaultValue={payroll.halfDayDeduction?.type || 'half-day-salary'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="percentage">Percentage of Monthly Salary (%)</option>
                  <option value="half-day-salary">% of Daily Salary (50% = half day)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number"
                  name="halfDayDeductionValue"
                  defaultValue={payroll.halfDayDeduction?.value || 50}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Absent Deduction */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">Absent Day Deduction</h4>
                <p className="text-sm text-gray-600">Deduct when employee is absent without approved leave</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="absentDeductionEnabled"
                  defaultChecked={payroll.absentDeduction?.enabled !== false}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Type</label>
                <select
                  name="absentDeductionType"
                  defaultValue={payroll.absentDeduction?.type || 'full-day-salary'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="percentage">Percentage of Monthly Salary (%)</option>
                  <option value="full-day-salary">% of Daily Salary (100% = full day)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number"
                  name="absentDeductionValue"
                  defaultValue={payroll.absentDeduction?.value || 100}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Overtime Settings */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaClock className="text-green-500" />
            Overtime Settings
          </h3>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">Enable Overtime Pay</h4>
                <p className="text-sm text-gray-600">Pay extra for hours worked beyond regular shift</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="overtimeEnabled"
                  defaultChecked={payroll.overtime?.enabled !== false}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Multiplier</label>
                <input
                  type="number"
                  name="overtimeRateMultiplier"
                  defaultValue={payroll.overtime?.rateMultiplier || 1.5}
                  min="1"
                  max="3"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">1.5 = 150% of hourly rate</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Hours</label>
                <input
                  type="number"
                  name="minHoursForOvertime"
                  defaultValue={payroll.overtime?.minHoursForOvertime || 1}
                  min="0.5"
                  max="4"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Min extra hours to qualify for OT</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory Deductions */}
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaMoneyBillWave className="text-purple-500" />
            Statutory Deductions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PF */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Provident Fund (PF)</h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="pfEnabled"
                    defaultChecked={payroll.pfEnabled !== false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PF Percentage (%)</label>
                <input
                  type="number"
                  name="pfPercentage"
                  defaultValue={payroll.pfPercentage || 12}
                  min="0"
                  max="20"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* ESI */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">ESI (Employee State Insurance)</h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="esiEnabled"
                    defaultChecked={payroll.esiEnabled !== false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ESI Percentage (%)</label>
                <input
                  type="number"
                  name="esiPercentage"
                  defaultValue={payroll.esiPercentage || 0.75}
                  min="0"
                  max="5"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Professional Tax */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Professional Tax</h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="professionalTaxEnabled"
                    defaultChecked={payroll.professionalTax?.enabled !== false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount (₹)</label>
                <input
                  type="number"
                  name="professionalTaxAmount"
                  defaultValue={payroll.professionalTax?.amount || 200}
                  min="0"
                  max="2500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* TDS */}
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">TDS (Tax Deducted at Source)</h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="tdsEnabled"
                    defaultChecked={payroll.tdsEnabled !== false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TDS Percentage (%)</label>
                <input
                  type="number"
                  name="tdsPercentage"
                  defaultValue={payroll.tdsPercentage || 10}
                  min="0"
                  max="30"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Preview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Settings Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <p className="text-gray-500">Working Days</p>
              <p className="font-semibold text-gray-900">{payroll.workingDaysPerMonth || 26} days/month</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-gray-500">Grace Lates</p>
              <p className="font-semibold text-gray-900">{payroll.lateDeduction?.graceLatesPerMonth || 3} per month</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-gray-500">Overtime Rate</p>
              <p className="font-semibold text-gray-900">{payroll.overtime?.rateMultiplier || 1.5}x</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-gray-500">PF Rate</p>
              <p className="font-semibold text-gray-900">{payroll.pfPercentage || 12}%</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-semibold"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FaCheck />
                Save Payroll Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// Notifications Tab (Admin/HR/Department Head only)
function NotificationsTab() {
  const [settings, setSettings] = useState(null)
  const [originalSettings, setOriginalSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const NotificationManagement = dynamic(() => import('@/components/NotificationManagement'), { ssr: false })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    // Check if there are unsaved changes
    if (settings && originalSettings) {
      const currentEmailNotifications = settings.notifications?.emailNotifications
      const originalEmailNotifications = originalSettings.notifications?.emailNotifications
      const currentEmailEvents = JSON.stringify(settings.notifications?.emailEvents || {})
      const originalEmailEvents = JSON.stringify(originalSettings.notifications?.emailEvents || {})

      setHasChanges(
        currentEmailNotifications !== originalEmailNotifications ||
        currentEmailEvents !== originalEmailEvents
      )
    }
  }, [settings, originalSettings])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        setOriginalSettings(JSON.parse(JSON.stringify(data.data))) // Deep clone
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailToggleChange = (eventKey) => (e) => {
    const checked = e.target.checked
    setSettings((prev) => {
      if (!prev) return prev

      // Deep clone to avoid mutation
      const newSettings = JSON.parse(JSON.stringify(prev))

      if (!newSettings.notifications) {
        newSettings.notifications = {}
      }
      if (!newSettings.notifications.emailEvents) {
        newSettings.notifications.emailEvents = {}
      }

      newSettings.notifications.emailEvents[eventKey] = checked

      return newSettings
    })
  }

  const handleGlobalEmailToggleChange = (e) => {
    const checked = e.target.checked
    setSettings((prev) => {
      if (!prev) return prev

      // Deep clone to avoid mutation
      const newSettings = JSON.parse(JSON.stringify(prev))

      if (!newSettings.notifications) {
        newSettings.notifications = {}
      }

      newSettings.notifications.emailNotifications = checked

      return newSettings
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')

      // Get the current value - if undefined, treat as true (default), otherwise use the actual value
      const emailNotifications = settings.notifications?.emailNotifications !== false
      const emailEvents = settings.notifications?.emailEvents || {}

      console.log('Saving email notification settings:', {
        emailNotifications,
        emailEvents
      })

      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications: {
            emailNotifications: emailNotifications,
            emailEvents: emailEvents,
          },
        }),
      })

      const data = await response.json()
      console.log('Save response:', data)

      if (data.success) {
        // Update both settings and original settings with the response
        const updatedSettings = JSON.parse(JSON.stringify(data.data))
        setSettings(updatedSettings)
        setOriginalSettings(updatedSettings)
        setHasChanges(false)
        toast.success('Email notification settings saved successfully!')
      } else {
        toast.error(data.message || 'Failed to save notification settings')
      }
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)))
      setHasChanges(false)
      toast.success('Changes discarded')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    )
  }

  // Master toggle: default is true (from schema), only false if explicitly set to false
  const emailNotificationsEnabled = settings?.notifications?.emailNotifications !== false
  const emailEvents = settings?.notifications?.emailEvents || {}

  const attendanceStatusEvents = [
    {
      key: 'attendanceStatusPresent',
      label: 'Present days',
      description: 'Send an email summary when an employee is marked present.',
    },
    {
      key: 'attendanceStatusHalfDay',
      label: 'Half-day days',
      description: 'Send an email summary when an employee is marked half-day.',
    },
    {
      key: 'attendanceStatusAbsent',
      label: 'Absent days',
      description: 'Send an email summary when an employee is marked absent.',
    },
  ]

  // Check if individual event is enabled
  // Default to true if not explicitly set to false (for backward compatibility)
  const isEventEnabled = (key) => {
    const value = emailEvents[key]
    // If undefined or true, return true. If false, return false.
    return value !== false
  }

  return (
    <div className="space-y-6">
      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-amber-800">
                You have unsaved changes
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            >
              Discard changes
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Email Notifications</h2>
          <p className="text-sm text-gray-600 mb-6">
            Choose which activities should send emails to employees.
          </p>

          <div className="space-y-5">
            {/* Master toggle */}
            <div className="flex items-start justify-between p-4 bg-gradient-to-r from-blue-50 to-primary-50 rounded-lg border border-primary-100">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Enable email notifications</p>
                <p className="text-xs text-gray-600 mt-1">
                  Master switch to enable or disable all email notifications system-wide.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={emailNotificationsEnabled}
                  onChange={handleGlobalEmailToggleChange}
                />
                <div className={`relative w-11 h-6 rounded-full transition-all duration-500 ease-in-out ${
                  emailNotificationsEnabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ease-in-out transform ${
                    emailNotificationsEnabled
                      ? 'translate-x-5'
                      : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
            </div>

            {/* Per-event toggles */}
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Authentication Events</p>
              {[
                {
                  key: 'login',
                  label: 'Login',
                  description: 'Send an email to employees when they log in.',
                },
              ].map((event) => {
                const isEnabled = isEventEnabled(event.key)
                const canToggle = emailNotificationsEnabled

                return (
                  <div key={event.key} className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                    </div>
                    <label className={`inline-flex items-center ml-4 flex-shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isEnabled}
                        onChange={handleEmailToggleChange(event.key)}
                        disabled={!canToggle}
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-all duration-500 ease-in-out ${
                        !canToggle
                          ? 'bg-gray-200 opacity-50'
                          : isEnabled
                            ? 'bg-blue-600'
                            : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ease-in-out ${
                          isEnabled
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`} />
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance Events</p>
              {[
                {
                  key: 'attendanceClockIn',
                  label: 'Clock in',
                  description: 'Send an email when an employee clocks in.',
                },
              ].map((event) => {
                const isEnabled = isEventEnabled(event.key)
                const canToggle = emailNotificationsEnabled

                return (
                  <div key={event.key} className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                    </div>
                    <label className={`inline-flex items-center ml-4 flex-shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isEnabled}
                        onChange={handleEmailToggleChange(event.key)}
                        disabled={!canToggle}
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-all duration-500 ease-in-out ${
                        !canToggle
                          ? 'bg-gray-200 opacity-50'
                          : isEnabled
                            ? 'bg-blue-600'
                            : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ease-in-out ${
                          isEnabled
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`} />
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Attendance Status (on clock-out)</p>
              {attendanceStatusEvents.map((event) => {
                const isEnabled = isEventEnabled(event.key)
                const canToggle = emailNotificationsEnabled

                return (
                  <div key={event.key} className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                    </div>
                    <label className={`inline-flex items-center ml-4 flex-shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isEnabled}
                        onChange={handleEmailToggleChange(event.key)}
                        disabled={!canToggle}
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-all duration-500 ease-in-out ${
                        !canToggle
                          ? 'bg-gray-200 opacity-50'
                          : isEnabled
                            ? 'bg-blue-600'
                            : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ease-in-out ${
                          isEnabled
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`} />
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Push Notifications</h2>
        <NotificationManagement />
      </div>
    </div>
  )
}

