# 🔥 Firebase Credentials Setup - Fix "Unable to detect a Project Id" Error

## ⚠️ Error You're Seeing

```
[Firebase Admin] Batch error: Error: Unable to detect a Project Id in the current environment.
[Firebase Admin] No credentials found. Using default credentials.
```

This means your Firebase Admin SDK credentials are **not configured** in your `.env.local` file.

---

## ✅ Quick Fix

### Step 1: Get Firebase Admin SDK Credentials

1. Go to https://console.firebase.google.com/
2. Select your project: **`talio-e9deb`**
3. Click the ⚙️ **Settings** icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** button
6. Download the JSON file

### Step 2: Extract Values from JSON

Open the downloaded JSON file. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "talio-e9deb",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@talio-e9deb.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/..."
}
```

### Step 3: Add to `.env.local`

Create or edit `.env.local` file in your project root and add:

```bash
# ===========================================
# FIREBASE ADMIN SDK (REQUIRED FOR PUSH NOTIFICATIONS)
# ===========================================

# Copy these values from the JSON file you downloaded
FIREBASE_PROJECT_ID=talio-e9deb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@talio-e9deb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANT:**
- Keep the `\n` in the private key (they represent newlines)
- Wrap the private key in double quotes `"..."`
- Copy the ENTIRE private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Step 4: Restart Server

```powershell
# Stop the server (Ctrl + C if running)

# Restart
npm run dev
```

### Step 5: Verify

Check server console. You should see:

```
✅ [Firebase Admin] Initialized successfully
```

Instead of:

```
❌ [Firebase Admin] No credentials found. Using default credentials.
```

---

## 🔍 Complete `.env.local` Example

Your `.env.local` should have all these Firebase variables:

```bash
# ===========================================
# FIREBASE CLOUD MESSAGING (PUSH NOTIFICATIONS)
# ===========================================

# Client Configuration (Public - from firebase-messaging-sw.js)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDEyadwMSwamwG-KeMwzGwZ15UArNdJn-Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-e9deb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-e9deb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-e9deb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=241026194465
NEXT_PUBLIC_FIREBASE_APP_ID=1:241026194465:web:b91d15bf73bcf807ad1760
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Admin SDK (Private - from JSON file)
FIREBASE_PROJECT_ID=talio-e9deb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@talio-e9deb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

# VAPID Key (Get from Firebase Console → Cloud Messaging → Web Push certificates)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
```

---

## 🧪 Test Push Notifications

After adding credentials:

1. Restart server: `npm run dev`
2. Login to the app
3. Send a chat message to another user
4. Check server logs - should see:

```
✅ [Firebase Admin] Initialized successfully
✅ Notification sent successfully: 💬 New message from [Your Name]
```

---

## ❌ Common Errors & Fixes

### Error: "Unable to detect a Project Id"
**Cause:** Missing `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY`
**Fix:** Add all three variables to `.env.local`

### Error: "Invalid private key"
**Cause:** Private key not properly escaped
**Fix:** Keep the `\n` characters in the string, wrap in double quotes

### Error: "Notification validation failed: type: `message` is not a valid enum value"
**Cause:** Old code using invalid notification type
**Fix:** ✅ Already fixed! Changed from 'message' to 'chat'

### Error: "Notification validation failed: user: Path `user` is required"
**Cause:** Old code using 'recipients' instead of 'user'
**Fix:** ✅ Already fixed! Now creates one notification per user

---

## 📁 Where Credentials Are Used

### `lib/firebaseAdmin.js`
- Reads: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Purpose: Initialize Firebase Admin SDK for sending push notifications

### `lib/firebase.js`
- Reads: `NEXT_PUBLIC_FIREBASE_*` variables
- Purpose: Initialize Firebase Client SDK for receiving push notifications

### `public/firebase-messaging-sw.js`
- Generated by: `scripts/generate-firebase-sw.js`
- Purpose: Service worker for background push notifications

---

## 🔐 Security Notes

1. **Never commit `.env.local`** to git (already in `.gitignore`)
2. **Keep private key secret** - it has full access to your Firebase project
3. **Regenerate key if exposed** - Go to Firebase Console → Service Accounts → Delete old key → Generate new
4. **Use different credentials** for dev/staging/production

---

## 🚀 Production Deployment

For production (Docker, server, etc.), set environment variables:

```bash
export FIREBASE_PROJECT_ID=talio-e9deb
export FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@talio-e9deb.iam.gserviceaccount.com
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Or add to `docker-compose.yml`:

```yaml
environment:
  - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
  - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
  - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
```

---

## ✅ Checklist

- [ ] Downloaded Firebase Admin SDK JSON file from Firebase Console
- [ ] Extracted `project_id`, `client_email`, `private_key` from JSON
- [ ] Added to `.env.local` as `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- [ ] Wrapped private key in double quotes with `\n` preserved
- [ ] Restarted server: `npm run dev`
- [ ] Verified in logs: `[Firebase Admin] Initialized successfully`
- [ ] Tested chat message notification

---

## 🎉 All Done!

Your Firebase Admin SDK is now properly configured. Push notifications will work when:

1. ✅ User has granted notification permission
2. ✅ User has FCM token saved in database
3. ✅ App is closed or in background
4. ✅ Someone sends them a message, assigns a task, etc.

**Need help?** See `FIREBASE_ENV_SETUP.md` for complete Firebase setup guide.
