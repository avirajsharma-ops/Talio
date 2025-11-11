# 🔧 Backend 500 Error - FIXED

## Problem Identified

The backend was giving **500 Internal Server Error** with this error in logs:

```
MissingSchemaError: Schema hasn't been registered for model "Employee".
Use mongoose.model(name, schema)
```

## Root Cause

The login API (`app/api/auth/login/route.js`) was trying to populate the `employeeId` field on line 23, but the **Employee model was not imported** at the top of the file. This caused Mongoose to fail when trying to populate the reference.

## Fix Applied

✅ **Updated `app/api/auth/login/route.js`:**
1. Added `import Employee from '@/models/Employee'` at the top
2. Removed `.populate('employeeId')` from the initial User query (line 23)
3. Changed dynamic import to use the imported Employee model (line 107)

## Files Changed

- `app/api/auth/login/route.js` - Fixed Employee model import

## Environment Variables Fixed

Your `.env` file also had incorrect URLs (HTTP instead of HTTPS):

**Before:**
```bash
NEXTAUTH_URL=http://mwg.talio.in/
NEXT_PUBLIC_APP_URL=http://mwg.talio.in/
```

**After:**
```bash
NEXTAUTH_URL=https://mwg.talio.in
NEXT_PUBLIC_APP_URL=https://mwg.talio.in
```

---

## 🚀 Deploy the Fix

Run these commands on your Hostinger VPS:

### Step 1: Pull Latest Changes

```bash
cd ~/Talio
git pull origin main
```

### Step 2: Update Environment Variables

```bash
# Fix URLs to use HTTPS (no trailing slashes)
sed -i 's|NEXTAUTH_URL=http://|NEXTAUTH_URL=https://|g' .env
sed -i 's|NEXT_PUBLIC_APP_URL=http://|NEXT_PUBLIC_APP_URL=https://|g' .env
sed -i 's|mwg.talio.in/|mwg.talio.in|g' .env

# Verify changes
cat .env | grep -E "NEXTAUTH_URL|NEXT_PUBLIC_APP_URL"
```

Expected output:
```
NEXTAUTH_URL=https://mwg.talio.in
NEXT_PUBLIC_APP_URL=https://mwg.talio.in
```

### Step 3: Rebuild and Restart

```bash
# Stop containers
docker-compose down

# Rebuild application (to pick up code changes)
docker-compose build --no-cache

# Start containers
docker-compose up -d

# Wait for startup
sleep 10

# Check logs
docker-compose logs hrms-app --tail=50
```

### Step 4: Verify Fix

```bash
# Check if containers are running
docker-compose ps

# Test login API
curl -X POST https://mwg.talio.in/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrms.com","password":"admin123"}'

# Check application logs
docker-compose logs hrms-app --tail=30
```

---

## ✅ Expected Result

After deployment:

1. ✅ No more "MissingSchemaError" in logs
2. ✅ Login should work successfully
3. ✅ Application accessible at https://mwg.talio.in
4. ✅ No 500 errors on login

---

## 🔍 Monitoring

### View Logs in Real-time

```bash
docker-compose logs -f hrms-app
```

### Check Container Status

```bash
docker-compose ps
```

### Test Login from Browser

1. Open https://mwg.talio.in
2. Try logging in with: `admin@hrms.com` / `admin123`
3. Check browser console for any errors (F12 → Console)

---

## 🆘 If Still Getting Errors

### Check MongoDB Connection

```bash
# View MongoDB URI (masked)
cat .env | grep MONGODB_URI | sed 's/:.*/:*****/'

# Test MongoDB connection
docker-compose exec hrms-app node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ MongoDB Connected'); process.exit(0); })
  .catch(err => { console.error('❌ MongoDB Error:', err.message); process.exit(1); });
"
```

### Check All Environment Variables

```bash
# View all env vars in container
docker-compose exec hrms-app env | grep -E 'MONGODB|NEXTAUTH|JWT|NEXT_PUBLIC'
```

### Complete Rebuild

```bash
# Nuclear option - complete rebuild
docker-compose down -v
docker system prune -a -f
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Summary

**Issue:** Backend 500 error due to missing Employee model import in login API

**Fix:** 
1. ✅ Added Employee model import to login route
2. ✅ Fixed environment variables (HTTP → HTTPS)
3. ✅ Removed trailing slashes from URLs

**Status:** Ready to deploy

**Deployment Time:** ~5 minutes

---

## 🎯 Quick Deploy Command

Run this single command to deploy everything:

```bash
cd ~/Talio && \
git pull origin main && \
sed -i 's|NEXTAUTH_URL=http://|NEXTAUTH_URL=https://|g' .env && \
sed -i 's|NEXT_PUBLIC_APP_URL=http://|NEXT_PUBLIC_APP_URL=https://|g' .env && \
sed -i 's|mwg.talio.in/|mwg.talio.in|g' .env && \
docker-compose down && \
docker-compose build --no-cache && \
docker-compose up -d && \
sleep 10 && \
echo "Deployment complete! Checking logs..." && \
docker-compose logs hrms-app --tail=30
```

---

**Last Updated:** 2025-11-11  
**Domain:** mwg.talio.in  
**Status:** Fix ready for deployment

