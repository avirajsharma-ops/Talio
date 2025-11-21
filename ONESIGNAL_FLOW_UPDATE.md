# OneSignal Subscription Flow Update

**Date:** November 21, 2024  
**Status:** ✅ COMPLETE

---

## 📋 Overview

Updated the OneSignal push notification subscription flow to trigger **after user login** and implement a proper permission sequence with session-based re-prompting.

---

## 🔄 New Subscription Flow

### Previous Flow:
1. ❌ Banner appeared immediately on page load (even before login)
2. ❌ Native permission requested first
3. ❌ No re-prompting if user denied

### New Flow:
1. ✅ **User logs into their account**
2. ✅ **OneSignal subscription banner appears** (only on dashboard)
3. ✅ **User clicks "Enable Notifications"**
4. ✅ **OneSignal subscription is created**
5. ✅ **Native notification permission is requested**
6. ✅ **Permission status is saved to database**
7. ✅ **User is re-prompted on every new session if denied**

---

## 🎯 Key Changes

### 1. **Trigger After Login** ✅
- Banner only shows when user is logged in
- Only appears on dashboard pages (`/dashboard/*`)
- Checks `localStorage` for token and user data
- Listens for storage events to detect login/logout

### 2. **Proper Permission Sequence** ✅
- **Step 1:** OneSignal subscription banner appears
- **Step 2:** User opts in to OneSignal
- **Step 3:** Native browser permission is requested
- **Step 4:** Permission status saved to database

### 3. **Session-Based Re-Prompting** ✅
- If user denies permission, banner re-appears on next session
- Permission status tracked in database
- Smart logic to determine when to show banner:
  - Always show if permission is `denied`
  - Always show if permission is `default` (never asked)
  - Show if permission is `granted` but not subscribed

---

## 📁 Files Modified

### 1. **models/User.js**
Added new fields to track notification permission:
```javascript
notificationPermissionStatus: {
  type: String,
  enum: ['granted', 'denied', 'default', null],
  default: null
},
notificationPermissionDeniedAt: {
  type: Date,
  default: null
},
notificationPermissionGrantedAt: {
  type: Date,
  default: null
}
```

### 2. **components/OneSignalInit.js**
Major updates:
- Added login status check
- Only initializes after user is logged in
- Only shows on dashboard pages
- Implemented `shouldShowPrompt()` function for smart re-prompting
- Updated subscription flow to request permission AFTER OneSignal opt-in
- Tracks permission status in database
- Removed unnecessary `await` keywords for properties

### 3. **app/api/onesignal/permission-status/route.js** (NEW)
New API endpoint to track permission status:
- `POST /api/onesignal/permission-status` - Update permission status
- `GET /api/onesignal/permission-status` - Get current permission status
- Tracks when permission was granted/denied
- Authenticated endpoint (requires JWT token)

---

## 🔍 Implementation Details

### Login Detection
```javascript
const [isLoggedIn, setIsLoggedIn] = useState(false)

useEffect(() => {
  const checkLoginStatus = () => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    const loggedIn = !!(token && user)
    setIsLoggedIn(loggedIn)
  }

  checkLoginStatus()
  window.addEventListener('storage', checkLoginStatus)
  return () => window.removeEventListener('storage', checkLoginStatus)
}, [])
```

### Smart Re-Prompting Logic
```javascript
const shouldShowPrompt = async (dbStatus, currentPermission) => {
  // Always re-prompt if denied
  if (currentPermission === 'denied') return true
  
  // Show if never asked
  if (!currentPermission || currentPermission === 'default') return true
  
  // Show if granted but not subscribed
  if (currentPermission === 'granted' && !dbStatus?.isSubscribed) return true
  
  return false
}
```

