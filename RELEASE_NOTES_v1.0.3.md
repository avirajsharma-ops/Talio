# Talio Desktop App v1.0.3 - Release Notes

## 🚀 Major Features

### Real-Time Screen Monitoring
- **Socket.IO Integration**: Desktop apps now connect to the server via WebSocket for real-time communication
- **Instant Capture**: Admins and department heads can request instant screenshots that are captured and uploaded immediately
- **Background Operation**: Apps work even when minimized or in the background

### Dynamic Screenshot Intervals
- **Admin Control**: Admins can set screenshot intervals for all employees
- **Department Head Control**: Department heads can set intervals for their department employees
- **Real-Time Updates**: Interval changes are pushed to desktop apps immediately via Socket.IO
- **Configurable Range**: Intervals can be set from 1 minute to 24 hours

### MAYA AI Integration
- **OpenAI GPT-4**: Integrated for screenshot analysis and productivity insights
- **ElevenLabs Voice**: Natural voice responses from MAYA assistant
- **Automatic Analysis**: Screenshots are analyzed automatically for productivity scoring

### Enhanced Permissions
- **macOS**: Proper screen capture permissions handling
- **Windows**: Full screen capture support without errors
- **Cross-Platform**: Consistent behavior on both platforms

## 📦 Installation Files

### macOS
- **Talio-1.0.3-arm64.dmg** (95 MB) - For Apple Silicon Macs (M1, M2, M3, M4)
- **Talio-1.0.3-x64.dmg** (100 MB) - For Intel Macs

### Windows
- **Talio-Setup-1.0.3-x64.exe** (74 MB) - For 64-bit Windows
- **Talio-Setup-1.0.3-ia32.exe** (65 MB) - For 32-bit Windows
- **Talio-Setup-1.0.3.exe** (138 MB) - Universal installer (includes both architectures)

## 🔧 Technical Changes

### Backend
- Added `/api/productivity/instant-capture/upload` endpoint
- Added `/api/productivity/screenshot-interval` endpoint (GET/POST)
- Updated Employee model with `screenshotInterval` field
- Enhanced Socket.IO server with monitoring event handlers
- Added `instant-capture-request` event
- Added `screenshot-interval-updated` event
- Added `desktop-app-ready` event

### Desktop Apps
- Integrated `socket.io-client` for real-time communication
- Integrated `dotenv` for secure credential management
- Added interval fetching and auto-update functionality
- Added instant capture handling
- Embedded OpenAI API key securely
- Embedded ElevenLabs API key securely
- Improved error handling and logging

### Security
- API keys embedded in compiled apps only (not exposed in code)
- No code signing (for internal distribution)
- Gatekeeper bypassed for macOS (right-click > Open first time)

## 🎯 How It Works

### Periodic Monitoring
1. Employee logs in to desktop app
2. App fetches screenshot interval from server
3. App captures screenshot at configured intervals
4. Screenshot uploaded and analyzed by MAYA AI
5. Results visible in productivity dashboard

### Instant Capture
1. Admin/Dept Head clicks "Instant Capture" for an employee
2. Server creates capture request and emits Socket.IO event
3. Desktop app receives event and captures screenshot immediately
4. Screenshot uploaded with request ID
5. MAYA analyzes screenshot in background
6. Results appear in dashboard within seconds

### Interval Management
1. Admin/Dept Head goes to employee settings
2. Sets screenshot interval (e.g., 15 minutes)
3. Server updates database and emits Socket.IO event
4. Desktop app receives event and restarts monitoring with new interval
5. All future captures use the new interval

## 📝 Installation Instructions

### macOS
1. Download the appropriate DMG file for your Mac architecture
2. Open the DMG file
3. Drag Talio app to Applications folder
4. Right-click the app and select "Open" (first time only)
5. Click "Open" in the security dialog
6. Log in with your Talio credentials
7. Grant screen recording permission when prompted

### Windows
1. Download the appropriate EXE installer
2. Run the installer
3. Follow the installation wizard
4. Launch Talio from Start Menu or Desktop
5. Log in with your Talio credentials
6. App will start monitoring automatically

## 🐛 Bug Fixes
- Fixed "auto-launch" module error on Windows
- Fixed "damaged app" error on macOS Silicon
- Fixed Mac Intel download URLs (404 errors)
- Fixed screenshot permission handling
- Fixed pending captures showing in UI

## 🔐 Privacy & Security
- All screenshots encrypted in transit
- API keys never exposed in logs
- Screen capture only when logged in
- Full audit trail of all captures
- Department head isolation (can only see their department)

## 📱 Compatibility
- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 7 or later
- **Server**: Socket.IO 4.8+
- **Browser**: Modern browsers for web dashboard

## 🆘 Troubleshooting

### macOS "Damaged App" Error
- Right-click app → Open (don't double-click)
- If still blocked: System Preferences → Security → Allow

### Windows Antivirus Warning
- App is not code-signed (internal use)
- Add exception in antivirus if needed

### Screenshots Not Uploading
- Check internet connection
- Verify desktop app is running
- Check server Socket.IO connection in logs
- Ensure screen recording permission granted

## 📞 Support
For issues or questions, contact the Talio development team.

---
**Build Date**: November 27, 2025
**Version**: 1.0.3
**Commit**: 1befc70d
