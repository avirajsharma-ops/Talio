# Talio HRMS - macOS Desktop App

Native macOS application for Talio HRMS with screen recording permissions, background running, and Maya PIP overlay.

## Features

- **Screen Capture Permission**: Native macOS permission for productivity monitoring
- **Background Running**: App runs in system tray even when closed
- **Maya PIP Overlay**: Floating assistant window using native macOS vibrancy
- **Auto-Launch**: Optional start at login
- **Native Integration**: Uses macOS-specific features like traffic lights, vibrancy effects

## Requirements

- macOS 10.15 (Catalina) or later
- Node.js 18+ and npm

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build DMG installer
npm run build:dmg
```

## Building for Production

```bash
# Create icons from source image
chmod +x scripts/create-icons.sh
./scripts/create-icons.sh assets/icon-source.png

# Build the DMG
chmod +x scripts/build.sh
./scripts/build.sh
```

The DMG installer will be created in the `release/` folder.

## Permissions

The app requests the following permissions:

1. **Screen Recording**: Required for productivity monitoring screenshots
2. **Camera**: Optional, for video calls
3. **Microphone**: Optional, for audio calls

Users will be prompted to grant these permissions on first launch.

## Project Structure

```
mac-app/
├── src/
│   └── main.js          # Electron main process
├── assets/
│   ├── icon.icns        # macOS app icon
│   ├── icon.png         # PNG icon
│   └── tray-icon.png    # System tray icon
├── scripts/
│   ├── build.sh         # Build script
│   └── create-icons.sh  # Icon generation script
├── release/             # Built DMG files
├── preload.js           # Preload script for IPC
├── entitlements.plist   # macOS entitlements
└── package.json         # Project configuration
```

## Configuration

The app stores settings in the user's application support directory:
- `~/Library/Application Support/talio-hrms/config.json`

Default settings:
```json
{
  "serverUrl": "https://talio.in",
  "autoLaunch": true,
  "showMayaPIP": true
}
```

## System Tray

Right-click the tray icon for options:
- Open Talio HRMS
- Toggle Maya Assistant
- Screen Capture Permission
- Start at Login
- Quit Talio

