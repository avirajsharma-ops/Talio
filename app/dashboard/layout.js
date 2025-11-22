'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import PWAInstaller, { OfflineIndicator } from '@/components/PWAInstaller'
import OutOfPremisesPopup from '@/components/OutOfPremisesPopup'
import OfflineDetector from '@/components/OfflineDetector'

import useGeofencing from '@/hooks/useGeofencing'
import { SocketProvider } from '@/contexts/SocketContext'
import { UnreadMessagesProvider } from '@/contexts/UnreadMessagesContext'
import { InAppNotificationProvider } from '@/contexts/InAppNotificationContext'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userId, setUserId] = useState(null)
  const pathname = usePathname()

  // Get user ID from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserId(user.id || user._id)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  // Initialize geofencing
  useGeofencing()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Check if current page is chat
  const isChatPage = pathname?.startsWith('/dashboard/chat')

  return (
    <SocketProvider>
      <UnreadMessagesProvider>
        <InAppNotificationProvider>
          <div className="flex h-screen relative" style={{ backgroundColor: 'var(--color-bg-main)' }}>


            {/* Offline Detector - Monitors connection and redirects to offline page */}
            <OfflineDetector />

            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Offline Indicator */}
              <OfflineIndicator />

              <Header toggleSidebar={toggleSidebar} />

              {/* Main content with padding for fixed header and bottom nav */}
              <main className="flex-1 overflow-y-auto md:mb-0 mb-8 px-4 sm:px-6 lg:px-8 pt-24 sm:pt-24 pb-32 md:pb-6 relative z-0">
                {children}
              </main>

              {/* Gradient above bottom nav - Mobile only - Hide on chat page */}
              {!isChatPage && (
                <div className="md:hidden fixed bottom-[72px] left-0  right-0 h-[124px] pointer-events-none z-[39]"
                  style={{ background: `linear-gradient(179.13deg, rgba(249, 250, 251, 0) 0%, var(--color-bg-main) 71.18%)` }}>
                </div>
              )}

              {/* Bottom Navigation for Mobile */}
              <BottomNav />
            </div>

            {/* PWA Install Prompt */}
            <PWAInstaller />

            {/* Out of Premises Popup */}
            <OutOfPremisesPopup />
          </div>
        </InAppNotificationProvider>
      </UnreadMessagesProvider>
    </SocketProvider>
  )
}

