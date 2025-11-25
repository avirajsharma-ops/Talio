# 🚀 Deployment Guide for mwg.talio.in

## Current Status
- **Domain:** mwg.talio.in
- **Server:** Hostinger VPS
- **Current Issue:** Backend giving 500 errors, SSL not configured

---

## 📋 Prerequisites

1. **DNS Configuration** (Already done)
   - Point `mwg.talio.in` to your Hostinger VPS IP
   - Point `www.mwg.talio.in` to your Hostinger VPS IP

2. **Server Access**
   - SSH access to Hostinger VPS
   - Root or sudo privileges

3. **Ports Open**
   - Port 80 (HTTP)
   - Port 443 (HTTPS)

---

## 🔧 Step-by-Step Deployment

### Step 1: Connect to Your Server

```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

### Step 2: Navigate to Project Directory

```bash
cd /path/to/Talio
# Example: cd /var/www/Talio or cd ~/Talio
```

### Step 3: Pull Latest Changes

```bash
git pull origin main
```

### Step 4: Update Environment Variables

The `.env` file has been created with production settings. Verify it:

```bash
cat .env
```

Make sure these are set correctly:
- `NEXTAUTH_URL=https://mwg.talio.in`
- `NEXT_PUBLIC_APP_URL=https://mwg.talio.in`
- `MONGODB_URI=` (your MongoDB connection string)

### Step 5: Stop Existing Containers

```bash
docker-compose down
```

### Step 6: Remove Old Certificates (if any)

```bash
rm -rf certbot/
```

### Step 7: Make SSL Setup Script Executable

```bash
chmod +x setup-ssl-mwg.sh
```

### Step 8: Run SSL Setup

```bash
sudo ./setup-ssl-mwg.sh
```

This script will:
- Create necessary directories
- Request SSL certificates from Let's Encrypt
- Configure nginx with SSL
- Start the application

### Step 9: Verify Deployment

```bash
# Check if containers are running
docker-compose ps

# Check logs
docker-compose logs -f hrms-app

# Check nginx logs
docker-compose logs -f nginx
```

---

## 🔍 Troubleshooting Backend 500 Errors

### Check 1: Verify Environment Variables

```bash
# Check if .env file exists
ls -la .env

# View environment variables (be careful with sensitive data)
cat .env | grep -v "PRIVATE_KEY\|SECRET"
```

### Check 2: Check Application Logs

```bash
# View application logs
docker-compose logs hrms-app --tail=100

# Follow logs in real-time
docker-compose logs -f hrms-app
```

### Check 3: Check MongoDB Connection

```bash
# Test MongoDB connection
docker-compose exec hrms-app node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ MongoDB Connected'); process.exit(0); })
  .catch(err => { console.error('❌ MongoDB Error:', err); process.exit(1); });
"
```

### Check 4: Rebuild Application

If environment variables changed:

```bash
# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Check 5: Check Disk Space

```bash
df -h
```

If disk is full:

```bash
# Clean up Docker
docker system prune -a --volumes
```

### Check 6: Check Memory

```bash
free -h
```

### Check 7: Verify nginx Configuration

```bash
# Test nginx config
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload
```

---

## 🐛 Common Issues and Solutions

### Issue 1: "Cannot connect to MongoDB"

**Solution:**
1. Check if MongoDB URI is correct in `.env`
2. Verify MongoDB Atlas IP whitelist includes your server IP
3. Check if MongoDB credentials are correct

```bash
# Add your server IP to MongoDB Atlas:
# 1. Go to MongoDB Atlas Dashboard
# 2. Network Access → Add IP Address
# 3. Add your Hostinger VPS IP or use 0.0.0.0/0 (allow all)
```

### Issue 2: "SSL certificate not found"

**Solution:**
1. Make sure DNS is pointing to your server
2. Wait for DNS propagation (can take up to 48 hours)
3. Check if ports 80 and 443 are open

```bash
# Check if ports are open
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# If using firewall
sudo ufw allow 80
sudo ufw allow 443
```

### Issue 3: "502 Bad Gateway"

**Solution:**
1. Application container is not running

```bash
# Check container status
docker-compose ps

# Restart application
docker-compose restart hrms-app
```

### Issue 4: "500 Internal Server Error"

**Solution:**
1. Check application logs for specific error
2. Verify all environment variables are set
3. Check MongoDB connection

```bash
# View detailed logs
docker-compose logs hrms-app --tail=200

# Common causes:
# - Missing environment variables
# - MongoDB connection failed
# - Build errors
```

### Issue 5: "Out of memory"

**Solution:**
1. Increase server memory
2. Or optimize Docker memory limits

```bash
# Add to docker-compose.yml under hrms-app:
    mem_limit: 1g
    mem_reservation: 512m
```

---

## 📊 Monitoring

### Check Application Health

```bash
# Check if app is responding
curl http://localhost:3000/api/health

# Check SSL
curl https://mwg.talio.in

# Check response time
time curl https://mwg.talio.in
```

### View Real-time Logs

```bash
# All services
docker-compose logs -f

# Just application
docker-compose logs -f hrms-app

# Just nginx
docker-compose logs -f nginx
```

### Check Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop
```

---

## 🔄 Updating the Application

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# 3. Check logs
docker-compose logs -f
```

---

## 🆘 Emergency Commands

### Restart Everything

```bash
docker-compose restart
```

### Stop Everything

```bash
docker-compose down
```

### Start Fresh

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

### View All Logs

```bash
docker-compose logs --tail=500 > logs.txt
cat logs.txt
```

---

## 📞 Support

If you encounter issues:

1. **Check logs first:**
   ```bash
   docker-compose logs hrms-app --tail=100
   ```

2. **Check this file for common solutions**

3. **Collect information:**
   - Error messages from logs
   - Server IP and domain
   - Docker container status
   - Environment variables (without secrets)

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible at https://mwg.talio.in
- [ ] SSL certificate valid (green padlock in browser)
- [ ] Login working
- [ ] Database connection working
- [ ] API endpoints responding
- [ ] No errors in logs
- [ ] Auto-renewal configured for SSL

---

## 🔐 Security Notes

1. **Change default secrets in `.env`:**
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - `CRON_SECRET`

2. **Restrict MongoDB access:**
   - Use specific IP whitelist instead of 0.0.0.0/0

3. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Monitor logs regularly:**
   ```bash
   docker-compose logs --tail=100
   ```

---

## 📝 Notes

- SSL certificates auto-renew every 12 hours via certbot container
- Application restarts automatically on failure (unless-stopped policy)
- Nginx reloads every 6 hours to pick up renewed certificates
- All data persists in Docker volumes

---

**Last Updated:** 2025-11-11
**Domain:** mwg.talio.in
**Server:** Hostinger VPS

