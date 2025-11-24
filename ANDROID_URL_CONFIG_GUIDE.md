# Talio Android App - URL Configuration

## Current Configuration

### Debug Build (quick-build-debug.bat)
- **Current URL**: `http://10.0.2.2:3000`
- **Use Case**: Android Emulator testing
- **Package ID**: `sbs.zenova.twa.debug`

### Release Build (quick-build.bat)  
- **Current URL**: `https://app.talio.in`
- **Use Case**: Production deployment
- **Package ID**: `sbs.zenova.twa`

---

## How to Configure URL for Physical Device Testing

If you're testing on a **physical device** on a **different network** than your computer:

### Option 1: Use ngrok or similar tunneling service

1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update `android/app/build.gradle`:

```gradle
debug {
    applicationIdSuffix ".debug"
    debuggable true
    buildConfigField "String", "BASE_URL", '"https://abc123.ngrok.io"'
}
```

### Option 2: Deploy to production domain

1. Deploy your Next.js app to `https://app.talio.in`
2. Use the release build: `quick-build.bat`
3. No configuration needed - already set up

### Option 3: Use local network IP (same WiFi only)

1. Find your computer's IP: `ipconfig` in PowerShell
2. Look for IPv4 Address under your WiFi adapter (e.g., `192.168.1.100`)
3. Update `android/app/build.gradle`:

```gradle
debug {
    applicationIdSuffix ".debug"
    debuggable true
    buildConfigField "String", "BASE_URL", '"http://192.168.1.100:3000"'
}
```

4. Make sure both devices are on the **same WiFi network**

---

## Quick Reference

| Scenario | Build Type | Command | URL |
|----------|------------|---------|-----|
| Production | Release | `quick-build.bat` | `https://app.talio.in` |
| Android Emulator | Debug | `quick-build-debug.bat` | `http://10.0.2.2:3000` |
| Same WiFi | Debug | `quick-build-debug.bat` | Update to local IP |
| Different Network | Debug/Release | Either | Use ngrok or production |

---

## Rebuilding After URL Change

After updating the URL in `build.gradle`:

1. Run: `cd android`
2. Run: `quick-build.bat` (release) OR `quick-build-debug.bat` (debug)
3. Install new APK on device
4. Uninstall old version first if needed

---

## Current Setup Based on Your Requirements

Since you mentioned:
- ✅ Using `quick-build.bat` command
- ✅ Production domain is `https://app.talio.in`
- ✅ Different networks (phone and computer not on same WiFi)

**Recommended approach:**
1. Use **Release build** (`quick-build.bat`) - already configured for `https://app.talio.in`
2. Make sure your backend is deployed to `https://app.talio.in`
3. OR use **ngrok** for local testing without deployment

---

## What Was Fixed

### 1. Dynamic URL Configuration ✅
- Debug builds use `http://10.0.2.2:3000` (emulator) or configurable local IP
- Release builds use `https://app.talio.in` (production)
- No more hardcoded URL in MainActivity.kt

### 2. Notification Permission Request ✅
- App now requests notification permission immediately on first launch
- Works on Android 13+ (requires POST_NOTIFICATIONS permission)
- Android 12 and below don't need runtime permission for notifications

### Files Modified:
- `android/app/build.gradle` - Added buildConfig fields for URLs
- `android/app/src/main/java/sbs/zenova/twa/MainActivity.kt` - Uses BuildConfig.BASE_URL + requests permissions on launch
- `android/quick-build.bat` - Updated with production info
- `android/quick-build-debug.bat` - New debug build script

---

## Next Steps

1. **Choose your testing approach:**
   - Deploy to production → Use `quick-build.bat` 
   - Use ngrok → Update debug URL → Use `quick-build-debug.bat`

2. **Rebuild the APK** with new configuration

3. **Test notification permission:**
   - Uninstall old APK
   - Install new APK
   - On first launch, you should see notification permission dialog
   - Grant permission
   - Should no longer see "Connection error - Retrying..."
