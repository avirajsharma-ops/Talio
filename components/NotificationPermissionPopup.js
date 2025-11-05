'use client'

import { useState, useEffect } from 'react'
import { FaBell, FaCheck, FaMapMarkerAlt } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useTheme } from '@/contexts/ThemeContext'
import {
  isNotificationSupported,
  getNotificationPermission,
  showNotification,
  saveNotificationPreference,
  subscribeToPushNotifications,
  savePushSubscriptionToServer
} from '@/utils/notifications'

export default function NotificationPermissionPopup() {
  const { currentTheme, themes } = useTheme()
  const theme = themes[currentTheme]

  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState('default') // 'default', 'granted', 'denied'
  const [locationStatus, setLocationStatus] = useState('prompt') // 'prompt', 'granted', 'denied'
  const [locationServiceOff, setLocationServiceOff] = useState(false)

  // Check permissions status
  useEffect(() => {
    if (!isNotificationSupported()) {
      return
    }

    const checkPermissionStatus = async () => {
      try {
        // 1. Check notification permission
        const notifPermission = await getNotificationPermission()
        setNotificationStatus(notifPermission)

        // 2. Check location permission - More robust detection
        let locPermission = 'default'

        if (!navigator.geolocation) {
          console.log('📍 [Location] Geolocation not supported')
          locPermission = 'denied'
        } else {
          // Try Permissions API first (most reliable)
          if (navigator.permissions) {
            try {
              const result = await navigator.permissions.query({ name: 'geolocation' })
              // Map 'prompt' to 'default' for consistency with Notification API
              locPermission = result.state === 'prompt' ? 'default' : result.state

              console.log('📍 [Location] Permissions API result:', result.state, '→', locPermission)

              // Listen for permission changes
              result.onchange = () => {
                const newState = result.state === 'prompt' ? 'default' : result.state
                console.log('📍 [Location] Permission changed:', result.state, '→', newState)
                setLocationStatus(newState)
                if (newState === 'granted') {
                  verifyLocationService()
                }
              }
            } catch (error) {
              console.log('📍 [Location] Permissions API failed, using fallback:', error.message)
              // Fallback: Try to get position to determine permission
              locPermission = await checkLocationViaPosition()
            }
          } else {
            console.log('📍 [Location] Permissions API not available, using fallback')
            // Fallback for browsers without Permissions API
            locPermission = await checkLocationViaPosition()
          }
        }

        setLocationStatus(locPermission)
        console.log('📍 [Location] Final status set to:', locPermission)

        // 3. If location permission is granted, verify location service is on
        if (locPermission === 'granted') {
          verifyLocationService()
        } else {
          setLocationServiceOff(false)
        }

        // 4. Determine if we should show the prompt
        const allGranted = notifPermission === 'granted' && locPermission === 'granted' && !locationServiceOff

        if (allGranted) {
          setPermissionGranted(true)
          setShowPrompt(false)
        } else {
          setShowPrompt(true)
          setPermissionGranted(false)
        }
      } catch (error) {
        console.error('Error checking permissions:', error)
      }
    }

    // Check location permission by trying to get position
    const checkLocationViaPosition = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.log('📍 [Location] Geolocation not available')
          resolve('denied')
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('📍 [Location] Position obtained successfully:', position.coords.latitude, position.coords.longitude)
            resolve('granted')
          },
          (error) => {
            console.log('📍 [Location] Position error:', error.code, error.message)
            if (error.code === error.PERMISSION_DENIED) {
              resolve('denied')
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              // Permission granted but location service off
              resolve('granted')
            } else {
              // Timeout or other error - assume not granted yet
              resolve('default')
            }
          },
          {
            timeout: 3000,
            maximumAge: 60000,
            enableHighAccuracy: false
          }
        )
      })
    }

    // Verify location service is actually working
    const verifyLocationService = () => {
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationServiceOff(false)
        },
        (error) => {
          if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
            setLocationServiceOff(true)
          } else if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied')
            setLocationServiceOff(false)
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        }
      )
    }

    // Initial check
    checkPermissionStatus()

    // Check every 2 seconds for permission changes
    const interval = setInterval(checkPermissionStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  // Handle individual notification permission request
  const handleEnableNotifications = async () => {
    console.log('🔔 [Permissions] User clicked enable notifications only')
    setIsRequesting(true)

    try {
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
        console.log('✅ [Permissions] Notifications already granted')
        setNotificationStatus('granted')

        // Check if OneSignal is available and user is subscribed
        if (typeof window !== 'undefined' && window.OneSignal) {
          try {
            const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn
            if (!isSubscribed) {
              console.log('🔔 [Permissions] OneSignal not subscribed, subscribing now...')
              await window.OneSignal.User.PushSubscription.optIn()
              console.log('✅ [Permissions] OneSignal subscription successful')
            }
          } catch (error) {
            console.error('❌ [Permissions] Error checking/subscribing OneSignal:', error)
          }
        }

        toast.success('Notifications are already enabled!', {
          duration: 3000,
          icon: '✅'
        })
      } else if (currentNotifPermission === 'denied') {
        console.log('❌ [Permissions] Notifications are DENIED')
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
      } else {
        // Permission is 'default' - use OneSignal's method first, fallback to native
        console.log('🔔 [Permissions] Requesting notification permission...')
        let permission = null

        // Try OneSignal first
        if (typeof window !== 'undefined' && window.OneSignal) {
          try {
            console.log('🔔 [Permissions] Using OneSignal.Notifications.requestPermission()...')
            const granted = await window.OneSignal.Notifications.requestPermission()
            permission = granted ? 'granted' : 'denied'
            console.log('🔔 [Permissions] OneSignal permission result:', permission)
          } catch (error) {
            console.warn('⚠️ [Permissions] OneSignal permission request failed, using fallback:', error)
            permission = null
          }
        }

        // Fallback to native browser API if OneSignal failed or not available
        if (permission === null) {
          console.log('🔔 [Permissions] Using native Notification.requestPermission()...')
          permission = await Notification.requestPermission()
          console.log('🔔 [Permissions] Native permission result:', permission)
        }

        setNotificationStatus(permission)

        if (permission === 'granted') {
          toast.success('Notifications enabled successfully!', {
            duration: 3000,
            icon: '✅'
          })

          // If we used native API, subscribe to push notifications manually
          if (typeof window === 'undefined' || !window.OneSignal) {
            try {
              const subscription = await subscribeToPushNotifications()
              if (subscription) {
                await savePushSubscriptionToServer(subscription)
                console.log('✅ [Permissions] Push subscription saved')
              }
            } catch (error) {
              console.error('❌ [Permissions] Error subscribing to push:', error)
            }
          }
        } else if (permission === 'denied') {
          toast.error('Notification permission was denied', {
            duration: 5000,
            icon: '❌'
          })
        }
      }
    } catch (error) {
      console.error('❌ [Permissions] Error requesting notification permission:', error)
      toast.error('Failed to request notification permission', {
        duration: 4000
      })
    } finally {
      setIsRequesting(false)
    }
  }

  // Handle individual location permission request
  const handleEnableLocation = async () => {
    console.log('📍 [Permissions] User clicked enable location only')
    setIsRequesting(true)

    try {
      if (!navigator.geolocation) {
        toast.error('Location not supported', {
          duration: 5000,
          icon: '❌'
        })
        setIsRequesting(false)
        return
      }

      // Check current location permission status
      let currentLocPermission = 'default'
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' })
          // Map 'prompt' to 'default' for consistency
          currentLocPermission = result.state === 'prompt' ? 'default' : result.state
          console.log('📍 [Permissions] Current location permission:', result.state, '→', currentLocPermission)
        } catch (error) {
          console.warn('⚠️ [Permissions] Could not query location permission:', error.message)
        }
      }

      if (currentLocPermission === 'granted') {
        console.log('✅ [Permissions] Location already granted')
        toast.success('Location already enabled!', {
          duration: 3000,
          icon: '✅'
        })
        setLocationStatus('granted')
        setIsRequesting(false)
        return
      }

      if (currentLocPermission === 'denied') {
        console.log('❌ [Permissions] Location is DENIED')
        setLocationStatus('denied')
        toast.error(
          'Location blocked. Click lock icon (🔒) in address bar → Allow → Refresh',
          {
            duration: 8000,
            icon: '📍'
          }
        )
        setIsRequesting(false)
        return
      }

      // Trigger native location popup
      console.log('📍 [Permissions] Triggering NATIVE location popup...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ [Permissions] Location granted:', position.coords.latitude, position.coords.longitude)
          setLocationStatus('granted')
          setLocationServiceOff(false)
          toast.success('Location enabled!', {
            duration: 3000,
            icon: '✅'
          })
          setIsRequesting(false)
        },
        (error) => {
          console.error('❌ [Permissions] Location error:', error.code, error.message)

          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied')
            toast.error('Location permission denied', {
              duration: 5000,
              icon: '❌'
            })
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            // Permission granted but location service off
            setLocationStatus('granted')
            setLocationServiceOff(true)
            toast.error(
              'Location service OFF. Enable in device settings.',
              {
                duration: 8000,
                icon: '📍'
              }
            )
          } else if (error.code === error.TIMEOUT) {
            toast.error('Location request timed out. Please try again.', {
              duration: 4000
            })
          }
          setIsRequesting(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      )
    } catch (error) {
      console.error('❌ [Permissions] Error requesting location permission:', error)
      toast.error('Failed to request location permission', {
        duration: 4000
      })
      setIsRequesting(false)
    }
  }

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

        // Check if OneSignal is available and user is subscribed
        if (typeof window !== 'undefined' && window.OneSignal) {
          try {
            const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn
            if (!isSubscribed) {
              console.log('🔔 [Permissions] OneSignal not subscribed, subscribing now...')
              await window.OneSignal.User.PushSubscription.optIn()
              console.log('✅ [Permissions] OneSignal subscription successful')
            }
          } catch (error) {
            console.error('❌ [Permissions] Error checking/subscribing OneSignal:', error)
          }
        }
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
        // Permission is 'default' - use OneSignal's method first, fallback to native
        console.log('🔔 [Permissions] Requesting notification permission...')
        let permission = null

        // Try OneSignal first
        if (typeof window !== 'undefined' && window.OneSignal) {
          try {
            console.log('🔔 [Permissions] Using OneSignal.Notifications.requestPermission()...')
            const granted = await window.OneSignal.Notifications.requestPermission()
            permission = granted ? 'granted' : 'denied'
            console.log('🔔 [Permissions] OneSignal permission result:', permission)
          } catch (error) {
            console.warn('⚠️ [Permissions] OneSignal permission request failed, using fallback:', error)
            permission = null
          }
        }

        // Fallback to native browser API if OneSignal failed or not available
        if (permission === null) {
          try {
            console.log('🔔 [Permissions] Using native Notification.requestPermission()...')
            permission = await Notification.requestPermission()
            console.log('🔔 [Permissions] Native permission result:', permission)
          } catch (error) {
            console.error('❌ [Permissions] Error requesting notification permission:', error)
            toast.error('Failed to request notification permission', {
              duration: 4000
            })
            setIsRequesting(false)
            return
          }
        }

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

        // Subscribe to push notifications (only if OneSignal is not available)
        setTimeout(async () => {
          try {
            // Check if OneSignal is handling subscriptions
            if (typeof window !== 'undefined' && window.OneSignal) {
              console.log('✅ [Permissions] OneSignal is handling push subscriptions')
              // OneSignal automatically handles subscription when permission is granted
              // No need to manually subscribe
            } else {
              // Fallback to manual subscription if OneSignal is not available
              console.log('📲 [Permissions] Subscribing to push notifications manually...')
              const subscription = await subscribeToPushNotifications()

              if (subscription) {
                await savePushSubscriptionToServer(subscription)
                console.log('✅ [Permissions] Push subscription saved to server')
              }
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

  if (!showPrompt) {
    return null
  }

  // Get theme colors
  const primaryColor = theme.primary[600]
  const primaryLight = theme.primary[100]
  const primaryDark = theme.primary[700]

  return (
    <>
      {/* Backdrop - Non-dismissible */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" />

      {/* Popup - Compact Design */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: `2px solid ${primaryColor}` }}>
          {/* Header - Compact */}
          <div
            className="px-5 py-4 text-white"
            style={{
              background: isBlocked
                ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
                : theme.accent.gradient
            }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2.5 rounded-xl flex items-center gap-2">
                <FaBell className="w-5 h-5" />
                <FaMapMarkerAlt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {isBlocked ? 'Permissions Required' : 'Enable Permissions'}
                </h3>
                <p className="text-xs opacity-90">
                  {isBlocked ? 'Please enable manually' : 'Required for full functionality'}
                </p>
              </div>
            </div>
          </div>

          {/* Content - Compact */}
          <div className="p-5">
            {/* Permission Status Display - Compact */}
            <div className="mb-4 space-y-2">
              {/* Notification Status */}
              <div
                className="flex items-center justify-between p-3 rounded-lg transition-all"
                style={{
                  backgroundColor: notificationStatus === 'granted' ? theme.primary[50] : '#F9FAFB',
                  border: `1.5px solid ${notificationStatus === 'granted' ? theme.primary[300] : '#E5E7EB'}`
                }}
              >
                <div className="flex items-center gap-2.5">
                  <FaBell
                    className="w-4 h-4"
                    style={{
                      color: notificationStatus === 'granted' ? theme.primary[600] :
                             notificationStatus === 'denied' ? '#DC2626' : '#9CA3AF'
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-800">Notifications</span>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: notificationStatus === 'granted' ? theme.primary[100] :
                                   notificationStatus === 'denied' ? '#FEE2E2' : '#FEF3C7',
                    color: notificationStatus === 'granted' ? theme.primary[700] :
                          notificationStatus === 'denied' ? '#991B1B' : '#92400E'
                  }}
                >
                  {notificationStatus === 'granted' ? '✓ On' : notificationStatus === 'denied' ? '✗ Off' : '⚠ Pending'}
                </span>
              </div>

              {/* Location Status */}
              <div
                className="flex items-center justify-between p-3 rounded-lg transition-all"
                style={{
                  backgroundColor: locationStatus === 'granted' ? theme.primary[50] : '#F9FAFB',
                  border: `1.5px solid ${locationStatus === 'granted' ? theme.primary[300] : '#E5E7EB'}`
                }}
              >
                <div className="flex items-center gap-2.5">
                  <FaMapMarkerAlt
                    className="w-4 h-4"
                    style={{
                      color: locationStatus === 'granted' ? theme.primary[600] :
                             locationStatus === 'denied' ? '#DC2626' : '#9CA3AF'
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-800">Location</span>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: locationStatus === 'granted' ? theme.primary[100] :
                                   locationStatus === 'denied' ? '#FEE2E2' : '#FEF3C7',
                    color: locationStatus === 'granted' ? theme.primary[700] :
                          locationStatus === 'denied' ? '#991B1B' : '#92400E'
                  }}
                >
                  {locationStatus === 'granted' ? '✓ On' : locationStatus === 'denied' ? '✗ Off' : '⚠ Pending'}
                </span>
              </div>

              {/* Location Service Off Warning - Compact */}
              {locationServiceOff && locationStatus === 'granted' && (
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-2.5">
                  <p className="text-orange-900 text-xs font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    Location Service OFF
                  </p>
                  <p className="text-orange-800 text-xs mt-1">
                    Enable in device settings
                  </p>
                </div>
              )}
            </div>

            {/* Instructions based on status - Compact */}
            {isBlocked ? (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
                <p className="text-red-900 font-bold text-sm mb-2 flex items-center gap-1.5">
                  <span>⚠️</span>
                  Permissions Blocked
                </p>
                <p className="text-red-800 text-xs mb-2">
                  {notificationStatus === 'denied' && locationStatus === 'denied'
                    ? 'Both are blocked.'
                    : notificationStatus === 'denied'
                    ? 'Notifications blocked.'
                    : 'Location blocked.'}
                  {' '}To enable:
                </p>
                <ol className="text-red-800 text-xs space-y-1 list-decimal list-inside">
                  <li>Click lock icon (🔒) in address bar</li>
                  <li>Change to "Allow"</li>
                  <li>Refresh page</li>
                </ol>
              </div>
            ) : (
              <div className="mb-4 space-y-2.5">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: theme.primary[50] }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FaBell className="w-4 h-4" style={{ color: theme.primary[600] }} />
                    <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    <li className="flex items-start gap-2">
                      <FaCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: theme.primary[500] }} />
                      <span className="text-gray-700 text-xs">Task updates & approvals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: theme.primary[500] }} />
                      <span className="text-gray-700 text-xs">Important announcements</span>
                    </li>
                  </ul>
                </div>

                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: theme.primary[50] }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FaMapMarkerAlt className="w-4 h-4" style={{ color: theme.primary[600] }} />
                    <h4 className="font-semibold text-sm text-gray-900">Location</h4>
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    <li className="flex items-start gap-2">
                      <FaCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: theme.primary[500] }} />
                      <span className="text-gray-700 text-xs">Geofencing & attendance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: theme.primary[500] }} />
                      <span className="text-gray-700 text-xs">Auto check-in/out</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Individual Permission Buttons - Compact */}
            {!isBlocked ? (
              <div className="space-y-2">
                {/* Notification Button */}
                <button
                  onClick={handleEnableNotifications}
                  disabled={isRequesting || notificationStatus === 'granted'}
                  className="w-full font-semibold py-2.5 px-4 rounded-lg transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md text-white text-sm"
                  style={{
                    background: notificationStatus === 'granted'
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : theme.accent.gradient,
                    cursor: notificationStatus === 'granted' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {notificationStatus === 'granted' ? (
                    <>
                      <FaCheck className="w-4 h-4" />
                      <span>Notifications Enabled</span>
                    </>
                  ) : isRequesting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Requesting...</span>
                    </>
                  ) : (
                    <>
                      <FaBell className="w-4 h-4" />
                      <span>Enable Notifications</span>
                    </>
                  )}
                </button>

                {/* Location Button */}
                <button
                  onClick={handleEnableLocation}
                  disabled={isRequesting || locationStatus === 'granted'}
                  className="w-full font-semibold py-2.5 px-4 rounded-lg transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md text-white text-sm"
                  style={{
                    background: locationStatus === 'granted'
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : theme.accent.gradient,
                    cursor: locationStatus === 'granted' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {locationStatus === 'granted' ? (
                    <>
                      <FaCheck className="w-4 h-4" />
                      <span>Location Enabled</span>
                    </>
                  ) : isRequesting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Requesting...</span>
                    </>
                  ) : (
                    <>
                      <FaMapMarkerAlt className="w-4 h-4" />
                      <span>Enable Location</span>
                    </>
                  )}
                </button>

                {/* Enable Both Button */}
                <button
                  onClick={handleEnablePermissions}
                  disabled={isRequesting || (notificationStatus === 'granted' && locationStatus === 'granted')}
                  className="w-full font-bold py-3 px-4 rounded-lg transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-white border"
                  style={{
                    background: (notificationStatus === 'granted' && locationStatus === 'granted')
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : theme.accent.gradient,
                    borderColor: theme.primary[300],
                    cursor: (notificationStatus === 'granted' && locationStatus === 'granted') ? 'not-allowed' : 'pointer'
                  }}
                >
                  {(notificationStatus === 'granted' && locationStatus === 'granted') ? (
                    <>
                      <FaCheck className="w-4 h-4" />
                      <span>All Enabled</span>
                    </>
                  ) : isRequesting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Requesting...</span>
                    </>
                  ) : (
                    <>
                      <FaBell className="w-4 h-4" />
                      <FaMapMarkerAlt className="w-4 h-4" />
                      <span>Enable Both</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-md text-white text-sm opacity-60 cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                }}
              >
                <span>Follow Instructions Above</span>
              </button>
            )}
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

