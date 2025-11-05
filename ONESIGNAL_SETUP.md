# OneSignal Push Notifications Setup Guide

This guide explains how to configure and use OneSignal push notifications in Talio HRMS.

## 🎯 What is OneSignal?

OneSignal is a powerful push notification service that provides:
- ✅ **Free tier** for up to 10,000 subscribers
- ✅ **Better delivery rates** than self-hosted solutions
- ✅ **Analytics and tracking** for notification performance
- ✅ **Multi-platform support** (Web, iOS, Android)
- ✅ **Advanced segmentation** and targeting
- ✅ **No infrastructure management** required

## 📋 Prerequisites

You already have:
- ✅ OneSignal App ID: `f7b9d1a1-5095-4be8-8a74-2af13058e7b2`
- ✅ Safari Web ID: `web.onesignal.auto.42873e37-42b9-4e5d-9423-af83e9e44ff4`

## 🔑 Get Your REST API Key

1. **Login to OneSignal Dashboard**
   - Go to: https://app.onesignal.com
   - Login with your account

2. **Navigate to Settings**
   - Click on your app: "Talio HRMS" (or your app name)
   - Go to **Settings** → **Keys & IDs**

3. **Copy REST API Key**
   - Find the **REST API Key** section
   - Copy the key (it looks like: `YourRestApiKeyHere`)

4. **Update Environment Variables**
   
   **For Development (.env.local):**
   ```bash
   ONESIGNAL_APP_ID=f7b9d1a1-5095-4be8-8a74-2af13058e7b2
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

   **For Production (.env.production):**
   ```bash
   ONESIGNAL_APP_ID=f7b9d1a1-5095-4be8-8a74-2af13058e7b2
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

## 🚀 How It Works

### 1. **Client-Side Initialization**

The OneSignal SDK is automatically initialized when users visit your app:

- **Component**: `components/OneSignalInit.js`
- **Loaded in**: `app/layout.js`
- **Service Worker**: `public/OneSignalSDKWorker.js`

### 2. **User Login & Identification**

When a user logs in, they are automatically identified in OneSignal:

```javascript
// Automatically done in OneSignalInit.js
await OneSignal.login(userId)
```

This allows you to send targeted notifications to specific users.

### 3. **Sending Notifications**

Notifications are sent from your backend using the existing notification functions:

```javascript
import { sendPushNotification } from '@/lib/pushNotifications'

// Send notification to specific users
await sendPushNotification({
  userIds: ['user123', 'user456'],
  title: 'New Message',
  body: 'You have a new message from John',
  url: '/dashboard/chat',
  data: {
    type: 'chat',
    chatId: 'chat123'
  }
})
```

## 📱 Notification Types Supported

All your existing notification types work automatically with OneSignal:

### 1. **Chat Messages**
```javascript
import { sendChatMessageNotification } from '@/lib/pushNotifications'

await sendChatMessageNotification(message, recipientIds, senderName, token)
```

### 2. **Task Assignments**
```javascript
import { sendTaskAssignmentNotification } from '@/lib/pushNotifications'

await sendTaskAssignmentNotification(task, assignedUsers, adminToken)
```

### 3. **Leave Approvals**
```javascript
import { sendLeaveStatusNotification } from '@/lib/pushNotifications'

await sendLeaveStatusNotification(leave, 'approved', adminToken)
```

### 4. **Announcements**
```javascript
import { sendAnnouncementNotification } from '@/lib/pushNotifications'

await sendAnnouncementNotification(announcement, userIds, adminToken)
```

### 5. **Payroll Notifications**
```javascript
import { sendPayrollNotification } from '@/lib/pushNotifications'

await sendPayrollNotification(payroll, userId, adminToken)
```

### 6. **Performance Reviews**
```javascript
import { sendPerformanceReviewNotification } from '@/lib/pushNotifications'

await sendPerformanceReviewNotification(review, userId, adminToken)
```

### 7. **Expense Approvals**
```javascript
import { sendExpenseStatusNotification } from '@/lib/pushNotifications'

await sendExpenseStatusNotification(expense, 'approved', adminToken)
```

### 8. **Health Score Alerts**
```javascript
import { sendHealthScoreAlertNotification } from '@/lib/pushNotifications'

await sendHealthScoreAlertNotification(healthScore, userId, adminToken)
```

## 🎨 Custom Notifications

You can also send custom notifications using the OneSignal API directly:

```javascript
import { sendOneSignalNotification } from '@/lib/onesignal'

await sendOneSignalNotification({
  userIds: ['user123'],
  title: 'Custom Notification',
  message: 'This is a custom message',
  url: '/dashboard/custom',
  data: {
    customField: 'customValue'
  },
  icon: 'https://your-domain.com/custom-icon.png'
})
```

## 📊 Broadcast Notifications

Send to all users:

```javascript
import { sendOneSignalBroadcast } from '@/lib/onesignal'

await sendOneSignalBroadcast({
  title: 'System Announcement',
  message: 'The system will be under maintenance tonight',
  url: '/dashboard/announcements',
  segments: ['All'] // or ['Active Users', 'Subscribed Users']
})
```

