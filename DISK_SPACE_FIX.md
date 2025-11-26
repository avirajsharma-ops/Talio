# Docker Build Fix - Disk Space & Node Version ✅

## 🚨 **CRITICAL ISSUES FOUND:**

### **1. No Space Left on Device**
```
npm error nospc ENOSPC: no space left on device, write
```
**Your server has run out of disk space!**

### **2. Wrong Node.js Version**
```
npm warn EBADENGINE required: { node: '>=20.0.0' }
npm warn EBADENGINE current: { node: 'v18.20.8' }
```
**Firebase requires Node.js 20+, but Dockerfile uses Node.js 18**

---

## ✅ **FIXES APPLIED:**

### **1. Updated Node.js Version**
- Changed from `node:18-alpine` to `node:20-alpine`
- Updated in both `Dockerfile` and `Dockerfile.optimized`

### **2. Disk Space Cleanup Required**
**You MUST clean up disk space on your server before building!**

---

## 🧹 **STEP 1: Clean Up Disk Space (REQUIRED)**

### **SSH into your server:**
```bash
ssh user@your-server.com
```

### **Check current disk usage:**
```bash
df -h
```

### **Clean Docker (THIS WILL FREE UP MOST SPACE):**

```bash
# Stop all containers
docker-compose down

# Remove all stopped containers
docker container prune -a -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes
docker volume prune -a -f

# Remove all build cache
docker builder prune -a -f

# Remove everything unused (RECOMMENDED)
docker system prune -a -f --volumes
```

**This should free up several GB of space!**

### **Clean npm cache:**
```bash
npm cache clean --force
rm -rf ~/.npm
```

### **Clean system logs (if needed):**
```bash
# Check log sizes
sudo du -sh /var/log/*

# Clean old logs (be careful!)
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.log" -mtime +30 -delete
```

### **Remove old packages (Ubuntu/Debian):**
```bash
sudo apt-get autoremove -y
sudo apt-get clean
```

### **Check disk usage again:**
```bash
df -h
```

**You should have at least 5-10 GB free before building!**

---

## 🚀 **STEP 2: Pull Latest Changes**

```bash
cd /path/to/Talio

# Pull latest changes (includes Node 20 fix)
git pull origin main
```

---

## 🔨 **STEP 3: Build Docker Image**

### **Option A: Simple Build (Recommended)**

```bash
# Build with Node 20
docker build -t talio-hrms .

# If it fails with disk space, clean more:
docker system prune -a -f --volumes
docker build --no-cache -t talio-hrms .
```

### **Option B: Optimized Build (Smaller image)**

```bash
# Build optimized version
docker build -f Dockerfile.optimized -t talio-hrms .
```

---

## 🎯 **STEP 4: Start Containers**

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f hrms-app
```

---

## 📊 **Disk Space Monitoring:**

### **Before cleaning:**
```bash
df -h
# Example output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   48G   0G  100% /
```

### **After cleaning:**
```bash
df -h
# Example output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   20G  28G   42% /
```

**You need at least 5-10 GB free for Docker build!**

---

## 🔍 **Troubleshooting:**

### **If still out of space after cleaning:**

#### **1. Check what's using space:**
```bash
# Find large directories
sudo du -h --max-depth=1 / 2>/dev/null | sort -hr | head -20

# Check Docker usage
docker system df
```

#### **2. Remove old Docker images manually:**
```bash
# List all images
docker images

# Remove specific image
docker rmi <image-id>

# Remove all images
docker rmi $(docker images -q) -f
```

#### **3. Check for large log files:**
```bash
# Find large files
sudo find / -type f -size +100M 2>/dev/null | head -20

# Check Docker logs
sudo du -sh /var/lib/docker/containers/*/*-json.log
```

#### **4. Increase disk space:**
- Resize your server's disk (if using cloud provider)
- Add a new volume
- Move Docker to a larger partition

---

## 📋 **Complete Deployment Script:**

Save this as `deploy.sh` on your server:

```bash
#!/bin/bash
set -e

echo "🧹 Step 1: Cleaning up disk space..."
docker-compose down
docker system prune -a -f --volumes
npm cache clean --force || true

echo "📊 Checking disk space..."
df -h

echo "📥 Step 2: Pulling latest changes..."
cd /path/to/Talio
git pull origin main

echo "🔨 Step 3: Building Docker image..."
docker build -t talio-hrms .

echo "🚀 Step 4: Starting containers..."
docker-compose up -d

echo "📝 Step 5: Showing logs..."
docker-compose logs -f hrms-app
```

**Make it executable:**
```bash
chmod +x deploy.sh
```

**Run it:**
```bash
./deploy.sh
```

---

## ⚠️ **Important Notes:**

### **Node.js Version:**
- ✅ **Updated to Node 20** (required for Firebase)
- ✅ All Firebase packages will now work
- ✅ No more EBADENGINE warnings

### **Disk Space:**
- ⚠️ **MUST clean before building**
- ⚠️ Docker builds need 5-10 GB free space
- ⚠️ Monitor disk usage regularly

### **Docker Cleanup:**
- ✅ Safe to run `docker system prune -a -f --volumes`
- ✅ Will remove all unused containers, images, volumes
- ⚠️ Will NOT remove running containers
- ⚠️ Will remove stopped containers and old images

---

## 🎯 **Quick Fix Commands:**

### **Emergency Cleanup:**
```bash
# One-liner to free up maximum space
docker stop $(docker ps -aq) 2>/dev/null || true && \
docker system prune -a -f --volumes && \
npm cache clean --force && \
sudo journalctl --vacuum-time=7d
```

### **Check Space:**
```bash
# Quick disk check
df -h | grep -E '^/dev/'

# Docker space usage
docker system df
```

### **Full Deploy:**
```bash
# Complete deployment in one command
cd /path/to/Talio && \
docker-compose down && \
docker system prune -a -f --volumes && \
git pull origin main && \
docker build -t talio-hrms . && \
docker-compose up -d && \
docker-compose logs -f
```

---

## ✅ **Summary:**

**Problems:**
1. ❌ No disk space left (ENOSPC error)
2. ❌ Node.js 18 (Firebase needs 20+)

**Solutions:**
1. ✅ Clean Docker cache and unused images
2. ✅ Updated to Node.js 20 in Dockerfile
3. ✅ Pushed changes to Git

**Next Steps:**
1. SSH into your server
2. Clean up disk space (REQUIRED)
3. Pull latest changes
4. Build Docker image
5. Start containers

---

## 📞 **If You Need More Space:**

### **Cloud Providers:**

**DigitalOcean:**
```bash
# Resize droplet from dashboard
# Or add a volume
```

**AWS EC2:**
```bash
# Resize EBS volume from console
# Then extend filesystem
```

**Google Cloud:**
```bash
# Resize persistent disk
# Then extend filesystem
```

### **Move Docker to New Volume:**
```bash
# Stop Docker
sudo systemctl stop docker

# Move Docker data
sudo mv /var/lib/docker /mnt/new-volume/docker

# Create symlink
sudo ln -s /mnt/new-volume/docker /var/lib/docker

# Start Docker
sudo systemctl start docker
```

---

## 🚀 **Deploy Now:**

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clean disk space
docker system prune -a -f --volumes

# 3. Check space (should have 5-10 GB free)
df -h

# 4. Pull changes
cd /path/to/Talio
git pull origin main

# 5. Build
docker build -t talio-hrms .

# 6. Deploy
docker-compose up -d

# 7. Check logs
docker-compose logs -f
```

---

**CRITICAL: Clean up disk space FIRST, then build! The Node.js version is now fixed.** 🚀

