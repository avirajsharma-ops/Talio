'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaSave, FaTimes, FaPlus } from 'react-icons/fa'

export default function CreatePerformanceReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState({
    employeeId: '',
    reviewPeriod: '',
    reviewDate: new Date().toISOString().split('T')[0],
    overallRating: 0,
    summary: '',
    strengths: [''],
    areasOfImprovement: [''],
    goals: [{ title: '', description: '', dueDate: '' }],
    comments: '',
    status: 'draft',
    ratings: {
      communication: 0,
      teamwork: 0,
      leadership: 0,
      problemSolving: 0,
      technicalSkills: 0,
      productivity: 0
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
    
    // Calculate overall rating
    const newRatings = { ...formData.ratings, [category]: rating }
    const ratingValues = Object.values(newRatings).filter(val => val > 0)
    const overallRating = ratingValues.length > 0
      ? ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length
      : 0
    
    setFormData(prev => ({
      ...prev,
      overallRating: parseFloat(overallRating.toFixed(1))
    }))
  }

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], field === 'goals' ? { title: '', description: '', dueDate: '' } : '']
    }))
  }

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const handleGoalChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.map((goal, i) => 
        i === index ? { ...goal, [field]: value } : goal
      )
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.employeeId) {
      toast.error('Please select an employee')
      return
    }
    
    if (!formData.reviewPeriod) {
      toast.error('Please enter review period')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/performance/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          strengths: formData.strengths.filter(s => s.trim()),
          areasOfImprovement: formData.areasOfImprovement.filter(a => a.trim()),
          goals: formData.goals.filter(g => g.title.trim())
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Performance review created successfully')
        router.push('/dashboard/performance/reviews')
      } else {
        toast.error(data.message || 'Failed to create performance review')
      }
    } catch (error) {
      console.error('Create review error:', error)
      toast.error('Failed to create performance review')
    } finally {
      setLoading(false)
    }
  }

  const ratingCategories = [
    { key: 'communication', label: 'Communication' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'problemSolving', label: 'Problem Solving' },
    { key: 'technicalSkills', label: 'Technical Skills' },
    { key: 'productivity', label: 'Productivity' }
  ]

  const RatingStars = ({ rating, onRatingChange }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`w-6 h-6 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
          >
            ★
          </button>
        ))}
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
            <h1 className="text-3xl font-bold text-gray-800">Create Performance Review</h1>
            <p className="text-gray-600 mt-1">Create a new performance review for an employee</p>
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
                Review Period *
              </label>
              <input
                type="text"
                name="reviewPeriod"
                value={formData.reviewPeriod}
                onChange={handleInputChange}
                placeholder="e.g., Q4 2024, Annual 2024"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Date
              </label>
              <input
                type="date"
                name="reviewDate"
                value={formData.reviewDate}
                onChange={handleInputChange}
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
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Ratings</h2>
          <div className="space-y-4">
            {ratingCategories.map((category) => (
              <div key={category.key} className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {category.label}
                </label>
                <div className="flex items-center space-x-3">
                  <RatingStars
                    rating={formData.ratings[category.key]}
                    onRatingChange={(rating) => handleRatingChange(category.key, rating)}
                  />
                  <span className="text-sm text-gray-600 w-8">
                    {formData.ratings[category.key] || 0}/5
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-gray-800">
                  Overall Rating
                </label>
                <span className="text-lg font-bold text-primary-600">
                  {formData.overallRating}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Review Summary</h2>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            placeholder="Provide an overall summary of the employee's performance..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
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
            <span>{loading ? 'Creating...' : 'Create Review'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
