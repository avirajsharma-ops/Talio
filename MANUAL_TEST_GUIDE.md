# 📱 Manual Test Guide - Android Push Notifications

## 🎯 Objective
Test that push notifications work **exactly like WhatsApp** - even when the app is completely killed.

---

## 📋 Prerequisites

### 1. Android Device Setup
- ✅ Android device connected via USB (or emulator running)
- ✅ USB debugging enabled
- ✅ ADB installed and working (`adb devices` shows your device)

### 2. Backend Setup
- ✅ Backend server running (`npm run dev`)
- ✅ MongoDB connected
- ✅ Firebase Admin SDK configured
- ✅ VAPID key set in `.env`

### 3. Android App Setup
- ✅ App rebuilt with latest changes
- ✅ App installed on device
- ✅ Logged in with test account

---

## 🧪 Test Scenarios

### Test 1: App Completely Killed (CRITICAL TEST)

**This is the most important test - it proves WhatsApp-like behavior!**

#### Steps:
1. **Open the app** on your Android device
2. **Login** with your test account
3. **Allow all permissions** when prompted:
   - Notifications
   - Battery optimization exemption
4. **Force stop the app**:
   - Go to: Settings → Apps → Talio → Force Stop
   - OR use ADB: `adb shell am force-stop sbs.zenova.twa`
5. **Verify app is killed**:
   - Check recent apps - Talio should not be there
   - OR use ADB: `adb shell "ps | grep sbs.zenova.twa"` (should return nothing)
6. **Start watching logs** (in a terminal):
   ```bash
   adb logcat | grep TalioFCM
   ```
7. **Send a test message** from another account (or use the test script)
8. **Expected Result**:
   - ✅ Notification appears in notification panel
   - ✅ Notification sound plays
   - ✅ Device vibrates (pattern: short-short-short)
   - ✅ LED light blinks (blue for messages)
   - ✅ Notification shows on lock screen
   - ✅ Logs show: "✅ Processing data payload (app may be killed)"

#### What to Check in Logs:
```
TalioFCM: 📩 Message received from: ...
TalioFCM: 📦 Data payload: {title=..., body=..., type=message}
TalioFCM: ✅ Processing data payload (app may be killed)
TalioFCM: 🔔 Showing notification - Type: message, Channel: talio_messages
TalioFCM: ✅ Notification displayed successfully
```

#### If It Fails:
- ❌ Check battery optimization: Settings → Apps → Talio → Battery → Unrestricted
- ❌ Check notification permission: Settings → Apps → Talio → Notifications → Enabled
- ❌ Check backend logs for FCM send errors
- ❌ Verify FCM token is saved in database

---

### Test 2: App in Background

#### Steps:
1. **Open the app** on your Android device
2. **Press Home button** (app goes to background)
3. **Verify app is in background**:
   - App should appear in recent apps
4. **Start watching logs**:
   ```bash
   adb logcat | grep TalioFCM
   ```
5. **Send a test message** from another account
6. **Expected Result**:
   - ✅ Notification appears in notification panel
   - ✅ Notification sound plays
   - ✅ Device vibrates
   - ✅ Notification shows on lock screen

---

### Test 3: App in Foreground

#### Steps:
1. **Open the app** on your Android device
2. **Stay on the chat screen** (or any screen)
3. **Send a test message** from another account
4. **Expected Result**:
   - ✅ In-app toast notification appears (Socket.IO)
   - ❌ NO system notification (to avoid duplicates)
   - ✅ Message appears in chat immediately

---

### Test 4: Different Notification Types

Test all 4 notification channels to verify different vibration patterns and LED colors.

#### 4.1 Message Notification (talio_messages)
- **Vibration**: Short-short-short (250ms each)
- **LED**: Blue
- **Sound**: Default notification sound
- **Priority**: HIGH (heads-up)

#### 4.2 Task Notification (talio_tasks)
- **Vibration**: Medium-medium (300ms each)
- **LED**: Green
- **Sound**: Default notification sound
- **Priority**: HIGH (heads-up)

#### 4.3 Announcement Notification (talio_announcements)
- **Vibration**: Long-long (500ms each)
- **LED**: Yellow
- **Sound**: Default notification sound
- **Priority**: HIGH (heads-up)

#### 4.4 General Notification (talio_general)
- **Vibration**: Default pattern
- **LED**: White
- **Sound**: Default notification sound
- **Priority**: DEFAULT

---

## 🚀 Quick Test Using Script

### Step 1: Get FCM Token

