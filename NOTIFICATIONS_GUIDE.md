# 🔔 Push Notifications Implementation Guide

## Overview

This guide documents the push notification system implemented in Talio HRMS. The system includes:

1. ✅ **Pull-to-refresh disabled** on mobile devices
2. ✅ **Push notification infrastructure** with service worker
3. ✅ **Permission request popup** for both mobile and desktop
4. ✅ **Test notification** sent upon permission grant
5. ✅ **Full notification utilities** for future expansion

---

## 🎯 Features Implemented

### 1. Disabled Pull-to-Refresh

**File Modified:** `app/globals.css`

Added CSS properties to prevent swipe-down-to-reload on mobile browsers:
- `overscroll-behavior-y: contain` - Prevents pull-to-refresh
- `touch-action: pan-y` - Allows vertical scrolling but prevents refresh

```css
html {
  overscroll-behavior-y: contain;
}

body {
  overscroll-behavior-y: contain;
  touch-action: pan-y;
}
```

### 2. Notification Permission Popup

**Component:** `components/NotificationPermissionPopup.js`

A beautiful, user-friendly popup that:
- Appears 5 seconds after dashboard load
- Shows only if notifications are supported
- Doesn't show if permission already granted/denied
- Remembers if user dismissed it
- Works on both mobile and desktop

**Features:**
- 🎨 Modern gradient design
- 📱 Responsive for mobile and desktop
- ⚡ Smooth animations
- 🔔 Clear benefits listed
- ✅ "Enable" and "Not Now" options
- 🎉 Test notification on success

### 3. Notification Utilities

**File:** `utils/notifications.js`

Comprehensive utility functions:
- `isNotificationSupported()` - Check browser support
- `getNotificationPermission()` - Get current permission status
- `requestNotificationPermission()` - Request permission from user
- `showNotification(title, options)` - Display a notification
- `subscribeToPushNotifications()` - Subscribe to push (for future server push)
- `unsubscribeFromPushNotifications()` - Unsubscribe from push
- `saveNotificationPreference()` - Save user preference
- `getNotificationPreference()` - Get user preference

### 4. Custom Service Worker

**File:** `public/sw-custom.js`

Handles notification events:
- `push` - Receives push notifications from server
- `notificationclick` - Handles when user clicks notification
- `notificationclose` - Handles when notification is closed
- `sync` - Background sync for notifications

### 5. React Hooks

**File:** `hooks/useNotifications.js`

Custom hooks for managing notifications:
- `useNotifications()` - Main hook for notification state
- `useNotificationInit()` - Initialize notifications on app load

---

## 📁 Files Created/Modified

### Created Files:
1. ✅ `utils/notifications.js` - Notification utility functions
2. ✅ `components/NotificationPermissionPopup.js` - Permission popup component
3. ✅ `public/sw-custom.js` - Custom service worker for notifications
4. ✅ `hooks/useNotifications.js` - React hooks for notifications
5. ✅ `NOTIFICATIONS_GUIDE.md` - This documentation

### Modified Files:
1. ✅ `app/globals.css` - Added pull-to-refresh prevention
2. ✅ `app/dashboard/layout.js` - Added notification popup and initialization

---

## 🚀 How It Works

### User Flow:

1. **User opens dashboard** → Notification system initializes
2. **After 5 seconds** → Permission popup appears (if not already granted/denied)
3. **User clicks "Enable Notifications"** → Browser permission dialog appears
4. **User grants permission** → Test notification is sent
5. **Success notification shows** → "🎉 Notifications Enabled!"

### Technical Flow:

```
Dashboard Load
    ↓
useNotificationInit() hook runs
    ↓
Service Worker registers
    ↓
NotificationPermissionPopup component mounts
    ↓
After 5 seconds → Shows popup (if needed)
    ↓
User clicks "Enable"
    ↓
requestNotificationPermission() called
    ↓
Browser shows native permission dialog
    ↓
If granted → showNotification() called
    ↓
Test notification appears
```

---

## 🧪 Testing the Notifications

### Desktop Testing:

1. Open the app in Chrome/Edge/Firefox
2. Navigate to `/dashboard`
3. Wait 5 seconds for the popup
4. Click "Enable Notifications"
5. Grant permission in browser dialog
6. You should see a test notification: "🎉 Notifications Enabled!"

### Mobile Testing:

1. Open the app on mobile browser (Chrome/Safari)
2. Navigate to `/dashboard`
3. Wait 5 seconds for the popup
4. Click "Enable Notifications"
5. Grant permission in browser dialog
6. You should see a test notification

### Testing Pull-to-Refresh:

