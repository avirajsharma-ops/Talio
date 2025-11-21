# 🔔 WhatsApp-Style Push Notifications - Complete Setup Guide

## ✅ What Has Been Implemented

Your Talio HRMS now has a **production-ready, WhatsApp-style push notification system** that works when the app is completely closed!

### 🎯 Key Features

- ✅ **Auto-Request Permission** - Automatically asks for notification permission 2 seconds after login (like WhatsApp)
- ✅ **Background Notifications** - Works when browser/app is completely closed
- ✅ **Device Default Sound** - Uses system notification sound (respects user preferences)
- ✅ **Android WebView Support** - Full compatibility with Android WebView apps
- ✅ **Web Browser Support** - Works on all modern browsers (Chrome, Firefox, Edge, Safari)
- ✅ **Automatic Token Refresh** - FCM token refreshes on every login
- ✅ **Dual Notification System**:
  - Socket.IO for realtime (when app is open)
  - FCM for push notifications (when app is closed)

---

## 📋 Complete Implementation Checklist

### ✅ Files Modified/Created

1. **`components/PushNotificationProvider.js`** - Auto-requests FCM permission
2. **`components/FirebaseInit.js`** - Initializes FCM and refreshes token on login
3. **`public/firebase-messaging-sw.js`** - Service worker for background notifications
4. **`lib/firebase-admin.js`** - Backend FCM notification sender with Android config
5. **`lib/firebase.js`** - Firebase client SDK (already existed)
6. **`lib/pushNotification.js`** - Helper functions (already existed)
7. **`app/api/fcm/save-token/route.js`** - Save FCM tokens (already existed)
8. **`.env.example`** - Updated with Firebase configuration template

### 🔧 API Routes with FCM Integration

All these routes now send push notifications:

- ✅ Chat messages (`app/api/chat`)
- ✅ Tasks (`app/api/tasks`)
- ✅ Announcements (`app/api/announcements`)
- ✅ Leave management (`app/api/leave`)
- ✅ Expenses (`app/api/expenses`)
- ✅ Travel requests (`app/api/travel`)
- ✅ Projects (`app/api/projects`)
- ✅ Helpdesk tickets (`app/api/helpdesk`)
- ✅ Documents (`app/api/documents`)
- ✅ Assets (`app/api/assets`)
- ✅ Payroll (`app/api/payroll`)
- ✅ Performance reviews (`app/api/performance`)

---

## 🚀 Setup Instructions

### Step 1: Add Environment Variables

You need to add Firebase configuration to your environment. Create a `.env.local` file (for development) or add these to your server environment (for production):

```bash
# ===========================================
# FIREBASE CLOUD MESSAGING (PUSH NOTIFICATIONS)
# ===========================================

# Firebase Client Configuration (Public - goes to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDEyadwMSwamwG-KeMwzGwZ15UArNdJn-Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-e9deb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-e9deb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-e9deb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=241026194465
NEXT_PUBLIC_FIREBASE_APP_ID=1:241026194465:web:b91d15bf73bcf807ad1760
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase Admin SDK (Private - server only)
# Get from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
FIREBASE_PROJECT_ID=talio-e9deb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@talio-e9deb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# VAPID Key for Web Push
# Get from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
```

**⚠️ IMPORTANT:** The Firebase credentials above are from the service worker in `public/firebase-messaging-sw.js`. You need to:

1. **Get Firebase Admin Private Key:**
   - Go to https://console.firebase.google.com/
   - Select your project: `talio-e9deb`
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
   - Copy the values to your `.env.local`

