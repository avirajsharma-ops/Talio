'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  FaChevronRight,
  FaTimes,
  FaUsers
} from 'react-icons/fa'
import { useState, useEffect, useMemo } from 'react'
import { getMenuItemsForRole } from '@/utils/roleBasedMenus'

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState({})
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [isDepartmentHead, setIsDepartmentHead] = useState(false)

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
          { name: 'Task Approvals', path: '/dashboard/team/task-approvals' },
          { name: 'Team Tasks', path: '/dashboard/tasks/team-tasks' },
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
          fixed lg:static inset-y-0 left-0 z-[70]
          w-[70vw] md:w-64 bg-gray-900 text-white
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto scrollbar-hide
        `}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <img
              src="/talio-logo.png"
              alt="Talio Logo"
              className="h-10 w-auto object-contain"
            />
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-white hover:text-gray-300 focus:outline-none"
            >
              <FaTimes className="w-4 h-4" strokeWidth="0.5" />
            </button>
          </div>
        </div>

        <nav className="px-3 sm:px-4 py-4 space-y-2">
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.submenu ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(item.name)}
                    className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl transition-all duration-200 group ${
                      expandedMenus[item.name]
                        ? 'bg-gray-800 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg transition-colors ${
                        expandedMenus[item.name]
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 group-hover:bg-blue-500 group-hover:text-white'
                      }`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${
                      expandedMenus[item.name] ? 'rotate-90' : ''
                    }`}>
                      <FaChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                  {expandedMenus[item.name] && (
                    <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-700 pl-4">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          onClick={handleLinkClick}
                          className={`w-full text-left block px-3 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer ${
                            pathname === subItem.path
                              ? 'bg-blue-500 text-white shadow-md transform scale-105'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white hover:translate-x-1'
                          }`}
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
                  className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
                    pathname === item.path
                      ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-md'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 group-hover:bg-blue-500 group-hover:text-white'
                  }`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

