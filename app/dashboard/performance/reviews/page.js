'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaPlus, FaEye, FaEdit, FaTrash, FaStar, FaSearch, FaFilter } from 'react-icons/fa'

export default function PerformanceReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchReviews()
    }
  }, [])

  const fetchReviews = async () => {
    try {
      // Mock data for now
      const mockReviews = [
        {
          _id: '1',
          employee: { firstName: 'John', lastName: 'Doe', employeeCode: 'EMP001' },
          reviewer: { firstName: 'Jane', lastName: 'Smith' },
          reviewPeriod: 'Q4 2024',
          overallRating: 4.2,
          status: 'completed',
          reviewDate: '2024-12-15',
          summary: 'Excellent performance with strong leadership skills and consistent delivery.',
          strengths: ['Leadership', 'Problem Solving', 'Communication'],
          areasOfImprovement: ['Time Management', 'Delegation']
        },
        {
          _id: '2',
          employee: { firstName: 'Alice', lastName: 'Johnson', employeeCode: 'EMP002' },
          reviewer: { firstName: 'Bob', lastName: 'Wilson' },
          reviewPeriod: 'Q4 2024',
          overallRating: 3.8,
          status: 'pending',
          reviewDate: '2024-12-20',
          summary: 'Good performance with room for improvement in technical skills.',
          strengths: ['Teamwork', 'Reliability'],
          areasOfImprovement: ['Technical Skills', 'Initiative']
        }
      ]
      
      setReviews(mockReviews)
    } catch (error) {
      console.error('Fetch reviews error:', error)
      toast.error('Failed to fetch performance reviews')
    } finally {
      setLoading(false)
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

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = searchTerm === '' || 
      `${review.employee.firstName} ${review.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || review.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Performance Reviews</h1>
          <p className="text-gray-600 mt-1">Manage employee performance reviews</p>
        </div>
        {canManageReviews() && (
          <button
            onClick={() => router.push('/dashboard/performance/reviews/create')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>New Review</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaStar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-500">
            {canManageReviews() ? 'Create your first performance review to get started.' : 'No performance reviews have been created yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {review.employee.firstName.charAt(0)}{review.employee.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {review.employee.firstName} {review.employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{review.employee.employeeCode}</p>
                    <p className="text-sm text-gray-600">{review.reviewPeriod}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex">{getRatingStars(Math.round(review.overallRating))}</div>
                    <span className="text-sm font-medium text-gray-700">{review.overallRating}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(review.status)}`}>
                    {review.status}
                  </span>
                  {canManageReviews() && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/performance/reviews/${review._id}`)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Review"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/performance/reviews/edit/${review._id}`)}
                        className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Edit Review"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(review._id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Review"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 line-clamp-2">{review.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {review.strengths && review.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Strengths:</h4>
                    <div className="flex flex-wrap gap-2">
                      {review.strengths.slice(0, 3).map((strength, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {strength}
                        </span>
                      ))}
                      {review.strengths.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{review.strengths.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {review.areasOfImprovement && review.areasOfImprovement.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Areas of Improvement:</h4>
                    <div className="flex flex-wrap gap-2">
                      {review.areasOfImprovement.slice(0, 3).map((area, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          {area}
                        </span>
                      ))}
                      {review.areasOfImprovement.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{review.areasOfImprovement.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Reviewed by: {review.reviewer.firstName} {review.reviewer.lastName}</span>
                <span>Date: {new Date(review.reviewDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
