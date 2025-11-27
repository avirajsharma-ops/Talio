# Talio macOS Installation Guide

## ⚠️ "Talio is damaged" Error on Apple Silicon Macs

If you see this error when trying to open Talio on your Mac (especially Apple Silicon M1/M2/M3/M4):

```
"Talio" is damaged and can't be opened. You should move it to the Trash.
```

**This is a false positive!** The app is not damaged. This happens because the app is not code-signed with an Apple Developer certificate.

---

## ✅ Solution: Bypass Gatekeeper (Safe & Easy)

### Method 1: Using Terminal (Recommended)

1. **Download and move Talio to Applications folder**
   - Download `Talio-1.0.3-arm64.dmg` (for Apple Silicon) or `Talio-1.0.3.dmg` (for Intel)
   - Open the DMG file
   - Drag Talio to the Applications folder

2. **Open Terminal** (Applications → Utilities → Terminal)

3. **Run this command:**
   ```bash
   xattr -cr /Applications/Talio.app
   ```

4. **Press Enter** and enter your password if prompted

5. **Open Talio** from Applications folder - it should now work!

---

### Method 2: Using System Settings (Alternative)

1. **Try to open Talio** - you'll see the "damaged" error
2. Click **"Cancel"** (don't move to trash!)
3. Open **System Settings** → **Privacy & Security**
4. Scroll down to the **Security** section
5. You should see a message: *"Talio was blocked from use because it is not from an identified developer"*
6. Click **"Open Anyway"**
7. Click **"Open"** in the confirmation dialog
8. Talio will now open successfully!

---

### Method 3: Right-Click Method

1. **Locate Talio** in Applications folder
2. **Right-click** (or Control+click) on Talio.app
3. Select **"Open"** from the menu
4. Click **"Open"** in the dialog that appears
5. Talio will now open!

---

## 🔒 Why Does This Happen?

- macOS Gatekeeper blocks apps that aren't code-signed with an Apple Developer certificate
- Code signing requires a $99/year Apple Developer account
- The app is completely safe - you can verify the source code on GitHub
- This is a common issue for open-source and indie apps

---

## 🛡️ Is It Safe?

**Yes, absolutely!** 

- ✅ The app is built from open-source code
- ✅ You can verify the source on GitHub: https://github.com/avirajsharma-ops/Tailo
- ✅ The `xattr -cr` command only removes the quarantine flag
- ✅ Thousands of developers use this method for unsigned apps

---

## 📋 System Requirements

### macOS Version
- macOS 10.15 (Catalina) or later
- macOS 11 (Big Sur) or later recommended

### Architecture
- **Apple Silicon (M1/M2/M3/M4)**: Download `Talio-1.0.3-arm64.dmg`
- **Intel (x64)**: Download `Talio-1.0.3.dmg`

### Other Requirements
- 200 MB available disk space
- Internet connection for sync features

---

## 🚀 First Launch

After successfully opening Talio:

1. **Grant Permissions** when prompted:
   - Screen Recording (for productivity monitoring)
   - Accessibility (for activity tracking)
   - Location (for attendance geo-fencing)

2. **Login** with your Talio account credentials

3. **Configure Settings** in the app preferences

---

## 🆘 Still Having Issues?

### Error: "Operation not permitted"
- Make sure you're running the command with administrator privileges
- Try adding `sudo` before the command: `sudo xattr -cr /Applications/Talio.app`

### Error: "No such file or directory"
- Make sure Talio is in the Applications folder
- Check the exact app name (it should be `Talio.app`)

### App crashes on launch
- Check Console.app for error logs
- Try removing and reinstalling the app
- Contact support: support@talio.in

---

## 📞 Support

- **Email**: support@talio.in
- **Website**: https://talio.in
- **GitHub**: https://github.com/avirajsharma-ops/Tailo

---

## 🔄 Updates

The app will automatically check for updates. When a new version is available, you'll be notified within the app.

---

**Thank you for using Talio!** 🎉

