'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FaChevronRight,
  FaTimes,
  FaUsers,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa'
import { useState, useEffect, useMemo } from 'react'
import { getMenuItemsForRole } from '@/utils/roleBasedMenus'
import toast from 'react-hot-toast'
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext'
import UnreadBadge from './UnreadBadge'

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedMenus, setExpandedMenus] = useState({})
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { unreadCount } = useUnreadMessages()

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
  const menuItems = useMemo(() => {
    if (!user) return []
    const baseMenuItems = getMenuItemsForRole(user.role)

    // Add Team menu item if user is a department head
    if (isDepartmentHead) {
      // Insert Team menu after Dashboard
      const teamMenuItem = {
        name: 'Team',
        icon: FaUsers,
        path: '/dashboard/team',
        submenu: [
          { name: 'Team Dashboard', path: '/dashboard/team' },
          { name: 'Team Members', path: '/dashboard/team/members' },
          { name: 'Leave Approvals', path: '/dashboard/team/leave-approvals' },
          { name: 'Project Approvals', path: '/dashboard/team/task-approvals' },
          { name: 'Team Projects', path: '/dashboard/tasks/team-tasks' },
          { name: 'Geofencing', path: '/dashboard/team/geofencing' }
        ]
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
      {/* Mobile overlay with backdrop blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-[60] lg:z-[7]
          w-[70vw] md:w-[17rem] text-gray-800
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col h-screen
        `}
        style={{ backgroundColor: 'var(--color-bg-sidebar)' }}
      >
        {/* Sticky Logo Section */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-primary-200)' }}>
          <div className="flex items-center justify-between">
            <div className="bg-white rounded-full px-4 py-2 flex items-center justify-center">
              <img
                src="/assets/logo.png"
                alt="Talio Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden hover:opacity-70 focus:outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <FaTimes className="w-4 h-4" strokeWidth="0.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Menu Section */}
        <nav className="px-3 sm:px-4 pt-4 pb-0 space-y-2 flex-1 overflow-y-auto scrollbar-hide" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.submenu ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(item.name)}
                    className="w-full flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl transition-all duration-200 group"
                    style={{
                      backgroundColor: expandedMenus[item.name] ? 'var(--color-bg-hover)' : 'transparent',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: expandedMenus[item.name] ? 'var(--color-primary-500)' : 'var(--color-primary-100)',
                          color: expandedMenus[item.name] ? 'white' : 'var(--color-primary-700)'
                        }}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${expandedMenus[item.name] ? 'rotate-90' : ''
                      }`}>
                      <FaChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                  {expandedMenus[item.name] && (
                    <div className="ml-4 mt-2 space-y-1 pl-4" style={{ borderLeft: '2px solid var(--color-primary-200)' }}>
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          onClick={handleLinkClick}
                          className="w-full text-left block px-3 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer"
                          style={{
                            backgroundColor: pathname === subItem.path ? 'var(--color-primary-500)' : 'transparent',
                            color: pathname === subItem.path ? 'white' : 'var(--color-text-secondary)'
                          }}
                        >
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-current rounded-full mr-3 opacity-60"></span>
                            {subItem.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.path}
                  onClick={handleLinkClick}
                  className="w-full flex items-center space-x-3 px-3 sm:px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer relative"
                  style={{
                    backgroundColor: pathname === item.path ? 'var(--color-primary-500)' : 'transparent',
                    color: pathname === item.path ? 'white' : 'var(--color-text-primary)'
                  }}
                >
                  <div
                    className="p-2 rounded-lg transition-colors relative"
                    style={{
                      backgroundColor: pathname === item.path ? 'var(--color-primary-600)' : 'var(--color-primary-100)',
                      color: pathname === item.path ? 'white' : 'var(--color-primary-700)'
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name === 'Messages' && unreadCount > 0 && (
                      <UnreadBadge count={unreadCount} />
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Settings and Logout Section - Fixed at bottom */}
        <div className="flex flex-row gap-2 py-2 px-4 flex-shrink-0" style={{ borderTop: '1px solid var(--color-primary-200)' }}>
          {/* Settings Button */}
          <Link
            href="/dashboard/settings"
            onClick={handleLinkClick}
            className="flex-1 flex items-center justify-center space-x-2 px-2 sm:px-3 h-14 rounded-xl transition-all duration-200 group cursor-pointer"
            style={{
              backgroundColor: pathname === '/dashboard/settings' ? 'var(--color-primary-500)' : 'transparent',
              color: pathname === '/dashboard/settings' ? 'white' : 'var(--color-text-primary)'
            }}
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
            <span className="text-xs sm:text-sm font-medium">Settings</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex-1 flex items-center justify-center space-x-2 px-2 sm:px-3 h-14 rounded-xl transition-all duration-200 group hover:bg-red-600 hover:text-white hover:shadow-md"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <div className="p-1.5 rounded-lg transition-colors group-hover:bg-red-700 group-hover:text-white" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
              <FaSignOutAlt className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
            onClick={() => setShowLogoutConfirm(false)}
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

