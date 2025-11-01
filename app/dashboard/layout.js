'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import PWAInstaller, { OfflineIndicator } from '@/components/PWAInstaller'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 lg:p-8 relative z-0 pb-14 md:pb-6">
          {children}
        </main>

        {/* Bottom Navigation for Mobile */}
        <BottomNav />
      </div>

      {/* PWA Install Prompt */}
      <PWAInstaller />
    </div>
  )
}

