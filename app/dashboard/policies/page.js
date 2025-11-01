'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaFileAlt, FaEdit, FaTrash } from 'react-icons/fa'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    effectiveDate: '',
  })

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/policies', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setPolicies(data.data)
      }
    } catch (error) {
      console.error('Fetch policies error:', error)
      toast.error('Failed to fetch policies')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const url = editingPolicy ? `/api/policies/${editingPolicy._id}` : '/api/policies'
      const method = editingPolicy ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setShowModal(false)
        setEditingPolicy(null)
        setFormData({ title: '', category: '', content: '', effectiveDate: '' })
        fetchPolicies()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to save policy')
    }
  }

  const handleEdit = (policy) => {
    setEditingPolicy(policy)
    setFormData({
      title: policy.title,
      category: policy.category || '',
      content: policy.content || '',
      effectiveDate: policy.effectiveDate
        ? new Date(policy.effectiveDate).toISOString().split('T')[0]
        : '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/policies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        fetchPolicies()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete policy')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Company Policies</h1>
          <p className="text-gray-600 mt-1">View and manage company policies</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus />
          <span>Add Policy</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Policies</h3>
            <FaFileAlt className="text-primary-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{policies.length}</div>
        </div>

        {['HR', 'IT', 'Finance', 'General'].map((cat) => (
          <div key={cat} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{cat} Policies</h3>
              <FaFileAlt className="text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {policies.filter((p) => p.category === cat.toLowerCase()).length}
            </div>
          </div>
        ))}
      </div>

      {/* Policies List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading policies...</p>
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No policies found
          </div>
        ) : (
          policies.map((policy) => (
            <div
              key={policy._id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <FaFileAlt className="text-primary-500 text-xl" />
                    <h3 className="text-xl font-bold text-gray-800">{policy.title}</h3>
                    {policy.category && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {policy.category}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">
                    {policy.content}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {policy.effectiveDate && (
                      <span>
                        Effective from:{' '}
                        {new Date(policy.effectiveDate).toLocaleDateString()}
                      </span>
                    )}
                    {policy.createdBy && (
                      <span>
                        By {policy.createdBy.firstName} {policy.createdBy.lastName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(policy)}
                    className="text-blue-600 hover:text-blue-800 p-2"
                  >
                    <FaEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(policy._id)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <FaTrash size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingPolicy ? 'Edit Policy' : 'Add Policy'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Work From Home Policy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="hr">HR</option>
                    <option value="it">IT</option>
                    <option value="finance">Finance</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Content *
                  </label>
                  <textarea
                    rows="10"
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter policy details..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingPolicy(null)
                    setFormData({ title: '', category: '', content: '', effectiveDate: '' })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingPolicy ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

