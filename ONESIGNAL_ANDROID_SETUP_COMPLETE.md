# OneSignal Android Setup - Complete Guide

## ✅ What Was Done

All Firebase dependencies and code have been **completely removed** from the Android app. The app now uses **OneSignal exclusively** for push notifications, following the official OneSignal documentation.

### 1. **Removed Firebase Dependencies**

#### Files Deleted:
- ✅ `android/app/google-services.json` - Firebase configuration file
- ✅ `android/app/src/main/java/sbs/zenova/twa/services/TalioFirebaseMessagingService.kt` - Custom FCM service

#### Code Removed from `android/app/build.gradle`:
```gradle
// ❌ REMOVED - No longer needed
implementation platform('com.google.firebase:firebase-bom:32.7.0')
implementation 'com.google.firebase:firebase-messaging-ktx'
implementation 'com.google.firebase:firebase-analytics-ktx'
```

#### Code Removed from `TalioApplication.kt`:
```kotlin
// ❌ REMOVED - No longer needed
import com.google.firebase.FirebaseApp
FirebaseApp.initializeApp(this)
createNotificationChannels() // OneSignal handles channels automatically
```

#### Code Removed from `MainActivity.kt`:
```kotlin
// ❌ REMOVED - No longer needed
import com.google.firebase.messaging.FirebaseMessaging
inner class FirebaseInterface { ... }
addJavascriptInterface(FirebaseInterface(), "AndroidFirebase")
```

#### Code Removed from `AndroidManifest.xml`:
```xml
<!-- ❌ REMOVED - No longer needed -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="talio_messages" />
```

### 2. **OneSignal-Only Implementation**

#### `android/app/build.gradle`:
```gradle
dependencies {
    // ✅ OneSignal SDK only (includes FCM automatically)
    implementation 'com.onesignal:OneSignal:[5.0.0, 5.99.99]'
    
    // Other dependencies...
}
```

#### `TalioApplication.kt`:
```kotlin
class TalioApplication : Application() {
    companion object {
        const val ONESIGNAL_APP_ID = "d39b9d6c-e7b9-4bae-ad23-66b382b358f2"
    }

    override fun onCreate() {
        super.onCreate()
        
        // Verbose logging for debugging
        OneSignal.Debug.logLevel = LogLevel.VERBOSE
        
        // Initialize OneSignal
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
        
        // Request notification permission
        OneSignal.Notifications.requestPermission(true)
        
        // Set up notification handlers
        OneSignal.Notifications.addClickListener { event -> ... }
        OneSignal.Notifications.addForegroundLifecycleListener { event -> ... }
    }
}
```

#### `MainActivity.kt` - OneSignal JavaScript Interface:
```kotlin
inner class OneSignalInterface {
    @JavascriptInterface
    fun login(externalUserId: String) {
        OneSignal.login(externalUserId)
        OneSignal.User.addTags(mapOf(
            "userId" to externalUserId,
            "platform" to "android",
            "appVersion" to "1.0.1"
        ))
    }
    
    @JavascriptInterface
    fun logout() {
        OneSignal.logout()
    }
    
    @JavascriptInterface
    fun getSubscriptionId(callback: String) {
        val subscriptionId = OneSignal.User.pushSubscription.id
        // Return to JavaScript
    }
}
```

#### `AndroidManifest.xml`:
```xml
<!-- ✅ OneSignal Configuration Only -->
<meta-data
    android:name="com.onesignal.NotificationOpened.DEFAULT"
    android:value="DISABLE" />
```

---

## 🚀 Next Steps - OneSignal Dashboard Configuration

### Step 1: Configure Google Android (FCM) in OneSignal Dashboard

1. Go to your OneSignal Dashboard: https://app.onesignal.com/apps/d39b9d6c-e7b9-4bae-ad23-66b382b358f2
2. Navigate to **Settings** → **Platforms** → **Google Android (FCM)**
3. Click **Configure**

