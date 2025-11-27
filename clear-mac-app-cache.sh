#!/bin/bash

# Script to clear Talio Mac app cache for testing
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Clearing Talio Mac App Cache${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

APP_NAME="Talio"

# Function to remove directory if it exists
remove_if_exists() {
    local path="$1"
    local description="$2"
    
    if [ -d "$path" ]; then
        echo -e "${YELLOW}Removing: $description${NC}"
        echo "  Path: $path"
        rm -rf "$path"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${BLUE}ℹ Not found: $description${NC}"
        echo "  Path: $path"
    fi
    echo ""
}

# Close the app if it's running
echo -e "${YELLOW}Step 1: Closing Talio app if running...${NC}"
if pgrep -x "$APP_NAME" > /dev/null; then
    killall "$APP_NAME" 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ App closed${NC}"
else
    echo -e "${BLUE}ℹ App not running${NC}"
fi
echo ""

# Clear Electron app caches
echo -e "${YELLOW}Step 2: Clearing Electron app data...${NC}"

# Application Support
remove_if_exists "$HOME/Library/Application Support/$APP_NAME" "Application Support"

# Caches
remove_if_exists "$HOME/Library/Caches/$APP_NAME" "Main Cache"
remove_if_exists "$HOME/Library/Caches/com.talio.app" "App Cache (com.talio.app)"
remove_if_exists "$HOME/Library/Caches/com.talio.app.ShipIt" "ShipIt Cache"

# Preferences
echo -e "${YELLOW}Step 3: Clearing preferences...${NC}"
if [ -f "$HOME/Library/Preferences/com.talio.app.plist" ]; then
    echo "Removing: Preferences file"
    rm -f "$HOME/Library/Preferences/com.talio.app.plist"
    echo -e "${GREEN}✓ Removed${NC}"
else
    echo -e "${BLUE}ℹ Preferences file not found${NC}"
fi
echo ""

# Saved Application State
remove_if_exists "$HOME/Library/Saved Application State/com.talio.app.savedState" "Saved Application State"

# Logs
remove_if_exists "$HOME/Library/Logs/$APP_NAME" "Application Logs"

# WebKit/Browser cache
remove_if_exists "$HOME/Library/WebKit/$APP_NAME" "WebKit Cache"

# Cookies
echo -e "${YELLOW}Step 4: Clearing cookies...${NC}"
if [ -f "$HOME/Library/Cookies/com.talio.app.binarycookies" ]; then
    echo "Removing: Cookies"
    rm -f "$HOME/Library/Cookies/com.talio.app.binarycookies"
    echo -e "${GREEN}✓ Removed${NC}"
else
    echo -e "${BLUE}ℹ Cookies not found${NC}"
fi
echo ""

# HTTPStorages
remove_if_exists "$HOME/Library/HTTPStorages/com.talio.app" "HTTP Storages"

# Clear any IndexedDB or localStorage
remove_if_exists "$HOME/Library/Application Support/$APP_NAME/IndexedDB" "IndexedDB"
remove_if_exists "$HOME/Library/Application Support/$APP_NAME/Local Storage" "Local Storage"
remove_if_exists "$HOME/Library/Application Support/$APP_NAME/Session Storage" "Session Storage"

# Clear service worker cache
remove_if_exists "$HOME/Library/Application Support/$APP_NAME/Service Worker" "Service Worker Cache"

# Clear GPU cache
remove_if_exists "$HOME/Library/Application Support/$APP_NAME/GPUCache" "GPU Cache"

# Clear Code Cache
remove_if_exists "$HOME/Library/Application Support/$APP_NAME/Code Cache" "Code Cache"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Cache Cleared Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}You can now launch the Talio app for fresh testing.${NC}"
echo -e "${BLUE}The app will start with a clean slate.${NC}"
echo ""

