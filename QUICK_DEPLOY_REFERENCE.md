# 🚀 Quick Deploy Reference - Talio HRMS

## 📦 Local Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Check Firebase:**
- Open browser console
- Look for: `[Firebase] App initialized successfully`
- Look for: `[Firebase] Token saved to backend`

---

## 🐳 Docker Deployment

### **Method 1: Docker Compose (Recommended)**

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f hrms-app

# Stop
docker-compose down

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### **Method 2: Build Script**

```bash
# Build image
./build-docker.sh

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f hrms-app
```

---

## 🔍 Verification Commands

### **Check if Firebase env vars are loaded:**
```bash
# In .env file
grep NEXT_PUBLIC_FIREBASE .env

# In running container
docker exec -it <container-name> env | grep FIREBASE
```

### **Check Firebase initialization:**
```bash
# Local build
npm run build 2>&1 | grep Firebase

# Docker logs
docker-compose logs hrms-app | grep Firebase
```

### **Check container status:**
```bash
# List running containers
docker ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs hrms-app
```

---

## 🌐 Production Server (zenova.sbs)

### **Deploy to Server:**

```bash
# SSH to server
ssh root@srv1118054

# Navigate to app directory
cd /root/Tailo

# Pull latest code
git pull

# Make sure .env has Firebase credentials
grep NEXT_PUBLIC_FIREBASE .env

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f hrms-app
```

### **Verify Deployment:**

1. Open `https://zenova.sbs` in browser
2. Open DevTools Console (F12)
3. Look for Firebase initialization logs
4. Login and test push notifications

---

## 🐛 Troubleshooting

### **Issue: Firebase not initialized**

```bash
# Check env vars
grep NEXT_PUBLIC_FIREBASE .env

# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs hrms-app | grep -i firebase
```

### **Issue: Port 3000 already in use**

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use docker-compose
docker-compose down
docker-compose up -d
```

### **Issue: Build fails**

```bash
# Clean everything
docker-compose down -v
docker system prune -a
rm -rf .next node_modules

# Reinstall and rebuild
npm install
npm run build
docker-compose up -d --build
```

---

## 📋 Environment Variables Checklist

Make sure `.env` file has:

- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY`
- ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- ✅ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_APP_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- ✅ `FIREBASE_PROJECT_ID`
- ✅ `FIREBASE_CLIENT_EMAIL`
- ✅ `FIREBASE_PRIVATE_KEY`

---

## 🎯 Quick Test

### **Test Push Notifications:**

1. Open app in browser
2. Login with your account
3. Grant notification permission when prompted
4. Logout and login again
5. You should receive a welcome notification!

### **Test in Different Environments:**

- ✅ **Desktop Browser** (Chrome, Edge, Firefox)
- ✅ **Mobile Browser** (Android Chrome)
- ✅ **PWA** (Add to Home Screen on Android)
- ❌ **iOS** (Limited support - Safari doesn't support Web Push)

---

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Check browser console for errors
3. Verify env vars are loaded
4. Try rebuilding without cache
5. Check Firebase Console for errors

---

**Happy Deploying! 🚀**

