#!/bin/bash

# Talio HRMS - Build APK for app.talio.in
# This script builds the Android APK with the new domain

set -e  # Exit on error

echo "🚀 Building Talio HRMS APK for app.talio.in"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Error: android directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Error: Java is not installed${NC}"
    echo "Please install Java JDK 17 or higher"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo -e "${RED}❌ Error: Java 17 or higher is required${NC}"
    echo "Current Java version: $JAVA_VERSION"
    exit 1
fi

echo -e "${GREEN}✅ Java version: $JAVA_VERSION${NC}"
echo ""

# Navigate to android directory
cd android

echo -e "${BLUE}📦 Step 1: Cleaning previous builds...${NC}"
./gradlew clean

echo ""
echo -e "${BLUE}🔨 Step 2: Building Release APK...${NC}"
./gradlew assembleRelease

echo ""
echo -e "${BLUE}📦 Step 3: Building Release AAB (for Play Store)...${NC}"
./gradlew bundleRelease

# Go back to root
cd ..

# Create release directory
RELEASE_DIR="release-app"
mkdir -p "$RELEASE_DIR"

echo ""
echo -e "${BLUE}📋 Step 4: Copying build artifacts...${NC}"

# Copy APK
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp android/app/build/outputs/apk/release/app-release.apk "$RELEASE_DIR/talio-hrms-app.apk"
    echo -e "${GREEN}✅ APK copied to $RELEASE_DIR/talio-hrms-app.apk${NC}"
else
    echo -e "${RED}❌ APK not found${NC}"
fi

# Copy AAB
if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
    cp android/app/build/outputs/bundle/release/app-release.aab "$RELEASE_DIR/talio-hrms-app.aab"
    echo -e "${GREEN}✅ AAB copied to $RELEASE_DIR/talio-hrms-app.aab${NC}"
else
    echo -e "${RED}❌ AAB not found${NC}"
fi

# Copy keystore
if [ -f "android/keystore/talio-release.keystore" ]; then
    cp android/keystore/talio-release.keystore "$RELEASE_DIR/talio-release.keystore"
    echo -e "${GREEN}✅ Keystore copied${NC}"
fi

# Copy assetlinks.json
if [ -f "public/.well-known/assetlinks.json" ]; then
    cp public/.well-known/assetlinks.json "$RELEASE_DIR/assetlinks.json"
    echo -e "${GREEN}✅ assetlinks.json copied${NC}"
fi

# Get APK info
if [ -f "$RELEASE_DIR/talio-hrms-app.apk" ]; then
    APK_SIZE=$(du -h "$RELEASE_DIR/talio-hrms-app.apk" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ APK Size: $APK_SIZE${NC}"
fi

# Create README
cat > "$RELEASE_DIR/README.md" << 'EOF'
# Talio HRMS - Android Release (app.talio.in)

## Build Information
- **Package Name**: sbs.zenova.twa
- **Domain**: app.talio.in
- **Version**: 1.0.1 (Build 2)
- **Build Date**: $(date)

## Files Included
1. **talio-hrms-app.apk** - Android APK file (for direct installation)
2. **talio-hrms-app.aab** - Android App Bundle (for Google Play Store)
3. **talio-release.keystore** - Signing keystore (KEEP THIS SECURE!)
4. **assetlinks.json** - Digital Asset Links file

## Installation Instructions

### APK Installation (Direct)
1. Enable "Install from Unknown Sources" on your Android device
2. Transfer `talio-hrms-app.apk` to your device
3. Open the APK file and follow installation prompts

### Play Store Deployment (AAB)
1. Go to Google Play Console
2. Create a new app or select existing app
3. Upload `talio-hrms-app.aab` to the release track
4. Complete the store listing and publish

## Digital Asset Links Setup

Upload `assetlinks.json` to your web server at:
```
https://app.talio.in/.well-known/assetlinks.json
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
- **Notifications**: For push notifications via Firebase
- **Location**: For attendance tracking and geofencing (REQUIRED)
- **Internet**: For web content and API calls
- **Camera**: For future features (profile photos, document scanning)
- **Storage**: For file uploads and downloads

## Features

- Full WebView-based app with native permissions
- Firebase Cloud Messaging for push notifications
- GPS location tracking for attendance (MANDATORY)
- Geofencing with office radius validation
- Real-time Socket.IO updates
- Offline support with caching
- Deep linking support
- Material Design UI

## Important Notes

### Location Permission
- Location access is **REQUIRED** for clock in/out
- Employees cannot clock in/out without enabling location
- Location is validated against office geofence radius
- Strict mode enforces geofence boundaries

### Domain Configuration
- Base URL: https://app.talio.in
- Make sure SSL certificate is valid
- Upload assetlinks.json to the domain

## Deployment Checklist

- [ ] Upload assetlinks.json to https://app.talio.in/.well-known/assetlinks.json
- [ ] Verify SSL certificate is valid for app.talio.in
- [ ] Test APK installation on Android device
- [ ] Verify location permission prompt appears
- [ ] Test clock in/out with location enabled
- [ ] Test clock in/out with location disabled (should fail)
- [ ] Verify geofence validation works
- [ ] Test push notifications
- [ ] Test deep links

## Support

For issues or questions, contact: aviraj.sharma@mushroomworldgroup.com
EOF

# Replace date placeholder
BUILD_DATE=$(date)
sed -i.bak "s/\$(date)/$BUILD_DATE/g" "$RELEASE_DIR/README.md" && rm "$RELEASE_DIR/README.md.bak"

echo ""
echo -e "${GREEN}=============================================="
echo "✅ Build Complete!"
echo "==============================================\${NC}"
echo ""
echo -e "${YELLOW}📁 Release files are in: $RELEASE_DIR/${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Upload assetlinks.json to https://app.talio.in/.well-known/assetlinks.json"
echo "2. Install APK on your device: $RELEASE_DIR/talio-hrms-app.apk"
echo "3. Test location permission and clock in/out"
echo "4. Deploy AAB to Google Play Store (optional)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Keep talio-release.keystore secure!${NC}"
echo ""

