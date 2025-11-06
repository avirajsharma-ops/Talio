'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [showClearOption, setShowClearOption] = useState(false)

  useEffect(() => {
    // Set a timeout to show clear cache option if stuck
    const stuckTimer = setTimeout(() => {
      setShowClearOption(true)
    }, 2000) // Show option after 2 seconds

    // Check if user is already logged in
    const checkSession = () => {
      try {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')

        if (token && user) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard')
        } else {
          // No session, redirect to login page
          router.push('/login')
        }
      } catch (error) {
        console.error('Session check error:', error)
        // On error, clear storage and redirect to login
        localStorage.clear()
        sessionStorage.clear()
        router.push('/login')
      }
    }

    // Small delay to ensure localStorage is accessible
    setTimeout(checkSession, 100)

    return () => clearTimeout(stuckTimer)
  }, [router])

  const clearCacheAndRedirect = () => {
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })

    // Redirect to clear cache page
    window.location.href = '/clear-cache.html'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white" style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      <style jsx global>{`
        html, body {
          background-color: #FFFFFF !important;
        }
      `}</style>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Checking session...</p>

        {showClearOption && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow-lg max-w-sm mx-auto">
            <p className="text-sm text-gray-700 mb-3">Taking longer than expected?</p>
            <button
              onClick={clearCacheAndRedirect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Clear Cache & Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

