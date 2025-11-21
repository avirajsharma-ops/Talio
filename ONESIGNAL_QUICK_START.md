# OneSignal Quick Start Guide

## 🚀 What I've Done For You

I've integrated OneSignal for both **Web Push** and **Android Push** notifications in your Tailo HRMS app.

### ✅ Completed:
- ✅ Added OneSignal SDK to Android app
- ✅ Updated Android app to auto-login users to OneSignal
- ✅ Configured user tagging for segmentation
- ✅ Kept all existing functionality (location, notifications channels, etc.)
- ✅ Web push already working

---

## ⏳ What You Need to Do (3 Steps)

### Step 1: Get Firebase Server Key (2 minutes)

1. Go to: https://console.firebase.google.com/
2. Select project: **talio-a269f**
3. Click ⚙️ → **Project Settings**
4. Click **Cloud Messaging** tab
5. Under **Cloud Messaging API (Legacy)**, copy the **Server Key** (starts with `AAAA...`)

---

### Step 2: Configure OneSignal Dashboard (2 minutes)

1. Go to: https://app.onesignal.com
2. Select your app
3. Go to **Settings** → **Platforms** → **Google Android (FCM)**
4. Click **Configure**
5. Select **Native Android** (the green Android icon)
6. Enter:
   - **Firebase Server Key**: [Paste from Step 1]
   - **Firebase Sender ID**: `748268440394`
7. Click **Save**

---

### Step 3: Get REST API Key & Rebuild (3 minutes)

1. In OneSignal Dashboard, go to **Settings** → **Keys & IDs**
2. Copy the **REST API Key**
3. Add to your `.env.local` file:
   ```bash
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```
4. Rebuild Android APK:
   ```bash
   cd android
   ./gradlew clean assembleRelease
   ```
5. Install the new APK on your device

---

## 🧪 Test It (2 minutes)

### Test Web Push:
1. Open your web app and login
2. Allow notifications when prompted
3. Go to OneSignal Dashboard → **Messages** → **New Push**
4. Select **Send to Test Users**
5. Enter your user ID
6. Send test message
7. You should receive the notification!

### Test Android Push:
1. Install the new APK and login
2. Allow notifications when prompted
3. Send test message from OneSignal Dashboard (same as above)
4. You should receive the notification on Android!

---

## 📚 Documentation

For detailed information, see:
- **ONESIGNAL_COMPLETE_SETUP.md** - Complete setup guide with all details
- **ONESIGNAL_ANDROID_CHANGES.md** - Summary of all code changes made

---

## 🎯 Your OneSignal Configuration

- **App ID**: `f7b9d1a1-5095-4be8-8a74-2af13058e7b2`
- **Package Name**: `sbs.zenova.twa`
- **Firebase Project**: `talio-a269f`
- **Firebase Sender ID**: `748268440394`

---

## 💡 How It Works

### When User Logs In:
1. **Web**: OneSignal SDK automatically logs in user with their user ID
2. **Android**: WebView calls `AndroidOneSignal.login(userId)` automatically

### When You Send Notification:
```javascript
// From your backend
await sendOneSignalNotification({
  userIds: ['user123', 'user456'],
  title: 'New Message',
  message: 'You have a new message',
  url: '/dashboard/chat',
  data: { type: 'chat' }
})
```

OneSignal automatically:
- ✅ Sends to web if user is on web
- ✅ Sends to Android if user is on Android
- ✅ Sends to both if user is on both
- ✅ Handles delivery, retries, and analytics

---

## 🆘 Need Help?

If something doesn't work:
1. Check **ONESIGNAL_COMPLETE_SETUP.md** → **Troubleshooting** section
2. Check browser console (web) or logcat (Android) for errors
3. Verify Firebase Server Key is correct in OneSignal Dashboard
4. Make sure REST API Key is in environment variables

---

## 🎉 That's It!

Once you complete the 3 steps above, you'll have:
- ✅ Unified push notifications on web and Android
- ✅ User segmentation and targeting
- ✅ Notification analytics
- ✅ Advanced scheduling and delivery options
- ✅ OneSignal dashboard for managing everything

Total time: ~10 minutes

