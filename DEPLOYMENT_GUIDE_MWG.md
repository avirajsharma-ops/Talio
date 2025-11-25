# 🚀 Talio HRMS - Complete Deployment Guide for mwg.talio.in

## 📋 Overview

This guide covers the complete deployment process for Talio HRMS with the new domain **mwg.talio.in**.

### Key Changes
- ✅ **Domain**: Changed from zenova.sbs to **mwg.talio.in**
- ✅ **Package Name**: Changed from sbs.zenova.twa to **in.talio.mwg**
- ✅ **Location Requirement**: Clock in/out now **REQUIRES** location access
- ✅ **Geofencing**: Validates employee location against office radius
- ✅ **Version**: Updated to 1.0.1 (Build 2)

---

## 🔧 Part 1: Build the Android APK

### Step 1: Build APK and AAB

Run the build script:

```bash
./build-apk-mwg.sh
```

This will:
- Clean previous builds
- Build release APK
- Build release AAB (for Play Store)
- Copy all files to `release-mwg/` folder
- Generate README with instructions

### Step 2: Verify Build

Check that these files exist in `release-mwg/`:
- ✅ `talio-hrms-mwg.apk` - Android APK
- ✅ `talio-hrms-mwg.aab` - App Bundle for Play Store
- ✅ `talio-release.keystore` - Signing keystore
- ✅ `assetlinks.json` - Digital Asset Links file
- ✅ `README.md` - Deployment instructions

---

## 🌐 Part 2: Server Deployment (mwg.talio.in)

### Step 1: Upload assetlinks.json

Upload the `assetlinks.json` file to your server:

```bash
# From your local machine
scp release-mwg/assetlinks.json root@YOUR_SERVER_IP:/root/Talio/public/.well-known/

# Or manually create the file on server
ssh root@YOUR_SERVER_IP
mkdir -p /root/Talio/public/.well-known
nano /root/Talio/public/.well-known/assetlinks.json
# Paste the content from release-mwg/assetlinks.json
```

### Step 2: Verify assetlinks.json is Accessible

```bash
curl https://mwg.talio.in/.well-known/assetlinks.json
```

You should see the JSON content with package name `in.talio.mwg`.

### Step 3: Update DNS for mwg.talio.in

Make sure your DNS points to your server:

```
A Record: mwg.talio.in → YOUR_SERVER_IP
```

### Step 4: Setup SSL Certificate

If not already done, setup Let's Encrypt SSL:

```bash
ssh root@YOUR_SERVER_IP
cd /root/Talio

# Update docker-compose.yml to include mwg.talio.in
# Then restart containers
docker-compose down
docker-compose up -d
```

### Step 5: Deploy Updated Code

```bash
# Copy updated EmployeeDashboard.js to server
scp components/dashboards/EmployeeDashboard.js root@YOUR_SERVER_IP:/root/Tailo/components/dashboards/

# SSH and rebuild
ssh root@YOUR_SERVER_IP
cd /root/Tailo
docker-compose down
docker-compose up -d --build
```

---

## 📱 Part 3: Install and Test APK

### Step 1: Transfer APK to Android Device

**Option A: Direct Transfer**
```bash
# Using ADB
adb install release-mwg/talio-hrms-mwg.apk

# Or transfer via USB/Email/Cloud
```

**Option B: Download from Server**
```bash
# Upload to server
scp release-mwg/talio-hrms-mwg.apk root@YOUR_SERVER_IP:/var/www/html/

# Download on device
# Visit: https://mwg.talio.in/talio-hrms-mwg.apk
```

### Step 2: Install APK

1. Enable "Install from Unknown Sources" on Android device
2. Open the APK file
3. Follow installation prompts
4. Grant all requested permissions

### Step 3: Test Location Permission

1. Open the app
2. You should see location permission prompt
3. **Grant location permission** (REQUIRED)
4. Verify location is being tracked

### Step 4: Test Clock In/Out

**Test 1: With Location Enabled**
1. Login to the app
2. Go to Dashboard
3. Click "Check In" button
4. ✅ Should prompt for location
5. ✅ Should get location successfully
6. ✅ Should clock in successfully
7. ✅ Should validate against office geofence

**Test 2: Without Location (Should Fail)**
1. Disable location on device
2. Click "Check In" button
3. ❌ Should show error: "Location access is required"
4. ❌ Should NOT allow clock in

**Test 3: Outside Office Radius (Should Fail if Strict Mode)**
1. Go outside office radius
2. Click "Check In" button
3. ❌ Should show error: "You must be within Xm of office"
4. ❌ Should NOT allow clock in (if strict mode enabled)

---

## ⚙️ Part 4: Configure Geofencing

### Step 1: Login as Admin

