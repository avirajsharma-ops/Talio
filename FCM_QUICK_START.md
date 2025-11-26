# 🚀 FCM Quick Start Checklist

## Before You Begin
- [ ] Physical Android device available for testing
- [ ] Google account for Firebase Console
- [ ] Access to `.env.local` file
- [ ] Familiarity with command line

**Estimated Time**: 45 minutes

---

## Step 1: Firebase Console Setup (10 minutes)

### Create Firebase Project
- [ ] Go to https://console.firebase.google.com
- [ ] Click "Add project"
- [ ] Name: "Talio HRMS" (or your choice)
- [ ] Disable Google Analytics (optional)
- [ ] Click "Create project"

### Add Android App
- [ ] Click Android icon in Firebase Console
- [ ] Package name: `sbs.zenova.twa`
- [ ] App nickname: `Talio Android App`
- [ ] Leave SHA-1 blank
- [ ] Click "Register app"

---

## Step 2: Download Credentials (5 minutes)

### google-services.json
- [ ] Download `google-services.json` from Firebase Console
- [ ] Place in: `android/app/google-services.json`
- [ ] Verify file is exactly named `google-services.json`

### Service Account Key
- [ ] Go to Firebase Console → Project Settings (gear icon)
- [ ] Click "Service accounts" tab
- [ ] Click "Generate new private key"
- [ ] Download JSON file
- [ ] Keep file secure (DO NOT commit to Git)

---

## Step 3: Environment Configuration (5 minutes)

### Update .env.local
- [ ] Open `.env.local` in project root
- [ ] Add this line:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='PASTE_SERVICE_ACCOUNT_JSON_HERE'
```

**How to format:**
1. Open downloaded service account JSON file
2. Copy ENTIRE contents
3. Minify (remove line breaks) - paste into one line
4. Wrap in single quotes
5. Paste into .env.local

**Example:**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"talio-hrms","private_key_id":"abc123",...}'
```

### Verify Other Variables
- [ ] Check these exist in `.env.local`:
```bash
MONGODB_URI=...
JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

---

## Step 4: Install Dependencies (2 minutes)

### Backend Dependencies
```bash
npm install
```

**This installs:**
- `firebase-admin@^12.0.0` - Already in package.json

---

## Step 5: Build Android App (10 minutes)

### Clean & Build
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

**Or use helper script:**
```bash
cd ..  # Back to project root
bash build-apk-app.sh
```

### Locate APK
- [ ] APK location: `android/app/build/outputs/apk/release/app-release.apk`
- [ ] Verify file exists and size > 10MB

---

## Step 6: Install on Device (3 minutes)

### Connect Device
- [ ] Enable USB debugging on Android device
- [ ] Connect device to computer via USB
- [ ] Verify connection: `adb devices`

### Install APK
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Or manually:**
- [ ] Copy APK to device
- [ ] Open file and tap "Install"
- [ ] Allow installation from unknown sources

---

## Step 7: Start Development Server (1 minute)

### Start Server
```bash
npm run dev
```

**IMPORTANT:** Use `npm run dev` (NOT `npm run dev:next`)

- [ ] Server running on http://localhost:3000
- [ ] No errors in console

---

## Step 8: Test Token Registration (5 minutes)

### Login on Device
- [ ] Open Talio app on Android device
- [ ] Login with user credentials
- [ ] App should load dashboard

### Check Logs

**Chrome DevTools (for WebView):**
1. Open Chrome on desktop
2. Go to `chrome://inspect`
3. Click "Inspect" next to your device
4. View console logs

**Expected logs:**
```
✅ [FCM] Firebase initialized
✅ [FCM] Token retrieved: eyJhb...
✅ FCM token registered successfully
```

**Server logs (terminal):**
```
✅ FCM token registered for user user@example.com
```

### Verify Database
```javascript
// MongoDB shell or Compass
db.users.findOne({ email: "your-test-user@example.com" })

// Should see:
{
  fcmTokens: [
    {
      token: "eyJhb...",
      device: "android",
      deviceInfo: {...},
      createdAt: "...",
      lastUsed: "..."
    }
  ]
}
```

---

## Step 9: Test Notification Sending (5 minutes)

### Test Chat Notification
- [ ] Login with User A on device 1
- [ ] Login with User B on device 2 (or browser)
- [ ] User A sends message to User B
- [ ] User B receives notification on device

**Expected on User B's device:**
- Notification appears in notification tray
- Title: "💬 New message from [User A Name]"
- Body: Message preview
- Clicking opens chat

**Server logs:**
```
💬 [WebSocket] Broadcasted message to chat:xxx
✅ FCM notifications sent: 1/1
📱 FCM notification sent to userb@example.com
```

