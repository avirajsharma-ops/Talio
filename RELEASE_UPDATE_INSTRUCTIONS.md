# GitHub Release v1.0.3 Update Instructions

## Current State
The release exists but has incorrect/missing files:
- ❌ `Talio-1.0.3.dmg` (should be `Talio-1.0.3-x64.dmg`)
- ⚠️ Missing `Talio-Setup-1.0.3.exe` (Universal Windows installer)

## Files to Upload

### Delete These OLD Files First:
1. `Talio-1.0.3.dmg` (wrong name - should have -x64 suffix)

### Upload These NEW Files:

#### macOS (2 files)
1. **Talio-1.0.3-arm64.dmg** (95 MB) - Apple Silicon
   - Location: `/Users/avirajsharma/Desktop/Talio/mac-app/release/Talio-1.0.3-arm64.dmg`
   - ✅ Already in release (verify it's the latest)

2. **Talio-1.0.3-x64.dmg** (100 MB) - Intel Mac
   - Location: `/Users/avirajsharma/Desktop/Talio/mac-app/release/Talio-1.0.3-x64.dmg`
   - ⚠️ Upload this (currently named wrong in release)

#### Windows (3 files)
3. **Talio-Setup-1.0.3-x64.exe** (74 MB) - 64-bit
   - Location: `/Users/avirajsharma/Desktop/Talio/windows-app/release/Talio-Setup-1.0.3-x64.exe`
   - ✅ Already in release (verify it's the latest)

4. **Talio-Setup-1.0.3-ia32.exe** (65 MB) - 32-bit
   - Location: `/Users/avirajsharma/Desktop/Talio/windows-app/release/Talio-Setup-1.0.3-ia32.exe`
   - ✅ Already in release (verify it's the latest)

5. **Talio-Setup-1.0.3.exe** (138 MB) - Universal
   - Location: `/Users/avirajsharma/Desktop/Talio/windows-app/release/Talio-Setup-1.0.3.exe`
   - ❌ Missing - upload this

## Step-by-Step Update Process

### 1. Go to Release Page
https://github.com/avirajsharma-ops/Tailo/releases/tag/v1.0.3

### 2. Edit Release
- Click "Edit release" button

### 3. Delete Old/Incorrect Files
- Find `Talio-1.0.3.dmg` (without -x64 suffix)
- Click the trash/delete icon next to it
- Confirm deletion

### 4. Upload Missing Files
Drag and drop these files to the release:
- `mac-app/release/Talio-1.0.3-x64.dmg` (replace the old .dmg)
- `windows-app/release/Talio-Setup-1.0.3.exe` (new upload)

### 5. Verify All 5 Files Present
After upload, you should see:
- ✅ Talio-1.0.3-arm64.dmg (~95 MB)
- ✅ Talio-1.0.3-x64.dmg (~100 MB)
- ✅ Talio-Setup-1.0.3-x64.exe (~74 MB)
- ✅ Talio-Setup-1.0.3-ia32.exe (~65 MB)
- ✅ Talio-Setup-1.0.3.exe (~138 MB)

### 6. Update Release Notes (Optional)
Ensure the description includes all the features from RELEASE_NOTES_v1.0.3.md

### 7. Save Changes
Click "Update release" button

## Download URLs After Update

Once updated, these URLs will work:

### macOS
```
https://github.com/avirajsharma-ops/Tailo/releases/download/v1.0.3/Talio-1.0.3-arm64.dmg
https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.3/Talio-1.0.3-x64.dmg
```

### Windows
```
https://github.com/avirajsharma-ops/Tailo/releases/download/v1.0.3/Talio-Setup-1.0.3-x64.exe
https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.3/Talio-Setup-1.0.3-ia32.exe
https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.3/Talio-Setup-1.0.3.exe
```

## Verification

After completing the upload, verify each download URL works:

```bash
# Test macOS arm64
curl -I https://github.com/avirajsharma-ops/Tailo/releases/download/v1.0.3/Talio-1.0.3-arm64.dmg

# Test macOS x64
curl -I https://github.com/avirajsharma-ops/Tailo/releases/download/v1.0.3/Talio-1.0.3-x64.dmg

# Test Windows x64
curl -I https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.3/Talio-Setup-1.0.3-x64.exe

# Test Windows ia32
curl -I https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.3/Talio-Setup-1.0.3-ia32.exe

# Test Windows Universal
curl -I https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.3/Talio-Setup-1.0.3.exe
```

All should return `HTTP/2 302` (redirect) followed by `HTTP/2 200` (success).

---

**After upload is complete, the download pages will automatically work with the updated files!**
