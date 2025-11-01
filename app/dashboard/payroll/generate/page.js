'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaMoneyBillWave, FaArrowLeft, FaCalculator } from 'react-icons/fa'

export default function GeneratePayrollPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paymentDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setEmployees(data.data.filter(emp => emp.status === 'active'))
      }
    } catch (error) {
      console.error('Fetch employees error:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(employees.map(emp => emp._id))
    } else {
      setSelectedEmployees([])
    }
  }

  const handleSelectEmployee = (empId) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== empId))
    } else {
      setSelectedEmployees([...selectedEmployees, empId])
    }
  }

  const handleGeneratePayroll = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee')
      return
    }

    setGenerating(true)

    try {
      const token = localStorage.getItem('token')
      
      // Generate payroll for each selected employee
      const promises = selectedEmployees.map(async (empId) => {
        const employee = employees.find(e => e._id === empId)
        
        const payrollData = {
          employee: empId,
          month: formData.month,
          year: formData.year,
          basicSalary: employee.salary || 50000,
          allowances: {
            hra: (employee.salary || 50000) * 0.4,
            transport: 2000,
            medical: 1500,
          },
          deductions: {
            tax: (employee.salary || 50000) * 0.1,
            pf: (employee.salary || 50000) * 0.12,
            insurance: 1000,
          },
          paymentDate: formData.paymentDate,
          status: 'pending',
        }

        return fetch('/api/payroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payrollData),
        })
      })

      await Promise.all(promises)
      
      toast.success(`Payroll generated for ${selectedEmployees.length} employees!`)
      router.push('/dashboard/payroll')
    } catch (error) {
      console.error('Generate payroll error:', error)
      toast.error('Failed to generate payroll')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Generate Payroll</h1>
          <p className="text-gray-600 mt-1">Generate salary for selected employees</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/payroll')}
          className="btn-secondary flex items-center space-x-2"
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </div>

      {/* Payroll Settings */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Payroll Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month *
            </label>
            <select
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year *
            </label>
            <select
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return <option key={year} value={year}>{year}</option>
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Select Employees</h2>
          <div className="text-sm text-gray-600">
            {selectedEmployees.length} of {employees.length} selected
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading employees...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === employees.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basic Salary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee._id)}
                        onChange={() => handleSelectEmployee(employee._id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{employee.employeeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.designation?.title || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${employee.salary?.toLocaleString() || '50,000'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Generate Button */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleGeneratePayroll}
            disabled={generating || selectedEmployees.length === 0}
            className="btn-primary flex items-center space-x-2 w-full md:w-auto"
          >
            <FaCalculator />
            <span>
              {generating
                ? 'Generating...'
                : `Generate Payroll for ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

