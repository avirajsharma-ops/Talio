'use client'

import { useEffect, useState } from 'react'

export default function TalioBoardPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Hide loading after iframe loads
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
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
        {isLoading && (
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
        
        {/* Iframe */}
        <iframe
          src="https://smartboard.talio.in"
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
