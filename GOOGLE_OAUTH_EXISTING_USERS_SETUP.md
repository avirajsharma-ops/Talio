# 🔐 Google OAuth Setup - Existing Users Only

## ✅ What's Implemented

The Google OAuth login has been configured to **only allow users who already exist in the database**. This means:

- ✅ Users must be created by an admin first (via the admin panel)
- ✅ Google login only works if the email matches an existing user in the database
- ✅ New users cannot self-register via Google
- ✅ Proper error messages for non-existent users
- ✅ User data (name, profile picture, etc.) is loaded from the database

---

## 🔧 Setup Instructions

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Click "Select a project" → "New Project"
   - Name: "Talio HRMS" (or your choice)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Talio HRMS Web Client"

5. **Configure Authorized Redirect URIs**
   
   Add these URLs (replace with your actual domain):
   
   **For Production:**
   ```
   https://app.talio.in/api/auth/google/callback
   ```
   
   **For Local Development:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```

6. **Copy Credentials**
   - After creating, you'll see:
     - **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abc123xyz`)
   - Keep these safe!

---

### Step 2: Add Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**Example:**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
```

---

### Step 3: Deploy and Test

#### For Local Development:

```bash
# Make sure .env has the Google credentials
npm run dev

# Open browser
http://localhost:3000/login

# Click "Sign in with Google"
```

#### For Production (Docker):

```bash
# SSH into server
ssh root@72.61.170.205

# Navigate to project
cd /root/Tailo

# Update .env file
nano .env

# Add these lines:
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Save and exit (Ctrl+X, Y, Enter)

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f hrms-app
```

---

## 🔍 How It Works

### Google Sign-In Flow (Existing Users Only):

```
1. User clicks "Sign in with Google" button
   ↓
2. Frontend redirects to Google OAuth URL
   ↓
3. User authenticates with Google
   ↓
4. Google redirects to /api/auth/google/callback?code=xxx
   ↓
5. Backend exchanges code for access token
   ↓
6. Backend fetches user info from Google (email, name, picture)
   ↓
7. Check if user exists in database by email
   ↓
8. If user NOT found:
   ❌ Redirect to login with error: "No account found with this Google email"
   ↓
9. If user found but inactive:
   ❌ Redirect to login with error: "Your account has been deactivated"
   ↓
10. If user found and active:
   ✅ Generate JWT token
   ✅ Set authentication cookies
   ✅ Redirect to /dashboard
```

---

## 📋 Files Modified

### Updated Files:
- ✅ `app/api/auth/google/callback/route.js` - Removed auto-registration, only allows existing users
- ✅ `app/login/page.js` - Added error message for non-existent users
- ✅ `.env.example` - Added Google OAuth credentials template

### Existing Files (No Changes Needed):
- ✅ `app/login/page.js` - Already has Google Sign-In button
- ✅ `middleware.js` - Already whitelists OAuth routes

---

## 🧪 Testing

### Test Case 1: Existing User Login
1. Create a user in the admin panel with email: `test@example.com`
2. Go to login page
3. Click "Sign in with Google"
4. Sign in with Google account: `test@example.com`
5. **Expected:** ✅ Successfully logged in and redirected to dashboard

### Test Case 2: Non-Existent User
1. Go to login page
2. Click "Sign in with Google"
3. Sign in with Google account that's NOT in the database
4. **Expected:** ❌ Redirected to login with error: "No account found with this Google email. Please contact your administrator."

### Test Case 3: Deactivated User
1. Create a user in admin panel
2. Deactivate the user (set `isActive: false`)
3. Try to login with Google
4. **Expected:** ❌ Error: "Your account has been deactivated. Please contact your administrator."

---

## 🔐 Security Features

1. **No Self-Registration**: Users cannot create accounts via Google - admin must create them first
2. **Email Verification**: Only users with matching email in database can login
3. **Active Status Check**: Deactivated accounts cannot login
4. **JWT Token**: Secure token-based authentication
5. **HttpOnly Cookies**: Secure cookie storage
6. **HTTPS in Production**: Secure cookies only in production

---

## 🐛 Troubleshooting

### Error: "Google authentication failed"
- **Cause**: Invalid Client ID or redirect URI mismatch
- **Fix**: 
  - Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env`
  - Verify redirect URI in Google Console matches exactly: `https://app.talio.in/api/auth/google/callback`

### Error: "Token exchange failed"
- **Cause**: Invalid Client Secret
- **Fix**: Check `GOOGLE_CLIENT_SECRET` in `.env`

### Error: "No account found with this Google email"
- **Cause**: User doesn't exist in database
- **Fix**: Admin must create the user first via admin panel with the same email

### Error: "Your account has been deactivated"
- **Cause**: User exists but `isActive: false`
- **Fix**: Admin must activate the user in admin panel

### Google Sign-In button not working
- **Cause**: Missing environment variables
- **Fix**: 
  ```bash
  # Check if variables are set
  echo $NEXT_PUBLIC_GOOGLE_CLIENT_ID
  echo $GOOGLE_CLIENT_SECRET
  
  # If empty, add to .env and restart
  docker-compose restart hrms-app
  ```

---

## 📊 Admin Workflow

### How to Enable Google Login for a User:

1. **Admin creates user in admin panel**
   - Go to: Dashboard → Employees → Add Employee
   - Fill in details
   - **Important:** Use the user's Google email address
   - Set role (employee, manager, hr, etc.)
   - Save

2. **User can now login with Google**
   - User goes to login page
   - Clicks "Sign in with Google"
   - Signs in with their Google account
   - Automatically logged in to HRMS

---

## 🎯 Benefits

✅ **Secure**: Only pre-approved users can access the system
✅ **Convenient**: Users don't need to remember passwords
✅ **Fast**: One-click login with Google
✅ **Centralized**: Admin controls who has access
✅ **Professional**: Modern authentication experience

---

## 📝 Next Steps

1. ✅ Get Google OAuth credentials from Google Cloud Console
2. ✅ Add credentials to `.env` file
3. ✅ Deploy to production
4. ✅ Test with an existing user
5. ✅ Inform users they can now use Google Sign-In

---

**Need help?** Check the troubleshooting section or contact support.

