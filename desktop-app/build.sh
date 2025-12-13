#!/bin/bash

# Build script for Talio Desktop App
# This script generates icons and builds for all platforms

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Talio Desktop App Build Script"
echo "=================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "📦 Node.js version: $NODE_VERSION"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm install

# Generate icons
echo ""
echo "🎨 Generating icons..."
chmod +x generate-icons.sh
./generate-icons.sh || echo "⚠️  Icon generation skipped (may need to be done manually on macOS)"

# Build based on argument
BUILD_TARGET="${1:-all}"

echo ""
echo "🔨 Building for: $BUILD_TARGET"
echo ""

case "$BUILD_TARGET" in
    "mac"|"macos"|"darwin")
        echo "Building macOS (Intel + Apple Silicon)..."
        npm run build:mac
        ;;
    "mac-intel"|"x64")
        echo "Building macOS Intel..."
        npm run build:mac-intel
        ;;
    "mac-arm"|"arm64"|"silicon")
        echo "Building macOS Apple Silicon..."
        npm run build:mac-arm
        ;;
    "win"|"windows")
        echo "Building Windows (32-bit + 64-bit)..."
        npm run build:win
        ;;
    "all")
        echo "Building all platforms..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            npm run build:mac
        fi
        npm run build:win
        ;;
    *)
        echo "Unknown target: $BUILD_TARGET"
        echo "Valid options: all, mac, mac-intel, mac-arm, win"
        exit 1
        ;;
esac

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output files in: $SCRIPT_DIR/dist/"
ls -la dist/ 2>/dev/null || echo "No output files found"
