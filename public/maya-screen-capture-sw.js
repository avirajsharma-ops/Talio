// MAYA Screen Capture Service Worker
// Handles screen monitoring and capture functionality for MAYA
// Can be used as a standalone service worker or integrated into browser extension
// Enables background running, PIP triggers, messages, and screen monitoring without native prompts

console.log('[MAYA Screen Capture SW] Service Worker starting...');

const CACHE_NAME = 'maya-screen-capture-v1';
const MAYA_API_BASE = self.location.origin;

// Store for pending screen captures
let pendingCaptures = new Map();
let activeMonitoringSessions = new Map();
let pipWindows = new Map();

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[MAYA Screen Capture SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/maya-runtime.js',
        '/maya-enhanced.js',
      ]).catch((err) => {
        console.warn('[MAYA Screen Capture SW] Cache failed:', err);
      });
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[MAYA Screen Capture SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[MAYA Screen Capture SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  console.log('[MAYA Screen Capture SW] Message received:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'CAPTURE_SCREEN':
      handleScreenCapture(event.source, data);
      break;

    case 'MONITOR_REQUEST':
      handleMonitorRequest(event.source, data);
      break;

    case 'TRIGGER_PIP':
      handlePIPTrigger(event.source, data);
      break;

    case 'BACKGROUND_MESSAGE':
      handleBackgroundMessage(event.source, data);
      break;

    case 'REGISTER_MONITORING_SESSION':
      registerMonitoringSession(data);
      break;

    case 'UNREGISTER_MONITORING_SESSION':
      unregisterMonitoringSession(data);
      break;

    case 'PING':
      event.source.postMessage({ type: 'PONG' });
      break;

    default:
      console.log('[MAYA Screen Capture SW] Unknown message type:', type);
  }
});

// Handle screen capture request
async function handleScreenCapture(client, data) {
  try {
    console.log('[MAYA Screen Capture SW] Handling screen capture request');
    
    // Notify client to trigger screen capture
    client.postMessage({
      type: 'TRIGGER_CAPTURE',
      data: data
    });
    
  } catch (error) {
    console.error('[MAYA Screen Capture SW] Screen capture error:', error);
    client.postMessage({
      type: 'CAPTURE_ERROR',
      error: error.message
    });
  }
}

// Handle monitoring request
async function handleMonitorRequest(client, data) {
  try {
    console.log('[MAYA Screen Capture SW] Handling monitor request');
    
    // Notify client to show permission dialog
    client.postMessage({
      type: 'SHOW_PERMISSION_DIALOG',
      data: data
    });
    
  } catch (error) {
    console.error('[MAYA Screen Capture SW] Monitor request error:', error);
    client.postMessage({
      type: 'MONITOR_ERROR',
      error: error.message
    });
  }
}

// Fetch event - handle API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle MAYA API requests
  if (url.pathname.startsWith('/api/maya/')) {
    // Let the request go through normally
    return;
  }
  
  // For other requests, use cache-first strategy for MAYA resources
  if (url.pathname.includes('maya-runtime') || url.pathname.includes('maya-enhanced')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Background sync for screen captures
self.addEventListener('sync', (event) => {
  console.log('[MAYA Screen Capture SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-screen-captures') {
    event.waitUntil(syncScreenCaptures());
  }
});

// Sync pending screen captures
async function syncScreenCaptures() {
  try {
    console.log('[MAYA Screen Capture SW] Syncing screen captures...');
    
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients to sync
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_CAPTURES'
      });
    });
    
  } catch (error) {
    console.error('[MAYA Screen Capture SW] Sync error:', error);
  }
}

// Handle PIP trigger from background
async function handlePIPTrigger(client, data) {
  try {
    console.log('[MAYA Screen Capture SW] Triggering PIP...');

    // Notify all clients to trigger PIP
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => {
      c.postMessage({
        type: 'ACTIVATE_PIP',
        data: data
      });
    });

  } catch (error) {
    console.error('[MAYA Screen Capture SW] PIP trigger error:', error);
  }
}

