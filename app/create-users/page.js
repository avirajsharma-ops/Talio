'use client'

import { useState } from 'react'
import { FaUser, FaPlus, FaCheck } from 'react-icons/fa'

export default function CreateUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const defaultUsers = [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@hrms.com',
      password: 'admin123',
      role: 'admin',
      position: 'System Administrator',
      phone: '9876543210'
    },
    {
      firstName: 'HR',
      lastName: 'Manager',
      email: 'hr@hrms.com',
      password: 'hr123456',
      role: 'hr',
      position: 'HR Manager',
      phone: '9876543211'
    },
    {
      firstName: 'Team',
      lastName: 'Manager',
      email: 'manager@hrms.com',
      password: 'manager123',
      role: 'manager',
      position: 'Team Lead',
      phone: '9876543212'
    },
    {
      firstName: 'John',
      lastName: 'Employee',
      email: 'employee@hrms.com',
      password: 'employee123',
      role: 'employee',
      position: 'Software Developer',
      phone: '9876543213'
    }
  ]

  const createUser = async (userData) => {
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const result = await response.json()
      return result
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  const createAllUsers = async () => {
    setLoading(true)
    setMessage('Creating users...')
    setUsers([])

    const results = []
    
    for (const userData of defaultUsers) {
      setMessage(`Creating ${userData.firstName} ${userData.lastName}...`)
      const result = await createUser(userData)
      results.push({
        ...userData,
        success: result.success,
        message: result.message,
        employeeCode: result.data?.employeeCode
      })
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setUsers(results)
    setMessage('User creation completed!')
    setLoading(false)
  }

  const createSingleUser = async (userData) => {
    setLoading(true)
    setMessage(`Creating ${userData.firstName} ${userData.lastName}...`)

    const result = await createUser(userData)

    setUsers(prev => [...prev, {
      ...userData,
      success: result.success,
      message: result.message,
      employeeCode: result.data?.employeeCode
    }])

    setMessage(result.success ? 'User created successfully!' : `Error: ${result.message}`)
    setLoading(false)
  }

  const clearAllUsers = async () => {
    if (!confirm('Are you sure you want to delete ALL users and tasks? This cannot be undone!')) {
      return
    }

    setLoading(true)
    setMessage('Clearing all users and tasks...')

    try {
      const response = await fetch('/api/clear-users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (result.success) {
        setUsers([])
        setMessage(`Cleared ${result.data.employeesDeleted} users and ${result.data.tasksDeleted} tasks`)
      } else {
        setMessage(`Error: ${result.message}`)
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <FaUser className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Create Test Users</h1>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This page will create test users for the HRMS system. Click the button below to create all default users.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={createAllUsers}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <FaPlus className="mr-2" />
                )}
                {loading ? 'Creating Users...' : 'Create All Default Users'}
              </button>

              <button
                onClick={clearAllUsers}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                Clear All Users & Tasks
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {defaultUsers.map((user, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'hr' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'manager' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">Email: {user.email}</p>
                <p className="text-sm text-gray-600 mb-1">Password: {user.password}</p>
                <p className="text-sm text-gray-600 mb-3">Department: {user.department}</p>
                
                <button
                  onClick={() => createSingleUser(user)}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Create This User
                </button>
              </div>
            ))}
          </div>

          {users.length > 0 && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Creation Results:</h2>
              <div className="space-y-2">
                {users.map((user, index) => (
                  <div key={index} className={`p-3 rounded-lg flex items-center justify-between ${
                    user.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div>
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      {user.employeeCode && (
                        <span className="ml-2 text-sm text-gray-600">
                          (Code: {user.employeeCode})
                        </span>
                      )}
                      <p className="text-sm text-gray-600">{user.message}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      user.success ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {user.success ? (
                        <FaCheck className="text-white text-sm" />
                      ) : (
                        <span className="text-white text-sm">✕</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Login Credentials:</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>Admin:</strong> admin@hrms.com / admin123</p>
              <p><strong>HR:</strong> hr@hrms.com / hr123</p>
              <p><strong>Manager:</strong> manager@hrms.com / manager123</p>
              <p><strong>Employee:</strong> employee@hrms.com / employee123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
