# Talio HRMS - Android Release

## Build Information
- **Package Name**: sbs.zenova.twa
- **Version**: 1.0.0
- **Build Date**: Sat Nov 22 12:14:58 IST 2025
- **SHA256 Fingerprint**: 02:4A:49:F6:DD:07:DD:E1:CF:A1:2C:F5:09:1C:7B:DA:61:78:D3:45:5C:5F:9D:C3:A2:5B:E7:31:5A:AE:A3:DC

## Files Included
1. **talio-hrms.apk** - Android APK file (for direct installation)
2. **talio-hrms.aab** - Android App Bundle (for Google Play Store)
3. **talio-release.keystore** - Signing keystore (KEEP THIS SECURE!)
4. **assetlinks.json** - Digital Asset Links file

## Installation Instructions

### APK Installation (Direct)
1. Enable "Install from Unknown Sources" on your Android device
2. Transfer `talio-hrms.apk` to your device
3. Open the APK file and follow installation prompts

### Play Store Deployment (AAB)
1. Go to Google Play Console
2. Create a new app or select existing app
3. Upload `talio-hrms.aab` to the release track
4. Complete the store listing and publish

## Digital Asset Links Setup

Upload `assetlinks.json` to your web server at:
```
https://zenova.sbs/.well-known/assetlinks.json
```

This file is required for:
- App Links (deep linking)
- Trusted Web Activity features
- Seamless web-to-app transitions

## Keystore Information

**IMPORTANT**: Keep `talio-release.keystore` secure!

- **Keystore Password**: talio2024
- **Key Alias**: talio-key
- **Key Password**: talio2024

You'll need this keystore for all future app updates.

## Permissions

The app requests the following permissions:
- **Notifications**: For push notifications via OneSignal
- **Location**: For attendance tracking and geofencing
- **Internet**: For web content and API calls
- **Camera**: For future features (profile photos, document scanning)
- **Storage**: For file uploads and downloads

## Features

- Full WebView-based app with native permissions
- OneSignal push notifications integration
- GPS location tracking for attendance
- Offline support with caching
- Deep linking support
- Material Design UI

## Support

For issues or questions, contact: aviraj.sharma@mushroomworldgroup.com