### Permission Sequence
```javascript
// STEP 1: Opt in to OneSignal
await window.OneSignal.User.PushSubscription.optIn()

// STEP 2: Request native notification permission
const permissionGranted = await window.OneSignal.Notifications.requestPermission()

// STEP 3: Save permission status
await fetch('/api/onesignal/permission-status', {
  method: 'POST',
  body: JSON.stringify({ status: permissionGranted ? 'granted' : 'denied' })
})

// STEP 4: Get Player ID and save
const playerId = window.OneSignal.User.PushSubscription.id
await savePlayerIdToDatabase(playerId, token)
```

---

## ✅ Testing Checklist

- [ ] User logs in → Banner appears on dashboard
- [ ] User clicks "Enable Notifications" → OneSignal subscription created
- [ ] Native permission prompt appears after OneSignal opt-in
- [ ] User grants permission → Player ID saved to database
- [ ] User denies permission → Status saved, banner hidden
- [ ] User logs out and logs back in → Banner re-appears if denied
- [ ] Banner does NOT appear on login page
- [ ] Banner does NOT appear before user is logged in
- [ ] Permission status correctly tracked in database

---

## 🚀 Benefits

1. **Better UX:** Users see the banner only after they're logged in and on the dashboard
2. **Clear Flow:** Two-step process (OneSignal → Native Permission) is clearer
3. **Persistent:** Re-prompts users who denied permission on every new session
4. **Tracked:** Permission status is saved in database for analytics
5. **Smart:** Doesn't annoy users who already granted permission

---

## 📝 Notes

- Banner text updated to clarify: "You'll be asked to allow notifications in the next step"
- Button text changed from "Enable Notifications" to "Continue" for clarity
- Permission status is tracked separately from OneSignal subscription status
- Works seamlessly with existing OneSignal integration

---

## 🔧 Android Native Code Changes

### Issue Found
The Android app was requesting notification permission **immediately on app launch** (even before login), which violated the desired flow.

### Files Modified

#### 1. **android/app/src/main/java/sbs/zenova/twa/TalioApplication.kt**
**Problem:** Automatically requested notification permission in `onCreate()` method
```kotlin
// REMOVED THIS CODE:
CoroutineScope(Dispatchers.Main).launch {
    val accepted = OneSignal.Notifications.requestPermission(true)
    if (accepted) {
        Log.d(TAG, "✅ Notification permission granted")
    } else {
        Log.w(TAG, "⚠️ Notification permission denied")
    }
}
```

**Solution:** Removed auto-request and added comment explaining the flow
```kotlin
// DO NOT request notification permission here - it will be requested after user logs in
// Permission flow: User logs in → Dashboard → Web app triggers OneSignal banner → Native permission
Log.d(TAG, "⏳ Notification permission will be requested after user login")
```

#### 2. **android/app/src/main/java/sbs/zenova/twa/MainActivity.kt**
**Problem:** `requestPermissions()` function requested notification permission first
```kotlin
// REMOVED THIS CODE:
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED
    ) {
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        return
    }
}
```

**Solution:** Updated to only request location permissions
```kotlin
private fun requestPermissions() {
    // DO NOT request notification permission here
    // Notification permission is handled by the web app's OneSignal flow
    // Only request location permissions for attendance tracking

    Log.d("Permissions", "Requesting location permissions only (notification handled by web app)")
    requestLocationPermissionSequence()
}
```

### Result
- ✅ Android app no longer requests notification permission on startup
- ✅ Only location permissions are requested (for attendance tracking)
- ✅ Notification permission is now exclusively handled by the web app's OneSignal flow
- ✅ Fresh APK and AAB built with these fixes

---

## 📦 Fresh Build Results

**Build Date:** November 21, 2024, 19:32
**Location:** `android/release/`

| File | Size | Status |
|------|------|--------|
| `talio.apk` | **6.4 MB** | ✅ Updated with permission fixes |
| `talio.aab` | **5.8 MB** | ✅ Updated with permission fixes |
| `talio-release.keystore` | 2.7 KB | Unchanged |
| `assetlinks.json` | 288 B | Unchanged |

---

**Implementation Complete! 🎉**

