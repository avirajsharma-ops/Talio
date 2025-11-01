'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaSave, FaTimes, FaPlus } from 'react-icons/fa'

export default function CreateOffboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState({
    employeeId: '',
    lastWorkingDay: '',
    reason: '',
    reasonCategory: 'resignation',
    handoverTo: '',
    exitInterviewDate: '',
    exitInterviewConductedBy: '',
    status: 'pending',
    checklist: [
      { task: 'Return company equipment (laptop, phone, etc.)', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Transfer knowledge and ongoing projects', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Revoke system access and accounts', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Collect company ID card and access cards', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Final payroll and benefits processing', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Conduct exit interview', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Update organizational chart', completed: false, dueDate: '', assignedTo: '' },
      { task: 'Archive employee records', completed: false, dueDate: '', assignedTo: '' }
    ],
    documents: [
      { name: 'Resignation Letter', required: true, submitted: false, submittedDate: '' },
      { name: 'Equipment Return Form', required: true, submitted: false, submittedDate: '' },
      { name: 'Exit Interview Form', required: true, submitted: false, submittedDate: '' },
      { name: 'Final Payslip', required: true, submitted: false, submittedDate: '' },
      { name: 'Non-Disclosure Agreement Reminder', required: false, submitted: false, submittedDate: '' },
      { name: 'Reference Letter Request', required: false, submitted: false, submittedDate: '' }
    ],
    feedback: '',
    recommendations: '',
    notes: ''
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      const data = await response.json()
      if (data.success) {
        setEmployees(data.data)
      }
    } catch (error) {
      console.error('Fetch employees error:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChecklistChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleDocumentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map((doc, i) => 
        i === index ? { ...doc, [field]: value } : doc
      )
    }))
  }

  const addChecklistItem = () => {
    setFormData(prev => ({
      ...prev,
      checklist: [...prev.checklist, { task: '', completed: false, dueDate: '', assignedTo: '' }]
    }))
  }

  const removeChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }))
  }

  const addDocument = () => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, { name: '', required: false, submitted: false, submittedDate: '' }]
    }))
  }

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.employeeId) {
      toast.error('Please select an employee')
      return
    }
    
    if (!formData.lastWorkingDay) {
      toast.error('Please select last working day')
      return
    }

    if (!formData.reason) {
      toast.error('Please provide reason for leaving')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/offboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          checklist: formData.checklist.filter(item => item.task.trim()),
          documents: formData.documents.filter(doc => doc.name.trim())
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Offboarding process created successfully')
        router.push('/dashboard/offboarding')
      } else {
        toast.error(data.message || 'Failed to create offboarding process')
      }
    } catch (error) {
      console.error('Create offboarding error:', error)
      toast.error('Failed to create offboarding process')
    } finally {
      setLoading(false)
    }
  }

  const reasonCategories = [
    { value: 'resignation', label: 'Resignation' },
    { value: 'termination', label: 'Termination' },
    { value: 'retirement', label: 'Retirement' },
    { value: 'layoff', label: 'Layoff' },
    { value: 'contract-end', label: 'Contract End' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Create Offboarding Process</h1>
            <p className="text-gray-600 mt-1">Set up offboarding for an employee</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee *
              </label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} ({employee.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Working Day *
              </label>
              <input
                type="date"
                name="lastWorkingDay"
                value={formData.lastWorkingDay}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason Category
              </label>
              <select
                name="reasonCategory"
                value={formData.reasonCategory}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {reasonCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Handover To
              </label>
              <select
                name="handoverTo"
                value={formData.handoverTo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exit Interview Date
              </label>
              <input
                type="date"
                name="exitInterviewDate"
                value={formData.exitInterviewDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exit Interview Conducted By
              </label>
              <select
                name="exitInterviewConductedBy"
                value={formData.exitInterviewConductedBy}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Interviewer</option>
                {employees.filter(emp => ['hr', 'manager', 'admin'].includes(emp.role)).map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Leaving *
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Provide detailed reason for leaving..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Offboarding Checklist */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Offboarding Checklist</h2>
            <button
              type="button"
              onClick={addChecklistItem}
              className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
            >
              <FaPlus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
          <div className="space-y-4">
            {formData.checklist.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task
                    </label>
                    <input
                      type="text"
                      value={item.task}
                      onChange={(e) => handleChecklistChange(index, 'task', e.target.value)}
                      placeholder="Enter task description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) => handleChecklistChange(index, 'dueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned To
                    </label>
                    <select
                      value={item.assignedTo}
                      onChange={(e) => handleChecklistChange(index, 'assignedTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Person</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => handleChecklistChange(index, 'completed', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Completed</span>
                  </label>
                  {formData.checklist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback and Recommendations */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Feedback & Recommendations</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Feedback
              </label>
              <textarea
                name="feedback"
                value={formData.feedback}
                onChange={handleInputChange}
                placeholder="Record feedback from exit interview..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendations for Improvement
              </label>
              <textarea
                name="recommendations"
                value={formData.recommendations}
                onChange={handleInputChange}
                placeholder="Based on feedback, what improvements can be made..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes or comments..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <FaTimes className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <FaSave className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Create Offboarding'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
