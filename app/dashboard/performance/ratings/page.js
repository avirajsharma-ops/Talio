'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaPlus, FaEye, FaEdit, FaTrash, FaStar, FaSearch, FaFilter, FaUser } from 'react-icons/fa'

export default function EmployeeRatingsPage() {
  const router = useRouter()
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchRatings()
    }
  }, [])

  const fetchRatings = async () => {
    try {
      // Mock data for now
      const mockRatings = [
        {
          _id: '1',
          employee: { firstName: 'John', lastName: 'Doe', employeeCode: 'EMP001', department: 'Engineering' },
          rater: { firstName: 'Jane', lastName: 'Smith', position: 'Engineering Manager' },
          period: 'Q4 2024',
          overallRating: 4.5,
          ratings: {
            technical: 5,
            communication: 4,
            teamwork: 5,
            leadership: 4,
            problemSolving: 5,
            reliability: 4
          },
          comments: 'Excellent performance with strong technical skills and leadership potential.',
          ratingDate: '2024-12-15',
          status: 'completed'
        },
        {
          _id: '2',
          employee: { firstName: 'Alice', lastName: 'Johnson', employeeCode: 'EMP002', department: 'Marketing' },
          rater: { firstName: 'Bob', lastName: 'Wilson', position: 'Marketing Director' },
          period: 'Q4 2024',
          overallRating: 3.8,
          ratings: {
            creativity: 4,
            communication: 4,
            teamwork: 3,
            initiative: 4,
            results: 4,
            reliability: 4
          },
          comments: 'Good performance with room for improvement in team collaboration.',
          ratingDate: '2024-12-10',
          status: 'completed'
        },
        {
          _id: '3',
          employee: { firstName: 'Mike', lastName: 'Brown', employeeCode: 'EMP003', department: 'Sales' },
          rater: { firstName: 'Sarah', lastName: 'Davis', position: 'Sales Manager' },
          period: 'Q4 2024',
          overallRating: 4.2,
          ratings: {
            salesSkills: 5,
            communication: 4,
            customerService: 4,
            teamwork: 4,
            initiative: 4,
            reliability: 4
          },
          comments: 'Strong sales performance and excellent customer relationships.',
          ratingDate: '2024-12-12',
          status: 'completed'
        }
      ]
      
      setRatings(mockRatings)
    } catch (error) {
      console.error('Fetch ratings error:', error)
      toast.error('Failed to fetch employee ratings')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (ratingId) => {
    if (!confirm('Are you sure you want to delete this rating?')) return

    try {
      // Mock delete
      setRatings(ratings.filter(r => r._id !== ratingId))
      toast.success('Rating deleted successfully')
    } catch (error) {
      console.error('Delete rating error:', error)
      toast.error('Failed to delete rating')
    }
  }

  const canManageRatings = () => {
    return user && ['admin', 'hr', 'manager'].includes(user.role)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
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

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 3.5) return 'text-blue-600'
    if (rating >= 2.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredRatings = ratings.filter(rating => {
    const matchesSearch = searchTerm === '' || 
      `${rating.employee.firstName} ${rating.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.employee.department.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterPeriod === 'all' || rating.period === filterPeriod
    
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
          <h1 className="text-3xl font-bold text-gray-800">Employee Ratings</h1>
          <p className="text-gray-600 mt-1">Manage employee performance ratings</p>
        </div>
        {canManageRatings() && (
          <button
            onClick={() => router.push('/dashboard/performance/ratings/create')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>New Rating</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { 
            title: 'Total Ratings', 
            value: ratings.length, 
            color: 'bg-blue-500',
            icon: FaUser
          },
          { 
            title: 'Average Rating', 
            value: ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length).toFixed(1) : '0.0', 
            color: 'bg-green-500',
            icon: FaStar
          },
          { 
            title: 'High Performers', 
            value: ratings.filter(r => r.overallRating >= 4.5).length, 
            color: 'bg-yellow-500',
            icon: FaStar
          },
          { 
            title: 'This Quarter', 
            value: ratings.filter(r => r.period === 'Q4 2024').length, 
            color: 'bg-purple-500',
            icon: FaUser
          },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-4 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
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
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Periods</option>
                <option value="Q4 2024">Q4 2024</option>
                <option value="Q3 2024">Q3 2024</option>
                <option value="Q2 2024">Q2 2024</option>
                <option value="Q1 2024">Q1 2024</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredRatings.length} rating{filteredRatings.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Ratings List */}
      {filteredRatings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaStar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ratings found</h3>
          <p className="text-gray-500">
            {canManageRatings() ? 'Create your first employee rating to get started.' : 'No employee ratings have been created yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRatings.map((rating) => (
            <div key={rating._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {rating.employee.firstName.charAt(0)}{rating.employee.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {rating.employee.firstName} {rating.employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{rating.employee.employeeCode}</p>
                    <p className="text-sm text-gray-600">{rating.employee.department}</p>
                    <p className="text-sm text-gray-600">{rating.period}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="flex">{getRatingStars(Math.round(rating.overallRating))}</div>
                      <span className={`text-lg font-bold ${getRatingColor(rating.overallRating)}`}>
                        {rating.overallRating}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(rating.status)}`}>
                      {rating.status}
                    </span>
                  </div>
                  {canManageRatings() && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/performance/ratings/${rating._id}`)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Rating"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/performance/ratings/edit/${rating._id}`)}
                        className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Edit Rating"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rating._id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Rating"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 line-clamp-2">{rating.comments}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                {Object.entries(rating.ratings).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <p className="text-xs text-gray-500 capitalize mb-1">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <div className="flex justify-center mb-1">
                      {getRatingStars(score)}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{score}/5</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-gray-100">
                <span>Rated by: {rating.rater.firstName} {rating.rater.lastName} ({rating.rater.position})</span>
                <span>Date: {new Date(rating.ratingDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
