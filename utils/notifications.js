/**
 * Notification Utilities for Push Notifications
 * Handles permission requests, service worker registration, and notification display
 */

// Check if notifications are supported
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// Get current notification permission status
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser')
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    throw error
  }
}

// Register service worker for push notifications
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

// Show a local notification
export const showNotification = async (title, options = {}) => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported')
    return null
  }

  const permission = getNotificationPermission()
  
  if (permission !== 'granted') {
    console.warn('Notification permission not granted')
    return null
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready
    
    // Default notification options
    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      tag: 'talio-notification',
      requireInteraction: false,
      ...options
    }

    // Show notification via service worker
    await registration.showNotification(title, defaultOptions)
    
    return true
  } catch (error) {
    console.error('Error showing notification:', error)
    
    // Fallback to browser notification if service worker fails
    try {
      new Notification(title, options)
      return true
    } catch (fallbackError) {
      console.error('Fallback notification also failed:', fallbackError)
      return false
    }
  }
}

// Subscribe to push notifications (for future server push)
export const subscribeToPushNotifications = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Push notifications not supported')
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      console.log('Already subscribed to push notifications')
      return subscription
    }

    // Subscribe to push notifications
    // Note: You'll need to generate VAPID keys for production
    // For now, this is a placeholder for future implementation
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured. Push notifications will use local notifications only.')
      return null
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    console.log('Subscribed to push notifications:', subscription)
    return subscription
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    throw error
  }
}

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      console.log('Unsubscribed from push notifications')
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    throw error
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Save notification preference to localStorage
export const saveNotificationPreference = (enabled) => {
  localStorage.setItem('notifications-enabled', enabled ? 'true' : 'false')
}

// Get notification preference from localStorage
export const getNotificationPreference = () => {
  const preference = localStorage.getItem('notifications-enabled')
  return preference === 'true'
}

// Check if user has dismissed notification prompt
export const hasUserDismissedNotificationPrompt = () => {
  return localStorage.getItem('notification-prompt-dismissed') === 'true'
}

// Mark notification prompt as dismissed
export const markNotificationPromptDismissed = () => {
  localStorage.setItem('notification-prompt-dismissed', 'true')
}

// Clear notification prompt dismissal (for testing)
export const clearNotificationPromptDismissal = () => {
  localStorage.removeItem('notification-prompt-dismissed')
}

