# 🧪 Android Push Notification Testing Tools

Complete testing suite to verify WhatsApp-like push notifications work properly.

---

## 📁 Testing Files Created

1. **`test-android-notifications.js`** - Automated Node.js test script
2. **`get-fcm-token.sh`** - Script to extract FCM token from Android device
3. **`MANUAL_TEST_GUIDE.md`** - Comprehensive manual testing guide
4. **`app/api/test-notification/route.js`** - API endpoint for testing
5. **`public/test-notifications.html`** - Web-based test interface
6. **`android/test-notifications.sh`** - Android debugging script

---

## 🚀 Quick Start - Choose Your Method

### Method 1: Web Interface (Easiest) ⭐

**Best for:** Quick testing without command line

1. **Start your backend:**
   ```bash
   npm run dev
   ```

2. **Open test page in browser:**
   ```
   http://localhost:3000/test-notifications.html
   ```

3. **Get your User ID:**
   - Login to your app
   - Check browser console or database
   - Or check: `http://localhost:3000/api/auth/session`

4. **Force stop Android app:**
   - Settings → Apps → Talio → Force Stop

5. **Click test buttons and check your device!**

---

### Method 2: API Endpoint (For Developers)

**Best for:** Integration with other tools, Postman, curl

1. **Start your backend:**
   ```bash
   npm run dev
   ```

2. **Get endpoint info:**
   ```bash
   curl http://localhost:3000/api/test-notification
   ```

3. **Send test notification:**
   ```bash
   curl -X POST http://localhost:3000/api/test-notification \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "YOUR_USER_ID",
       "type": "message"
     }'
   ```

4. **Check your Android device!**

**Available types:** `message`, `task`, `announcement`, `general`

---

### Method 3: Node.js Script (Automated)

**Best for:** Running multiple tests automatically

1. **Get FCM token from Android device:**
   ```bash
   chmod +x get-fcm-token.sh
   ./get-fcm-token.sh
   ```
   
   Open app and login. Copy the FCM token from logs.

2. **Get your User ID from database**

3. **Run automated tests:**
   ```bash
   TEST_FCM_TOKEN="your-fcm-token" \
   TEST_USER_ID="your-user-id" \
   node test-android-notifications.js
   ```

4. **Script will:**
   - Send 4 test notifications (one for each type)
   - Wait 10 seconds between each
   - Show summary of results

---

### Method 4: Manual Testing (Most Thorough)

**Best for:** Understanding exactly how it works

Follow the comprehensive guide:
```bash
cat MANUAL_TEST_GUIDE.md
```

Or open: `MANUAL_TEST_GUIDE.md`

---

## 🎯 Test Scenarios

### 1. App Killed Test (MOST IMPORTANT)

This proves WhatsApp-like behavior!

```bash
# Force stop app
adb shell am force-stop sbs.zenova.twa

# Watch logs
adb logcat | grep TalioFCM

# Send test notification (use any method above)

# Expected: Notification appears with sound & vibration!
```

### 2. App Background Test

```bash
# Press Home button on device (don't force stop)

# Send test notification

# Expected: Notification appears
```

### 3. App Foreground Test

```bash
# Keep app open on screen

# Send test notification

# Expected: In-app toast (no system notification)
```

### 4. Different Types Test

Test all 4 notification types to verify different vibration patterns:

- **Message** (💬) - Short vibration, Blue LED
- **Task** (📋) - Medium vibration, Green LED
- **Announcement** (📢) - Long vibration, Yellow LED
- **General** (🔔) - Default vibration, White LED

---

## 🔍 Debugging Tools

### Check Android Logs

```bash
# FCM logs only
adb logcat | grep TalioFCM

# All Firebase logs
adb logcat | grep Firebase

# All notification logs
adb logcat | grep -E "TalioFCM|Firebase|Notification"
```

### Check if App is Running

```bash
adb shell "ps | grep sbs.zenova.twa"
```

### Force Stop App

```bash
adb shell am force-stop sbs.zenova.twa
```

