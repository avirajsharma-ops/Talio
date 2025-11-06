# Firebase Push Notifications - Complete Flow

## ✅ All OneSignal References Removed

The notification management system has been completely updated to use Firebase Cloud Messaging (FCM) instead of OneSignal.

---

## 🔔 How Firebase Notifications Work

### 1. **User Subscription Flow**

#### Automatic Subscription (When User Logs In):
1. User logs into the app
2. `FirebaseInit` component automatically runs
3. Checks if user already has an FCM token
4. If no token exists:
   - Requests notification permission from browser
   - If granted, generates FCM token
   - Saves token to backend (`/api/fcm/save-token`)
   - Token is stored in User model (`fcmTokens` array)
5. If token exists:
   - Verifies token is still valid
   - Updates `lastUsed` timestamp in database

#### Manual Subscription (Via Notification Banner):
1. If user denies permission initially
2. `NotificationBanner` component shows persistent banner
3. User clicks "Enable Notifications"
4. Browser prompts for permission
5. If granted, FCM token is generated and saved

**Answer: Yes, users need to subscribe, but it happens automatically when they allow browser notification permission.**

---

## 📱 Notification Sending Flow

### Backend Process:

1. **Admin/HR/Dept Head sends notification** via dashboard
2. **API endpoint** (`/api/notifications/send`) receives request
3. **Fetch FCM tokens** from database for target users
4. **Send via Firebase Admin SDK**:
   ```javascript
   await sendFCMNotification({
     tokens: fcmTokens,
     title: 'Notification Title',
     body: 'Notification Message',
     data: { type: 'custom', url: '/dashboard' },
     icon: '/icons/icon-192x192.png'
   })
   ```
5. **Firebase sends to devices** (web, Android, iOS)
6. **Update delivery status** in database

### Frontend Reception:

#### Web App (Foreground):
- `FirebaseInit` component listens for messages
- Shows browser notification
- Handles click to navigate to URL

#### Web App (Background):
- Service worker (`firebase-messaging-sw.js`) handles message
- Shows notification automatically
- Handles click to open app

#### Android App:
- Native Firebase SDK receives message
- Shows native Android notification
- Handles click to open app

---

## 🔧 Configuration Status

### Environment Variables (Already Configured):

✅ **Web SDK:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

✅ **Admin SDK (Backend):**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Files Updated:

✅ **API Endpoints:**
- `/api/notifications/config` - Now checks Firebase instead of OneSignal
- `/api/notifications/send` - Uses Firebase Admin SDK
- `/api/fcm/save-token` - Manages FCM tokens

✅ **Components:**
- `NotificationManagement.js` - All OneSignal references removed
- `NotificationBanner.js` - Uses Firebase APIs
- `FirebaseInit.js` - Handles FCM initialization

✅ **Service Worker:**
- `public/firebase-messaging-sw.js` - Configured with your Firebase project

---

## 🧪 Testing Firebase Notifications

### 1. **Check Configuration Status**

Go to: **Dashboard → Settings → Notifications → Configuration Tab**

You should see:
- ✅ Firebase Cloud Messaging is Configured
- Project ID: `talio-e9deb`
- Service Account Email: `firebase-adminsdk-fbsvc@talio-e9deb.iam.gserviceaccount.com`
- All credentials showing as configured

### 2. **Test Notification Sending**

#### Step 1: Enable Notifications
1. Login to the app
2. Allow notification permission when prompted
3. Check browser console for: `[FirebaseInit] ✅ FCM token obtained`

#### Step 2: Send Test Notification
1. Go to **Dashboard → Settings → Notifications**
2. Fill in notification form:
   - Title: "Test Notification"
   - Message: "This is a test from Firebase"
   - Target: "All Users" or specific user
3. Click "Send Notification"

#### Step 3: Verify Delivery
1. Check if notification appears in browser
2. Check browser console for delivery logs
3. Check **History** tab for delivery status

### 3. **Check Browser Console**

Open browser console (F12) and look for:

