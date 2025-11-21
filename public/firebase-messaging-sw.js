/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for web
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsJgwFuOjgg4QFox6xw8Gg4rs5oub4ZD8",
  authDomain: "talio-a269f.firebaseapp.com",
  projectId: "talio-a269f",
  storageBucket: "talio-a269f.firebasestorage.app",
  messagingSenderId: "748268440394",
  appId: "1:748268440394:web:c659dbece00a2501c28fb3"
}

// Initialize Firebase
let messaging = null
try {
  firebase.initializeApp(firebaseConfig)
  messaging = firebase.messaging()
  console.log('[SW] Firebase Messaging initialized')
} catch (error) {
  console.error('[SW] Firebase initialization error:', error)
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload)

    // Extract notification data
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Talio HRMS'
    const notificationBody = payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new notification'

    const notificationOptions = {
      body: notificationBody,
      icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: payload.data?.tag || 'talio-notification',
      data: {
        url: payload.data?.click_action || payload.data?.url || payload.fcmOptions?.link || '/dashboard',
        ...payload.data
      },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      renotify: true,
      timestamp: Date.now()
    }

    // Add image if available
    if (payload.notification?.image || payload.data?.imageUrl) {
      notificationOptions.image = payload.notification?.image || payload.data?.imageUrl
    }

    // Show notification
    return self.registration.showNotification(notificationTitle, notificationOptions)
  })
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification)

  event.notification.close()

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/dashboard'

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated')
  event.waitUntil(clients.claim())
})

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed')
  self.skipWaiting()
})