### Check Notification Channels

```bash
adb shell cmd notification list_channels sbs.zenova.twa
```

### Launch App

```bash
adb shell am start -n sbs.zenova.twa/.MainActivity
```

---

## 📊 Expected Logs

### ✅ Good Logs (Working)

**Android:**
```
TalioFCM: 📩 Message received from: ...
TalioFCM: 📦 Data payload: {title=Test, body=Message, type=message}
TalioFCM: ✅ Processing data payload (app may be killed)
TalioFCM: 🔔 Showing notification - Type: message, Channel: talio_messages
TalioFCM: ✅ Notification displayed successfully
```

**Backend:**
```
[Firebase Admin] Sending notification with channel: talio_messages, type: message
[Firebase Admin] Batch 1: 1 success, 0 failures
[Firebase Admin] Total: 1 success, 0 failures
```

### ❌ Bad Logs (Not Working)

**Android:**
```
TalioFCM: ⚠️ No valid payload found in message
```

**Backend:**
```
[Firebase Admin] Total: 0 success, 1 failures
```

---

## 🐛 Troubleshooting

### Issue: "No FCM tokens found for user"

**Solution:**
1. Open Android app
2. Login with the user
3. Check logs: `adb logcat | grep "FCM Token"`
4. Token should be generated and sent to backend

### Issue: "User not found"

**Solution:**
1. Verify User ID is correct
2. Check database: `db.users.findOne({_id: ObjectId("your-id")})`

### Issue: No notification when app is killed

**Solution:**
1. Check battery optimization: Settings → Apps → Talio → Battery → Unrestricted
2. Check notification permission: Settings → Apps → Talio → Notifications → Enabled
3. Rebuild app with latest changes
4. Check backend logs for FCM errors

### Issue: Backend shows "0 success, 1 failures"

**Solution:**
1. Check Firebase Admin SDK credentials
2. Verify google-services.json matches Firebase project
3. Check FCM token is valid (regenerate by logout/login)

---

## ✅ Success Checklist

- [ ] Backend running (`npm run dev`)
- [ ] Android app rebuilt with latest changes
- [ ] Android app installed on device
- [ ] Logged in with test account
- [ ] FCM token generated (check logs)
- [ ] User ID obtained
- [ ] App force stopped
- [ ] Test notification sent
- [ ] **Notification received on device** ✅
- [ ] Sound played ✅
- [ ] Vibration worked ✅
- [ ] LED blinked ✅
- [ ] Shows on lock screen ✅
- [ ] Tap opens app ✅

---

## 🎉 Expected Result

If all tests pass:

✅ Notifications work when app is **completely killed**
✅ Notifications work when app is in **background**
✅ In-app notifications work when app is in **foreground**
✅ Different types have different **vibration patterns**
✅ Different types have different **LED colors**
✅ Notifications show on **lock screen**
✅ Tapping notification **opens app**
✅ **WhatsApp-like behavior achieved!**

---

## 📚 Additional Resources

- **Complete Implementation Guide**: `ANDROID_PUSH_NOTIFICATION_WHATSAPP_LIKE.md`
- **Before/After Comparison**: `BEFORE_AFTER_ANDROID_NOTIFICATIONS.md`
- **Fix Summary**: `ANDROID_NOTIFICATION_FIX_SUMMARY.md`
- **Quick Start**: `QUICK_START_ANDROID_NOTIFICATIONS.md`

---

## 🚀 Recommended Testing Flow

1. **Start with Web Interface** (easiest)
   - Open `http://localhost:3000/test-notifications.html`
   - Test all 4 notification types

2. **Verify with Logs**
   - Run `adb logcat | grep TalioFCM`
   - Confirm data payload processing

3. **Test All Scenarios**
   - App killed (most important)
   - App background
   - App foreground

4. **Run Automated Tests** (optional)
   - Use `test-android-notifications.js`
   - Get comprehensive test report

---

**Status: READY FOR TESTING** 🚀

Choose any method above and start testing your WhatsApp-like notifications!

