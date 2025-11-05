'use client'

import { useState, useEffect } from 'react'
import { FaBuilding, FaBriefcase, FaCalendarAlt, FaUmbrellaBeach, FaCog, FaMapMarkerAlt, FaClock, FaImage, FaPalette, FaCheck, FaBell } from 'react-icons/fa'
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
    if (userRole === 'admin' || userRole === 'hr') {
      baseTabs.push(
        { id: 'company', name: 'Company Settings', icon: FaBuilding },
        { id: 'geofencing', name: 'Geofencing', icon: FaMapMarkerAlt },
      )
    }

    // Admin, HR, and Department Heads get notifications (check both role and isDepartmentHead flag)
    if (userRole === 'admin' || userRole === 'hr' || userRole === 'department_head' || isDepartmentHead) {
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
    if (userRole === 'admin' || userRole === 'hr') {
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

      {/* Mobile Tabs */}
      <div className="md:hidden mb-4">
        <div className="rounded-lg shadow-md p-2 overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="flex space-x-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: activeTab === tab.id ? 'var(--color-primary-500)' : 'var(--color-primary-100)',
                    color: activeTab === tab.id ? '#FFFFFF' : 'var(--color-primary-700)'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-56 lg:w-64 rounded-lg shadow-md p-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: activeTab === tab.id ? 'var(--color-primary-500)' : 'transparent',
                    color: activeTab === tab.id ? '#FFFFFF' : '#374151'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          {activeTab === 'company' && <CompanySettingsTab />}
          {activeTab === 'geofencing' && <GeofencingTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'personalization' && <PersonalizationTab />}
        </div>
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
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
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
        <div className="bg-white rounded-lg p-6 border border-gray-200">
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
        <div className="bg-white rounded-lg p-6 border border-gray-200">
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
        <div className="bg-white rounded-lg p-6 border border-gray-200">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
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

// Geofencing Tab (Admin/HR only)
function GeofencingTab() {
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.target)
      const updatedSettings = {
        geofence: {
          enabled: formData.get('enabled') === 'on',
          center: {
            latitude: parseFloat(formData.get('latitude')) || 0,
            longitude: parseFloat(formData.get('longitude')) || 0,
          },
          radius: parseInt(formData.get('radius')) || 100,
          strictMode: formData.get('strictMode') === 'on',
          notifyOnExit: formData.get('notifyOnExit') === 'on',
          requireApproval: formData.get('requireApproval') === 'on',
        }
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

  const handleMapUpdate = (center, radius) => {
    // Update form values when map is updated
    document.getElementById('latitude').value = center.lat
    document.getElementById('longitude').value = center.lng
    document.getElementById('radius').value = radius
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

        {/* Geofence Center & Radius */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary-500" />
            <span>Office Location & Geofence Radius</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Set your office location and define the geofence boundary. Drag the marker or click on the map to set the center point.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                step="any"
                defaultValue={settings?.geofence?.center?.latitude || 0}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="0.000000"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                step="any"
                defaultValue={settings?.geofence?.center?.longitude || 0}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="0.000000"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Radius (meters)</label>
              <input
                type="number"
                id="radius"
                name="radius"
                min="10"
                defaultValue={settings?.geofence?.radius || 100}
                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="100"
              />
            </div>
          </div>

          {/* Map */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-md" style={{ height: '450px' }}>
            <GeofenceMap
              center={{
                lat: settings?.geofence?.center?.latitude || 0,
                lng: settings?.geofence?.center?.longitude || 0
              }}
              radius={settings?.geofence?.radius || 100}
              onUpdate={handleMapUpdate}
            />
          </div>
        </div>

        {/* Geofence Options */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
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

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
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

      <div className="rounded-lg p-6 border border-gray-200" style={{ backgroundColor: 'var(--color-bg-card)' }}>
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

// Notifications Tab (Admin/HR/Department Head only)
function NotificationsTab() {
  const NotificationManagement = dynamic(() => import('@/components/NotificationManagement'), { ssr: false })

  return (
    <div>
      <NotificationManagement />
    </div>
  )
}

