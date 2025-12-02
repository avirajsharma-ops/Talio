# Scheduled Notifications Cron Setup

## Overview
Scheduled notifications are processed by a cron job that runs periodically to send notifications that are due.

## Environment Variable Required
Add this to your `.env.local` file:
```bash
CRON_SECRET=your-random-cron-secret-key-here
```

Generate a secure random string for production:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Cron Job Configuration

### Option 1: External Cron Service (Recommended for Production)
Use a service like:
- **Cron-job.org** (free, reliable)
- **EasyCron** (free tier available)
- **Uptime Robot** (monitor + cron)

Configure the cron job to call:
```
URL: https://your-domain.com/api/cron/process-scheduled-notifications
Method: GET
Headers: Authorization: Bearer YOUR_CRON_SECRET
Frequency: Every 1-5 minutes
```

### Option 2: Server Crontab (Linux/Ubuntu)

1. Edit crontab:
```bash
crontab -e
```

2. Add this line (runs every minute):
```bash
* * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/process-scheduled-notifications >> /var/log/scheduled-notifications.log 2>&1
```

3. For every 5 minutes:
```bash
*/5 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/process-scheduled-notifications >> /var/log/scheduled-notifications.log 2>&1
```

4. Verify crontab:
```bash
crontab -l
```

### Option 3: Node.js Scheduler (Development Only)
For local development, you can use node-cron:

```javascript
// Add to server.js or create a separate scheduler.js
const cron = require('node-cron')

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const response = await fetch('http://localhost:3000/api/cron/process-scheduled-notifications', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    })
    const data = await response.json()
    console.log('[Scheduler]', data)
  } catch (error) {
    console.error('[Scheduler] Error:', error)
  }
})
```

## Testing

### 1. Test the Cron Endpoint
```bash
# Replace YOUR_CRON_SECRET and YOUR_DOMAIN
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_DOMAIN/api/cron/process-scheduled-notifications
```

Expected response:
```json
{
  "success": true,
  "message": "Processed X notifications, Y failed",
  "data": {
    "total": 5,
    "processed": 4,
    "failed": 1
  }
}
```

### 2. Test Scheduled Notification

1. Go to **Settings → Notification Management**
2. Create a notification:
   - Title: "Test Scheduled Notification"
   - Message: "This should arrive in 5 minutes"
   - Schedule: Select "Schedule for Later"
   - Choose a time 5 minutes from now
   - Target: Select yourself or a test user
3. Click "Schedule Notification"
4. Wait for the cron job to process it
5. Check **History** tab to see if it was sent

## Notification History

The **History** tab shows:
- **Immediate notifications** (sent right away)
- **Scheduled notifications** that have been sent (status: 'sent')

Each history entry includes:
- Title and message
- Sent date/time
- Target audience
- Number of recipients
- Status (sent/failed)

## Troubleshooting

### Scheduled notifications not sending:
1. Check if CRON_SECRET is set in environment
2. Verify cron job is running (check logs)
3. Check API logs for errors
4. Ensure scheduled time is in the past

### History tab empty:
1. Send a test notification
2. Wait a few seconds and refresh
3. Check browser console for errors
4. Verify API endpoint: `/api/notifications/scheduled?status=sent`

### Cron job failing:
1. Verify CRON_SECRET matches in both env and cron job
2. Check server logs: `pm2 logs` or docker logs
3. Test the endpoint manually with curl
4. Ensure MongoDB connection is stable

## Monitoring

### Check Cron Job Status (cron-job.org)
1. Login to cron-job.org
2. View execution history
3. Check success/failure rates
4. Review response logs

### Check Server Logs
```bash
# PM2
pm2 logs --lines 100 | grep -i "cron"

# Docker
docker logs talio-app | grep -i "cron"

# Direct log file (if using crontab)
tail -f /var/log/scheduled-notifications.log
```

### Database Check
```javascript
// In MongoDB shell or Compass
db.schedulednotifications.find({ status: 'pending', scheduledFor: { $lt: new Date() } })
db.schedulednotifications.find({ status: 'sent' }).sort({ sentAt: -1 }).limit(10)
db.schedulednotifications.find({ status: 'failed' })
```

## Security Notes

1. **Never commit CRON_SECRET** to version control
2. Use a **strong random string** for production
3. The cron endpoint is **protected** - requires valid CRON_SECRET
4. Regularly **rotate the secret** in production
5. Monitor for **unauthorized access attempts**

## Performance Considerations

- Cron job runs quickly (processes in seconds)
- Batch processes all due notifications
- No performance impact on main app
- Scales with number of notifications (tested up to 1000+ per run)
- Failed notifications are logged and can be retried

## Recommended Frequencies

- **Production**: Every 1-2 minutes
- **Development**: Every 5 minutes
- **Testing**: Every minute

Adjust based on your notification volume and requirements.
