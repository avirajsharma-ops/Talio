'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FaBars, FaBell, FaUser, FaSignOutAlt, FaCog, FaSearch, FaComments, FaTimes, FaSpinner } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { PWAStatus } from '@/components/PWAInstaller'

export default function Header({ toggleSidebar }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [searching, setSearching] = useState(false)
  const notifRef = useRef(null)
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const searchTimeoutRef = useRef(null)

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
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Search functionality
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults(null)
      setShowSearchResults(false)
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()
        if (result.success) {
          setSearchResults(result.data)
          setShowSearchResults(true)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const handleSearchResultClick = (link) => {
    setShowSearchResults(false)
    setShowMobileSearch(false)
    setSearchQuery('')
    router.push(link)
  }

  const closeMobileSearch = () => {
    setShowMobileSearch(false)
    setSearchQuery('')
    setSearchResults(null)
    setShowSearchResults(false)
  }

  const getResultIcon = (type) => {
    const icons = {
      employee: '👤',
      task: '📋',
      leave: '🏖️',
      attendance: '⏰',
      department: '🏢',
      designation: '💼',
      document: '📄',
      asset: '💻',
      announcement: '📢',
      policy: '📜'
    }
    return icons[type] || '📌'
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
          <div ref={searchRef} className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 sm:px-4 py-2 w-64 lg:w-96 relative">
            <FaSearch className="text-gray-400 mr-2 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search everything..."
              className="bg-transparent border-none focus:outline-none w-full text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setShowSearchResults(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            )}
            {searching && <FaSpinner className="animate-spin text-blue-600 ml-2 w-4 h-4" />}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto z-50">
                {Object.entries(searchResults).map(([category, items]) => {
                  if (items.length === 0) return null
                  return (
                    <div key={category} className="border-b border-gray-100 last:border-b-0">
                      <div className="px-4 py-2 bg-gray-50 font-semibold text-xs text-gray-600 uppercase sticky top-0">
                        {category} ({items.length})
                      </div>
                      {items.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => handleSearchResultClick(item.link)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl flex-shrink-0">{getResultIcon(item.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm text-gray-900 truncate">{item.title}</h4>
                                {item.meta && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.meta}</span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className="text-xs text-gray-600 mb-1">{item.subtitle}</p>
                              )}
                              {item.description && (
                                <p className="text-xs text-gray-500 truncate">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
                {Object.values(searchResults).every(arr => arr.length === 0) && (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <FaSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">

          <h1 className="text-blue-600 text-l">HOME</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Chat Button - Desktop Only */}
          <button
            onClick={() => router.push('/dashboard/chat')}
            className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FaComments className="w-5 h-5" />
            <span className="text-sm font-medium">Chat</span>
          </button>

          {/* PWA Status */}
          <PWAStatus />

          {/* Mobile Search Icon */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FaSearch className="w-5 h-5" />
          </button>

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

      {/* Mobile Search Fullscreen Modal */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-white z-[100] md:hidden">
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <button
                onClick={closeMobileSearch}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search everything..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults(null)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                )}
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FaSpinner className="animate-spin text-blue-600 w-5 h-5" />
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                  <FaSearch className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Search Everything</p>
                  <p className="text-sm text-center mt-2">
                    Find employees, tasks, leaves, documents, and more...
                  </p>
                </div>
              ) : searching ? (
                <div className="flex items-center justify-center h-full">
                  <FaSpinner className="animate-spin text-blue-600 w-8 h-8" />
                </div>
              ) : searchResults ? (
                <div>
                  {Object.entries(searchResults).map(([category, items]) => {
                    if (items.length === 0) return null
                    return (
                      <div key={category} className="border-b border-gray-100">
                        <div className="px-4 py-3 bg-gray-50 font-semibold text-sm text-gray-700 uppercase sticky top-0">
                          {category} ({items.length})
                        </div>
                        {items.map((item) => (
                          <div
                            key={item._id}
                            onClick={() => handleSearchResultClick(item.link)}
                            className="px-4 py-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer border-b border-gray-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-3xl flex-shrink-0">{getResultIcon(item.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-base text-gray-900">{item.title}</h4>
                                </div>
                                {item.subtitle && (
                                  <p className="text-sm text-gray-600 mb-1">{item.subtitle}</p>
                                )}
                                {item.description && (
                                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                                )}
                                {item.meta && (
                                  <span className="inline-block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2">
                                    {item.meta}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  {Object.values(searchResults).every(arr => arr.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 py-12">
                      <FaSearch className="w-16 h-16 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm text-center mt-2">
                        Try searching with different keywords
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

