# Docker Build & Deployment Guide

Complete guide for building and deploying the Talio HRMS Docker image.

## 🐳 Building the Docker Image

### On Your Server

```bash
# Navigate to project directory
cd ~/hrms

# Pull latest code
git pull origin main

# Build the Docker image
docker-compose build --no-cache

# Start all services
docker-compose up -d
```

That's it! The build will now succeed without requiring database connection during build time.

---

## 🔧 What Was Fixed

### Problem
Docker build was failing with error:
```
Error: Please define the MONGODB_URI environment variable inside .env.local
```

### Root Cause
Next.js was trying to connect to MongoDB during the build phase when collecting page data for static generation.

### Solution
1. **MongoDB Connection**: Moved environment variable validation inside the `connectDB()` function instead of at module load time
2. **Dockerfile**: Added default dummy values for build-time environment variables
3. **Next.js Config**: Added build optimizations to prevent static page generation from connecting to database
4. **Build Script**: Added `SKIP_ENV_VALIDATION=true` flag

---

## 📋 Environment Variables

### Build Time (Optional)
The Dockerfile now provides dummy values for build, so you don't need to pass these during build:

```bash
# These are automatically set to dummy values during build
MONGODB_URI=mongodb://dummy:27017/dummy
JWT_SECRET=dummy-jwt-secret-for-build
NEXTAUTH_SECRET=dummy-nextauth-secret-for-build
```

### Runtime (Required)
Real values are provided via `docker-compose.yml` or `.env` file:

```env
MONGODB_URI=your_real_mongodb_connection_string
JWT_SECRET=your_real_jwt_secret
NEXTAUTH_SECRET=your_real_nextauth_secret
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

---

## 🚀 Deployment Workflow

### First Time Setup

```bash
# 1. Clone repository
git clone https://github.com/avirajsharma-ops/Tailo.git
cd Tailo

# 2. Create .env file with production values
nano .env
# Add your real environment variables

# 3. Initialize SSL (one-time only)
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh

# 4. Build and start
docker-compose build --no-cache
docker-compose up -d
```

### Subsequent Deployments

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 3. Check status
docker-compose ps
docker-compose logs -f
```

---

## 🔍 Verification

### Check Build Success

```bash
# View build logs
docker-compose build 2>&1 | tee build.log

# Should see:
# ✓ Compiled successfully
# ✓ Checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages
```

### Check Runtime

```bash
# Check if containers are running
docker-compose ps

# Should show:
# hrms-app     running
# nginx        running
# certbot      running

# Check application logs
docker-compose logs hrms-app

# Test the application
curl -I https://zenova.sbs
```

---

## 🛠️ Troubleshooting

### Build Still Failing?

```bash
# 1. Clean Docker cache
docker system prune -a --volumes

# 2. Remove old images
docker rmi $(docker images -q)

# 3. Rebuild from scratch
docker-compose build --no-cache --pull

# 4. Check Docker logs
docker-compose logs --tail=100
```

### Runtime Database Connection Issues?

```bash
# 1. Check environment variables
docker-compose exec hrms-app env | grep MONGODB_URI

# 2. Test MongoDB connection
docker-compose exec hrms-app node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(e => console.log('❌ Error:', e.message))
"

# 3. Check MongoDB is accessible
# If using external MongoDB, ensure firewall allows connection
```

### Container Keeps Restarting?

```bash
# Check logs for errors
docker-compose logs hrms-app --tail=50

# Common issues:
# - Wrong MONGODB_URI
# - MongoDB not accessible
# - Port 3000 already in use
# - Missing environment variables
```

---

## 📊 Docker Commands Reference

### Building

```bash
# Build with cache
docker-compose build

# Build without cache (recommended)
docker-compose build --no-cache

# Build specific service
docker-compose build hrms-app

# Build with pull (get latest base images)
docker-compose build --pull
```

### Running

```bash
# Start in background
docker-compose up -d

# Start in foreground (see logs)
docker-compose up

# Start specific service
docker-compose up -d hrms-app

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Monitoring

```bash
# View running containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f hrms-app
docker-compose logs -f nginx

# View last 50 lines
docker-compose logs --tail=50

# Container stats
docker stats
```

### Debugging

```bash
# Enter container shell
docker-compose exec hrms-app sh

# Run command in container
docker-compose exec hrms-app npm --version

# Inspect container
docker inspect hrms-app

# View container processes
docker-compose top
```

### Cleanup

```bash
# Remove stopped containers
docker-compose rm

# Remove all unused images
docker image prune -a

# Remove all unused volumes
docker volume prune

# Complete cleanup (careful!)
docker system prune -a --volumes
```

---

## 🔒 Security Notes

### Docker Warnings

You may see these warnings during build:
```
- SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data
```

**This is expected** because we're using dummy values during build. The real secrets are:
- ✅ Not committed to git
- ✅ Only in `.env` file (gitignored)
- ✅ Only passed at runtime via docker-compose
- ✅ Never exposed in the built image

### Best Practices

1. **Never commit `.env` file**
2. **Use strong secrets in production**
3. **Rotate secrets regularly**
4. **Use Docker secrets for production** (optional):
   ```yaml
   secrets:
     mongodb_uri:
       external: true
   ```

---

## 📁 File Structure

```
Talio/
├── Dockerfile                  # Docker image definition
├── docker-compose.yml          # Services orchestration
├── .env                        # Environment variables (gitignored)
├── .dockerignore              # Files to exclude from build
├── lib/
│   └── mongodb.js             # Database connection (fixed)
├── next.config.js             # Next.js config (build optimizations)
└── package.json               # Build script (SKIP_ENV_VALIDATION)
```

---

## ✅ Build Success Checklist

After pulling the latest code, your build should:

- [x] Not require MONGODB_URI during build
- [x] Use dummy values for build-time env vars
- [x] Complete without database connection errors
- [x] Generate all static pages successfully
- [x] Create optimized production build
- [x] Start successfully with real env vars at runtime

---

## 🎯 Quick Commands

### Full Deployment
```bash
git pull && docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

### Check Everything
```bash
docker-compose ps && docker-compose logs --tail=20
```

### Emergency Restart
```bash
docker-compose restart && docker-compose logs -f
```

---

**Your Docker build should now work perfectly! 🎉**

The application will build without requiring database connection and run with real credentials at runtime.

