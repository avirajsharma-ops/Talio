#!/bin/bash

# Icon Generation Script for Talio Desktop App
# Requires: ImageMagick with WebP support

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
SOURCE_ICON="$SCRIPT_DIR/../app-icon.webp"

echo "🎨 Generating icons for Talio Desktop App..."

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "Install with:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt install imagemagick"
    echo "  Windows: choco install imagemagick"
    exit 1
fi

# Create build directory if not exists
mkdir -p "$BUILD_DIR"

echo "📦 Converting WebP to PNG..."
convert "$SOURCE_ICON" -resize 1024x1024 "$BUILD_DIR/icon-1024.png"
convert "$SOURCE_ICON" -resize 512x512 "$BUILD_DIR/icon.png"
convert "$SOURCE_ICON" -resize 16x16 "$BUILD_DIR/tray-icon.png"
convert "$SOURCE_ICON" -resize 32x32 "$BUILD_DIR/tray-icon@2x.png"

echo "🪟 Generating Windows ICO..."
convert "$SOURCE_ICON" \
    -define icon:auto-resize=256,128,64,48,32,16 \
    "$BUILD_DIR/icon.ico"

# Generate macOS ICNS (only on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Generating macOS ICNS..."
    
    ICONSET_DIR="$BUILD_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    convert "$SOURCE_ICON" -resize 16x16 "$ICONSET_DIR/icon_16x16.png"
    convert "$SOURCE_ICON" -resize 32x32 "$ICONSET_DIR/icon_16x16@2x.png"
    convert "$SOURCE_ICON" -resize 32x32 "$ICONSET_DIR/icon_32x32.png"
    convert "$SOURCE_ICON" -resize 64x64 "$ICONSET_DIR/icon_32x32@2x.png"
    convert "$SOURCE_ICON" -resize 128x128 "$ICONSET_DIR/icon_128x128.png"
    convert "$SOURCE_ICON" -resize 256x256 "$ICONSET_DIR/icon_128x128@2x.png"
    convert "$SOURCE_ICON" -resize 256x256 "$ICONSET_DIR/icon_256x256.png"
    convert "$SOURCE_ICON" -resize 512x512 "$ICONSET_DIR/icon_256x256@2x.png"
    convert "$SOURCE_ICON" -resize 512x512 "$ICONSET_DIR/icon_512x512.png"
    convert "$SOURCE_ICON" -resize 1024x1024 "$ICONSET_DIR/icon_512x512@2x.png"
    
    iconutil -c icns "$ICONSET_DIR" -o "$BUILD_DIR/icon.icns"
    rm -rf "$ICONSET_DIR"
    
    echo "✅ macOS ICNS generated"
else
    echo "⚠️  Skipping ICNS generation (not on macOS)"
    echo "   Run this script on macOS to generate icon.icns"
fi

echo ""
echo "✅ Icons generated successfully!"
echo ""
echo "Generated files:"
ls -la "$BUILD_DIR"/*.png "$BUILD_DIR"/*.ico "$BUILD_DIR"/*.icns 2>/dev/null || true
