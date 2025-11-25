# FCM Token Registration Fix

## Problem Identified

**Issue**: FCM tokens were not being saved to the database even after reinstalling the app.

**Root Cause**: The Android app was calling `window.handleFCMToken()` JavaScript function, but this function didn't exist in the web app. The token was being obtained from Firebase but never sent to the backend server.

## Solution Implemented

### 1. Created Global FCM Handler (`public/fcm-handler.js`)

Created a global JavaScript function that the Android app can call to register FCM tokens with the backend:

**Features**:
- `window.handleFCMToken(fcmToken, userId, deviceInfo)` - Registers token with backend
- `window.checkPendingFCMToken()` - Checks for pending tokens after login
- Automatic retry mechanism for tokens received before login
- Stores pending tokens in localStorage if user is not logged in yet

### 2. Added Script to Global Layout

Modified `app/layout.js` to include the FCM handler script globally:
```html
<script src="/fcm-handler.js"></script>
```

### 3. Updated Login Flow

Modified `app/login/page.js` to check for pending FCM tokens after successful login:
```javascript
if (window.checkPendingFCMToken) {
  window.checkPendingFCMToken()
}
```

### 4. Created Verification Script

Created `scripts/check-fcm-tokens.js` to verify tokens in database.

## How It Works

### Token Registration Flow:

1. **User logs into Android app**
   - Android's `MainActivity.kt` calls `window.AndroidFCM.registerToken(userId)`

2. **FCM token obtained**
   - Firebase SDK retrieves FCM token
   - `MainActivity.kt` calls `window.handleFCMToken(token, userId, deviceInfo)`

3. **Token sent to backend**
   - `fcm-handler.js` receives the call
   - Gets auth token from localStorage
   - Sends POST request to `/api/fcm/token`

4. **Token saved to database**
   - Backend API validates request
   - Adds/updates token in user's `fcmTokens` array
   - Returns success response

### Pending Token Handling:

If the FCM token arrives before user is logged in:
1. Token is stored in `localStorage.setItem('pending_fcm_token', token)`
2. After login, `checkPendingFCMToken()` is called
3. Pending token is registered with backend
4. Pending token is cleared from localStorage

## Testing Steps

### Step 1: Deploy the Fix

```powershell
# Rebuild the Android APK
cd android
.\quick-build.bat
```

### Step 2: Install Fresh APK

1. Uninstall old version: Settings → Apps → Talio → Uninstall
2. Install new APK: `C:\Users\adilk\Downloads\Talio-Release\Talio-HRMS-FCM.apk`

### Step 3: Login to App

1. Open Talio app
2. Login with your credentials
3. Check browser console in WebView (if debugging) for:
   ```
   📱 FCM Token received from Android: {...}
   ✅ FCM token registered successfully: {...}
   ```

### Step 4: Verify Token in Database

Run the verification script:
```powershell
node scripts/check-fcm-tokens.js
```

Expected output:
```
✅ User Name (email@example.com)
   Tokens: 1
   [1] dXyZ1234567890abcdef...
       Device: android
       Created: 11/24/2025, 10:30:00 AM
       Last Used: 11/24/2025, 10:30:00 AM

📈 Summary:
   Total users: 10
   Users with tokens: 1
   Total FCM tokens: 1
```

### Step 5: Test Notification Pop-up

1. Go to diagnostic page: https://app.talio.in/dashboard/fcm-diagnostic
2. Click "Send Test Notification"
3. Should see pop-up bubble notification like WhatsApp

## Verification Checklist

- [ ] APK rebuilt with latest code
- [ ] App installed and opens successfully
- [ ] User can login successfully
- [ ] Browser console shows FCM token registration
- [ ] Database shows FCM token (run `node scripts/check-fcm-tokens.js`)
- [ ] Test notification creates pop-up bubble

## Files Modified

1. **NEW**: `public/fcm-handler.js` - Global FCM token handler
2. **MODIFIED**: `app/layout.js` - Added FCM handler script
3. **MODIFIED**: `app/login/page.js` - Added pending token check after login
4. **NEW**: `scripts/check-fcm-tokens.js` - Database verification script

## Backend API Endpoints

- **POST** `/api/fcm/token` - Register/update FCM token
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ fcmToken: string, deviceInfo: object }`

- **DELETE** `/api/fcm/token` - Remove FCM token
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ fcmToken: string }`

## Debugging

### Check Android Logs

```powershell
adb logcat | Select-String "FCM"
```

Look for:
- `✅ FCM Token: ...` - Token obtained
- `✅ Token sent to web app for user: ...` - Token sent to JavaScript

### Check Browser Console

In Chrome DevTools (when debugging WebView):
- `📱 FCM Handler loaded` - Script loaded
- `📱 FCM Token received from Android: ...` - Token received
- `✅ FCM token registered successfully: ...` - Token saved

### Check Database Directly

```javascript
// In MongoDB Compass or shell
db.users.find({ "fcmTokens.0": { $exists: true } })
```

## Common Issues

### Issue: "No auth token found in localStorage"
**Solution**: User needs to login first. Token will be stored as pending and registered after login.

### Issue: "Failed to register FCM token"
**Solution**: Check that backend `/api/fcm/token` endpoint is working. Verify JWT_SECRET is set correctly.

### Issue: Token shows in logs but not in database
**Solution**: Run `node scripts/check-fcm-tokens.js` to verify. Check backend API response for errors.

## Next Steps

After verification:
1. ✅ Confirm tokens are saving to database
2. ✅ Test push notifications from backend
3. ✅ Verify pop-up bubbles appear for messages, tasks, announcements
4. ✅ Test notification channels (Messages, Tasks, Announcements, General)
5. ✅ Verify notifications work when app is closed/background

---

**Status**: Ready for testing
**Priority**: HIGH - Required for notification system
**Estimated Test Time**: 5 minutes
