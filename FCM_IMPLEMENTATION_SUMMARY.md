# Firebase Cloud Messaging (FCM) Implementation Summary

## 🎯 Overview
Talio HRMS now uses **Firebase Cloud Messaging (FCM)** for push notifications on Android devices. OneSignal has been completely removed and replaced with a native Firebase implementation.

---

## ✅ What's Been Completed

### 1. **Android App Integration**
- ✅ Added Firebase SDK dependencies
- ✅ Created `FirebaseMessagingService.kt` for handling notifications
- ✅ Updated `MainActivity.kt` with FCM JavaScript bridge (`AndroidFCM`)
- ✅ Updated `TalioApplication.kt` to initialize Firebase
- ✅ Removed all OneSignal code from Android
- ✅ Configured notification channel for Android 8+

### 2. **Backend Services**
- ✅ Created `lib/firebaseNotification.js` - Firebase Admin SDK service
  - `initializeFirebase()` - Initialize with service account
  - `sendNotificationToDevice()` - Single device notification
  - `sendNotificationToMultipleDevices()` - Batch notifications
  - `sendNotificationToUser()` - User-aware (respects preferences)
  - `sendNotificationToUsers()` - Bulk user notifications
- ✅ Updated `lib/notificationService.js` - Replaced OneSignal with FCM
- ✅ Updated `models/Notification.js` - Changed deliveryStatus schema

### 3. **API Routes**
- ✅ Created `app/api/fcm/token/route.js`
  - `POST` - Register FCM token
  - `DELETE` - Unregister FCM token
  - `PUT` - Update notification preferences

### 4. **Client-Side Helpers**
- ✅ Created `lib/fcmHelper.js` - WebView integration utilities
  - `isFCMSupported()` - Check Android WebView
  - `registerFCMToken()` - Register token with backend
  - `unregisterFCMToken()` - Remove token on logout
  - `updateNotificationPreferences()` - Update user preferences
  - `areNotificationsEnabled()` - Check if type enabled

### 5. **Database Schema**
- ✅ Updated `models/User.js`
  - Removed: `oneSignalPlayerId`, `oneSignalSubscribedAt`, `notificationPermissionStatus`
  - Updated: `fcmTokens` array with device info
  - Added: `notificationPreferences` object (chat, projects, leave, attendance, announcements)

### 6. **Documentation**
- ✅ Created comprehensive `FCM_SETUP_GUIDE.md`
- ✅ Created this implementation summary

---

## 📱 Notification Flow

### Registration Flow
```
1. User logs in → Android app
2. Android retrieves FCM token from Firebase
3. AndroidFCM.registerToken(userId) called
4. Token sent to backend via /api/fcm/token (POST)
5. Token stored in user.fcmTokens array
6. Success confirmation returned to app
```

### Notification Delivery Flow
```
1. Event occurs (e.g., chat message sent)
2. Backend calls sendNotificationToUser(user, notification, data)
3. Check user.notificationPreferences for that type
4. Get user.fcmTokens array
5. Send multicast notification to all devices
6. Firebase delivers notification to Android
7. FirebaseMessagingService receives & displays
8. Save notification to database for history
```

---

## 🔔 Notification Types Supported

### Already Implemented (15+ types)
All these notifications are **automatically sent** when events occur:

| Category | Event | Recipients |
|----------|-------|------------|
| **Chat** | New message | Conversation participants |
| **Tasks** | Task assigned | Assignee |
| **Tasks** | Task completed | Task creator |
| **Tasks** | Task status updated | Assignee |
| **Leave** | Leave request submitted | Approvers |
| **Leave** | Leave approved | Employee |
| **Leave** | Leave rejected | Employee |
| **Attendance** | Check-in reminder | Employee |
| **Attendance** | Check-out reminder | Employee |
| **Announcements** | New announcement | Target employees |
| **Policies** | New policy published | All employees |
| **Expenses** | Expense approved | Employee |
| **Expenses** | Expense rejected | Employee |
| **Travel** | Travel approved | Employee |
| **Helpdesk** | Ticket assigned | Assignee |
| **Helpdesk** | Ticket status updated | Ticket creator |
| **Payroll** | Payslip generated | Employee |
| **Performance** | Review completed | Employee |

---

## 🔧 Configuration Required

### 1. Firebase Console Setup (User Must Do)
```
1. Create Firebase project
2. Add Android app (package: sbs.zenova.twa)
3. Download google-services.json → android/app/
4. Generate service account key → .env.local
```

### 2. Environment Variables (.env.local)
```bash
# Required for FCM
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 3. Build Android App
```bash
cd android
./gradlew clean assembleRelease
```

---

## 📂 File Structure

### New Files Created
```
lib/
├── firebaseNotification.js      # Firebase Admin SDK service
└── fcmHelper.js                  # Client-side WebView integration

app/api/fcm/
└── token/
    └── route.js                  # Token management API

android/app/src/main/java/sbs/zenova/twa/
├── services/
│   └── FirebaseMessagingService.kt  # Android notification receiver
├── TalioApplication.kt          # Updated for Firebase
└── MainActivity.kt               # Updated with FCM bridge

