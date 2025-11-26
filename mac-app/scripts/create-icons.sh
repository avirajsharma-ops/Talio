#!/bin/bash

# Create macOS icons from a source PNG
# Usage: ./create-icons.sh <source-image.png>

set -e

SOURCE_IMAGE="${1:-../assets/icon-source.png}"
ASSETS_DIR="$(dirname "$0")/../assets"
ICONSET_DIR="$ASSETS_DIR/icon.iconset"

echo "🎨 Creating macOS icons..."

# Create iconset directory
mkdir -p "$ICONSET_DIR"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "⚠️  Source image not found: $SOURCE_IMAGE"
    echo "Creating placeholder icons..."
    
    # Create a simple placeholder icon using sips (built into macOS)
    # This creates a purple square as placeholder
    mkdir -p "$ASSETS_DIR"
    
    # Use Python to create a simple placeholder icon
    python3 << 'EOF'
import os

# Create a simple 1024x1024 PNG placeholder
# This is a minimal valid PNG file (purple square)
assets_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/assets"
os.makedirs(assets_dir, exist_ok=True)

# Create placeholder PNG using PIL if available, otherwise skip
try:
    from PIL import Image
    img = Image.new('RGBA', (1024, 1024), (147, 51, 234, 255))  # Purple
    img.save(f"{assets_dir}/icon-source.png")
    print(f"Created placeholder: {assets_dir}/icon-source.png")
except ImportError:
    print("PIL not available - skipping placeholder creation")
    print("Please provide a 1024x1024 PNG icon at assets/icon-source.png")
EOF
    
    SOURCE_IMAGE="$ASSETS_DIR/icon-source.png"
fi

if [ -f "$SOURCE_IMAGE" ]; then
    # Generate all required icon sizes
    sips -z 16 16     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16.png" 2>/dev/null || true
    sips -z 32 32     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16@2x.png" 2>/dev/null || true
    sips -z 32 32     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32.png" 2>/dev/null || true
    sips -z 64 64     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32@2x.png" 2>/dev/null || true
    sips -z 128 128   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128.png" 2>/dev/null || true
    sips -z 256 256   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128@2x.png" 2>/dev/null || true
    sips -z 256 256   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256.png" 2>/dev/null || true
    sips -z 512 512   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256@2x.png" 2>/dev/null || true
    sips -z 512 512   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512.png" 2>/dev/null || true
    sips -z 1024 1024 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512@2x.png" 2>/dev/null || true

    # Convert to icns
    iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns" 2>/dev/null || echo "iconutil failed - may need Xcode"

    # Copy for regular PNG icon
    cp "$SOURCE_IMAGE" "$ASSETS_DIR/icon.png" 2>/dev/null || true

    # Create tray icon (smaller)
    sips -z 32 32 "$SOURCE_IMAGE" --out "$ASSETS_DIR/tray-icon.png" 2>/dev/null || true

    echo "✅ Icons created in $ASSETS_DIR"
else
    echo "❌ Could not create icons - no source image available"
fi

# Cleanup iconset directory
rm -rf "$ICONSET_DIR"

