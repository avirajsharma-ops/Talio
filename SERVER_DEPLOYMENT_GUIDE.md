# 🚀 Server Deployment Guide - Build APK on Server

Since Java is not installed on your Mac, we'll build the APK directly on the server.

## 📋 Prerequisites

You need to be able to SSH to your server. Try one of these:

```bash
# Option 1: Direct IP
ssh root@72.61.170.205

# Option 2: If you have a different username
ssh YOUR_USERNAME@72.61.170.205

# Option 3: If you have an SSH alias
ssh your-server-name

# Option 4: Different port
ssh -p 2222 root@72.61.170.205
```

---

## 🎯 Method 1: Build APK on Server (RECOMMENDED)

### Step 1: SSH to Server

```bash
ssh root@72.61.170.205
```

If this doesn't work, check with your hosting provider for:
- Correct IP address
- SSH username
- SSH port (if not 22)
- SSH key requirements

### Step 2: Navigate to Project

```bash
cd /root/Talio
```

Or if your project is in a different location:
```bash
cd /path/to/your/Talio
```

### Step 3: Pull Latest Changes

```bash
git pull
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Create Directories

```bash
mkdir -p public/downloads
mkdir -p public/.well-known
```

### Step 6: Build APK (on Server)

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Step 7: Copy APK to Public Directory

```bash
cd ..
cp android/app/build/outputs/apk/release/app-release.apk public/downloads/talio-hrms-mwg.apk
```

### Step 8: Copy assetlinks.json

```bash
# Create assetlinks.json
cat > public/.well-known/assetlinks.json << 'EOF'
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "in.talio.mwg",
    "sha256_cert_fingerprints": ["02:4A:49:F6:DD:07:DD:E1:CF:A1:2C:F5:09:1C:7B:DA:61:78:D3:45:5C:5F:9D:C3:A2:5B:E7:31:5A:AE:A3:DC"]
  }
}]
EOF
```

### Step 9: Set Permissions

```bash
chmod 755 public/downloads
chmod 644 public/downloads/talio-hrms-mwg.apk
chmod 644 public/.well-known/assetlinks.json
```

### Step 10: Rebuild Docker

```bash
docker-compose down
docker-compose up -d --build
```

### Step 11: Verify

```bash
# Check if APK exists
ls -lh public/downloads/talio-hrms-mwg.apk

# Check if assetlinks.json exists
cat public/.well-known/assetlinks.json

# Test download URL
curl -I https://mwg.talio.in/downloads/talio-hrms-mwg.apk

# Test assetlinks URL
curl https://mwg.talio.in/.well-known/assetlinks.json
```

---

## 🎯 Method 2: Use Hosting Control Panel

If SSH doesn't work, use your hosting control panel:

### Step 1: Access File Manager

1. Login to Hostinger
2. Go to File Manager
3. Navigate to `/root/Talio` or your project directory

### Step 2: Create Directories

Create these folders:
- `public/downloads`
- `public/.well-known`

### Step 3: Upload APK

If you can build the APK locally (after installing Java), upload it to:
- `public/downloads/talio-hrms-mwg.apk`

### Step 4: Create assetlinks.json

Create a new file at `public/.well-known/assetlinks.json` with this content:

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

### Step 5: Restart Application

Use the hosting control panel to restart your application.

---

## 🎯 Method 3: Install Java on Mac (For Local Build)

If you want to build APK on your Mac:

### Step 1: Install Homebrew (if not installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Java

```bash
brew install openjdk@17
```

### Step 3: Set Java Path

```bash
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Step 4: Verify Java Installation

```bash
java -version
```

Should show: `openjdk version "17.x.x"`

### Step 5: Build APK

```bash
cd /Users/avirajsharma/Desktop/Talio
./build-apk-mwg.sh
```

### Step 6: Upload to Server

```bash
# Upload APK
scp release-mwg/talio-hrms-mwg.apk root@72.61.170.205:/root/Talio/public/downloads/

# Upload assetlinks.json
scp release-mwg/assetlinks.json root@72.61.170.205:/root/Talio/public/.well-known/
```

---

## 🆘 Troubleshooting SSH Connection

### Issue: "Connection timed out"

**Possible causes:**
1. Wrong IP address
2. Firewall blocking SSH
3. SSH running on different port
4. Server is down

**Solutions:**

**Check if server is reachable:**
```bash
ping 72.61.170.205
```

**Try different SSH port:**
```bash
ssh -p 2222 root@72.61.170.205
```

**Check with hosting provider:**
- Login to Hostinger
- Check VPS status
- Check SSH access details
- Check firewall rules

### Issue: "Permission denied"

**Solution:**
```bash
# Use SSH key
ssh -i ~/.ssh/your-key.pem root@72.61.170.205

# Or use password authentication
ssh -o PreferredAuthentications=password root@72.61.170.205
```

---

## ✅ Quick Checklist

After deployment, verify these URLs work:

```bash
# Download page
curl -I https://mwg.talio.in/download

# APK download
curl -I https://mwg.talio.in/downloads/talio-hrms-mwg.apk

# Asset links
curl https://mwg.talio.in/.well-known/assetlinks.json

# Employee stats API
curl -I https://mwg.talio.in/api/dashboard/employee-stats
```

All should return `200 OK` or valid JSON.

---

## 📱 Share with Team

Once deployed, share this link:

```
https://mwg.talio.in/download
```

Or direct APK link:

```
https://mwg.talio.in/downloads/talio-hrms-mwg.apk
```

---

## 🎉 Summary

**Easiest Method:**
1. SSH to server: `ssh root@72.61.170.205`
2. Navigate: `cd /root/Talio`
3. Pull changes: `git pull && npm install`
4. Build APK: `cd android && ./gradlew assembleRelease`
5. Copy APK: `cp android/app/build/outputs/apk/release/app-release.apk public/downloads/talio-hrms-mwg.apk`
6. Create assetlinks.json (see above)
7. Rebuild: `docker-compose down && docker-compose up -d --build`
8. Share: `https://mwg.talio.in/download`

**If SSH doesn't work:**
- Contact your hosting provider for SSH access details
- Or install Java on Mac and build locally
- Or use hosting control panel to upload files

Good luck! 🚀

