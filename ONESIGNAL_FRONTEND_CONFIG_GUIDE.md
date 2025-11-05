# 🎉 OneSignal Frontend Configuration - Complete!

## ✅ What's New

You can now configure OneSignal API credentials **directly from the admin panel** without touching environment files!

---

## 🚀 How to Configure OneSignal (Admin Only)

### Step 1: Login as Admin
Make sure you're logged in with an admin account.

### Step 2: Navigate to Notification Settings
1. Go to **Settings** (gear icon in sidebar)
2. Click on **Notifications** tab
3. You'll see a yellow warning banner if OneSignal is not configured

### Step 3: Go to Configuration Tab
1. Click on the **Configuration** tab (only visible to admins)
2. You'll see the OneSignal configuration form

### Step 4: Get Your OneSignal Credentials

#### Get App ID:
1. Go to [OneSignal Dashboard](https://app.onesignal.com/)
2. Select your app (or create a new one)
3. Navigate to **Settings** → **Keys & IDs**
4. Copy the **App ID** (looks like: `f7b9d1a1-5095-4be8-8a74-2af13058e7b2`)

#### Get REST API Key:
1. On the same page (**Settings** → **Keys & IDs**)
2. Find **REST API Key**
3. Copy the key (it's a long string of characters)

### Step 5: Enter Credentials in Admin Panel
1. Paste the **App ID** in the first field
2. Paste the **REST API Key** in the second field
3. Click **Save Configuration**
4. You'll see a success message

### Step 6: Test Configuration (Optional)
1. Click the **Test Configuration** button
2. If successful, you'll see: "Configuration is valid and working!"
3. If it fails, check your credentials and try again

### Step 7: Restart Server (Important!)
For the changes to take full effect, restart your development server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

For production (Vercel), the changes will take effect on the next deployment.

---

## 🎨 Features

### 1. **Visual Status Indicators**
- ✅ **Green Banner**: OneSignal is configured and ready
- ⚠️ **Yellow Banner**: OneSignal not configured (with quick link to config)
- ❌ **Red Warning**: Shows on Send tab when API key is missing

### 2. **Configuration Tab (Admin Only)**
- Secure password field for REST API Key (with show/hide toggle)
- Real-time validation of App ID format (UUID)
- Validation of REST API Key length
- Helpful instructions and links
- Test button to verify credentials

### 3. **Automatic File Updates**
When you save the configuration, the system automatically:
- Updates `.env.local` file
- Updates `.env.production` file
- Updates runtime environment variables
- Saves credentials securely

### 4. **Smart Warnings**
- Warning banner on main notification page if not configured
- Disabled send button until API key is configured
- Clear error messages with actionable steps
- Role-specific messages (admin vs non-admin)

---

## 🔒 Security Features

1. **Admin-Only Access**: Only users with `role: 'admin'` can:
   - View the Configuration tab
   - Update API credentials
   - Test the configuration

2. **Masked Display**: When viewing existing config, the REST API Key is masked:
   - Shows: `abcd1234...xyz9`
   - Hides: Middle characters for security

3. **Password Field**: REST API Key input is a password field by default
   - Click the eye icon to show/hide
   - Prevents shoulder surfing

4. **Validation**: 
   - App ID must be valid UUID format
   - REST API Key must be at least 20 characters
   - Both fields are required

---

## 📋 What Happens Behind the Scenes

### When You Save Configuration:

1. **Validation**: System validates both App ID and REST API Key
2. **File Updates**: Updates both `.env.local` and `.env.production`
3. **Runtime Update**: Updates `process.env` for immediate effect
4. **Persistence**: Changes persist across server restarts
5. **Notification**: Shows success message with restart reminder

### Configuration Storage:

The credentials are stored in:
- `.env.local` (for local development)
- `.env.production` (for production deployment)
- `process.env` (runtime, requires restart for full effect)

---

## 🧪 Testing Your Configuration

### Method 1: Use Test Button
1. Go to **Configuration** tab
2. Click **Test Configuration**
3. System will verify credentials with OneSignal
4. Shows app info if successful (name, player count, etc.)

### Method 2: Send Test Notification
1. Go to **Send Notification** tab
2. Fill in title and message
3. Select "All Employees"
4. Click "Send Notification"
5. Check if notification is received

---

## 🐛 Troubleshooting

### Issue: "Invalid App ID format"
**Solution**: 
- App ID must be a UUID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Copy it exactly from OneSignal dashboard
- Don't include any spaces or extra characters

### Issue: "Invalid REST API Key"
**Solution**:
- Key must be at least 20 characters long
- Copy the entire key from OneSignal
- Make sure you're copying the REST API Key, not the User Auth Key

### Issue: "Configuration test failed"
**Possible Causes**:
- **401/403 Error**: Invalid REST API Key
- **404 Error**: Invalid App ID
- **Network Error**: Check internet connection

**Solution**: Double-check both credentials in OneSignal dashboard

### Issue: "Changes not taking effect"
**Solution**:
- Restart your development server: `npm run dev`
- For production, redeploy to Vercel
- Clear browser cache and reload

### Issue: "Configuration tab not visible"
**Solution**:
- Make sure you're logged in as admin
- Check user role in localStorage: `localStorage.getItem('user')`
- Only `role: 'admin'` can see this tab

---

## 📊 Configuration Status Check

### How to Check if OneSignal is Configured:

1. **Visual Indicator**: 
   - Green banner = Configured ✅
   - Yellow banner = Not configured ⚠️

2. **Send Button**:
   - Enabled = Configured ✅
   - Disabled with tooltip = Not configured ❌

3. **Configuration Tab**:
   - Shows current status at the top
   - Displays masked API key if configured

---

## 🎯 Next Steps After Configuration

Once OneSignal is configured:

1. ✅ **Send Notifications**: All notification features are unlocked
2. ✅ **Schedule Notifications**: Set up future notifications
3. ✅ **Recurring Notifications**: Create repeating notifications
4. ✅ **Department Targeting**: Send to specific departments
5. ✅ **User Selection**: Choose specific users to notify

---

## 📝 Important Notes

### For Development:
- Configuration is saved to `.env.local`
- Restart server after saving for full effect
- Changes persist across restarts

### For Production (Vercel):
- Configuration is saved to `.env.production`
- Redeploy to Vercel for changes to take effect
- Or manually add to Vercel environment variables

### For Team Collaboration:
- `.env.local` is gitignored (not shared)
- Each developer needs to configure locally
- Or share credentials securely via team password manager

---

## 🔄 Updating Configuration

To update existing credentials:

1. Go to **Configuration** tab
2. Enter new App ID or REST API Key
3. Click **Save Configuration**
4. Restart server
5. Test with **Test Configuration** button

---

## ✨ Benefits of Frontend Configuration

1. **No File Editing**: No need to manually edit `.env` files
2. **User-Friendly**: Simple form interface with validation
3. **Instant Feedback**: Real-time validation and testing
4. **Secure**: Admin-only access with masked display
5. **Persistent**: Automatically saves to environment files
6. **Verifiable**: Built-in test functionality

---

## 🎊 You're All Set!

Once configured, your notification system is **fully operational**! 

You can now:
- ✅ Send instant notifications
- ✅ Schedule notifications for later
- ✅ Create recurring notifications
- ✅ Target specific users, departments, or roles
- ✅ View notification history
- ✅ Manage scheduled and recurring notifications

**Happy notifying! 🔔**

