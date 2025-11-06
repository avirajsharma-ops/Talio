'use client'

import { useState, useEffect } from 'react'
import { FaWifi, FaExclamationTriangle, FaHome, FaRedo, FaCloudDownloadAlt, FaServer } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setLastChecked(new Date())
      // Automatically redirect when back online
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setLastChecked(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const handleRefresh = async () => {
    setIsChecking(true)

    // Try to fetch a small resource to check connectivity
    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache'
      })

      if (response.ok) {
        setIsOnline(true)
        setLastChecked(new Date())
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        setIsOnline(false)
        setLastChecked(new Date())
      }
    } catch (error) {
      setIsOnline(false)
      setLastChecked(new Date())
    } finally {
      setTimeout(() => {
        setIsChecking(false)
      }, 1000)
    }
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt="Talio Logo"
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border border-gray-100">
          {/* Animated Icon */}
          <div className="mb-6">
            {isOnline ? (
              <div className="relative">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <FaWifi className="w-10 h-10 text-green-600" />
                </div>
                <div className="absolute inset-0 w-20 h-20 mx-auto">
                  <div className="w-full h-full rounded-full border-4 border-green-200 animate-ping"></div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <FaExclamationTriangle className="w-10 h-10 text-red-600 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Title and Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {isOnline ? '🎉 Connection Restored!' : '📡 You&apos;re Offline'}
          </h1>

          <p className="text-gray-600 mb-6 text-lg">
            {isOnline
              ? 'Your internet connection has been restored. Redirecting to dashboard...'
              : 'It looks like you&apos;re not connected to the internet or the server is down.'
            }
          </p>

          {/* Status Indicator */}
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 ${
            isOnline
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'
            }`} />
            <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
            {lastChecked && (
              <span className="text-xs opacity-75">
                • {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Possible Reasons */}
          {!isOnline && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 mb-6 text-left border border-orange-200">
              <div className="flex items-start space-x-3 mb-3">
                <FaServer className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-2">Possible Reasons:</h3>
                  <ul className="text-sm text-orange-800 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>No internet connection on your device</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Server is temporarily down for maintenance</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Network connectivity issues</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Firewall or proxy blocking the connection</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Available Features */}
          {!isOnline && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 text-left border border-blue-200">
              <div className="flex items-start space-x-3">
                <FaCloudDownloadAlt className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">✨ Available Offline:</h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>View cached dashboard data</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Access employee information</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>View recent attendance records</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Browse leave history</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Check cached reports</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isOnline ? (
              <div className="flex items-center justify-center space-x-3 text-green-600 py-4">
                <div className="w-5 h-5 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-base font-medium">Redirecting to dashboard...</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={isChecking}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking Connection...</span>
                    </>
                  ) : (
                    <>
                      <FaRedo className="w-4 h-4" />
                      <span>Check Connection</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-800 py-3.5 px-6 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center space-x-2 font-semibold border border-gray-300"
                >
                  <FaHome className="w-4 h-4" />
                  <span>Go to Dashboard (Offline Mode)</span>
                </button>
              </>
            )}
          </div>

          {/* Tips */}
          {!isOnline && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">💡 Quick Tips:</h4>
                <div className="text-xs text-gray-600 space-y-1.5">
                  <p>• Check your WiFi or mobile data connection</p>
                  <p>• Try turning airplane mode off and on</p>
                  <p>• Contact your IT administrator if the issue persists</p>
                  <p>• This app works offline with limited cached data</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
