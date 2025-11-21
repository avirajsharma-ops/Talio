# 🔥 Firebase Push Notifications - Complete Setup Guide

## 📋 Overview

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications on both **Web** and **Android** platforms.

**Features:**
- ✅ Web push notifications (works when browser is closed)
- ✅ Android push notifications (works when app is completely killed)
- ✅ Unified notification system for both platforms
- ✅ Automatic token management
- ✅ Retry mechanism for failed notifications

---

## 🎯 What Was Implemented

### **Backend (Server Side)**
1. **`lib/firebaseAdmin.js`** - Firebase Admin SDK for sending notifications
2. **`lib/notificationService.js`** - Centralized notification service with retry logic
3. **`app/api/fcm/register-token/route.js`** - API to register/delete FCM tokens
4. **`app/api/fcm/send-notification/route.js`** - API to send test notifications

### **Frontend (Web)**
1. **`lib/firebase.js`** - Firebase Client SDK for web push
2. **`components/FirebaseInit.js`** - Auto-registers FCM tokens on login
3. **`public/firebase-messaging-sw.js`** - Service worker for background notifications

### **Android**
1. **`android/app/src/main/java/sbs/zenova/twa/services/TalioFirebaseMessagingService.kt`** - FCM service
2. **`android/app/src/main/java/sbs/zenova/twa/TalioApplication.kt`** - Notification channels
3. **`android/app/google-services.json`** - Firebase configuration (you need to add this)

---

## 🔧 Step 1: Get Firebase Credentials

### 1.1 Create/Access Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. **IMPORTANT:** Use the SAME project for both Web and Android!

### 1.2 Get Web Credentials

1. Click the gear icon → **Project Settings**
2. Scroll to "Your apps" section
3. Click on **Web app** (or add one if it doesn't exist)
4. Copy all the config values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID
   - Measurement ID

### 1.3 Get VAPID Key (Web Push Certificate)

1. In Project Settings, go to **Cloud Messaging** tab
2. Scroll to "Web Push certificates"
3. Click **"Generate key pair"** if you don't have one
4. Copy the **Key pair** value

### 1.4 Get Service Account JSON (Backend)

1. In Project Settings, go to **Service Accounts** tab
2. Click **"Generate New Private Key"**
3. Download the JSON file
4. Copy the ENTIRE JSON content (all on one line)

### 1.5 Get google-services.json (Android)

1. In Project Settings, scroll to "Your apps"
2. Click on **Android app** (or add one if it doesn't exist)
   - **Package name:** `sbs.zenova.twa`
3. Download **google-services.json**
4. Place it in `android/app/` directory

---

## 🔐 Step 2: Configure Environment Variables

Create or update your `.env` file:

```env
# ===========================================
# FIREBASE CLOUD MESSAGING (PUSH NOTIFICATIONS)
# ===========================================

# Firebase Client Configuration (Public - goes to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# VAPID Key for Web Push
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# Firebase Admin SDK (Private - server only)
# OPTION 1: Full service account JSON (RECOMMENDED)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}

# OPTION 2: Individual fields (fallback)
# FIREBASE_PROJECT_ID=your_project_id
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT:** Replace all `your_*` placeholders with your actual Firebase credentials!

---

## 📝 Step 3: Update Service Worker Configuration

Edit `public/firebase-messaging-sw.js` and replace the placeholder config with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

Replace with your actual values from Step 1.2.

---

## 🔌 Step 4: Add FirebaseInit to Your App

Edit `app/layout.js` and add the `FirebaseInit` component:

```javascript
import FirebaseInit from '@/components/FirebaseInit'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <FirebaseInit />  {/* Add this line */}
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

This will automatically request notification permission and register FCM tokens when users log in.

---

## 📱 Step 5: Configure Android App

### 5.1 Add google-services.json

Place the `google-services.json` file you downloaded in Step 1.5 into:
```
android/app/google-services.json
```

### 5.2 Verify Firebase is Initialized

The Android app already has Firebase configured in:
- `android/app/src/main/java/sbs/zenova/twa/TalioApplication.kt`
- `android/app/src/main/java/sbs/zenova/twa/services/TalioFirebaseMessagingService.kt`

No code changes needed!

### 5.3 Rebuild Android App

```bash
cd android
./gradlew clean assembleRelease
```

---

## ✅ Step 6: Verify Setup

### 6.1 Check Backend Logs

Start your backend and look for:
```
[Firebase Admin] ✅ Initialized with service account JSON
[Firebase Admin] Project: your_project_id
```

### 6.2 Check Web Browser

1. Login to your web app
2. Open browser console (F12)
3. Look for:
```
[Firebase Client] ✅ Initialized
[Firebase Client] ✅ Service worker registered
[Firebase Client] ✅ FCM token obtained
[Firebase Client] ✅ Token saved to backend
```

### 6.3 Check Android App

1. Install and open the Android app
2. Run: `adb logcat | grep TalioFCM`
3. Look for:
```
🔑 New FCM token generated: ...
FCM token stored locally: ...
```

---

## 🧪 Step 7: Test Notifications

### Test Web Notifications

```bash
curl -X POST http://localhost:3000/api/fcm/send-notification \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test message",
    "data": {
      "url": "/dashboard"
    }
  }'
```

### Test Android Notifications

1. **Force stop the Android app:**
   - Settings → Apps → Talio → Force Stop

2. **Send notification via API** (same as above)

3. **Check your device** - notification should appear even though app is killed! 🎉

---

## 📊 How It Works

### Web Push Flow:
```
1. User logs in on web browser
2. FirebaseInit component requests notification permission
3. Service worker registers with Firebase
4. FCM token generated and saved to database
5. Backend sends notification via Firebase Admin SDK
6. Service worker receives notification (even if browser closed)
7. Notification appears on desktop
```

### Android Push Flow:
```
1. User opens Android app
2. TalioFirebaseMessagingService requests FCM token
3. Token saved locally and sent to backend on login
4. Backend sends notification via Firebase Admin SDK
5. Android system delivers to TalioFirebaseMessagingService
6. Service shows notification (even if app is killed)
7. Notification appears on device
```

---

## 🔍 Troubleshooting

See `FIREBASE_CREDENTIALS_REQUIRED.md` for detailed credential requirements and troubleshooting.

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Web credentials added to `.env`
- [ ] VAPID key added to `.env`
- [ ] Service account JSON added to `.env`
- [ ] `firebase-messaging-sw.js` updated with config
- [ ] `google-services.json` placed in `android/app/`
- [ ] `FirebaseInit` added to `app/layout.js`
- [ ] Backend restarted
- [ ] Android app rebuilt
- [ ] Web notifications tested
- [ ] Android notifications tested (with app killed)

---

**🎉 Setup Complete!**

Your push notifications are now working on both Web and Android, even when the app is completely closed!

