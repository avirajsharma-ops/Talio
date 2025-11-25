# Talio HRMS - Android Application

Native Android app for Talio HRMS built with WebView and native permission handling.

## 🚀 Quick Start

```bash
./build-apk.sh
```

See [QUICK_START.md](QUICK_START.md) for the fastest way to build.

## 📱 Features

- **WebView-based**: Loads https://zenova.sbs with full functionality
- **Native Permissions**: Handles notifications and location natively
- **GPS Location Tracking**: For attendance and geofencing
- **Offline Support**: Caches web content for offline access
- **Deep Linking**: Opens app from web links automatically
- **File Upload**: Camera and gallery access for uploads
- **Material Design**: Native Android UI elements

## 📦 What Gets Built

- **APK** (talio-hrms.apk) - For direct installation
- **AAB** (talio-hrms.aab) - For Google Play Store
- **Keystore** (talio-release.keystore) - Signing key
- **Asset Links** (assetlinks.json) - For app verification

## 🔧 Build Requirements

- Java 17 or higher
- Internet connection (for dependencies)
- macOS, Linux, or Windows with WSL

## 📖 Documentation

- [QUICK_START.md](QUICK_START.md) - Fastest way to build
- [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) - Detailed build guide

## 🏗️ Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/sbs/zenova/twa/
│   │   │   ├── MainActivity.kt          # Main WebView activity
│   │   │   ├── TalioApplication.kt      # App initialization
│   │   │   └── services/
│   │   │       └── LocationTrackingService.kt
│   │   ├── res/                         # Resources (layouts, icons, etc.)
│   │   └── AndroidManifest.xml          # App configuration
│   └── build.gradle                     # App build configuration
├── build.gradle                         # Project build configuration
├── settings.gradle                      # Project settings
├── build-apk.sh                         # Automated build script
└── gradlew                              # Gradle wrapper
```

## 🔐 Security

**IMPORTANT**: The keystore file (`talio-release.keystore`) is critical!

- Store it securely (encrypted backup recommended)
- Never commit to version control
- Required for all future app updates
- If lost, you cannot update the app on Play Store

**Credentials:**
- Keystore Password: `talio2024`
- Key Alias: `talio-key`
- Key Password: `talio2024`

## 📱 Permissions

The app requests:

- **ACCESS_FINE_LOCATION** - GPS tracking
- **ACCESS_COARSE_LOCATION** - Network location
- **ACCESS_BACKGROUND_LOCATION** - Background tracking
- **INTERNET** - Web content
- **CAMERA** - Photo uploads
- **READ_MEDIA_IMAGES** - Gallery access

## 🌐 Digital Asset Links

For deep linking to work, upload `assetlinks.json` to:
```
https://zenova.sbs/.well-known/assetlinks.json
```

The build script automatically generates this file with the correct SHA256 fingerprint.

## 🐛 Troubleshooting

### Build Fails

```bash
./gradlew --stop
./gradlew clean
./build-apk.sh
```

### Java Version Issues

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### Permission Denied

```bash
chmod +x gradlew build-apk.sh
```

## 📞 Support

- Email: aviraj.sharma@mushroomworldgroup.com
- GitHub: https://github.com/avirajsharma-ops/Talio

## 📄 License

Proprietary - Talio HRMS

## 🎯 Version

**Current Version**: 1.0.0

**Package Name**: sbs.zenova.twa

**Min SDK**: 24 (Android 7.0)

**Target SDK**: 34 (Android 14)

