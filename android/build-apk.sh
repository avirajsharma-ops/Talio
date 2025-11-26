#!/bin/bash

# Talio HRMS - Android APK/AAB Build Script
# This script generates the keystore, builds APK and AAB files

set -e

echo "========================================="
echo "Talio HRMS - Android Build Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Generate Keystore if it doesn't exist
echo -e "${YELLOW}Step 1: Checking for keystore...${NC}"
if [ ! -f "keystore/talio-release.keystore" ]; then
    echo -e "${YELLOW}Keystore not found. Generating new keystore...${NC}"
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
    
    echo -e "${GREEN}✓ Keystore generated successfully!${NC}"
else
    echo -e "${GREEN}✓ Keystore already exists${NC}"
fi

# Step 2: Get SHA256 fingerprint
echo ""
echo -e "${YELLOW}Step 2: Getting SHA256 fingerprint...${NC}"
SHA256=$(keytool -list -v -keystore keystore/talio-release.keystore -storepass talio2024 | grep "SHA256:" | cut -d' ' -f3)
echo -e "${GREEN}SHA256 Fingerprint: ${SHA256}${NC}"

# Step 3: Clean previous builds
echo ""
echo -e "${YELLOW}Step 3: Cleaning previous builds...${NC}"
./gradlew clean
echo -e "${GREEN}✓ Clean completed${NC}"

# Step 4: Build APK
echo ""
echo -e "${YELLOW}Step 4: Building Release APK...${NC}"
./gradlew assembleRelease
echo -e "${GREEN}✓ APK built successfully!${NC}"

# Step 5: Build AAB (Android App Bundle)
echo ""
echo -e "${YELLOW}Step 5: Building Release AAB...${NC}"
./gradlew bundleRelease
echo -e "${GREEN}✓ AAB built successfully!${NC}"

# Step 6: Copy outputs to release folder
echo ""
echo -e "${YELLOW}Step 6: Organizing build outputs...${NC}"
mkdir -p ../release
cp app/build/outputs/apk/release/app-release.apk ../release/talio-hrms.apk
cp app/build/outputs/bundle/release/app-release.aab ../release/talio-hrms.aab
cp keystore/talio-release.keystore ../release/talio-release.keystore

# Step 7: Generate assetlinks.json
echo ""
echo -e "${YELLOW}Step 7: Generating assetlinks.json...${NC}"
cat > ../release/assetlinks.json << EOF
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "sbs.zenova.twa",
    "sha256_cert_fingerprints": ["${SHA256}"]
  }
}]
EOF
echo -e "${GREEN}✓ assetlinks.json generated${NC}"

# Step 8: Create README
echo ""
echo -e "${YELLOW}Step 8: Creating README...${NC}"
cat > ../release/README.md << EOF
# Talio HRMS - Android Release

## Build Information
- **Package Name**: sbs.zenova.twa
- **Version**: 1.0.0
- **Build Date**: $(date)
- **SHA256 Fingerprint**: ${SHA256}

## Files Included
1. **talio-hrms.apk** - Android APK file (for direct installation)
2. **talio-hrms.aab** - Android App Bundle (for Google Play Store)
3. **talio-release.keystore** - Signing keystore (KEEP THIS SECURE!)
4. **assetlinks.json** - Digital Asset Links file

## Installation Instructions

### APK Installation (Direct)
1. Enable "Install from Unknown Sources" on your Android device
2. Transfer \`talio-hrms.apk\` to your device
3. Open the APK file and follow installation prompts

### Play Store Deployment (AAB)
1. Go to Google Play Console
2. Create a new app or select existing app
3. Upload \`talio-hrms.aab\` to the release track
4. Complete the store listing and publish

## Digital Asset Links Setup

Upload \`assetlinks.json\` to your web server at:
\`\`\`
https://zenova.sbs/.well-known/assetlinks.json
\`\`\`

This file is required for:
- App Links (deep linking)
- Trusted Web Activity features
- Seamless web-to-app transitions

## Keystore Information

**IMPORTANT**: Keep \`talio-release.keystore\` secure!

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
EOF
echo -e "${GREEN}✓ README created${NC}"

# Final summary
echo ""
echo "========================================="
echo -e "${GREEN}Build Completed Successfully!${NC}"
echo "========================================="
echo ""
echo "Output files are in the 'release' folder:"
echo "  - talio-hrms.apk (APK file)"
echo "  - talio-hrms.aab (App Bundle)"
echo "  - talio-release.keystore (Signing key)"
echo "  - assetlinks.json (Digital Asset Links)"
echo "  - README.md (Documentation)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload assetlinks.json to https://zenova.sbs/.well-known/assetlinks.json"
echo "2. Install APK on your device for testing"
echo "3. Upload AAB to Google Play Console for production"
echo ""
echo -e "${RED}IMPORTANT: Keep talio-release.keystore secure!${NC}"
echo ""

