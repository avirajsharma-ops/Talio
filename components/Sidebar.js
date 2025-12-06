'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FaChevronRight,
  FaTimes,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaComments
} from 'react-icons/fa'
import { useState, useEffect, useMemo } from 'react'
import { getMenuItemsForRole } from '@/utils/roleBasedMenus'
import toast from 'react-hot-toast'
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext'
import { useChatWidget } from '@/contexts/ChatWidgetContext'
import UnreadBadge from './UnreadBadge'

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedMenus, setExpandedMenus] = useState({})
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const { unreadCount } = useUnreadMessages()
  const { toggleWidget } = useChatWidget()

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Load user only once on mount
  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      checkDepartmentHead()
    }
  }, [])

  // Check if user is a department head
  const checkDepartmentHead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/team/check-head', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success && data.isDepartmentHead) {
        setIsDepartmentHead(true)
      }
    } catch (error) {
      console.error('Error checking department head:', error)
    }
  }

  // Get menu items based on user role (memoized)
  // NOTE: MAYA AI Assistant has been removed from web - only available in desktop apps
  const menuItems = useMemo(() => {
    if (!user) return []
    let baseMenuItems = getMenuItemsForRole(user.role)

    // Add Team menu item if user is a department head
    if (isDepartmentHead) {
      // Insert Team menu after Dashboard - includes Performance options
      const teamMenuItem = {
        name: 'Team',
        icon: FaUsers,
        path: '/dashboard/team',
        submenu: [
          { name: 'Team Dashboard', path: '/dashboard/team' },
          { name: 'Team Members', path: '/dashboard/team/members' },
          { name: 'Team Reviews', path: '/dashboard/performance/reviews' },
          { name: 'Team Goals', path: '/dashboard/performance/goals' },
          { name: 'Performance Reports', path: '/dashboard/performance/reports' },
          { name: 'Geofencing', path: '/dashboard/team/geofencing' }
        ]
      }

      // Override Attendance & Leaves menu for department heads with Team Attendance and Regularisation
      const attendanceMenuIndex = baseMenuItems.findIndex(item => item.name === 'Attendance & Leaves')
      if (attendanceMenuIndex !== -1) {
        baseMenuItems = [...baseMenuItems]
        baseMenuItems[attendanceMenuIndex] = {
          ...baseMenuItems[attendanceMenuIndex],
          submenu: [
            { name: 'My Attendance', path: '/dashboard/attendance' },
            { name: 'Team Attendance', path: '/dashboard/attendance/team' },
            { name: 'Attendance Regularisation', path: '/dashboard/team/regularisation' },
            { name: 'Apply Leave', path: '/dashboard/leave/apply' },
            { name: 'My Leave Balance', path: '/dashboard/leave/balance' },
            { name: 'My Leave Requests', path: '/dashboard/leave/requests' },
            { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
          ]
        }
      }

      return [
        baseMenuItems[0], // Dashboard
        teamMenuItem,
        ...baseMenuItems.slice(1)
      ]
    }

    return baseMenuItems
  }, [user, isDepartmentHead])

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }))
  }

  const handleLinkClick = () => {
    // Close mobile sidebar when link is clicked
    setIsOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
    toast.success('Logged out successfully')
    router.push('/login')
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Mobile overlay with backdrop blur - smooth fade animation */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
          style={{
            animation: 'fadeInBackdrop 0.5s ease-out forwards'
          }}
        />
      )}

      {/* Sidebar - smooth slide animation */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-[60] lg:z-[7]
          text-gray-800
          transform flex flex-col h-screen shadow-lg
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-full md:w-[17rem]
          ${isDesktop && isCollapsed ? 'lg:!w-[4.5rem]' : ''}
        `}
        style={{ 
          backgroundColor: 'var(--color-bg-sidebar)',
          transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), width 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        {/* Sticky Logo Section - Height matched with header */}
        <div className="h-[60.5px] px-3 sm:px-4 flex-shrink-0 flex items-center" style={{ borderBottom: '1px solid var(--color-primary-200)' }}>
          <div className={`flex items-center w-full ${isDesktop && isCollapsed ? 'justify-center px-0' : 'justify-between px-3 sm:px-4'}`}>
            {/* Logo - show small icon when collapsed, full logo when expanded */}
            {isDesktop && isCollapsed ? (
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Expand sidebar"
              >
                <FaChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            ) : (
              <>
                <img
                  src="/assets/logo.png"
                  alt="Talio Logo"
                  className="h-10 w-auto object-contain"
                />
                {/* Desktop collapse button */}
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Collapse sidebar"
                >
                  <FaChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
                </button>
                {/* Mobile close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden hover:opacity-70 focus:outline-none"
                  style={{ color: '#374151' }}
                >
                  <FaTimes className="w-4 h-4" strokeWidth="0.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Menu Section */}
        <nav className={`pt-4 pb-0 space-y-2 flex-1 overflow-y-auto scrollbar-hide ${isDesktop && isCollapsed ? 'px-2' : 'px-3 sm:px-4'}`} style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {menuItems.map((item) => (
            <div key={item.name} className="w-full">
              {item.submenu ? (
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDesktop && isCollapsed) {
                        setIsCollapsed(false)
                        setTimeout(() => toggleSubmenu(item.name), 100)
                      } else {
                        toggleSubmenu(item.name)
                      }
                    }}
                    className={`w-full flex items-center rounded-xl transition-all duration-200 group ${isDesktop && isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 sm:px-4 py-3'}`}
                    style={{
                      backgroundColor: expandedMenus[item.name] ? 'var(--color-bg-hover)' : 'transparent',
                      color: '#111827'
                    }}
                    title={isDesktop && isCollapsed ? item.name : ''}
                  >
                    <div className={`flex items-center ${isDesktop && isCollapsed ? '' : 'space-x-3'}`}>
                      <div
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: expandedMenus[item.name] ? 'var(--color-primary-500)' : 'var(--color-primary-100)',
                          color: expandedMenus[item.name] ? 'white' : 'var(--color-primary-700)'
                        }}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>
                      {!(isDesktop && isCollapsed) && <span className="text-sm font-medium">{item.name}</span>}
                    </div>
                    {!(isDesktop && isCollapsed) && (
                      <div className={`transition-transform duration-200 ${expandedMenus[item.name] ? 'rotate-90' : ''}`}>
                        <FaChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                  {expandedMenus[item.name] && !(isDesktop && isCollapsed) && (
                    <div className="mt-2 space-y-1 ml-8 pl-3" style={{ borderLeft: '2px solid var(--color-primary-200)' }}>
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          onClick={handleLinkClick}
                          className="w-full text-left block px-3 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer"
                          style={{
                            backgroundColor: pathname === subItem.path ? 'var(--color-primary-500)' : 'transparent',
                            color: pathname === subItem.path ? 'white' : '#6B7280'
                          }}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : item.name === 'Chat' && isDesktop ? (
                // Desktop: Open floating chat widget instead of navigating
                <button
                  onClick={() => {
                    toggleWidget('sidebar')
                    handleLinkClick()
                  }}
                  className={`w-full flex items-center rounded-xl transition-all duration-200 group cursor-pointer relative ${isDesktop && isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 sm:px-4 py-3'}`}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#111827'
                  }}
                  title={isDesktop && isCollapsed ? item.name : ''}
                >
                  <div
                    className="p-2 rounded-lg transition-colors relative"
                    style={{
                      backgroundColor: 'var(--color-primary-100)',
                      color: 'var(--color-primary-700)'
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <UnreadBadge count={unreadCount} />
                    )}
                  </div>
                  {!(isDesktop && isCollapsed) && <span className="text-sm font-medium">{item.name}</span>}
                </button>
              ) : (
                <Link
                  href={item.path}
                  onClick={handleLinkClick}
                  className={`w-full flex items-center rounded-xl transition-all duration-200 group cursor-pointer relative ${isDesktop && isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 sm:px-4 py-3'}`}
                  style={{
                    backgroundColor: pathname === item.path ? 'var(--color-primary-500)' : 'transparent',
                    color: pathname === item.path ? 'white' : '#111827'
                  }}
                  title={isDesktop && isCollapsed ? item.name : ''}
                >
                  <div
                    className="p-2 rounded-lg transition-colors relative"
                    style={{
                      backgroundColor: pathname === item.path ? 'var(--color-primary-600)' : 'var(--color-primary-100)',
                      color: pathname === item.path ? 'white' : 'var(--color-primary-700)'
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name === 'Chat' && unreadCount > 0 && (
                      <UnreadBadge count={unreadCount} />
                    )}
                  </div>
                  {!(isDesktop && isCollapsed) && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Chat, Settings and Logout Section - Fixed at bottom */}
        <div className={`py-2 flex-shrink-0 ${isDesktop && isCollapsed ? 'flex flex-col gap-1 px-2' : 'flex flex-row gap-2 px-4'}`} style={{ borderTop: '1px solid var(--color-primary-200)' }}>
          {/* Chat Button - Desktop only */}
          {isDesktop && (
            <button
              onClick={() => toggleWidget('sidebar')}
              className={`flex items-center rounded-xl transition-all duration-200 group cursor-pointer relative ${isDesktop && isCollapsed ? 'justify-center p-3' : 'flex-1 justify-center space-x-2 px-2 sm:px-3 h-14'}`}
              style={{
                backgroundColor: 'transparent',
                color: '#111827'
              }}
              title={isDesktop && isCollapsed ? 'Chat' : ''}
            >
              <div
                className="p-1.5 rounded-lg transition-colors relative"
                style={{
                  backgroundColor: 'var(--color-primary-100)',
                  color: 'var(--color-primary-700)'
                }}
              >
                <FaComments className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <UnreadBadge count={unreadCount} />
                )}
              </div>
              {!(isDesktop && isCollapsed) && <span className="text-xs sm:text-sm font-medium">Chat</span>}
            </button>
          )}

          {/* Settings Button */}
          <Link
            href="/dashboard/settings"
            onClick={handleLinkClick}
            className={`flex items-center rounded-xl transition-all duration-200 group cursor-pointer ${isDesktop && isCollapsed ? 'justify-center p-3' : 'flex-1 justify-center space-x-2 px-2 sm:px-3 h-14'}`}
            style={{
              backgroundColor: pathname === '/dashboard/settings' ? 'var(--color-primary-500)' : 'transparent',
              color: pathname === '/dashboard/settings' ? 'white' : '#111827'
            }}
            title={isDesktop && isCollapsed ? 'Settings' : ''}
          >
            <div
              className="p-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: pathname === '/dashboard/settings' ? 'var(--color-primary-600)' : 'var(--color-primary-100)',
                color: pathname === '/dashboard/settings' ? 'white' : 'var(--color-primary-700)'
              }}
            >
              <FaCog className="w-3.5 h-3.5" />
            </div>
            {!(isDesktop && isCollapsed) && <span className="text-xs sm:text-sm font-medium">Settings</span>}
          </Link>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex items-center rounded-xl transition-all duration-200 group hover:bg-red-600 hover:text-white hover:shadow-md ${isDesktop && isCollapsed ? 'justify-center p-3' : 'flex-1 justify-center space-x-2 px-2 sm:px-3 h-14'}`}
            style={{ color: '#111827' }}
            title={isDesktop && isCollapsed ? 'Logout' : ''}
          >
            <div className="p-1.5 rounded-lg transition-colors group-hover:bg-red-700 group-hover:text-white" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
              <FaSignOutAlt className="w-3.5 h-3.5" />
            </div>
            {!(isDesktop && isCollapsed) && <span className="text-xs sm:text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] animate-fade-in"
            onClick={() => setShowLogoutConfirm(false)}
            style={{
              animation: 'fadeInBackdrop 0.2s ease-out forwards'
            }}
          />

          {/* Confirmation Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-sm">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-red-500 text-white">
                <h3 className="text-lg font-semibold">Confirm Logout</h3>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <p className="text-gray-700 text-center">
                  Are you sure you want to logout?
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

