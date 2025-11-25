# 🚨 TROUBLESHOOT: Internal Server Error - No Data Loading

## Current Issue
- Pages render but no data loads
- Cannot sign in
- Getting "Internal Server Error"
- Environment variables not being loaded properly

---

## 🔍 Step-by-Step Diagnosis (Run on Server)

### Step 1: Check if .env file exists and is in the right location

```bash
cd ~/hrms
pwd  # Should show: /root/hrms or /home/username/hrms
ls -la .env
```

**Expected output:**
```
-rw-r--r-- 1 root root 245 Nov 2 10:30 .env
```

**If file doesn't exist:**
```bash
nano .env
```

Add this content (replace with your actual values):
```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
JWT_SECRET=your-actual-jwt-secret-here
NEXTAUTH_SECRET=your-actual-nextauth-secret-here
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

---

### Step 2: Verify .env file content

```bash
cat .env
```

**Check:**
- ✅ MONGODB_URI is set to your actual MongoDB connection
- ✅ JWT_SECRET is a long random string (not "your-jwt-secret-here")
- ✅ NEXTAUTH_SECRET is a long random string
- ✅ No "dummy" values anywhere

**Generate real secrets if needed:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
```

Copy the output and update your .env file.

---

### Step 3: Check docker-compose.yml location

```bash
ls -la docker-compose.yml
```

**The .env file MUST be in the same directory as docker-compose.yml!**

---

### Step 4: Stop and remove ALL containers and images

```bash
# Stop containers
docker-compose down -v

# Remove the hrms-app image
docker images | grep hrms
docker rmi $(docker images | grep hrms | awk '{print $3}')

# Or remove all unused images
docker image prune -a
```

---

### Step 5: Rebuild from scratch (NO CACHE!)

```bash
docker-compose build --no-cache
```

**This should take a few minutes. Wait for it to complete.**

---

### Step 6: Start containers

```bash
docker-compose up -d
```

---

### Step 7: Run environment debug script

```bash
docker-compose exec hrms-app node debug-env.js
```

**Expected output:**
```
✅ MONGODB_URI: Set correctly
✅ JWT_SECRET: Set correctly
✅ NEXTAUTH_SECRET: Set correctly
✅ MongoDB connection successful!
```

**If you see "dummy" anywhere:**
- The .env file is NOT being loaded
- Go back to Step 1 and verify .env file location

---

### Step 8: Check container logs

```bash
docker-compose logs hrms-app --tail=50
```

**Look for:**
- ❌ "ENOTFOUND dummy" - .env not loaded
- ❌ "MONGODB_URI is not defined" - .env not loaded
- ❌ "MongooseServerSelectionError" - MongoDB connection issue
- ✅ "Ready in XXXXms" - App started successfully

---

### Step 9: Test MongoDB connection from host

```bash
# If MongoDB is on the same server
mongosh --eval "db.version()"

# Or
sudo systemctl status mongod
```

**If MongoDB is not running:**
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

### Step 10: Test environment variables inside container

```bash
docker-compose exec hrms-app env | grep MONGODB_URI
```

**Expected output:**
```
MONGODB_URI=mongodb://localhost:27017/hrms_db
```

**If you see:**
```
MONGODB_URI=mongodb://dummy:27017/dummy
```

**Then .env is NOT being loaded. Solutions:**

1. **Check .env file location:**
   ```bash
   pwd  # Should be in project root
   ls -la .env
   ls -la docker-compose.yml
   # Both files should be in the same directory
   ```

2. **Check .env file permissions:**
   ```bash
   chmod 644 .env
   ```

3. **Rebuild completely:**
   ```bash
   docker-compose down -v
   docker system prune -a --volumes
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

## 🔧 Common Issues & Solutions

### Issue 1: .env file not being read

**Symptoms:**
- Environment variables show "dummy" values
- MONGODB_URI not set

**Solution:**
```bash
# Ensure .env is in the same directory as docker-compose.yml
cd ~/hrms
ls -la .env docker-compose.yml

# If .env is missing, create it
nano .env
# Add your environment variables

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Issue 2: MongoDB not accessible

**Symptoms:**
- "Connection refused"
- "ECONNREFUSED"

**Solution:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB is listening
sudo netstat -tlnp | grep 27017

