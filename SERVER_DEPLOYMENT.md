# 🚀 Server Deployment Guide with SSL

Complete guide for deploying Talio HRMS to your server with automatic SSL certificates.

## 📋 Prerequisites

Before starting, ensure:
- [ ] Domain `zenova.sbs` and `www.zenova.sbs` point to your server's IP
- [ ] Docker and Docker Compose installed on server
- [ ] Ports 80 and 443 are open in firewall
- [ ] Git installed on server

---

## 🔧 One-Time Server Setup

### Step 1: Clone Repository

```bash
# SSH into your server
ssh user@your-server-ip

# Clone the repository
git clone https://github.com/avirajsharma-ops/Tailo.git
cd Tailo
```

### Step 2: Configure Environment

```bash
# Create .env file with your production settings
nano .env
```

Add these variables:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 3: Initialize SSL Certificates

```bash
# Make the SSL setup script executable
chmod +x init-letsencrypt.sh

# Run the SSL initialization (ONLY ONCE)
./init-letsencrypt.sh
```

This will:
- Download SSL parameters from certbot
- Create temporary certificates
- Request real Let's Encrypt certificates
- Configure automatic renewal

### Step 4: Start Application

```bash
# Build and start all services
docker-compose up -d --build
```

### Step 5: Verify Deployment

```bash
# Check if all containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

Visit https://zenova.sbs - you should see your app with SSL! 🔒

---

## 🔄 Deploying Updates (Every Time You Push Code)

### On Your Local Machine:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main
```

### On Your Server:

```bash
# SSH into server
ssh user@your-server-ip
cd Talio

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs --tail=50
```

**That's it!** SSL certificates persist automatically - no need to reinstall! ✅

---

## 🔐 SSL Certificate Details

### Automatic Renewal

The certbot container automatically renews certificates:
- Checks for renewal every 12 hours
- Renews when 30 days or less remaining
- Certificates valid for 90 days
- Email notifications sent to: avi2001raj@gmail.com

### Certificate Location

Certificates are stored in `./certbot/conf/` and persist across deployments.

### Manual Certificate Check

```bash
# View certificate details
docker-compose exec certbot certbot certificates

# Manually renew (if needed)
docker-compose exec certbot certbot renew

# Force renewal
docker-compose exec certbot certbot renew --force-renewal
```

---

## 🛠️ Useful Commands

### Container Management

```bash
# View all containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f nginx
docker-compose logs -f hrms-app
docker-compose logs -f certbot

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Start services
docker-compose up -d
```

### Debugging

```bash
# Enter nginx container
docker-compose exec nginx sh

# Enter app container
docker-compose exec hrms-app sh

# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### Database

```bash
# If using MongoDB container
docker-compose exec mongodb mongosh

# Backup database
docker-compose exec mongodb mongodump --out /backup

# Restore database
docker-compose exec mongodb mongorestore /backup
```

---

## 📊 Monitoring

### Check Application Health

```bash
# Check if app is responding
curl -I https://zenova.sbs

# Check SSL certificate
curl -vI https://zenova.sbs 2>&1 | grep -i "SSL certificate"

# Test SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=zenova.sbs
```

### View Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused images
docker system prune -a
```

---

## 🔥 Troubleshooting

### Issue: SSL Certificate Not Working

```bash
# Check certbot logs
docker-compose logs certbot

# Verify DNS is correct
nslookup zenova.sbs

# Ensure ports are open
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Restart nginx
docker-compose restart nginx
```

### Issue: Application Not Starting

```bash
# Check logs
docker-compose logs hrms-app

# Verify environment variables
docker-compose exec hrms-app env | grep MONGODB

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Issue: Database Connection Failed

```bash
# Check MongoDB connection string in .env
cat .env | grep MONGODB_URI

# Test MongoDB connection
docker-compose exec hrms-app node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.log(e))"
```

### Issue: Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

---

## 🔒 Security Best Practices

1. **Keep Secrets Safe**
   - Never commit `.env` file to git
   - Use strong passwords
   - Rotate secrets regularly

2. **Update Regularly**
   - Keep Docker images updated
   - Update dependencies: `npm audit fix`
   - Monitor security advisories

3. **Firewall Configuration**
   ```bash
   sudo ufw enable
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   ```

4. **Backup Strategy**
   - Regular database backups
   - Store backups off-server
   - Test restore procedures

---

## 📁 File Structure on Server

```
/path/to/Talio/
├── docker-compose.yml          # Services configuration
├── Dockerfile                  # App container build
├── nginx.ssl.conf              # Nginx SSL config
├── init-letsencrypt.sh         # SSL setup script (run once)
├── .env                        # Environment variables (not in git)
├── certbot/                    # SSL certificates (auto-created)
│   ├── conf/                   # Certificate files
│   └── www/                    # ACME challenge
└── app/                        # Application code
```

---

## 🎯 Quick Reference

### First Time Setup
```bash
git clone <repo>
cd Talio
nano .env                       # Configure environment
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh          # Setup SSL (ONCE)
docker-compose up -d --build
```

### Every Deployment
```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
docker-compose logs -f
curl -I https://zenova.sbs
```

---

## ✅ Deployment Checklist

- [ ] DNS configured (zenova.sbs → server IP)
- [ ] Docker & Docker Compose installed
- [ ] Ports 80 & 443 open
- [ ] Repository cloned
- [ ] .env file configured
- [ ] SSL certificates initialized
- [ ] Application running
- [ ] HTTPS working
- [ ] Auto-renewal configured

---

## 📞 Support

For detailed SSL setup information, see: `SSL_SETUP.md`

For local development, see: `QUICK_START.md`

---

**Your application is now deployed with automatic SSL! 🎉**

SSL certificates will automatically renew and persist across all future deployments.

