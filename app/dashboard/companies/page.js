'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaTimes, FaUpload, FaImage } from 'react-icons/fa'
import ModalPortal from '@/components/ui/ModalPortal'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [user, setUser] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    logo: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Check role-based access
      if (['god_admin', 'admin', 'hr'].includes(parsedUser.role)) {
        fetchCompanies()
      } else {
        // Redirect unauthorized users
        toast.error('You do not have permission to access this page')
        setLoading(false)
      }
    }
  }, [])

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
      } else {
        toast.error(data.message || 'Failed to fetch companies')
      }
    } catch (error) {
      console.error('Fetch companies error:', error)
      toast.error('Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const url = editingCompany
        ? `/api/companies/${editingCompany._id}`
        : '/api/companies'
      const method = editingCompany ? 'PUT' : 'POST'

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
        toast.success(data.message || 'Company saved successfully')
        setShowModal(false)
        setEditingCompany(null)
        setFormData({ name: '', code: '', description: '' })
        fetchCompanies()
      } else {
        toast.error(data.message || 'Failed to save company')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to save company')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (company) => {
    setEditingCompany(company)
    setFormData({
      name: company.name,
      code: company.code,
      description: company.description || '',
      logo: company.logo || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this company?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Company deleted successfully')
        fetchCompanies()
      } else {
        toast.error(data.message || 'Failed to delete company')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete company')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCompany(null)
    setFormData({ name: '', code: '', description: '', logo: '' })
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }

    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'company-logos')

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData,
      })

      const data = await response.json()
      if (data.success) {
        setFormData({ ...formData, logo: data.url })
        toast.success('Logo uploaded successfully')
      } else {
        toast.error(data.message || 'Failed to upload logo')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => {
    setFormData({ ...formData, logo: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const canManageCompanies = () => {
    return user && ['god_admin', 'admin', 'hr'].includes(user.role)
  }

  if (!canManageCompanies()) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-gray-500">
          You do not have permission to access this page
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex md:justify-between md:items-center md:flex-row flex-col mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Companies</h1>
          <p className="text-gray-600 mt-1">Manage company profiles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2 mt-4 md:mt-0"
        >
          <FaPlus />
          <span>Add Company</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Companies</h3>
            <FaBuilding className="text-primary-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">{companies.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Companies</h3>
            <FaBuilding className="text-green-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">
            {companies.filter(c => c.isActive !== false).length}
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-gray-500">
            No companies found. Click "Add Company" to create one.
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company._id}
              className="bg-white rounded-lg shadow-md p-3 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="bg-primary-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                    ) : (
                      <FaBuilding className="text-primary-500 text-lg sm:text-xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate">{company.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{company.code}</p>
                  </div>
                </div>
                <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(company)}
                    className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit Company"
                  >
                    <FaEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(company._id)}
                    className="text-red-600 hover:text-red-800 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Company"
                  >
                    <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

              {company.description && (
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{company.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200">
                <div className="text-xs sm:text-sm text-gray-500">
                  Created {new Date(company.createdAt).toLocaleDateString()}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${company.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {company.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <ModalPortal isOpen={showModal}>
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="modal-backdrop" />
          <div className="modal-container modal-md">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="modal-close-btn"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                {/* Logo Upload */}
                <div>
                  <label className="modal-label">
                    Company Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    {formData.logo ? (
                      <div className="relative">
                        <img
                          src={formData.logo}
                          alt="Company logo"
                          className="w-20 h-20 object-contain rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <FaImage className="text-gray-400 w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn-secondary text-sm flex items-center space-x-2"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <FaUpload />
                            <span>Upload Logo</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Max 2MB, PNG/JPG</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="modal-label">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="modal-input"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>

                <div>
                  <label className="modal-label">
                    Company Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="modal-input uppercase"
                    placeholder="e.g., ACME"
                  />
                  <p className="text-xs text-gray-500 mt-1">A unique identifier for the company</p>
                </div>

                <div>
                  <label className="modal-label">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="modal-textarea"
                    placeholder="Brief description of the company"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="modal-btn modal-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="modal-btn modal-btn-primary"
                >
                  {submitting ? 'Saving...' : editingCompany ? 'Update Company' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  )
}
