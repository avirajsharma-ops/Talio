# Troubleshooting Guide - Firebase Push Notifications

## 🔍 Quick Diagnostics

### 1. Check if Firebase is Configured
```bash
# In your terminal, check environment variables
grep FIREBASE .env.local
```

**Expected output:**
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BM4z...
```

If missing → Set up Firebase credentials first

---

### 2. Check if User Has FCM Tokens
```javascript
// In MongoDB or via API
db.users.findOne({ email: "your@email.com" }, { fcmTokens: 1 })

// Should return:
{
  "_id": ObjectId("..."),
  "fcmTokens": [
    {
      "token": "dXRjNzY...",
      "device": "Chrome on Mac",
      "addedAt": ISODate("2025-11-26...")
    }
  ]
}
```

If empty → User needs to login again and grant notification permissions

---

### 3. Check Console Logs When Sending
**Expected log sequence:**
```
[Notifications] Current user: { userId: '...', role: 'admin' }
[Notifications] Permission check: { hasPermission: true }
[Database] Saved 1 notification(s) to database
[OneSignal] Sending to 1 user(s)
[OneSignal] Notification sent successfully
[Firebase] Sending push notification to 1 user(s)
✅ Notification sent successfully: { messageId: '...' }
[Firebase] Push notification sent successfully to 1 user(s)
```

If you see errors → Check specific error below

---

## ❌ Common Errors & Solutions

### Error 1: "Firebase not initialized"
```
⚠️  FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables
⚠️  Push notifications will not work
```

**Cause:** Firebase service account key not configured

**Solution:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy entire JSON content
5. Add to `.env.local`:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'
   ```
6. Restart server: `npm run dev`

---

### Error 2: "No FCM tokens found for user"
```
[Firebase] No FCM tokens found for user 507f1f77bcf86cd799439011
```

**Cause:** User hasn't registered for push notifications

**Solution:**
1. User must login to web app
2. Browser will prompt for notification permission
3. User must click "Allow"
4. FCM token automatically saved to database
5. Try sending notification again

**Force Re-registration:**
```javascript
// In browser console on the app
localStorage.removeItem('fcm-token-registered')
location.reload()
// Login again and allow notifications
```

---

### Error 3: "messaging/registration-token-not-registered"
```
❌ Error sending notification: messaging/registration-token-not-registered
```

**Cause:** FCM token is invalid or expired

**Solution:**
```javascript
// Clean up invalid tokens
// In your MongoDB shell or admin panel:
db.users.updateMany(
  {},
  { $set: { fcmTokens: [] } }
)
```

Then ask users to:
1. Logout
2. Login again
3. Grant notification permissions

---

### Error 4: "Firebase project ID mismatch"
```
Error: Firebase project ID mismatch
Expected: talio-hrms-123
Got: different-project-456
```

**Cause:** Service account key is from different Firebase project

**Solution:**
1. Verify Firebase project in console
2. Ensure all Firebase env vars are from SAME project:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
3. Regenerate service account key from correct project
4. Update `.env.local`
5. Restart server

---

### Error 5: "Only OneSignal works, Firebase doesn't"
```
[OneSignal] Notification sent successfully
[Firebase] Error sending push notification: ...
```

**Cause:** This is actually NORMAL! System has graceful fallback

**Solution:**
- If OneSignal works, notifications ARE being delivered
- Firebase is a bonus delivery method
- Fix Firebase configuration to enable mobile push
- Check specific Firebase error in logs
- Until fixed, OneSignal continues working

---

### Error 6: "Notification sent but not received"
```
{
  "success": true,
  "firebasePushSuccess": true
}
```
But user doesn't see notification

**Possible Causes & Solutions:**

**A. Browser permissions not granted**
```javascript
// Check in browser console:
Notification.permission
// Should be "granted"
```
Solution: Clear browser permissions, reload, allow again

**B. Service worker not registered**
```javascript
// Check in browser console:
navigator.serviceWorker.getRegistrations()
// Should return array with firebase-messaging-sw.js
```
Solution: Ensure `firebase-messaging-sw.js` exists in `/public`

**C. Tab is focused**
- Some browsers don't show notification if tab is active
- Solution: Switch to another tab/window and test

**D. Do Not Disturb mode**
- Check device notification settings
- Ensure app notifications enabled

---

### Error 7: "Scheduled notifications not sent"
```
// Notification shows as "pending" in database
// Past scheduled time but not sent
```

**Cause:** Cron job not running

**Solution:**
1. **Manual trigger for testing:**
   ```bash
   curl "http://localhost:3000/api/notifications/process?secret=YOUR_CRON_SECRET"
   ```

2. **Set up proper cron job:**
   ```bash
   # On Linux/Mac, edit crontab:
   crontab -e
   
   # Add this line (runs every minute):
   * * * * * curl "https://your-domain.com/api/notifications/process?secret=YOUR_CRON_SECRET"
   ```

3. **For Vercel deployment:**
   - Create `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/notifications/process",
       "schedule": "* * * * *"
     }]
   }
   ```

4. **For GitHub Actions:**
   - Create `.github/workflows/cron-notifications.yml`
   - See `DEPLOYMENT_GUIDE.md` for details

---

