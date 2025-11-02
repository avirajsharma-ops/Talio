'use client'

import { useState, useEffect } from 'react'
import { FaWifi, FaExclamationTriangle, FaHome, FaRedo } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Automatically redirect when back online
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {/* Icon */}
        <div className="mb-6">
          {isOnline ? (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <FaWifi className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <FaExclamationTriangle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        {/* Title and Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isOnline ? 'Connection Restored!' : 'You&apos;re Offline'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isOnline 
            ? 'Your internet connection has been restored. Redirecting to dashboard...'
            : 'It looks like you&apos;re not connected to the internet. Some features may not be available.'
          }
        </p>

        {/* Status Indicator */}
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium mb-6 ${
          isOnline 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Available Features */}
        {!isOnline && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• View cached dashboard data</li>
              <li>• Access employee information</li>
              <li>• View recent attendance records</li>
              <li>• Browse leave history</li>
              <li>• Check cached reports</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {isOnline ? (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Redirecting...</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleRefresh}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <FaRedo className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <FaHome className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </>
          )}
        </div>

        {/* Tips */}
        {!isOnline && (
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>Tip: Check your internet connection and try refreshing the page.</p>
            <p>This app works offline with cached data.</p>
          </div>
        )}
      </div>
    </div>
  )
}
