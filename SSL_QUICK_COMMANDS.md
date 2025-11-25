# 🚀 SSL Setup - Quick Commands for zenova.sbs

## 📋 Copy-Paste Commands (Run on Digital Ocean Server)

### Option 1: Automated Setup (Recommended)
```bash
# Connect to server
ssh root@zenova.sbs

# Navigate to project
cd /root/hrms

# Pull latest changes
git pull origin main

# Run automated SSL setup
sudo bash setup-ssl-zenova.sh
```

---

### Option 2: Manual Step-by-Step

```bash
# 1. Connect to server
ssh root@zenova.sbs

# 2. Go to project directory
cd /root/hrms

# 3. Install certbot
sudo apt update && sudo apt install certbot -y

# 4. Stop containers
docker-compose down

# 5. Get SSL certificate
sudo certbot certonly --standalone -d zenova.sbs -d www.zenova.sbs

# 6. Create certbot directory
sudo mkdir -p /var/www/certbot

# 7. Pull latest code
git pull origin main

# 8. Build and start with SSL
docker-compose build --no-cache
docker-compose up -d

# 9. Test HTTPS
curl -I https://zenova.sbs
```

---

## 🔄 Auto-Renewal Setup

```bash
# Create renewal script
cat > /root/renew-ssl-hrms.sh << 'EOF'
#!/bin/bash
cd /root/hrms
docker-compose stop nginx
certbot renew --standalone --quiet
docker-compose start nginx
echo "SSL renewed at $(date)" >> /var/log/ssl-renewal.log
EOF

# Make executable
chmod +x /root/renew-ssl-hrms.sh

# Add to crontab (runs twice daily)
(crontab -l 2>/dev/null; echo "0 0,12 * * * /root/renew-ssl-hrms.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -
```

---

## 🧪 Testing Commands

```bash
# Test HTTPS
curl -I https://zenova.sbs

# Test HTTP redirect
curl -I http://zenova.sbs

# Check certificate expiry
sudo certbot certificates

# View certificate details
openssl x509 -enddate -noout -in /etc/letsencrypt/live/zenova.sbs/fullchain.pem

# Test SSL connection
echo | openssl s_client -servername zenova.sbs -connect zenova.sbs:443 2>/dev/null | grep "Verify return code"
```

---

## 📊 Monitoring Commands

```bash
# View all logs
docker-compose logs -f

# View nginx logs only
docker-compose logs -f nginx

# View app logs only
docker-compose logs -f hrms-app

# Check running containers
docker-compose ps

# Check SSL renewal log
tail -f /var/log/ssl-renewal.log
```

---

## 🔧 Troubleshooting Commands

```bash
# Restart all services
docker-compose restart

# Restart nginx only
docker-compose restart nginx

# Rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check nginx config
docker-compose exec nginx nginx -t

# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Fix certificate permissions
sudo chmod 644 /etc/letsencrypt/live/zenova.sbs/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/zenova.sbs/privkey.pem

# Manually renew certificate
sudo /root/renew-ssl-hrms.sh
```

---

## 🎯 One-Line Complete Setup

```bash
ssh root@zenova.sbs "cd /root/hrms && git pull origin main && sudo bash setup-ssl-zenova.sh"
```

---

## ✅ Success Indicators

After setup, you should see:

```bash
# HTTPS should return 200
curl -I https://zenova.sbs
# HTTP/2 200

# HTTP should redirect to HTTPS
curl -I http://zenova.sbs
# HTTP/1.1 301 Moved Permanently
# Location: https://zenova.sbs/

# Certificate should be valid
sudo certbot certificates
# Certificate Name: zenova.sbs
# Domains: zenova.sbs www.zenova.sbs
# Expiry Date: [future date]
# Certificate Path: /etc/letsencrypt/live/zenova.sbs/fullchain.pem
```

---

## 🔐 What Gets Configured

- ✅ SSL certificate from Let's Encrypt
- ✅ HTTP to HTTPS redirect
- ✅ Modern TLS 1.2 & 1.3
- ✅ Strong cipher suites
- ✅ HSTS security headers
- ✅ OCSP stapling
- ✅ Auto-renewal (twice daily)
- ✅ Rate limiting on API
- ✅ Gzip compression

---

## 📱 Access URLs After Setup

- **Main App**: https://zenova.sbs
- **With WWW**: https://www.zenova.sbs
- **API**: https://zenova.sbs/api/
- **Login**: https://zenova.sbs/login
- **Dashboard**: https://zenova.sbs/dashboard

---

## 🆘 If Something Goes Wrong

```bash
# 1. Check logs
docker-compose logs -f nginx

# 2. Verify certificate exists
ls -la /etc/letsencrypt/live/zenova.sbs/

# 3. Test nginx config
docker-compose exec nginx nginx -t

# 4. Restart everything
docker-compose down && docker-compose up -d

# 5. Check DNS
nslookup zenova.sbs

# 6. Re-obtain certificate
docker-compose down
sudo certbot certonly --standalone -d zenova.sbs -d www.zenova.sbs --force-renew
docker-compose up -d
```

---

## 📞 Quick Support Checklist

If SSL isn't working, check:

1. ✅ DNS pointing to server: `nslookup zenova.sbs`
2. ✅ Ports 80/443 open: `sudo ufw status`
3. ✅ Certificate exists: `ls /etc/letsencrypt/live/zenova.sbs/`
4. ✅ Nginx running: `docker-compose ps`
5. ✅ No errors in logs: `docker-compose logs nginx`

---

**Ready to set up SSL? Just run the automated setup command!** 🚀

```bash
ssh root@zenova.sbs "cd /root/hrms && git pull origin main && sudo bash setup-ssl-zenova.sh"
```