## 🔧 Advanced Features

### 1. **User Segmentation**

Tag users for targeted notifications:

```javascript
// In your login flow or user profile update
if (window.OneSignal) {
  await window.OneSignal.User.addTags({
    department: 'Engineering',
    role: 'manager',
    location: 'New York'
  })
}
```

Then send to specific segments:

```javascript
import { sendOneSignalWithFilters } from '@/lib/onesignal'

await sendOneSignalWithFilters({
  title: 'Department Meeting',
  message: 'Engineering team meeting at 3 PM',
  filters: [
    { field: 'tag', key: 'department', relation: '=', value: 'Engineering' }
  ],
  url: '/dashboard/meetings'
})
```

### 2. **Notification Click Handling**

Notifications automatically navigate to the specified URL when clicked. This is handled in `components/OneSignalInit.js`:

```javascript
OneSignal.Notifications.addEventListener('click', (event) => {
  const data = event.notification.additionalData
  if (data && data.url) {
    router.push(data.url)
  }
})
```

### 3. **Permission Management**

Request notification permission:

```javascript
import { useOneSignalPermission } from '@/components/OneSignalInit'

function MyComponent() {
  const { requestPermission, getPermission, isOptedIn } = useOneSignalPermission()
  
  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      console.log('Notifications enabled!')
    }
  }
  
  return (
    <button onClick={handleEnableNotifications}>
      Enable Notifications
    </button>
  )
}
```

## 🧪 Testing Notifications

### 1. **Test from OneSignal Dashboard**

1. Go to OneSignal Dashboard
2. Click **Messages** → **New Push**
3. Select **Send to Test Users**
4. Enter your user ID (from localStorage: `userId`)
5. Send test notification

### 2. **Test from Your App**

Create a test API endpoint or use the existing notification functions:

```javascript
// In your API route or server action
import { sendPushNotification } from '@/lib/pushNotifications'

await sendPushNotification({
  userIds: ['your-user-id'],
  title: 'Test Notification',
  body: 'This is a test notification',
  url: '/dashboard'
})
```

## 📈 Analytics & Monitoring

View notification analytics in OneSignal Dashboard:

1. **Delivery Reports**
   - Go to **Messages** → **Delivery**
   - See sent, delivered, clicked rates

2. **User Insights**
   - Go to **Audience** → **All Users**
   - See subscribed users, devices, tags

3. **Performance Metrics**
   - Click-through rates
   - Delivery success rates
   - User engagement

## 🔒 Security Best Practices

1. **Never expose REST API Key in client-side code**
   - ✅ Only use in server-side code
   - ✅ Store in environment variables
   - ❌ Never commit to Git

2. **Validate user permissions**
   - Always verify user authentication before sending notifications
   - Check user roles and permissions

3. **Rate limiting**
   - Implement rate limiting for notification sending
   - Prevent spam and abuse

## 🐛 Troubleshooting

### Notifications not appearing?

1. **Check browser permissions**
   ```javascript
   const permission = await window.OneSignal.Notifications.permission
   console.log('Permission:', permission)
   ```

2. **Check subscription status**
   ```javascript
   const isOptedIn = await window.OneSignal.User.PushSubscription.optedIn
   console.log('Opted in:', isOptedIn)
   ```

3. **Check user ID**
   ```javascript
   const externalId = await window.OneSignal.User.getExternalId()
   console.log('External ID:', externalId)
   ```

4. **Check REST API Key**
   - Make sure it's set in environment variables
   - Verify it's correct in OneSignal dashboard

### Service Worker issues?

1. **Check service worker registration**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     console.log('Service Workers:', registrations)
   })
   ```

2. **Clear service workers** (for testing)
   - Open DevTools → Application → Service Workers
   - Click "Unregister" for all workers
   - Refresh the page

## 📚 Additional Resources

- **OneSignal Documentation**: https://documentation.onesignal.com/docs
- **OneSignal Dashboard**: https://app.onesignal.com
- **Web Push Guide**: https://documentation.onesignal.com/docs/web-push-quickstart
- **REST API Reference**: https://documentation.onesignal.com/reference/create-notification

## ✅ Integration Checklist

- [x] OneSignal SDK installed
- [x] OneSignalInit component created
- [x] Service worker configured
- [x] Environment variables documented
- [x] Notification utilities updated
- [x] API routes created
- [ ] **Get REST API Key from OneSignal Dashboard**
- [ ] **Update .env.local with REST API Key**
- [ ] **Update .env.production with REST API Key**
- [ ] **Test notifications in development**
- [ ] **Deploy to production**
- [ ] **Test notifications in production**

## 🎉 You're All Set!

Once you add your REST API Key to the environment variables, all notifications will automatically be sent via OneSignal with better delivery rates and analytics!

**Next Steps:**
1. Get your REST API Key from OneSignal Dashboard
2. Add it to `.env.local` and `.env.production`
3. Restart your development server
4. Test notifications!

