# OneSignal Complete Setup Guide - Web Push & Android Push

This guide will help you set up OneSignal for both **Web Push Notifications** and **Android Push Notifications** in Tailo HRMS.

---

## 📋 What You Need

### Your Current Setup:
- **Package Name**: `sbs.zenova.twa`
- **Firebase Project**: `talio-a269f`
- **Firebase Project Number (Sender ID)**: `748268440394`
- **OneSignal App ID**: `f7b9d1a1-5095-4be8-8a74-2af13058e7b2`
- **Safari Web ID**: `web.onesignal.auto.42873e37-42b9-4e5d-9423-af83e9e44ff4`

---

## 🔧 Step 1: Configure OneSignal Dashboard

### 1.1 Login to OneSignal
Go to: https://app.onesignal.com

### 1.2 Select Your App
Click on "Tailo HRMS" (or your app name)

### 1.3 Configure Google Android (FCM)
1. Go to **Settings** → **Platforms**
2. Click **Google Android (FCM)**
3. Select **Native Android** SDK
4. You'll need to provide:

#### Get Firebase Server Key:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `talio-a269f`
3. Click ⚙️ → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Under **Cloud Messaging API (Legacy)**:
   - Copy **Server Key** (starts with `AAAA...`)
   - Copy **Sender ID**: `748268440394`

#### Enter in OneSignal:
- **Firebase Server Key**: `[Your Server Key from above]`
- **Firebase Sender ID**: `748268440394`
- **Google Project Number**: `748268440394`

6. Click **Save**

### 1.4 Get REST API Key
1. Go to **Settings** → **Keys & IDs**
2. Copy the **REST API Key**
3. Save it - you'll need it for environment variables

---

## 🌐 Step 2: Web Push Setup (Already Done ✅)

Your web push is already configured:
- ✅ OneSignal SDK integrated in `components/OneSignalInit.js`
- ✅ Service worker configured
- ✅ Auto-initialization on user login

**Just need to add REST API Key to environment variables** (see Step 4)

---

## 📱 Step 3: Android App Setup

### 3.1 Add OneSignal SDK to Android ✅ DONE

The OneSignal SDK has been added to `android/app/build.gradle`:

```gradle
dependencies {
    // Firebase (required by OneSignal for FCM)
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging-ktx'
    implementation 'com.google.firebase:firebase-analytics-ktx'

    // OneSignal SDK
    implementation 'com.onesignal:OneSignal:[5.0.0, 5.99.99]'
}
```

### 3.2 Update TalioApplication.kt ✅ DONE

OneSignal initialization has been added to `TalioApplication.kt`:

```kotlin
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class TalioApplication : Application() {
    companion object {
        const val ONESIGNAL_APP_ID = "f7b9d1a1-5095-4be8-8a74-2af13058e7b2"
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize Firebase (required by OneSignal)
        FirebaseApp.initializeApp(this)

        // Create notification channels
        createNotificationChannels()

        // Initialize OneSignal
        OneSignal.Debug.logLevel = LogLevel.VERBOSE
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)

        // Request notification permission
        OneSignal.Notifications.requestPermission(true)

        // Set notification handlers
        OneSignal.Notifications.addClickListener { event ->
            Log.d(TAG, "Notification clicked: ${event.notification.title}")
        }
    }
}
```

### 3.3 Update MainActivity.kt ✅ DONE

OneSignal user login has been integrated into `MainActivity.kt`:

- **JavaScript Interface**: `AndroidOneSignal` interface added
- **Auto-login**: When user logs in to the web app, OneSignal automatically logs in with the user's ID
- **User Tags**: Automatically sets tags for segmentation (userId, platform, appVersion, lastLogin)

The WebView automatically calls `AndroidOneSignal.login(userId)` when the user logs in.

### 3.4 Rebuild Android App

```bash
cd android
./gradlew clean assembleRelease
```

The APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔄 What Changed in Android App

### Files Modified:

1. **`android/app/build.gradle`**
   - Added OneSignal SDK dependency

