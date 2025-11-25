'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa'

export default function EditPerformanceReviewPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState({
    employeeId: '',
    reviewPeriod: '',
    reviewDate: '',
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
    fetchReview()
  }, [params.id])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      const data = await response.json()
      if (data.success) {
        setEmployees(data.data)
      }
    } catch (error) {
      console.error('Fetch employees error:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const fetchReview = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/performance/reviews/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        const review = data.data
        setFormData({
          employeeId: review.employee?._id || '',
          reviewPeriod: review.reviewPeriod || '',
          reviewDate: review.reviewDate ? new Date(review.reviewDate).toISOString().split('T')[0] : '',
          overallRating: review.overallRating || 0,
          summary: review.summary || '',
          strengths: review.strengths && review.strengths.length > 0 ? review.strengths : [''],
          areasOfImprovement: review.areasOfImprovement && review.areasOfImprovement.length > 0 ? review.areasOfImprovement : [''],
          goals: review.goals && review.goals.length > 0 ? review.goals : [{ title: '', description: '', dueDate: '' }],
          comments: review.comments || '',
          status: review.status || 'draft',
          ratings: review.ratings || {
            communication: 0,
            teamwork: 0,
            leadership: 0,
            problemSolving: 0,
            technicalSkills: 0,
            productivity: 0
          }
        })
      } else {
        toast.error(data.message || 'Failed to fetch review details')
      }
    } catch (error) {
      console.error('Fetch review error:', error)
      toast.error('Failed to fetch review details')
    } finally {
      setInitialLoading(false)
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
      const response = await fetch(`/api/performance/reviews/${params.id}`, {
        method: 'PUT',
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
        toast.success('Performance review updated successfully')
        router.push(`/dashboard/performance/reviews/${params.id}`)
      } else {
        toast.error(data.message || 'Failed to update performance review')
      }
    } catch (error) {
      console.error('Update review error:', error)
      toast.error('Failed to update performance review')
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 pb-20 sm:pb-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <FaArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <FaEdit className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 break-words">Edit Performance Review</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Update performance review details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Employee *
              </label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 hover:bg-white"
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
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Review Period *
              </label>
              <input
                type="text"
                name="reviewPeriod"
                value={formData.reviewPeriod}
                onChange={handleInputChange}
                placeholder="e.g., Q4 2024, Annual 2024"
                required
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Review Date
              </label>
              <input
                type="date"
                name="reviewDate"
                value={formData.reviewDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 hover:bg-white"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Performance Ratings</h2>
          <div className="space-y-3 sm:space-y-4">
            {ratingCategories.map((category) => (
              <div key={category.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <label className="text-sm sm:text-base font-semibold text-gray-700">
                  {category.label}
                </label>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <RatingStars
                    rating={formData.ratings[category.key]}
                    onRatingChange={(rating) => handleRatingChange(category.key, rating)}
                  />
                  <span className="text-sm sm:text-base text-gray-600 font-medium min-w-[3rem]">
                    {formData.ratings[category.key] || 0}/5
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-3 sm:p-4 border border-primary-200">
                <label className="text-base sm:text-lg font-bold text-gray-800">
                  Overall Rating
                </label>
                <span className="text-lg sm:text-xl font-bold text-primary-600">
                  {formData.overallRating}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Review Summary</h2>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            placeholder="Provide an overall summary of the employee's performance..."
            rows={4}
            className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
          />
        </div>

        {/* Strengths */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md p-4 sm:p-6 border border-green-200">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-green-800">Strengths</h2>
          </div>
          <div className="space-y-2">
            {formData.strengths.map((strength, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={strength}
                  onChange={(e) => handleArrayChange('strengths', index, e.target.value)}
                  placeholder={`Strength ${index + 1}`}
                  className="flex-1 px-3 py-2 text-sm sm:text-base border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('strengths', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex-shrink-0"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('strengths')}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base font-medium"
            >
              + Add Strength
            </button>
          </div>
        </div>

        {/* Areas of Improvement */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl shadow-md p-4 sm:p-6 border border-amber-200">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-amber-800">Areas of Improvement</h2>
          </div>
          <div className="space-y-2">
            {formData.areasOfImprovement.map((area, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={area}
                  onChange={(e) => handleArrayChange('areasOfImprovement', index, e.target.value)}
                  placeholder={`Area ${index + 1}`}
                  className="flex-1 px-3 py-2 text-sm sm:text-base border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('areasOfImprovement', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex-shrink-0"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('areasOfImprovement')}
              className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm sm:text-base font-medium"
            >
              + Add Area of Improvement
            </button>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Goals & Objectives</h2>
          <div className="space-y-3 sm:space-y-4">
            {formData.goals.map((goal, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-700">Goal {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('goals', index)}
                    className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => handleGoalChange(index, 'title', e.target.value)}
                    placeholder="Goal title"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  />
                  <textarea
                    value={goal.description}
                    onChange={(e) => handleGoalChange(index, 'description', e.target.value)}
                    placeholder="Goal description"
                    rows={2}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white resize-none"
                  />
                  <input
                    type="date"
                    value={goal.dueDate}
                    onChange={(e) => handleGoalChange(index, 'dueDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('goals')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium"
            >
              + Add Goal
            </button>
          </div>
        </div>

        {/* Additional Comments */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Additional Comments</h2>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            placeholder="Any additional comments or notes..."
            rows={3}
            className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 lg:gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2 font-medium text-sm sm:text-base"
          >
            <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
          >
            <FaSave className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{loading ? 'Updating...' : 'Update Review'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
