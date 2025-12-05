'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaSave, FaTimes, FaChevronDown, FaCheck, FaTimes as FaX } from 'react-icons/fa'

export default function AddEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [companies, setCompanies] = useState([])
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)
  const deptDropdownRef = useRef(null)
  
  // Static levels list
  const levels = [
    { level: 1, levelName: 'Entry Level' },
    { level: 2, levelName: 'Junior' },
    { level: 3, levelName: 'Mid Level' },
    { level: 4, levelName: 'Senior' },
    { level: 5, levelName: 'Lead' },
    { level: 6, levelName: 'Manager' },
    { level: 7, levelName: 'Director' },
    { level: 8, levelName: 'Executive' },
  ]
  
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    dateOfJoining: '',
    departments: [], // Changed to array for multiple departments
    department: '', // Primary department (first selected)
    designation: '',
    designationLevel: '',
    designationLevelName: '',
    company: '',
    employmentType: 'full-time',
    status: 'active',
    password: '',
    role: 'employee',
  })

  useEffect(() => {
    fetchDepartments()
    fetchDesignations()
    fetchCompanies()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setShowDeptDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setDepartments(data.data)
      }
    } catch (error) {
      console.error('Fetch departments error:', error)
    }
  }

  const fetchDesignations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/designations', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setDesignations(data.data)
      }
    } catch (error) {
      console.error('Fetch designations error:', error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      console.error('Fetch companies error:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Handle department toggle (multi-select)
  const handleDepartmentToggle = (deptId) => {
    setFormData(prev => {
      const currentDepts = prev.departments || []
      let newDepts
      
      if (currentDepts.includes(deptId)) {
        // Remove department
        newDepts = currentDepts.filter(id => id !== deptId)
      } else {
        // Add department
        newDepts = [...currentDepts, deptId]
      }
      
      return {
        ...prev,
        departments: newDepts,
        // Set primary department as the first selected
        department: newDepts.length > 0 ? newDepts[0] : '',
      }
    })
  }

  // Remove a specific department
  const removeDepartment = (deptId) => {
    setFormData(prev => {
      const newDepts = (prev.departments || []).filter(id => id !== deptId)
      return {
        ...prev,
        departments: newDepts,
        department: newDepts.length > 0 ? newDepts[0] : '',
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Employee and user account created successfully!')
        if (data.credentials) {
          toast.success(`Login: ${data.credentials.email} / ${data.credentials.password}`, {
            duration: 10000,
          })
        }
        setTimeout(() => {
          router.push('/dashboard/employees')
        }, 2000)
      } else {
        toast.error(data.message || 'Failed to create employee')
      }
    } catch (error) {
      console.error('Create employee error:', error)
      toast.error('An error occurred while creating employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Add New Employee</h1>
        <p className="text-gray-600 mt-1">Fill in the employee details</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="employeeCode"
              value={formData.employeeCode}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="EMP001"
            />
          </div>

          {/* First Name & Last Name - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="First Name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Last Name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="employee@mushroomworldgroup.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+1234567890"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date of Joining */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Joining <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dateOfJoining"
              value={formData.dateOfJoining}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Department - Multi-select */}
          <div className="md:col-span-2" ref={deptDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departments <span className="text-gray-400 text-xs">(can select multiple)</span>
            </label>
            
            {/* Selected Departments Tags */}
            {formData.departments && formData.departments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.departments.map(deptId => {
                  const dept = departments.find(d => d._id === deptId)
                  return dept ? (
                    <span 
                      key={deptId} 
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {dept.name}
                      <button
                        type="button"
                        onClick={() => removeDepartment(deptId)}
                        className="ml-1 text-primary-500 hover:text-primary-700"
                      >
                        <FaX className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
            
            {/* Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-left flex items-center justify-between bg-white"
              >
                <span className={formData.departments?.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
                  {formData.departments?.length > 0 
                    ? `${formData.departments.length} department(s) selected` 
                    : 'Select Departments'}
                </span>
                <FaChevronDown className={`text-gray-400 transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown List */}
              {showDeptDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {departments.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500 text-sm">No departments available</div>
                  ) : (
                    departments.map(dept => (
                      <label
                        key={dept._id}
                        className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.departments?.includes(dept._id) || false}
                          onChange={() => handleDepartmentToggle(dept._id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-3 text-gray-700">{dept.name}</span>
                        {dept.code && (
                          <span className="ml-2 text-xs text-gray-400">({dept.code})</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Designation & Level - Side by Side */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation
              </label>
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Designation</option>
                {designations.map((desig) => (
                  <option key={desig._id} value={desig._id}>
                    {desig.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Level - Auto-populated from designation but can be overridden */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <select
                name="designationLevel"
                value={formData.designationLevel}
                onChange={(e) => {
                  const selectedLevel = levels.find(l => l.level === parseInt(e.target.value))
                  setFormData({
                    ...formData,
                    designationLevel: e.target.value,
                    designationLevelName: selectedLevel?.levelName || '',
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Level</option>
                {levels.map((level) => (
                  <option key={level.level} value={level.level}>
                    {level.levelName}
                  </option>
                ))}
              </select>
              {formData.designationLevelName && (
                <p className="text-xs text-gray-500 mt-1">
                  Current: {formData.designationLevelName}
                </p>
              )}
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <select
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employment Type
            </label>
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter login password"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used for employee login. Default: employee123
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Determines access level in the system
            </p>
          </div>
        </div>

        {/* Login Credentials Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            📧 Login Credentials
          </h3>
          <p className="text-sm text-blue-700">
            A user account will be automatically created with the email and password provided above.
            The employee can use these credentials to login and mark attendance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/employees')}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaTimes />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center space-x-2"
          >
            <FaSave />
            <span>{loading ? 'Saving...' : 'Save Employee'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

