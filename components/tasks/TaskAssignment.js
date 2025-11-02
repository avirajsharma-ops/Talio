'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaTrash, FaUser, FaUsers, FaSearch, FaCheck, FaTimes } from 'react-icons/fa'

const TaskAssignment = ({ taskId, currentAssignees = [], onAssignmentChange, mode = 'create' }) => {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState(currentAssignees)
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [user, setUser] = useState(null)
  const [currentEmp, setCurrentEmp] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchEmployees()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [searchTerm, employees, user])

  useEffect(() => {
    if (user && employees.length) {
      const myId = user.employeeId || user.id || user._id
      const me = employees.find(e => e._id === myId)
      setCurrentEmp(me || null)
    }
  }, [user, employees])

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees?status=active&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEmployees(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const filterEmployees = () => {
    let filtered = employees.filter(emp => 
      !selectedEmployees.some(selected => selected.employee === emp._id)
    )

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter based on assignment permissions
    if (user) {
      filtered = filtered.filter(emp => canAssignTo(emp))
    }

    setFilteredEmployees(filtered)
  }

  const canAssignTo = (employee) => {
    if (!user) return false
    const myId = user.employeeId || user.id || user._id

    // Self assignment is always allowed
    if (employee._id === myId) return true

    // Admin and HR can assign to anyone
    if (['admin', 'hr'].includes(user.role)) return true

    // Managers can assign to their team members
    if (user.role === 'manager' && (employee.reportingManager?._id === myId || employee.reportingManager === myId)) return true

    // Same department assignment
    if ((employee.department?._id && currentEmp?.department?._id && employee.department._id === currentEmp.department._id)) return true

    return false
  }

  const addAssignee = (employee, role = 'owner') => {
    const newAssignee = {
      employee: employee._id,
      employeeData: employee,
      role,
      status: 'pending'
    }

    const updated = [...selectedEmployees, newAssignee]
    setSelectedEmployees(updated)
    setSearchTerm('')
    setShowDropdown(false)

    if (onAssignmentChange) {
      onAssignmentChange(updated)
    }
  }

  const removeAssignee = (employeeId) => {
    const updated = selectedEmployees.filter(assignee => assignee.employee !== employeeId)
    setSelectedEmployees(updated)

    if (onAssignmentChange) {
      onAssignmentChange(updated)
    }
  }

  const updateAssigneeRole = (employeeId, newRole) => {
    const updated = selectedEmployees.map(assignee =>
      assignee.employee === employeeId
        ? { ...assignee, role: newRole }
        : assignee
    )
    setSelectedEmployees(updated)

    if (onAssignmentChange) {
      onAssignmentChange(updated)
    }
  }

  const handleAssignmentAction = async (action, reason = '') => {
    if (!taskId) return

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/tasks/assign', {
        method: action === 'accept' || action === 'reject' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId,
          assignees: selectedEmployees.map(a => ({
            employee: a.employee,
            role: a.role
          })),
          action,
          reason
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Assignment successful:', data.message)
        
        if (onAssignmentChange) {
          onAssignmentChange(data.data.assignedTo)
        }
      } else {
        const error = await response.json()
        console.error('Assignment failed:', error.message)
      }
    } catch (error) {
      console.error('Assignment error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAssignmentTypeLabel = (employee) => {
    const myId = user?.employeeId || user?.id || user?._id
    if (employee._id === myId) return 'Self'
    if (employee.reportingManager?._id === myId || employee.reportingManager === myId) return 'Team Member'
    if (employee.department?._id && currentEmp?.department?._id && employee.department._id === currentEmp.department._id) return 'Colleague'
    return 'Cross-Department'
  }

  const getAssignmentTypeColor = (employee) => {
    const myId = user?.employeeId || user?.id || user?._id
    if (employee._id === myId) return 'bg-blue-100 text-blue-800'
    if (employee.reportingManager?._id === myId || employee.reportingManager === myId) return 'bg-green-100 text-green-800'
    if (employee.department?._id && currentEmp?.department?._id && employee.department._id === currentEmp.department._id) return 'bg-yellow-100 text-yellow-800'
    return 'bg-purple-100 text-purple-800'
  }

  return (
    <div className="space-y-4">
      {/* Current Assignees */}
      {selectedEmployees.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Assigned To ({selectedEmployees.length})
          </label>
          <div className="space-y-2">
            {selectedEmployees.map((assignee) => (
              <div key={assignee.employee} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <FaUser className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {assignee.employeeData?.firstName} {assignee.employeeData?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assignee.employeeData?.employeeCode} • {assignee.employeeData?.department?.name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAssignmentTypeColor(assignee.employeeData)}`}>
                    {getAssignmentTypeLabel(assignee.employeeData)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Role Selector */}
                  <select
                    value={assignee.role}
                    onChange={(e) => updateAssigneeRole(assignee.employee, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="owner">Owner</option>
                    <option value="collaborator">Collaborator</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="observer">Observer</option>
                  </select>

                  {/* Status Badge */}
                  {assignee.status && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignee.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      assignee.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      assignee.status === 'delegated' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assignee.status}
                    </span>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeAssignee(assignee.employee)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Remove assignee"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Assignee */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Assignee
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search employees by name, code, or department..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        </div>

        {/* Employee Dropdown */}
        {showDropdown && filteredEmployees.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredEmployees.slice(0, 10).map((employee) => (
              <div
                key={employee._id}
                onClick={() => addAssignee(employee)}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <FaUser className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {employee.employeeCode} • {employee.department?.name} • {
                        employee.designation?.levelName && employee.designation?.title
                          ? `(${employee.designation.levelName}) - ${employee.designation.title}`
                          : employee.designation?.title || 'N/A'
                      }
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAssignmentTypeColor(employee)}`}>
                  {getAssignmentTypeLabel(employee)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Actions (for existing tasks) */}
      {mode === 'manage' && taskId && (
        <div className="flex space-x-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleAssignmentAction('assign')}
            disabled={loading || selectedEmployees.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>{loading ? 'Assigning...' : 'Assign Task'}</span>
          </button>

          <button
            onClick={() => handleAssignmentAction('reassign')}
            disabled={loading || selectedEmployees.length === 0}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FaUsers className="w-4 h-4" />
            <span>{loading ? 'Reassigning...' : 'Reassign Task'}</span>
          </button>

          <button
            onClick={() => handleAssignmentAction('delegate')}
            disabled={loading || selectedEmployees.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FaUsers className="w-4 h-4" />
            <span>{loading ? 'Delegating...' : 'Delegate Task'}</span>
          </button>
        </div>
      )}

      {/* Assignment Response Actions (for assignees) */}
      {mode === 'respond' && taskId && (
        <div className="flex space-x-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleAssignmentAction('accept')}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FaCheck className="w-4 h-4" />
            <span>{loading ? 'Accepting...' : 'Accept Assignment'}</span>
          </button>

          <button
            onClick={() => handleAssignmentAction('reject')}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FaTimes className="w-4 h-4" />
            <span>{loading ? 'Rejecting...' : 'Reject Assignment'}</span>
          </button>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}

export default TaskAssignment
