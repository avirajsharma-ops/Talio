# Notification Management System Guide

## Overview

The Talio HRMS now includes a comprehensive notification management system that allows administrators, HR personnel, and department heads to send, schedule, and manage push notifications to employees.

## Features

### 1. **Instant Notifications**
- Send notifications immediately to selected users
- Target by:
  - All users
  - Specific department
  - Specific roles (admin, hr, manager, employee, department_head)
  - Specific users

### 2. **Scheduled Notifications**
- Schedule notifications to be sent at a specific date and time
- Set timezone for accurate delivery
- Cancel scheduled notifications before they are sent
- View all pending scheduled notifications

### 3. **Recurring Notifications**
- Set up notifications that repeat on a schedule
- Frequency options:
  - **Daily**: Send at a specific time every day
  - **Weekly**: Send on specific days of the week at a specific time
  - **Monthly**: Send on a specific day of the month at a specific time
  - **Custom**: Send on specific days at specific times
- Set start and end dates for recurring notifications
- Pause/resume recurring notifications
- View statistics (total sent, success rate, etc.)

### 4. **Automatic Notifications**
- **New Policies**: Automatically sent when a new policy is published
- **Policy Updates**: Sent when an existing policy is updated
- **New Announcements**: Sent when a new announcement is created
- **Announcement Updates**: Sent when an announcement is updated
- **Leave Approvals**: Sent when leave requests are approved/rejected
- **Task Assignments**: Sent when tasks are assigned
- **Chat Messages**: Sent for new chat messages

## Access Control

### Admin
- Can send notifications to all users
- Can target any department
- Can view and manage all scheduled/recurring notifications

### HR
- Can send notifications to all users
- Can target any department
- Can view notifications for their department

### Department Head
- Can ONLY send notifications to users in their department
- Cannot target other departments
- Can only view/manage their own scheduled/recurring notifications

## How to Use

### Accessing the Notification Dashboard

1. Navigate to **Settings** from the sidebar
2. Click on the **Notifications** tab
3. You'll see four tabs:
   - **Send Notification**: Send instant or scheduled notifications
   - **Scheduled**: View and manage scheduled notifications
   - **Recurring**: Create and manage recurring notifications
   - **History**: View all sent notifications

### Sending an Instant Notification

1. Go to the **Send Notification** tab
2. Fill in the notification details:
   - **Title**: Short, attention-grabbing title (e.g., "Team Meeting")
   - **Message**: Detailed message content
   - **Action URL**: Where users should be redirected when they click the notification (default: /dashboard)
3. Select target audience:
   - **All Users**: Send to everyone
   - **Specific Department**: Choose a department from the dropdown
   - **Specific Role**: Select one or more roles
   - **Specific Users**: Choose individual users
4. Click **Send Notification**

### Scheduling a Notification

1. Go to the **Send Notification** tab
2. Fill in the notification details (same as instant notification)
3. Select **Schedule for Later** option
4. Choose the date and time
5. Click **Schedule Notification**
6. The notification will be sent automatically at the scheduled time

### Creating a Recurring Notification

1. Go to the **Recurring** tab
2. Click **Create Recurring Notification**
3. Fill in the notification details
4. Select frequency:
   - **Daily**: Choose the time (e.g., 09:00 AM)
   - **Weekly**: Select days (e.g., Monday, Wednesday, Friday) and time
   - **Monthly**: Choose day of month (e.g., 1st) and time
   - **Custom**: Select specific days and multiple times
5. Set start date (when to begin sending)
6. Optionally set end date (when to stop sending)
7. Click **Create**

### Managing Scheduled Notifications

1. Go to the **Scheduled** tab
2. View all pending scheduled notifications
3. Click **Cancel** to cancel a scheduled notification before it's sent
4. View status: Pending, Sent, Failed, or Cancelled

### Managing Recurring Notifications

