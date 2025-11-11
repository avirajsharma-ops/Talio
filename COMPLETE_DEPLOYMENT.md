# 🚀 Complete Deployment Guide - APK Download Setup

## ✅ What You Have Now

Since you've already committed and pulled the changes on the server, here's what to do next:

---

## 🎯 Option 1: Automated Deployment (RECOMMENDED)

### Single Command Deployment

```bash
# Replace YOUR_SERVER_IP with your actual server IP
./deploy-apk-to-server.sh YOUR_SERVER_IP
```

**Example:**
```bash
./deploy-apk-to-server.sh 123.45.67.89
```

This script will:
1. ✅ Build the APK locally
2. ✅ Create necessary directories on server
3. ✅ Upload APK to server
4. ✅ Upload assetlinks.json
5. ✅ Set proper permissions
6. ✅ Rebuild Docker container
7. ✅ Verify all URLs are working

**That's it!** The APK will be available at:
- **Download Page**: https://mwg.talio.in/download
- **Direct APK**: https://mwg.talio.in/downloads/talio-hrms-mwg.apk

---

## 🎯 Option 2: Manual Deployment

If you prefer to do it step by step:

### Step 1: Build APK (Local Machine)

```bash
./build-apk-mwg.sh
```

### Step 2: Upload to Server

```bash
# Replace YOUR_SERVER_IP with your actual IP
SERVER_IP="YOUR_SERVER_IP"

# Create directories
ssh root@$SERVER_IP "mkdir -p /root/Talio/public/downloads /root/Talio/public/.well-known"

# Upload APK
scp release-mwg/talio-hrms-mwg.apk root@$SERVER_IP:/root/Talio/public/downloads/

# Upload assetlinks.json
scp release-mwg/assetlinks.json root@$SERVER_IP:/root/Talio/public/.well-known/

# Set permissions
ssh root@$SERVER_IP "chmod 755 /root/Talio/public/downloads && chmod 644 /root/Talio/public/downloads/talio-hrms-mwg.apk && chmod 644 /root/Talio/public/.well-known/assetlinks.json"
```

### Step 3: Rebuild Docker Container

```bash
ssh root@$SERVER_IP
cd /root/Talio
docker-compose down
docker-compose up -d --build
```

### Step 4: Verify

```bash
# Test APK download
curl -I https://mwg.talio.in/downloads/talio-hrms-mwg.apk

# Test assetlinks.json
curl https://mwg.talio.in/.well-known/assetlinks.json

# Test download page
curl -I https://mwg.talio.in/download
```

---

## 📱 How Users Download the APK

### Method 1: Download Page (Recommended)

1. **Share this link with your team:**
   ```
   https://mwg.talio.in/download
   ```

2. **Users open the link on their Android device**

3. **Click "Download APK" button**

4. **Follow installation instructions on the page**

### Method 2: Direct APK Link

Share this direct download link:
```
https://mwg.talio.in/downloads/talio-hrms-mwg.apk
```

---

## 📋 Download Page Features

The download page (`/download`) includes:

✅ **Auto-detect Android devices**  
✅ **Version information** (1.0.1 Build 2)  
✅ **What's new** section  
✅ **One-click download** button  
✅ **Installation instructions**  
✅ **Important notes** about location permission  
✅ **Support contact** information  

---

## 🧪 Testing

### Test 1: Download Page

```bash
# Open in browser
open https://mwg.talio.in/download
```

**Expected:**
- ✅ Page loads with download button
- ✅ Shows version 1.0.1
- ✅ Shows installation instructions
- ✅ Shows location permission warning

### Test 2: APK Download

```bash
# On Android device, visit:
https://mwg.talio.in/downloads/talio-hrms-mwg.apk
```

**Expected:**
- ✅ APK downloads automatically
- ✅ File size: ~5-10 MB
- ✅ Filename: talio-hrms-mwg.apk

### Test 3: Asset Links

```bash
curl https://mwg.talio.in/.well-known/assetlinks.json
```

