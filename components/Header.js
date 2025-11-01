'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FaBars, FaBell, FaUser, FaSignOutAlt, FaCog, FaSearch } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { PWAStatus } from '@/components/PWAInstaller'

export default function Header({ toggleSidebar }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mounted, setMounted] = useState(false)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    toast.success('Logged out successfully')
    router.push('/login')
  }

  // Don't render user-specific content until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-1 sm:px-4 lg:px-6  md:ml-0 md:m-0  m-[-15px] ml-[-10px] mr-[-10px] sm:py-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none p-1"
            >
              <FaBars className="w-8 h-8 sm:w-6 sm:h-6" />
            </button>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-1 sm:px-4 lg:px-6  md:ml-0 md:m-0  m-[-15px] ml-[-10px] mr-[-10px] sm:py-4">
        {/* Left side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none p-1"
          >
            <FaBars className="w-8 h-8 sm:w-6 sm:h-6" />
          </button>

          {/* Search bar */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 sm:px-4 py-2 w-64 lg:w-96">
            <FaSearch className="text-gray-400 mr-2 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees, documents..."
              className="bg-transparent border-none focus:outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">

          <h1 className="text-blue-600 text-l">HOME</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* PWA Status */}
          <PWAStatus />

          {/* Notifications */}
          {/* <div ref={notifRef} className="relative mt-3 md:mt-0">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 sm:p-2  text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaBell className="w-[25px] h-[25px] sm:w-5 sm:h-5 mt-[-5px] md:mt-0 md:mr-0 mr-[-5px]" />
              <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-[1px] h-[1px] p-[5px]  bg-red-600 rounded-full"></div>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-900">New leave request from John Doe</p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-900">Payroll processed for December</p>
                    <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-900">New announcement posted</p>
                    <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-200 text-center">
                  <a href="/dashboard/notifications" className="text-sm text-primary-600 hover:text-primary-700">
                    View all notifications
                  </a>
                </div>
              </div>
            )}
          </div> */}

          {/* Profile menu */}
          <div ref={profileRef} className="relative mt-1 md:mt-0">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-[30px] h-[30px] sm:w-8 sm:h-8 bg-primary-500 rounded-full flex items-center justify-center">
                {/* <img src=""> */}
                <FaUser className="w-4 h-4 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">{user?.email || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Employee'}</p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <a
                  href="/dashboard/profile"
                  className="flex items-center space-x-2 px-2 md:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FaUser className="w-4 h-4" />
                  <span>My Profile</span>
                </a>
                <a
                  href="/dashboard/settings"
                  className="flex items-center space-x-2 px-2 py-2 md:px-4 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FaCog className="w-4 h-4" />
                  <span>Settings</span>
                </a>
                <hr className="my-2" />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-2 md:px-4 py-2 md:pl-4  text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

