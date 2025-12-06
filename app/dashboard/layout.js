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
import { getCurrentUser, getEmployeeId, syncUserData, getToken } from '@/utils/userHelper'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userId, setUserId] = useState(null)
  const pathname = usePathname()

  // Sync user data on mount to ensure employee info is complete
  useEffect(() => {
    const syncEmployeeData = async () => {
      const user = getCurrentUser()
      const token = getToken()
      
      if (!user || !token) return
      
      // Check if we need to sync (missing firstName or employeeId structure is incomplete)
      const needsSync = !user.firstName || 
        (user.employeeId && typeof user.employeeId !== 'object') ||
        (user.employeeId && !user.employeeId.firstName)
      
      if (needsSync) {
        const empId = getEmployeeId(user)
        if (empId) {
          try {
            console.log('[Dashboard] Syncing employee data...')
            const response = await fetch(`/api/employees/${empId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            const result = await response.json()
            if (result.success && result.data) {
              syncUserData(result.data)
              console.log('[Dashboard] Employee data synced:', result.data.firstName, result.data.lastName)
            }
          } catch (error) {
            console.error('[Dashboard] Error syncing employee data:', error)
          }
        }
      }
    }
    
    syncEmployeeData()
  }, [])

  // Get user ID from localStorage and initialize desktop app
  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserId(user.id || user._id)
        
        // Initialize desktop app monitoring if running in Electron
        if ((window.talioDesktop || window.electronAPI) && token) {
          const desktopAPI = window.talioDesktop || window.electronAPI
          console.log('[Dashboard] Initializing desktop app monitoring...')
          
          // Set auth to start monitoring
          if (desktopAPI.setAuth) {
            desktopAPI.setAuth(token, user).catch(err => {
              console.error('[Dashboard] Desktop setAuth error:', err)
            })
          }
        }
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

  // Check if current page is a bottom nav page (excluding chat which doesn't show fade)
  const isBottomNavPage = 
    pathname === '/dashboard' || 
    pathname?.startsWith('/dashboard/tasks') || 
    pathname?.startsWith('/dashboard/leave') ||
    pathname?.startsWith('/dashboard/sandbox')
  
  // Chat pages don't show the fade
  const isChatPage = pathname?.startsWith('/dashboard/chat')
  
  // Only show fade on bottom nav pages (not chat)
  const shouldShowFade = isBottomNavPage && !isChatPage

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
              <main className={`flex-1 overflow-y-auto md:mb-0 mb-8 pt-24 sm:pt-24 pb-32 md:pb-6 relative z-0 ${isChatPage ? 'px-0 md:px-4 lg:px-8 bg-white md:bg-transparent' : 'px-4 sm:px-6 lg:px-8'}`}>
                {children}
              </main>

              {/* Gradient above bottom nav - Mobile only - Only on bottom nav pages (excluding chat) */}
              <div 
                className="md:hidden fixed bottom-[72px] left-0 right-0 h-[124px] pointer-events-none z-[39]"
                style={{ 
                  background: `linear-gradient(179.13deg, rgba(249, 250, 251, 0) 0%, var(--color-bg-main) 71.18%)`,
                  opacity: shouldShowFade ? 1 : 0,
                  transform: shouldShowFade ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.6s ease-in-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              />

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

