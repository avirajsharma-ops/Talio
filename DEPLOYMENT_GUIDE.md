# 🚀 HRMS PWA Deployment Guide - Digital Ocean Ubuntu Server

## 📋 Prerequisites

### Digital Ocean Droplet Requirements:
- ✅ **OS**: Ubuntu 20.04 or 22.04 LTS
- ✅ **RAM**: Minimum 2GB (recommended 4GB)
- ✅ **Storage**: Minimum 50GB SSD
- ✅ **CPU**: 1 vCPU (recommended 2 vCPU)
- ✅ **Network**: Public IP address

### Your Droplet Info:
- **Name**: mw-hrms
- **IP**: 199.59.27.50 (IPv4), 10.122.0.7 (Private)
- **Specs**: 2GB Memory / 1 AMD vCPU / 50GB Disk / BLR1 - Ubuntu 22.04 x64

---

## 🔧 Step 1: Connect to Your Droplet

### SSH Connection:
```bash
# Connect to your droplet
ssh root@199.59.27.50

# Or if you have a non-root user
ssh your-username@199.59.27.50
```

### Create Non-Root User (if using root):
```bash
# Create new user
adduser hrms-admin

# Add to sudo group
usermod -aG sudo hrms-admin

# Switch to new user
su - hrms-admin
```

---

## 🚀 Step 2: Quick Deployment (Automated)

### Option A: One-Command Deployment
```bash
# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/your-username/hrms/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### Option B: Manual Deployment (Step by Step)

#### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes
exit
# SSH back in
```

#### 3. Clone Repository
```bash
# Install Git
sudo apt install git -y

# Clone your HRMS repository
git clone https://github.com/deependr20/hrms.git
cd hrms
```

#### 4. Configure Environment
```bash
# Create environment file
nano .env
```

Add your configuration:
```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://hrms:your-password@your-cluster.mongodb.net/hrms?

# JWT Configuration  
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-at-least-32-characters

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-key-here-also-make-it-random-32-chars
NEXTAUTH_URL=http://199.59.27.50

# Node Environment
NODE_ENV=production
```

#### 5. Deploy Application
```bash
# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps
```

---

## 🔍 Step 3: Verify Deployment

### Check Services:
```bash
# View running containers
docker-compose ps

# Check logs
docker-compose logs -f hrms-app
docker-compose logs -f nginx
```

### Test Application:
```bash
# Test local access
curl http://localhost

# Test external access
curl http://199.59.27.50
```

### Access Your PWA:
- **URL**: `http://199.59.27.50`
- **PWA Install**: Available in Chrome/Edge browsers
- **Mobile**: Add to home screen option

---

## 🔒 Step 4: Security & SSL (Optional but Recommended)

### Install Certbot for SSL:
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Configure Firewall:
```bash
# Enable UFW firewall
sudo ufw enable

# Allow necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Check status
sudo ufw status
```

---

## 📱 Step 5: PWA Testing

### Desktop Testing:
1. Open Chrome/Edge browser
2. Visit `http://199.59.27.50`
3. Wait for install prompt (3 seconds)
4. Click "Install" to add to desktop

### Mobile Testing:
1. Open mobile browser
2. Visit the URL
3. Tap browser menu (⋮)
4. Select "Add to Home Screen"
5. App icon appears on home screen

### Offline Testing:
1. Install the PWA
2. Disconnect internet
3. Open the app - should work offline
4. Reconnect - data syncs automatically

---

## 🛠️ Step 6: Management Commands

### Application Management:
```bash
# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Stop application
docker-compose down

# Update application
git pull origin main
docker-compose up -d --build

# View resource usage
docker stats
```

### Database Backup:
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
# MongoDB backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"
mkdir -p $BACKUP_DIR

# Backup command (adjust for your MongoDB setup)
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/hrms_backup_$DATE"
```

---

## 🔧 Troubleshooting

### Common Issues:

#### 1. Port Already in Use:
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# Kill process if needed
sudo kill -9 <PID>
```

#### 2. Docker Permission Denied:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
```

#### 3. Application Won't Start:
```bash
# Check logs
docker-compose logs hrms-app

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

#### 4. PWA Not Installing:
- Ensure HTTPS is enabled (required for PWA)
- Check manifest.json accessibility
- Verify service worker registration
- Clear browser cache

### Log Locations:
```bash
# Application logs
docker-compose logs hrms-app

# Nginx logs
docker-compose logs nginx

# System logs
sudo journalctl -u docker
```

---

## 📊 Monitoring & Maintenance

### System Monitoring:
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check Docker resources
docker system df
```

### Regular Maintenance:
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker resources
docker system prune -f

# Update application
cd /home/$USER/hrms
git pull origin main
docker-compose up -d --build
```

---

## 🎯 Production Checklist

### Before Going Live:
- [ ] SSL certificate installed
- [ ] Domain name configured
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Monitoring setup
- [ ] Firewall configured
- [ ] PWA tested on multiple devices
- [ ] Performance testing completed

### Security Checklist:
- [ ] Non-root user created
- [ ] SSH key authentication
- [ ] Firewall enabled
- [ ] SSL/HTTPS enabled
- [ ] Strong passwords used
- [ ] Regular security updates
- [ ] Database access restricted

---

## 🆘 Support & Resources

### Useful Links:
- **Digital Ocean Docs**: https://docs.digitalocean.com/
- **Docker Docs**: https://docs.docker.com/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **PWA Guidelines**: https://web.dev/progressive-web-apps/

### Quick Commands Reference:
```bash
# Application status
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull && docker-compose up -d --build

# System resources
htop
df -h
free -h
```

---

## 🎉 Success!

Your HRMS PWA is now deployed and running on Digital Ocean! 

**Access URL**: `http://199.59.27.50`

The application includes:
- ✅ Full PWA functionality
- ✅ Offline support
- ✅ Mobile installation
- ✅ Production-ready setup
- ✅ Nginx reverse proxy
- ✅ Docker containerization

**Next Steps**:
1. Configure your domain name
2. Set up SSL certificates
3. Test PWA installation
4. Share with your team!

🚀 **Your HRMS PWA is live and ready for users!**
