#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Talio HRMS - Rebuild APK${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Clean previous build
echo -e "${YELLOW}Step 1: Cleaning previous build...${NC}"
cd android
./gradlew clean
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

# Step 2: Build release APK
echo -e "${YELLOW}Step 2: Building release APK...${NC}"
./gradlew assembleRelease
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 3: Copy APK to public/downloads
echo -e "${YELLOW}Step 3: Copying APK to public/downloads...${NC}"
cd ..
mkdir -p public/downloads
cp android/app/build/outputs/apk/release/app-release.apk public/downloads/talio-hrms-app.apk
echo -e "${GREEN}✓ APK copied to public/downloads/talio-hrms-app.apk${NC}"
echo ""

# Step 4: Show APK info
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  APK Information${NC}"
echo -e "${BLUE}========================================${NC}"
ls -lh public/downloads/talio-hrms-app.apk
echo ""

echo -e "${GREEN}✓ APK rebuild complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test the APK locally by installing it on your Android device"
echo -e "  2. Deploy to server: ${BLUE}./deploy-to-server.sh${NC}"
echo ""

