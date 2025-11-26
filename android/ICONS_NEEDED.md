# App Icons Required

Before building the APK, you need to add app icons to the following directories:

## Required Icon Files

### 1. Launcher Icons (PNG format)

Add these files to each mipmap directory:

- `ic_launcher.png` - Square icon
- `ic_launcher_round.png` - Round icon (for devices that support it)

### 2. Icon Sizes

```
app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

## Quick Icon Generation

### Option 1: Use Android Asset Studio (Recommended)

1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload your logo/icon (1024x1024 recommended)
3. Customize colors and padding
4. Download the generated icons
5. Extract and copy to `app/src/main/res/`

### Option 2: Use Your Existing PWA Icons

If you have PWA icons in `public/icons/`, you can use them:

```bash
# From the android directory
cp ../public/icons/icon-192x192.png app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
cp ../public/icons/icon-192x192.png app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# Resize for other densities using ImageMagick (if installed)
convert ../public/icons/icon-512x512.png -resize 144x144 app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert ../public/icons/icon-512x512.png -resize 96x96 app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert ../public/icons/icon-512x512.png -resize 72x72 app/src/main/res/mipmap-hdpi/ic_launcher.png
convert ../public/icons/icon-512x512.png -resize 48x48 app/src/main/res/mipmap-mdpi/ic_launcher.png
```

### Option 3: Use Placeholder Icons (For Testing Only)

The build will use default Android icons if you don't provide custom ones.
This is fine for testing but NOT recommended for production.

## Icon Design Guidelines

- **Size**: Start with 1024x1024px
- **Format**: PNG with transparency
- **Safe Zone**: Keep important content within 80% of the icon
- **Background**: Can be transparent or solid color (#192A5A for Talio theme)
- **Style**: Material Design guidelines recommended

## Adaptive Icons (Optional)

For modern Android devices, you can also create adaptive icons:

```
app/src/main/res/
├── mipmap-anydpi-v26/
│   ├── ic_launcher.xml
│   └── ic_launcher_round.xml
├── drawable/
│   ├── ic_launcher_background.xml
│   └── ic_launcher_foreground.xml
```

See: https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive

## Current Status

⚠️ **Icons not yet added** - The build will use default Android icons.

To add icons before building:
1. Generate icons using one of the methods above
2. Place them in the appropriate mipmap directories
3. Run the build script

## Testing

After adding icons, verify they look good:
1. Build and install the APK
2. Check the app icon on your home screen
3. Check the icon in the app drawer
4. Check the icon in recent apps

---

**Note**: The app will build and run without custom icons, but it will use the default Android robot icon. For production release, custom icons are strongly recommended!