1. Go to the **Recurring** tab
2. View all recurring notifications
3. Actions available:
   - **Pause**: Temporarily stop sending (can be resumed later)
   - **Resume**: Restart a paused recurring notification
   - **Edit**: Modify the notification content or schedule
   - **Delete**: Permanently remove the recurring notification
4. View statistics:
   - Total sent
   - Success count
   - Failure count
   - Last sent time
   - Next scheduled time

## Technical Setup

### Environment Variables

Add these to your `.env.local` and `.env.production`:

```bash
# OneSignal Configuration
ONESIGNAL_APP_ID=f7b9d1a1-5095-4be8-8a74-2af13058e7b2
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key

# Cron Job Secret (for processing scheduled/recurring notifications)
CRON_SECRET=your-random-secret-key-here
```

### Cron Job Setup

The system uses a cron job to process scheduled and recurring notifications. The cron job runs every minute and checks for:
- Scheduled notifications that are due to be sent
- Recurring notifications that need to be sent based on their schedule

#### Vercel Deployment

If deploying to Vercel, the `vercel.json` file is already configured with a cron job:

```json
{
  "crons": [
    {
      "path": "/api/notifications/process?secret=YOUR_CRON_SECRET_HERE",
      "schedule": "* * * * *"
    }
  ]
}
```

**Important**: Replace `YOUR_CRON_SECRET_HERE` with your actual `CRON_SECRET` value from `.env.production`.

#### Other Hosting Platforms

If not using Vercel, set up a cron job to call this endpoint every minute:

```bash
curl "https://your-domain.com/api/notifications/process?secret=YOUR_CRON_SECRET"
```

You can use services like:
- **cron-job.org**: Free cron job service
- **GitHub Actions**: Set up a workflow to run every minute
- **Server cron**: If you have server access, add to crontab

Example crontab entry:
```bash
* * * * * curl "https://your-domain.com/api/notifications/process?secret=YOUR_CRON_SECRET"
```

## API Endpoints

### Send Notification
```
POST /api/notifications/send
```

**Request Body:**
```json
{
  "title": "Meeting Reminder",
  "message": "Team meeting at 3 PM today",
  "url": "/dashboard",
  "targetType": "department",
  "targetDepartment": "department_id",
  "scheduleType": "now"
}
```

### Get Scheduled Notifications
```
GET /api/notifications/scheduled
```

### Cancel Scheduled Notification
```
DELETE /api/notifications/scheduled?id=notification_id
```

### Create Recurring Notification
```
POST /api/notifications/recurring
```

**Request Body:**
```json
{
  "title": "Daily Standup Reminder",
  "message": "Don't forget the daily standup at 9 AM",
  "url": "/dashboard",
  "targetType": "all",
  "frequency": "daily",
  "dailyTime": "09:00",
  "startDate": "2024-01-01T00:00:00Z"
}
```

### Get Recurring Notifications
```
GET /api/notifications/recurring
```

### Update Recurring Notification
```
PUT /api/notifications/recurring?id=notification_id
```

### Delete Recurring Notification
```
DELETE /api/notifications/recurring?id=notification_id
```

## Best Practices

1. **Be Specific**: Use clear, concise titles and messages
2. **Target Appropriately**: Only send to users who need the information
3. **Timing Matters**: Schedule notifications for appropriate times (avoid late night/early morning)
4. **Test First**: Send to yourself or a small group before broadcasting to all users
5. **Monitor**: Check the history tab to see delivery success rates
6. **Clean Up**: Delete or pause recurring notifications that are no longer needed

## Troubleshooting

### Notifications Not Sending
1. Check that `ONESIGNAL_REST_API_KEY` is set correctly
2. Verify users have granted notification permissions
3. Check the notification history for error messages

### Scheduled Notifications Not Sending
1. Verify the cron job is running (check `/api/notifications/process`)
2. Ensure `CRON_SECRET` is set correctly
3. Check server logs for errors

### Department Heads Can't Send to Other Departments
This is by design for security. Department heads can only send to their own department.

## Support

For issues or questions, contact your system administrator or refer to the main HRMS documentation.

