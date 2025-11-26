# 🔥 Firebase Configuration - Talio HRMS

## ✅ Configuration Status: COMPLETE

Your Firebase project is fully configured and ready to use!

---

## 📋 Firebase Project Details

### **Project Information**
- **App Nickname:** Talio
- **Project ID:** talio-e9deb
- **App ID:** 1:241026194465:web:b91d15bf73bcf807ad1760
- **Measurement ID:** G-MMMBE1NGST

### **Firebase Services Enabled**
- ✅ **Firebase Cloud Messaging (FCM)** - Push notifications
- ✅ **Firebase Analytics** - User analytics and event tracking
- ✅ **Firebase Admin SDK** - Backend notification sending

---

## 🔧 Configuration Files

### **1. Environment Variables (`.env.local`)**

All Firebase credentials are configured in your `.env.local` file:

```bash
# Firebase Web SDK Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDEyadwMSwamwG-KeMwzGwZ15UArNdJn-Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-e9deb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-e9deb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-e9deb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=241026194465
NEXT_PUBLIC_FIREBASE_APP_ID=1:241026194465:web:b91d15bf73bcf807ad1760
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-MMMBE1NGST

# Firebase VAPID Key for Web Push
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BLcUfeUd3bFz4TspUxF3sFiZnjBUdXPvvPfFxFYmUoY0PMxdksunlsnoViwiNZNpOufgSXyAoQ0iSh7_qp-BInc

# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID=talio-e9deb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@talio-e9deb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### **2. Firebase Client SDK (`lib/firebase.js`)**

Initializes Firebase for the web app:
- ✅ Firebase App initialization
- ✅ Firebase Cloud Messaging (FCM)
- ✅ Firebase Analytics
- ✅ Token management
- ✅ Foreground message handling

### **3. Firebase Analytics (`lib/firebaseAnalytics.js`)**

NEW! Analytics helper functions:
- ✅ `logAnalyticsEvent()` - Log custom events
- ✅ `setAnalyticsUserId()` - Set user ID
- ✅ `setAnalyticsUserProperties()` - Set user properties
- ✅ Pre-defined HRMS events (login, check-in, task_created, etc.)

### **4. Firebase Admin SDK (`lib/firebaseAdmin.js`)**

Backend Firebase initialization for sending notifications:
- ✅ Service account authentication
- ✅ FCM token management
- ✅ Notification sending

### **5. Service Worker (`public/firebase-messaging-sw.js`)**

Handles background notifications:
- ✅ Background message handling
- ✅ Notification display
- ✅ Click actions
- ✅ Custom notification UI

### **6. Firebase Initialization Component (`components/FirebaseInit.js`)**

Auto-initializes Firebase when user logs in:
- ✅ Requests notification permission
- ✅ Gets FCM token
- ✅ Saves token to backend
- ✅ Sets up foreground message listener

---

## 📱 Features Enabled

### **1. Push Notifications**
- ✅ Web push notifications (desktop & mobile browsers)
- ✅ Background notifications (when app is closed)
- ✅ Foreground notifications (when app is open)
- ✅ Custom notification UI with actions
- ✅ Click-to-navigate functionality

### **2. Analytics Tracking**
- ✅ Page views
- ✅ User authentication events
- ✅ Attendance tracking (check-in/check-out)
- ✅ Task management events
- ✅ Leave request events
- ✅ Performance review events
- ✅ Announcement events
- ✅ Chat events
- ✅ Error tracking

### **3. User Identification**
- ✅ User ID tracking
- ✅ User properties (role, department, etc.)
- ✅ Custom event parameters

---

## 🚀 How to Use

### **Using Firebase Analytics**

```javascript
import { logAnalyticsEvent, AnalyticsEvents, setAnalyticsUserId } from '@/lib/firebaseAnalytics'

// Log a custom event
logAnalyticsEvent(AnalyticsEvents.LOGIN, {
  method: 'email',
  role: 'employee'
})

// Set user ID
setAnalyticsUserId(user._id)

// Log task creation
logAnalyticsEvent(AnalyticsEvents.TASK_CREATED, {
  taskId: task._id,
  priority: task.priority,
  department: task.department
})
```

### **Using Firebase Cloud Messaging**

```javascript
import { requestFCMToken, onForegroundMessage } from '@/lib/firebase'

