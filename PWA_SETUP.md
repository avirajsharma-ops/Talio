# PWA & Android App Links Setup

This document explains the PWA (Progressive Web App) and Android App Links configuration for Talio HRMS.

## 📱 Android App Links Configuration

### What is assetlinks.json?

The `assetlinks.json` file enables Android App Links, allowing your PWA to be opened directly in your Android app (TWA - Trusted Web Activity) instead of the browser.

### File Location

The assetlinks.json file is available at two locations:

1. **Static File**: `public/.well-known/assetlinks.json`
2. **API Route**: `app/.well-known/assetlinks.json/route.js`

Both serve the same content and are accessible at:
```
https://zenova.sbs/.well-known/assetlinks.json
```

### Configuration Details

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "sbs.zenova.twa",
    "sha256_cert_fingerprints": [
      "CB:1D:C4:F1:B2:42:6A:B2:56:57:BC:D8:2E:75:FD:A6:38:DE:97:AD:20:D2:4B:AD:A2:D8:CC:02:57:DB:08:9A"
    ]
  }
}]
```

**Parameters:**
- `package_name`: Your Android app package name (`sbs.zenova.twa`)
- `sha256_cert_fingerprints`: SHA-256 fingerprint of your app's signing certificate

### Nginx Configuration

The nginx configuration includes a specific location block to serve assetlinks.json with proper headers:

```nginx
location /.well-known/assetlinks.json {
    add_header Content-Type "application/json";
    add_header Access-Control-Allow-Origin "*";
    proxy_pass http://hrms_app;
}
```

This ensures:
- ✅ Correct Content-Type header
- ✅ CORS enabled for verification
- ✅ Proper caching

## 🔍 Verification

### Test assetlinks.json

After deployment, verify the file is accessible:

```bash
# Check if file is accessible
curl https://zenova.sbs/.well-known/assetlinks.json

# Check headers
curl -I https://zenova.sbs/.well-known/assetlinks.json
```

Expected response:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "sbs.zenova.twa",
    "sha256_cert_fingerprints": ["CB:1D:C4:F1:B2:42:6A:B2:56:57:BC:D8:2E:75:FD:A6:38:DE:97:AD:20:D2:4B:AD:A2:D8:CC:02:57:DB:08:9A"]
  }
}]
```

### Google's Statement List Generator

Verify your configuration using Google's tool:
```
https://developers.google.com/digital-asset-links/tools/generator
```

### Android App Links Tester

Test your Android App Links:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://zenova.sbs&relation=delegate_permission/common.handle_all_urls
```

## 📱 PWA Features

Your Talio HRMS PWA includes:

### 1. Service Worker
- Offline support
- Background sync
- Push notifications (if configured)
- Caching strategies

### 2. Web App Manifest
Located at: `public/manifest.json`

Features:
- App name and description
- Icons for different sizes
- Theme colors
- Display mode (standalone)
- Start URL

### 3. Installability
Users can install the PWA:
- **Android**: "Add to Home Screen"
- **iOS**: "Add to Home Screen"
- **Desktop**: Install button in browser

## 🔧 Updating assetlinks.json

If you need to update the SHA-256 fingerprint (e.g., after re-signing your Android app):

### Step 1: Get New Fingerprint

```bash
# For release keystore
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias

# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the SHA-256 fingerprint in the output.

### Step 2: Update Files

Update both files with the new fingerprint:

1. `public/.well-known/assetlinks.json`
2. `app/.well-known/assetlinks.json/route.js`

### Step 3: Deploy

```bash
git add .
git commit -m "Update assetlinks.json fingerprint"
git push origin main

# On server
git pull origin main
docker-compose restart
```

## 🌐 Multiple Domains

If you have multiple domains, add them to the assetlinks.json array:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "sbs.zenova.twa",
      "sha256_cert_fingerprints": ["CB:1D:C4:F1:B2:42:6A:B2:56:57:BC:D8:2E:75:FD:A6:38:DE:97:AD:20:D2:4B:AD:A2:D8:CC:02:57:DB:08:9A"]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.anotherapp",
      "sha256_cert_fingerprints": ["ANOTHER:FINGERPRINT:HERE"]
    }
  }
]
```

## 🍎 iOS Universal Links (Optional)

For iOS support, you would need to add `apple-app-site-association` file:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.BUNDLE_ID",
        "paths": ["*"]
      }
    ]
  }
}
```

Place it at: `public/.well-known/apple-app-site-association` (no .json extension)

## 📊 Analytics & Monitoring

Track PWA installation and usage:

```javascript
// Track PWA install
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA install prompt shown')
  // Track with analytics
})

// Track PWA launch
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('Launched as PWA')
  // Track with analytics
}
```

## 🔒 Security Considerations

1. **HTTPS Required**: Android App Links only work over HTTPS
2. **Certificate Matching**: SHA-256 fingerprint must match your app's signing certificate
3. **Package Name**: Must match exactly with your Android app
4. **File Accessibility**: assetlinks.json must be publicly accessible

## 📝 Troubleshooting

### Issue: assetlinks.json not accessible

```bash
# Check nginx configuration
docker-compose exec nginx nginx -t

# Check file exists
ls -la public/.well-known/assetlinks.json

# Check nginx logs
docker-compose logs nginx | grep assetlinks
```

### Issue: Android app not opening links

1. Verify assetlinks.json is accessible
2. Check SHA-256 fingerprint matches
3. Verify package name is correct
4. Clear Android app data and reinstall
5. Use Android Studio's App Links Assistant

### Issue: Wrong Content-Type

The nginx configuration ensures `Content-Type: application/json` is set. If issues persist:

```bash
# Test headers
curl -I https://zenova.sbs/.well-known/assetlinks.json

# Should show:
# Content-Type: application/json
```

## 📚 Resources

- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [Digital Asset Links](https://developers.google.com/digital-asset-links)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## ✅ Checklist

- [x] assetlinks.json file created
- [x] Correct package name configured
- [x] SHA-256 fingerprint added
- [x] Nginx configuration updated
- [x] API route created
- [x] File accessible via HTTPS
- [ ] Tested with Android app
- [ ] Verified with Google's tools

---

Your PWA is now configured with Android App Links support! 🎉

Users can install your app and have links open directly in the app instead of the browser.

