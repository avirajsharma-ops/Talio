'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt } from 'react-icons/fa'

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public',
    description: '',
  })

  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/holidays', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setHolidays(data.data)
      }
    } catch (error) {
      console.error('Fetch holidays error:', error)
      toast.error('Failed to fetch holidays')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const url = editingHoliday
        ? `/api/holidays/${editingHoliday._id}`
        : '/api/holidays'
      const method = editingHoliday ? 'PUT' : 'POST'

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
        setEditingHoliday(null)
        setFormData({ name: '', date: '', type: 'public', description: '' })
        fetchHolidays()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to save holiday')
    }
  }

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      type: holiday.type || 'public',
      description: holiday.description || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        fetchHolidays()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete holiday')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingHoliday(null)
    setFormData({ name: '', date: '', type: 'public', description: '' })
  }

  const groupHolidaysByMonth = () => {
    const grouped = {}
    holidays.forEach((holiday) => {
      const date = new Date(holiday.date)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!grouped[monthYear]) {
        grouped[monthYear] = []
      }
      grouped[monthYear].push(holiday)
    })
    return grouped
  }

  const groupedHolidays = groupHolidaysByMonth()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex md:justify-between md:items-center md:flex-row flex-col mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Holidays</h1>
          <p className="text-gray-600 mt-1">Manage company holidays and observances</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus />
          <span>Add Holiday</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Holidays</h3>
            <FaCalendarAlt className="text-primary-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{holidays.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Public Holidays</h3>
            <FaCalendarAlt className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {holidays.filter(h => h.type === 'public').length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Optional Holidays</h3>
            <FaCalendarAlt className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {holidays.filter(h => h.type === 'optional').length}
          </div>
        </div>
      </div>

      {/* Holidays List */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading holidays...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No holidays found
          </div>
        ) : (
          Object.entries(groupedHolidays).map(([monthYear, monthHolidays]) => (
            <div key={monthYear} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-primary-500 text-white px-6 py-3">
                <h2 className="text-xl font-semibold">{monthYear}</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {monthHolidays.map((holiday) => (
                  <div
                    key={holiday._id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary-100 p-4 rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary-600">
                              {new Date(holiday.date).getDate()}
                            </div>
                            <div className="text-xs text-primary-600">
                              {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{holiday.name}</h3>
                          {holiday.description && (
                            <p className="text-gray-600 text-sm mt-1">{holiday.description}</p>
                          )}
                          <div className="mt-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              holiday.type === 'public' ? 'bg-green-100 text-green-800' :
                              holiday.type === 'optional' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {holiday.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="text-blue-600 hover:text-blue-800 p-2"
                        >
                          <FaEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday._id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <FaTrash size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center style={{ zIndex: 99999 }}">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., New Year's Day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="public">Public Holiday</option>
                    <option value="optional">Optional Holiday</option>
                    <option value="restricted">Restricted Holiday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Holiday description"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingHoliday ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

