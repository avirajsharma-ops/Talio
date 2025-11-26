# 🚀 Quick Start Guide - Talio HRMS (mwg.talio.in)

## ✅ What's Fixed

### 1. Employee Stats API ✅
- **Issue**: API was returning 500 error
- **Fix**: Added missing `LeaveType` import
- **Status**: ✅ Working (200 status)

### 2. Clock In/Out Location Requirement ✅
- **Issue**: Could clock in/out without location
- **Fix**: Made location **MANDATORY** for attendance
- **Behavior**: 
  - ❌ Blocks clock in/out if location not available
  - ✅ Shows clear error messages
  - ✅ Validates against office geofence radius

### 3. Domain Update ✅
- **Old Domain**: zenova.sbs
- **New Domain**: mwg.talio.in
- **Package**: in.talio.mwg
- **Version**: 1.0.1 (Build 2)

---

## 🎯 Quick Build & Deploy

### Step 1: Build APK (5 minutes)

```bash
# Make script executable (first time only)
chmod +x build-apk-mwg.sh

# Build APK
./build-apk-mwg.sh
```

**Output**: Files in `release-mwg/` folder
- `talio-hrms-mwg.apk` - Install this on Android devices
- `talio-hrms-mwg.aab` - Upload to Play Store
- `assetlinks.json` - Upload to server
- `README.md` - Detailed instructions

### Step 2: Upload assetlinks.json (2 minutes)

```bash
# Copy to server
scp release-mwg/assetlinks.json root@YOUR_SERVER_IP:/root/Talio/public/.well-known/

# Verify it's accessible
curl https://mwg.talio.in/.well-known/assetlinks.json
```

### Step 3: Deploy Updated Code (3 minutes)

```bash
# Copy updated dashboard component
scp components/dashboards/EmployeeDashboard.js root@YOUR_SERVER_IP:/root/Talio/components/dashboards/

# Copy updated API route
scp app/api/dashboard/employee-stats/route.js root@YOUR_SERVER_IP:/root/Talio/app/api/dashboard/employee-stats/

# SSH and rebuild
ssh root@YOUR_SERVER_IP
cd /root/Talio
docker-compose down && docker-compose up -d --build
```

### Step 4: Install APK on Device (2 minutes)

```bash
# Option 1: Using ADB
adb install release-mwg/talio-hrms-mwg.apk

# Option 2: Transfer via USB/Email and install manually
```

---

## 🧪 Quick Test

### Test 1: Web App
```bash
# Visit the app
open https://mwg.talio.in

# Login and check:
✅ Dashboard loads
✅ Employee stats show (no 500 error)
✅ Clock in requires location
✅ Clock out requires location
```

### Test 2: Android App
```bash
# Open app on device
✅ App opens to mwg.talio.in
✅ Location permission prompt appears
✅ Grant location permission
✅ Login works
✅ Clock in requires location
✅ Clock in fails without location
```

---

## 📝 Key Changes Made

### Files Modified

1. **components/dashboards/EmployeeDashboard.js**
   - ✅ Made location REQUIRED for clock in
   - ✅ Made location REQUIRED for clock out
   - ✅ Added proper error messages
   - ✅ Increased timeout to 15 seconds
   - ✅ Validates location data before sending

2. **app/api/dashboard/employee-stats/route.js**
   - ✅ Added `LeaveType` import
   - ✅ Fixed salary access (employee.salary?.ctc)

3. **android/app/src/main/java/sbs/zenova/twa/MainActivity.kt**
   - ✅ Changed URL to https://mwg.talio.in

4. **android/app/src/main/AndroidManifest.xml**
   - ✅ Changed deep link host to mwg.talio.in

5. **android/app/build.gradle**
   - ✅ Changed package to in.talio.mwg
   - ✅ Updated version to 1.0.1 (Build 2)

6. **public/.well-known/assetlinks.json**
   - ✅ Updated package name to in.talio.mwg

---

## 🔍 Location Behavior

### Before (OLD)
```javascript
// Location was optional
if (navigator.geolocation) {
  try {
    // Get location
  } catch (error) {
    // Continue without location ❌
  }
}
// Send request anyway ❌
```

### After (NEW)
```javascript
// Location is REQUIRED
if (!navigator.geolocation) {
  toast.error('Geolocation not supported')
  return ❌
}

try {
  // Get location
} catch (error) {
  toast.error('Location required')
  return ❌
}

if (!latitude || !longitude) {
  toast.error('Enable location services')
  return ❌
}

// Only send request if location is available ✅
```

---

## 📊 Expected Behavior

### Clock In WITH Location ✅
```
User clicks "Check In"
  ↓
Request location permission
  ↓
Get GPS coordinates
  ↓
Validate against office radius
  ↓
Send to server with location
  ↓
✅ Success: "Clocked in successfully!"
```

### Clock In WITHOUT Location ❌
```
User clicks "Check In"
  ↓
Request location permission
  ↓
User denies OR GPS unavailable
  ↓
❌ Error: "Please enable location permission"
  ↓
Clock in BLOCKED
```

---

## 🎯 Geofence Validation

### How It Works

1. **Employee clicks Clock In**
2. **App gets GPS location** (latitude, longitude)
3. **Server calculates distance** from office location
4. **If within radius**: ✅ Allow clock in
5. **If outside radius**: ❌ Block clock in (if strict mode)

### Configure Office Location

1. Login as Admin
2. Go to: Settings → Geofence Locations
3. Click "Add Location"
4. Enter:
   - Name: Main Office
   - Latitude: 28.xxxx
   - Longitude: 77.xxxx
   - Radius: 100 (meters)
5. Enable "Strict Mode"
6. Save

---

## 🆘 Common Issues

### Issue: "Location access is required"
**Solution**: Grant location permission in browser/app settings

### Issue: "Location request timed out"
**Solution**: 
- Go to open area (better GPS signal)
- Wait a few seconds
- Try again

### Issue: "You must be within Xm of office"
**Solution**:
- Check you're actually at office
- Verify office location is configured correctly
- Increase radius if needed
- Disable strict mode for testing

### Issue: Employee stats not loading
**Solution**:
- Check server logs: `docker-compose logs -f hrms-app`
- Should see: `GET /api/dashboard/employee-stats 200`
- If 500 error, redeploy the updated route.js file

---

## 📞 Need Help?

**Check Logs:**
```bash
# Server logs
ssh root@YOUR_SERVER_IP
cd /root/Talio
docker-compose logs -f hrms-app

# Browser console
F12 → Console tab
```

**Contact:**
- Email: aviraj.sharma@mushroomworldgroup.com

---

## ✅ Checklist

Before going live:

- [ ] APK built successfully
- [ ] assetlinks.json uploaded to server
- [ ] assetlinks.json accessible at https://mwg.talio.in/.well-known/assetlinks.json
- [ ] Updated code deployed to server
- [ ] Employee stats API returns 200
- [ ] Clock in requires location
- [ ] Clock out requires location
- [ ] Geofence location configured
- [ ] APK tested on device
- [ ] Location permission works
- [ ] Clock in/out tested

---

## 🎉 You're Done!

Your Talio HRMS is now:
- ✅ Running on mwg.talio.in
- ✅ Requiring location for attendance
- ✅ Validating against office geofence
- ✅ Employee stats working properly
- ✅ Ready for production use

**Build the APK now:**
```bash
./build-apk-mwg.sh
```

Good luck! 🚀

