'use client'

import { useEffect, useState, useCallback } from 'react'
import { FaExternalLinkAlt, FaSync, FaGoogle, FaCheckCircle } from 'react-icons/fa'

const TALIOBOARD_URL = 'https://smartboard.talio.in'

export default function TalioBoardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authWindowOpened, setAuthWindowOpened] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    // Hide loading after iframe loads
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [iframeKey])

  // Listen for messages from the iframe (if TalioBoard sends auth status)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://smartboard.talio.in') return
      
      if (event.data?.type === 'NEEDS_AUTH' || event.data?.type === 'AUTH_REQUIRED') {
        setShowAuthPrompt(true)
        setIsLoading(false)
      } else if (event.data?.type === 'AUTH_SUCCESS') {
        setShowAuthPrompt(false)
        setAuthWindowOpened(false)
        // Refresh iframe to load authenticated content
        setIframeKey(prev => prev + 1)
        setIsLoading(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Open TalioBoard in new tab for Google Sign-in
  const openInNewTab = useCallback(() => {
    const newWindow = window.open(TALIOBOARD_URL, '_blank', 'noopener,noreferrer')
    if (newWindow) {
      setAuthWindowOpened(true)
    }
  }, [])

  // Refresh the iframe after user completes auth
  const refreshBoard = useCallback(() => {
    setIsLoading(true)
    setShowAuthPrompt(false)
    setAuthWindowOpened(false)
    setIframeKey(prev => prev + 1)
  }, [])

  return (
    <>
      {/* Full-screen iframe container */}
      <div 
        className="talioboard-container fixed bg-white z-[5]"
        style={{
          top: '60.5px', // Header height
          left: '0',
          right: '0',
          bottom: '0'
        }}
      >
        {/* Loading overlay */}
        {isLoading && !showAuthPrompt && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="w-12 h-12 border-4 rounded-full animate-spin"
                style={{ 
                  borderColor: 'var(--color-primary-200)',
                  borderTopColor: 'var(--color-primary-500)'
                }}
              ></div>
              <p className="text-gray-600 font-medium">Loading TalioBoard...</p>
            </div>
          </div>
        )}

        {/* Auth Prompt Overlay - Shows when Google Sign-in is needed */}
        {showAuthPrompt && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-20">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaGoogle className="text-3xl text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Google Sign-in Required
              </h2>
              
              <p className="text-gray-600 mb-6">
                TalioBoard requires Google Sign-in which cannot run inside an embedded frame. 
                Click below to sign in via a new tab, then return here.
              </p>

              {!authWindowOpened ? (
                <button
                  onClick={openInNewTab}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-200"
                >
                  <FaExternalLinkAlt />
                  Open TalioBoard & Sign In
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 py-3 px-4 rounded-xl">
                    <FaCheckCircle />
                    <span className="font-medium">TalioBoard opened in new tab</span>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Complete sign-in in the new tab, then click below to reload
                  </p>
                  
                  <button
                    onClick={refreshBoard}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <FaSync />
                    I've Signed In - Reload Board
                  </button>
                  
                  <button
                    onClick={openInNewTab}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    <FaExternalLinkAlt className="text-xs" />
                    Open Again
                  </button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Try loading anyway →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating action button to trigger auth flow manually */}
        {!showAuthPrompt && !isLoading && (
          <div className="absolute bottom-4 right-4 z-30 flex gap-2">
            <button
              onClick={() => setShowAuthPrompt(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-lg border border-gray-200 text-sm font-medium transition-colors"
              title="Sign in with Google"
            >
              <FaGoogle className="text-blue-500" />
              <span className="hidden sm:inline">Google Sign-in</span>
            </button>
            <button
              onClick={openInNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-lg border border-gray-200 text-sm font-medium transition-colors"
              title="Open in new tab"
            >
              <FaExternalLinkAlt />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>
          </div>
        )}
        
        {/* Iframe */}
        <iframe
          key={iframeKey}
          src={TALIOBOARD_URL}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="TalioBoard"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        />
      </div>
      
      {/* Desktop: Adjust for sidebar */}
      <style jsx global>{`
        /* On desktop, adjust iframe position for sidebar */
        @media (min-width: 1024px) {
          .talioboard-container {
            left: 17rem !important;
          }
        }
        
        /* On mobile, full width */
        @media (max-width: 1023px) {
          .talioboard-container {
            left: 0 !important;
            bottom: 72px !important; /* Account for mobile bottom nav */
          }
        }
      `}</style>
    </>
  )
}