2. **Get VAPID Key:**
   - Go to **Project Settings** → **Cloud Messaging**
   - Under **Web Push certificates**, click **Generate Key Pair**
   - Copy the key to `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

### Step 2: Verify Service Worker Registration

The service worker (`firebase-messaging-sw.js`) is automatically registered by `FirebaseInit.js` component. No manual action needed.

### Step 3: Test the Implementation

#### Local Development Testing:

```powershell
# Start the development server
npm run dev
```

#### Test Scenario 1: Auto Permission Request (WhatsApp-style)

1. Open http://localhost:3000
2. Login with your credentials
3. **Wait 2 seconds** - Browser will automatically ask for notification permission
4. Click **Allow** in the browser prompt
5. Check console - you should see:
   ```
   [FirebaseInit] ✅ FCM token obtained
   [FirebaseInit] ✅ Token saved to backend
   [PushProvider] ✅ Push notifications enabled successfully
   ```

#### Test Scenario 2: Background Notification (App Closed)

1. **Login on Computer A** (allow notifications)
2. **Close all browser tabs completely** (NOT just minimize)
3. **Login on Computer B** or use API to trigger a notification
4. **Computer A** should receive:
   - ✅ OS-level notification (Windows notification center, Android notification drawer)
   - ✅ System notification sound
   - ✅ Click notification → Opens browser to relevant page

#### Test Scenario 3: Foreground Notification (App Open)

1. Keep browser open on the dashboard
2. Trigger a notification from another device/browser
3. You should see:
   - ✅ In-app notification banner (via Socket.IO)
   - ✅ Notification sound

---

## 🧪 Testing Push Notifications

### Quick Test API Endpoint

Use this endpoint to test push notifications:

**POST** `http://localhost:3000/api/test-push`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "USER_ID_HERE",
  "title": "Test Notification",
  "body": "This is a test push notification"
}
```

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/api/test-push \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "title": "🧪 Test Push Notification",
    "body": "Testing WhatsApp-style notifications!"
  }'
```

---

## 📱 Android WebView Configuration

For your Android WebView app, ensure the following:

### 1. **Android Notification Channel**

The app creates a notification channel called `talio_notifications`. Make sure your Android app has this channel configured:

```kotlin
// In your MainActivity.java or MainActivity.kt
val channel = NotificationChannel(
    "talio_notifications",
    "Talio HRMS Notifications",
    NotificationManager.IMPORTANCE_HIGH
).apply {
    description = "Notifications for Talio HRMS"
    enableLights(true)
    lightColor = Color.parseColor("#192A5A")
    enableVibration(true)
    setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build()
    )
}

val notificationManager = getSystemService(NotificationManager::class.java)
notificationManager.createNotificationChannel(channel)
```

### 2. **WebView Setup**

```kotlin
webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true // Important for FCM
}

// Allow notifications
webView.webChromeClient = object : WebChromeClient() {
    override fun onPermissionRequest(request: PermissionRequest) {
        request.grant(request.resources)
    }
}
```

### 3. **Firebase FCM Service (Android)**

If you want native Android notifications, add `google-services.json` to your Android project and implement `FirebaseMessagingService`.

---

## 🎯 How It Works

### Flow Diagram:

```
User Logs In
    ↓
[PushNotificationProvider]
    ↓ (2 seconds delay)
Request Notification Permission
    ↓
User Clicks "Allow"
    ↓
[lib/firebase.js] requestFCMToken()
    ↓
Register Service Worker
    ↓
Get FCM Token from Firebase
    ↓
[app/api/fcm/save-token] Save to Database
    ↓
✅ Ready to Receive Push Notifications
```

### When Notification is Triggered:

**App OPEN:**
```
Backend Event → Socket.IO → InAppNotificationContext → Show Banner + Play Sound
```

**App CLOSED:**
```
Backend Event → Firebase Admin SDK → FCM → Service Worker → OS Notification + Default Sound
```

---

## 🔍 Debugging

### Check if FCM is Working:

1. **Open Browser DevTools** → Console
2. Look for these logs:
   ```
   [FirebaseInit] ✅ Service worker registered
   [FirebaseInit] ✅ FCM token obtained
   [FirebaseInit] ✅ Token saved to backend
   ```

3. **Check Service Worker:**
   - DevTools → Application → Service Workers
   - Should see `firebase-messaging-sw.js` registered

