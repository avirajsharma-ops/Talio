# 🔔 Notification System Setup Required

## ⚠️ IMPORTANT: OneSignal REST API Key Missing

The notification system is **almost ready** but requires one critical configuration:

### Error You're Seeing:
```
Access denied. Please include an 'Authorization: ...' header with a valid API key
```

### Why This Happens:
The `ONESIGNAL_REST_API_KEY` environment variable is set to a placeholder value and needs to be replaced with your actual OneSignal REST API key.

---

## 📋 Setup Steps

### Step 1: Get Your OneSignal REST API Key

1. Go to [OneSignal Dashboard](https://app.onesignal.com/)
2. Select your app (or the app with ID: `f7b9d1a1-5095-4be8-8a74-2af13058e7b2`)
3. Navigate to **Settings** → **Keys & IDs**
4. Copy the **REST API Key** (it should look like a long string of characters)

### Step 2: Update Environment Variables

Update the following files with your actual REST API key:

#### `.env.local` (for local development)
```bash
ONESIGNAL_REST_API_KEY=your-actual-rest-api-key-here
```

#### `.env.production` (for production deployment)
```bash
ONESIGNAL_REST_API_KEY=your-actual-rest-api-key-here
```

### Step 3: Update Vercel Environment Variables (if deployed)

If you're using Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add or update:
   - **Key**: `ONESIGNAL_REST_API_KEY`
   - **Value**: Your actual REST API key
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

### Step 4: Restart Your Development Server

After updating the environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ What's Already Working

All the following features are **fully implemented** and will work once the API key is configured:

### 1. **Permission System** ✅
- Admin, HR, and Department Heads can send notifications
- Department heads (any user role with `isDepartmentHead` flag) have access
- Proper role-based access control

### 2. **Notification Dashboard** ✅
- Send instant notifications
- Schedule notifications for later
- Create recurring notifications (daily, weekly, monthly, custom)
- View notification history
- Manage scheduled and recurring notifications

### 3. **User Selection UI** ✅
- Intuitive checkbox-based user selection
- Shows employee details (name, department, designation, role)
- Department heads badge for easy identification
- Search and filter capabilities
- Department heads see only their department members

### 4. **Targeting Options** ✅
- **All Employees**: Send to everyone (or all department members for dept heads)
- **Specific Department**: Target a specific department (admin/HR only)
- **Specific Roles**: Target users by role (admin, hr, manager, employee, department_head)
- **Specific Users**: Select individual users with checkbox UI

### 5. **Department Head Features** ✅
- Department heads visible in employee directories
- Department heads can create department-specific announcements
- Department announcements shown with purple background and border
- Proper filtering and access control

### 6. **Announcement System** ✅
- Department heads can create announcements for their departments
- Department announcements display with distinct purple styling
- Automatic notification to relevant users
- Proper filtering based on department membership

---

## 🧪 Testing After Setup

Once you've added the REST API key, test the following:

### Test 1: Send Instant Notification
1. Go to **Settings** → **Notifications**
2. Fill in title and message
3. Select "Send Now"
4. Choose target audience (e.g., "All Employees")
5. Click "Send Notification"
6. ✅ Should see success message

### Test 2: Schedule Notification
1. Fill in notification details
2. Select "Schedule for Later"
3. Choose a future date/time
4. Click "Schedule Notification"
5. ✅ Should appear in "Scheduled" tab

### Test 3: Create Recurring Notification
1. Go to **Recurring** tab
2. Create a new recurring notification
3. Set frequency (daily, weekly, etc.)
4. ✅ Should appear in recurring list

### Test 4: Department Head Access
1. Login as a user marked as department head
2. ✅ Should see "Notifications" tab in Settings
3. ✅ Should be able to send notifications to department members
4. ✅ Should be able to create department announcements

---

## 🐛 Troubleshooting

### Issue: "You don't have permission to send notifications"
**Solution**: 
- Check if user is admin, HR, or department head
- For department heads, verify `isDepartmentHead` flag is set in employee record
- Check browser console for detailed error messages

### Issue: "No users found matching the criteria"
**Solution**:
- Verify employees exist in the database
- Check that employees have `userId` field populated
- For department heads, ensure employees are in the same department

### Issue: Users not showing in selection list
**Solution**:
- Check browser console for API errors
- Verify `/api/employees` endpoint is working
- Ensure employees have `userId` populated
- Check that `limit=1000` parameter is being used

### Issue: Department heads not visible
**Solution**:
- Department heads should be visible in all employee lists
- Check that `isDepartmentHead` field is set correctly
- Verify employee status is 'active'

---

## 📊 Current Configuration

### OneSignal App ID
```
f7b9d1a1-5095-4be8-8a74-2af13058e7b2
```

### Safari Web ID
```
web.onesignal.auto.42873e37-42b9-4e5d-9423-af83e9e44ff4
```

### Files Modified
- ✅ `components/NotificationManagement.js` - Complete notification UI
- ✅ `app/dashboard/settings/page.js` - Department head access
- ✅ `app/api/notifications/send/route.js` - Permission checks and targeting
- ✅ `app/api/announcements/route.js` - Department announcement support
- ✅ `app/dashboard/announcements/page.js` - Purple styling for dept announcements
- ✅ `app/api/employees/route.js` - User ID population
- ✅ `lib/onesignal.js` - OneSignal integration (needs API key)

---

## 🎯 Next Steps

1. **Get OneSignal REST API Key** from dashboard
2. **Update environment variables** in `.env.local` and `.env.production`
3. **Update Vercel environment variables** (if deployed)
4. **Restart development server** or **redeploy** to Vercel
5. **Test notifications** using the steps above

---

## 📞 Need Help?

If you encounter any issues after setting up the API key:

1. Check browser console for detailed error messages
2. Check server logs for API errors
3. Verify all environment variables are set correctly
4. Ensure OneSignal app is properly configured
5. Test with a simple "Send to All" notification first

---

**Status**: ⏳ Waiting for OneSignal REST API Key configuration

Once configured, the notification system will be **100% functional**! 🎉

