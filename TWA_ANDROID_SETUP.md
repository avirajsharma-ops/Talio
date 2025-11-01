# 🤖 Android TWA (Trusted Web Activity) Setup Guide

## ✅ What's Been Configured

Your Tailo HRMS application is now fully configured for Android TWA deployment using PWABuilder!

---

## 📁 Files Added/Modified

### 1. **Digital Asset Links**
- ✅ `public/.well-known/assetlinks.json` - Static file
- ✅ `app/.well-known/assetlinks.json/route.js` - Next.js API route

**Purpose:** Verifies the relationship between your website and Android app.

**Accessible at:** `https://yourdomain.com/.well-known/assetlinks.json`

### 2. **PWA Manifest Updated**
- ✅ `public/manifest.json` - Updated with TWA configuration

**Changes:**
- Set `prefer_related_applications: true`
- Added Android app details in `related_applications`

---

## 🔧 Configuration Details

### **Package Information**
```json
{
  "package_name": "sbs.zenova.twa",
  "sha256_cert_fingerprints": [
    "D7:6D:0B:B9:9B:B9:6A:8C:15:F0:EE:9A:E3:F8:21:65:20:4C:CB:91:F3:80:E4:0D:C4:FC:6C:BF:24:32:3D:E1"
  ]
}
```

### **Digital Asset Links**
The `assetlinks.json` file establishes trust between:
- **Your Website:** `https://yourdomain.com`
- **Your Android App:** `sbs.zenova.twa`

This allows the Android app to open your website in a TWA without showing the browser UI.

---

## 🚀 Deployment Steps

### **Step 1: Deploy Your Website**

1. **Deploy to Vercel** (or your hosting platform):
   ```bash
   # If using Vercel
   vercel --prod
   ```

2. **Verify the assetlinks.json is accessible:**
   ```
   https://yourdomain.com/.well-known/assetlinks.json
   ```

   **Expected Response:**
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "sbs.zenova.twa",
       "sha256_cert_fingerprints": ["D7:6D:0B:B9:9B:B9:6A:8C:15:F0:EE:9A:E3:F8:21:65:20:4C:CB:91:F3:80:E4:0D:C4:FC:6C:BF:24:32:3D:E1"]
     }
   }]
   ```

---

### **Step 2: Build Android App with PWABuilder**

1. **Go to PWABuilder:**
   ```
   https://www.pwabuilder.com/
   ```

2. **Enter your website URL:**
   ```
   https://yourdomain.com
   ```

3. **Click "Start" and wait for analysis**

4. **Go to "Publish" tab**

5. **Select "Android" platform**

6. **Configure Android App:**
   - **Package ID:** `sbs.zenova.twa`
   - **App Name:** `Tailo HRMS`
   - **Short Name:** `Tailo`
   - **Theme Color:** `#5F9EA0`
   - **Background Color:** `#ffffff`
   - **Icon:** Upload your Talio logo (512x512 PNG)

7. **Advanced Settings:**
   - **Display Mode:** `standalone`
   - **Orientation:** `portrait`
   - **Status Bar Color:** `#5F9EA0`
   - **Navigation Bar Color:** `#ffffff`
   - **Splash Screen:** Enable
   - **Shortcuts:** Enable (Dashboard, Attendance, Leave, Employees)

8. **Generate Android Package:**
   - Click "Generate"
   - Download the `.apk` or `.aab` file

---

### **Step 3: Sign Your Android App**

PWABuilder will generate a signed app, but you need to:

1. **Keep your signing key safe** (provided by PWABuilder)
2. **Note your SHA-256 fingerprint** (should match the one in assetlinks.json)

