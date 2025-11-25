#!/bin/bash

# Script to get FCM token from Android device for testing

echo "🔍 Getting FCM Token from Android Device"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ ADB not found. Please install Android SDK Platform Tools.${NC}"
    exit 1
fi

# Check if device is connected
DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No Android device connected. Please connect a device or start an emulator.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Device connected${NC}"
echo ""

echo -e "${YELLOW}📱 Instructions:${NC}"
echo "1. Make sure Talio app is installed on your device"
echo "2. Open the app and login"
echo "3. The FCM token will be logged automatically"
echo ""
echo -e "${CYAN}Watching for FCM token... (Press Ctrl+C to stop)${NC}"
echo ""

# Clear logs and watch for FCM token
adb logcat -c
adb logcat | grep --color=always -E "FCM Token|Firebase token|TalioFCM.*token"

