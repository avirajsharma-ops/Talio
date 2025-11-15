# 🧪 Push Notification Testing Guide

## ✅ What's Ready to Test

Your Firebase push notifications are now **fully integrated** and ready to test! Here's what happens:

### 🎯 **Login Flow with Push Notification**

```
1. User logs in
   ↓
2. Backend sends welcome push notification
   ↓
3. User receives notification with greeting:
   "👋 Welcome to Talio HRMS!"
   "Good Morning/Afternoon/Evening [Name]! You've successfully logged in."
```

---

## 🚀 **Step-by-Step Testing Instructions**

### **Step 1: Start Your Development Server**

```bash
npm run dev
```

### **Step 2: Open the App in Browser**

Open your browser and go to:
```
http://localhost:3000/login
```

**Important:** Use **Chrome**, **Edge**, or **Firefox** (Safari has limited push notification support)

### **Step 3: Login to Your Account**

Login with your credentials. After successful login, you'll be redirected to the dashboard.

### **Step 4: Grant Notification Permission**

After **5 seconds** on the dashboard, you'll see a **permission banner** in the bottom-right corner:

```
┌─────────────────────────────────────────┐
│ 🔔 Enable Push Notifications            │
│                                          │
│ Stay updated with real-time             │
│ notifications for tasks, attendance,    │
│ and more.                                │
│                                          │
│  [Enable]  [Not Now]                    │
└─────────────────────────────────────────┘
```

**Click "Enable"** → Browser will ask for permission → **Click "Allow"**

### **Step 5: Test the Login Notification**

Now that permission is granted, let's test the login notification:

1. **Logout** from the app
2. **Login again**
3. **You should receive a push notification!** 🎉

---

## 📱 **What You Should See**

### **Scenario 1: App is Open (Foreground)**

When you login while the app is open in a tab:

- ✅ A **toast notification** appears in the top-right corner
- ✅ Shows: "👋 Welcome to Talio HRMS!"
- ✅ Shows: "Good Morning/Afternoon/Evening [Your Name]! You've successfully logged in."
- ✅ Has a "View" button to go to dashboard

### **Scenario 2: App is Closed/Tab is Closed (Background)**

When you login from another device or browser:

- ✅ A **browser notification** appears (even if tab is closed!)
- ✅ Shows the same welcome message
- ✅ Clicking it opens the app to the dashboard

---

## 🔍 **Debugging: If Notifications Don't Work**

### **Check 1: Browser Console**

Open browser console (F12) and look for these logs:

```
✅ Good signs:
[Push] Initializing push notifications...
[Push] FCM token obtained: [token]
[Push] Token saved to backend successfully

❌ Bad signs:
[Push] Failed to obtain FCM token
[Push] No FCM tokens found for user
```

### **Check 2: Notification Permission**

Check if permission was granted:

1. Click the **lock icon** in the address bar
2. Look for "Notifications" → Should be "Allow"
3. If "Block", change to "Allow" and refresh

### **Check 3: Environment Variables**

Make sure you added all Firebase environment variables to `.env.local`:

```bash
# Check if variables are set
cat .env.local | grep FIREBASE
```

You should see all these variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### **Check 4: Company Settings**

Make sure push notifications are enabled in Settings:

1. Go to **Settings → Notifications**
2. Check that **"Enable push notifications"** toggle is ON
3. Check that **"Login"** event toggle is ON

---

## 🎛️ **Admin Controls**

As an admin, you can control which events send push notifications:

1. Go to **Settings → Notifications**
2. You'll see two sections:
   - **Email Notifications** (already working)
   - **Push Notifications** (newly added)

3. Toggle individual events:
   - ✅ Login
   - ✅ Attendance Clock In
   - ✅ Attendance Clock Out
   - ✅ Task Assigned
   - ✅ Task Completed
   - ✅ Leave Applied
   - ✅ Leave Approved
   - ✅ Leave Rejected
   - ✅ Announcements

---

## 🧪 **Advanced Testing**

### **Test with Multiple Devices**

1. Login on **Device A** (e.g., your laptop)
2. Grant notification permission
3. Login on **Device B** (e.g., your phone)
4. **Device A** should receive a notification!

### **Test Foreground vs Background**

**Foreground Test:**
1. Keep app open in a tab
2. Login from another browser/device
3. Should see **toast notification** in the app

**Background Test:**
1. Close the app tab (or minimize browser)
2. Login from another browser/device
3. Should see **browser notification** (system notification)

---

## 📊 **Expected Results**

| Action | Expected Result |
|--------|----------------|
| First login after granting permission | ✅ No notification (permission just granted) |
| Second login | ✅ Welcome notification received |
| Login with app open | ✅ Toast notification in app |
| Login with app closed | ✅ Browser notification |
| Click notification | ✅ Opens app to dashboard |
| Disable login notifications in settings | ✅ No more login notifications |
| Re-enable login notifications | ✅ Notifications work again |

---

## 🎉 **Success Criteria**

You'll know it's working when:

- ✅ Permission banner appears after login
- ✅ Permission can be granted
- ✅ FCM token is saved to database
- ✅ Login triggers a welcome notification
- ✅ Notification appears in browser
- ✅ Clicking notification opens the app
- ✅ Admin can toggle notifications on/off

---

## 📝 **Next Steps After Testing**

Once login notifications work, you can easily add push notifications to other features:

1. **Task Assigned** - Notify when a task is assigned
2. **Leave Approved** - Notify when leave is approved
3. **Attendance Reminder** - Remind to clock in/out
4. **Announcements** - Notify about company announcements

Just use the helper function:

```javascript
import { sendPushToUser } from '@/lib/pushNotification'

await sendPushToUser(userId, {
  title: 'Your Title',
  body: 'Your Message',
}, {
  eventType: 'taskAssigned', // or any event type
  clickAction: '/dashboard/tasks',
})
```

---

**🎊 Happy Testing! Let me know if you see the welcome notification!**

