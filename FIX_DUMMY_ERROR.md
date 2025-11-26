# 🚨 URGENT: Fix "ENOTFOUND dummy" Error

## ⚠️ Critical Issue Fixed

**Error you're seeing:**
```
MongooseServerSelectionError: getaddrinfo ENOTFOUND dummy
```

**Problem:** App was connecting to `dummy:27017` instead of your real MongoDB.

**Cause:** Dummy environment variables were baked into the Docker image during build.

**Solution:** Removed dummy ENV vars from Dockerfile. Now all secrets come from runtime `.env` file only.

---

## 📋 Deploy Steps (Run on Your Server NOW)

### Step 1: Pull Latest Code
```bash
cd ~/hrms
git pull origin main
```

### Step 2: Ensure .env File Exists

Check if you have a `.env` file:
```bash
ls -la .env
```

If it doesn't exist, create it:
```bash
nano .env
```

Add your MongoDB connection and secrets:
```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
JWT_SECRET=your-jwt-secret-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

**Generate secure secrets:**
```bash
# Generate JWT_SECRET
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Generate NEXTAUTH_SECRET  
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
```

### Step 3: Rebuild Everything (CRITICAL!)
```bash
# Stop containers
docker-compose down

# Rebuild WITHOUT cache (this removes dummy values)
docker-compose build --no-cache

# Start containers
docker-compose up -d
```

**⚠️ IMPORTANT:** You MUST use `--no-cache` to remove the old image with dummy values!

### Step 4: Verify It Works
```bash
# Run diagnostic
chmod +x check-db.sh
./check-db.sh

# Check logs
docker-compose logs -f hrms-app
```

**Look for:**
- ✅ No "ENOTFOUND dummy" errors
- ✅ "MongoDB connection successful"
- ✅ App starts normally

---

## ✅ Quick One-Liner

```bash
cd ~/hrms && git pull origin main && docker-compose down && docker-compose build --no-cache && docker-compose up -d && docker-compose logs -f
```

Press `Ctrl+C` to stop following logs.

---

## 🔍 Verify .env is Loaded

```bash
# Check if MONGODB_URI contains 'dummy'
docker-compose exec hrms-app env | grep MONGODB_URI

# Should show your real MongoDB URI, NOT dummy:27017
```

If you still see `dummy`, your `.env` file is not being read. Make sure:
1. `.env` file is in the project root (same directory as docker-compose.yml)
2. File is named exactly `.env` (not `.env.txt` or anything else)
3. Containers were rebuilt with `--no-cache`

---

## 📊 What Changed

**Before (BROKEN):**
- Dockerfile had: `ENV MONGODB_URI=mongodb://dummy:27017/dummy`
- This got baked into the image
- Runtime .env was ignored

**After (FIXED):**
- Dockerfile does NOT set MONGODB_URI
- Only runtime .env sets MONGODB_URI
- App connects to your real database

---

## 🎯 Success Indicators

You'll know it's fixed when:

1. **No "dummy" in logs:**
   ```bash
   docker-compose logs hrms-app | grep dummy
   # Should return nothing
   ```

2. **Diagnostic shows real MongoDB:**
   ```bash
   ./check-db.sh
   # Should show: ✅ MongoDB connection successful!
   ```

3. **App works:**
   - https://zenova.sbs loads
   - Login works
   - Data displays

---

**Deploy this fix NOW to resolve the database connection issue!** 🚀

