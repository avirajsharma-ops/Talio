'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'

/**
 * OfflineDetector Component
 * Detects when user goes offline and redirects to offline page
 * Shows toast notifications for online/offline status changes
 */
export default function OfflineDetector() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOnline, setIsOnline] = useState(true)
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false)

  useEffect(() => {
    // Don't run on offline page itself
    if (pathname === '/offline') {
      return
    }

    // Check initial online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      console.log('[OfflineDetector] Connection restored')
      setIsOnline(true)
      setHasShownOfflineToast(false)
      
      // Show success toast
      toast.success('Connection restored! You are back online.', {
        duration: 3000,
        icon: '🌐',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      })
    }

    const handleOffline = () => {
      console.log('[OfflineDetector] Connection lost')
      setIsOnline(false)
      
      // Show offline toast only once
      if (!hasShownOfflineToast) {
        toast.error('You are offline. Some features may not be available.', {
          duration: 5000,
          icon: '📡',
          style: {
            background: '#EF4444',
            color: '#fff',
          },
        })
        setHasShownOfflineToast(true)
      }

      // Redirect to offline page after a short delay
      setTimeout(() => {
        if (!navigator.onLine) {
          router.push('/offline')
        }
      }, 2000)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic connectivity check (every 30 seconds)
    const checkConnectivity = async () => {
      try {
        const response = await fetch('/manifest.json', {
          method: 'HEAD',
          cache: 'no-cache',
        })
        
        if (!response.ok && navigator.onLine) {
          // Server is down but browser thinks we're online
          console.log('[OfflineDetector] Server appears to be down')
          handleOffline()
        }
      } catch (error) {
        // Network error
        if (navigator.onLine) {
          console.log('[OfflineDetector] Network error detected')
          handleOffline()
        }
      }
    }

    const intervalId = setInterval(checkConnectivity, 30000)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [router, pathname, hasShownOfflineToast])

  // This component doesn't render anything
  return null
}

