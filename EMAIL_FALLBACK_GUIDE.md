# Email Fallback for Failed Push Notifications

## Overview

The system now automatically sends email notifications as a fallback when OneSignal push notifications fail to deliver. This ensures users never miss important notifications.

## How It Works

### Automatic Fallback Flow

1. **Attempt Push Notification**: System tries to send via OneSignal
2. **Detect Failure**: If OneSignal API fails or returns error
3. **Trigger Email Fallback**: Automatically sends email to affected users
4. **Log Status**: Records which delivery method was used

### Email Template

Fallback emails include:
- ✅ Professional HTML template with app branding
- ✅ Notification title and message
- ✅ Action button (if URL provided)
- ✅ Explanation of why email was sent
- ✅ Plain text version for email clients without HTML support

## Configuration

### Required Environment Variables

```env
# Email Server (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Email From Address
EMAIL_FROM_NAME=Talio HRMS
EMAIL_FROM_EMAIL=noreply@yourdomain.com
```

### Enable/Disable Fallback

Email fallback is **enabled by default**. To disable for specific notifications:

```javascript
await sendOneSignalNotification({
  userIds: ['user_id_1', 'user_id_2'],
  title: 'Test Notification',
  message: 'This is a test',
  url: '/dashboard',
  emailFallback: false  // Disable email fallback
})
```

## Updated Functions

### `lib/onesignal.js`

**New parameter**: `emailFallback` (boolean, default: `true`)

```javascript
export async function sendOneSignalNotification({
  userIds,
  title,
  message,
  url = '/dashboard',
  data = {},
  icon = null,
  tags = [],
  emailFallback = true  // NEW: Enable/disable email fallback
})
```

**Return value includes**:
```javascript
{
  success: boolean,
  id: string,
  recipients: number,
  emailFallbackUsed: boolean,  // NEW: Was email fallback used?
  emailFallbackMessage: string  // NEW: Email fallback status message
}
```

### `lib/notificationService.js`

Automatically uses email fallback and logs when it's triggered:

```javascript
// Send via OneSignal (with email fallback enabled by default)
result = await sendOneSignalNotification({
  userIds: validUserIds,
  title,
  message,
  url,
  emailFallback: true
})

// Log if email fallback was used
if (result?.emailFallbackUsed) {
  console.log(`📧 Email fallback used for notification: ${title}`)
}
```

### `lib/pushNotification.js`

Similarly updated with email fallback tracking:

```javascript
const result = await sendOneSignalNotification({
  userIds: [userId],
  title,
  message: body,
  url,
  emailFallback: true
})

if (result?.emailFallbackUsed) {
  console.log(`📧 Email fallback used for ${user.email}`)
}
```

## Database Schema Updates

The `Notification` model now tracks email delivery:

```javascript
deliveryStatus: {
  socketIO: {
    sent: Boolean,
    sentAt: Date
  },
  oneSignal: {
    sent: Boolean,
    sentAt: Date
  },
  email: {
    sent: Boolean,      // NEW: Email fallback used
    sentAt: Date        // NEW: When email was sent
  }
}
```

## Testing

### Test Email Configuration

Check if email is properly configured:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/test-email-fallback
```

### Test Direct Email Sending

Send a test email directly:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "direct",
    "title": "Test Email",
    "message": "This is a test email notification"
  }' \
  http://localhost:3000/api/test-email-fallback
```

### Test Email Fallback via OneSignal

Test the full fallback flow:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "onesignal",
    "title": "Fallback Test",
    "message": "Testing email fallback when push fails"
  }' \
  http://localhost:3000/api/test-email-fallback
```

## Use Cases

### When Email Fallback is Triggered

1. **OneSignal API Down**: API temporarily unavailable
2. **Invalid User IDs**: User not subscribed to OneSignal
3. **Network Errors**: Connection issues with OneSignal
4. **Rate Limiting**: OneSignal rate limits exceeded
5. **Configuration Errors**: Invalid API keys or App ID

### When Email Fallback is NOT Used

1. **OneSignal Success**: Push notification delivered successfully
2. **User Has No Email**: User account missing email address
3. **Email Disabled**: `emailFallback: false` parameter set
4. **Email Not Configured**: SMTP credentials not set in environment

## Logging

### Console Logs

Email fallback activities are logged with 📧 emoji:

```
[OneSignal] Error sending notification: API Error
[OneSignal] Attempting email fallback for failed push notification...
[OneSignal] Email fallback sent to user@example.com
[OneSignal] ✅ Email fallback: 3/3 emails sent
📧 Email fallback used for notification: Task Assignment
```

### Database Tracking

Check notification delivery status in MongoDB:

```javascript
const notification = await Notification.findById(notificationId)
console.log(notification.deliveryStatus)
// {
//   oneSignal: { sent: false, sentAt: null },
//   email: { sent: true, sentAt: 2025-11-21T... }
// }
```

## Production Recommendations

1. ✅ **Configure Email**: Set up SMTP credentials in production environment
2. ✅ **Monitor Fallback Usage**: Track how often email fallback is triggered
3. ✅ **Optimize OneSignal**: Investigate if fallback is used frequently
4. ✅ **User Preference**: Consider adding user settings for email notifications
5. ✅ **Rate Limiting**: Implement email rate limiting if needed

## Example: Sending Notification with Fallback

```javascript
import { sendOneSignalNotification } from '@/lib/onesignal'

// Send notification to multiple users with automatic email fallback
const result = await sendOneSignalNotification({
  userIds: ['user1_id', 'user2_id', 'user3_id'],
  title: '📋 New Task Assigned',
  message: 'You have been assigned to the Q4 Marketing Campaign project',
  url: '/tasks/12345',
  data: {
    type: 'task',
    taskId: '12345',
    priority: 'high'
  },
  emailFallback: true  // Email sent if OneSignal fails
})

// Check result
if (result.success) {
  console.log('✅ Push notification sent successfully')
} else if (result.emailFallbackUsed) {
  console.log('📧 Push failed, but email fallback sent')
} else {
  console.log('❌ Both push and email failed')
}
```

## Troubleshooting

### Email Not Sending

1. Check environment variables are set correctly
2. Verify SMTP credentials are valid
3. Check email server allows connections from your IP
4. Enable debug logging: `NODE_DEBUG=nodemailer`

### Email Goes to Spam

1. Add SPF record to domain DNS
2. Add DKIM signing
3. Use verified sender email
4. Avoid spam trigger words in subject/body

### Email Fallback Not Triggered

1. Verify `emailFallback: true` is set
2. Check OneSignal is actually failing (it might be succeeding)
3. Verify users have email addresses in database
4. Check console logs for email fallback attempts

## Related Files

- `lib/onesignal.js` - OneSignal wrapper with email fallback
- `lib/notificationService.js` - Notification queue service
- `lib/pushNotification.js` - Push notification helper
- `lib/mailer.js` - Email sending service
- `app/api/test-email-fallback/route.js` - Email fallback test endpoint
- `models/Notification.js` - Notification database model

---

**Status**: ✅ Email fallback system is now active and working!
