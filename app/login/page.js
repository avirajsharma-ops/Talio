'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = () => {
      console.log('[Login Page] Checking session...')
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')

      console.log('[Login Page] Token exists:', !!token)
      console.log('[Login Page] User exists:', !!user)

      if (token && user) {
        // User is already logged in, redirect to dashboard
        console.log('[Login Page] Redirecting to dashboard...')
        window.location.href = '/dashboard'
      } else {
        // Check for error in URL params
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')

        if (error) {
          const errorMessages = {
            no_code: 'Google authentication failed. Please try again.',
            token_exchange_failed: 'Failed to authenticate with Google.',
            user_info_failed: 'Failed to get user information from Google.',
            user_not_found: 'No account found with this Google email. Please contact your administrator.',
            account_deactivated: 'Your account has been deactivated. Please contact your administrator.',
            authentication_failed: 'Authentication failed. Please try again.',
          }
          toast.error(errorMessages[error] || 'An error occurred during login.')
        }

        // No session found, show login page
        console.log('[Login Page] Showing login form...')
        setChecking(false)
      }
    }

    checkSession()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Login successful!')
        // Store in localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        const resolvedUserId = data.user?.id || data.user?._id || data.user?.userId
        if (resolvedUserId) {
          localStorage.setItem('userId', resolvedUserId)
        }

        // Also set cookie for middleware
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days

        // Notify desktop app if running in Electron
        if (window.talioDesktop || window.electronAPI) {
          console.log('[Login] Notifying desktop app of login...')
          const desktopAPI = window.talioDesktop || window.electronAPI
          try {
            // Set auth for activity tracking
            if (desktopAPI.setAuth) {
              await desktopAPI.setAuth(data.token, data.user)
              console.log('[Login] Desktop app auth set')
            }
            // Request permissions after login
            if (desktopAPI.requestAllPermissions) {
              const permissions = await desktopAPI.requestAllPermissions()
              console.log('[Login] Desktop permissions:', permissions)
            }
          } catch (err) {
            console.error('[Login] Desktop app notification error:', err)
          }
        }

        // Check for pending FCM token from Android app
        if (window.checkPendingFCMToken) {
          console.log('[Login] Checking for pending FCM token...')
          window.checkPendingFCMToken()
        }

        console.log('[Login] Redirecting to dashboard...')
        // Use window.location.href for reliable redirect
        window.location.href = '/dashboard'
      } else {
        toast.error(data.message || 'Login failed')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      toast.loading('Redirecting to Google...')

      // Check if running in TWA (Trusted Web Activity) / Android app
      const isInApp = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone ||
        document.referrer.includes('android-app://')

      // Determine the correct origin based on environment
      // If in Android app, use the production URL, otherwise use current origin
      const appOrigin = isInApp ? 'https://app.talio.in' : window.location.origin
      const redirectUri = `${appOrigin}/api/auth/google/callback`

      console.log('[Google OAuth] Is in app:', isInApp)
      console.log('[Google OAuth] Redirect URI:', redirectUri)

      // Redirect to Google OAuth
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid%20email%20profile&` +
        `access_type=offline&` +
        `prompt=consent`

      window.location.href = googleAuthUrl
    } catch (error) {
      console.error('[Google OAuth] Error:', error)
      toast.error('Failed to initiate Google Sign-In')
      setLoading(false)
    }
  }

  // Show loading screen while checking session
  if (checking) {
    return (
      <div className="min-h-screen text-black flex items-center justify-center bg-white" style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
        <style jsx global>{`
          html, body {
            background-color: #FFFFFF !important;
          }
        `}</style>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-black flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      <style jsx global>{`
        html, body {
          background-color: #FFFFFF !important;
        }
      `}</style>
      <div className="max-w-md w-full space-y-18 bg-white px-2 py-5  rounded-2xl shadow-2xl">
        <div>
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Talio Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          {/* <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p> */}
        </div>
        <form className="mt-8 mr-[1rem] ml-[1rem] space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-950/90 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <img src="/email.svg" alt="Email" className="h-8 w-8" />
                  {/* <FaEnvelope className="h-5 w-5 text-gray-400" /> */}
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full pl-12 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <img src="/lock.svg" alt="Password" className="h-8 w-8" />
                  {/* <FaLock className="h-5 w-5 text-gray-400" /> */}
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <img src="/visibility.svg" alt="Hide Password" className="h-5 w-5" />
                    // <FaEyeSlash className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-blue-950/90">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-950/90 hover:text-blue-500">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-950/90 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <img src="/google.svg" alt="Google" className="h-5 w-5" />
              <span>Sign in with Google</span>
            </button>
          </div>

          {/* <div className="text-center text-sm text-gray-600">
            <p>Demo Credentials:</p>
            <p className="mt-1">Admin: admin@hrms.com / admin123</p>
            <p>Employee: employee@hrms.com / employee123</p>
          </div> */}
        </form>
      </div>
    </div>
  )
}