Visit: https://mwg.talio.in/dashboard/settings/geofence-locations

### Step 2: Add Office Location

1. Click "Add Location"
2. Enter office details:
   - **Name**: Main Office
   - **Address**: Your office address
   - **Latitude**: Office latitude
   - **Longitude**: Office longitude
   - **Radius**: 100 (meters) - adjust as needed
3. Enable "Strict Mode" to enforce geofence
4. Save

### Step 3: Enable Geofencing

Visit: https://mwg.talio.in/dashboard/settings/company

1. Enable "Geofencing"
2. Enable "Strict Mode" (optional)
3. Set "Radius" (default: 100m)
4. Save settings

---

## 🧪 Part 5: Testing Checklist

### Web App Testing
- [ ] Visit https://mwg.talio.in
- [ ] SSL certificate is valid
- [ ] Login works
- [ ] Dashboard loads
- [ ] Employee stats API works (200 status)
- [ ] Clock in requires location
- [ ] Clock out requires location
- [ ] Geofence validation works

### Android App Testing
- [ ] APK installs successfully
- [ ] App opens to https://mwg.talio.in
- [ ] Location permission prompt appears
- [ ] Location permission can be granted
- [ ] Login works
- [ ] Dashboard loads
- [ ] Clock in with location works
- [ ] Clock in without location fails
- [ ] Clock out with location works
- [ ] Clock out without location fails
- [ ] Geofence validation works
- [ ] Push notifications work
- [ ] Deep links work

### Geofencing Testing
- [ ] Office location is configured
- [ ] Geofencing is enabled
- [ ] Clock in inside radius works
- [ ] Clock in outside radius fails (if strict mode)
- [ ] Geofence logs are created
- [ ] Distance calculation is accurate

---

## 🔐 Security Notes

### Keystore Security
- **NEVER** commit `talio-release.keystore` to Git
- Keep keystore password secure: `talio2024`
- Backup keystore in secure location
- You need this keystore for ALL future updates

### SSL Certificate
- Ensure SSL is valid for mwg.talio.in
- Auto-renewal should be configured
- Test HTTPS access regularly

### Location Privacy
- Location data is encrypted in transit
- Only stored for attendance records
- Employees must consent to location tracking
- Comply with local privacy laws

---

## 📊 Monitoring

### Check Logs

**Server Logs:**
```bash
ssh root@YOUR_SERVER_IP
cd /root/Tailo
docker-compose logs -f hrms-app
```

**Look for:**
- ✅ `GET /api/dashboard/employee-stats 200` - Stats API working
- ✅ `POST /api/attendance 200` - Clock in/out working
- ❌ `Employee stats error` - Check if models are imported
- ❌ `Geolocation error` - Check location permissions

**Browser Console:**
```
🔵 Clock In button clicked
✅ Location obtained: 28.xxxx, 77.xxxx
📤 Sending clock-in request...
✅ Clocked in successfully!
```

---

## 🆘 Troubleshooting

### Issue: APK won't install
**Solution:**
- Enable "Install from Unknown Sources"
- Check Android version (minimum: Android 7.0)
- Uninstall old version first

### Issue: Location permission not working
**Solution:**
- Check device location settings
- Grant location permission in app settings
- Try "Allow all the time" for background tracking

### Issue: Clock in fails with location error
**Solution:**
- Ensure location permission is granted
- Check GPS is enabled on device
- Wait for GPS to acquire signal
- Try again in open area (better GPS signal)

### Issue: Geofence validation fails
**Solution:**
- Check office location is configured correctly
- Verify radius is appropriate (100m recommended)
- Check employee is within radius
- Disable strict mode for testing

### Issue: assetlinks.json not accessible
**Solution:**
```bash
# Check file exists
ls -la /root/Tailo/public/.well-known/assetlinks.json

# Check nginx is serving it
curl https://mwg.talio.in/.well-known/assetlinks.json

# Check permissions
chmod 644 /root/Tailo/public/.well-known/assetlinks.json
```

---

## 📞 Support

For issues or questions:
- **Email**: aviraj.sharma@mushroomworldgroup.com
- **Check Logs**: `docker-compose logs -f hrms-app`
- **Browser Console**: F12 → Console tab

---

## ✅ Summary

You have successfully:
1. ✅ Built APK for mwg.talio.in domain
2. ✅ Updated package name to in.talio.mwg
3. ✅ Made location REQUIRED for clock in/out
4. ✅ Configured geofencing validation
5. ✅ Fixed employee stats API
6. ✅ Created deployment guide

**Next Steps:**
1. Build the APK: `./build-apk-mwg.sh`
2. Upload assetlinks.json to server
3. Deploy updated code to server
4. Install APK on devices
5. Test thoroughly
6. Deploy to production

Good luck! 🚀

