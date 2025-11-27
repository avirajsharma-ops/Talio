#!/bin/bash

# Talio Desktop App Release Script
# This script builds both Mac and Windows apps and publishes them to GitHub Releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OWNER="avirajsharma-ops"
GITHUB_REPO="Tailo"

# Get version from mac-app/package.json
VERSION=$(node -p "require('./mac-app/package.json').version")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Talio Desktop App Release v${VERSION}${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if GitHub token is available
if [ -z "$GITHUB_TOKEN" ]; then
    # Try to extract from git remote
    GITHUB_TOKEN=$(git remote get-url origin | grep -oP '(?<=:)[^@]+(?=@)' || echo "")
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}Error: GITHUB_TOKEN not set${NC}"
        echo "Please set GITHUB_TOKEN environment variable or include it in git remote URL"
        exit 1
    fi
fi

echo -e "\n${YELLOW}Step 1: Building Mac App...${NC}"
cd mac-app
rm -rf release/*
npm run build
MAC_DMG="release/Talio-${VERSION}-arm64.dmg"
MAC_SIZE=$(du -h "$MAC_DMG" | cut -f1)
echo -e "${GREEN}✓ Mac build complete: ${MAC_DMG} (${MAC_SIZE})${NC}"
cd ..

echo -e "\n${YELLOW}Step 2: Building Windows App...${NC}"
cd windows-app  
rm -rf release/*
npm run build
WIN_EXE="release/Talio-Setup-${VERSION}.exe"
WIN_SIZE=$(du -h "$WIN_EXE" | cut -f1)
echo -e "${GREEN}✓ Windows build complete: ${WIN_EXE} (${WIN_SIZE})${NC}"
cd ..

echo -e "\n${YELLOW}Step 3: Creating GitHub Release...${NC}"
RELEASE_NOTES="## Talio Desktop Apps v${VERSION}

### Downloads
- **macOS (Apple Silicon)**: Talio-${VERSION}-arm64.dmg (${MAC_SIZE})
- **Windows (64-bit)**: Talio-Setup-${VERSION}.exe (${WIN_SIZE})

### Installation
- **Mac**: Download DMG, open it, drag Talio to Applications
- **Windows**: Download and run the installer"

# Create release
RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases" \
  -d "{\"tag_name\":\"v${VERSION}\",\"name\":\"Talio Desktop Apps v${VERSION}\",\"body\":$(echo "$RELEASE_NOTES" | jq -Rs .),\"draft\":false,\"prerelease\":false}")

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r '.id')

if [ "$RELEASE_ID" == "null" ] || [ -z "$RELEASE_ID" ]; then
    echo -e "${RED}Error creating release. Response:${NC}"
    echo "$RELEASE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Release created (ID: ${RELEASE_ID})${NC}"

echo -e "\n${YELLOW}Step 4: Uploading Mac DMG...${NC}"
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=Talio-${VERSION}-arm64.dmg" \
  --data-binary @"mac-app/${MAC_DMG}" > /dev/null
echo -e "${GREEN}✓ Mac DMG uploaded${NC}"

echo -e "\n${YELLOW}Step 5: Uploading Windows EXE...${NC}"
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=Talio-Setup-${VERSION}.exe" \
  --data-binary @"windows-app/${WIN_EXE}" > /dev/null
echo -e "${GREEN}✓ Windows EXE uploaded${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Release v${VERSION} Published!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nRelease URL: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/v${VERSION}"
echo -e "\nDownload Links:"
echo -e "  Mac: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${VERSION}/Talio-${VERSION}-arm64.dmg"
echo -e "  Win: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${VERSION}/Talio-Setup-${VERSION}.exe"

