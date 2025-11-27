#!/bin/bash

# Script to update GitHub Release v1.0.3 using curl
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Updating GitHub Release v1.0.3${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get GitHub token from git config
GITHUB_TOKEN=$(git config --get remote.origin.url | sed -n 's/.*:\/\/.*:\(.*\)@github.com.*/\1/p')

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ Could not extract GitHub token${NC}"
    exit 1
fi

REPO_OWNER="avirajsharma-ops"
REPO_NAME="Tailo"
TAG="v1.0.3"

# Asset IDs from the release (we got these earlier)
OLD_MAC_INTEL_ID="321472044"  # Talio-1.0.3.dmg (wrong name)
OLD_MAC_ARM_ID="321472289"    # Talio-1.0.3-arm64.dmg
OLD_WIN_X64_ID="321472476"    # Talio-Setup-1.0.3-x64.exe
OLD_WIN_IA32_ID="321472695"   # Talio-Setup-1.0.3-ia32.exe

echo -e "${YELLOW}Step 1: Deleting old assets...${NC}"

# Delete old Mac Intel (wrong name)
echo "Deleting: Talio-1.0.3.dmg (ID: $OLD_MAC_INTEL_ID)"
curl -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/assets/$OLD_MAC_INTEL_ID" \
  -w "\nHTTP Status: %{http_code}\n" || echo "Failed or already deleted"

# Delete old Mac ARM
echo "Deleting: Talio-1.0.3-arm64.dmg (ID: $OLD_MAC_ARM_ID)"
curl -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/assets/$OLD_MAC_ARM_ID" \
  -w "\nHTTP Status: %{http_code}\n" || echo "Failed or already deleted"

# Delete old Windows x64
echo "Deleting: Talio-Setup-1.0.3-x64.exe (ID: $OLD_WIN_X64_ID)"
curl -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/assets/$OLD_WIN_X64_ID" \
  -w "\nHTTP Status: %{http_code}\n" || echo "Failed or already deleted"

# Delete old Windows ia32
echo "Deleting: Talio-Setup-1.0.3-ia32.exe (ID: $OLD_WIN_IA32_ID)"
curl -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/assets/$OLD_WIN_IA32_ID" \
  -w "\nHTTP Status: %{http_code}\n" || echo "Failed or already deleted"

echo -e "${GREEN}✓ Old assets deleted${NC}"
echo ""

# Get release ID
echo -e "${YELLOW}Step 2: Getting release ID...${NC}"
RELEASE_ID=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/tags/$TAG" | grep '"id":' | head -1 | sed 's/[^0-9]*//g')

echo "Release ID: $RELEASE_ID"
echo ""

# Get upload URL
UPLOAD_URL="https://uploads.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/$RELEASE_ID/assets"

echo -e "${YELLOW}Step 3: Uploading new assets...${NC}"

# Upload Mac ARM64
echo "Uploading: Talio-1.0.3-arm64.dmg"
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  "$UPLOAD_URL?name=Talio-1.0.3-arm64.dmg" \
  --data-binary @"mac-app/release/Talio-1.0.3-arm64.dmg" \
  -w "\nHTTP Status: %{http_code}\n" \
  -o /tmp/upload-arm64.json

# Upload Mac x64
echo "Uploading: Talio-1.0.3-x64.dmg"
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  "$UPLOAD_URL?name=Talio-1.0.3-x64.dmg" \
  --data-binary @"mac-app/release/Talio-1.0.3-x64.dmg" \
  -w "\nHTTP Status: %{http_code}\n" \
  -o /tmp/upload-x64.json

# Upload Windows x64
echo "Uploading: Talio-Setup-1.0.3-x64.exe"
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  "$UPLOAD_URL?name=Talio-Setup-1.0.3-x64.exe" \
  --data-binary @"windows-app/release/Talio-Setup-1.0.3-x64.exe" \
  -w "\nHTTP Status: %{http_code}\n" \
  -o /tmp/upload-win-x64.json

# Upload Windows ia32
echo "Uploading: Talio-Setup-1.0.3-ia32.exe"
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  "$UPLOAD_URL?name=Talio-Setup-1.0.3-ia32.exe" \
  --data-binary @"windows-app/release/Talio-Setup-1.0.3-ia32.exe" \
  -w "\nHTTP Status: %{http_code}\n" \
  -o /tmp/upload-win-ia32.json

echo -e "${GREEN}✓ All assets uploaded${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Release Updated Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

