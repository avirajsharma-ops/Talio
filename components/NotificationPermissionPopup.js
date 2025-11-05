'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaTimes, FaCheck, FaMapMarkerAlt } from 'react-icons/fa'
import toast from 'react-hot-toast'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  hasUserDismissedNotificationPrompt,
  markNotificationPromptDismissed,
  saveNotificationPreference,
  subscribeToPushNotifications,
  savePushSubscriptionToServer
} from '@/utils/notifications'

export default function NotificationPermissionPopup() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState('default') // 'default', 'granted', 'denied'
  const [locationStatus, setLocationStatus] = useState('prompt') // 'prompt', 'granted', 'denied'
  const [locationServiceOff, setLocationServiceOff] = useState(false) // Location permission granted but service is off
  const [showHelp, setShowHelp] = useState(false)
  const [browserInfo, setBrowserInfo] = useState({ name: 'Unknown', isMobile: false })
  const [lastLocationCheck, setLastLocationCheck] = useState(0)

  // Detect browser
  useEffect(() => {
    const ua = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)

    let name = 'Unknown'
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) name = 'Chrome'
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) name = 'Safari'
    else if (ua.indexOf('Firefox') > -1) name = 'Firefox'
    else if (ua.indexOf('Edg') > -1) name = 'Edge'

    setBrowserInfo({ name, isMobile })
  }, [])

  // Check permissions status
  useEffect(() => {
    console.log('🔍 [Permissions] Checking permission status...')

    // Check if notifications are supported
    if (!isNotificationSupported()) {
      console.log('❌ [Permissions] Notifications not supported')
      return
    }

    const checkPermissionStatus = async () => {
      try {
        // 1. Check notification permission
        const notifPermission = getNotificationPermission()
        console.log('🔔 [Permissions] Notification:', notifPermission)
        setNotificationStatus(notifPermission)

        // 2. Check location permission using Permissions API
        let locPermission = 'prompt'
        if (navigator.permissions) {
          try {
            const result = await navigator.permissions.query({ name: 'geolocation' })
            locPermission = result.state // 'granted', 'denied', or 'prompt'
            console.log('📍 [Permissions] Location permission:', locPermission)

            // Listen for permission changes
            result.onchange = () => {
              console.log('📍 [Permissions] Location permission changed to:', result.state)
              setLocationStatus(result.state)
            }
          } catch (error) {
            console.warn('⚠️ [Permissions] Could not query location permission:', error)
          }
        }
        setLocationStatus(locPermission)

        // 3. If location permission is granted, verify location service is actually on
        if (locPermission === 'granted') {
          // Only check location service every 5 seconds to avoid excessive checks
          const now = Date.now()
          if (now - lastLocationCheck > 5000) {
            setLastLocationCheck(now)
            checkLocationService()
          }
        } else {
          setLocationServiceOff(false)
        }

        // 4. Determine if we should show the prompt
        const allGranted = notifPermission === 'granted' && locPermission === 'granted'

        if (allGranted) {
          console.log('✅ [Permissions] All permissions granted')
          setPermissionGranted(true)
          setShowPrompt(false)
        } else {
          console.log('⚠️ [Permissions] Missing permissions - showing prompt')
          setShowPrompt(true)
          setPermissionGranted(false)
        }
      } catch (error) {
        console.error('❌ [Permissions] Error checking permissions:', error)
      }
    }

    // Check location service status (separate from permission)
    const checkLocationService = () => {
      if (!navigator.geolocation) {
        console.warn('⚠️ [Permissions] Geolocation API not available')
        return
      }

      // Try to get current position with a short timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ [Permissions] Location service is ON')
          setLocationServiceOff(false)
        },
        (error) => {
          if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
            console.warn('⚠️ [Permissions] Location service might be OFF')
            setLocationServiceOff(true)
          } else if (error.code === error.PERMISSION_DENIED) {
            console.log('❌ [Permissions] Location permission denied')
            setLocationStatus('denied')
            setLocationServiceOff(false)
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 60000 // Accept cached position up to 1 minute old
        }
      )
    }

    // Initial check
    checkPermissionStatus()

    // Set up interval to check permission status every 2 seconds
    const interval = setInterval(() => {
      checkPermissionStatus()
    }, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [lastLocationCheck])

  const handleEnablePermissions = async () => {
    console.log('🔘 [Permissions] User clicked enable button')
    setIsRequesting(true)

    try {
      let notificationGranted = false
      let locationGranted = false

      // STEP 1: Request Notification Permission First
      console.log('🔔 [Permissions] Requesting notification permission...')

      if (typeof Notification === 'undefined') {
        toast.error('Notifications are not supported in this browser', {
          duration: 5000,
          icon: '❌'
        })
        setIsRequesting(false)
        return
      }

      const currentNotifPermission = Notification.permission
      console.log('🔔 [Permissions] Current notification permission:', currentNotifPermission)

      if (currentNotifPermission === 'granted') {
        notificationGranted = true
        console.log('✅ [Permissions] Notifications already granted')
      } else if (currentNotifPermission === 'denied') {
        console.log('❌ [Permissions] Notifications are DENIED - showing manual instructions')
        setNotificationStatus('denied')
        toast.error(
          `Notifications are blocked. To enable:\n1. Click the lock icon (🔒) in the address bar\n2. Change "Notifications" to "Allow"\n3. Refresh the page`,
          {
            duration: 15000,
            icon: '🔔',
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          }
        )
        setIsRequesting(false)
        return
      } else {
        // Permission is 'default' - trigger native popup
        console.log('🔔 [Permissions] Triggering NATIVE notification popup...')
        try {
          const permission = await Notification.requestPermission()
          console.log('🔔 [Permissions] Notification permission result:', permission)
          notificationGranted = permission === 'granted'
          setNotificationStatus(permission)

          if (permission === 'denied') {
            toast.error('Notification permission was denied. Please enable it in browser settings.', {
              duration: 5000,
              icon: '❌'
            })
            setIsRequesting(false)
            return
          }
        } catch (error) {
          console.error('❌ [Permissions] Error requesting notification permission:', error)
          toast.error('Failed to request notification permission', {
            duration: 4000
          })
          setIsRequesting(false)
          return
        }
      }

      // STEP 2: Request Location Permission
      console.log('📍 [Permissions] Requesting location permission...')

      if (!navigator.geolocation) {
        toast.error('Location services are not supported in this browser', {
          duration: 5000,
          icon: '❌'
        })
        setIsRequesting(false)
        return
      }

      // Check current location permission status
      let currentLocPermission = 'prompt'
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' })
          currentLocPermission = result.state
          console.log('📍 [Permissions] Current location permission:', currentLocPermission)
        } catch (error) {
          console.warn('⚠️ [Permissions] Could not query location permission')
        }
      }

      if (currentLocPermission === 'denied') {
        console.log('❌ [Permissions] Location is DENIED - showing manual instructions')
        setLocationStatus('denied')
        toast.error(
          `Location is blocked. To enable:\n1. Click the lock icon (🔒) in the address bar\n2. Change "Location" to "Allow"\n3. Refresh the page`,
          {
            duration: 15000,
            icon: '📍',
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          }
        )
        setIsRequesting(false)
        return
      }

      // Trigger native location popup by requesting current position
      console.log('📍 [Permissions] Triggering NATIVE location popup...')
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ [Permissions] Location permission granted:', position)
              locationGranted = true
              setLocationStatus('granted')
              setLocationServiceOff(false)
              resolve(position)
            },
            (error) => {
              console.error('❌ [Permissions] Location error:', error)

              if (error.code === error.PERMISSION_DENIED) {
                setLocationStatus('denied')
                toast.error('Location permission was denied. Please enable it in browser settings.', {
                  duration: 5000,
                  icon: '❌'
                })
                reject(error)
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                // Permission granted but location service is off
                console.warn('⚠️ [Permissions] Location service is OFF')
                setLocationServiceOff(true)
                toast.error(
                  'Location service is turned off. Please enable location services in your device settings.',
                  {
                    duration: 8000,
                    icon: '📍',
                    style: {
                      whiteSpace: 'pre-line',
                      maxWidth: '500px'
                    }
                  }
                )
                reject(error)
              } else if (error.code === error.TIMEOUT) {
                console.warn('⚠️ [Permissions] Location request timed out')
                toast.error('Location request timed out. Please try again.', {
                  duration: 4000
                })
                reject(error)
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            }
          )
        })
      } catch (locError) {
        console.error('❌ [Permissions] Location permission error:', locError)
        setIsRequesting(false)
        return
      }

      // STEP 3: Check if both permissions are granted
      if (notificationGranted && locationGranted) {
        console.log('🎉 [Permissions] ALL PERMISSIONS GRANTED!')
        setPermissionGranted(true)
        saveNotificationPreference(true)
        setShowPrompt(false)

        toast.success('All permissions enabled successfully!', {
          duration: 3000,
          icon: '🎉'
        })

        // Subscribe to push notifications
        setTimeout(async () => {
          try {
            console.log('📲 [Permissions] Subscribing to push notifications...')
            const subscription = await subscribeToPushNotifications()

            if (subscription) {
              await savePushSubscriptionToServer(subscription)
              console.log('✅ [Permissions] Push subscription saved to server')
            }

            // Show a test notification
            await showNotification('🎉 All Permissions Enabled!', {
              body: 'You will now receive important updates and geofencing features are active.',
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-96x96.png',
              tag: 'permission-success',
              requireInteraction: false,
              vibrate: [200, 100, 200]
            })
          } catch (notifError) {
            console.error('❌ [Permissions] Error in post-permission setup:', notifError)
          }
        }, 1000)
      } else {
        console.log('⚠️ [Permissions] Some permissions are still missing')
        const missingPerms = []
        if (!notificationGranted) missingPerms.push('Notifications')
        if (!locationGranted) missingPerms.push('Location')

        toast.error(`${missingPerms.join(' and ')} ${missingPerms.length > 1 ? 'are' : 'is'} still required.`, {
          duration: 5000,
          icon: '⚠️'
        })
      }
    } catch (error) {
      console.error('❌ [Permissions] Unexpected error:', error)
      toast.error('An error occurred. Please try again.', {
        duration: 4000
      })
    } finally {
      setIsRequesting(false)
    }
  }

  // Determine UI state
  const isBlocked = notificationStatus === 'denied' || locationStatus === 'denied'
  const needsAction = !permissionGranted

  if (!showPrompt) {
    return null
  }

  return (
    <>
      {/* Backdrop - Non-dismissible */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] animate-fade-in"
      />

      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-md animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`p-6 text-white relative ${isBlocked ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-full flex items-center gap-2">
                <FaBell className="w-6 h-6" />
                <FaMapMarkerAlt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {isBlocked ? 'Permissions Blocked' : 'Enable Permissions'}
                </h3>
                <p className={`text-sm mt-1 ${isBlocked ? 'text-red-100' : 'text-blue-100'}`}>
                  {isBlocked ? 'Manual Action Required' : 'Notifications & Location Access'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Permission Status Display */}
            <div className="mb-4 space-y-2">
              {/* Notification Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaBell className={`w-4 h-4 ${notificationStatus === 'granted' ? 'text-green-500' : notificationStatus === 'denied' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">Notifications</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  notificationStatus === 'granted' ? 'bg-green-100 text-green-700' :
                  notificationStatus === 'denied' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {notificationStatus === 'granted' ? '✓ Granted' : notificationStatus === 'denied' ? '✗ Blocked' : '⚠ Not Set'}
                </span>
              </div>

              {/* Location Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className={`w-4 h-4 ${locationStatus === 'granted' ? 'text-green-500' : locationStatus === 'denied' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">Location</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  locationStatus === 'granted' ? 'bg-green-100 text-green-700' :
                  locationStatus === 'denied' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {locationStatus === 'granted' ? '✓ Granted' : locationStatus === 'denied' ? '✗ Blocked' : '⚠ Not Set'}
                </span>
              </div>

              {/* Location Service Off Warning */}
              {locationServiceOff && locationStatus === 'granted' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-orange-800 text-sm font-medium">⚠️ Location Service is OFF</p>
                  <p className="text-orange-700 text-xs mt-1">
                    Permission is granted, but your device's location service is turned off. Please enable it in your device settings.
                  </p>
                </div>
              )}
            </div>

            {/* Instructions based on status */}
            {isBlocked ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-semibold mb-2">⚠️ Permissions are currently blocked</p>
                  <p className="text-red-700 text-sm mb-3">
                    {notificationStatus === 'denied' && locationStatus === 'denied'
                      ? 'Both Notifications and Location are blocked.'
                      : notificationStatus === 'denied'
                      ? 'Notifications are blocked.'
                      : 'Location is blocked.'}
                    {' '}Please enable manually:
                  </p>
                  <ol className="text-red-700 text-sm space-y-1.5 list-decimal list-inside">
                    <li>Click the lock icon (🔒) in your browser's address bar</li>
                    <li>Find "{notificationStatus === 'denied' ? 'Notifications' : ''}{notificationStatus === 'denied' && locationStatus === 'denied' ? ' and ' : ''}{locationStatus === 'denied' ? 'Location' : ''}"</li>
                    <li>Change to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FaBell className="text-blue-500 w-5 h-5" />
                    <h4 className="font-semibold text-gray-900">Notifications</h4>
                  </div>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">Task assignments and updates</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">Leave request approvals</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">Important announcements</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FaMapMarkerAlt className="text-blue-500 w-5 h-5" />
                    <h4 className="font-semibold text-gray-900">Location Access</h4>
                  </div>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">Geofencing and attendance tracking</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">Verify you're at office premises</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">Automatic check-in/check-out</span>
                    </li>
                  </ul>
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleEnablePermissions}
                disabled={isRequesting || isBlocked}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg ${
                  isBlocked
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRequesting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Requesting Permissions...</span>
                  </>
                ) : isBlocked ? (
                  <>
                    <span>Follow Instructions Above</span>
                  </>
                ) : (
                  <>
                    <FaBell className="w-4 h-4" />
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span>Enable Permissions Now</span>
                  </>
                )}
              </button>

              {isBlocked && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-xs font-medium text-center">
                    ⚠️ This app cannot function without these permissions. Please enable them manually and refresh the page.
                  </p>
                </div>
              )}

              {!isBlocked && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-xs font-medium text-center">
                    🔒 Clicking the button will show native browser popups to grant permissions.
                  </p>
                </div>
              )}

              {/* Help Button */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
              >
                {showHelp ? '▲ Hide Instructions' : '▼ Need Help? Click Here'}
              </button>

              {/* Browser-Specific Help */}
              {showHelp && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    📱 Instructions for {browserInfo.name} {browserInfo.isMobile ? '(Mobile)' : '(Desktop)'}
                  </h4>

                  {browserInfo.name === 'Chrome' && !browserInfo.isMobile && (
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                      <li>Click the <strong>lock icon (🔒)</strong> in the address bar</li>
                      <li>Find <strong>"Notifications"</strong> and <strong>"Location"</strong></li>
                      <li>Change both to <strong>"Allow"</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  )}

                  {browserInfo.name === 'Chrome' && browserInfo.isMobile && (
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                      <li>Tap the <strong>three dots (⋮)</strong> menu</li>
                      <li>Go to <strong>Settings → Site settings</strong></li>
                      <li>Enable <strong>Notifications</strong> and <strong>Location</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  )}

                  {browserInfo.name === 'Safari' && !browserInfo.isMobile && (
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                      <li>Click <strong>Safari → Settings</strong> in menu bar</li>
                      <li>Go to <strong>Websites</strong> tab</li>
                      <li>Enable <strong>Notifications</strong> and <strong>Location</strong> for this site</li>
                      <li>Refresh this page</li>
                    </ol>
                  )}

                  {browserInfo.name === 'Safari' && browserInfo.isMobile && (
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                      <li>Go to <strong>iOS Settings → Safari</strong></li>
                      <li>Enable <strong>Location Services</strong></li>
                      <li>Go to <strong>Settings → Notifications → Safari</strong></li>
                      <li>Enable notifications</li>
                      <li>Refresh this page</li>
                    </ol>
                  )}

                  {browserInfo.name === 'Firefox' && (
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                      <li>Click the <strong>lock icon (🔒)</strong> in address bar</li>
                      <li>Click <strong>"More information"</strong></li>
                      <li>Go to <strong>Permissions</strong> tab</li>
                      <li>Allow <strong>Notifications</strong> and <strong>Location</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  )}

                  {browserInfo.name === 'Edge' && (
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                      <li>Click the <strong>lock icon (🔒)</strong> in address bar</li>
                      <li>Find <strong>"Notifications"</strong> and <strong>"Location"</strong></li>
                      <li>Change both to <strong>"Allow"</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  )}

                  {browserInfo.name === 'Unknown' && (
                    <p className="text-blue-800">
                      Look for the <strong>lock icon (🔒)</strong> or <strong>info icon (ⓘ)</strong> in your browser's address bar,
                      then enable Notifications and Location permissions for this site.
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4 font-semibold">
              🔒 Both Notifications and Location permissions are REQUIRED to use this app
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to check notification status
export function useNotificationStatus() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState('default')

  useEffect(() => {
    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())

    // Listen for permission changes
    const checkPermission = () => {
      setPermission(getNotificationPermission())
    }

    // Check permission periodically (some browsers don't fire events)
    const interval = setInterval(checkPermission, 1000)

    return () => clearInterval(interval)
  }, [])

  return { isSupported, permission, isGranted: permission === 'granted' }
}

