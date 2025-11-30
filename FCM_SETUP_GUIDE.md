# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
This guide walks you through setting up Firebase Cloud Messaging for push notifications in the Talio HRMS Android app and web application.

---

## Part 1: Firebase Console Setup

### 1. Create/Access Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project
3. Enter project name: **"Talio HRMS"** (or your preferred name)
4. Disable Google Analytics (optional) and click **"Create project"**

### 2. Add Android App to Firebase Project

1. In Firebase console, click **Android icon** to add Android app
2. Enter package name: `sbs.zenova.twa`
3. Enter app nickname: `Talio Android App`
4. Leave SHA-1 blank (not required for FCM)
5. Click **"Register app"**

### 3. Download google-services.json

1. Download the `google-services.json` file
2. Place it in: `android/app/google-services.json`
3. This file contains your Firebase configuration

**File location:**
```
Talio/
├── android/
│   ├── app/
│   │   ├── google-services.json  ← Place here
│   │   ├── build.gradle
│   │   └── src/
```

### 4. Generate Service Account Key (Backend)

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Download the JSON file (e.g., `talio-hrms-firebase-adminsdk-xxxxx.json`)
5. **IMPORTANT:** Keep this file secure - it has admin access to your Firebase project

---

## Part 2: Environment Configuration

### 1. Add Firebase Service Account to .env.local

Open `.env.local` and add:

```bash
# Firebase Cloud Messaging (Backend)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**How to format:**
1. Open the downloaded service account JSON file
2. Copy the ENTIRE contents
3. Minify it (remove line breaks): paste into single line
4. Escape quotes if needed (most systems auto-handle this)
5. Wrap in single quotes as shown above

**Example:**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"talio-hrms","private_key_id":"abc123",...}'
```

### 2. Verify Existing Environment Variables

These should already be in your `.env.local`:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

---

## Part 3: Android App Build

### 1. Install Dependencies

```bash
cd android
./gradlew clean
```

### 2. Build APK

```bash
./gradlew assembleRelease
```

Or use the build script:

```bash
cd ..  # Back to project root
bash build-apk-app.sh
```

### 3. Locate APK

Built APK location:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 4. Install on Android Device

**Via ADB:**
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Or manually:**
1. Copy APK to device
2. Open file and tap "Install"
3. Allow installation from unknown sources if prompted

---

## Part 4: Backend Setup

### 1. Install Dependencies

```bash
npm install firebase-admin
```

This is already added to `package.json`, so just run:

```bash
npm install
```

### 2. Verify Firebase Integration

Check that these files exist:

- ✅ `lib/firebaseNotification.js` - Firebase notification service
- ✅ `lib/fcmHelper.js` - Client-side FCM helper
- ✅ `app/api/fcm/token/route.js` - Token management API
- ✅ `lib/notificationService.js` - Updated to use FCM

### 3. Start Development Server

```bash
npm run dev
```

**IMPORTANT:** Use `npm run dev` (NOT `npm run dev:next`) to ensure Socket.IO is initialized.

---

## Part 5: Testing

### 1. Test Token Registration

1. Open Android app on device
2. Log in with user credentials
3. Check browser console (Chrome DevTools via `chrome://inspect`)
4. Look for: `✅ FCM token registered for user user@example.com`

### 2. Test Push Notification (Chat)

1. Open two devices/browsers with different users
2. User A sends message to User B
3. User B should receive notification on Android device
4. Check server logs for:
   ```
   ✅ FCM notifications sent: 1/1
   📱 FCM notification sent to [user email]
   ```

### 3. Manual Test (API)

Send test notification via API:

```bash
curl -X POST http://localhost:3000/api/test-fcm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test from Talio HRMS"
  }'
```

### 4. Check Notification Preferences

Default preferences (all enabled):
```json
{
  "chat": true,
  "projects": true,
  "leave": true,
  "attendance": true,
  "announcements": true
}
```

Update preferences:
```bash
curl -X PUT http://localhost:3000/api/fcm/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "preferences": {
      "chat": true,
      "projects": false,
      "leave": true,
      "attendance": false,
      "announcements": true
    }
  }'
```

---

## Part 6: Notification Types & Triggers

### Automatic Notifications

FCM notifications are automatically sent for:

| Event | Trigger | Recipient |
|-------|---------|-----------|
| **Chat Message** | Message sent | Conversation participants |
| **Leave Request** | Employee submits leave | Approvers (manager/HR) |
| **Leave Approved** | Manager approves | Employee who requested |
| **Leave Rejected** | Manager rejects | Employee who requested |
| **Task Assigned** | Task created/assigned | Assignee |
| **Task Completed** | Task marked complete | Task creator |
| **Announcement** | New announcement posted | Target employees |
| **Policy Published** | New policy added | All employees |
| **Expense Approved** | Expense approved | Employee |
| **Expense Rejected** | Expense rejected | Employee |
| **Travel Approved** | Travel approved | Employee |
| **Ticket Assigned** | Helpdesk ticket assigned | Assignee |
| **Ticket Updated** | Ticket status changed | Ticket creator |
| **Payroll Generated** | Payslip created | Employee |
| **Performance Review** | Review completed | Employee |

