#!/bin/bash

# Talio Desktop App Release Script
# Builds all architectures and publishes to GitHub Releases
# - macOS: Intel (x64) + Apple Silicon (arm64)
# - Windows: 64-bit (x64) + 32-bit (ia32)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OWNER="avirajsharma-ops"
GITHUB_REPO="Tailo"

# Get version from mac-app/package.json
VERSION=$(node -p "require('./mac-app/package.json').version")

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Talio Desktop App Release v${VERSION}${NC}"
echo -e "${GREEN}  Building all architectures${NC}"
echo -e "${GREEN}================================================${NC}"

# Check if GitHub token is available
if [ -z "$GITHUB_TOKEN" ]; then
    # Try to extract from git remote (macOS compatible)
    GITHUB_TOKEN=$(git remote get-url origin | sed -n 's/.*:\([^@]*\)@.*/\1/p')
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}Error: GITHUB_TOKEN not set${NC}"
        echo "Please set GITHUB_TOKEN environment variable or include it in git remote URL"
        exit 1
    fi
fi

# ========== MAC BUILDS ==========
echo -e "\n${BLUE}========== macOS Builds ==========${NC}"

echo -e "\n${YELLOW}Building Mac (Apple Silicon - arm64)...${NC}"
cd mac-app
rm -rf release/*
npm run build:arm64
MAC_ARM64="release/Talio-${VERSION}-arm64.dmg"
MAC_ARM64_SIZE=$(du -h "$MAC_ARM64" | cut -f1)
echo -e "${GREEN}✓ Mac arm64: ${MAC_ARM64} (${MAC_ARM64_SIZE})${NC}"

echo -e "\n${YELLOW}Building Mac (Intel - x64)...${NC}"
npm run build:x64
MAC_X64="release/Talio-${VERSION}-x64.dmg"
MAC_X64_SIZE=$(du -h "$MAC_X64" | cut -f1)
echo -e "${GREEN}✓ Mac x64: ${MAC_X64} (${MAC_X64_SIZE})${NC}"
cd ..

# ========== WINDOWS BUILDS ==========
echo -e "\n${BLUE}========== Windows Builds ==========${NC}"

echo -e "\n${YELLOW}Building Windows (64-bit - x64)...${NC}"
cd windows-app
rm -rf release/*
npm run build:x64
WIN_X64="release/Talio-Setup-${VERSION}-x64.exe"
WIN_X64_SIZE=$(du -h "$WIN_X64" | cut -f1)
echo -e "${GREEN}✓ Windows x64: ${WIN_X64} (${WIN_X64_SIZE})${NC}"

echo -e "\n${YELLOW}Building Windows (32-bit - ia32)...${NC}"
npm run build:ia32
WIN_IA32="release/Talio-Setup-${VERSION}-ia32.exe"
WIN_IA32_SIZE=$(du -h "$WIN_IA32" | cut -f1)
echo -e "${GREEN}✓ Windows ia32: ${WIN_IA32} (${WIN_IA32_SIZE})${NC}"
cd ..

# ========== CREATE GITHUB RELEASE ==========
echo -e "\n${BLUE}========== Publishing to GitHub ==========${NC}"

RELEASE_NOTES="## Talio Desktop Apps v${VERSION}

### Downloads

#### macOS
| Architecture | File | Size |
|-------------|------|------|
| Apple Silicon (M1/M2/M3/M4) | Talio-${VERSION}-arm64.dmg | ${MAC_ARM64_SIZE} |
| Intel (x64) | Talio-${VERSION}-x64.dmg | ${MAC_X64_SIZE} |

#### Windows
| Architecture | File | Size |
|-------------|------|------|
| 64-bit (x64) | Talio-Setup-${VERSION}-x64.exe | ${WIN_X64_SIZE} |
| 32-bit (x86) | Talio-Setup-${VERSION}-ia32.exe | ${WIN_IA32_SIZE} |

### Installation
- **Mac**: Download DMG for your chip, open it, drag Talio to Applications
- **Windows**: Download installer for your system, run the installer

### What's New
- Full architecture support for all platforms
- Improved compatibility and performance"

echo -e "\n${YELLOW}Creating GitHub Release...${NC}"
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

# Upload all assets
echo -e "\n${YELLOW}Uploading Mac (arm64)...${NC}"
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=Talio-${VERSION}-arm64.dmg" \
  --data-binary @"mac-app/${MAC_ARM64}" > /dev/null
echo -e "${GREEN}✓ Uploaded${NC}"

echo -e "\n${YELLOW}Uploading Mac (x64)...${NC}"
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=Talio-${VERSION}-x64.dmg" \
  --data-binary @"mac-app/${MAC_X64}" > /dev/null
echo -e "${GREEN}✓ Uploaded${NC}"

echo -e "\n${YELLOW}Uploading Windows (x64)...${NC}"
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=Talio-Setup-${VERSION}-x64.exe" \
  --data-binary @"windows-app/${WIN_X64}" > /dev/null
echo -e "${GREEN}✓ Uploaded${NC}"

echo -e "\n${YELLOW}Uploading Windows (ia32)...${NC}"
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${RELEASE_ID}/assets?name=Talio-Setup-${VERSION}-ia32.exe" \
  --data-binary @"windows-app/${WIN_IA32}" > /dev/null
echo -e "${GREEN}✓ Uploaded${NC}"

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  Release v${VERSION} Published Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\nRelease URL: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/v${VERSION}"
echo -e "\n${BLUE}Download Links:${NC}"
echo -e "  Mac (arm64): https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${VERSION}/Talio-${VERSION}-arm64.dmg"
echo -e "  Mac (x64):   https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${VERSION}/Talio-${VERSION}-x64.dmg"
echo -e "  Win (x64):   https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${VERSION}/Talio-Setup-${VERSION}-x64.exe"
echo -e "  Win (ia32):  https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${VERSION}/Talio-Setup-${VERSION}-ia32.exe"