4. **Check FCM Token in Database:**
   ```javascript
   // In browser console
   localStorage.getItem('fcm-token')
   ```

5. **Check MongoDB:**
   ```javascript
   db.users.findOne({ email: "user@example.com" }, { fcmTokens: 1 })
   ```

### Common Issues:

| Issue | Solution |
|-------|----------|
| **Permission Denied** | User must manually enable in browser settings |
| **Service Worker Failed** | Only works on HTTPS or localhost |
| **No Token Generated** | Check Firebase credentials in `.env` |
| **Notifications Not Showing** | Check browser notification settings |
| **Sound Not Playing** | Device may be in silent mode |

---

## 📊 Browser Support

| Browser | Desktop | Mobile | Background Notifications |
|---------|---------|--------|--------------------------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari | ✅ (macOS 13+) | ⚠️ (iOS 16.4+) | ⚠️ Limited |
| Android WebView | N/A | ✅ | ✅ |

**Note:** Safari on iOS has limited push notification support. For full iOS support, consider building a native iOS app.

---

## 🎨 Customization

### Change Notification Sound:

The system now uses **device default notification sound** which respects user preferences. This is the recommended approach for production apps.

If you want a custom sound (not recommended):
1. Uncomment the Web Audio API code in `public/firebase-messaging-sw.js`
2. Replace `/sounds/notification.mp3` with your custom sound file

### Change Notification Icon:

Update in `lib/firebase-admin.js`:

```javascript
icon: '/icons/your-custom-icon.png',
badge: '/icons/your-custom-badge.png',
```

---

## 🚀 Deployment Notes

### For Production (Docker/Server):

1. **Set Environment Variables:**
   - Add all `FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` variables to your server environment
   - Use GitHub Secrets for CI/CD

2. **HTTPS Required:**
   - Service workers ONLY work on HTTPS (or localhost)
   - Ensure your production server uses HTTPS

3. **Service Worker Caching:**
   - Service worker updates automatically on deployment
   - Clear browser cache if needed: `Ctrl + Shift + Delete`

### For Android WebView App:

1. Add `google-services.json` to your Android project
2. Implement notification channels (see Android section above)
3. Request notification permission on app startup

---

## 📈 Monitoring

Track notification delivery:

1. **Firebase Console:**
   - https://console.firebase.google.com/
   - Cloud Messaging → Analytics
   - View send success rate, delivery rate

2. **Backend Logs:**
   - Check server logs for `[Firebase Admin]` entries
   - Success: `✅ Notification sent successfully`
   - Failure: `❌ Error sending notification`

3. **Database:**
   - Query `fcmTokens` array in User model
   - Check `lastUsed` timestamp to identify inactive tokens

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Firebase environment variables set in production server
- [ ] HTTPS enabled on production domain
- [ ] Service worker accessible at `/firebase-messaging-sw.js`
- [ ] Firebase Admin private key properly escaped (replace `\n` with actual newlines)
- [ ] VAPID key configured in Firebase console
- [ ] Notification permission auto-requested on first login
- [ ] Tested notifications on all supported browsers
- [ ] Android WebView notification channels configured (if using Android app)
- [ ] Monitoring set up in Firebase console

---

## 🎉 You're All Set!

Your Talio HRMS now has **enterprise-grade push notifications** that work exactly like WhatsApp:

✅ Auto-requests permission on login
✅ Works when app is completely closed
✅ Uses device default notification sound
✅ Supports both web browsers and Android WebView
✅ Automatic token refresh
✅ Comprehensive error handling

**Test it now:**
1. Login on one device
2. Close the browser completely
3. Trigger a notification from another device
4. See the magic happen! 🎊

---

## 📞 Need Help?

- Check browser console for detailed logs
- Verify environment variables are set correctly
- Ensure HTTPS is enabled (or using localhost)
- Check Firebase console for delivery metrics
- Review this guide for troubleshooting steps

**Happy coding! 🚀**
