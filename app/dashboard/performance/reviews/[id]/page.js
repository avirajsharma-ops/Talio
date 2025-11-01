'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaEdit, FaTrash, FaStar, FaCalendar, FaUser } from 'react-icons/fa'

export default function PerformanceReviewDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchReview()
  }, [params.id])

  const fetchReview = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockReview = {
        _id: params.id,
        employee: { 
          _id: 'emp1',
          firstName: 'John', 
          lastName: 'Doe', 
          employeeCode: 'EMP001',
          department: 'Engineering',
          position: 'Senior Developer'
        },
        reviewer: { 
          _id: 'rev1',
          firstName: 'Jane', 
          lastName: 'Smith',
          position: 'Engineering Manager'
        },
        reviewPeriod: 'Q4 2024',
        overallRating: 4.2,
        status: 'completed',
        reviewDate: '2024-12-15T00:00:00.000Z',
        summary: 'John has demonstrated excellent performance throughout Q4 2024. His technical skills and leadership abilities have been instrumental in delivering key projects on time. He consistently goes above and beyond expectations and serves as a mentor to junior team members.',
        strengths: ['Leadership', 'Problem Solving', 'Communication', 'Technical Excellence', 'Mentoring'],
        areasOfImprovement: ['Time Management', 'Delegation', 'Strategic Planning'],
        goals: [
          { 
            title: 'Improve team collaboration', 
            description: 'Lead cross-functional initiatives to improve team communication',
            status: 'achieved',
            dueDate: '2024-12-31'
          },
          { 
            title: 'Complete AWS certification', 
            description: 'Obtain AWS Solutions Architect certification',
            status: 'in-progress',
            dueDate: '2025-03-31'
          }
        ],
        ratings: {
          communication: 4,
          teamwork: 5,
          leadership: 4,
          problemSolving: 5,
          technicalSkills: 5,
          productivity: 4
        },
        comments: 'John is a valuable asset to the team and shows great potential for advancement to a senior leadership role.',
        createdAt: '2024-12-15T00:00:00.000Z',
        updatedAt: '2024-12-15T00:00:00.000Z'
      }
      
      setReview(mockReview)
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
      // Mock delete - replace with actual API call
      toast.success('Review deleted successfully')
      router.push('/dashboard/performance/reviews')
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Review Not Found</h1>
          <p className="text-gray-600 mb-4">The performance review you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/dashboard/performance/reviews')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back to Reviews
          </button>
        </div>
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
            <h1 className="text-3xl font-bold text-gray-800">Performance Review Details</h1>
            <p className="text-gray-600 mt-1">
              {review.employee.firstName} {review.employee.lastName} - {review.reviewPeriod}
            </p>
          </div>
        </div>
        {canManageReviews() && (
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/dashboard/performance/reviews/edit/${review._id}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <FaEdit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <FaTrash className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                {review.employee.firstName.charAt(0)}{review.employee.lastName.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  {review.employee.firstName} {review.employee.lastName}
                </h2>
                <p className="text-gray-600">{review.employee.employeeCode}</p>
                <p className="text-gray-600">{review.employee.position}</p>
                <p className="text-gray-600">{review.employee.department}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex">{getRatingStars(Math.round(review.overallRating))}</div>
                  <span className="text-xl font-bold text-gray-800">{review.overallRating}</span>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(review.status)}`}>
                  {review.status}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Review Summary</h3>
            <p className="text-gray-700 leading-relaxed">{review.summary}</p>
          </div>

          {/* Detailed Ratings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Detailed Ratings</h3>
            <div className="space-y-4">
              {ratingCategories.map((category) => (
                <div key={category.key} className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">{category.label}</span>
                  <div className="flex items-center space-x-3">
                    <div className="flex">{getRatingStars(review.ratings[category.key])}</div>
                    <span className="text-gray-600 w-8">{review.ratings[category.key]}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Areas of Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Strengths</h3>
              <div className="space-y-2">
                {review.strengths.map((strength, index) => (
                  <span key={index} className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full mr-2 mb-2">
                    {strength}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Areas of Improvement</h3>
              <div className="space-y-2">
                {review.areasOfImprovement.map((area, index) => (
                  <span key={index} className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full mr-2 mb-2">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Goals & Objectives</h3>
            <div className="space-y-4">
              {review.goals.map((goal, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{goal.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getGoalStatusColor(goal.status)}`}>
                      {goal.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{goal.description}</p>
                  <p className="text-gray-500 text-xs">Due: {new Date(goal.dueDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          {review.comments && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Additional Comments</h3>
              <p className="text-gray-700 leading-relaxed">{review.comments}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Review Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FaCalendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Review Date</p>
                  <p className="font-medium">{new Date(review.reviewDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaUser className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Reviewed By</p>
                  <p className="font-medium">{review.reviewer.firstName} {review.reviewer.lastName}</p>
                  <p className="text-sm text-gray-500">{review.reviewer.position}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Review Period</p>
                <p className="font-medium">{review.reviewPeriod}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Rating</span>
                <span className="font-bold text-primary-600">{review.overallRating}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Strengths</span>
                <span className="font-medium">{review.strengths.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Improvement Areas</span>
                <span className="font-medium">{review.areasOfImprovement.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goals Set</span>
                <span className="font-medium">{review.goals.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