### Error 8: "403 Forbidden - You do not have permission"
```json
{
  "success": false,
  "message": "You do not have permission to send notifications"
}
```

**Cause:** User role is not admin/hr/department_head

**Solution:**
1. Check user role in database:
   ```javascript
   db.users.findOne({ email: "user@email.com" }, { role: 1 })
   ```

2. Update user role if needed:
   ```javascript
   db.users.updateOne(
     { email: "user@email.com" },
     { $set: { role: "admin" } }
   )
   ```

3. Allowed roles:
   - `admin` - Can send to anyone
   - `hr` - Can send to anyone
   - `department_head` - Can send to own department only

---

## 🧪 Testing Checklist

### Test 1: Verify Firebase is Working
```bash
# 1. Check service account key is set
echo $FIREBASE_SERVICE_ACCOUNT_KEY | head -c 50

# 2. Restart server
npm run dev

# 3. Check logs for Firebase initialization
# Should see: ✅ Firebase Admin SDK initialized successfully
```

---

### Test 2: Send Test Notification
1. Login as admin
2. Go to Settings → Notifications
3. Send to yourself
4. Check console for:
   ```
   [Firebase] Sending push notification to 1 user(s)
   ✅ Notification sent successfully
   [Firebase] Push notification sent successfully to 1 user(s)
   ```

---

### Test 3: Check Database
```javascript
// Check notification was saved
db.notifications.find().sort({ createdAt: -1 }).limit(1).pretty()

// Should show:
{
  deliveryStatus: {
    fcm: {
      sent: true,
      sentAt: ISODate("2025-11-26...")
    },
    oneSignal: {
      sent: true,
      sentAt: ISODate("2025-11-26...")
    }
  }
}
```

---

### Test 4: Check User Received Notification
1. Look for browser notification popup
2. Check notification bell icon for badge
3. Click bell to see in-app notification list
4. On mobile, check notification tray

---

## 🔧 Advanced Debugging

### Enable Verbose Logging
```javascript
// In lib/firebaseNotification.js, add at top:
console.log('[Firebase Debug] All outgoing notifications:', {
  tokens,
  notification,
  data
})
```

### Check Firebase Quota
1. Go to Firebase Console
2. Navigate to Cloud Messaging
3. Check "Messages sent" graph
4. Verify you're not hitting quota limits

### Test FCM Token Directly
```bash
# Use Firebase's test notification feature
# Firebase Console → Cloud Messaging → Send test message
# Paste your FCM token and send
```

### Monitor Network Requests
1. Open Browser DevTools → Network
2. Filter: `fcm` or `firebase`
3. Send notification
4. Look for requests to `fcm.googleapis.com`
5. Check response status (should be 200)

---

## 📊 Health Check Script

Create a test script to verify everything:

```javascript
// scripts/test-notifications.js
const { sendPushToUsers } = require('./lib/pushNotification')

async function testNotifications() {
  console.log('🧪 Testing Firebase Push Notifications...\n')
  
  // Test user ID (replace with real user ID)
  const testUserId = '507f1f77bcf86cd799439011'
  
  try {
    const result = await sendPushToUsers(
      [testUserId],
      {
        title: '🧪 Test Notification',
        body: 'This is a test from the test script'
      },
      {
        url: '/dashboard',
        type: 'test'
      }
    )
    
    console.log('✅ Test Result:', result)
    
    if (result.success) {
      console.log('✅ Firebase is working correctly!')
    } else {
      console.log('❌ Firebase failed:', result.message)
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testNotifications()
```

Run:
```bash
node scripts/test-notifications.js
```

---

## 🆘 Still Not Working?

### 1. Check All Environment Variables
```bash
# Required for Firebase
FIREBASE_SERVICE_ACCOUNT_KEY=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# Required for OneSignal (fallback)
ONESIGNAL_APP_ID=...
ONESIGNAL_REST_API_KEY=...
NEXT_PUBLIC_ONESIGNAL_APP_ID=...
```

### 2. Verify Files Exist
```bash
ls -la public/firebase-messaging-sw.js
ls -la lib/firebaseNotification.js
ls -la lib/pushNotification.js
```

### 3. Clear All Caches
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Restart
npm run dev
```

### 4. Test in Different Browser
- Chrome → Best support
- Firefox → Good support
- Safari → Limited support (no web push on Mac)
- Mobile browsers → Excellent support

### 5. Contact Support
If nothing works, collect these details:
- Console logs (full output)
- Environment variables (sanitized, no secrets)
- Browser/device info
- Database notification document
- Network tab screenshot

---

## ✅ Success Indicators

You know it's working when:
- ✅ Console shows: `[Firebase] Push notification sent successfully`
- ✅ Database shows: `deliveryStatus.fcm.sent: true`
- ✅ Browser notification appears
- ✅ Mobile notification appears (if app installed)
- ✅ In-app notification badge increments
- ✅ API response includes: `firebasePushSuccess: true`

---

## 📚 Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [OneSignal Documentation](https://documentation.onesignal.com/)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- Project Documentation:
  - `FIREBASE_NOTIFICATION_INTEGRATION_COMPLETE.md`
  - `QUICK_TEST_GUIDE_NOTIFICATIONS.md`
  - `NOTIFICATION_FLOW_DIAGRAM.md`
