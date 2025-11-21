# 🔥 Firebase Push Notifications - Required Credentials

## 📋 Overview

This document lists ALL the credentials you need to set up Firebase Cloud Messaging for both **Web** and **Android** push notifications.

---

## 🌐 For Web Push Notifications

### 1. Firebase Project Configuration (Public - Client Side)

These go in your `.env` file with `NEXT_PUBLIC_` prefix:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Where to get these:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Scroll down to "Your apps" section
5. Click on the Web app (or add one if it doesn't exist)
6. Copy all the config values

### 2. VAPID Key (Web Push Certificate)

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

**Where to get this:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Go to "Cloud Messaging" tab
5. Scroll down to "Web Push certificates"
6. Click "Generate key pair" if you don't have one
7. Copy the "Key pair" value

---

## 🖥️ For Backend (Server Side)

### Option 1: Service Account JSON (Recommended)

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

**Where to get this:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file
7. Copy the ENTIRE JSON content (all on one line) to your `.env` file

### Option 2: Individual Fields (Fallback)

If you prefer separate fields:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
```

**Where to get these:**
- Same as Option 1, but extract individual fields from the JSON file

---

## 📱 For Android App

### 1. google-services.json

**Location:** `android/app/google-services.json`

**Where to get this:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Scroll down to "Your apps" section
5. Click on the Android app (or add one if it doesn't exist)
   - **Package name:** `sbs.zenova.twa` (or your package name)
6. Download `google-services.json`
7. Place it in `android/app/` directory

---

## ✅ Complete .env Example

```env
# ===========================================
# FIREBASE CLOUD MESSAGING (PUSH NOTIFICATIONS)
# ===========================================

# Firebase Client Configuration (Public - goes to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDsJgwFuOjgg4QFox6xw8Gg4rs5oub4ZD8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-a269f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-a269f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-a269f.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=748268440394
NEXT_PUBLIC_FIREBASE_APP_ID=1:748268440394:web:c659dbece00a2501c28fb3
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-K62ZKF65CX

# VAPID Key for Web Push
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BGovko5K43uMi-Id1-BoL96OnxBk2c9QE8lFmuDhG5-HpNVQ2fO-_hMNlO7oeiW2oJlNyM9hpvARvyf-0j9deUU

# Firebase Admin SDK (Private - server only)
# Option 1: Full service account JSON (RECOMMENDED)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"talio-a269f",...}

# Option 2: Individual fields (fallback)
FIREBASE_PROJECT_ID=talio-a269f
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@talio-a269f.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔍 How to Verify You Have Everything

### Check Web Credentials:
```bash
# Check if all NEXT_PUBLIC_ variables are set
grep "NEXT_PUBLIC_FIREBASE" .env
```

### Check Backend Credentials:
```bash
# Check if service account is set
grep "FIREBASE_SERVICE_ACCOUNT_KEY" .env
# OR check individual fields
grep "FIREBASE_PROJECT_ID\|FIREBASE_CLIENT_EMAIL\|FIREBASE_PRIVATE_KEY" .env
```

### Check Android Credentials:
```bash
# Check if google-services.json exists
ls -la android/app/google-services.json
```

---

## ⚠️ Important Notes

1. **Same Firebase Project:** Make sure ALL credentials (Web, Backend, Android) are from the SAME Firebase project!

2. **Project ID Must Match:**
   - `.env` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `.env` → `FIREBASE_PROJECT_ID` (in service account JSON)
   - `android/app/google-services.json` → `project_id`
   
   **All three must be identical!**

3. **Sender ID Must Match:**
   - `.env` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `android/app/google-services.json` → `project_number`
   
   **Both must be identical!**

4. **Security:**
   - Never commit `.env` to git
   - Never commit `google-services.json` to public repos
   - Keep service account JSON secure

---

## 📊 Quick Verification Script

Run this to verify all credentials are set:

```bash
node check-firebase-projects.js
```

Expected output:
```
✅ SUCCESS! Both are using the SAME Firebase project!
```

---

## 🚀 Next Steps

Once you have all these credentials:

1. ✅ Add them to `.env` file
2. ✅ Place `google-services.json` in `android/app/`
3. ✅ Restart your backend server
4. ✅ Rebuild your Android app
5. ✅ Test notifications!

---

**Status: CREDENTIALS DOCUMENTED** ✅

Collect all these credentials and we'll implement the new Firebase messaging system!

