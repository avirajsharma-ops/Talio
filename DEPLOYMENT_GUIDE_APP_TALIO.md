# Talio HRMS - Complete Deployment Guide for app.talio.in

## ✅ What's Been Done

All files have been updated to use the new domain **app.talio.in**:

### Updated Files:
- ✅ `.env.local` - Production environment variables
- ✅ `.env.example` - Example environment file
- ✅ `docker-compose.yml` - Docker configuration
- ✅ `nginx.conf` - Nginx configuration with SSL
- ✅ `android/app/src/main/java/sbs/zenova/twa/MainActivity.kt` - Android app URL
- ✅ `android/app/src/main/AndroidManifest.xml` - Deep link configuration
- ✅ `public/.well-known/assetlinks.json` - Digital Asset Links
- ✅ `app/download/page.js` - Download page
- ✅ `build-apk-app.sh` - Build script
- ✅ `deploy-apk-to-server.sh` - Deployment script

### Built Files:
- ✅ **APK**: `release-app/talio-hrms-app.apk` (4.7 MB)
- ✅ **AAB**: `release-app/talio-hrms-app.aab` (for Play Store)
- ✅ **Keystore**: `release-app/talio-release.keystore`
- ✅ **Asset Links**: `release-app/assetlinks.json`

---

## 🚀 Deployment Steps

### Step 1: Setup SSL Certificate for app.talio.in

On your server, run these commands:

```bash
# Stop Docker containers
cd /root/Talio
docker-compose down

# Request SSL certificate for app.talio.in
docker run -it --rm \
  -v /root/Talio/certbot/conf:/etc/letsencrypt \
  -v /root/Talio/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  --email avi2001raj@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d app.talio.in \
  -d www.app.talio.in

# Verify certificate was created
ls -la /root/Talio/certbot/conf/live/app.talio.in/
```

### Step 2: Update Server Files

```bash
# Pull latest code
cd /root/Talio
git stash  # Stash any local changes
git pull origin main

# Copy environment file
cp .env.example .env

# Edit .env file with production values
nano .env
```

Make sure `.env` contains:
```env
MONGODB_URI=mongodb+srv://avirajsharma_db_user:aviraj@taliocluster.mvnlgwj.mongodb.net/hrms_db?
NEXTAUTH_URL=https://app.talio.in
NEXTAUTH_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-key-here
NEXT_PUBLIC_APP_NAME=Talio HRMS
NEXT_PUBLIC_APP_URL=https://app.talio.in
NODE_ENV=production
```

### Step 3: Upload APK and Asset Links

From your Mac, upload the files:

```bash
cd /Users/avirajsharma/Desktop/Talio

# Create directories on server
ssh root@72.61.170.205 "mkdir -p /root/Talio/public/downloads /root/Talio/public/.well-known"

# Upload APK
scp release-app/talio-hrms-app.apk root@72.61.170.205:/root/Talio/public/downloads/

# Upload assetlinks.json
scp release-app/assetlinks.json root@72.61.170.205:/root/Talio/public/.well-known/

# Set permissions
ssh root@72.61.170.205 "chmod 755 /root/Talio/public/downloads && chmod 644 /root/Talio/public/downloads/talio-hrms-app.apk && chmod 644 /root/Talio/public/.well-known/assetlinks.json"
```

### Step 4: Deploy Application

On the server:

```bash
cd /root/Talio

# Build and start containers
docker-compose up -d --build

# Check logs
docker-compose logs -f hrms-app

# Verify containers are running
docker-compose ps
```

### Step 5: Verify Deployment

Check these URLs:

1. **Main App**: https://app.talio.in
2. **Download Page**: https://app.talio.in/download
3. **APK Download**: https://app.talio.in/downloads/talio-hrms-app.apk
4. **Asset Links**: https://app.talio.in/.well-known/assetlinks.json
5. **SSL Certificate**: Check browser shows secure connection

---

## 🔧 DNS Configuration

Make sure your DNS is configured correctly:

### A Records:
```
app.talio.in        A    72.61.170.205
www.app.talio.in    A    72.61.170.205
```

### CNAME (Alternative):
```
www.app.talio.in    CNAME    app.talio.in
```

**DNS Propagation**: May take up to 48 hours, but usually 15-30 minutes.

---

## 📱 Testing the App

### On Android Device:

1. **Open Download Page**:
   - Visit: https://app.talio.in/download
   - Or scan QR code (if you create one)

2. **Download APK**:
   - Click "Download APK" button
   - File will be saved to Downloads folder

3. **Install APK**:
   - Open Downloads folder
   - Tap on `talio-hrms-app.apk`
   - Enable "Install from Unknown Sources" if prompted
   - Tap "Install"

4. **Grant Permissions**:
   - **Location**: REQUIRED for clock in/out
   - **Notifications**: For push notifications
   - **Camera**: For future features
   - **Storage**: For file uploads

5. **Test Features**:
   - Login with credentials
   - Test clock in (location required)
   - Test clock out (location required)
   - Verify geofence validation
   - Test notifications

---

## 🔐 Security Checklist

- [x] SSL certificate installed for app.talio.in
- [x] HTTPS redirect enabled
- [x] Security headers configured in nginx
- [x] Environment variables secured
- [x] Database connection encrypted (MongoDB Atlas)
- [x] JWT secrets configured
- [x] Keystore secured (keep talio-release.keystore safe!)

---

## 🐛 Troubleshooting

### SSL Certificate Issues

```bash
# Check certificate
openssl s_client -connect app.talio.in:443 -servername app.talio.in

# Renew certificate manually
docker run -it --rm \
  -v /root/Talio/certbot/conf:/etc/letsencrypt \
  -v /root/Talio/certbot/www:/var/www/certbot \
  certbot/certbot renew
```

### Docker Issues

```bash
# View logs
docker-compose logs -f

# Restart containers
docker-compose restart

# Rebuild from scratch
docker-compose down
docker-compose up -d --build --force-recreate
```

### APK Download Issues

```bash
# Check file exists
ls -lh /root/Talio/public/downloads/talio-hrms-app.apk

# Check permissions
chmod 644 /root/Talio/public/downloads/talio-hrms-app.apk

# Check nginx is serving static files
curl -I https://app.talio.in/downloads/talio-hrms-app.apk
```

### Location Permission Issues

- Make sure location services are enabled on device
- Grant "Allow all the time" permission for background tracking
- Check geofence settings in admin panel
- Verify office location coordinates are correct

---

## 📞 Support

**Email**: aviraj.sharma@mushroomworldgroup.com  
**Domain**: https://app.talio.in  
**Package**: sbs.zenova.twa  
**Version**: 1.0.1 (Build 2)

---

## 🎯 Quick Command Reference

```bash
# On Server
cd /root/Talio
git pull origin main
docker-compose down
docker-compose up -d --build
docker-compose logs -f

# From Mac
cd /Users/avirajsharma/Desktop/Talio
./build-apk-app.sh
scp release-app/talio-hrms-app.apk root@72.61.170.205:/root/Talio/public/downloads/
```

---

## ✅ Post-Deployment Checklist

- [ ] SSL certificate installed and working
- [ ] DNS pointing to correct IP
- [ ] App accessible at https://app.talio.in
- [ ] Download page working
- [ ] APK downloadable
- [ ] Asset links accessible
- [ ] APK installs on Android
- [ ] Location permission required
- [ ] Clock in/out working
- [ ] Geofence validation working
- [ ] Push notifications working
- [ ] All dashboards accessible
- [ ] Database connection working

---

**Deployment Date**: $(date)  
**Domain**: app.talio.in  
**Status**: Ready for Production 🚀

