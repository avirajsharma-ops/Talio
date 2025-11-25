'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaEdit, FaTrash, FaStar, FaCalendar, FaUser } from 'react-icons/fa'

export default function PerformanceReviewDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isEmployeeReview, setIsEmployeeReview] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Check if this is an employee review (from reviews array) or performance review
    const employeeId = searchParams.get('employeeId')
    if (employeeId) {
      setIsEmployeeReview(true)
      fetchEmployeeReview(employeeId)
    } else {
      fetchPerformanceReview()
    }
  }, [params.id, searchParams])

  const fetchEmployeeReview = async (employeeId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/employees/${employeeId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        // Find the specific review by ID
        const specificReview = data.data.find(r => r._id === params.id)
        if (specificReview) {
          setReview(specificReview)
        } else {
          toast.error('Review not found')
        }
      } else {
        toast.error(data.message || 'Failed to fetch review details')
      }
    } catch (error) {
      console.error('Fetch employee review error:', error)
      toast.error('Failed to fetch review details')
    } finally {
      setLoading(false)
    }
  }

  const fetchPerformanceReview = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/performance/reviews/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setReview(data.data)
      } else {
        toast.error(data.message || 'Failed to fetch review details')
      }
    } catch (error) {
      console.error('Fetch review error:', error)
      toast.error('Failed to fetch review details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this review?')) return

    try {
      const token = localStorage.getItem('token')

      let response
      if (isEmployeeReview) {
        const employeeId = searchParams.get('employeeId')
        response = await fetch(`/api/employees/${employeeId}/reviews?reviewId=${params.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } else {
        response = await fetch(`/api/performance/reviews/${params.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }

      const data = await response.json()

      if (data.success) {
        toast.success('Review deleted successfully')
        router.push('/dashboard/performance/reviews')
      } else {
        toast.error(data.message || 'Failed to delete review')
      }
    } catch (error) {
      console.error('Delete review error:', error)
      toast.error('Failed to delete review')
    }
  }

  const canManageReviews = () => {
    return user && ['admin', 'hr', 'manager'].includes(user.role)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGoalStatusColor = (status) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'not-started': return 'bg-gray-100 text-gray-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRatingStars = (rating) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
        />
      )
    }
    return stars
  }

  const ratingCategories = [
    { key: 'communication', label: 'Communication' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'problemSolving', label: 'Problem Solving' },
    { key: 'technicalSkills', label: 'Technical Skills' },
    { key: 'productivity', label: 'Productivity' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="p-3 sm:p-6 pb-20 sm:pb-6">
        <div className="text-center bg-white rounded-xl shadow-md p-8 sm:p-12 border border-gray-100">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <FaStar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">Review Not Found</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">The performance review you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/dashboard/performance/reviews')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base font-medium"
          >
            Back to Reviews
          </button>
        </div>
      </div>
    )
  }

  // Render employee review (simple review/remark)
  if (isEmployeeReview) {
    const getTypeColor = (type) => {
      switch (type) {
        case 'review': return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'remark': return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'feedback': return 'bg-green-100 text-green-800 border-green-200'
        case 'warning': return 'bg-red-100 text-red-800 border-red-200'
        case 'appreciation': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    const getCategoryColor = (category) => {
      switch (category) {
        case 'performance': return 'bg-indigo-100 text-indigo-800'
        case 'behavior': return 'bg-pink-100 text-pink-800'
        case 'skills': return 'bg-teal-100 text-teal-800'
        case 'general': return 'bg-gray-100 text-gray-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    return (
      <div className="p-3 sm:p-6 pb-20 sm:pb-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <FaArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 break-words">Review Details</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                {review.type?.charAt(0).toUpperCase() + review.type?.slice(1)} - {review.category}
              </p>
            </div>
          </div>
          {canManageReviews() && (
            <div className="flex space-x-2 sm:space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium">Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Review Content */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
          {/* Type and Category Badges */}
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <span className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border ${getTypeColor(review.type)}`}>
              {review.type?.charAt(0).toUpperCase() + review.type?.slice(1)}
            </span>
            <span className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg ${getCategoryColor(review.category)}`}>
              {review.category?.charAt(0).toUpperCase() + review.category?.slice(1)}
            </span>
            {review.rating && (
              <div className="flex items-center space-x-1 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <div className="flex scale-90 sm:scale-100">{getRatingStars(review.rating)}</div>
                <span className="text-xs sm:text-sm font-bold text-amber-700 ml-1">{review.rating}/5</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-2">Content</h3>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{review.content}</p>
            </div>
          </div>

          {/* Reviewer Info */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md flex-shrink-0">
                  {review.reviewedBy?.firstName?.charAt(0)}{review.reviewedBy?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Reviewed By</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                    {review.reviewedBy?.firstName} {review.reviewedBy?.lastName}
                  </p>
                  {review.reviewedBy?.designation && (
                    <p className="text-xs text-gray-500 truncate">{review.reviewedBy?.designation}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-gray-500 text-xs sm:text-sm">
                <FaCalendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render performance review (complex review)
  return (
    <div className="p-3 sm:p-6 pb-20 sm:pb-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <FaArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 break-words">Performance Review Details</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
              {review.employee?.firstName} {review.employee?.lastName} - {review.reviewPeriod}
            </p>
          </div>
        </div>
        {canManageReviews() && (
          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => router.push(`/dashboard/performance/reviews/edit/${review._id}`)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              <FaEdit className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium">Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium">Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Employee Info */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-2xl shadow-md">
                  {review.employee?.firstName?.charAt(0)}{review.employee?.lastName?.charAt(0)}
                </div>
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 break-words">
                  {review.employee?.firstName} {review.employee?.lastName}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{review.employee?.employeeCode}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{review.employee?.position || 'N/A'}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{review.employee?.department?.name || review.employee?.department || 'N/A'}</p>
              </div>
              <div className="flex flex-col items-center sm:items-end gap-2 sm:gap-3">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 rounded-lg border border-amber-200">
                  <div className="flex scale-90 sm:scale-100">{getRatingStars(Math.round(review.overallRating))}</div>
                  <span className="text-base sm:text-xl font-bold text-amber-700">{review.overallRating}</span>
                </div>
                <span className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg ${getStatusColor(review.status)} shadow-sm whitespace-nowrap`}>
                  {review.status}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Review Summary</h3>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{review.summary || 'No summary provided'}</p>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Detailed Ratings</h3>
            <div className="space-y-3 sm:space-y-4">
              {ratingCategories.map((category) => (
                <div key={category.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-sm sm:text-base text-gray-700 font-semibold">{category.label}</span>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex scale-90 sm:scale-100">{getRatingStars(review.ratings?.[category.key] || 0)}</div>
                    <span className="text-sm sm:text-base text-gray-600 font-medium min-w-[3rem]">{review.ratings?.[category.key] || 0}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Areas of Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md p-4 sm:p-6 border border-green-200">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-green-800">Strengths</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {review.strengths && review.strengths.length > 0 ? (
                  review.strengths.map((strength, index) => (
                    <span key={index} className="px-2.5 py-1 bg-white text-green-700 text-xs sm:text-sm font-medium rounded-md border border-green-200 shadow-sm">
                      {strength}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-green-700">No strengths listed</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl shadow-md p-4 sm:p-6 border border-amber-200">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-amber-800">Areas of Improvement</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {review.areasOfImprovement && review.areasOfImprovement.length > 0 ? (
                  review.areasOfImprovement.map((area, index) => (
                    <span key={index} className="px-2.5 py-1 bg-white text-amber-700 text-xs sm:text-sm font-medium rounded-md border border-amber-200 shadow-sm">
                      {area}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-amber-700">No areas of improvement listed</p>
                )}
              </div>
            </div>
          </div>

          {/* Goals */}
          {review.goals && review.goals.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Goals & Objectives</h3>
              <div className="space-y-3 sm:space-y-4">
                {review.goals.map((goal, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-800 break-words flex-1">{goal.title}</h4>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${getGoalStatusColor(goal.status)} whitespace-nowrap self-start`}>
                        {goal.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-2 leading-relaxed">{goal.description}</p>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <FaCalendar className="w-3 h-3" />
                      <span>Due: {new Date(goal.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {review.comments && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Additional Comments</h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{review.comments}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Review Info */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Review Information</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start space-x-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <FaCalendar className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Review Date</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                    {new Date(review.reviewDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <FaUser className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Reviewed By</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                    {review.reviewer?.firstName} {review.reviewer?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{review.reviewer?.position || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Review Period</p>
                <p className="text-sm sm:text-base font-semibold text-gray-800">{review.reviewPeriod}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl shadow-md p-4 sm:p-6 border border-primary-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Overall Rating</span>
                <span className="text-base sm:text-lg font-bold text-primary-600">{review.overallRating}/5</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Strengths</span>
                <span className="text-base sm:text-lg font-semibold text-green-600">{review.strengths?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Improvement Areas</span>
                <span className="text-base sm:text-lg font-semibold text-amber-600">{review.areasOfImprovement?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Goals Set</span>
                <span className="text-base sm:text-lg font-semibold text-blue-600">{review.goals?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
