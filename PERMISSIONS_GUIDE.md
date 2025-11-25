# 🔔 Permissions Guide - Talio HRMS

This app **REQUIRES** both **Notifications** and **Location** permissions to function properly. This guide will help you enable these permissions on different browsers and devices.

---

## 🌐 **Desktop Browsers**

### **Google Chrome / Microsoft Edge / Brave**

#### **Method 1: Via Address Bar (Easiest)**
1. Look for the **lock icon (🔒)** or **info icon (ⓘ)** in the address bar (left side)
2. Click on it
3. Find **"Notifications"** and **"Location"** in the list
4. Change both from **"Block"** to **"Allow"**
5. **Refresh the page** (F5 or Cmd+R)

#### **Method 2: Via Browser Settings**
1. Click the **three dots menu** (⋮) in the top-right corner
2. Go to **Settings** → **Privacy and security** → **Site Settings**
3. Click on **Notifications**
   - Find `zenova.sbs` in the "Not allowed" list
   - Click the **trash icon** to remove it
   - Or click on it and change to **"Allow"**
4. Go back and click on **Location**
   - Find `zenova.sbs` in the "Blocked" list
   - Click the **trash icon** to remove it
   - Or click on it and change to **"Allow"**
5. **Refresh the page**

#### **Method 3: Reset All Permissions**
1. Go to `chrome://settings/content/siteDetails?site=https://zenova.sbs`
2. Click **"Reset permissions"**
3. **Refresh the page** and allow permissions when prompted

---

### **Mozilla Firefox**

#### **Method 1: Via Address Bar**
1. Click the **lock icon (🔒)** in the address bar
2. Click **"Connection secure"** → **"More information"**
3. Go to the **"Permissions"** tab
4. Find **"Receive Notifications"** and **"Access Your Location"**
5. Uncheck **"Use Default"** for both
6. Select **"Allow"** for both
7. **Refresh the page**

#### **Method 2: Via Browser Settings**
1. Click the **hamburger menu** (☰) → **Settings**
2. Go to **Privacy & Security** → **Permissions**
3. Click **"Settings..."** next to **Notifications**
   - Find `https://zenova.sbs`
   - Change status to **"Allow"**
4. Click **"Settings..."** next to **Location**
   - Find `https://zenova.sbs`
   - Change status to **"Allow"**
5. **Refresh the page**

---

### **Safari (macOS)**

#### **Method 1: Via Safari Preferences**
1. Click **Safari** in the menu bar → **Settings** (or Preferences)
2. Go to the **"Websites"** tab
3. Click **"Notifications"** in the left sidebar
   - Find `zenova.sbs`
   - Change to **"Allow"**
4. Click **"Location"** in the left sidebar
   - Find `zenova.sbs`
   - Change to **"Allow"**
5. **Refresh the page**

#### **Method 2: Via System Preferences (macOS)**
1. Open **System Preferences** → **Notifications**
2. Find **Safari** in the list
3. Make sure notifications are enabled for Safari
4. Go back to Safari and refresh the page

---

## 📱 **Mobile Browsers**

### **Chrome (Android)**

#### **Method 1: Via Site Settings**
1. Tap the **three dots menu** (⋮) in the top-right
2. Tap **"Settings"** → **"Site settings"**
3. Tap **"Notifications"**
   - Find `zenova.sbs` and tap it
   - Toggle **"Notifications"** to **ON**
4. Go back and tap **"Location"**
   - Find `zenova.sbs` and tap it
   - Select **"Allow"**
5. **Refresh the page**

#### **Method 2: Via Android System Settings**
1. Open **Android Settings** → **Apps** → **Chrome**
2. Tap **"Permissions"**
3. Enable **"Location"** and **"Notifications"**
4. Go back to Chrome and refresh the page

---

### **Safari (iOS/iPadOS)**

#### **Important Note for iOS:**
iOS Safari has **limited support** for web push notifications. You may need to:

1. **Add to Home Screen** for better functionality:
   - Tap the **Share button** (square with arrow)
   - Tap **"Add to Home Screen"**
   - Open the app from your home screen

2. **Enable Location Services:**
   - Go to **iOS Settings** → **Privacy** → **Location Services**
   - Find **Safari** or the **web app**
   - Select **"While Using the App"** or **"Always"**

3. **Enable Notifications:**
   - Go to **iOS Settings** → **Notifications**
   - Find **Safari** or the **web app**
   - Toggle **"Allow Notifications"** to **ON**

---

## 🔧 **Troubleshooting**

### **Permissions Still Not Working?**

1. **Clear Browser Cache:**
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select **"Cached images and files"** and **"Cookies and site data"**
   - Click **"Clear data"**

2. **Check Browser Version:**
   - Make sure you're using the **latest version** of your browser
   - Update if necessary

3. **Disable Browser Extensions:**
   - Some ad blockers or privacy extensions may block permissions
   - Try disabling them temporarily

4. **Try Incognito/Private Mode:**
   - Open the site in incognito/private mode
   - This helps identify if extensions are causing issues

5. **Check System Permissions:**
   - **Windows:** Settings → Privacy → Notifications & Location
   - **macOS:** System Preferences → Security & Privacy → Privacy
   - **Android:** Settings → Apps → Permissions
   - **iOS:** Settings → Privacy

---

## ❓ **Why Are These Permissions Required?**

### **🔔 Notifications**
- **Task assignments** and updates
- **Leave request** approvals/rejections
- **Important announcements** from management
- **Chat messages** from colleagues
- **Performance review** notifications

### **📍 Location**
- **Geofencing** for automatic attendance
- **Verify** you're at office premises
- **Automatic check-in/check-out** when entering/leaving office
- **Location-based** features and security

---

## 🆘 **Still Having Issues?**

If you've tried everything and permissions still aren't working:

1. **Contact IT Support** with:
   - Your browser name and version
   - Your device type (Desktop/Mobile)
   - Screenshots of the error/issue

2. **Try a Different Browser:**
   - Chrome (recommended)
   - Edge
   - Firefox
   - Safari

3. **Check Company Policies:**
   - Some corporate networks may block certain permissions
   - Contact your IT department

---

## 📝 **Quick Reference**

| Browser | Notifications | Location | Notes |
|---------|--------------|----------|-------|
| Chrome (Desktop) | ✅ Full Support | ✅ Full Support | Recommended |
| Edge (Desktop) | ✅ Full Support | ✅ Full Support | Recommended |
| Firefox (Desktop) | ✅ Full Support | ✅ Full Support | Good |
| Safari (Desktop) | ✅ Full Support | ✅ Full Support | Good |
| Chrome (Android) | ✅ Full Support | ✅ Full Support | Recommended |
| Safari (iOS) | ⚠️ Limited | ✅ Full Support | Add to Home Screen |

---

**Remember:** Both permissions are **REQUIRED** for the app to function. The app will not work without them! 🔒

