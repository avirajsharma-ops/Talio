# Google OAuth Setup Guide

## ✅ What's Been Implemented

### 1. **Create User API** (`/api/create-user`)
- ✅ POST endpoint to create new users
- ✅ GET endpoint to check if user exists
- ✅ Auto-generates employee code
- ✅ Creates both User and Employee records
- ✅ Returns JWT token for immediate login
- ✅ Supports Google OAuth users (no password required)

### 2. **Google OAuth Callback** (`/api/auth/google/callback`)
- ✅ Handles Google OAuth redirect
- ✅ Exchanges authorization code for tokens
- ✅ Fetches user info from Google
- ✅ Creates new user if doesn't exist
- ✅ Updates last login for existing users
- ✅ Sets authentication cookies
- ✅ Redirects to dashboard

### 3. **Login Page Updates**
- ✅ Google Sign-In button added
- ✅ Click handler implemented
- ✅ Error handling for OAuth failures
- ✅ Loading states

### 4. **Middleware Updates**
- ✅ `/api/create-user` whitelisted
- ✅ `/api/auth/google/callback` whitelisted
- ✅ No authentication required for OAuth flow

---

## 🔧 Setup Instructions

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Click "Select a project" → "New Project"
   - Name: "HRMS System" (or your choice)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "HRMS Web Client"

5. **Configure Authorized URLs**
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://your-production-domain.com
   ```
   
   **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-production-domain.com/api/auth/google/callback
   ```

6. **Copy Credentials**
   - Copy the **Client ID**
   - Copy the **Client Secret**

---

### Step 2: Configure Environment Variables

Create or update `.env.local`:

```env
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# App URL (important for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Existing variables
MONGODB_URI=mongodb://localhost:27017/hrms_db
JWT_SECRET=your-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret-key
```

**For Production (.env):**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

---

### Step 3: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

## 🧪 Testing

### Test Locally:

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:3000/login
   ```

3. **Click "Sign in with Google"**
   - Should redirect to Google login
   - Select your Google account
   - Grant permissions
   - Should redirect back to dashboard

### Test Create User API:

```bash
# Run test script
node test-create-user.js
```

Or manually:
```bash
curl -X POST http://localhost:3000/api/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## 🔍 How It Works

### Google Sign-In Flow:

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
6. Backend fetches user info from Google
   ↓
7. Check if user exists in database
   ↓
8. If new user:
   - Call /api/create-user
   - Create Employee record
   - Create User record
   ↓
9. Generate JWT token
   ↓
10. Set authentication cookies
   ↓
11. Redirect to /dashboard
```

---

## 📁 Files Created/Modified

### New Files:
- ✅ `app/api/create-user/route.js` - User creation API
- ✅ `app/api/auth/google/callback/route.js` - Google OAuth callback
- ✅ `test-create-user.js` - Test script
- ✅ `CREATE_USER_API_GUIDE.md` - API documentation
- ✅ `GOOGLE_OAUTH_SETUP.md` - This file

### Modified Files:
- ✅ `app/login/page.js` - Added Google Sign-In button and handler
- ✅ `middleware.js` - Whitelisted OAuth routes

---

## 🔐 Security Features

1. **JWT Token Generation**: Secure token created on successful login
2. **Cookie-based Auth**: HttpOnly cookies for security
3. **Password Auto-generation**: Random secure password for OAuth users
4. **Email Uniqueness**: Prevents duplicate accounts
5. **Active Status Check**: Deactivated accounts cannot login
6. **HTTPS in Production**: Secure cookies only in production

---

## 🐛 Troubleshooting

### Error: "Google authentication failed"
- Check if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
- Verify redirect URI matches exactly in Google Console

### Error: "Token exchange failed"
- Check if `GOOGLE_CLIENT_SECRET` is set correctly
- Verify `NEXT_PUBLIC_APP_URL` matches your domain

### Error: "User creation failed"
- Check MongoDB connection
- Verify User and Employee models are working
- Check server logs for detailed error

### Error: "Account deactivated"
- User exists but `isActive` is false
- Admin needs to activate the account

### Redirect URI Mismatch:
- Make sure redirect URI in Google Console exactly matches:
  - Development: `http://localhost:3000/api/auth/google/callback`
  - Production: `https://your-domain.com/api/auth/google/callback`

---

## 📊 Database Schema

### User Collection:
```javascript
{
  email: String (unique),
  password: String (hashed),
  role: String (admin/hr/manager/employee),
  employeeId: ObjectId (ref: Employee),
  isActive: Boolean,
  lastLogin: Date,
  googleId: String (optional)
}
```

### Employee Collection:
```javascript
{
  employeeCode: String (unique, auto-generated),
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String,
  dateOfJoining: Date,
  employmentType: String,
  status: String,
  profilePicture: String,
  // ... other fields
}
```

---

## 🚀 Next Steps

1. ✅ Set up Google OAuth credentials
2. ✅ Add environment variables
3. ✅ Test locally
4. ⏳ Deploy to production
5. ⏳ Update Google Console with production URLs
6. ⏳ Test in production

---

## 📞 Support

If you encounter any issues:
1. Check server logs: `npm run dev`
2. Check browser console for errors
3. Verify all environment variables are set
4. Test with the provided test script
5. Check MongoDB connection

---

## ✨ Features

- ✅ One-click Google Sign-In
- ✅ Automatic user creation
- ✅ Automatic employee record creation
- ✅ JWT token authentication
- ✅ Cookie-based session management
- ✅ Error handling and user feedback
- ✅ Secure password handling
- ✅ Profile picture from Google
- ✅ Email verification (via Google)

---

**Status**: ✅ Ready to use (after Google OAuth setup)
**Last Updated**: 2024-01-15