2. **`android/app/src/main/java/sbs/zenova/twa/TalioApplication.kt`**
   - Added OneSignal initialization
   - Added notification click handlers
   - Added foreground notification handlers
   - Kept Firebase initialization (required by OneSignal)
   - Kept notification channels (used by OneSignal)

3. **`android/app/src/main/java/sbs/zenova/twa/MainActivity.kt`**
   - Added `AndroidOneSignal` JavaScript interface
   - Added auto-login when user logs in to web app
   - Added user tagging for segmentation
   - Added methods: `login()`, `logout()`, `getPlayerId()`, `addTag()`, `removeTag()`

### What Was Kept:

- ✅ Firebase Cloud Messaging (required by OneSignal)
- ✅ Notification channels (talio_messages, talio_tasks, talio_announcements, talio_general)
- ✅ All existing permissions and functionality
- ✅ Location tracking
- ✅ WebView functionality

### What Was Removed:

- ❌ Direct FCM token handling (now handled by OneSignal)
- ❌ `TalioFirebaseMessagingService.kt` (replaced by OneSignal's service)

---

## 🔑 Step 4: Environment Variables

Add to `.env.local` and `.env.production`:

```bash
# OneSignal Configuration
ONESIGNAL_APP_ID=f7b9d1a1-5095-4be8-8a74-2af13058e7b2
ONESIGNAL_REST_API_KEY=your-rest-api-key-here

# For Web Push
NEXT_PUBLIC_ONESIGNAL_APP_ID=f7b9d1a1-5095-4be8-8a74-2af13058e7b2
```

---

## ✅ Step 5: Verify Setup

### 5.1 Test Web Push
1. Open your web app
2. Login
3. Allow notifications when prompted
4. Send test notification from OneSignal dashboard

### 5.2 Test Android Push
1. Install APK on Android device
2. Open app and login
3. Send test notification from OneSignal dashboard

---

## 📤 How to Send Notifications

### From Your Backend (Recommended):

```javascript
import { sendOneSignalNotification } from '@/lib/onesignal'

await sendOneSignalNotification({
  userIds: ['user123', 'user456'],
  title: 'New Message',
  message: 'You have a new message',
  url: '/dashboard/chat',
  data: { type: 'chat', chatId: 'chat123' }
})
```

### From OneSignal Dashboard:
1. Go to **Messages** → **New Push**
2. Select **Send to Particular Segment(s)** or **Send to Test Users**
3. Enter message details
4. Click **Send Message**

---

## 🎯 Next Steps - Action Required

### 1. Get Firebase Server Key ⏳ PENDING
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `talio-a269f`
3. Click ⚙️ → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Under **Cloud Messaging API (Legacy)**:
   - Copy **Server Key** (starts with `AAAA...`)

### 2. Configure OneSignal Dashboard ⏳ PENDING
1. Go to [OneSignal Dashboard](https://app.onesignal.com)
2. Select your app
3. Go to **Settings** → **Platforms** → **Google Android (FCM)**
4. Select **Native Android**
5. Enter:
   - **Firebase Server Key**: `[Paste from Step 1]`
   - **Firebase Sender ID**: `748268440394`
   - **Google Project Number**: `748268440394`
6. Click **Save**

### 3. Get REST API Key ⏳ PENDING
1. In OneSignal Dashboard, go to **Settings** → **Keys & IDs**
2. Copy the **REST API Key**
3. Add to `.env.local`:
   ```bash
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

### 4. Rebuild Android APK ⏳ PENDING
```bash
cd android
./gradlew clean assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### 5. Test Notifications ⏳ PENDING
See testing section below.

---

## 🧪 Testing Guide

### Test Web Push Notifications:

1. **Open your web app** in Chrome/Firefox/Safari
2. **Login** with your account
3. **Allow notifications** when prompted
4. **Send test notification** from OneSignal Dashboard:
   - Go to **Messages** → **New Push**
   - Select **Send to Test Users**
   - Enter your user ID
   - Enter message details
   - Click **Send Message**
5. **Verify** you receive the notification

### Test Android Push Notifications:

1. **Install the new APK** on your Android device
2. **Open the app** and login
3. **Allow notifications** when prompted
4. **Check logs** to verify OneSignal initialization:
   ```bash
   adb logcat | grep -E "OneSignal|TalioApp"
   ```
   You should see:
   - `✅ Firebase initialized`
   - `✅ OneSignal initialized with App ID: f7b9d1a1-5095-4be8-8a74-2af13058e7b2`
   - `✅ User logged in with external ID: [your-user-id]`
   - `✅ User tags set`

5. **Send test notification** from OneSignal Dashboard (same as web)
6. **Verify** you receive the notification on your Android device

### Test Notification Channels:

Send notifications with different channel IDs to test all channels:

```javascript
// From your backend
await sendOneSignalNotification({
  userIds: ['user123'],
  title: 'Test Message',
  message: 'Testing talio_messages channel',
  data: {
    type: 'chat',
    android_channel_id: 'talio_messages' // HIGH importance
  }
})

await sendOneSignalNotification({
  userIds: ['user123'],
  title: 'Test Task',
  message: 'Testing talio_tasks channel',
  data: {
    type: 'task',
    android_channel_id: 'talio_tasks' // HIGH importance
  }
})

await sendOneSignalNotification({
  userIds: ['user123'],
  title: 'Test Announcement',
  message: 'Testing talio_announcements channel',
  data: {
    type: 'announcement',
    android_channel_id: 'talio_announcements' // HIGH importance
  }
})
```

### Verify User Segmentation:

1. **Check OneSignal Dashboard** → **Audience** → **All Users**
2. **Find your user** by external user ID
3. **Verify tags** are set:
   - `userId`: your user ID
   - `platform`: `web` or `android`
   - `appVersion`: `1.0.0` (web) or `1.0.1` (android)
   - `lastLogin`: timestamp

---

## 🐛 Troubleshooting

### Web Push Not Working:

1. **Check browser console** for errors
2. **Verify** OneSignal SDK is loaded: `window.OneSignal`
3. **Check** user is logged in: `await OneSignal.User.getExternalId()`
4. **Verify** subscription: `await OneSignal.User.pushSubscription.optedIn`

### Android Push Not Working:

1. **Check logcat** for errors:
   ```bash
   adb logcat | grep -E "OneSignal|TalioApp|Firebase"
   ```

2. **Verify** OneSignal is initialized:
   - Look for: `✅ OneSignal initialized`

3. **Verify** user is logged in:
   - Look for: `✅ User logged in with external ID`

4. **Check** notification permission:
   - Settings → Apps → Talio → Notifications → Should be ON

5. **Verify** Firebase Server Key is correct in OneSignal Dashboard

6. **Check** internet connection and Firebase connectivity

### Notifications Not Showing as Heads-Up:

1. **Verify** notification channel importance is HIGH
2. **Check** device Do Not Disturb settings
3. **Verify** app notification settings allow heads-up notifications

---

## 📞 Support

If you need help, check:
- **OneSignal Docs**: https://documentation.onesignal.com
- **Firebase Console**: https://console.firebase.google.com
- **OneSignal Dashboard**: https://app.onesignal.com

---

## ✅ Summary

### What's Done:
- ✅ Web push notifications fully configured
- ✅ Android app updated with OneSignal SDK
- ✅ Auto-login when user logs in
- ✅ User tagging for segmentation
- ✅ Notification channels configured
- ✅ Server-side notification functions ready

### What You Need to Do:
1. ⏳ Get Firebase Server Key from Firebase Console
2. ⏳ Configure Google Android (FCM) in OneSignal Dashboard
3. ⏳ Get REST API Key and add to environment variables
4. ⏳ Rebuild Android APK
5. ⏳ Test notifications on both platforms

Once you complete these steps, you'll have a unified push notification system working on both web and Android! 🎉

