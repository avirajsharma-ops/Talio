# 🔥 CRITICAL: Firebase SenderId Mismatch - How to Fix

## ❌ Current Error

```
[Firebase Admin] Token 1 failed: messaging/mismatched-credential SenderId mismatch
```

## 🎯 Root Cause

Your **Android app** and **backend server** are using **DIFFERENT Firebase projects**!

- Android app generates FCM tokens from Firebase Project A
- Backend tries to send notifications using Firebase Project B
- Firebase rejects the tokens because they don't match

## ✅ The Solution

You need to ensure BOTH the Android app and backend use the **SAME Firebase project**.

---

## 🔍 Step 1: Identify Which Firebase Projects You're Using

### Check Android App Firebase Project

1. **Open:** `android/app/google-services.json`
2. **Find:** `project_id` field
3. **Note it down**

Example:
```json
{
  "project_info": {
    "project_number": "123456789",
    "project_id": "talio-hrms",  ← THIS IS YOUR ANDROID PROJECT
    "storage_bucket": "talio-hrms.appspot.com"
  }
}
```

### Check Backend Firebase Project

1. **Open:** `.env` file
2. **Find:** `FIREBASE_SERVICE_ACCOUNT_KEY`
3. **Look for:** `project_id` in the JSON

Example:
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"talio-a269f",...}
                                                        ↑
                                                   THIS IS YOUR BACKEND PROJECT
```

### Compare Them

If they're **different**, that's your problem!

---

## 🛠️ Step 2: Fix the Mismatch (Choose ONE Option)

### Option A: Update Backend to Match Android App (RECOMMENDED)

**Why:** Android app is already installed on devices with FCM tokens

**Steps:**

1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Select the Android app's project** (the one from `google-services.json`)
3. **Go to:** Project Settings → Service Accounts
4. **Click:** "Generate New Private Key"
5. **Download** the JSON file
6. **Copy the entire JSON content**
7. **Update `.env` file:**
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"talio-hrms",...paste entire JSON here...}
   ```
8. **Restart backend:** Stop and run `npm run dev` again

### Option B: Update Android App to Match Backend

**Why:** If backend is already in production

**Steps:**

1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Select the backend's project** (the one from `.env`)
3. **Add Android app** if not already added:
   - Click "Add app" → Android
   - Package name: `sbs.zenova.twa`
   - Download `google-services.json`
4. **Replace:** `android/app/google-services.json` with the new file
5. **Rebuild Android app:**
   ```bash
   cd android
   ./gradlew clean assembleRelease
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```
6. **Login again** on Android app to generate new FCM tokens

---

## 🔍 Step 3: Verify the Fix

### Check Project IDs Match

**Android:**
```bash
cat android/app/google-services.json | grep project_id
```

**Backend:**
```bash
# In .env file, check FIREBASE_SERVICE_ACCOUNT_KEY
# Look for "project_id" field
```

**They should be IDENTICAL!**

### Test Again

1. **Logout and login** on Android app (to generate new FCM tokens)
2. **Go to test page:** http://localhost:3000/test-notifications.html
3. **Send test notification**
4. **Check logs** - should see:
   ```
   [Firebase Admin] Batch 1: 1 success, 0 failures
   ```

---

## 📊 Expected Success Output

When fixed, you should see:

```
================================================================================
🧪 TEST NOTIFICATION
================================================================================
User: aviraj.sharma@mushroomworldgroup.com (6907c482db38fb4cd2917b2b)
Type: message
Title: Test Message
FCM Tokens: 1
================================================================================

[Firebase Admin] Sending notification with channel: talio_messages, type: message
[Firebase Admin] Batch 1: 1 success, 0 failures
[Firebase Admin] Total: 1 success, 0 failures

📊 Test Result:
   Success: true
   Success Count: 1
   Failure Count: 0

✅ Saved notification to database
```

**And on your Android device:**
- ✅ Notification appears
- ✅ Sound plays
- ✅ Device vibrates
- ✅ Works even when app is killed!

---

## 🚨 Important Notes

### After Fixing:

1. **All existing FCM tokens will be invalid** if you change the Android app's Firebase project
2. **Users must logout and login again** to generate new tokens
3. **Or clear app data:** Settings → Apps → Talio → Storage → Clear Data

### Which Option to Choose:

- **Option A (Update Backend):** If you have few users or app is in development
- **Option B (Update Android App):** If backend is in production with many users

---

## 🔍 How to Check Current Firebase Projects

### Quick Check Script

Create a file `check-firebase-projects.js`:

```javascript
const fs = require('fs')
require('dotenv').config()

// Check Android
const googleServices = JSON.parse(fs.readFileSync('android/app/google-services.json', 'utf8'))
const androidProjectId = googleServices.project_info.project_id

// Check Backend
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')
const backendProjectId = serviceAccount.project_id

console.log('🔍 Firebase Project Check')
console.log('='.repeat(50))
console.log(`Android Project ID:  ${androidProjectId}`)
console.log(`Backend Project ID:  ${backendProjectId}`)
console.log('='.repeat(50))

if (androidProjectId === backendProjectId) {
  console.log('✅ MATCH! Projects are the same.')
} else {
  console.log('❌ MISMATCH! This is why notifications are failing!')
  console.log('\nFix: Update one to match the other.')
}
```

Run:
```bash
node check-firebase-projects.js
```

---

## 📞 Need Help?

If you're still stuck:

1. **Check Firebase Console:** Make sure both projects exist
2. **Verify package name:** Must be `sbs.zenova.twa` in both
3. **Check SHA-1 fingerprint:** May be required for some Firebase features
4. **Enable Cloud Messaging:** In Firebase Console → Cloud Messaging

---

## ✅ Summary

**Problem:** Android app and backend using different Firebase projects

**Solution:** Make them use the SAME Firebase project

**Recommended:** Update backend to match Android app (Option A)

**After Fix:** Logout/login on Android app to generate new tokens

**Test:** Use test page to verify notifications work

---

**Status: READY TO FIX** 🔧

Follow Option A or Option B above to resolve the SenderId mismatch!

