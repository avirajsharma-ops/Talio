# 🚀 Fresh Server Installation Guide - Docker Only

Complete step-by-step guide to deploy Talio HRMS from scratch using Docker with SSL.

---

## 📋 Prerequisites

- Fresh Ubuntu/Debian server
- Root access
- Domain `zenova.sbs` pointing to your server IP
- Ports 80 and 443 open

---

## 🔧 Step 1: Clean Everything on Server

```bash
# SSH into your server
ssh root@your-server-ip

# Stop and remove all Docker containers
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove all Docker images
docker rmi $(docker images -q) 2>/dev/null || true

# Remove all Docker volumes
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Remove project directory if exists
rm -rf ~/hrms

# Stop and disable system nginx if running
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
```

---

## 🐳 Step 2: Install Docker & Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker
systemctl start docker
systemctl enable docker

# Verify Docker installation
docker --version
docker-compose --version
```

---

## 📥 Step 3: Clone Repository

```bash
# Clone the project
cd ~
git clone https://github.com/avirajsharma-ops/Tailo.git hrms
cd hrms

# Verify files
ls -la
```

---

## 🔐 Step 4: Create Environment File

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 48)
NEXTAUTH_SECRET=$(openssl rand -base64 48)

# Create .env file
cat > .env <<EOF
NODE_ENV=production
PORT=3000

# MongoDB Atlas connection
MONGODB_URI=mongodb+srv://avirajsharma_db_user:aviraj@taliocluster.mvnlgwj.mongodb.net/hrms_db?

# Authentication secrets
NEXTAUTH_URL=https://zenova.sbs
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET

# Public app configuration
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
EOF

# Set permissions
chmod 600 .env

# Verify .env file
echo "✅ .env file created"
cat .env | sed 's/\(SECRET=\).*/\1***HIDDEN***/g' | sed 's/\(aviraj\)@/***PASSWORD***@/g'
```

---

## 🏗️ Step 5: Build Docker Image

```bash
# Build the application
docker-compose build --no-cache

# This will take 5-10 minutes
# Wait for "Successfully built" message
```

---

## 🔒 Step 6: Setup SSL Certificates

```bash
# Make SSL setup script executable
chmod +x setup-ssl.sh

# Run SSL setup (as root)
sudo ./setup-ssl.sh
```

**What this does:**
- Creates certbot directories
- Obtains SSL certificate from Let's Encrypt
- Sets up auto-renewal (every 12 hours)
- Configures certificates for zenova.sbs and www.zenova.sbs

**Expected output:**
```
✅ SSL certificate obtained successfully!
✅ Certificate files verified
```

---

## 🚀 Step 7: Start All Services

```bash
# Start all containers
docker-compose up -d

# Check container status
docker-compose ps
```

**Expected output:**
```
NAME                IMAGE               STATUS
hrms-app-1          hrms-hrms-app       Up
hrms-nginx          nginx:alpine        Up
hrms-certbot        certbot/certbot     Up
```

---

## ✅ Step 8: Verify Everything Works

### Check Containers
```bash
docker-compose ps
```

### Check Logs
```bash
# App logs
docker-compose logs -f hrms-app

# Nginx logs
docker-compose logs -f nginx

# Look for "Ready in XXXXms" in app logs
```

### Test HTTP → HTTPS Redirect
```bash
curl -I http://zenova.sbs
# Should show: HTTP/1.1 301 Moved Permanently
# Location: https://zenova.sbs/
```

### Test HTTPS
```bash
curl -I https://zenova.sbs
# Should show: HTTP/2 200
```

### Test in Browser
Open: https://zenova.sbs

**You should see:**
- ✅ Secure padlock icon
- ✅ Login page loads
- ✅ No certificate warnings

---

## 🔍 Step 9: Run Diagnostics

```bash
# Check environment variables
docker-compose exec hrms-app node debug-env.js
```

