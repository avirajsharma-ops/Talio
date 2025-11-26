# Quick Test Guide - Firebase Push Notifications in Settings

## Pre-requisites
✅ Firebase service account key configured in `.env.local`
✅ User has FCM token registered (login to web app or mobile app)
✅ Browser notification permissions enabled

## Test 1: Send Immediate Notification

### Steps:
1. Login as **Admin** or **HR** user
2. Navigate to **Settings → Notifications**
3. Fill in the form:
   ```
   Title: Test Push Notification
   Message: This is a test Firebase push notification from settings
   Action URL: /dashboard
   Send To: Specific Users → [Select yourself]
   ```
4. Click **Send Notification**

### Expected Results:
✅ Success toast: "Notification sent to 1 user(s)"
✅ Browser notification appears with title and message
✅ Mobile push notification (if mobile app installed)
✅ Notification badge shows in header
✅ Console logs show:
```
[Firebase] Sending push notification to 1 user(s)
[Firebase] Push notification sent successfully to 1 user(s)
[OneSignal] Notification sent successfully
[Database] Saved 1 notification(s) to database
```

### API Response:
```json
{
  "success": true,
  "message": "Notification sent to 1 user(s)",
  "data": {
    "recipientCount": 1,
    "savedToDatabase": 1,
    "oneSignalSuccess": true,
    "firebasePushSuccess": true,
    "methods": {
      "database": "saved",
      "oneSignal": "sent",
      "firebasePush": "sent"
    }
  }
}
```

---

## Test 2: Send to All Users

### Steps:
1. Navigate to **Settings → Notifications**
2. Fill in:
   ```
   Title: Team Announcement
   Message: Important update for all team members
   Send To: All Users
   ```
3. Click **Send Notification**

### Expected Results:
✅ All users receive notification
✅ Console shows: `[Firebase] Sending push notification to X user(s)`
✅ All users see notification badge
✅ All users receive browser/mobile push

---

## Test 3: Schedule Notification

### Steps:
1. Navigate to **Settings → Notifications**
2. Fill in:
   ```
   Title: Scheduled Test
   Message: This notification was scheduled
   Schedule Type: Scheduled
   Scheduled For: [2 minutes from now]
   Send To: Specific Users → [Select yourself]
   ```
3. Click **Send Notification**
4. Wait for scheduled time

### Expected Results:
✅ Success toast: "Notification scheduled for..."
✅ Wait 2 minutes
✅ Notification appears at scheduled time
✅ Console shows Firebase push was sent
✅ Database shows notification status = 'sent'

**Note:** Scheduled notifications require cron job running:
```bash
# Cron should hit this endpoint every minute:
GET /api/notifications/process?secret=CRON_SECRET
```

---

## Test 4: Department-Specific Notification

### Steps:
1. Navigate to **Settings → Notifications**
2. Fill in:
   ```
   Title: Department Update
   Message: Message for engineering team
   Send To: Specific Department → Engineering
   ```
3. Click **Send Notification**

### Expected Results:
✅ Only Engineering department members receive notification
✅ Console shows correct user count
✅ Firebase push sent to department users only

---

## Debugging

### Check Console Logs:
```javascript
// Expected log sequence
[Notifications] Current user: {...}
[Notifications] Permission check: {...}
[Database] Saved X notification(s) to database
[OneSignal] Sending to X user(s)
[OneSignal] Notification sent successfully
[Firebase] Sending push notification to X user(s)
[Firebase] Push notification sent successfully to X user(s)
```

### Check Network Tab:
1. Open Developer Tools → Network
2. Send notification
3. Look for:
   - `POST /api/notifications/send` → Status 200
   - Response contains `firebasePushSuccess: true`

### Check Database:
```javascript
// In MongoDB, check Notification collection
{
  title: "Test Push Notification",
  message: "...",
  deliveryStatus: {
    fcm: {
      sent: true,
      sentAt: ISODate("...")
    },
    oneSignal: {
      sent: true,
      sentAt: ISODate("...")
    }
  }
}
```

---

## Common Issues

### Issue: No Firebase notifications
**Solution:**
- Check `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`
- Check user has FCM tokens: `db.users.find({ fcmTokens: { $exists: true, $ne: [] } })`
- Check browser notification permissions
- Check Firebase project settings

### Issue: Only OneSignal works
**Solution:**
- This is normal! System has fallback
- Firebase errors are logged but don't block sending
- Check console for Firebase error messages

### Issue: Notification sent but not received
**Solution:**
- Check notification permissions in browser/device
- Try different browser
- Check FCM token is valid
- Re-login to refresh tokens

### Issue: Scheduled notifications not sent
**Solution:**
- Check cron job is running
- Manually trigger: `GET /api/notifications/process?secret=CRON_SECRET`
- Check `scheduledFor` date is in past
- Check notification status in database

---

## Success Indicators

✅ **Immediate notifications:** Both OneSignal and Firebase succeed
✅ **Scheduled notifications:** Sent at correct time via both methods
✅ **Database tracking:** All deliveries logged
✅ **User experience:** Notifications appear on all platforms
✅ **Error handling:** Graceful fallback if one method fails
✅ **Logging:** Clear console logs for debugging

---

## Next Steps

After testing:
1. ✅ Verify production environment variables
2. ✅ Set up cron job for scheduled notifications
3. ✅ Test on mobile devices
4. ✅ Monitor notification delivery rates
5. ✅ Set up notification analytics (optional)

---

## Support

If notifications are not working:
1. Check console logs for errors
2. Verify Firebase configuration
3. Test with single user first
4. Check user has FCM tokens registered
5. Review `FIREBASE_NOTIFICATION_INTEGRATION_COMPLETE.md` for details
