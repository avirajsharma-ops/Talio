# Talio HRMS - Android Build Instructions

## Prerequisites

Before building the Android app, ensure you have the following installed:

1. **Java Development Kit (JDK) 17 or higher**
   ```bash
   java -version
   ```
   If not installed, download from: https://adoptium.net/

2. **Android SDK** (Optional - Gradle will download it automatically)
   - You can install Android Studio for a complete setup
   - Or let Gradle handle SDK installation

## Quick Build (Automated)

The easiest way to build the APK and AAB files:

```bash
cd android
./build-apk.sh
```

This script will:
1. Generate a signing keystore (if not exists)
2. Build the release APK
3. Build the release AAB (App Bundle)
4. Generate assetlinks.json with correct SHA256 fingerprint
5. Create a comprehensive README
6. Place all files in the `release/` folder

## Manual Build

If you prefer to build manually:

### 1. Generate Keystore

```bash
cd android
mkdir -p keystore

keytool -genkeypair \
    -alias talio-key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -keystore keystore/talio-release.keystore \
    -storepass talio2024 \
    -keypass talio2024 \
    -dname "CN=Talio HRMS, OU=Development, O=Talio, L=City, S=State, C=IN"
```

### 2. Build APK

```bash
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

### 3. Build AAB

```bash
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### 4. Get SHA256 Fingerprint

```bash
keytool -list -v -keystore keystore/talio-release.keystore -storepass talio2024 | grep "SHA256:"
```

## Build Outputs

After running the build script, you'll find these files in the `release/` folder:

- **talio-hrms.apk** - Ready to install on Android devices
- **talio-hrms.aab** - Ready to upload to Google Play Store
- **talio-release.keystore** - Signing key (KEEP SECURE!)
- **assetlinks.json** - Digital Asset Links file
- **README.md** - Detailed documentation

## Installing the APK

### On Physical Device

1. Transfer `talio-hrms.apk` to your Android device
2. Enable "Install from Unknown Sources" in Settings
3. Open the APK file and tap "Install"

### Using ADB

```bash
adb install release/talio-hrms.apk
```

## Uploading to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing app
3. Navigate to "Release" → "Production" (or Testing track)
4. Click "Create new release"
5. Upload `talio-hrms.aab`
6. Complete the release form and publish

## Digital Asset Links Setup

For deep linking and app verification to work:

1. Upload `assetlinks.json` to your web server:
   ```
   https://zenova.sbs/.well-known/assetlinks.json
   ```

2. Verify it's accessible:
   ```bash
   curl https://zenova.sbs/.well-known/assetlinks.json
   ```

3. Test with Google's tool:
   https://developers.google.com/digital-asset-links/tools/generator

## Troubleshooting

### Java Version Issues

If you get Java version errors:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### Gradle Daemon Issues

If build hangs or fails:
```bash
./gradlew --stop
./gradlew clean
./gradlew assembleRelease
```

### Permission Denied

If you get permission errors:
```bash
chmod +x gradlew
chmod +x build-apk.sh
```

### Build Cache Issues

Clear build cache:
```bash
./gradlew clean
rm -rf .gradle
rm -rf app/build
```

## App Features

The Android app includes:

✅ **WebView-based** - Loads your web app (https://zenova.sbs)
✅ **Native Permissions** - Handles notifications and location natively
✅ **GPS Tracking** - For attendance and geofencing
✅ **Offline Support** - Caches web content
✅ **Deep Linking** - Opens app from web links
✅ **Material Design** - Native Android UI elements
✅ **File Upload** - Camera and gallery access
✅ **Background Location** - Continuous tracking when needed

## Security Notes

🔒 **IMPORTANT**: Keep `talio-release.keystore` secure!

- Store it in a safe location (encrypted backup)
- Never commit it to version control
- You need this keystore for ALL future app updates
- If lost, you cannot update the app on Play Store

**Keystore Credentials:**
- Keystore Password: `talio2024`
- Key Alias: `talio-key`
- Key Password: `talio2024`

## Support

For issues or questions:
- Email: aviraj.sharma@mushroomworldgroup.com
- GitHub: https://github.com/avirajsharma-ops/Talio

## Version History

- **v1.0.0** (Initial Release)
  - WebView-based app
  - GPS location tracking
  - Native permission handling
  - Deep linking support