# Test connection
mongosh --eval "db.version()"
```

---

### Issue 3: MongoDB authentication failed

**Symptoms:**
- "Authentication failed"
- "bad auth"

**Solution:**

Check your MONGODB_URI format:

**No authentication:**
```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
```

**With authentication:**
```env
MONGODB_URI=mongodb://username:password@localhost:27017/hrms_db?authSource=admin
```

**Test manually:**
```bash
mongosh "mongodb://localhost:27017/hrms_db"
```

---

### Issue 4: Docker not reading .env file

**Symptoms:**
- .env file exists but variables not loaded
- Still seeing dummy values

**Solution:**

1. **Check file name (must be exactly `.env`):**
   ```bash
   ls -la | grep env
   # Should show: .env (not .env.txt or env or anything else)
   ```

2. **Check file format (no spaces around =):**
   ```bash
   cat .env
   # Correct: MONGODB_URI=mongodb://localhost:27017/hrms_db
   # Wrong:   MONGODB_URI = mongodb://localhost:27017/hrms_db
   ```

3. **Recreate .env file:**
   ```bash
   rm .env
   nano .env
   # Paste your environment variables
   # Save with Ctrl+X, Y, Enter
   ```

4. **Complete rebuild:**
   ```bash
   docker-compose down -v
   docker system prune -a
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

## 📋 Complete Diagnostic Checklist

Run these commands in order and note the results:

```bash
# 1. Check location
pwd
ls -la .env docker-compose.yml

# 2. Check .env content
cat .env | grep MONGODB_URI

# 3. Stop containers
docker-compose down -v

# 4. Remove old images
docker rmi $(docker images | grep hrms | awk '{print $3}')

# 5. Rebuild
docker-compose build --no-cache

# 6. Start
docker-compose up -d

# 7. Debug environment
docker-compose exec hrms-app node debug-env.js

# 8. Check logs
docker-compose logs hrms-app --tail=30

# 9. Test MongoDB
mongosh --eval "db.version()"

# 10. Test app
curl http://localhost:3000
```

---

## ✅ Success Indicators

You'll know it's working when:

1. **debug-env.js shows:**
   ```
   ✅ MONGODB_URI: Set correctly (no "dummy")
   ✅ JWT_SECRET: Set correctly
   ✅ MongoDB connection successful!
   ```

2. **Logs show:**
   ```
   ✓ Ready in 1913ms
   ```
   (No MongoDB errors)

3. **App works:**
   - https://zenova.sbs loads
   - Login page works
   - Can sign in
   - Data loads

---

## 🚨 If Nothing Works

Complete nuclear reset:

```bash
# 1. Stop everything
docker-compose down -v

# 2. Remove ALL Docker data
docker system prune -a --volumes
# Type 'y' to confirm

# 3. Verify .env file
cat .env

# 4. If .env doesn't exist or is wrong, create it
nano .env
# Add all environment variables
# Save with Ctrl+X, Y, Enter

# 5. Rebuild from scratch
docker-compose build --no-cache

# 6. Start
docker-compose up -d

# 7. Watch logs
docker-compose logs -f hrms-app

# 8. In another terminal, test
docker-compose exec hrms-app node debug-env.js
```

---

## 📞 Send Me This Information

If it still doesn't work, run this and send me the output:

```bash
echo "=== DIAGNOSTIC REPORT ===" > diagnostic.txt
echo "" >> diagnostic.txt
echo "1. Current directory:" >> diagnostic.txt
pwd >> diagnostic.txt
echo "" >> diagnostic.txt
echo "2. Files in directory:" >> diagnostic.txt
ls -la .env docker-compose.yml >> diagnostic.txt
echo "" >> diagnostic.txt
echo "3. .env content (masked):" >> diagnostic.txt
cat .env | sed 's/=.*/=***HIDDEN***/' >> diagnostic.txt
echo "" >> diagnostic.txt
echo "4. Container status:" >> diagnostic.txt
docker-compose ps >> diagnostic.txt
echo "" >> diagnostic.txt
echo "5. Environment in container:" >> diagnostic.txt
docker-compose exec -T hrms-app env | grep -E "MONGODB|JWT|NEXTAUTH" | sed 's/=.*/=***HIDDEN***/' >> diagnostic.txt
echo "" >> diagnostic.txt
echo "6. Recent logs:" >> diagnostic.txt
docker-compose logs hrms-app --tail=20 >> diagnostic.txt
echo "" >> diagnostic.txt
cat diagnostic.txt
```

---

**Start with Step 1 and work through each step carefully!** 🔍

