# Manual Deployment Steps for Talio HRMS APK

## ✅ APK Built Successfully!

**Location**: `/Users/avirajsharma/Desktop/Talio/talio-hrms-mwg.apk`  
**Size**: 4.7 MB  
**Package Name**: `sbs.zenova.twa`  
**Domain**: `mwg.talio.in`

---

## 🚀 Deployment Steps

Since SSH connection to the server is timing out, here are manual steps to deploy:

### Option 1: Using Hostinger File Manager (EASIEST)

1. **Login to Hostinger**
   - Go to https://hostinger.com
   - Login to your account
   - Go to your VPS/Server dashboard

2. **Access File Manager or SSH Terminal**
   - Look for "File Manager" or "Terminal" option
   - Navigate to `/root/Talio/`

3. **Upload Files**
   
   **Upload the APK:**
   - Create directory: `mkdir -p /root/Talio/public/downloads`
   - Upload `talio-hrms-mwg.apk` to `/root/Talio/public/downloads/`
   
   **Upload assetlinks.json:**
   - Upload `public/.well-known/assetlinks.json` to `/root/Talio/public/.well-known/`

4. **Set Permissions**
   ```bash
   chmod 644 /root/Talio/public/downloads/talio-hrms-mwg.apk
   chmod 644 /root/Talio/public/.well-known/assetlinks.json
   ```

5. **Rebuild Docker Container**
   ```bash
   cd /root/Talio
   git pull
   docker-compose down
   docker-compose up -d --build
   ```

6. **Verify**
   - Visit: https://mwg.talio.in/download
   - Visit: https://mwg.talio.in/downloads/talio-hrms-mwg.apk
   - Visit: https://mwg.talio.in/.well-known/assetlinks.json

---

### Option 2: Fix SSH Connection (RECOMMENDED)

The SSH connection is timing out. This could be due to:

1. **Firewall blocking SSH**
   - Check Hostinger firewall settings
   - Make sure port 22 is open
   - Or check if SSH is on a different port

2. **Wrong IP address**
   - Verify the IP: `72.61.170.205`
   - Check in Hostinger dashboard

3. **SSH not enabled**
   - Enable SSH in Hostinger control panel

**Once SSH is working, run:**
```bash
cd /Users/avirajsharma/Desktop/Talio
./deploy-apk-to-server.sh 72.61.170.205
```

---

### Option 3: Using SCP (If SSH works)

If you can fix SSH, you can upload files directly:

```bash
# Upload APK
scp talio-hrms-mwg.apk root@72.61.170.205:/root/Talio/public/downloads/

# Upload assetlinks.json
scp public/.well-known/assetlinks.json root@72.61.170.205:/root/Talio/public/.well-known/

# SSH and rebuild
ssh root@72.61.170.205 "cd /root/Talio && git pull && docker-compose down && docker-compose up -d --build"
```

---

## 📱 After Deployment

### Share with Team

**Download Page:**
```
https://mwg.talio.in/download
```

**Direct APK Link:**
```
https://mwg.talio.in/downloads/talio-hrms-mwg.apk
```

### Test Installation

1. Open download page on Android device
2. Download APK
3. Install (allow "Install from unknown sources")
4. Open app
5. Grant location permission (REQUIRED)
6. Test clock in/out

---

## 🔧 What Was Changed

### ✅ Completed Changes

1. **Domain Updated**: Changed from `zenova.sbs` to `mwg.talio.in`
2. **Location Requirement**: Made location MANDATORY for clock in/out
3. **Employee Stats API**: Fixed and working (200 status)
4. **Download Page**: Created at `/download` with installation instructions
5. **APK Built**: Successfully built with all changes
6. **OkHttp Dependency**: Added to fix compilation errors

### 📦 Files Ready for Deployment

- ✅ `talio-hrms-mwg.apk` (4.7 MB)
- ✅ `public/.well-known/assetlinks.json` (updated package name)
- ✅ `app/download/page.js` (download page - already in git)

---

## 🐛 Troubleshooting

### If Download Page Doesn't Work

The download page code is already committed to git. After `git pull` on the server, rebuild:

```bash
cd /root/Talio
docker-compose down
docker-compose up -d --build
```

### If APK Download Fails

Make sure the file exists and has correct permissions:

```bash
ls -lh /root/Talio/public/downloads/talio-hrms-mwg.apk
chmod 644 /root/Talio/public/downloads/talio-hrms-mwg.apk
```

### If assetlinks.json Doesn't Work

```bash
ls -lh /root/Talio/public/.well-known/assetlinks.json
chmod 644 /root/Talio/public/.well-known/assetlinks.json
```

---

## 📞 Next Steps

1. **Contact Hostinger Support** to fix SSH access (recommended)
2. **Or use Hostinger File Manager** to upload files manually
3. **Test the download page** after deployment
4. **Share with team** once verified

---

## 🎯 Quick Summary

**What you have:**
- ✅ APK built successfully at `/Users/avirajsharma/Desktop/Talio/talio-hrms-mwg.apk`
- ✅ All code changes committed to git
- ✅ Download page ready

**What you need to do:**
1. Upload APK to server at `/root/Talio/public/downloads/talio-hrms-mwg.apk`
2. Upload assetlinks.json to server at `/root/Talio/public/.well-known/assetlinks.json`
3. Run `git pull` on server
4. Rebuild Docker: `docker-compose down && docker-compose up -d --build`
5. Share https://mwg.talio.in/download with team

**Issue:**
- SSH connection to server is timing out
- Need to fix SSH or use Hostinger File Manager

---

Good luck! 🚀

