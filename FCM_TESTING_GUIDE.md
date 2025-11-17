# Firebase Cloud Messaging (FCM) Testing Guide

## Quick Verification Checklist

Use this guide to verify that FCM is working correctly after the fix.

## 1. Browser Console Verification

### Open DevTools Console (F12 or Cmd+Option+I)

**Expected Output (in order):**

```
[FirebaseInit] Starting initialization...
[FirebaseInit] Registering service worker...
[SW] Combined Service Worker starting...
[SW] Firebase Messaging initialized successfully
[FirebaseInit] ✅ Service worker registered: /
[FirebaseInit] ✅ Service worker ready
[FirebaseInit] User logged in: <user-id>
[Firebase] Notification permission: granted (or prompt)
[Firebase] Service worker ready: /
[Firebase] FCM token obtained: <long-token-string>
[FirebaseInit] ✅ FCM token obtained
[Firebase] Token saved to backend: { success: true }
```

### ❌ What You Should NOT See:

```
❌ messaging/failed-service-worker-registration
❌ bad-precaching-response
❌ Service worker not registered after 10000 ms
❌ 404 on /_next/app-build-manifest.json
```

## 2. Service Worker Verification

### DevTools > Application > Service Workers

**Expected State:**

- **Source**: `/firebase-messaging-sw.js`
- **Status**: `activated and running`
- **Scope**: `/`
- **Update on reload**: ✅ (optional)

**Should NOT see:**
- ❌ Multiple service workers registered
- ❌ `sw.js` (Workbox) registered
- ❌ `OneSignalSDKWorker.js` registered
- ❌ Status: "redundant" or "waiting"

## 3. Network Tab Verification

### DevTools > Network > Filter by "sw"

**Expected Requests:**

1. `GET /firebase-messaging-sw.js` → **200 OK**
2. `POST /api/fcm/save-token` → **200 OK**

**Should NOT see:**
- ❌ `GET /sw.js` (Workbox)
- ❌ `GET /_next/app-build-manifest.json` → 404
- ❌ `POST /api/fcm/save-token` → 500 or 400

## 4. Server Logs Verification

### Check Terminal/Server Logs

**Expected Output:**

```
[PWA] PWA support is disabled ✅
[Firebase] App initialized successfully ✅
[FCM] Token updated for user <user-id> ✅
POST /api/fcm/save-token 200 ✅
```

**Should NOT see:**
- ❌ Service worker registration errors
- ❌ Firebase initialization errors
- ❌ FCM token save failures

## 5. Notification Permission Test

### Test Notification Permission Flow

1. **If permission is "default" (not granted yet):**
   - Browser should show permission prompt
   - Click "Allow"
   - Console should show: `[Firebase] Notification permission: granted`
   - FCM token should be generated

2. **If permission is "denied":**
   - Console should show: `[Firebase] Notification permission denied`
   - No FCM token will be generated (expected behavior)
   - User must manually enable in browser settings

3. **If permission is "granted":**
   - FCM token should be generated immediately
   - Token should be saved to backend

## 6. Background Notification Test

### Send Test Notification from Backend

**Method 1: Using API Route**

```bash
curl -X POST http://localhost:3000/api/notifications/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "userId": "<user-id>",
    "title": "Test Notification",
    "body": "This is a test notification",
    "url": "/dashboard"
  }'
```

**Method 2: Using Firebase Console**

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Select target: "User segment" → "All users"
5. Click "Send"

**Expected Result:**

- Notification appears in system tray (when app is in background)
- Click notification → Opens app and navigates to URL
- Console shows: `[SW] Background FCM message received`

## 7. Foreground Notification Test

### Test In-App Notifications (App Visible)

1. Keep app open and visible
2. Send notification from backend
3. **Expected**: In-app notification via Socket.IO (not browser notification)
4. Console should show: `[FirebaseInit] Foreground message received`

## 8. Token Persistence Test

### Verify Token is Saved and Persists

1. **Check localStorage:**
   - DevTools > Application > Local Storage
   - Look for key: `fcm-token`
   - Value should be a long string

2. **Refresh page:**
   - Token should be reused (not regenerated)
   - Console should show: `[FirebaseInit] ✅ FCM token already exists`

3. **Check database:**
   - User document should have `fcmTokens` array
   - Token should be in the array

## 9. Multi-Device Test

### Test Multiple Devices/Browsers

1. Login on Device A → FCM token generated
2. Login on Device B → Different FCM token generated
3. Send notification → Both devices should receive it
4. Logout on Device A → Token should be removed
5. Send notification → Only Device B receives it

## 10. Error Handling Test

### Test Error Scenarios

**Scenario 1: No Internet Connection**
- Disconnect internet
- Refresh page
- **Expected**: Service worker still registered (from cache)
- **Expected**: FCM token request fails gracefully

**Scenario 2: Service Worker Blocked**
- DevTools > Application > Service Workers
- Click "Unregister"
- Refresh page
- **Expected**: Service worker re-registers automatically

**Scenario 3: Invalid VAPID Key**
- Temporarily change VAPID key in `.env.local`
- Refresh page
- **Expected**: Error in console, but app doesn't crash

## 11. Production Deployment Test

### Before Deploying to Production

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start in production mode:**
   ```bash
   npm start
   ```

3. **Test all scenarios above** in production mode

4. **Check for any build warnings** related to service workers

5. **Verify environment variables** are set correctly in production

## Troubleshooting

### If FCM Token is Not Generated:

1. **Check notification permission**: Must be "granted"
2. **Check service worker**: Must be "activated and running"
3. **Check VAPID key**: Must be set in `.env.local`
4. **Check browser support**: Chrome, Firefox, Edge (not Safari on iOS)
5. **Check console errors**: Look for Firebase errors

### If Notifications Not Received:

1. **Check FCM token**: Must be saved in database
2. **Check backend**: Verify notification is being sent
3. **Check app state**: Background notifications only work when app is hidden
4. **Check browser settings**: Notifications must be enabled
5. **Check Do Not Disturb**: System DND mode blocks notifications

### If Service Worker Fails to Register:

1. **Check HTTPS**: Service workers require HTTPS (or localhost)
2. **Check file path**: `/firebase-messaging-sw.js` must exist
3. **Check syntax errors**: Open SW file directly in browser
4. **Check browser console**: Look for registration errors
5. **Clear cache**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## Success Criteria

✅ Service worker registers successfully  
✅ FCM token is generated  
✅ Token is saved to backend  
✅ Background notifications work  
✅ Foreground notifications work (via Socket.IO)  
✅ Notification clicks navigate correctly  
✅ No console errors  
✅ No service worker conflicts  

## Need Help?

If any test fails, check:
1. `FCM_SERVICE_WORKER_FIX.md` - Technical details
2. `FCM_FIX_SUMMARY.md` - Overview and solution
3. Browser console for specific errors
4. Server logs for backend issues

