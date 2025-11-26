# 🚀 Run These Commands on Your Digital Ocean Server

## ✅ What's Been Fixed

I've updated your `docker-compose.yml` to include SSL support by default. Now you only need to run `docker-compose up -d` and it will automatically use SSL!

---

## 📋 Commands to Run on Server

### Step 1: Connect to Server
```bash
# From your local machine
ssh -i $env:USERPROFILE\.ssh\id_rsa root@139.59.27.50
```

### Step 2: Navigate to HRMS Directory
```bash
cd /root/hrms
```

### Step 3: Pull Latest Changes
```bash
git pull origin main
```

### Step 4: Run SSL Setup (FIRST TIME ONLY)
```bash
# Make script executable
chmod +x setup-ssl-certbot.sh

# Run the setup script
bash setup-ssl-certbot.sh
```

**The script will:**
- ✅ Install Certbot
- ✅ Create certbot directories
- ✅ Stop containers
- ✅ Obtain SSL certificate for zenova.sbs
- ✅ Start containers with SSL
- ✅ Test HTTPS

---

## 🔄 After First Setup - Normal Usage

After the first SSL setup, you can use normal docker-compose commands:

```bash
# Stop containers
docker-compose down

# Start containers (with SSL automatically)
docker-compose up -d

# Restart containers
docker-compose restart

# View logs
docker-compose logs -f

# View nginx logs only
docker-compose logs -f nginx
```

**No need to use `-f docker-compose.ssl.yml` anymore!** 🎉

---

## 🎯 What Changed

### Before (Old Way):
```bash
docker-compose down                          # Stop without SSL
docker-compose -f docker-compose.ssl.yml up -d  # Start with SSL (manual)
```

### After (New Way):
```bash
docker-compose down    # Stop
docker-compose up -d   # Start with SSL automatically ✅
```

---

## 📊 Container Status

After running `docker-compose up -d`, you should see:

```
✔ Container hrms-hrms-app-1  Started
✔ Container hrms-nginx       Started
✔ Container hrms-certbot     Started
```

**3 containers:**
1. **hrms-hrms-app-1** - Your Next.js application
2. **hrms-nginx** - Nginx with SSL
3. **hrms-certbot** - Auto-renewal (renews certificate every 12 hours)

---

## 🔐 SSL Certificate Location

The certificate will be stored in:
```
/root/hrms/certbot/conf/live/zenova.sbs/
├── fullchain.pem
├── privkey.pem
├── cert.pem
└── chain.pem
```

---

## 🧪 Testing

```bash
# Test HTTPS (should return HTTP/2 200)
curl -I https://zenova.sbs

# Test HTTP redirect (should return 301)
curl -I http://zenova.sbs

# Check certificate expiry
openssl x509 -enddate -noout -in ./certbot/conf/live/zenova.sbs/fullchain.pem
```

---

## 🔄 Certificate Auto-Renewal

The `certbot` container automatically renews the certificate every 12 hours. You don't need to do anything!

To check renewal logs:
```bash
docker-compose logs certbot
```

---

## 🆘 Troubleshooting

### Issue: Certificate not obtained
```bash
# Check if DNS points to your server
nslookup zenova.sbs

# Should return: 139.59.27.50
```

### Issue: Nginx won't start
```bash
# Check nginx logs
docker-compose logs nginx

# Test nginx config
docker-compose exec nginx nginx -t
```

### Issue: Port already in use
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443

# Stop all containers
docker-compose down
```

---

## ✅ Success Checklist

After running the setup, verify:

- [ ] 3 containers running: `docker-compose ps`
- [ ] Certificate exists: `ls -la ./certbot/conf/live/zenova.sbs/`
- [ ] HTTPS works: `curl -I https://zenova.sbs`
- [ ] HTTP redirects: `curl -I http://zenova.sbs`
- [ ] No errors in logs: `docker-compose logs`

---

## 🎉 Summary

**Old workflow (manual SSL):**
```bash
docker-compose down
docker-compose -f docker-compose.ssl.yml up -d  # Had to specify SSL file
```

**New workflow (automatic SSL):**
```bash
docker-compose down
docker-compose up -d  # SSL is automatic! ✅
```

---

## 📞 Quick Commands Reference

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart
docker-compose restart

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f nginx
docker-compose logs -f hrms-app
docker-compose logs -f certbot

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check status
docker-compose ps
```

---

**Ready to set up SSL? Just run the commands above!** 🚀