docs/
├── FCM_SETUP_GUIDE.md           # Complete setup guide
└── FCM_IMPLEMENTATION_SUMMARY.md # This file
```

### Modified Files
```
models/
├── User.js                       # Cleaned OneSignal, updated fcmTokens
└── Notification.js               # Changed deliveryStatus schema

lib/
└── notificationService.js        # Replaced OneSignal with FCM

android/
├── build.gradle                  # Added Google Services
└── app/
    ├── build.gradle              # Replaced OneSignal with Firebase
    └── AndroidManifest.xml       # Updated service declaration

package.json                      # Removed react-onesignal, added firebase-admin
```

---

## 🧪 Testing Checklist

### Before Testing
- [ ] Firebase project created
- [ ] `google-services.json` in `android/app/`
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`
- [ ] `npm install` completed
- [ ] Android APK built
- [ ] APK installed on physical device

### Test Cases
- [ ] **Token Registration**: User logs in, token saved to database
- [ ] **Chat Notification**: Send message, recipient gets notification
- [ ] **Leave Notification**: Submit leave request, approver notified
- [ ] **Task Notification**: Assign task, assignee notified
- [ ] **Preference Respect**: Disable chat, chat notifications stop
- [ ] **Logout**: Token removed from database
- [ ] **Invalid Token**: Old token removed automatically

### Expected Logs
```bash
# Server logs
✅ FCM token registered for user user@example.com
✅ FCM notifications sent: 1/1
📱 FCM notification sent to user@example.com

# Android logs (adb logcat)
✅ [FCM] Token retrieved: eyJhb...
✅ [FCM] Token sent to server successfully
📬 [FCM] Message received: New message from John Doe
```

---

## 🚀 Next Steps for User

### Immediate (Required)
1. **Create Firebase project** at https://console.firebase.google.com
2. **Download `google-services.json`** and place in `android/app/`
3. **Generate service account key** and add to `.env.local`
4. **Build Android APK**: `cd android && ./gradlew assembleRelease`
5. **Test on physical device**

### After Testing
1. Monitor Firebase Console for notification stats
2. Adjust notification content based on feedback
3. Configure production environment
4. Deploy to production server
5. Distribute APK to users

---

## 🛡️ Security Notes

### ✅ Secured
- Service account key stored in environment variables (not committed)
- FCM tokens stored server-side in MongoDB
- JWT authentication required for token registration
- User preferences respected before sending
- Invalid tokens automatically cleaned up

### ⚠️ Important
- **Never commit** service account key to version control
- **Always use HTTPS** in production
- **Validate** user permissions before sending notifications
- **Rate limit** notification endpoints to prevent abuse

---

## 📊 Performance

### Token Management
- Tokens stored per device (multi-device support)
- Automatic cleanup of invalid/expired tokens
- Last-used timestamp tracked for analytics

### Notification Delivery
- Batch sending for multiple users (up to 500 tokens per call)
- Promise.allSettled for error-tolerant bulk sends
- Preference checking before sending (reduces unnecessary sends)
- Failed notifications logged but don't block operations

### Database Impact
- Indexed queries for user lookup
- Minimal additional storage (tokens ~200 bytes each)
- Background cleanup of old notifications (TTL indexes)

---

## 🐛 Known Limitations

1. **Android Only**: Currently no iOS support (Talio is WebView Android app)
2. **No Web Push**: Browser notifications not implemented (can use Socket.IO for web)
3. **Token Limit**: Firebase multicast limited to 500 tokens per request (handled by batching)
4. **Service Account**: Single service account for all environments (consider separate dev/prod)

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "google-services.json not found"
- **Solution**: Download from Firebase Console → Project Settings → Download

**Issue**: "FCM token not registered"
- **Solution**: Check Android logs, verify Firebase initialized

**Issue**: "Notification not received"
- **Solution**: Check notification preferences, verify token exists in database

**Issue**: "Invalid token errors"
- **Solution**: Normal - tokens expire, service auto-cleans them

### Debugging Tools
- **Android Logs**: `adb logcat | grep Firebase`
- **Chrome DevTools**: `chrome://inspect` → device console
- **Server Logs**: Check for `FCM` prefixed messages
- **Firebase Console**: Cloud Messaging → Usage statistics

---

## 📖 Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK for Node.js](https://firebase.google.com/docs/admin/setup)
- [Android FCM Client](https://firebase.google.com/docs/cloud-messaging/android/client)
- [FCM HTTP v1 API](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)

---

## ✨ Summary

**What changed:**
- OneSignal → Firebase Cloud Messaging
- Email fallback → Native Android notifications
- External service → Owned infrastructure

**Benefits:**
- ✅ No third-party costs (Firebase free tier generous)
- ✅ Better control over notification delivery
- ✅ Integrated with Firebase ecosystem
- ✅ Native Android experience
- ✅ Better debugging with Firebase Console
- ✅ More reliable delivery

**Trade-offs:**
- Requires Firebase project setup (one-time)
- Service account key management (more secure)
- Android-only (acceptable for this project)

---

**Implementation Status**: ✅ **COMPLETE**

All code is ready. User only needs to:
1. Create Firebase project
2. Download `google-services.json`
3. Add service account key to `.env.local`
4. Build and test

For detailed setup instructions, see `FCM_SETUP_GUIDE.md`.
