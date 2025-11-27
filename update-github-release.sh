#!/bin/bash

# Script to update GitHub Release v1.0.3 with new application files
# This script will help you delete old files and upload new ones

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Talio Release Update Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}Please install it first:${NC}"
    echo -e "  brew install gh"
    echo ""
    echo -e "${YELLOW}Or follow manual instructions below:${NC}"
    echo ""
    echo -e "${BLUE}Manual Steps:${NC}"
    echo "1. Go to: https://github.com/avirajsharma-ops/Tailo/releases/edit/v1.0.3"
    echo "2. Delete the old file: Talio-1.0.3.dmg (the incorrectly named Intel Mac version)"
    echo "3. Upload these new files:"
    echo "   - mac-app/release/Talio-1.0.3-arm64.dmg"
    echo "   - mac-app/release/Talio-1.0.3-x64.dmg"
    echo "   - windows-app/release/Talio-Setup-1.0.3-x64.exe"
    echo "   - windows-app/release/Talio-Setup-1.0.3-ia32.exe"
    echo ""
    echo -e "${YELLOW}After uploading, run this script again to update download links${NC}"
    exit 1
fi

# Authenticate with GitHub
echo -e "${YELLOW}Checking GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Please authenticate with GitHub:${NC}"
    gh auth login
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Repository details
REPO="avirajsharma-ops/Tailo"
TAG="v1.0.3"

echo -e "${YELLOW}Step 1: Listing current release assets...${NC}"
gh release view "$TAG" --repo "$REPO"
echo ""

# Ask for confirmation
echo -e "${YELLOW}This will:${NC}"
echo "  1. Delete old/incorrectly named files from the release"
echo "  2. Upload new application files"
echo ""
read -p "Do you want to proceed? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
fi

# Delete old assets
echo -e "${YELLOW}Step 2: Deleting old assets...${NC}"

# Delete the incorrectly named Mac Intel file
echo "Deleting: Talio-1.0.3.dmg"
gh release delete-asset "$TAG" "Talio-1.0.3.dmg" --repo "$REPO" --yes 2>/dev/null || echo "  (file not found or already deleted)"

# Optionally delete other old versions if they exist
echo "Deleting old versions (if they exist)..."
gh release delete-asset "$TAG" "Talio-1.0.3-arm64.dmg" --repo "$REPO" --yes 2>/dev/null || echo "  (arm64 not found)"
gh release delete-asset "$TAG" "Talio-Setup-1.0.3-x64.exe" --repo "$REPO" --yes 2>/dev/null || echo "  (x64.exe not found)"
gh release delete-asset "$TAG" "Talio-Setup-1.0.3-ia32.exe" --repo "$REPO" --yes 2>/dev/null || echo "  (ia32.exe not found)"

echo -e "${GREEN}✓ Old assets deleted${NC}"
echo ""

# Upload new assets
echo -e "${YELLOW}Step 3: Uploading new assets...${NC}"

# Check if files exist
if [ ! -f "mac-app/release/Talio-1.0.3-arm64.dmg" ]; then
    echo -e "${RED}❌ Missing: mac-app/release/Talio-1.0.3-arm64.dmg${NC}"
    exit 1
fi

if [ ! -f "mac-app/release/Talio-1.0.3-x64.dmg" ]; then
    echo -e "${RED}❌ Missing: mac-app/release/Talio-1.0.3-x64.dmg${NC}"
    exit 1
fi

if [ ! -f "windows-app/release/Talio-Setup-1.0.3-x64.exe" ]; then
    echo -e "${RED}❌ Missing: windows-app/release/Talio-Setup-1.0.3-x64.exe${NC}"
    exit 1
fi

if [ ! -f "windows-app/release/Talio-Setup-1.0.3-ia32.exe" ]; then
    echo -e "${RED}❌ Missing: windows-app/release/Talio-Setup-1.0.3-ia32.exe${NC}"
    exit 1
fi

echo "Uploading: Talio-1.0.3-arm64.dmg"
gh release upload "$TAG" "mac-app/release/Talio-1.0.3-arm64.dmg" --repo "$REPO" --clobber

echo "Uploading: Talio-1.0.3-x64.dmg"
gh release upload "$TAG" "mac-app/release/Talio-1.0.3-x64.dmg" --repo "$REPO" --clobber

echo "Uploading: Talio-Setup-1.0.3-x64.exe"
gh release upload "$TAG" "windows-app/release/Talio-Setup-1.0.3-x64.exe" --repo "$REPO" --clobber

echo "Uploading: Talio-Setup-1.0.3-ia32.exe"
gh release upload "$TAG" "windows-app/release/Talio-Setup-1.0.3-ia32.exe" --repo "$REPO" --clobber

echo -e "${GREEN}✓ All assets uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 4: Verifying upload...${NC}"
gh release view "$TAG" --repo "$REPO"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Release Updated Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update download links in the codebase"
echo "  2. Copy new files to downloads folders"
echo ""

