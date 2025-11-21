# OneSignal Quick Setup Guide

## 🎯 What You Need to Do

Follow these 5 simple steps to complete your OneSignal setup:

---

## Step 1: Get Firebase Server Key (5 minutes)

OneSignal uses FCM (Firebase Cloud Messaging) internally, so you need to provide your Firebase credentials to OneSignal.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a **new project** (or use existing one)
   - Project name: `Talio-OneSignal` (or any name you prefer)
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Under **Cloud Messaging API (Legacy)**, you'll see:
   - **Server Key** (starts with `AAAA...`) - Copy this
   - **Sender ID** (12-digit number) - Copy this

**Important**: If you don't see "Cloud Messaging API (Legacy)", you may need to enable it:
- Click "Enable Cloud Messaging API (Legacy)"
- Or go to Google Cloud Console and enable "Firebase Cloud Messaging API"

---

## Step 2: Configure OneSignal Dashboard (3 minutes)

1. Go to your OneSignal Dashboard: https://app.onesignal.com/apps/d39b9d6c-e7b9-4bae-ad23-66b382b358f2
2. Navigate to **Settings** → **Platforms** → **Google Android (FCM)**
3. Click **Configure**
4. Select **Native Android** (the green Android icon)
5. Enter the credentials from Step 1:
   - **Firebase Server Key**: `[paste from Step 1]`
   - **Firebase Sender ID**: `[paste from Step 1]`
6. Click **Save**

---

## Step 3: Get OneSignal REST API Key (2 minutes)

1. In OneSignal Dashboard → **Settings** → **Keys & IDs**
2. Copy **REST API Key**
3. Add to your `.env.local` file:
   ```bash
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

---

## Step 4: Rebuild Android APK (5 minutes)

```bash
cd android
./gradlew clean assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Step 5: Test Notifications (2 minutes)

1. Install the APK on your Android device
2. Open the app and log in
3. Grant notification permission when prompted
4. Go to OneSignal Dashboard → **Messages** → **New Push**
5. Select **Send to All Subscribed Users**
6. Enter a test message and click **Send**
7. You should receive the notification on your device!

---

## ✅ Verification Checklist

- [ ] Firebase Server Key and Sender ID configured in OneSignal
- [ ] OneSignal REST API Key added to `.env.local`
- [ ] Android APK rebuilt with new changes
- [ ] APK installed on device
- [ ] User logged in and granted notification permission
- [ ] OneSignal Dashboard shows "Subscribed Users" count > 0
- [ ] Test notification received successfully

---

## 🎯 Your Configuration

- **OneSignal App ID**: `d39b9d6c-e7b9-4bae-ad23-66b382b358f2`
- **Package Name**: `sbs.zenova.twa`
- **Platform**: Android (Native) + Web Push

---

## 📱 How It Works

### When User Logs In:
```javascript
// Automatically called in your web app
if (typeof window.AndroidOneSignal !== 'undefined') {
  window.AndroidOneSignal.login(userId)
}
```

### When User Logs Out:
```javascript
// Automatically called in your web app
if (typeof window.AndroidOneSignal !== 'undefined') {
  window.AndroidOneSignal.logout()
}
```

### Sending Notifications from Backend:
```javascript
// Use the OneSignal REST API
const response = await fetch('/api/onesignal/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    title: 'New Task Assigned',
    message: 'You have been assigned a new task',
    data: { url: '/tasks/123' }
  })
})
```

---

## 🔧 Troubleshooting

### No subscribed users showing in OneSignal?
- Make sure user granted notification permission
- Check Android logs: `adb logcat | grep OneSignal`
- Verify App ID matches in `TalioApplication.kt`

### Notifications not received?
- Check if Firebase Server Key is correct in OneSignal dashboard
- Make sure app is installed and user is logged in
- Try sending to "All Subscribed Users" first

### Build errors?
- Run `cd android && ./gradlew clean`
- Make sure you removed all Firebase dependencies
- Check that OneSignal SDK version is correct

---

## 📚 Full Documentation

For detailed information, see: `ONESIGNAL_ANDROID_SETUP_COMPLETE.md`

---

## 🚀 Next Steps After Setup

1. **Integrate with your backend**: Use OneSignal REST API to send notifications
2. **Set up user segments**: Tag users by role, department, etc.
3. **Create notification templates**: For tasks, messages, announcements
4. **Monitor analytics**: Track delivery rates, open rates, etc.

---

**Total Setup Time**: ~17 minutes

**Status**: ✅ Android app ready, just need to complete OneSignal dashboard configuration!

