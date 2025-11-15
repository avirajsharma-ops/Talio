# 🔔 Firebase Push Notifications Setup Guide

## ✅ What Has Been Implemented

I've successfully integrated **Firebase Cloud Messaging (FCM)** for web push notifications in your Talio HRMS application. Here's what's been set up:

### 📦 Installed Packages
- `firebase` - Firebase Client SDK
- `firebase-admin` - Firebase Admin SDK for backend

### 📁 Files Created/Modified

#### **Backend Files:**
1. **`lib/firebase-admin.js`** - Firebase Admin SDK initialization
   - Send push notifications to single device
   - Send push notifications to multiple devices
   - Send notifications to topics

2. **`lib/pushNotification.js`** - Helper functions for sending push notifications
   - `sendPushToUser()` - Send to single user
   - `sendPushToMultipleUsers()` - Send to multiple users
   - Checks company settings before sending

3. **`app/api/notifications/register-token/route.js`** - API endpoint
   - POST: Register/update FCM token for a user
   - DELETE: Remove FCM token

4. **`models/CompanySettings.js`** - Updated with push notification settings
   - Added `pushEvents` object with toggles for:
     - login
     - attendanceClockIn
     - attendanceClockOut
     - taskAssigned
     - taskCompleted
     - leaveApplied
     - leaveApproved
     - leaveRejected
     - announcement

5. **`app/api/auth/login/route.js`** - Integrated push notification on login
   - Sends push notification when user logs in
   - Respects company settings

#### **Frontend Files:**
1. **`lib/firebase.js`** - Already existed, Firebase client configuration
   - Request FCM token
   - Listen for foreground messages
   - Save token to backend

2. **`public/firebase-messaging-sw.js`** - Already existed, Service Worker
   - Handles background notifications
   - Shows notifications when app is closed
   - Handles notification clicks

3. **`components/PushNotificationProvider.js`** - NEW React component
   - Requests notification permission
   - Registers FCM token
   - Shows permission banner
   - Handles foreground messages with toast notifications

4. **`.env.example`** - Updated with Firebase configuration template

---

## 🚀 How to Complete the Setup

### Step 1: Add Environment Variables

Your Firebase credentials are already provided. Add them to your `.env.local` file (for development) and to your server environment variables (for production):

```bash

### Step 2: Integrate PushNotificationProvider

Add the `PushNotificationProvider` component to your main layout or dashboard layout:

**Example: `app/dashboard/layout.js`**

```javascript
import PushNotificationProvider from '@/components/PushNotificationProvider'

export default function DashboardLayout({ children }) {
  // Get user ID from your auth context or session
  const userId = 'user-id-here' // Replace with actual user ID
  
  return (
    <PushNotificationProvider userId={userId}>
      {children}
    </PushNotificationProvider>
  )
}
```

### Step 3: Test the Implementation

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Login to the application**
   - You should see a push notification permission banner after 5 seconds
   - Click "Enable" to grant notification permission

3. **Test login notification:**
   - Logout and login again
   - You should receive a push notification saying "Hi [Name], you just logged in to Talio HRMS"

4. **Test foreground notifications:**
   - Keep the app open in a tab
   - Login from another device/browser
   - You should see a toast notification in the current tab

5. **Test background notifications:**
   - Close the app tab
   - Login from another device/browser
   - You should see a browser notification (even when tab is closed)

---

## 🎛️ Admin Controls

Admins can control push notifications from **Settings → Notifications**:

1. **Master Toggle:** Enable/disable all push notifications
2. **Per-Event Toggles:** Control which events trigger push notifications:
   - Login
   - Clock In/Out
   - Task Assigned/Completed
   - Leave Applied/Approved/Rejected
   - Announcements

---

## 📝 Next Steps: Integrate Push Notifications in Other Features

You can now easily add push notifications to other parts of your app. Here are examples:

### Example 1: Task Assigned Notification

```javascript
import { sendPushToUser } from '@/lib/pushNotification'

// When assigning a task
await sendPushToUser(
  assignedUserId,
  {
    title: '📋 New Task Assigned',
    body: `You have been assigned: ${taskTitle}`,
  },
  {
    eventType: 'taskAssigned',
    clickAction: `/dashboard/tasks/${taskId}`,
    data: { taskId, taskTitle },
  }
)
```

### Example 2: Leave Approved Notification

```javascript
await sendPushToUser(
  employeeUserId,
  {
    title: '✅ Leave Approved',
    body: `Your leave request from ${startDate} to ${endDate} has been approved`,
  },
  {
    eventType: 'leaveApproved',
    clickAction: '/dashboard/leave',
    data: { leaveId },
  }
)
```

---

## 🔧 Troubleshooting

### Notifications not working?

1. **Check browser console** for errors
2. **Verify environment variables** are set correctly
3. **Check notification permission** in browser settings
4. **Verify Firebase credentials** are correct
5. **Check company settings** - ensure push notifications are enabled

### Service Worker not registering?

1. Service workers only work on **HTTPS** or **localhost**
2. Check browser console for service worker errors
3. Try unregistering and re-registering the service worker

---

## 📚 Documentation

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)

---

**🎉 Your Firebase Push Notifications are now fully set up and ready to use!**

