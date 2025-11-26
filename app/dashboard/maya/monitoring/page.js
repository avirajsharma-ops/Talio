'use client'

import { useState, useEffect } from 'react'
import { FaDesktop, FaClock, FaChartBar, FaEye, FaCalendar, FaPlay, FaPause, FaCamera } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ScreenMonitoringPage() {
  const [monitoring, setMonitoring] = useState(false)
  const [screenshots, setScreenshots] = useState([])
  const [stats, setStats] = useState({
    todayTime: 0,
    weekTime: 0,
    monthTime: 0,
    productivity: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchMonitoringData()
  }, [selectedDate])

  const fetchMonitoringData = async () => {
    try {
      // Mock data - replace with actual API call
      const mockStats = {
        todayTime: 6.5,
        weekTime: 32.5,
        monthTime: 140,
        productivity: 78
      }

      const mockScreenshots = [
        {
          id: 1,
          timestamp: '2024-02-01 14:30:00',
          application: 'VS Code',
          activity: 'Coding',
          thumbnail: '/assets/screenshot1.jpg',
          duration: 45,
          productive: true
        },
        {
          id: 2,
          timestamp: '2024-02-01 15:15:00',
          application: 'Chrome',
          activity: 'Documentation',
          thumbnail: '/assets/screenshot2.jpg',
          duration: 30,
          productive: true
        },
        {
          id: 3,
          timestamp: '2024-02-01 15:45:00',
          application: 'Slack',
          activity: 'Communication',
          thumbnail: '/assets/screenshot3.jpg',
          duration: 15,
          productive: true
        },
        {
          id: 4,
          timestamp: '2024-02-01 16:00:00',
          application: 'YouTube',
          activity: 'Break',
          thumbnail: '/assets/screenshot4.jpg',
          duration: 10,
          productive: false
        }
      ]

      setStats(mockStats)
      setScreenshots(mockScreenshots)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
      toast.error('Failed to load monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMonitoring = async () => {
    try {
      const newState = !monitoring
      setMonitoring(newState)
      
      if (newState) {
        toast.success('Screen monitoring started')
        // Start monitoring via API
      } else {
        toast.success('Screen monitoring paused')
        // Stop monitoring via API
      }
    } catch (error) {
      toast.error('Failed to toggle monitoring')
    }
  }

  const handleCaptureScreenshot = async () => {
    try {
      toast.success('Capturing screenshot...')
      // Capture and submit screenshot via API
    } catch (error) {
      toast.error('Failed to capture screenshot')
    }
  }

  const formatTime = (hours) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="p-3 sm:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FaDesktop className="text-blue-600" />
          Screen Monitoring
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Track your screen activity and productivity
        </p>
      </div>

      {/* Monitoring Control */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Monitoring Status</h2>
            <p className="text-sm text-gray-600">
              {monitoring ? (
                <span className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Active - Your screen is being monitored
                </span>
              ) : (
                <span className="flex items-center gap-2 text-gray-500">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Paused - Monitoring is currently disabled
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleMonitoring}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                monitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {monitoring ? (
                <>
                  <FaPause />
                  Pause Monitoring
                </>
              ) : (
                <>
                  <FaPlay />
                  Start Monitoring
                </>
              )}
            </button>
            <button
              onClick={handleCaptureScreenshot}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <FaCamera />
              Capture Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Today</p>
              <p className="text-2xl font-bold mt-1">{formatTime(stats.todayTime)}</p>
            </div>
            <FaClock className="text-4xl opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">This Week</p>
              <p className="text-2xl font-bold mt-1">{formatTime(stats.weekTime)}</p>
            </div>
            <FaCalendar className="text-4xl opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">This Month</p>
              <p className="text-2xl font-bold mt-1">{formatTime(stats.monthTime)}</p>
            </div>
            <FaChartBar className="text-4xl opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Productivity</p>
              <p className="text-2xl font-bold mt-1">{stats.productivity}%</p>
            </div>
            <FaEye className="text-4xl opacity-30" />
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="text-sm font-medium text-gray-700">View screenshots for:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Today
          </button>
        </div>
      </div>

      {/* Screenshots Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Activity Timeline</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading screenshots...</p>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-12">
            <FaDesktop className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No screenshots for this date</p>
            <p className="text-gray-500 text-sm mt-2">
              {monitoring ? 'Screenshots will appear here automatically' : 'Start monitoring to capture screenshots'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {screenshots.map((screenshot) => (
              <div key={screenshot.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                {/* Screenshot Thumbnail */}
                <div className="w-full sm:w-48 h-32 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center">
                  <FaDesktop className="text-4xl text-gray-500" />
                </div>

                {/* Screenshot Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{screenshot.application}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      screenshot.productive 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {screenshot.productive ? 'Productive' : 'Break'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    Activity: <span className="font-medium">{screenshot.activity}</span>
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FaClock className="text-blue-600" />
                      <span>{new Date(screenshot.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaChartBar className="text-green-600" />
                      <span>{screenshot.duration} minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <FaEye className="text-blue-600 text-xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-1">Privacy Notice</h3>
            <p className="text-sm text-blue-800">
              Screen monitoring captures periodic screenshots to track productivity and application usage. 
              All data is securely stored and only accessible to authorized personnel. You can pause monitoring at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
