# Google OAuth Deployment Guide

## 🚀 Deploy Google OAuth to Production Server

Follow these steps to enable Google OAuth on your production server at `https://zenova.sbs`

---

## 📋 Prerequisites

1. ✅ Google OAuth credentials configured in Google Cloud Console
2. ✅ Redirect URI added: `https://zenova.sbs/api/auth/google/callback`
3. ✅ Server running with Docker Compose
4. ✅ `.env` file exists on server

---

## 🔧 Step 1: Update `.env` File on Server

SSH into your server and add the Google OAuth credentials to your `.env` file:

```bash
# SSH into your server
ssh your-server-user@your-server-ip

# Navigate to your project directory
cd /path/to/Talio

# Edit the .env file
nano .env
```

Add these lines at the end of the `.env` file:

```bash
# ===========================================
# GOOGLE OAUTH CONFIGURATION
# ===========================================
# Google OAuth for Sign in with Google functionality
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

**Note:** Replace `your-google-client-id-here` and `your-google-client-secret-here` with your actual credentials from Google Cloud Console.

Save and exit (Ctrl+X, then Y, then Enter)

---

## 🔄 Step 2: Pull Latest Code

```bash
# Pull the latest changes from GitHub
git pull origin main
```

This will update your `docker-compose.yml` with the Google OAuth environment variables.

---

## 🐳 Step 3: Rebuild and Restart Docker Containers

```bash
# Stop the current containers
docker-compose down

# Rebuild the application with new environment variables
docker-compose build --no-cache

# Start the containers
docker-compose up -d

# Check the logs to ensure everything is running
docker-compose logs -f hrms-app
```

---

## ✅ Step 4: Verify Google OAuth is Working

1. Open your browser and go to: `https://zenova.sbs/login`
2. Click "Sign in with Google"
3. Sign in with a Google account that exists in your database
4. You should be redirected to the dashboard!

---

## 🔍 Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Solution:** Make sure you've added the production redirect URI in Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   https://zenova.sbs/api/auth/google/callback
   ```
4. Click "Save"

### Issue: "User not found" Error

**Solution:** The user must exist in the database before they can login with Google OAuth.

1. Login as admin using regular email/password
2. Go to Employees → Add Employee
3. Add the user with their Google email address
4. Now they can login with Google OAuth

### Issue: Environment Variables Not Loading

**Solution:** Check if the `.env` file is being read:

```bash
# Check if environment variables are set in the container
docker-compose exec hrms-app env | grep GOOGLE
```

You should see:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

If not, rebuild the containers:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Check Logs

```bash
# View application logs
docker-compose logs -f hrms-app

# View nginx logs
docker-compose logs -f nginx

# View all logs
docker-compose logs -f
```

---

## 🎯 Quick Deployment Commands

```bash
# One-liner to deploy everything
cd /path/to/Talio && \
git pull origin main && \
docker-compose down && \
docker-compose build --no-cache && \
docker-compose up -d && \
docker-compose logs -f hrms-app
```

---

## 🔐 Security Notes

1. **Never commit `.env` files to Git** - They contain sensitive credentials
2. **Keep Google Client Secret secure** - Don't share it publicly
3. **Use HTTPS in production** - Google OAuth requires HTTPS for production domains
4. **Rotate secrets regularly** - Change JWT_SECRET and NEXTAUTH_SECRET periodically

---

## 📝 Environment Variables Reference

The following environment variables are required for Google OAuth:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID (public) | `123456789-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret (private) | `GOCSPX-xxxxx` |
| `NEXTAUTH_URL` | Your production domain | `https://zenova.sbs` |
| `NEXT_PUBLIC_APP_URL` | Your production domain | `https://zenova.sbs` |

---

## 🔑 Getting Google OAuth Credentials

If you don't have Google OAuth credentials yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (for local development)
   - `https://zenova.sbs/api/auth/google/callback` (for production)
7. Copy the Client ID and Client Secret

---

## ✅ Success Checklist

- [ ] `.env` file updated on server with Google OAuth credentials
- [ ] Latest code pulled from GitHub
- [ ] Docker containers rebuilt with `--no-cache`
- [ ] Containers running successfully
- [ ] Google OAuth redirect URI configured in Google Cloud Console
- [ ] Test user exists in database
- [ ] Google OAuth login tested and working

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the application logs: `docker-compose logs -f hrms-app`
2. Verify environment variables: `docker-compose exec hrms-app env | grep GOOGLE`
3. Check Google Cloud Console for any errors
4. Ensure the user exists in the database before attempting Google OAuth login

---

**Last Updated:** 2025-11-13
