# 🔒 SSL Setup Guide for HRMS - zenova.sbs

## ✅ Files Already Configured

I've updated the following files for SSL support:

1. **nginx.conf** - Updated with SSL configuration
2. **docker-compose.yml** - Updated with SSL certificate volumes

---

## 🚀 Quick Setup Commands (Run on Digital Ocean Server)

### Step 1: Connect to Your Server
```bash
# From your local machine (VS Code terminal)
ssh root@zenova.sbs
```

### Step 2: Navigate to Project Directory
```bash
cd /root/hrms
```

### Step 3: Install Certbot (if not installed)
```bash
sudo apt update
sudo apt install certbot -y
```

### Step 4: Stop Running Containers
```bash
docker-compose down
```

### Step 5: Obtain SSL Certificate
```bash
# This will ask for your email and agreement to terms
sudo certbot certonly --standalone \
  -d zenova.sbs \
  -d www.zenova.sbs
```

**Follow the prompts:**
- Enter your email address
- Agree to terms of service (Y)
- Share email with EFF (optional - Y/N)

### Step 6: Verify Certificate
```bash
# Check if certificate files exist
ls -la /etc/letsencrypt/live/zenova.sbs/

# Should show:
# - fullchain.pem
# - privkey.pem
# - cert.pem
# - chain.pem
```

### Step 7: Set Permissions
```bash
sudo chmod 644 /etc/letsencrypt/live/zenova.sbs/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/zenova.sbs/privkey.pem
```

### Step 8: Create Certbot Directory
```bash
sudo mkdir -p /var/www/certbot
```

### Step 9: Pull Latest Code
```bash
git pull origin main
```

### Step 10: Build and Start with SSL
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Step 11: Check Logs
```bash
# Watch all logs
docker-compose logs -f

# Or just nginx logs
docker-compose logs -f nginx
```

### Step 12: Test HTTPS
```bash
# Test from server
curl -I https://zenova.sbs

# Should return: HTTP/2 200
```

---

## 🔄 Setup Auto-Renewal

### Create Renewal Script
```bash
cat > /root/renew-ssl-hrms.sh << 'EOF'
#!/bin/bash
cd /root/hrms
docker-compose stop nginx
certbot renew --standalone --quiet
docker-compose start nginx
echo "SSL renewed at $(date)" >> /var/log/ssl-renewal.log
EOF

chmod +x /root/renew-ssl-hrms.sh
```

### Add to Crontab
```bash
# Edit crontab
crontab -e

# Add this line (renews twice daily at midnight and noon)
0 0,12 * * * /root/renew-ssl-hrms.sh >> /var/log/ssl-renewal.log 2>&1
```

---

## 🧪 Testing Commands

### Test SSL Certificate
```bash
# Check certificate expiry
openssl x509 -enddate -noout -in /etc/letsencrypt/live/zenova.sbs/fullchain.pem

# Test SSL connection
echo | openssl s_client -servername zenova.sbs -connect zenova.sbs:443 2>/dev/null | grep -E "subject=|issuer="

# Check certificate details
openssl x509 -in /etc/letsencrypt/live/zenova.sbs/fullchain.pem -text -noout | head -20
```

### Test HTTPS Redirect
```bash
# HTTP should redirect to HTTPS
curl -I http://zenova.sbs

# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://zenova.sbs/
```

### Test Application
```bash
# Test main page
curl -I https://zenova.sbs

# Test API endpoint
curl -I https://zenova.sbs/api/health
```

---

## 🔧 Troubleshooting

### Issue 1: Certificate Not Found
```bash
# Check if certbot is installed
certbot --version

# List all certificates
sudo certbot certificates

# Re-obtain certificate
sudo certbot certonly --standalone -d zenova.sbs -d www.zenova.sbs
```

### Issue 2: Port 80/443 Already in Use
```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Stop nginx if running
docker-compose stop nginx

# Or stop all containers
docker-compose down
```

