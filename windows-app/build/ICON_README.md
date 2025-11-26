# Talio Activity Monitor - Icon Generation

## Quick Icon Creation

Since we don't have design tools on macOS, use this simple method:

### Option 1: Online Icon Generator (Recommended)

1. Open `build/icon-template.html` in a web browser
2. Right-click the canvas and "Save image as" → `icon.png`
3. Go to https://convertio.co/png-ico/
4. Upload `icon.png`
5. Download the converted `icon.ico`
6. Place `icon.ico` in the `build/` directory

### Option 2: Use ImageMagick (if installed)

```bash
# Install ImageMagick (if not already installed)
brew install imagemagick

# Create a simple icon
convert -size 256x256 gradient:'#667eea'-'#764ba2' \
  -gravity center \
  -fill white -draw 'circle 128,128 128,48' \
  -fill '#667eea' -font Arial-Bold -pointsize 120 -annotate +0+5 'T' \
  windows-app/build/icon.ico
```

### Option 3: Placeholder Icon

For testing, you can use a placeholder. The build will succeed without an icon, but it won't have a custom icon in Windows.

Just create an empty placeholder:
```bash
touch windows-app/build/icon.ico
```

### Icon Requirements

- **Format**: .ico (Windows Icon)
- **Sizes**: Should contain 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 (multi-resolution)
- **Location**: `windows-app/build/icon.ico`
- **Design**: Talio branding (purple gradient with "T")

### After Creating Icon

The icon will be used for:
- Application executable
- System tray icon
- Installer icon
- Desktop shortcut
- Start menu shortcut
- Taskbar icon

## Current Status

The `build/icon-template.html` file is ready. Follow Option 1 above to generate the icon.

**Note**: The Windows app will build successfully even without icon.ico, but it will use the default Electron icon.