**Expected:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "in.talio.mwg",
    "sha256_cert_fingerprints": ["02:4A:49:F6:DD:07:DD:E1:CF:A1:2C:F5:09:1C:7B:DA:61:78:D3:45:5C:5F:9D:C3:A2:5B:E7:31:5A:AE:A3:DC"]
  }
}]
```

---

## 📤 Share with Your Team

### Email Template

```
Subject: Talio HRMS - Download Android App

Hi Team,

The Talio HRMS Android app is now available for download!

📱 Download Link: https://mwg.talio.in/download

Installation Instructions:
1. Open the link on your Android device
2. Click "Download APK"
3. Enable "Install from Unknown Sources" in Settings
4. Install the app
5. Grant Location permission (REQUIRED)

Important Notes:
- Location permission is mandatory for attendance tracking
- You cannot clock in/out without enabling location
- Make sure GPS is enabled on your device

Need help? Contact: aviraj.sharma@mushroomworldgroup.com

Thanks!
```

### WhatsApp Message

```
🚀 Talio HRMS App is Ready!

📱 Download: https://mwg.talio.in/download

⚠️ Important: Enable location permission for attendance tracking

Need help? Contact me!
```

---

## 🔍 Troubleshooting

### Issue: APK download returns 404

**Solution:**
```bash
# Check if file exists on server
ssh root@YOUR_SERVER_IP
ls -la /root/Talio/public/downloads/talio-hrms-mwg.apk

# If missing, re-upload
scp release-mwg/talio-hrms-mwg.apk root@YOUR_SERVER_IP:/root/Talio/public/downloads/
```

### Issue: Download page shows 404

**Solution:**
```bash
# Check if download page exists
ssh root@YOUR_SERVER_IP
ls -la /root/Talio/app/download/page.js

# If missing, commit and push the new page
git add app/download/page.js
git commit -m "Add APK download page"
git push

# Then pull on server
ssh root@YOUR_SERVER_IP
cd /root/Talio
git pull
docker-compose down && docker-compose up -d --build
```

### Issue: assetlinks.json returns 404

**Solution:**
```bash
# Re-upload assetlinks.json
scp release-mwg/assetlinks.json root@YOUR_SERVER_IP:/root/Talio/public/.well-known/

# Set permissions
ssh root@YOUR_SERVER_IP "chmod 644 /root/Talio/public/.well-known/assetlinks.json"
```

### Issue: APK won't install on device

**Solution:**
1. Enable "Install from Unknown Sources"
2. Check Android version (minimum: 7.0)
3. Uninstall old version first
4. Clear Downloads folder and try again

---

## 📊 Monitoring

### Check Server Logs

```bash
ssh root@YOUR_SERVER_IP
cd /root/Talio
docker-compose logs -f hrms-app
```

### Check Download Stats

```bash
# Check APK access logs
ssh root@YOUR_SERVER_IP
docker-compose logs nginx | grep "talio-hrms-mwg.apk"
```

---

## 🎉 Summary

After running the deployment script, you'll have:

✅ **APK built and uploaded** to server  
✅ **Download page** at https://mwg.talio.in/download  
✅ **Direct download** at https://mwg.talio.in/downloads/talio-hrms-mwg.apk  
✅ **Asset links** at https://mwg.talio.in/.well-known/assetlinks.json  
✅ **Docker container** rebuilt with latest code  

---

## 🚀 Quick Start

**Just run this ONE command:**

```bash
./deploy-apk-to-server.sh YOUR_SERVER_IP
```

**Then share this link with your team:**

```
https://mwg.talio.in/download
```

**Done!** 🎉

---

## 📞 Support

Need help?
- **Email**: aviraj.sharma@mushroomworldgroup.com
- **Check Logs**: `docker-compose logs -f hrms-app`
- **Test URLs**: Use curl commands above

---

## ✅ Final Checklist

Before sharing with team:

- [ ] Run `./deploy-apk-to-server.sh YOUR_SERVER_IP`
- [ ] Verify https://mwg.talio.in/download loads
- [ ] Verify https://mwg.talio.in/downloads/talio-hrms-mwg.apk downloads
- [ ] Verify https://mwg.talio.in/.well-known/assetlinks.json returns JSON
- [ ] Test APK installation on one device
- [ ] Verify location permission prompt appears
- [ ] Test clock in/out with location
- [ ] Share download link with team

**You're all set!** 🚀