**Expected output:**
```
✅ MONGODB_URI: Set correctly
✅ JWT_SECRET: Set correctly
✅ NEXTAUTH_SECRET: Set correctly
✅ MongoDB connection successful!
Database: hrms_db
Host: taliocluster.mvnlgwj.mongodb.net
```

---

## 📱 Step 10: Verify Android App Links

```bash
# Test assetlinks.json
curl https://zenova.sbs/.well-known/assetlinks.json
```

**Expected output:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "sbs.zenova.twa",
    "sha256_cert_fingerprints": ["CB:1D:C4:F1:B2:42:6A:B2:56:57:BC:D8:2E:75:FD:A6:38:DE:97:AD:20:D2:4B:AD:A2:D8:CC:02:57:DB:08:9A"]
  }
}]
```

---

## 🔄 Deploying Updates

When you push changes to GitHub:

```bash
cd ~/hrms

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f hrms-app
```

---

## 🔐 SSL Certificate Renewal

Certificates auto-renew every 12 hours. To manually renew:

```bash
cd ~/hrms
sudo ./setup-ssl.sh
```

Or:

```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

---

## 🛠️ Useful Commands

```bash
# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f hrms-app

# View nginx logs only
docker-compose logs -f nginx

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Check container status
docker-compose ps

# Access app container shell
docker-compose exec hrms-app sh

# Check environment variables
docker-compose exec hrms-app env | grep MONGODB

# Run diagnostics
docker-compose exec hrms-app node debug-env.js
```

---

## 🔥 Firewall Configuration

```bash
# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## 🚨 Troubleshooting

### Issue: SSL certificate failed

**Solution:**
```bash
# Check DNS
dig zenova.sbs

# Ensure port 80 is accessible
curl -I http://zenova.sbs

# Check firewall
sudo ufw status

# Try again
sudo ./setup-ssl.sh
```

### Issue: Container won't start

**Solution:**
```bash
# Check logs
docker-compose logs hrms-app

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Issue: Database connection failed

**Solution:**
```bash
# Check .env file
cat .env | grep MONGODB_URI

# Run diagnostics
docker-compose exec hrms-app node debug-env.js

# Check MongoDB Atlas network access
# Go to MongoDB Atlas → Network Access
# Add server IP or allow 0.0.0.0/0
```

### Issue: Port 80 already in use

**Solution:**
```bash
# Check what's using port 80
sudo lsof -i :80

# Stop system nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Try again
docker-compose up -d
```

---

## ✅ Success Checklist

After installation, verify:

- [ ] Docker and Docker Compose installed
- [ ] Repository cloned to ~/hrms
- [ ] .env file created with correct values
- [ ] Docker image built successfully
- [ ] SSL certificates obtained
- [ ] All containers running (`docker-compose ps`)
- [ ] HTTP redirects to HTTPS
- [ ] https://zenova.sbs loads with valid SSL
- [ ] No certificate warnings in browser
- [ ] Can login to application
- [ ] Data loads from MongoDB
- [ ] assetlinks.json accessible

---

## 📊 Architecture

```
Internet (Port 443)
    ↓
Docker Nginx (SSL Termination)
    ↓
Next.js App (Port 3000)
    ↓
MongoDB Atlas (Cloud)
```

**Components:**
- **Nginx**: Handles SSL, redirects HTTP→HTTPS, proxies to app
- **Certbot**: Manages SSL certificates, auto-renewal
- **Next.js App**: Your HRMS application
- **MongoDB Atlas**: Cloud database

---

## 🎉 You're Done!

Your application is now running with:
- ✅ HTTPS/SSL encryption
- ✅ Auto-renewing certificates
- ✅ Docker containerization
- ✅ MongoDB Atlas database
- ✅ Android App Links configured
- ✅ PWA support

**Access your app:** https://zenova.sbs

---

**Need help?** Check the logs:
```bash
docker-compose logs -f
```