**To verify your fingerprint:**
```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

**Important:** The SHA-256 fingerprint in `assetlinks.json` MUST match your app's signing certificate!

---

### **Step 4: Test Your TWA**

1. **Install the APK on an Android device:**
   ```bash
   adb install app-release.apk
   ```

2. **Open the app and verify:**
   - ✅ App opens without browser UI
   - ✅ No address bar visible
   - ✅ Splash screen shows
   - ✅ App icon appears in launcher
   - ✅ Deep links work correctly

3. **Test Digital Asset Links:**
   ```bash
   # Check if verification passed
   adb shell pm get-app-links sbs.zenova.twa
   ```

   **Expected output:**
   ```
   sbs.zenova.twa:
     ID: <some-id>
     Signatures: [<your-sha256>]
     Domain verification state:
       yourdomain.com: verified
   ```

---

### **Step 5: Publish to Google Play Store**

1. **Create a Google Play Console account:**
   ```
   https://play.google.com/console
   ```

2. **Create a new app:**
   - **App Name:** Tailo HRMS
   - **Default Language:** English
   - **App Type:** App
   - **Free/Paid:** Free

3. **Upload your AAB file:**
   - Go to "Production" → "Create new release"
   - Upload the `.aab` file from PWABuilder
   - Add release notes

4. **Complete Store Listing:**
   - **Short Description:** "Complete HRMS solution for managing employees"
   - **Full Description:** Add detailed description
   - **App Icon:** 512x512 PNG (Talio logo)
   - **Feature Graphic:** 1024x500 PNG
   - **Screenshots:** Add 2-8 screenshots (phone + tablet)
   - **Category:** Business
   - **Content Rating:** Everyone

5. **Set up pricing & distribution:**
   - **Countries:** Select target countries
   - **Pricing:** Free
   - **Ads:** No ads

6. **Submit for review:**
   - Click "Submit for review"
   - Wait for approval (usually 1-3 days)

---

## 🔍 Troubleshooting

### **Issue 1: Digital Asset Links Not Verified**

**Symptoms:**
- App opens in browser instead of TWA
- Address bar visible

**Solutions:**
1. Verify `assetlinks.json` is accessible at `https://yourdomain.com/.well-known/assetlinks.json`
2. Check SHA-256 fingerprint matches your app's signing certificate
3. Wait 24-48 hours for Google to verify (can take time)
4. Clear app data and reinstall

**Force verification:**
```bash
adb shell pm verify-app-links --re-verify sbs.zenova.twa
```

---

### **Issue 2: App Not Opening URLs**

**Symptoms:**
- Deep links don't work
- External links open in browser

**Solutions:**
1. Add intent filters in AndroidManifest.xml (PWABuilder does this automatically)
2. Verify `scope` in manifest.json is set to `/`
3. Check `start_url` in manifest.json

---

### **Issue 3: Splash Screen Not Showing**

**Symptoms:**
- White screen on app launch
- No splash screen

**Solutions:**
1. Ensure icons are properly sized (512x512 minimum)
2. Check `background_color` and `theme_color` in manifest.json
3. Verify PWABuilder splash screen settings

---

## 📱 Testing Checklist

Before publishing, test these features:

- [ ] App installs successfully
- [ ] App icon appears in launcher
- [ ] Splash screen shows on launch
- [ ] No browser UI visible (no address bar)
- [ ] Navigation works smoothly
- [ ] Back button works correctly
- [ ] Deep links open in app
- [ ] Push notifications work (if implemented)
- [ ] Offline mode works
- [ ] Check-in/Check-out feature works
- [ ] All dashboard features accessible
- [ ] Login/Logout works
- [ ] App shortcuts work (long-press icon)

---

## 🌐 Important URLs

- **PWABuilder:** https://www.pwabuilder.com/
- **PWABuilder Docs:** https://docs.pwabuilder.com/#/builder/android
- **Google Play Console:** https://play.google.com/console
- **Digital Asset Links Tester:** https://developers.google.com/digital-asset-links/tools/generator

---

## 📝 Next Steps

1. **Deploy your website to production** (Vercel recommended)
2. **Update the Play Store URL** in `manifest.json` after publishing
3. **Test thoroughly** on multiple Android devices
4. **Submit to Google Play Store**
5. **Monitor reviews and ratings**

---

## 🎯 Production Checklist

Before going live:

- [ ] Website deployed to production
- [ ] HTTPS enabled (required for TWA)
- [ ] `assetlinks.json` accessible and verified
- [ ] Manifest.json properly configured
- [ ] Icons generated (all sizes)
- [ ] App signed with production certificate
- [ ] SHA-256 fingerprint matches
- [ ] Tested on multiple devices
- [ ] Privacy policy added
- [ ] Terms of service added
- [ ] Google Play listing complete
- [ ] Screenshots uploaded
- [ ] App description written

---

## 🔐 Security Notes

1. **Keep your signing key safe!** If you lose it, you can't update your app.
2. **Never commit signing keys to Git**
3. **Use environment variables for sensitive data**
4. **Enable Google Play App Signing** (recommended)
5. **Regularly update dependencies**

---

## 📞 Support

If you encounter issues:

1. Check PWABuilder documentation
2. Verify Digital Asset Links
3. Test on multiple devices
4. Check Google Play Console for errors
5. Review app logs with `adb logcat`

---

**Your Tailo HRMS app is ready for Android deployment! 🎉**

Good luck with your Play Store submission! 🚀

