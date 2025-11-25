# Firebase Push Notifications - Docker Deployment Guide

## 🎯 Overview

This guide explains how to deploy the Talio HRMS app with Firebase Push Notifications using Docker.

---

## ✅ What Was Fixed

### **Problem:**
Docker build was failing with error:
```
Firebase configuration is incomplete. Please check environment variables.
```

### **Root Cause:**
- `NEXT_PUBLIC_*` environment variables are embedded into the JavaScript bundle at **build time**
- Docker build process didn't have access to Firebase environment variables
- Firebase initialization was throwing errors during static page generation

### **Solution:**
1. ✅ Modified `lib/firebase.js` to gracefully handle missing credentials during build
2. ✅ Updated `Dockerfile` to accept Firebase env vars as build arguments
3. ✅ Updated `docker-compose.yml` to pass Firebase env vars during build
4. ✅ Created `build-docker.sh` script for easy building

---

## 🚀 Deployment Methods

### **Method 1: Using Docker Compose (Recommended)**

This is the easiest method. Docker Compose will automatically load env vars from `.env` file.

```bash
# Make sure .env file has all Firebase credentials
# Then build and start the containers
docker-compose up -d --build
```

That's it! Docker Compose will:
- Load env vars from `.env` file
- Pass them as build arguments to Docker
- Build the image with Firebase credentials embedded
- Start the containers

---

### **Method 2: Using Build Script**

Use the provided build script for more control:

```bash
# Build the Docker image
./build-docker.sh

# Then start with docker-compose
docker-compose up -d
```

---

### **Method 3: Manual Docker Build**

If you want to build manually without docker-compose:

```bash
# Load env vars from .env file
export $(cat .env | grep -v '^#' | xargs)

# Build the image
docker build \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY}" \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_VAPID_KEY="${NEXT_PUBLIC_FIREBASE_VAPID_KEY}" \
    -t talio-hrms:latest \
    .

# Run the container
docker run -d \
    --name talio-hrms \
    --env-file .env \
    -p 3000:3000 \
    talio-hrms:latest
```

---

## 📋 Required Environment Variables

Make sure your `.env` file contains these Firebase variables:

```bash
# Firebase Web SDK Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDEyadwMSwamwG-KeMwzGwZ15UArNdJn-Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=talio-e9deb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=talio-e9deb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=talio-e9deb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=241026194465
NEXT_PUBLIC_FIREBASE_APP_ID=1:241026194465:web:b91d15bf73bcf807ad1760
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-MMMBE1NGST
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BLcUfeUd3bFz4TspUxF3sFiZnjBUdXPvvPfFxFYmUoY0PMxdksunlsnoViwiNZNpOufgSXyAoQ0iSh7_qp-BInc

# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID=talio-e9deb
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@talio-e9deb.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔍 Verification

After deployment, verify Firebase is working:

### **1. Check Build Logs**
```bash
docker-compose logs hrms-app | grep Firebase
```

You should see:
```
[Firebase] App initialized successfully
```

### **2. Test in Browser**
1. Open your app in browser (e.g., `https://zenova.sbs`)
2. Open DevTools Console (F12)
3. Look for Firebase initialization logs
4. Login to test push notifications

---

## 🐛 Troubleshooting

### **Issue: Firebase not initialized**

**Check 1:** Verify env vars are in `.env` file
```bash
grep NEXT_PUBLIC_FIREBASE .env
```

**Check 2:** Rebuild with --no-cache
```bash
docker-compose build --no-cache
docker-compose up -d
```

**Check 3:** Check container env vars
```bash
docker exec -it <container-name> env | grep FIREBASE
```

---

## 📝 Files Modified

1. ✅ `lib/firebase.js` - Made Firebase initialization optional during build
2. ✅ `Dockerfile` - Added Firebase build arguments
3. ✅ `docker-compose.yml` - Added Firebase build args
4. ✅ `build-docker.sh` - Created build script

---

## 🎉 Success!

Your app is now ready to deploy with Firebase Push Notifications! 🚀

