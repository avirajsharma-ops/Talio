# 🔑 Firebase VAPID Key Setup Guide

## What is a VAPID Key?

VAPID (Voluntary Application Server Identification) keys are required for web push notifications. They allow your server to send push notifications to browsers securely.

---

## 🚀 How to Get Your VAPID Key

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **talio-a269f**

### Step 2: Navigate to Cloud Messaging Settings
1. Click on the **⚙️ Settings** icon (top left, next to "Project Overview")
2. Select **Project settings**
3. Click on the **Cloud Messaging** tab

### Step 3: Find Web Push Certificates
1. Scroll down to the **Web Push certificates** section
2. You'll see a section called "Web Push certificates"

### Step 4: Generate or Copy VAPID Key
- **If you already have a key pair:**
  - Copy the **Key pair** value (it looks like: `BKxxx...xxx`)
  
- **If you don't have a key pair:**
  1. Click **Generate key pair** button
  2. Copy the generated key (it looks like: `BKxxx...xxx`)

### Step 5: Update Your .env File
1. Open your `.env` file in the project root
2. Find the line: `NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key`
3. Replace `your-vapid-key` with your actual VAPID key
4. Save the file

**Example:**
```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ✅ Verify Your Configuration

After updating the VAPID key, verify all Firebase credentials are correct:

```env
# Firebase Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDsJgwFuOjgg4QFox6xw8Gg4rs5oub4ZD8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-a269f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-a269f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-a269f.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=748268440394
NEXT_PUBLIC_FIREBASE_APP_ID=1:748268440394:web:c659dbece00a2501c28fb3
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-K62ZKF65CX

# Firebase Admin SDK (Private)
FIREBASE_PROJECT_ID=talio-a269f
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@talio-a269f.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# VAPID Key (Required for Web Push)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BKxxx...xxx  # ⚠️ REPLACE THIS!
```

---

## 🔄 Restart Your Application

After updating the `.env` file:

1. **Stop the development server** (Ctrl+C)
2. **Restart the server:**
   ```bash
   npm run dev
   ```

---

## 🧪 Test Push Notifications

1. **Login to your app**
2. **Allow notification permissions** when prompted
3. **Send a test notification** (e.g., send a chat message)
4. **Close or minimize the browser**
5. **You should receive a notification!**

---

## 🐛 Troubleshooting

### Issue: "VAPID key not configured"
- Make sure you copied the entire key (starts with `BK`)
- Ensure there are no extra spaces or quotes
- Restart the dev server after updating

### Issue: "Permission denied"
- Clear browser cache and cookies
- Try in incognito/private mode
- Check browser notification settings

### Issue: "Service worker not registered"
- Check browser console for errors
- Ensure `firebase-messaging-sw.js` is in the `public` folder
- Try unregistering old service workers in DevTools → Application → Service Workers

---

## 📱 Platform Support

✅ **Supported:**
- Chrome (Desktop & Android)
- Firefox (Desktop & Android)
- Edge (Desktop)
- Safari (macOS 16.4+, iOS 16.4+)
- Opera (Desktop & Android)

❌ **Not Supported:**
- iOS Safari (below 16.4)
- Some older browsers

---

## 🎉 You're All Set!

Once configured, your push notifications will work like WhatsApp:
- ✅ Notifications when app is closed
- ✅ Notifications when app is in background
- ✅ Click to open specific page
- ✅ Sound and vibration
- ✅ Action buttons (Open/Dismiss)

Need help? Check the Firebase documentation: https://firebase.google.com/docs/cloud-messaging/js/client

