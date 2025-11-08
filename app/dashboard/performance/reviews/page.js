'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaPlus, FaEye, FaEdit, FaTrash, FaStar, FaSearch, FaFilter } from 'react-icons/fa'

export default function PerformanceReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [teamReviews, setTeamReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useState('all') // 'all', 'formal', 'team'

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchReviews()
      fetchTeamReviews()
    }
  }, [])

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/performance/reviews', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setReviews(data.data || [])
      } else {
        toast.error(data.message || 'Failed to fetch reviews')
      }
    } catch (error) {
      console.error('Fetch reviews error:', error)
      toast.error('Failed to fetch performance reviews')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamReviews = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = JSON.parse(localStorage.getItem('user'))

      // Handle both string ID and object with _id
      const empId = typeof userData.employeeId === 'object'
        ? userData.employeeId._id || userData.employeeId
        : userData.employeeId

      // Fetch employee's reviews/remarks
      const response = await fetch(`/api/employees/${empId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Handle both string ID and object with _id
        const empId = typeof userData.employeeId === 'object'
          ? userData.employeeId._id || userData.employeeId
          : userData.employeeId

        // Transform team reviews to match review format
        const transformedReviews = (data.data || []).map(review => ({
          _id: review._id,
          type: 'team_review',
          reviewType: review.type,
          employee: {
            _id: empId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            employeeCode: userData.employeeCode
          },
          reviewer: review.reviewedBy,
          overallRating: review.rating,
          content: review.content,
          category: review.category,
          status: 'completed',
          createdAt: review.createdAt
        }))
        setTeamReviews(transformedReviews)
      }
    } catch (error) {
      console.error('Fetch team reviews error:', error)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return

    try {
      // Mock delete
      setReviews(reviews.filter(r => r._id !== reviewId))
      toast.success('Review deleted successfully')
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

  // Combine formal reviews and team reviews based on view mode
  const allReviews = viewMode === 'formal' ? reviews :
                     viewMode === 'team' ? teamReviews :
                     [...reviews, ...teamReviews]

  const filteredReviews = allReviews.filter(review => {
    const matchesSearch = searchTerm === '' ||
      `${review.employee?.firstName || ''} ${review.employee?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.employee?.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' || review.status === filterStatus

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex md:justify-between md:items-center md:flex-row flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Performance Reviews</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage employee performance reviews</p>
        </div>
        {canManageReviews() && (
          <button
            onClick={() => router.push('/dashboard/performance/reviews/create')}
            className="w-full md:w-auto px-4 py-2 text-sm sm:text-base bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center space-x-2"
          >
            <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>New Review</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-center sm:justify-start overflow-x-auto">
            <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('all')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'all' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({allReviews.length})
              </button>
              <button
                onClick={() => setViewMode('formal')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'formal' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Formal ({reviews.length})
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'team' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team ({teamReviews.length})
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400 w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
            {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
          <FaStar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
          <p className="text-sm sm:text-base text-gray-500">
            {canManageReviews() ? 'Create your first performance review to get started.' : 'No performance reviews have been created yet.'}
          </p>
        </div>
      ) :(
        <div className="space-y-3 sm:space-y-4">
          {filteredReviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-[88px] md:h-[88px] bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base md:text-lg flex-shrink-0">
                    {review.employee.firstName.charAt(0)}{review.employee.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 break-words">
                        {review.employee?.firstName} {review.employee?.lastName}
                      </h3>
                      {review.type === 'team_review' && (
                        <span className="px-2 py-0.5 sm:py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium whitespace-nowrap">
                          Team Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{review.employee?.employeeCode}</p>
                    {review.reviewPeriod && <p className="text-xs sm:text-sm text-gray-600 truncate">{review.reviewPeriod}</p>}
                    {review.type === 'team_review' && (
                      <p className="text-xs sm:text-sm text-gray-600 break-words">
                        Type: {review.reviewType} | Category: {review.category}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <div className="flex scale-75 sm:scale-90 md:scale-100 origin-left">{getRatingStars(Math.round(review.overallRating))}</div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{review.overallRating}</span>
                  </div>
                  <span className={`px-2 py-0.5 sm:py-1 text-xs rounded-full ${getStatusColor(review.status)} whitespace-nowrap`}>
                    {review.status}
                  </span>
                  {canManageReviews() && (
                    <div className="flex space-x-1 sm:space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/performance/reviews/${review._id}`)}
                        className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Review"
                      >
                        <FaEye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/performance/reviews/edit/${review._id}`)}
                        className="text-green-600 hover:text-green-800 p-1.5 sm:p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Edit Review"
                      >
                        <FaEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(review._id)}
                        className="text-red-600 hover:text-red-800 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Review"
                      >
                        <FaTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3 sm:mb-4">
                <p className="text-sm sm:text-base text-gray-700 line-clamp-2 break-words">{review.summary || review.content || 'No summary provided'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {review.strengths && review.strengths.length > 0 && (
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Strengths:</h4>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {review.strengths.slice(0, 3).map((strength, index) => (
                        <span key={index} className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-xs rounded-full break-words">
                          {strength}
                        </span>
                      ))}
                      {review.strengths.length > 3 && (
                        <span className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">
                          +{review.strengths.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {review.areasOfImprovement && review.areasOfImprovement.length > 0 && (
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Areas of Improvement:</h4>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {review.areasOfImprovement.slice(0, 3).map((area, index) => (
                        <span key={index} className="px-2 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full break-words">
                          {area}
                        </span>
                      ))}
                      {review.areasOfImprovement.length > 3 && (
                        <span className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">
                          +{review.areasOfImprovement.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 pt-3 sm:pt-0 border-t sm:border-t-0">
                <span className="truncate">Reviewed by: {review.reviewer.firstName} {review.reviewer.lastName}</span>
                <span className="whitespace-nowrap">Date: {new Date(review.reviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
