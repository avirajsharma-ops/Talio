'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { 
  FaProjectDiagram, FaSave, FaArrowLeft, FaUser, FaUsers, FaBuilding, 
  FaSearch, FaTimes, FaCheck, FaChevronRight, FaPlus, FaUserPlus
} from 'react-icons/fa'
import toast from 'react-hot-toast'

function CreateProjectContent() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    category: 'internal',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })
  
  // Team assignment state
  const [assignToSelf, setAssignToSelf] = useState(true)
  const [assignToMyDept, setAssignToMyDept] = useState(false)
  const [assignToOtherDepts, setAssignToOtherDepts] = useState(false)
  const [selectedMyDeptEmployees, setSelectedMyDeptEmployees] = useState([])
  const [selectedOtherDeptEmployees, setSelectedOtherDeptEmployees] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [currentEmployee, setCurrentEmployee] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [searchMyDept, setSearchMyDept] = useState('')
  const [searchOtherDept, setSearchOtherDept] = useState('')
  const router = useRouter()

  useEffect(() => {
    const initializeUser = async () => {
      const userData = localStorage.getItem('user')
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          await Promise.all([
            fetchEmployees(),
            fetchDepartments(),
            fetchCurrentEmployee(parsedUser)
          ])
          setIsInitializing(false)
        } catch (error) {
          console.error('Error parsing user data:', error)
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    }
    initializeUser()
  }, [])

  const fetchCurrentEmployee = async (userData) => {
    try {
      const token = localStorage.getItem('token')
      const employeeId = userData.employeeId?._id || userData.employeeId
      if (!employeeId) return

      const response = await fetch(`/api/employees/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCurrentEmployee(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching current employee:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees?status=active&limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Get my department ID
  const myDeptId = currentEmployee?.department?._id || currentEmployee?.department
  const myEmployeeId = user?.employeeId?._id || user?.employeeId

  // Get employees from my department (excluding myself)
  const getMyDeptEmployees = () => {
    return employees.filter(emp => {
      const empDeptId = emp.department?._id || emp.department
      const empId = emp._id?.toString()
      return empDeptId?.toString() === myDeptId?.toString() && empId !== myEmployeeId?.toString()
    }).filter(emp => {
      if (!searchMyDept.trim()) return true
      const search = searchMyDept.toLowerCase()
      return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search)
    })
  }

  // Get employees from selected other department
  const getOtherDeptEmployees = () => {
    if (!selectedDepartment) return []
    return employees.filter(emp => {
      const empDeptId = emp.department?._id || emp.department
      return empDeptId?.toString() === selectedDepartment
    }).filter(emp => {
      if (!searchOtherDept.trim()) return true
      const search = searchOtherDept.toLowerCase()
      return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search)
    })
  }

  // Get departments other than mine
  const getOtherDepartments = () => {
    return departments.filter(dept => dept._id?.toString() !== myDeptId?.toString())
  }

  // Toggle employee selection
  const toggleMyDeptEmployee = (empId) => {
    setSelectedMyDeptEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const toggleOtherDeptEmployee = (empId) => {
    setSelectedOtherDeptEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  // Get all selected employees for display
  const getAllSelectedEmployees = () => {
    const allIds = [...selectedMyDeptEmployees, ...selectedOtherDeptEmployees]
    return employees.filter(emp => allIds.includes(emp._id))
  }

  // Remove employee from selection
  const removeEmployee = (empId) => {
    setSelectedMyDeptEmployees(prev => prev.filter(id => id !== empId))
    setSelectedOtherDeptEmployees(prev => prev.filter(id => id !== empId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.endDate) {
      toast.error('Project name and due date are required')
      return
    }

    if (!assignToSelf && selectedMyDeptEmployees.length === 0 && selectedOtherDeptEmployees.length === 0) {
      toast.error('Please assign the project to at least one person')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Build team array
      let team = []

      // Add self if selected
      if (assignToSelf) {
        team.push({
          member: myEmployeeId,
          role: 'lead',
          isActive: true,
          assignmentStatus: 'accepted'
        })
      }

      // Add my department employees
      selectedMyDeptEmployees.forEach(empId => {
        team.push({
          member: empId,
          role: 'developer',
          isActive: true,
          assignmentStatus: 'pending'
        })
      })

      // Add other department employees
      selectedOtherDeptEmployees.forEach(empId => {
        team.push({
          member: empId,
          role: 'developer',
          isActive: true,
          assignmentStatus: 'pending'
        })
      })

      const projectData = {
        name: formData.name,
        description: formData.description || '',
        summary: formData.description?.substring(0, 200) || '',
        priority: formData.priority,
        category: formData.category,
        startDate: formData.startDate,
        endDate: formData.endDate,
        department: myDeptId,
        projectManager: myEmployeeId,
        team: team,
        status: 'planning'
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Project created successfully!')
        router.push(`/dashboard/projects/${data.data._id}`)
      } else {
        toast.error(data.message || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('An error occurred while creating the project')
    } finally {
      setLoading(false)
    }
  }

  if (isInitializing || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const myDeptName = currentEmployee?.department?.name || 'My Department'
  const totalAssigned = (assignToSelf ? 1 : 0) + selectedMyDeptEmployees.length + selectedOtherDeptEmployees.length

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-6 px-4">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
              <FaProjectDiagram className="mr-3 text-blue-600" />
              Create Project
            </h1>
            <p className="text-gray-600 text-sm">Create and assign a new project</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details Card */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
            Project Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter project title"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter project description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="development">Development</option>
                <option value="research">Research</option>
                <option value="maintenance">Maintenance</option>
                <option value="training">Training</option>
                <option value="process_improvement">Process Improvement</option>
                <option value="client_project">Client Project</option>
                <option value="internal">Internal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Team Assignment Card */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
            Team Assignment
          </h2>

          {/* Assign to Myself Toggle */}
          <div className="mb-6">
            <div 
              onClick={() => setAssignToSelf(!assignToSelf)}
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                assignToSelf ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  assignToSelf ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  <FaUser className="w-4 h-4" />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Assign to Myself</p>
                  <p className="text-sm text-gray-500">You will be the project lead</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                assignToSelf ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}>
                {assignToSelf && <FaCheck className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>

          {/* My Department Section */}
          <div className="mb-6">
            <div 
              onClick={() => setAssignToMyDept(!assignToMyDept)}
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                assignToMyDept ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  assignToMyDept ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  <FaUsers className="w-4 h-4" />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">My Department ({myDeptName})</p>
                  <p className="text-sm text-gray-500">
                    {selectedMyDeptEmployees.length > 0 
                      ? `${selectedMyDeptEmployees.length} member${selectedMyDeptEmployees.length > 1 ? 's' : ''} selected`
                      : 'Select colleagues from your department'}
                  </p>
                </div>
              </div>
              <FaChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${assignToMyDept ? 'rotate-90' : ''}`} />
            </div>

            {/* My Department Employee Selection */}
            {assignToMyDept && (
              <div className="mt-3 ml-4 border-l-2 border-green-200 pl-4">
                <div className="relative mb-3">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchMyDept}
                    onChange={(e) => setSearchMyDept(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {getMyDeptEmployees().length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No employees found in your department
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {getMyDeptEmployees().map(emp => {
                        const isSelected = selectedMyDeptEmployees.includes(emp._id)
                        return (
                          <div
                            key={emp._id}
                            onClick={() => toggleMyDeptEmployee(emp._id)}
                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-gray-500">{emp.designation?.title || 'Employee'}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <FaCheck className="w-2.5 h-2.5 text-white" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Other Departments Section */}
          <div className="mb-6">
            <div 
              onClick={() => setAssignToOtherDepts(!assignToOtherDepts)}
              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                assignToOtherDepts ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  assignToOtherDepts ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  <FaBuilding className="w-4 h-4" />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Other Departments</p>
                  <p className="text-sm text-gray-500">
                    {selectedOtherDeptEmployees.length > 0 
                      ? `${selectedOtherDeptEmployees.length} member${selectedOtherDeptEmployees.length > 1 ? 's' : ''} selected`
                      : 'Cross-department collaboration'}
                  </p>
                </div>
              </div>
              <FaChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${assignToOtherDepts ? 'rotate-90' : ''}`} />
            </div>

            {/* Other Department Selection */}
            {assignToOtherDepts && (
              <div className="mt-3 ml-4 border-l-2 border-purple-200 pl-4">
                {/* Department Dropdown */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Department</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value)
                      setSelectedOtherDeptEmployees([])
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="">-- Choose a department --</option>
                    {getOtherDepartments().map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.employeeCount || 0} employees)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDepartment && (
                  <>
                    <div className="relative mb-3">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchOtherDept}
                        onChange={(e) => setSearchOtherDept(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {getOtherDeptEmployees().length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No employees found in this department
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {getOtherDeptEmployees().map(emp => {
                            const isSelected = selectedOtherDeptEmployees.includes(emp._id)
                            return (
                              <div
                                key={emp._id}
                                onClick={() => toggleOtherDeptEmployee(emp._id)}
                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium">
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-xs text-gray-500">{emp.designation?.title || 'Employee'}</p>
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <FaCheck className="w-2.5 h-2.5 text-white" />}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Selected Team Summary */}
          {totalAssigned > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <FaUserPlus className="mr-2 text-blue-500" />
                Team Summary ({totalAssigned} member{totalAssigned > 1 ? 's' : ''})
              </h4>
              <div className="flex flex-wrap gap-2">
                {assignToSelf && (
                  <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm">
                    <FaUser className="w-3 h-3 mr-2" />
                    You (Lead)
                  </div>
                )}
                {getAllSelectedEmployees().map(emp => (
                  <div 
                    key={emp._id}
                    className="inline-flex items-center bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full text-sm group"
                  >
                    <span>{emp.firstName} {emp.lastName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeEmployee(emp._id)
                      }}
                      className="ml-2 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              {(selectedMyDeptEmployees.length > 0 || selectedOtherDeptEmployees.length > 0) && (
                <p className="text-xs text-amber-600 mt-3 bg-amber-50 p-2 rounded">
                  💡 Team members will receive an invitation and can accept or decline.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || totalAssigned === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4 mr-2" />
                Create Project
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

const CreateProjectNoSSR = nextDynamic(() => Promise.resolve(CreateProjectContent), { ssr: false })

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateProjectNoSSR />
    </Suspense>
  )
}
