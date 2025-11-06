'use client'

import { useEffect } from 'react'

/**
 * ErrorPageCache Component
 * Caches the error fallback page in localStorage for offline/error scenarios
 * This ensures users see a nice error page even when offline or when errors occur
 */
export default function ErrorPageCache() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    const cacheErrorPage = async () => {
      try {
        // Fetch the error fallback page
        const response = await fetch('/error-fallback.html')
        if (response.ok) {
          const html = await response.text()
          
          // Store in localStorage
          localStorage.setItem('talio_error_page', html)
          localStorage.setItem('talio_error_page_cached_at', new Date().toISOString())
          
          console.log('[ErrorPageCache] Error fallback page cached successfully')
        }
      } catch (error) {
        console.error('[ErrorPageCache] Failed to cache error page:', error)
      }
    }

    // Check if we need to cache or update the error page
    const cachedAt = localStorage.getItem('talio_error_page_cached_at')
    const shouldCache = !cachedAt || 
      (new Date() - new Date(cachedAt)) > 7 * 24 * 60 * 60 * 1000 // 7 days

    if (shouldCache) {
      cacheErrorPage()
    }
  }, [])

  // This component doesn't render anything
  return null
}

