// Custom Service Worker for Push Notifications
// This file adds notification handling to the auto-generated service worker

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event)
  
  let notificationData = {
    title: 'Talio HRMS',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'talio-notification',
    requireInteraction: false
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data
      }
    } catch (e) {
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: [200, 100, 200],
      data: notificationData.data || {}
    })
  )
})

// Listen for notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard')
      }
    })
  )
})

// Listen for notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event)
})

// Background sync for notifications (optional)
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  // Placeholder for syncing notifications with server
  console.log('Syncing notifications...')
}

