'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { FaTasks, FaSave, FaArrowLeft } from 'react-icons/fa'
import RoleBasedAccess from '@/components/RoleBasedAccess'

function CreateTaskContent() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    dueDate: '',
    estimatedHours: '',
    assignToSelf: true,
    assignToOthers: false,
    selectedEmployees: []
  })
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createdTaskId, setCreatedTaskId] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentEmp, setCurrentEmp] = useState(null)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)
  const router = useRouter()


  useEffect(() => {
    const initializeUser = async () => {
      const userData = localStorage.getItem('user')
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData)
          console.log('User loaded:', parsedUser)
          setUser(parsedUser)
          await fetchEmployees()
          await checkDepartmentHead()
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
  }, []) // Empty dependency array - run only once on mount

  // Resolve current employee
  useEffect(() => {
    if (user && employees.length) {
      // Handle both populated and non-populated employeeId
      const myId = (typeof user.employeeId === 'object' && user.employeeId?._id)
        ? user.employeeId._id
        : (user.employeeId || user.id || user._id)

      console.log('Looking for current employee with ID:', myId)
      console.log('User employeeId type:', typeof user.employeeId)
      console.log('User employeeId value:', user.employeeId)
      console.log('Available employees:', employees.map(e => ({ id: e._id, name: `${e.firstName} ${e.lastName}` })))

      const me = employees.find(e => e._id.toString() === myId.toString())
      console.log('Found current employee:', me)
      setCurrentEmp(me || null)
    }
  }, [user, employees])


  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees?status=active&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Employees API response:', data)
        setEmployees(data.data || [])
        console.log('Employees set:', (data.data || []).length)
      } else {
        console.error('Failed to fetch employees:', response.status)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

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
        console.log('User is department head:', data.department)
        setIsDepartmentHead(true)
      }
    } catch (error) {
      console.error('Error checking department head:', error)
    }
  }



  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleEmployeeSelection = (employeeId) => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.title || !formData.dueDate) {
      setError('Title and due date are required')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const myId = user.employeeId || user.id || user._id

      // Build assignees array
      let assignees = []

      if (formData.assignToSelf) {
        console.log('Adding self to assignees. Employee ID:', myId)
        assignees.push({
          employee: myId,
          role: 'owner'
        })
      }

      if (formData.assignToOthers && formData.selectedEmployees.length > 0) {
        console.log('Adding selected employees:', formData.selectedEmployees)
        formData.selectedEmployees.forEach(employeeId => {
          if (!assignees.find(a => a.employee === employeeId)) {
            assignees.push({
              employee: employeeId,
              role: 'owner'
            })
          }
        })
      }

      console.log('Final assignees array:', assignees)

      if (assignees.length === 0) {
        setError('Please assign the task to at least one person')
        return
      }

      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        dueDate: formData.dueDate,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : 0,
        assignedTo: assignees
      }

      const response = await fetch(`/api/tasks?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(taskData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Task created successfully!')
        setCreatedTaskId(data.data?._id || null)
        // Don't auto-redirect, let user choose to view or create another
      } else {
        setError(data.message || 'Failed to create Project')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      setError('An error occurred while creating the task')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredEmployees = () => {
    if (!user) {
      console.log('No user found')
      return []
    }

    // Get my employee ID - handle both populated and non-populated employeeId
    const myId = (typeof user.employeeId === 'object' && user.employeeId?._id)
      ? user.employeeId._id
      : (user.employeeId || user.id || user._id)

    console.log('=== FILTERING EMPLOYEES ===')
    console.log('User:', user)
    console.log('My ID:', myId)
    console.log('Total employees:', employees.length)
    console.log('Current Emp:', currentEmp)
    console.log('Is Dept Head:', isDepartmentHead)

    const filtered = employees.filter(emp => {
      // Don't show self in others list
      if (emp._id === myId || emp._id.toString() === myId.toString()) {
        console.log('Excluding self:', emp.firstName, emp.lastName)
        return false
      }

      // Admin and HR can assign to anyone
      if (user.role === 'admin' || user.role === 'hr') {
        console.log('Admin/HR - including:', emp.firstName, emp.lastName)
        return true
      }

      // If currentEmp not loaded yet, wait
      if (!currentEmp) {
        console.log('CurrentEmp not loaded yet, skipping filter')
        return false
      }

      // Check if in same department
      const empDeptId = emp.department?._id || emp.department
      const myDeptId = currentEmp.department?._id || currentEmp.department
      const sameDepartment = empDeptId && myDeptId && empDeptId.toString() === myDeptId.toString()

      console.log('Employee:', emp.firstName, emp.lastName,
        'EmpDept:', empDeptId,
        'MyDept:', myDeptId,
        'SameDept:', sameDepartment)

      // If not in same department, cannot assign
      if (!sameDepartment) {
        console.log('Different department, excluding:', emp.firstName)
        return false
      }

      // Department head can assign to anyone in their department
      if (isDepartmentHead) {
        console.log('Dept head - including:', emp.firstName, emp.lastName)
        return true
      }

      // Get hierarchy levels
      const myLevel = currentEmp.designation?.level || 0
      const empLevel = emp.designation?.level || 0

      console.log('Hierarchy check:', emp.firstName, 'MyLevel:', myLevel, 'EmpLevel:', empLevel)

      // Cannot assign to higher hierarchy (lower level number = higher hierarchy)
      if (empLevel < myLevel) {
        console.log('Higher hierarchy, excluding:', emp.firstName)
        return false
      }

      // Can assign to same level or lower hierarchy (higher level number)
      console.log('Same/lower hierarchy, including:', emp.firstName)
      return empLevel >= myLevel
    })

    console.log('=== FILTERED RESULT ===')
    console.log('Filtered employees count:', filtered.length)
    console.log('Filtered employees:', filtered.map(e => `${e.firstName} ${e.lastName}`))
    return filtered
  }

  if (isInitializing || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleBasedAccess allowedRoles={['admin', 'hr', 'manager', 'employee']}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <FaTasks className="mr-3 text-blue-600" />
                  Create New Project
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">Create and assign a new project</p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm mb-3">{success}</p>
              <div className="flex flex-wrap gap-2">
                {createdTaskId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/tasks/${createdTaskId}`)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    View Project
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSuccess('')
                    setCreatedTaskId(null)
                    setFormData({
                      title: '',
                      description: '',
                      priority: 'medium',
                      category: 'other',
                      dueDate: '',
                      estimatedHours: '',
                      assignToSelf: true,
                      assignToOthers: false,
                      selectedEmployees: []
                    })
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Create Another Project
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/tasks/my-tasks')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Go to My Projects
                </button>
              </div>
            </div>
          )}

          {/* Task Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter task title"
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
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter Project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="project">Project</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="research">Research</option>
                  <option value="meeting">Meeting</option>
                  <option value="training">Training</option>
                  <option value="review">Review</option>
                  <option value="documentation">Documentation</option>
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                  <option value="support">Support</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Assignment Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Assignment</h3>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="assignToSelf"
                    checked={formData.assignToSelf}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Assign to myself
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="assignToOthers"
                    checked={formData.assignToOthers}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Assign to others
                  </label>
                </div>

                {formData.assignToOthers && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-700">Select employees:</p>
                      <p className="text-xs text-gray-500 italic">
                        {isDepartmentHead && '(All department members)'}
                        {!isDepartmentHead && user?.role === 'manager' && '(Same department colleagues)'}
                        {!isDepartmentHead && user?.role === 'employee' && '(Same department colleagues)'}
                        {(user?.role === 'admin' || user?.role === 'hr') && '(All employees)'}
                      </p>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {getFilteredEmployees().map(employee => (
                        <div key={employee._id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            checked={formData.selectedEmployees.includes(employee._id)}
                            onChange={() => handleEmployeeSelection(employee._id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            {employee.firstName} {employee.lastName}
                            {employee.department?.name && ` (${employee.department.name})`}
                            {employee.designation?.levelName && ` - ${employee.designation.levelName}`}
                            {employee.designation?.title && !employee.designation?.levelName && ` - ${employee.designation.title}`}
                          </label>
                        </div>
                      ))}
                      {getFilteredEmployees().length === 0 && (
                        <p className="text-sm text-gray-500">
                          No employees available for assignment.
                          {isDepartmentHead && ' All department members may already be assigned or there are no other employees in your department.'}
                          {!isDepartmentHead && ' You can only assign to colleagues at your level or lower hierarchy in your department.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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
      </div>
    </RoleBasedAccess>
  )
}



// Disable SSR/SSG for this client-heavy page to avoid static export issues
const CreateTaskNoSSR = nextDynamic(() => Promise.resolve(CreateTaskContent), { ssr: false })

export default function CreateTaskPage() {
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
      <CreateTaskNoSSR />
    </Suspense>
  )
}
