# 🔔 Push Notification Debugging & Testing Guide

## ✅ All Issues Fixed!

### What Was Fixed:

1. **❌ Notification Type Validation Error** → ✅ Fixed
   - Issue: `type: 'message'` was not in the enum
   - Fix: Added type mapping to convert `'message'` → `'chat'`
   - Location: `lib/notificationService.js`

2. **❌ Missing User Field Error** → ✅ Fixed
   - Issue: Notifications were being created without proper validation
   - Fix: Added user ID validation and better error handling
   - Location: `lib/notificationService.js`

3. **❌ Database Save Blocking FCM** → ✅ Fixed
   - Issue: DB validation errors were preventing FCM notifications
   - Fix: Moved DB save AFTER FCM send, wrapped in try-catch
   - Location: `lib/notificationService.js`

4. **❌ Missing VAPID Key** → ✅ Fixed
   - Issue: `.env` had placeholder `your-vapid-key`
   - Fix: Updated with actual VAPID key
   - Location: `.env`

5. **⚠️ Service Worker Not Optimized** → ✅ Enhanced
   - Added WhatsApp-like notification behavior
   - Enhanced vibration patterns
   - Better window focus handling
   - Action buttons (Open/Dismiss)
   - Location: `public/firebase-messaging-sw.js`

---

## 🚀 How to Test

### Step 1: Restart Your Development Server

**IMPORTANT:** You must restart the server for the new VAPID key to take effect!

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 2: Clear Browser Cache & Service Workers

1. Open **Chrome DevTools** (F12)
2. Go to **Application** tab
3. Click **Service Workers** (left sidebar)
4. Click **Unregister** on any existing service workers
5. Click **Clear storage** (left sidebar)
6. Check all boxes and click **Clear site data**
7. **Refresh the page** (F5)

### Step 3: Login and Allow Notifications

1. Login to your app: `http://localhost:3000`
2. You should see a browser notification permission prompt
3. Click **Allow**
4. Check the console - you should see:
   ```
   [Push] FCM token obtained: ...
   [Push] Token saved to backend successfully
   ```

### Step 4: Test Background Notifications

#### Test 1: Chat Message (App Minimized)
1. Open the app in **Browser Window 1**
2. Login as **User A**
3. **Minimize the browser** (don't close, just minimize)
4. Open the app in **Browser Window 2** (or different browser)
5. Login as **User B**
6. Send a message to **User A**
7. **Check Window 1** - you should see a notification in the system tray!

#### Test 2: Chat Message (App Closed)
1. Login to the app
2. **Close the browser completely**
3. Have someone send you a message
4. **You should receive a notification!**
5. Click the notification - it should open the app to the chat

#### Test 3: Task Assignment
1. Login as an admin/manager
2. Assign a task to another user
3. The user should receive a notification (even if app is closed)

---

## 🐛 Debugging Checklist

### Check 1: Firebase Admin Credentials
Open terminal and check logs when server starts:
```
✅ Should see: "[Firebase Admin] Initialized successfully"
❌ If you see: "Missing Firebase credentials" - check .env file
```

### Check 2: FCM Token Registration
Open browser console after login:
```javascript
// Should see these logs:
[Push] Initializing push notifications...
[Push] FCM token obtained: eXxxx...
[Push] Token saved to backend successfully
```

### Check 3: Service Worker Registration
In browser console:
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations)
})

// Should show firebase-messaging-sw.js
```

### Check 4: Notification Permission
In browser console:
```javascript
console.log('Notification permission:', Notification.permission)
// Should be: "granted"
```

### Check 5: Backend Logs
When a notification is sent, check server logs:
```
✅ Should see:
[Firebase Admin] Batch 1: 1 success, 0 failures
✅ Notification sent successfully: 💬 New message from John Doe
✅ Saved 1 notification(s) to database

❌ Should NOT see:
❌ Failed to send notification: ...
Notification validation failed: ...
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "No FCM tokens found"
**Cause:** User hasn't granted notification permission
**Solution:**
1. Check browser notification settings
2. Clear site data and try again
3. Try in incognito mode

### Issue 2: "Service worker not found"
**Cause:** Service worker file not accessible
**Solution:**
1. Ensure `public/firebase-messaging-sw.js` exists
2. Restart dev server
3. Clear browser cache

### Issue 3: Notifications not showing when app is closed
**Cause:** Browser might be blocking background notifications
**Solution:**
1. Check browser notification settings
2. Ensure "Background sync" is enabled
3. Try in Chrome (best support)

### Issue 4: "Firebase Admin initialization error"
**Cause:** Invalid Firebase credentials
**Solution:**
1. Check `.env` file has all Firebase variables
2. Ensure `FIREBASE_PRIVATE_KEY` has proper line breaks (`\n`)
3. Restart server after changing .env

### Issue 5: Notification shows but no sound
**Cause:** Browser/OS notification settings
**Solution:**
1. Check system notification settings
2. Ensure "Do Not Disturb" is off
3. Check browser notification sound settings

---

## 📊 Testing Matrix

| Scenario | App State | Expected Result |
|----------|-----------|-----------------|
| Chat message | Open & Active | In-app toast notification |
| Chat message | Open & Minimized | System notification + sound |
| Chat message | Closed | System notification + sound |
| Task assigned | Open & Active | In-app toast notification |
| Task assigned | Closed | System notification + sound |
| Announcement | Open & Active | In-app toast notification |
| Announcement | Closed | System notification + sound |

---

## 🎯 Expected Behavior (WhatsApp-like)

✅ **When app is OPEN:**
- Show in-app toast notification (handled by Socket.IO)
- No system notification (to avoid duplicates)

✅ **When app is MINIMIZED:**
- Show system notification
- Play notification sound
- Vibrate (on mobile)
- Show in notification panel

✅ **When app is CLOSED:**
- Show system notification
- Play notification sound
- Vibrate (on mobile)
- Click notification → Opens app to specific page

✅ **Notification Features:**
- Custom icon and badge
- Action buttons (Open/Dismiss)
- Click to open specific page
- Auto-dismiss after timeout
- Vibration pattern: 200ms, 100ms, 200ms, 100ms, 200ms

---

## 🧪 Manual Test Script

Run this in browser console to test notification manually:

```javascript
// Test if notifications are working
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('Test Notification', {
    body: 'This is a test notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200]
  })
  console.log('✅ Test notification sent!')
} else {
  console.log('❌ Notification permission not granted')
}
```

---

## 📞 Need Help?

If you're still having issues:

1. **Check all logs** (browser console + server terminal)
2. **Share the exact error message**
3. **Mention which test scenario failed**
4. **Include browser and OS version**

Happy testing! 🎉

