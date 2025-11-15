# 🔔 Push Notification Setup - Complete Guide

## ✅ What's Been Configured

### **1. Welcome Notification on First Enable**
When a user enables push notifications for the first time, they receive:
```
🎉 Welcome to Talio!
Hi [Name]! You'll now receive important updates and notifications.
```

### **2. Login Notification**
Every time a user logs in, they receive a personalized greeting:
```
🌅 Good Morning, [Name]!
Welcome back to Talio! You've successfully logged in.
```

**Time-based greetings:**
- 🌅 **Morning** (12 AM - 12 PM): "Good Morning"
- ☀️ **Afternoon** (12 PM - 5 PM): "Good Afternoon"  
- 🌙 **Evening** (5 PM - 12 AM): "Good Evening"

### **3. Domain Configuration**
- ✅ **Production URL**: `https://app.talio.in`
- ✅ **Manifest theme color**: `#192A5A` (bottom nav color)
- ✅ **App ID**: `in.talio.app`

---

## 🚀 How It Works

### **User Flow:**

1. **User opens app** → Firebase initializes
2. **User logs in** → Receives login notification
3. **User enables notifications** (first time) → Receives welcome notification
4. **User logs in again** → Receives login notification

### **Notification Types:**

| Event | Title | Body | Icon |
|-------|-------|------|------|
| **Welcome** | 🎉 Welcome to Talio! | Hi [Name]! You'll now receive important updates... | /icon-192x192.png |
| **Login** | 🌅 Good Morning, [Name]! | Welcome back to Talio! You've successfully logged in. | /icon-192x192.png |

---

## 📱 Testing on Mobile

### **Method 1: PWA (Progressive Web App)**

1. Open `https://app.talio.in` in **Chrome on Android**
2. Tap the **menu** (⋮) → **Add to Home screen**
3. Open the installed app
4. Login to your account
5. **Allow notifications** when prompted
6. You should receive:
   - ✅ Welcome notification (first time)
   - ✅ Login notification

### **Method 2: Direct Browser**

1. Open `https://app.talio.in` in **Chrome on Android**
2. Login to your account
3. **Allow notifications** when prompted
4. You should receive notifications

---

## 🔍 Verification Steps

### **1. Check Firebase Initialization**

Open browser console (F12) and look for:
```
[Firebase] Config check: { hasApiKey: true, hasAuthDomain: true, ... }
[Firebase] App initialized successfully
```

### **2. Check FCM Token Registration**

After enabling notifications, check console for:
```
[FirebaseInit] ✅ FCM token obtained
[Firebase] Token saved to backend: {success: true, message: 'FCM token saved successfully'}
```

### **3. Check Welcome Notification**

When you first enable notifications, you should see:
```
[FCM] Welcome notification sent to [your-email]
```

### **4. Check Login Notification**

When you login, you should see:
```
[Push] Notification sent to [your-email]
```

---

## 🐛 Troubleshooting

### **Issue: No notifications received**

**Check 1:** Browser permissions
```
Settings → Site Settings → Notifications → app.talio.in → Allow
```

**Check 2:** FCM token saved
```javascript
// In browser console
localStorage.getItem('fcm_token')
```

**Check 3:** User has FCM tokens in database
```javascript
// Check in MongoDB
db.users.findOne({ email: "your-email" }, { fcmTokens: 1 })
```

### **Issue: Notifications work in browser but not in PWA**

1. **Uninstall PWA** from home screen
2. **Clear browser cache** for app.talio.in
3. **Reinstall PWA**
4. **Login again** and allow notifications

---

## 📝 Files Modified

1. ✅ `app/api/fcm/save-token/route.js` - Added welcome notification
2. ✅ `app/api/auth/login/route.js` - Enhanced login notification
3. ✅ `.env` - Updated domain to `app.talio.in`
4. ✅ `.env.production` - Updated domain to `app.talio.in`
5. ✅ `public/manifest.json` - Updated theme color to `#192A5A`
6. ✅ `public/manifest.json` - Updated app ID to `in.talio.app`

---

## 🎯 Next Steps

### **Deploy to Production:**

```bash
# SSH to your server
ssh root@srv1118054

# Navigate to app directory
cd /root/Tailo

# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f hrms-app | grep -E "(Firebase|FCM|Push)"
```

### **Test on Mobile:**

1. Open `https://app.talio.in` on your Android phone
2. Login with your account
3. Allow notifications when prompted
4. Check if you receive welcome notification
5. Logout and login again
6. Check if you receive login notification

---

## 🎉 Success Indicators

✅ **Welcome notification** received when first enabling notifications  
✅ **Login notification** received every time you login  
✅ **Personalized greetings** based on time of day  
✅ **Theme color** matches bottom nav (`#192A5A`)  
✅ **Domain** is `app.talio.in`  

---

**All set! Your push notifications are ready for production! 🚀**

