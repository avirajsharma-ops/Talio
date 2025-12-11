'use client';

import { useState, useEffect } from 'react';
import { FaCamera, FaSearch, FaCalendarAlt, FaUser, FaExpand, FaDownload, FaChevronLeft, FaChevronRight, FaFilter, FaSync } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function RawCapturesPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [captures, setCaptures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0 });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchEmployees(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCaptures();
    }
  }, [user, selectedEmployee, selectedDate, pagination.page]);

  const fetchEmployees = async (currentUser) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees?status=active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchCaptures = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `/api/productivity/capture?limit=${pagination.limit}&page=${pagination.page}`;
      
      if (selectedEmployee && selectedEmployee !== 'all') {
        url += `&employeeId=${selectedEmployee}`;
      }
      
      if (selectedDate) {
        url += `&date=${selectedDate}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCaptures(data.data || []);
        setPagination(prev => ({ ...prev, total: data.count || 0 }));
      } else {
        toast.error(data.error || 'Failed to fetch captures');
      }
    } catch (error) {
      console.error('Failed to fetch captures:', error);
      toast.error('Failed to fetch captures');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCaptures();
    toast.success('Refreshed captures');
  };

  const openCaptureModal = (capture) => {
    setSelectedCapture(capture);
    setIsModalOpen(true);
  };

  const closeCaptureModal = () => {
    setSelectedCapture(null);
    setIsModalOpen(false);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'god_admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaCamera className="text-blue-600" />
              Raw Captures
            </h1>
            <p className="text-gray-600 mt-1">
              View screen captures from the desktop monitoring app
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-center">
          {/* Employee Filter */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <FaUser className="text-gray-400" />
              <select
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Results count */}
          <div className="ml-auto text-gray-600">
            {captures.length} captures found
          </div>
        </div>
      </div>

      {/* Captures Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : captures.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FaCamera className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Captures Found</h3>
          <p className="text-gray-500">
            No screen captures available for the selected date and filters.
            <br />
            Make sure the desktop app is running and employees are checked in.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {captures.map((capture) => (
              <div
                key={capture.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openCaptureModal(capture)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {capture.screenshot?.path ? (
                    <img
                      src={capture.screenshot.path}
                      alt="Screen capture"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : capture.screenshot?.data ? (
                    <img
                      src={capture.screenshot.data.startsWith('data:') ? capture.screenshot.data : `data:image/webp;base64,${capture.screenshot.data}`}
                      alt="Screen capture"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaCamera className="text-4xl text-gray-300" />
                    </div>
                  )}
                  
                  {/* Expand icon overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <FaExpand className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xl" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {capture.employee?.name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                    <span>{formatTime(capture.screenshot?.capturedAt || capture.period?.end)}</span>
                    <span className="text-gray-300">•</span>
                    <span>{capture.employee?.code}</span>
                  </div>
                  
                  {/* Activity indicators */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span title="Keystrokes">⌨️ {capture.activity?.keystrokes || 0}</span>
                    <span title="Clicks">🖱️ {capture.activity?.mouseClicks || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronLeft />
                Previous
              </button>
              
              <span className="text-gray-600">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* Full Screen Modal */}
      {isModalOpen && selectedCapture && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeCaptureModal}
        >
          <div 
            className="relative max-w-6xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCapture.employee?.name || 'Unknown Employee'}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedCapture.screenshot?.capturedAt)} at {formatTime(selectedCapture.screenshot?.capturedAt)}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Activity Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                  <span>⌨️ {selectedCapture.activity?.keystrokes || 0} keystrokes</span>
                  <span>🖱️ {selectedCapture.activity?.mouseClicks || 0} clicks</span>
                </div>
                
                <button
                  onClick={closeCaptureModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body - Screenshot */}
            <div className="bg-gray-900 flex items-center justify-center" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {selectedCapture.screenshot?.path ? (
                <img
                  src={selectedCapture.screenshot.path}
                  alt="Full screen capture"
                  className="max-w-full max-h-[calc(90vh-80px)] object-contain"
                />
              ) : selectedCapture.screenshot?.data ? (
                <img
                  src={selectedCapture.screenshot.data.startsWith('data:') ? selectedCapture.screenshot.data : `data:image/webp;base64,${selectedCapture.screenshot.data}`}
                  alt="Full screen capture"
                  className="max-w-full max-h-[calc(90vh-80px)] object-contain"
                />
              ) : (
                <div className="text-gray-500 text-center py-12">
                  <FaCamera className="text-6xl mx-auto mb-4 opacity-50" />
                  <p>Screenshot not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