1. Open app on mobile device
2. Try to swipe down from top of page
3. Page should NOT reload (pull-to-refresh disabled)

---

## 🔧 Configuration

### Notification Options

When showing notifications, you can customize:

```javascript
await showNotification('Title', {
  body: 'Notification message',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-96x96.png',
  tag: 'unique-tag',
  requireInteraction: false,
  vibrate: [200, 100, 200],
  actions: [
    { action: 'view', title: 'View' },
    { action: 'dismiss', title: 'Dismiss' }
  ]
})
```

### Permission States

- `default` - User hasn't been asked yet
- `granted` - User has granted permission
- `denied` - User has denied permission
- `unsupported` - Browser doesn't support notifications

---

## 📱 Browser Support

### Desktop:
- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Safari 16+
- ✅ Opera 37+

### Mobile:
- ✅ Chrome Android 50+
- ✅ Firefox Android 44+
- ✅ Safari iOS 16.4+
- ✅ Samsung Internet 5+

---

## 🎨 Customization

### Change Popup Timing

Edit `components/NotificationPermissionPopup.js`:

```javascript
// Change from 5 seconds to 10 seconds
setTimeout(() => {
  setShowPrompt(true)
}, 10000) // 10 seconds
```

### Change Notification Icon

Edit `utils/notifications.js`:

```javascript
const defaultOptions = {
  icon: '/your-custom-icon.png',
  badge: '/your-custom-badge.png',
  // ...
}
```

### Disable Popup (Manual Trigger Only)

Remove `<NotificationPermissionPopup />` from `app/dashboard/layout.js` and trigger manually:

```javascript
import { requestNotificationPermission } from '@/utils/notifications'

// In your component
const handleEnableNotifications = async () => {
  const permission = await requestNotificationPermission()
  if (permission === 'granted') {
    // Show success message
  }
}
```

---

## 🔮 Future Enhancements

### Server-Side Push Notifications

To enable server-side push notifications:

1. **Generate VAPID Keys:**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Add to Environment Variables:**
   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   ```

3. **Subscribe Users:**
   ```javascript
   import { subscribeToPushNotifications } from '@/utils/notifications'
   
   const subscription = await subscribeToPushNotifications()
   // Send subscription to your server
   ```

4. **Send Push from Server:**
   ```javascript
   const webpush = require('web-push')
   
   webpush.setVapidDetails(
     'mailto:your-email@example.com',
     publicKey,
     privateKey
   )
   
   await webpush.sendNotification(subscription, JSON.stringify({
     title: 'New Task Assigned',
     body: 'You have a new task to complete',
     icon: '/icons/icon-192x192.png'
   }))
   ```

### Notification Types

You can create different notification types:

```javascript
// Task notification
await showNotification('New Task Assigned', {
  body: 'Complete the quarterly report',
  tag: 'task-123',
  data: { type: 'task', taskId: 123 }
})

// Leave approval
await showNotification('Leave Approved', {
  body: 'Your leave request has been approved',
  tag: 'leave-456',
  data: { type: 'leave', leaveId: 456 }
})

// Announcement
await showNotification('New Announcement', {
  body: 'Company meeting at 3 PM',
  tag: 'announcement-789',
  requireInteraction: true
})
```

---

## 🐛 Troubleshooting

### Popup Not Showing

**Check:**
- Browser supports notifications
- Permission not already granted/denied
- User hasn't dismissed popup before
- Wait at least 5 seconds after page load

**Fix:**
```javascript
// Clear dismissal flag in browser console
localStorage.removeItem('notification-prompt-dismissed')
```

### Notifications Not Working

**Check:**
- Permission is granted (check browser settings)
- Service worker is registered
- HTTPS is enabled (required for notifications)
- Browser supports notifications

**Debug:**
```javascript
// In browser console
console.log('Supported:', 'Notification' in window)
console.log('Permission:', Notification.permission)
console.log('SW:', 'serviceWorker' in navigator)
```

### Pull-to-Refresh Still Working

**Check:**
- CSS changes are applied
- Browser cache is cleared
- Using a supported browser

**Note:** Some browsers may not fully support `overscroll-behavior-y`

---

## ✅ Summary

You now have a complete push notification system with:

1. ✅ Pull-to-refresh disabled on mobile
2. ✅ Beautiful permission request popup
3. ✅ Test notification on permission grant
4. ✅ Full notification utilities
5. ✅ Service worker integration
6. ✅ React hooks for easy integration
7. ✅ Ready for server-side push notifications

The system is production-ready and can be extended with server-side push notifications when needed!

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify browser compatibility
3. Test in incognito mode
4. Clear browser cache and localStorage
5. Check service worker registration in DevTools

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0

