#!/bin/bash

# Android Push Notification Test Script
# This script helps you test WhatsApp-like notifications

echo "🔔 Talio Android Push Notification Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Menu
echo "Select test scenario:"
echo "1. View FCM logs (real-time)"
echo "2. Check if app is running"
echo "3. Force stop app (to test killed state)"
echo "4. Clear app data and restart"
echo "5. Check notification channels"
echo "6. Test notification (requires backend)"
echo "7. View all logs"
echo "8. Rebuild and install app"
echo ""
read -p "Enter choice (1-8): " choice

case $choice in
    1)
        echo -e "${YELLOW}📱 Watching FCM logs... (Press Ctrl+C to stop)${NC}"
        echo ""
        adb logcat -c  # Clear logs
        adb logcat | grep --color=always -E "TalioFCM|Firebase|Notification"
        ;;
    
    2)
        echo -e "${YELLOW}🔍 Checking if Talio app is running...${NC}"
        RUNNING=$(adb shell "ps | grep sbs.zenova.twa")
        if [ -z "$RUNNING" ]; then
            echo -e "${RED}❌ App is NOT running${NC}"
        else
            echo -e "${GREEN}✅ App is running:${NC}"
            echo "$RUNNING"
        fi
        ;;
    
    3)
        echo -e "${YELLOW}🛑 Force stopping Talio app...${NC}"
        adb shell am force-stop sbs.zenova.twa
        echo -e "${GREEN}✅ App force stopped${NC}"
        echo ""
        echo "Now send a test notification from another account."
        echo "You should receive a notification even though the app is killed!"
        echo ""
        echo -e "${YELLOW}Watching for notifications... (Press Ctrl+C to stop)${NC}"
        adb logcat -c
        adb logcat | grep --color=always -E "TalioFCM|Firebase"
        ;;
    
    4)
        echo -e "${YELLOW}🗑️  Clearing app data...${NC}"
        adb shell pm clear sbs.zenova.twa
        echo -e "${GREEN}✅ App data cleared${NC}"
        echo ""
        echo -e "${YELLOW}🚀 Launching app...${NC}"
        adb shell am start -n sbs.zenova.twa/.MainActivity
        echo -e "${GREEN}✅ App launched${NC}"
        ;;
    
    5)
        echo -e "${YELLOW}📋 Checking notification channels...${NC}"
        echo ""
        adb shell cmd notification list_channels sbs.zenova.twa
        ;;
    
    6)
        echo -e "${YELLOW}🔔 Testing notification...${NC}"
        echo ""
        echo "This requires your backend to be running."
        echo ""
        read -p "Enter user ID to send test notification: " USER_ID
        read -p "Enter notification title: " TITLE
        read -p "Enter notification message: " MESSAGE
        
        echo ""
        echo -e "${YELLOW}Sending test notification via backend...${NC}"
        echo "You need to call your backend API to send the notification."
        echo ""
        echo "Example curl command:"
        echo "curl -X POST http://localhost:3000/api/notifications/send \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"userId\": \"$USER_ID\", \"title\": \"$TITLE\", \"message\": \"$MESSAGE\"}'"
        ;;
    
    7)
        echo -e "${YELLOW}📱 Watching all logs... (Press Ctrl+C to stop)${NC}"
        echo ""
        adb logcat -c
        adb logcat
        ;;
    
    8)
        echo -e "${YELLOW}🔨 Rebuilding app...${NC}"
        echo ""
        ./gradlew clean assembleRelease
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Build successful${NC}"
            echo ""
            echo -e "${YELLOW}📲 Installing app...${NC}"
            adb install -r app/build/outputs/apk/release/app-release.apk
            
            if [ $? -eq 0 ]; then
                echo ""
                echo -e "${GREEN}✅ App installed successfully${NC}"
                echo ""
                echo -e "${YELLOW}🚀 Launching app...${NC}"
                adb shell am start -n sbs.zenova.twa/.MainActivity
                echo -e "${GREEN}✅ App launched${NC}"
            else
                echo -e "${RED}❌ Installation failed${NC}"
            fi
        else
            echo -e "${RED}❌ Build failed${NC}"
        fi
        ;;
    
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"