// Handle background messages
async function handleBackgroundMessage(client, data) {
  try {
    console.log('[MAYA Screen Capture SW] Handling background message:', data);

    // Store message for delivery
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Notify all clients about new message
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => {
      c.postMessage({
        type: 'NEW_BACKGROUND_MESSAGE',
        messageId,
        data: data
      });
    });

  } catch (error) {
    console.error('[MAYA Screen Capture SW] Background message error:', error);
  }
}

// Register monitoring session
function registerMonitoringSession(data) {
  const { sessionId, targetUserId, requestedBy } = data;
  activeMonitoringSessions.set(sessionId, {
    targetUserId,
    requestedBy,
    startTime: Date.now(),
    captureCount: 0
  });
  console.log('[MAYA Screen Capture SW] Monitoring session registered:', sessionId);
}

// Unregister monitoring session
function unregisterMonitoringSession(data) {
  const { sessionId } = data;
  activeMonitoringSessions.delete(sessionId);
  console.log('[MAYA Screen Capture SW] Monitoring session unregistered:', sessionId);
}

// Periodic background task to check for monitoring requests
setInterval(async () => {
  if (activeMonitoringSessions.size > 0) {
    console.log('[MAYA Screen Capture SW] Active monitoring sessions:', activeMonitoringSessions.size);

    // Notify clients about active sessions
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'ACTIVE_MONITORING_SESSIONS',
        sessions: Array.from(activeMonitoringSessions.entries())
      });
    });
  }
}, 30000); // Check every 30 seconds

// Handle push notifications for MAYA
self.addEventListener('push', (event) => {
  console.log('[MAYA Screen Capture SW] Push notification received');

  if (event.data) {
    const data = event.data.json();

    if (data.type === 'maya_screen_monitor_request') {
      // Handle screen monitoring request via push
      event.waitUntil(
        handleMonitoringPushNotification(data)
      );
    } else if (data.type === 'maya_message') {
      // Handle MAYA message via push
      event.waitUntil(
        handleMayaMessagePush(data)
      );
    }
  }
});

// Handle monitoring push notification
async function handleMonitoringPushNotification(data) {
  try {
    const { requestId, requestedBy, targetUserId } = data;

    // Show notification
    await self.registration.showNotification('MAYA Screen Monitoring', {
      body: `${requestedBy} has requested to monitor your screen`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `maya-monitor-${requestId}`,
      requireInteraction: true,
      actions: [
        { action: 'allow', title: 'Allow' },
        { action: 'deny', title: 'Deny' }
      ],
      data: { requestId, requestedBy, targetUserId }
    });

    // Notify clients
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'MONITOR_REQUEST_PUSH',
        data: data
      });
    });

  } catch (error) {
    console.error('[MAYA Screen Capture SW] Monitoring push error:', error);
  }
}

// Handle MAYA message push
async function handleMayaMessagePush(data) {
  try {
    const { message, from } = data;

    // Show notification
    await self.registration.showNotification('MAYA Message', {
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'maya-message',
      data: data
    });

    // Notify clients
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'MAYA_MESSAGE_PUSH',
        data: data
      });
    });

  } catch (error) {
    console.error('[MAYA Screen Capture SW] Message push error:', error);
  }
}

// Handle notification actions
self.addEventListener('notificationclick', (event) => {
  console.log('[MAYA Screen Capture SW] Notification clicked:', event.action);

  event.notification.close();

  const data = event.notification.data;

  if (event.notification.tag.startsWith('maya-monitor-')) {
    if (event.action === 'allow') {
      // User allowed monitoring
      event.waitUntil(
        handleMonitoringAllowed(data)
      );
    } else if (event.action === 'deny') {
      // User denied monitoring
      event.waitUntil(
        handleMonitoringDenied(data)
      );
    }
  } else {
    // Open MAYA
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Handle monitoring allowed
async function handleMonitoringAllowed(data) {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'MONITORING_ALLOWED',
        data: data
      });
    });
  } catch (error) {
    console.error('[MAYA Screen Capture SW] Monitoring allowed error:', error);
  }
}

// Handle monitoring denied
async function handleMonitoringDenied(data) {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'MONITORING_DENIED',
        data: data
      });
    });
  } catch (error) {
    console.error('[MAYA Screen Capture SW] Monitoring denied error:', error);
  }
}

console.log('[MAYA Screen Capture SW] Service Worker ready');