### Step 2: Get Firebase Server Key (OneSignal needs this)

Even though we removed Firebase from the Android app, **OneSignal uses FCM internally** and needs your Firebase Server Key.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project OR use existing project
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Under **Cloud Messaging API (Legacy)**, copy:
   - **Server Key** (starts with `AAAA...`)
   - **Sender ID** (12-digit number)

### Step 3: Enter Credentials in OneSignal

1. In OneSignal Dashboard → **Google Android (FCM) Configuration**
2. Enter:
   - **Firebase Server Key**: `[paste from Step 2]`
   - **Firebase Sender ID**: `[paste from Step 2]`
3. Click **Save**

### Step 4: Get OneSignal REST API Key

1. In OneSignal Dashboard → **Settings** → **Keys & IDs**
2. Copy **REST API Key**
3. Add to your `.env.local`:
   ```bash
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

### Step 5: Rebuild Android APK

```bash
cd android
./gradlew clean assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📱 How to Use in Your Web App

### Login User (when user logs in):
```javascript
// Web app
if (typeof window.AndroidOneSignal !== 'undefined') {
  window.AndroidOneSignal.login(userId)
}
```

### Logout User (when user logs out):
```javascript
// Web app
if (typeof window.AndroidOneSignal !== 'undefined') {
  window.AndroidOneSignal.logout()
}
```

---

## 🎯 Your Configuration

- **OneSignal App ID**: `d39b9d6c-e7b9-4bae-ad23-66b382b358f2` (Same for Web and Android)
- **Package Name**: `sbs.zenova.twa`
- **Platform**: Android (Native) + Web Push

---

## 📝 Important Notes

### Firebase Files Still in Web App (Optional Cleanup)

The following Firebase files are still present in your web app but are **NOT used by Android**:

- `components/FirebaseInit.js` - Firebase web push (can be removed if using OneSignal for web)
- `lib/firebase.js` - Firebase client SDK (can be removed if using OneSignal for web)
- `lib/firebaseAdmin.js` - Firebase admin SDK (can be removed if using OneSignal for web)
- `public/firebase-messaging-sw.js` - Firebase service worker (can be removed if using OneSignal for web)

**Current Status**: Your web app can use **either** Firebase OR OneSignal for web push. OneSignal is already configured and working for web push (see `components/OneSignalInit.js`).

**Recommendation**: If you want to use OneSignal exclusively for both web and Android (which is cleaner), you can remove the Firebase files above. However, they don't interfere with the Android app since Android now uses OneSignal only.

---

## ✅ Summary

- ✅ All Firebase code and dependencies **completely removed** from Android app
- ✅ OneSignal SDK integrated following **official documentation**
- ✅ JavaScript interface for web-to-native communication
- ✅ User login/logout with external IDs
- ✅ User tagging for segmentation
- ✅ Clean, minimal implementation
- ✅ Same OneSignal App ID for both Web and Android
- ✅ Web push already working with OneSignal

**Next**: Complete Steps 1-5 above to finish the OneSignal configuration! 🚀

---

## 🔧 Troubleshooting

### If notifications don't work after setup:

1. **Check OneSignal Dashboard**: Make sure you see "Subscribed Users" count increasing
2. **Check Android Logs**: Run `adb logcat | grep OneSignal` to see OneSignal logs
3. **Verify App ID**: Make sure the App ID in `TalioApplication.kt` matches your OneSignal dashboard
4. **Test Notification**: Send a test notification from OneSignal dashboard to "All Subscribed Users"
5. **Check Permissions**: Make sure notification permission is granted on the device

### Common Issues:

- **"No subscribed users"**: User needs to grant notification permission
- **"Invalid credentials"**: Check Firebase Server Key in OneSignal dashboard
- **"Token not registered"**: Make sure you completed Step 3 (Firebase Server Key)
- **"Notification not showing"**: Check if app is in foreground/background and notification handlers are working