### Issue 3: Nginx SSL Errors
```bash
# Test nginx configuration
docker-compose exec nginx nginx -t

# View nginx error logs
docker-compose logs nginx | grep error

# Restart nginx
docker-compose restart nginx
```

### Issue 4: Permission Denied
```bash
# Fix certificate permissions
sudo chmod 644 /etc/letsencrypt/live/zenova.sbs/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/zenova.sbs/privkey.pem

# Fix directory permissions
sudo chmod 755 /etc/letsencrypt/live/
sudo chmod 755 /etc/letsencrypt/archive/
```

### Issue 5: DNS Not Pointing to Server
```bash
# Check DNS resolution
nslookup zenova.sbs
dig zenova.sbs

# Should point to your Digital Ocean IP
```

---

## 📊 What's Been Updated

### nginx.conf Changes
- ✅ Added HTTP to HTTPS redirect (port 80 → 443)
- ✅ Added SSL certificate paths
- ✅ Configured modern SSL protocols (TLS 1.2, 1.3)
- ✅ Added strong cipher suites
- ✅ Enabled SSL session caching
- ✅ Added OCSP stapling
- ✅ Added security headers (HSTS, X-Frame-Options, etc.)
- ✅ Configured Let's Encrypt challenge path

### docker-compose.yml Changes
- ✅ Added SSL certificate volume mounts
- ✅ Added certbot directory mount
- ✅ Set nginx volumes to read-only
- ✅ Added container names

---

## 🎯 Complete Setup Script (All-in-One)

Save this as `setup-ssl-complete.sh` and run with `sudo bash setup-ssl-complete.sh`:

```bash
#!/bin/bash
set -e

echo "🔒 Setting up SSL for zenova.sbs..."

# Install certbot
apt update && apt install certbot -y

# Stop containers
cd /root/hrms
docker-compose down

# Obtain certificate
certbot certonly --standalone \
  -d zenova.sbs \
  -d www.zenova.sbs \
  --non-interactive \
  --agree-tos \
  --email admin@zenova.sbs

# Set permissions
chmod 644 /etc/letsencrypt/live/zenova.sbs/fullchain.pem
chmod 600 /etc/letsencrypt/live/zenova.sbs/privkey.pem

# Create certbot directory
mkdir -p /var/www/certbot

# Pull latest code
git pull origin main

# Build and start
docker-compose build --no-cache
docker-compose up -d

# Wait for startup
sleep 30

# Test
curl -I https://zenova.sbs

echo "✅ SSL setup complete!"
echo "Visit: https://zenova.sbs"
```

---

## 📱 After Setup

Your application will be available at:
- **HTTPS**: https://zenova.sbs ✅
- **HTTPS**: https://www.zenova.sbs ✅
- **HTTP**: http://zenova.sbs (redirects to HTTPS) ✅

---

## 🔐 Security Features Enabled

- ✅ TLS 1.2 and 1.3 only
- ✅ Strong cipher suites
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ OCSP Stapling
- ✅ Perfect Forward Secrecy
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Rate limiting on API endpoints
- ✅ Automatic HTTP to HTTPS redirect

---

## 📞 Quick Reference

### Useful Commands
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Start services
docker-compose up -d

# Rebuild
docker-compose build --no-cache && docker-compose up -d

# Check SSL certificate expiry
sudo certbot certificates

# Renew SSL manually
sudo /root/renew-ssl-hrms.sh

# Test nginx config
docker-compose exec nginx nginx -t
```

---

## ✅ Checklist

Before running setup:
- [ ] Connected to Digital Ocean server via SSH
- [ ] In `/root/hrms` directory
- [ ] DNS pointing to server (zenova.sbs → your IP)
- [ ] Ports 80 and 443 open in firewall
- [ ] Docker and Docker Compose installed

After setup:
- [ ] HTTPS working (https://zenova.sbs)
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate valid
- [ ] Auto-renewal configured
- [ ] Application accessible

---

**Ready to set up SSL? Run the commands above on your Digital Ocean server!** 🚀