```bash
# Method 1: Using script
chmod +x get-fcm-token.sh
./get-fcm-token.sh

# Method 2: Manual
adb logcat | grep "FCM Token"
```

Open the app and login. You'll see:
```
TalioFCM: 🔑 FCM Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy this token!

### Step 2: Get User ID

Check your database or backend logs for the logged-in user's ID.

### Step 3: Run Test Script

```bash
# Set environment variables
export TEST_FCM_TOKEN="your-fcm-token-here"
export TEST_USER_ID="your-user-id-here"

# Run tests
node test-android-notifications.js
```

The script will:
1. Connect to MongoDB
2. Send 4 test notifications (one for each type)
3. Wait 10 seconds between each for you to check
4. Show summary of results

---

## 📊 Test Checklist

Use this checklist to verify everything works:

### App Killed Test
- [ ] App force stopped
- [ ] Notification received
- [ ] Sound played
- [ ] Vibration worked
- [ ] LED blinked
- [ ] Shows on lock screen
- [ ] Tap opens app to correct page

### App Background Test
- [ ] App in background (Home pressed)
- [ ] Notification received
- [ ] Sound played
- [ ] Vibration worked
- [ ] Tap opens app to correct page

### App Foreground Test
- [ ] App in foreground
- [ ] In-app toast shown
- [ ] NO system notification
- [ ] Message appears immediately

### Different Types Test
- [ ] Message notification (Blue LED, short vibration)
- [ ] Task notification (Green LED, medium vibration)
- [ ] Announcement notification (Yellow LED, long vibration)
- [ ] General notification (White LED, default vibration)

### Additional Checks
- [ ] Notifications group properly
- [ ] Action buttons work (for messages)
- [ ] Notification badge shows on app icon
- [ ] Multiple notifications don't spam
- [ ] Old notifications can be dismissed

---

## 🔍 Debugging

### Check Android Logs

```bash
# All FCM logs
adb logcat | grep TalioFCM

# Firebase logs
adb logcat | grep Firebase

# All notification logs
adb logcat | grep -E "TalioFCM|Firebase|Notification"
```

### Check Backend Logs

Look for these in your backend console:

```
[Firebase Admin] Sending notification with channel: talio_messages, type: message
[Firebase Admin] Batch 1: 1 success, 0 failures
[Firebase Admin] Total: 1 success, 0 failures
```

### Check Notification Channels

```bash
adb shell cmd notification list_channels sbs.zenova.twa
```

You should see:
- `talio_messages` (IMPORTANCE_HIGH)
- `talio_tasks` (IMPORTANCE_HIGH)
- `talio_announcements` (IMPORTANCE_HIGH)
- `talio_general` (IMPORTANCE_DEFAULT)

---

## 🐛 Common Issues

### Issue: No notification when app is killed

**Possible Causes:**
1. Battery optimization is blocking the service
2. Notification permission not granted
3. FCM token not saved in database
4. Backend not sending data payload

**Solutions:**
1. Settings → Apps → Talio → Battery → Unrestricted
2. Settings → Apps → Talio → Notifications → Enabled
3. Check database: `db.users.findOne({_id: "user-id"}).fcmTokens`
4. Check backend logs for FCM send errors

### Issue: Notification shows but no sound

**Possible Causes:**
1. Notification channel sound disabled
2. Device in silent mode
3. Do Not Disturb enabled

**Solutions:**
1. Long-press notification → All categories → Messages → Enable sound
2. Check device volume
3. Disable Do Not Disturb

### Issue: Backend shows "0 success, 1 failures"

**Possible Causes:**
1. Invalid FCM token
2. Firebase Admin SDK not configured
3. google-services.json mismatch

**Solutions:**
1. Regenerate FCM token (logout and login)
2. Check Firebase Admin credentials
3. Verify google-services.json matches Firebase project

---

## ✅ Success Criteria

Your implementation is successful if:

✅ Notifications work when app is **completely killed**
✅ Notifications work when app is in **background**
✅ In-app notifications work when app is in **foreground**
✅ Different notification types have different **vibration patterns**
✅ Different notification types have different **LED colors**
✅ Notifications show on **lock screen**
✅ Tapping notification **opens app** to correct page
✅ **Action buttons** work (for messages)
✅ Notifications **group** properly
✅ **Battery optimization** doesn't block notifications

---

## 🎉 Expected Result

If all tests pass, your Android app has **WhatsApp-like push notifications**!

**Congratulations!** 🚀

Your implementation is production-ready and follows industry best practices used by WhatsApp, Instagram, and other major apps.

