'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa'

export default function CreateRatingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState({
    employeeId: '',
    period: '',
    ratingDate: new Date().toISOString().split('T')[0],
    comments: '',
    status: 'completed',
    ratings: {
      technical: 0,
      communication: 0,
      teamwork: 0,
      leadership: 0,
      problemSolving: 0,
      reliability: 0,
      initiative: 0,
      quality: 0
    }
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

  const handleRatingChange = (category, rating) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: rating
      }
    }))
  }

  const calculateOverallRating = () => {
    const ratingValues = Object.values(formData.ratings).filter(val => val > 0)
    if (ratingValues.length === 0) return 0
    return (ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length).toFixed(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.employeeId) {
      toast.error('Please select an employee')
      return
    }
    
    if (!formData.period) {
      toast.error('Please enter rating period')
      return
    }

    const ratingValues = Object.values(formData.ratings).filter(val => val > 0)
    if (ratingValues.length === 0) {
      toast.error('Please provide at least one rating')
      return
    }

    setLoading(true)
    
    try {
      const overallRating = calculateOverallRating()
      
      const response = await fetch('/api/performance/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          overallRating: parseFloat(overallRating)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Employee rating created successfully')
        router.push('/dashboard/performance/ratings')
      } else {
        toast.error(data.message || 'Failed to create rating')
      }
    } catch (error) {
      console.error('Create rating error:', error)
      toast.error('Failed to create rating')
    } finally {
      setLoading(false)
    }
  }

  const ratingCategories = [
    { key: 'technical', label: 'Technical Skills', description: 'Job-specific technical competencies' },
    { key: 'communication', label: 'Communication', description: 'Verbal and written communication skills' },
    { key: 'teamwork', label: 'Teamwork', description: 'Collaboration and team participation' },
    { key: 'leadership', label: 'Leadership', description: 'Leadership and mentoring abilities' },
    { key: 'problemSolving', label: 'Problem Solving', description: 'Analytical and problem-solving skills' },
    { key: 'reliability', label: 'Reliability', description: 'Dependability and consistency' },
    { key: 'initiative', label: 'Initiative', description: 'Proactiveness and self-motivation' },
    { key: 'quality', label: 'Quality of Work', description: 'Attention to detail and work quality' }
  ]

  const RatingStars = ({ rating, onRatingChange, category }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(category, star)}
            className={`w-8 h-8 text-2xl ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 w-12">
          {rating > 0 ? `${rating}/5` : 'Not rated'}
        </span>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold text-gray-800">Create Employee Rating</h1>
            <p className="text-gray-600 mt-1">Rate an employee&apos;s performance</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Rating Period *
              </label>
              <input
                type="text"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                placeholder="e.g., Q4 2024, Annual 2024"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating Date
              </label>
              <input
                type="date"
                name="ratingDate"
                value={formData.ratingDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Performance Ratings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Ratings</h2>
          <div className="space-y-6">
            {ratingCategories.map((category) => (
              <div key={category.key} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-800">{category.label}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <RatingStars
                      rating={formData.ratings[category.key]}
                      onRatingChange={handleRatingChange}
                      category={category.key}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Overall Rating Display */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Overall Rating</h3>
                <p className="text-sm text-gray-600">Calculated automatically from individual ratings</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-primary-600">
                  {calculateOverallRating()}
                </span>
                <span className="text-lg text-gray-500">/5.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Comments</h2>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            placeholder="Provide detailed feedback about the employee's performance..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Status</h2>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending Review</option>
          </select>
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
            <span>{loading ? 'Creating...' : 'Create Rating'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
