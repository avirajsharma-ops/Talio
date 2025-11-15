# 🚀 Push Notification Deployment - app.talio.in

## ✅ What's Ready

### **1. Welcome Notification** 🎉
When users enable notifications for the first time:
```
Title: 🎉 Welcome to Talio!
Body: Hi [Name]! You'll now receive important updates and notifications.
```

### **2. Login Notification** 👋
Every time users login:
```
Title: 🌅 Good Morning, [Name]!
Body: Welcome back to Talio! You've successfully logged in.
```

**Time-based greetings:**
- 🌅 Morning (12 AM - 12 PM)
- ☀️ Afternoon (12 PM - 5 PM)
- 🌙 Evening (5 PM - 12 AM)

### **3. Configuration**
- ✅ Domain: `https://app.talio.in`
- ✅ Theme color: `#192A5A`
- ✅ App ID: `in.talio.app`
- ✅ Firebase project: `talio-e9deb`

---

## 🚀 Deploy to Production

### **Quick Deploy:**
```bash
# SSH to server
ssh root@srv1118054

# Navigate to app
cd /root/Talio

# Pull changes
git pull

# Deploy
docker-compose down && docker-compose up -d --build

# Check logs
docker-compose logs -f hrms-app | grep Firebase
```

### **Expected Output:**
```
[Firebase] App initialized successfully
[Firebase] Messaging initialized successfully
```

---

## 📱 Test on Mobile

### **Method 1: Chrome Browser**
1. Open `https://app.talio.in` on Android Chrome
2. Login to your account
3. Click "Allow" when notification permission is requested
4. ✅ You should receive: **"🎉 Welcome to Talio!"**
5. Logout and login again
6. ✅ You should receive: **"🌅 Good Morning, [Name]!"**

### **Method 2: PWA (Installed App)**
1. Open `https://app.talio.in` in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Open the installed app from home screen
4. Login and allow notifications
5. ✅ Receive welcome notification
6. Logout and login again
7. ✅ Receive login notification

---

## 🔍 Verification

### **1. Browser Console**
Open DevTools (F12) and check for:
```javascript
[Firebase] Config check: { hasApiKey: true, hasAuthDomain: true, ... }
[Firebase] App initialized successfully
[FirebaseInit] ✅ FCM token obtained
[Firebase] Token saved to backend: {success: true}
```

### **2. Server Logs**
```bash
docker-compose logs hrms-app | grep -E "(FCM|Push|Firebase)"
```

Expected:
```
[FCM] New token added for user [user-id]
[FCM] Welcome notification sent to [email]
[Push] Notification sent to [email]
```

### **3. Database Check**
```javascript
// In MongoDB
db.users.findOne({ email: "your-email" }, { fcmTokens: 1 })

// Should show:
{
  fcmTokens: [
    {
      token: "...",
      device: "web",
      createdAt: ISODate("..."),
      lastUsed: ISODate("...")
    }
  ]
}
```

---

## 🐛 Troubleshooting

### **No notifications received?**

**Check 1: Browser Permissions**
```
Chrome → Settings → Site Settings → Notifications → app.talio.in → Allow
```

**Check 2: FCM Token**
```javascript
// In browser console
localStorage.getItem('fcm_token')
// Should return a long token string
```

**Check 3: Server Logs**
```bash
docker-compose logs hrms-app | grep "FCM"
```

**Check 4: Rebuild**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📝 Files Modified

1. ✅ `app/api/fcm/save-token/route.js` - Welcome notification
2. ✅ `app/api/auth/login/route.js` - Login notification
3. ✅ `.env` - Domain updated to `app.talio.in`
4. ✅ `.env.production` - Domain updated to `app.talio.in`
5. ✅ `public/manifest.json` - Theme color `#192A5A`
6. ✅ `lib/firebase.js` - Build-time error handling
7. ✅ `Dockerfile` - Firebase build args
8. ✅ `docker-compose.yml` - Firebase build args

---

## 🎯 Success Checklist

After deployment, verify:

- [ ] Website loads at `https://app.talio.in`
- [ ] Login works correctly
- [ ] Notification permission prompt appears
- [ ] Welcome notification received (first time)
- [ ] Login notification received (every login)
- [ ] PWA can be installed on Android
- [ ] Theme color is `#192A5A` (dark blue)
- [ ] No console errors
- [ ] No server errors

---

## 🎉 You're All Set!

Your push notifications are configured and ready to go! 🚀

**Test it now:**
1. Deploy to production
2. Open `https://app.talio.in` on your phone
3. Login and allow notifications
4. Enjoy your personalized push notifications!

---

**Need help?** Check the logs:
```bash
docker-compose logs -f hrms-app
```

