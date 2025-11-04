'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import PWAInstaller, { OfflineIndicator } from '@/components/PWAInstaller'
import NotificationPermissionPopup from '@/components/NotificationPermissionPopup'
import { useNotificationInit } from '@/hooks/useNotifications'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Initialize notifications
  useNotificationInit()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Offline Indicator */}
        <OfflineIndicator />

        <Header toggleSidebar={toggleSidebar} />

        {/* Main content with padding for fixed header and bottom nav */}
        <main className="flex-1 overflow-y-auto md:mb-0 mb-8 px-4 sm:px-6 lg:px-8 pt-24 sm:pt-24 pb-32 md:pb-6 relative z-0">
          {children}
        </main>

        {/* Gradient above bottom nav - Mobile only */}
        <div className="md:hidden fixed bottom-[72px] left-0  right-0 h-[96px] pointer-events-none z-[39]"
             style={{ background: 'linear-gradient(179.13deg, rgba(249, 250, 251, 0) 0%, #F9FAFB 71.18%)' }}>
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav />
      </div>

      {/* PWA Install Prompt */}
      <PWAInstaller />

      {/* Notification Permission Popup */}
      <NotificationPermissionPopup />
    </div>
  )
}

