'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { FaSpinner, FaExternalLinkAlt, FaExpand, FaSignOutAlt } from 'react-icons/fa'

const TALIOBOARD_URL = 'https://smartboard.talio.in'

export default function TalioBoardPage() {
  const [viewMode, setViewMode] = useState('checking') // 'checking' | 'iframe' | 'launcher' | 'popup' | 'newtab'
  const [popupWindow, setPopupWindow] = useState(null)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [iframeKey, setIframeKey] = useState(0)
  const checkIntervalRef = useRef(null)
  const iframeRef = useRef(null)
  const authCheckTimeoutRef = useRef(null)

  // Listen for postMessage from iframe (if TalioBoard sends auth status)
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from TalioBoard
      if (event.origin !== 'https://smartboard.talio.in') return
      
      if (event.data?.type === 'talioboard-auth-status') {
        if (event.data.authenticated) {
          setViewMode('iframe')
        } else {
          setViewMode('launcher')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // On initial load, try to detect if user is already authenticated
  // We'll load the iframe and give it a few seconds to see if it's usable
  useEffect(() => {
    // Check if user previously confirmed authentication
    const wasAuthenticated = localStorage.getItem('talioboard_session_active')
    
    if (wasAuthenticated === 'true') {
      // User was previously authenticated, show iframe directly
      setViewMode('iframe')
    } else {
      // Show launcher by default - user hasn't authenticated yet
      setViewMode('launcher')
    }
  }, [])

  // Check if popup is still open and monitor for successful login
  useEffect(() => {
    if (!popupWindow) return

    checkIntervalRef.current = setInterval(() => {
      try {
        // Check if popup is closed
        if (popupWindow.closed) {
          clearInterval(checkIntervalRef.current)
          setPopupWindow(null)
          // User closed popup - assume they signed in, show iframe
          localStorage.setItem('talioboard_session_active', 'true')
          setViewMode('iframe')
          setIframeKey(prev => prev + 1)
          setIframeLoading(true)
          return
        }

        // Try to detect if user has logged in by checking the popup URL
        // This will throw cross-origin error if on Google's domain, but work when back on TalioBoard
        try {
          const popupUrl = popupWindow.location.href
          // If we can read the URL and it's on TalioBoard domain (not Google OAuth)
          // and contains indicators of being logged in, auto-close and switch to iframe
          if (popupUrl && popupUrl.includes('smartboard.talio.in')) {
            // Check if URL indicates successful login (no login/auth in path)
            // or if the page has loaded past the login screen
            if (!popupUrl.includes('login') && 
                !popupUrl.includes('oauth') && 
                !popupUrl.includes('accounts.google.com')) {
              // User appears to be logged in - close popup and switch to iframe
              console.log('TalioBoard: Detected successful login, switching to iframe')
              popupWindow.close()
              clearInterval(checkIntervalRef.current)
              setPopupWindow(null)
              localStorage.setItem('talioboard_session_active', 'true')
              setViewMode('iframe')
              setIframeKey(prev => prev + 1)
              setIframeLoading(true)
            }
          }
        } catch (urlError) {
          // Cross-origin error - popup is on a different domain (likely Google OAuth)
          // This is expected during the login flow, continue monitoring
        }
      } catch (e) {
        // Cross-origin error - ignore
      }
    }, 500) // Check more frequently (every 500ms)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [popupWindow])

  // Open TalioBoard in a large popup window (user works directly in popup)
  const openInPopup = useCallback(() => {
    // Large popup - almost full screen
    const width = Math.min(window.screen.availWidth - 100, 1400)
    const height = Math.min(window.screen.availHeight - 100, 900)
    const left = (window.screen.availWidth - width) / 2
    const top = (window.screen.availHeight - height) / 2

    const popup = window.open(
      TALIOBOARD_URL,
      'TalioBoard',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    )

    if (popup) {
      setPopupWindow(popup)
      setViewMode('popup')
      popup.focus()
    } else {
      // Popup blocked - open in new tab
      window.open(TALIOBOARD_URL, '_blank')
      setViewMode('newtab')
    }
  }, [])

  // Open in new tab
  const openInNewTab = useCallback(() => {
    window.open(TALIOBOARD_URL, '_blank')
    setViewMode('newtab')
  }, [])

  // Focus existing popup
  const focusPopup = useCallback(() => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus()
    }
  }, [popupWindow])

  // Close popup and return to launcher
  const closePopup = useCallback(() => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close()
    }
    setPopupWindow(null)
    setViewMode('launcher')
  }, [popupWindow])

  // Reset to launcher view
  const backToLauncher = useCallback(() => {
    setViewMode('launcher')
  }, [])

  // Reset authentication and go back to launcher
  const resetAuth = useCallback(() => {
    localStorage.removeItem('talioboard_session_active')
    setViewMode('launcher')
  }, [])

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false)
  }, [])

  // Checking authentication state
  if (viewMode === 'checking') {
    return (
      <div 
        className="talioboard-container fixed bg-gradient-to-br from-blue-50 to-indigo-100 z-[5] flex items-center justify-center"
        style={{
          top: '60.5px',
          left: '0',
          right: '0',
          bottom: '0'
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading TalioBoard...</p>
        </div>
        
        <style jsx global>{`
          @media (min-width: 1024px) {
            .talioboard-container { left: 17rem !important; }
          }
          @media (max-width: 1023px) {
            .talioboard-container { left: 0 !important; bottom: 72px !important; }
          }
        `}</style>
      </div>
    )
  }

  // Iframe view - user is authenticated
  if (viewMode === 'iframe') {
    return (
      <>
        <div 
          className="talioboard-container fixed bg-white z-[5]"
          style={{
            top: '60.5px',
            left: '0',
            right: '0',
            bottom: '0'
          }}
        >
          {/* Loading overlay */}
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center gap-4">
                <FaSpinner className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-600 font-medium">Loading TalioBoard...</p>
              </div>
            </div>
          )}

          {/* Reset auth button */}
          <button
            onClick={resetAuth}
            className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 rounded-lg shadow-md border border-gray-200 text-xs font-medium transition-colors backdrop-blur-sm flex items-center gap-1.5"
            title="Sign out of TalioBoard"
          >
            <FaSignOutAlt className="text-xs" />
            <span>Reset</span>
          </button>
          
          {/* Iframe with credentials */}
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={TALIOBOARD_URL}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="TalioBoard"
            // Important: This helps with cookie sharing in some browsers
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              overflow: 'hidden'
            }}
          />
        </div>
        
        <style jsx global>{`
          @media (min-width: 1024px) {
            .talioboard-container { left: 17rem !important; }
          }
          @media (max-width: 1023px) {
            .talioboard-container { left: 0 !important; bottom: 72px !important; }
          }
        `}</style>
      </>
    )
  }

  // Popup is active - show status screen
  if (viewMode === 'popup' && popupWindow) {
    return (
      <div 
        className="talioboard-container fixed bg-gradient-to-br from-blue-50 via-white to-indigo-100 z-[5] flex items-center justify-center"
        style={{
          top: '60.5px',
          left: '0',
          right: '0',
          bottom: '0'
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-4 text-center border border-gray-100">
          {/* Waiting Status Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FaSpinner className="w-10 h-10 text-white animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Waiting for Sign-In...
          </h2>
          
          <p className="text-gray-500 mb-4">
            Please complete the Google sign-in in the popup window.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <p className="text-green-800 text-sm">
              ✨ <strong>Auto-detect enabled:</strong> Once you sign in, this page will automatically load TalioBoard for you!
            </p>
          </div>

          <div className="space-y-3">
            {/* Focus popup button */}
            <button
              onClick={focusPopup}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <FaExpand />
              <span>Show Sign-In Window</span>
            </button>

            {/* Cancel button */}
            <button
              onClick={closePopup}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-medium rounded-xl transition-all"
            >
              <span>Cancel</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                if (popupWindow && !popupWindow.closed) {
                  popupWindow.close()
                }
                setPopupWindow(null)
                localStorage.setItem('talioboard_session_active', 'true')
                setViewMode('iframe')
                setIframeKey(prev => prev + 1)
                setIframeLoading(true)
              }}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              I've signed in, load TalioBoard now →
            </button>
          </div>
        </div>

        <style jsx global>{`
          @media (min-width: 1024px) {
            .talioboard-container { left: 17rem !important; }
          }
          @media (max-width: 1023px) {
            .talioboard-container { left: 0 !important; bottom: 72px !important; }
          }
        `}</style>
      </div>
    )
  }

  // Opened in new tab - show confirmation
  if (viewMode === 'newtab') {
    return (
      <div 
        className="talioboard-container fixed bg-gradient-to-br from-blue-50 via-white to-indigo-50 z-[5] flex items-center justify-center"
        style={{
          top: '60.5px',
          left: '0',
          right: '0',
          bottom: '0'
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-4 text-center border border-gray-100">
          {/* New Tab Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FaExternalLinkAlt className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            TalioBoard Opened in New Tab
          </h2>
          
          <p className="text-gray-500 mb-6">
            Check your browser tabs for TalioBoard. Sign in with Google there to access your whiteboards.
          </p>

          <div className="space-y-3">
            {/* I've signed in - load iframe */}
            <button
              onClick={() => {
                localStorage.setItem('talioboard_session_active', 'true')
                setViewMode('iframe')
                setIframeKey(prev => prev + 1)
                setIframeLoading(true)
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>I've Signed In - Load Here</span>
            </button>

            {/* Open again button */}
            <button
              onClick={openInNewTab}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl transition-all"
            >
              <FaExternalLinkAlt className="text-gray-500" />
              <span>Open TalioBoard Again</span>
            </button>

            {/* Back to launcher */}
            <button
              onClick={backToLauncher}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-medium rounded-xl transition-all"
            >
              <span>← Back to Options</span>
            </button>
          </div>
        </div>

        <style jsx global>{`
          @media (min-width: 1024px) {
            .talioboard-container { left: 17rem !important; }
          }
          @media (max-width: 1023px) {
            .talioboard-container { left: 0 !important; bottom: 72px !important; }
          }
        `}</style>
      </div>
    )
  }

  // Default launcher view
  return (
    <div 
      className="talioboard-container fixed bg-gradient-to-br from-blue-50 via-white to-indigo-50 z-[5] flex items-center justify-center"
      style={{
        top: '60.5px',
        left: '0',
        right: '0',
        bottom: '0'
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border border-gray-100">
        {/* Logo/Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          TalioBoard
        </h2>
        
        <p className="text-gray-500 mb-2">
          Smart Whiteboard for Collaboration
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-amber-800 text-sm">
            <strong>Note:</strong> TalioBoard requires Google sign-in and opens in a separate window for the best experience.
          </p>
        </div>

        <div className="space-y-3">
          {/* Primary: Open in popup */}
          <button
            onClick={openInPopup}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Sign In & Open TalioBoard</span>
          </button>

          {/* Already signed in - load directly */}
          <button
            onClick={() => {
              localStorage.setItem('talioboard_session_active', 'true')
              setViewMode('iframe')
              setIframeKey(prev => prev + 1)
              setIframeLoading(true)
            }}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>I'm Already Signed In</span>
          </button>

          {/* Secondary: Open in new tab */}
          <button
            onClick={openInNewTab}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl transition-all"
          >
            <FaExternalLinkAlt className="text-gray-500" />
            <span>Open in New Tab Instead</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            TalioBoard uses Google Authentication for secure access to your whiteboards
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .talioboard-container { left: 17rem !important; }
        }
        @media (max-width: 1023px) {
          .talioboard-container { left: 0 !important; bottom: 72px !important; }
        }
      `}</style>
    </div>
  )
}