// Request notification permission and get token
const token = await requestFCMToken()

// Listen for foreground messages
onForegroundMessage((payload) => {
  console.log('Message received:', payload)
  // Show in-app notification
})
```

### **Sending Notifications from Backend**

```javascript
import { sendNotification } from '@/lib/notificationService'

await sendNotification({
  userId: user._id,
  title: 'New Task Assigned',
  body: 'You have been assigned a new task',
  data: {
    type: 'task',
    taskId: task._id,
    click_action: '/dashboard/tasks'
  }
})
```

---

## 📊 Analytics Events Available

### **Authentication**
- `login` - User login
- `logout` - User logout
- `sign_up` - New user registration

### **Attendance**
- `check_in` - Employee check-in
- `check_out` - Employee check-out

### **Tasks**
- `task_created` - New task created
- `task_completed` - Task marked complete
- `task_updated` - Task updated

### **Leave Management**
- `leave_requested` - Leave request submitted
- `leave_approved` - Leave request approved
- `leave_rejected` - Leave request rejected

### **Performance**
- `review_created` - Performance review created
- `review_submitted` - Performance review submitted

### **Communication**
- `announcement_created` - New announcement
- `announcement_viewed` - Announcement viewed
- `message_sent` - Chat message sent
- `chat_opened` - Chat conversation opened

### **Notifications**
- `notification_received` - Push notification received
- `notification_clicked` - Notification clicked

### **Profile**
- `profile_updated` - User profile updated
- `password_changed` - Password changed

### **General**
- `page_view` - Page navigation
- `search` - Search performed
- `error_occurred` - Error encountered

---

## 🔐 Security Notes

### **API Keys**
- ✅ Firebase API keys are safe to expose in client-side code
- ✅ They are restricted by domain in Firebase Console
- ✅ Only authorized domains can use these keys

### **Service Account**
- ⚠️ **NEVER** commit the private key to version control
- ✅ Store in `.env.local` (already in `.gitignore`)
- ✅ Use environment variables in production

### **VAPID Key**
- ✅ Public key is safe to expose
- ✅ Used for web push notifications
- ✅ Configured in Firebase Console

---

## 🌐 Production Deployment

### **Vercel/Netlify**
Add these environment variables in your hosting platform:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDEyadwMSwamwG-KeMwzGwZ15UArNdJn-Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-e9deb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-e9deb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-e9deb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=241026194465
NEXT_PUBLIC_FIREBASE_APP_ID=1:241026194465:web:b91d15bf73bcf807ad1760
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-MMMBE1NGST
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BLcUfeUd3bFz4TspUxF3sFiZnjBUdXPvvPfFxFYmUoY0PMxdksunlsnoViwiNZNpOufgSXyAoQ0iSh7_qp-BInc
FIREBASE_PROJECT_ID=talio-e9deb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@talio-e9deb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### **Domain Authorization**
Add your production domain to Firebase Console:
1. Go to Firebase Console → Project Settings
2. Scroll to "Authorized domains"
3. Add your production domain (e.g., `talio.vercel.app`)

---

## ✅ Testing

### **Test Push Notifications**
1. Open the app in a browser
2. Allow notification permission when prompted
3. Check browser console for FCM token
4. Send a test notification from Firebase Console

### **Test Analytics**
1. Open Firebase Console → Analytics → DebugView
2. Enable debug mode: `?debug_mode=true` in URL
3. Perform actions in the app
4. See events in real-time in DebugView

---

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Analytics](https://firebase.google.com/docs/analytics)
- [Firebase Console](https://console.firebase.google.com/project/talio-e9deb)

---

## 🎉 Summary

Your Talio HRMS application is now fully configured with:
- ✅ Firebase Cloud Messaging for push notifications
- ✅ Firebase Analytics for user tracking
- ✅ Firebase Admin SDK for backend operations
- ✅ Service Worker for background notifications
- ✅ Auto-initialization on user login
- ✅ Comprehensive analytics events
- ✅ Production-ready configuration

**Everything is ready to use!** 🚀

