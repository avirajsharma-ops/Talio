#!/bin/bash

# Talio HRMS macOS Build Script
# This script builds the macOS DMG installer

set -e

echo "🚀 Starting Talio HRMS macOS build..."

# Navigate to mac-app directory
cd "$(dirname "$0")/.."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create assets directory if it doesn't exist
if [ ! -d "assets" ]; then
    mkdir -p assets
fi

# Check for required assets
if [ ! -f "assets/icon.icns" ]; then
    echo "⚠️  Warning: assets/icon.icns not found. Using placeholder..."
    # Create a placeholder icon (you should replace this with actual icon)
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf release dist

# Build the DMG
echo "🔨 Building macOS DMG..."
npm run build:dmg

echo "✅ Build complete!"
echo "📁 DMG file is available in: release/"
ls -la release/*.dmg 2>/dev/null || echo "No DMG found - check build logs"