### Notification Data Payload

Each notification includes:

```json
{
  "notification": {
    "title": "Notification Title",
    "body": "Notification message"
  },
  "data": {
    "type": "chat|leave|task|announcement",
    "url": "/dashboard/module?id=xyz",
    "chatId": "...",
    "icon": "/icons/icon.png"
  }
}
```

---

## Part 7: Production Deployment

### 1. Update .env.production

```bash
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Update URLs
NEXTAUTH_URL=https://talio.yourdomain.com
NEXT_PUBLIC_API_URL=https://talio.yourdomain.com
```

### 2. Build Production APK

```bash
cd android
./gradlew assembleRelease
```

Sign APK with your keystore (see Android signing docs).

### 3. Deploy Backend

```bash
npm run build
npm run start
```

Or use Docker:

```bash
docker-compose up -d
```

### 4. Update Firebase Console

1. Add production domain to **Authorized domains**:
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add: `talio.yourdomain.com`

---

## Part 8: Troubleshooting

### Issue: "FCM token not registered"

**Solution:**
1. Check `google-services.json` is in correct location
2. Verify package name matches: `sbs.zenova.twa`
3. Check Android logs: `adb logcat | grep Firebase`
4. Rebuild app: `./gradlew clean assembleRelease`

### Issue: "Firebase service account error"

**Solution:**
1. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`
2. Check JSON is valid (use JSON validator)
3. Ensure private key newlines are escaped: `\\n`
4. Restart server after updating env variables

### Issue: "Notifications not received"

**Solution:**
1. Check user has FCM token: MongoDB → users → fcmTokens array
2. Verify notification preferences enabled for that type
3. Check server logs for FCM send errors
4. Test with manual API call to isolate issue
5. Ensure app is running in background (notifications show when app is closed)

### Issue: "Invalid token errors in logs"

**Solution:**
- Normal behavior - tokens expire when app is uninstalled or data cleared
- Service automatically removes invalid tokens from database
- User will get new token on next login

### Issue: "Chrome DevTools not showing logs"

**Solution:**
1. Open Chrome on desktop
2. Go to `chrome://inspect`
3. Click "Inspect" next to your device
4. View console logs in DevTools

---

## Part 9: Monitoring & Analytics

### Server Logs

Watch for these log patterns:

```bash
# Successful token registration
✅ FCM token registered for user user@example.com

# Notification sent
✅ FCM notifications sent: 5/5
📱 FCM notification sent to user@example.com

# Invalid token cleanup
⚠️ Removed invalid FCM token for user user@example.com

# Failed notification
❌ Failed to send FCM notification: [error details]
```

### Database Queries

Check token count per user:
```javascript
db.users.aggregate([
  {
    $project: {
      email: 1,
      tokenCount: { $size: "$fcmTokens" }
    }
  }
])
```

Check recent notifications:
```javascript
db.notifications.find({
  "deliveryStatus.fcm.sent": true
}).sort({ createdAt: -1 }).limit(10)
```

### Firebase Console Monitoring

1. Go to Firebase Console → Cloud Messaging
2. View:
   - Sent notifications count
   - Delivery rate
   - Open rate (if analytics enabled)

---

## Part 10: Security Best Practices

### ✅ DO:
- Keep `google-services.json` in version control (.gitignore if public repo)
- Store service account key in environment variables ONLY
- Use HTTPS in production
- Validate FCM tokens before sending
- Respect user notification preferences
- Implement rate limiting on notification endpoints

### ❌ DON'T:
- Commit service account key to version control
- Share service account key publicly
- Store FCM tokens in localStorage (server-side only)
- Send notifications without user consent
- Ignore notification delivery failures

---

## Summary

You've successfully set up Firebase Cloud Messaging for Talio HRMS! 🎉

**What's working:**
- ✅ Android app receives push notifications
- ✅ Backend sends notifications for 15+ event types
- ✅ User preferences control notification delivery
- ✅ Invalid tokens automatically cleaned up
- ✅ All HRMS modules integrated

**Next steps:**
1. Test all notification types with real users
2. Monitor FCM analytics in Firebase Console
3. Adjust notification content/timing based on feedback
4. Consider adding notification badges/sounds customization

For issues, check server logs, Android logcat, and Firebase Console.