### Test Leave Notification
- [ ] Employee submits leave request
- [ ] Manager receives notification

**Expected:**
- Manager sees notification
- Title: "🏖️ New Leave Request"
- Body: "[Employee] requested [Leave Type]..."

---

## Step 10: Test Preferences (5 minutes)

### Disable Chat Notifications
```bash
curl -X PUT http://localhost:3000/api/fcm/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"preferences": {"chat": false}}'
```

**Get JWT token:**
1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Copy value of `next-auth.session-token`

### Verify
- [ ] Send chat message
- [ ] Notification NOT sent
- [ ] Server logs: `⚠️ Chat notifications disabled for user...`

### Re-enable
```bash
curl -X PUT http://localhost:3000/api/fcm/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"preferences": {"chat": true}}'
```

---

## ✅ Success Checklist

### Critical Tests
- [ ] ✅ Token registered on login
- [ ] ✅ Chat notification received
- [ ] ✅ Leave notification received
- [ ] ✅ Preferences respected
- [ ] ✅ Token removed on logout

### Optional Tests
- [ ] Task assigned notification
- [ ] Announcement notification
- [ ] Multiple devices (same user)
- [ ] Invalid token cleanup (uninstall app, send notification)

---

## 🐛 Troubleshooting

### Issue: "google-services.json not found"
**Solution:**
- Verify file is in `android/app/google-services.json`
- File must be exactly named `google-services.json`
- Rebuild: `cd android && ./gradlew clean assembleRelease`

### Issue: "FCM token not registered"
**Solution:**
- Check Android logs: `adb logcat | grep Firebase`
- Verify Firebase initialized in logs
- Check server logs for errors
- Restart app on device

### Issue: "Firebase service account error"
**Solution:**
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`
- Check JSON is valid (no line breaks except in private_key)
- Ensure private key newlines escaped: `\\n`
- Restart server: `npm run dev`

### Issue: "Notification not received"
**Solution:**
1. Check user has FCM token in database
2. Verify preferences enabled for that type
3. Check server logs for send errors
4. Ensure app is in background (notifications show when app closed)
5. Test with manual API call

### Issue: "Cannot connect to device"
**Solution:**
- Enable USB debugging on Android
- Install ADB tools
- Run: `adb devices` to verify connection
- Try different USB cable/port

---

## 📊 Expected Results

### After Complete Setup
✅ **Backend:**
- Firebase Admin SDK initialized
- Service account authenticated
- Notification service ready

✅ **Android App:**
- Firebase SDK initialized
- FCM token retrieved
- Token sent to backend
- Token stored in database

✅ **Notifications:**
- Chat messages trigger notifications
- Leave requests trigger notifications
- All 18 notification types working
- Preferences respected

✅ **Database:**
- Users have fcmTokens array populated
- Notifications saved to database
- Invalid tokens cleaned up automatically

---

## 🎯 Next Steps After Testing

### For Development
- [ ] Test all 18 notification types
- [ ] Review notification content/wording
- [ ] Adjust timing/frequency if needed
- [ ] Monitor Firebase Console analytics

### For Production
- [ ] Create separate Firebase project for production
- [ ] Update production `.env` with prod credentials
- [ ] Sign APK with release keystore
- [ ] Deploy backend to production server
- [ ] Distribute APK to users

### For Monitoring
- [ ] Set up Firebase Console alerts
- [ ] Monitor notification delivery rates
- [ ] Track user engagement with notifications
- [ ] Collect feedback from users

---

## 📚 Documentation Reference

For more details, see:
- **`FCM_SETUP_GUIDE.md`** - Complete 10-part setup guide
- **`FCM_IMPLEMENTATION_SUMMARY.md`** - Technical implementation details
- **`FCM_MIGRATION_COMPLETE.md`** - Migration summary and comparison

---

## ✨ Quick Reference

### Important Files
```
.env.local                              # Service account key here
android/app/google-services.json        # Firebase config here
lib/firebaseNotification.js             # Firebase service
app/api/fcm/token/route.js              # Token API
```

### Important Commands
```bash
# Build APK
cd android && ./gradlew assembleRelease

# Install APK
adb install app/build/outputs/apk/release/app-release.apk

# Start server (with Socket.IO)
npm run dev

# Check device connection
adb devices

# View Android logs
adb logcat | grep Firebase
```

### Important URLs
- Firebase Console: https://console.firebase.google.com
- Chrome Inspect: chrome://inspect
- Local API: http://localhost:3000/api/fcm/token

---

**Ready to start? Begin with Step 1! 🚀**

**Questions?** Check the troubleshooting section or reference docs above.
