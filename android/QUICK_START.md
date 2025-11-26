# Quick Start - Build Talio HRMS Android App

## One-Command Build

```bash
cd android && ./build-apk.sh
```

That's it! 🎉

## What You'll Get

After the build completes (2-5 minutes), check the `release/` folder:

```
release/
├── talio-hrms.apk          ← Install this on Android devices
├── talio-hrms.aab          ← Upload this to Google Play Store
├── talio-release.keystore  ← KEEP THIS SECURE! (needed for updates)
├── assetlinks.json         ← Upload to https://zenova.sbs/.well-known/
└── README.md               ← Full documentation
```

## Next Steps

### 1. Test the APK

Install on your Android device:
```bash
adb install release/talio-hrms.apk
```

Or transfer the APK file to your phone and install manually.

### 2. Upload Digital Asset Links

Copy `assetlinks.json` to your web server:
```bash
cp release/assetlinks.json ../public/.well-known/assetlinks.json
```

Then deploy your website.

### 3. Publish to Play Store (Optional)

1. Go to [Google Play Console](https://play.google.com/console)
2. Upload `talio-hrms.aab`
3. Complete store listing
4. Publish!

## Requirements

- Java 17+ (will auto-install if missing)
- Internet connection (for Gradle dependencies)
- macOS, Linux, or Windows with WSL

## Troubleshooting

**Build fails?**
```bash
./gradlew --stop
./gradlew clean
./build-apk.sh
```

**Permission denied?**
```bash
chmod +x gradlew build-apk.sh
```

**Need help?**
See `BUILD_INSTRUCTIONS.md` for detailed documentation.

---

**🔒 IMPORTANT**: Save `talio-release.keystore` securely! You'll need it for all future app updates.

