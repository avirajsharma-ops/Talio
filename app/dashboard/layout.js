'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import PWAInstaller, { OfflineIndicator } from '@/components/PWAInstaller'
import OutOfPremisesPopup from '@/components/OutOfPremisesPopup'
import NotificationBanner from '@/components/NotificationBanner'
import OfflineDetector from '@/components/OfflineDetector'
import ThemeMetaTags from '@/components/ThemeMetaTags'
import { useNotificationInit } from '@/hooks/useNotifications'
import useGeofencing from '@/hooks/useGeofencing'
import { SocketProvider } from '@/contexts/SocketContext'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Initialize notifications
  useNotificationInit()

  // Initialize geofencing
  useGeofencing()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Check if current page is chat
  const isChatPage = pathname?.startsWith('/dashboard/chat')

  return (
    <SocketProvider>
      <div className="flex h-screen relative" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        {/* Dynamic theme meta tags for mobile browser bars */}
        <ThemeMetaTags />

        {/* Offline Detector - Monitors connection and redirects to offline page */}
        <OfflineDetector />

        {/* Notification Banner - Shows when notifications are disabled */}
        <NotificationBanner />

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
    </SocketProvider>
  )
}

