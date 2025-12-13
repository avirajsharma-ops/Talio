# Talio Desktop App - Build Directory

This directory contains resources for building the desktop application.

## Required Files

Before building, ensure you have the following icon files:

### For macOS:
- `icon.icns` - macOS app icon (required for DMG builds)

### For Windows:
- `icon.ico` - Windows app icon (required for Windows installer)

### Common:
- `icon.png` - PNG icon (512x512 or larger)
- `tray-icon.png` - System tray icon (16x16 or 32x32)

## Generating Icons

You can generate icon files from the main Talio icon (`app-icon.webp`) using the following tools:

### Using ImageMagick (cross-platform):

```bash
# Install ImageMagick
# macOS: brew install imagemagick
# Windows: choco install imagemagick
# Linux: apt install imagemagick

# Generate PNG from WebP
convert ../app-icon.webp -resize 512x512 icon.png

# Generate tray icon
convert ../app-icon.webp -resize 16x16 tray-icon.png

# Generate ICO for Windows (multiple sizes)
convert ../app-icon.webp -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# Generate ICNS for macOS
# First create iconset folder with required sizes
mkdir icon.iconset
convert ../app-icon.webp -resize 16x16 icon.iconset/icon_16x16.png
convert ../app-icon.webp -resize 32x32 icon.iconset/icon_16x16@2x.png
convert ../app-icon.webp -resize 32x32 icon.iconset/icon_32x32.png
convert ../app-icon.webp -resize 64x64 icon.iconset/icon_32x32@2x.png
convert ../app-icon.webp -resize 128x128 icon.iconset/icon_128x128.png
convert ../app-icon.webp -resize 256x256 icon.iconset/icon_128x128@2x.png
convert ../app-icon.webp -resize 256x256 icon.iconset/icon_256x256.png
convert ../app-icon.webp -resize 512x512 icon.iconset/icon_256x256@2x.png
convert ../app-icon.webp -resize 512x512 icon.iconset/icon_512x512.png
convert ../app-icon.webp -resize 1024x1024 icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
```

## Entitlements

The `entitlements.mac.plist` file contains macOS permissions required by the app:
- Camera access
- Microphone access
- Location access
- Network access
- Screen recording (via privacy settings, not entitlements)
