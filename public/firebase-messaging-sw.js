// Firebase Cloud Messaging Service Worker
// This file handles background notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration - Talio HRMS Project
const firebaseConfig = {
  apiKey: "AIzaSyDEyadwMSwamwG-KeMwzGwZ15UArNdJn-Y",
  authDomain: "talio-e9deb.firebaseapp.com",
  projectId: "talio-e9deb",
  storageBucket: "talio-e9deb.firebasestorage.app",
  messagingSenderId: "241026194465",
  appId: "1:241026194465:web:b91d15bf73bcf807ad1760"
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Get messaging instance
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Background message received:', payload)

  const notificationTitle = payload.notification?.title || 'Talio HRMS'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: payload.data?.tag || 'talio-notification',
    data: {
      url: payload.data?.click_action || payload.fcmOptions?.link || '/dashboard',
      ...payload.data
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  }

  // Add image if available
  if (payload.notification?.image) {
    notificationOptions.image = payload.notification.image
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification clicked:', event)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus()
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Firebase SW] Notification closed:', event)
})

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Firebase SW] Service worker activated')
  event.waitUntil(clients.claim())
})

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[Firebase SW] Service worker installed')
  self.skipWaiting()
})

