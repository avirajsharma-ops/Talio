#!/bin/bash

# GitHub Release Upload Script for Talio v1.0.3
# This script helps upload the desktop app installers to GitHub Releases

set -e

REPO="avirajsharma-ops/Tailo"
TAG="v1.0.3"
RELEASE_NAME="Talio Desktop App v1.0.3 - Real-Time Monitoring & Dynamic Intervals"
RELEASE_NOTES_FILE="RELEASE_NOTES_v1.0.3.md"

echo "=========================================="
echo "Talio Desktop App Release Upload"
echo "=========================================="
echo "Repository: $REPO"
echo "Tag: $TAG"
echo "Release: $RELEASE_NAME"
echo ""

# Check if release notes exist
if [ ! -f "$RELEASE_NOTES_FILE" ]; then
    echo "❌ Error: Release notes file not found: $RELEASE_NOTES_FILE"
    exit 1
fi

# Installer file paths
MAC_ARM64="mac-app/release/Talio-1.0.3-arm64.dmg"
MAC_X64="mac-app/release/Talio-1.0.3-x64.dmg"
WIN_X64="windows-app/release/Talio-Setup-1.0.3-x64.exe"
WIN_IA32="windows-app/release/Talio-Setup-1.0.3-ia32.exe"
WIN_UNIVERSAL="windows-app/release/Talio-Setup-1.0.3.exe"

# Check if all installers exist
echo "Checking installer files..."
FILES_EXIST=true

if [ ! -f "$MAC_ARM64" ]; then
    echo "❌ Missing: $MAC_ARM64"
    FILES_EXIST=false
fi

if [ ! -f "$MAC_X64" ]; then
    echo "❌ Missing: $MAC_X64"
    FILES_EXIST=false
fi

if [ ! -f "$WIN_X64" ]; then
    echo "❌ Missing: $WIN_X64"
    FILES_EXIST=false
fi

if [ ! -f "$WIN_IA32" ]; then
    echo "❌ Missing: $WIN_IA32"
    FILES_EXIST=false
fi

if [ ! -f "$WIN_UNIVERSAL" ]; then
    echo "❌ Missing: $WIN_UNIVERSAL"
    FILES_EXIST=false
fi

if [ "$FILES_EXIST" = false ]; then
    echo ""
    echo "❌ Error: One or more installer files are missing!"
    echo "Please build the installers first."
    exit 1
fi

echo "✅ All installer files found!"
echo ""

# Display file sizes
echo "Installer Sizes:"
echo "----------------------------------------"
ls -lh "$MAC_ARM64" | awk '{print "macOS ARM64:     " $5}'
ls -lh "$MAC_X64" | awk '{print "macOS x64:       " $5}'
ls -lh "$WIN_X64" | awk '{print "Windows x64:     " $5}'
ls -lh "$WIN_IA32" | awk '{print "Windows ia32:    " $5}'
ls -lh "$WIN_UNIVERSAL" | awk '{print "Windows Universal: " $5}'
echo ""

echo "=========================================="
echo "MANUAL UPLOAD INSTRUCTIONS"
echo "=========================================="
echo ""
echo "GitHub CLI (gh) is not installed."
echo "Please follow these steps to create the release manually:"
echo ""
echo "1. Go to: https://github.com/$REPO/releases/new"
echo ""
echo "2. Fill in the release details:"
echo "   - Tag: $TAG"
echo "   - Release title: $RELEASE_NAME"
echo "   - Copy description from: $RELEASE_NOTES_FILE"
echo ""
echo "3. Upload these installer files:"
echo "   📦 $MAC_ARM64"
echo "   📦 $MAC_X64"
echo "   📦 $WIN_X64"
echo "   📦 $WIN_IA32"
echo "   📦 $WIN_UNIVERSAL"
echo ""
echo "4. Mark as latest release"
echo ""
echo "5. Click 'Publish release'"
echo ""
echo "=========================================="
echo "DOWNLOAD URLs (after upload)"
echo "=========================================="
echo ""
echo "macOS ARM64:"
echo "https://github.com/$REPO/releases/download/$TAG/Talio-1.0.3-arm64.dmg"
echo ""
echo "macOS x64:"
echo "https://github.com/$REPO/releases/download/$TAG/Talio-1.0.3-x64.dmg"
echo ""
echo "Windows x64:"
echo "https://github.com/$REPO/releases/download/$TAG/Talio-Setup-1.0.3-x64.exe"
echo ""
echo "Windows ia32:"
echo "https://github.com/$REPO/releases/download/$TAG/Talio-Setup-1.0.3-ia32.exe"
echo ""
echo "Windows Universal:"
echo "https://github.com/$REPO/releases/download/$TAG/Talio-Setup-1.0.3.exe"
echo ""
echo "=========================================="
echo ""
echo "Opening GitHub releases page in browser..."
echo ""

# Try to open the releases page in the default browser
if command -v open &> /dev/null; then
    # macOS
    open "https://github.com/$REPO/releases/new"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "https://github.com/$REPO/releases/new"
elif command -v start &> /dev/null; then
    # Windows
    start "https://github.com/$REPO/releases/new"
else
    echo "Could not open browser automatically."
    echo "Please manually visit: https://github.com/$REPO/releases/new"
fi

echo ""
echo "✅ Instructions displayed. Please create the release manually."
echo ""
