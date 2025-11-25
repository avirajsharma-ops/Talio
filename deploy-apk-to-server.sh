#!/bin/bash

# Talio HRMS - Deploy APK to Server
# This script builds the APK and deploys it to the server for download

set -e  # Exit on error

echo "🚀 Talio HRMS - Build & Deploy APK"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SERVER_IP="${1:-YOUR_SERVER_IP}"
SERVER_USER="root"
SERVER_PATH="/root/Talio"

if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
    echo -e "${RED}❌ Error: Please provide server IP${NC}"
    echo "Usage: ./deploy-apk-to-server.sh YOUR_SERVER_IP"
    echo "Example: ./deploy-apk-to-server.sh 123.45.67.89"
    exit 1
fi

echo -e "${BLUE}Server: ${SERVER_USER}@${SERVER_IP}${NC}"
echo -e "${BLUE}Path: ${SERVER_PATH}${NC}"
echo ""

# Step 1: Build APK
echo -e "${BLUE}📦 Step 1: Building APK...${NC}"
./build-apk-app.sh

if [ ! -f "release-app/talio-hrms-app.apk" ]; then
    echo -e "${RED}❌ APK build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ APK built successfully${NC}"
echo ""

# Step 2: Create directories on server
echo -e "${BLUE}📁 Step 2: Creating directories on server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${SERVER_PATH}/public/downloads ${SERVER_PATH}/public/.well-known"
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Step 3: Upload APK
echo -e "${BLUE}📤 Step 3: Uploading APK to server...${NC}"
scp release-app/talio-hrms-app.apk ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/public/downloads/
echo -e "${GREEN}✅ APK uploaded${NC}"
echo ""

# Step 4: Upload assetlinks.json
echo -e "${BLUE}📤 Step 4: Uploading assetlinks.json...${NC}"
scp release-app/assetlinks.json ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/public/.well-known/
echo -e "${GREEN}✅ assetlinks.json uploaded${NC}"
echo ""

# Step 5: Set permissions
echo -e "${BLUE}🔐 Step 5: Setting permissions...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "chmod 755 ${SERVER_PATH}/public/downloads && chmod 644 ${SERVER_PATH}/public/downloads/talio-hrms-app.apk && chmod 644 ${SERVER_PATH}/public/.well-known/assetlinks.json"
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Step 6: Rebuild Docker container
echo -e "${BLUE}🐳 Step 6: Rebuilding Docker container...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && docker-compose down && docker-compose up -d --build"
echo -e "${GREEN}✅ Docker container rebuilt${NC}"
echo ""

# Step 7: Verify deployment
echo -e "${BLUE}🔍 Step 7: Verifying deployment...${NC}"

# Get domain from server
DOMAIN=$(ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && grep -o 'app.talio.in' docker-compose.yml | head -1" || echo "app.talio.in")

echo ""
echo -e "${GREEN}=============================================="
echo "✅ Deployment Complete!"
echo "==============================================\${NC}"
echo ""
echo -e "${YELLOW}📱 Download APK:${NC}"
echo "   https://${DOMAIN}/downloads/talio-hrms-app.apk"
echo ""
echo -e "${YELLOW}🌐 Download Page:${NC}"
echo "   https://${DOMAIN}/download"
echo ""
echo -e "${YELLOW}🔗 Asset Links:${NC}"
echo "   https://${DOMAIN}/.well-known/assetlinks.json"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Open https://${DOMAIN}/download on your Android device"
echo "2. Download and install the APK"
echo "3. Grant location permission when prompted"
echo "4. Login and test clock in/out"
echo ""
echo -e "${YELLOW}⚠️  Remember: Location permission is REQUIRED for attendance${NC}"
echo ""

# Test URLs
echo -e "${BLUE}Testing URLs...${NC}"
echo ""

# Test APK download
APK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/downloads/talio-hrms-mwg.apk || echo "000")
if [ "$APK_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ APK download: https://${DOMAIN}/downloads/talio-hrms-mwg.apk${NC}"
else
    echo -e "${RED}❌ APK download failed (HTTP $APK_STATUS)${NC}"
fi

# Test assetlinks.json
ASSET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/.well-known/assetlinks.json || echo "000")
if [ "$ASSET_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Asset Links: https://${DOMAIN}/.well-known/assetlinks.json${NC}"
else
    echo -e "${RED}❌ Asset Links failed (HTTP $ASSET_STATUS)${NC}"
fi

# Test download page
DOWNLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/download || echo "000")
if [ "$DOWNLOAD_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Download Page: https://${DOMAIN}/download${NC}"
else
    echo -e "${YELLOW}⚠️  Download Page: https://${DOMAIN}/download (HTTP $DOWNLOAD_STATUS)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All done! Share the download link with your team!${NC}"
echo ""