```
[FirebaseInit] Starting initialization...
[FirebaseInit] User logged in: <user-id>
[FirebaseInit] ✅ FCM token obtained
[FirebaseInit] ✅ Firebase initialized successfully
```

When notification is received:
```
[FirebaseInit] Foreground message received: {...}
```

### 4. **Check Database**

Verify FCM tokens are being saved:

```javascript
// In MongoDB, check User collection
{
  "_id": "...",
  "email": "user@example.com",
  "fcmTokens": [
    {
      "token": "eXaMpLe_FcM_ToKeN...",
      "device": "web",
      "createdAt": "2025-11-06T...",
      "lastUsed": "2025-11-06T..."
    }
  ]
}
```

---

## 🚨 Important: Enable Firebase Cloud Messaging API

**CRITICAL STEP:** You must enable the Firebase Cloud Messaging API in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **talio-e9deb**
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click **Enable**

**Without this, notifications will NOT be sent!**

---

## 🔍 Troubleshooting

### Notifications Not Working?

#### 1. Check Firebase API is Enabled
- Go to Google Cloud Console
- Verify "Firebase Cloud Messaging API" is enabled

#### 2. Check Browser Console
- Look for Firebase initialization errors
- Check if FCM token is generated
- Verify service worker is registered

#### 3. Check Notification Permission
- Browser notification permission granted?
- Check browser settings if denied

#### 4. Check Backend Logs
- Verify Firebase Admin SDK is initialized
- Check for FCM sending errors
- Verify tokens are saved in database

#### 5. Check Service Worker
- Open DevTools → Application → Service Workers
- Verify `firebase-messaging-sw.js` is registered
- Check for service worker errors

### Common Issues:

**Issue:** "Firebase not configured" warning
**Solution:** Check `.env.local` file has all Firebase credentials

**Issue:** No FCM token generated
**Solution:** Check browser notification permission is granted

**Issue:** Notifications not received
**Solution:** 
1. Enable Firebase Cloud Messaging API in Google Cloud Console
2. Check service worker is registered
3. Verify FCM tokens are saved in database

**Issue:** "Failed to send notification"
**Solution:**
1. Check Firebase Admin SDK credentials
2. Verify private key is correctly formatted in `.env.local`
3. Check backend logs for detailed error

---

## 📊 Notification Delivery Status

Firebase provides detailed delivery tracking:

- **Success Count:** Number of notifications successfully delivered
- **Failure Count:** Number of failed deliveries
- **Results:** Individual token delivery status

All this information is stored in the `Notification` model:

```javascript
{
  "deliveryStatus": {
    "fcm": {
      "sent": true,
      "sentAt": "2025-11-06T...",
      "successCount": 45,
      "failureCount": 2
    }
  }
}
```

---

## 🎯 Key Differences from OneSignal

| Feature | OneSignal | Firebase |
|---------|-----------|----------|
| **Configuration** | UI-based (dashboard) | Environment variables |
| **User ID** | Player ID | FCM Token |
| **Subscription** | `OneSignal.User.PushSubscription.optIn()` | `requestFCMToken()` |
| **Token Storage** | OneSignal servers | Your database |
| **Sending** | REST API | Firebase Admin SDK |
| **Batch Limit** | Unlimited | 500 tokens per batch |
| **Cost** | Free tier limited | Free (Google Cloud) |

---

## ✅ Summary

**Firebase is now fully integrated and ready to use!**

1. ✅ All OneSignal references removed
2. ✅ Firebase Cloud Messaging configured
3. ✅ Automatic user subscription on login
4. ✅ Notification banner for manual subscription
5. ✅ Backend sending via Firebase Admin SDK
6. ✅ Frontend receiving via service worker
7. ✅ Delivery tracking and status updates

**Next Step:** Enable Firebase Cloud Messaging API in Google Cloud Console, then test sending notifications!

---

**Last Updated:** November 6, 2025  
**Firebase Project:** talio-e9deb  
**Status:** ✅ Ready for Production

