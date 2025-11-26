# Talio Activity Monitor - Windows Desktop Application

Windows desktop application for comprehensive employee activity monitoring with unrestricted screen capture and background operation.

## Features

- 📸 **Unrestricted Screen Capture**: Captures screenshots every 30 seconds from all monitors
- 🪟 **Window Tracking**: Monitors active windows and application usage across all desktop apps
- 🎯 **Background Operation**: Runs silently in system tray, doesn't require active window
- 🚀 **Auto-Start**: Automatically starts with Windows
- 🔐 **Secure Authentication**: JWT-based authentication with Talio HRMS
- 📊 **Real-time Stats**: View capture counts, uptime, and current application
- 🔌 **API Integration**: Seamlessly integrates with Tailo web platform

## System Requirements

- **OS**: Windows 10 or Windows 11
- **Architecture**: x64, ia32, or arm64
- **.NET Framework**: 4.5 or higher (for MSI installer)
- **RAM**: Minimum 2GB
- **Disk Space**: 100MB for application + screenshot storage
- **Internet**: Active connection for API communication

## Installation

### Option 1: NSIS Installer (Recommended)

1. Download the appropriate installer for your architecture:
   - `Talio-Activity-Monitor-Setup-{version}-x64.exe` (64-bit Windows)
   - `Talio-Activity-Monitor-Setup-{version}-ia32.exe` (32-bit Windows)
   - `Talio-Activity-Monitor-Setup-{version}-arm64.exe` (ARM64 Windows)

2. Run the installer (requires administrator privileges)

3. Choose installation directory (default: `C:\Program Files\Tailo Activity Monitor`)

4. Installer will:
   - Install application files
   - Create desktop shortcut
   - Create Start Menu shortcut
   - Configure auto-start
   - Launch application

### Option 2: MSI Installer (Enterprise)

1. Download `Talio-Activity-Monitor-{version}-x64.msi`

2. Run the MSI installer or deploy via Group Policy

3. Supports silent installation: `msiexec /i Talio-Activity-Monitor-{version}-x64.msi /quiet`

### Option 3: Portable Executable

1. Download the portable version:
   - `Talio-Activity-Monitor-{version}-x64-portable.exe`
   - `Talio-Activity-Monitor-{version}-ia32-portable.exe`

2. Extract to any folder (no installation required)

3. Run `Talio Activity Monitor.exe`

4. Note: Auto-start must be configured manually for portable version

## Building from Source

### Prerequisites

```bash
# Install Node.js 18 or higher
# Download from https://nodejs.org/

# Install dependencies
cd windows-app
npm install
```

### Build Commands

```bash
# Build all Windows installers (x64, ia32, arm64)
npm run build:win

# Build specific architecture
npm run build:win64    # x64 only
npm run build:win32    # ia32 only

# Build portable executable
npm run build:portable

# Development mode
npm start
```

### Build Artifacts

Built installers are located in `windows-app/dist/`:

- `Talio Activity Monitor-Setup-{version}-x64.exe` - NSIS installer (64-bit)
- `Talio Activity Monitor-Setup-{version}-ia32.exe` - NSIS installer (32-bit)
- `Talio Activity Monitor-Setup-{version}-arm64.exe` - NSIS installer (ARM64)
- `Talio Activity Monitor-{version}-x64.msi` - MSI installer (64-bit)
- `Talio Activity Monitor-{version}-x64-portable.exe` - Portable (64-bit)
- `Talio Activity Monitor-{version}-ia32-portable.exe` - Portable (32-bit)

## Usage

### First Launch

1. Application will start in system tray (look for Tailo icon in notification area)

2. Click the tray icon to show the login window

3. Enter your Tailo HRMS credentials:
   - Email: Your employee email
   - Password: Your Tailo password

4. Click "Login" - authentication happens against https://app.tailo.work

5. Upon successful login, monitoring starts automatically

### System Tray Menu

Right-click the tray icon to access:

- **Status**: Shows if monitoring is Active or Paused
- **User**: Shows logged-in email
- **Open Dashboard**: Opens web activity dashboard
- **Show Window**: Shows the application window
- **Pause/Resume Tracking**: Toggle monitoring on/off
- **Logout**: Sign out and stop monitoring
- **Exit**: Quit application

### Dashboard Window

The application window shows:

- **Status Indicator**: Green (Active) or Orange (Paused)
- **Stats Cards**:
  - Screenshots captured today
  - Windows tracked today
  - Uptime
  - Current active application
- **Recent Activity Feed**: Last 10 activities (screenshots, window changes)
- **Action Buttons**:
  - Pause/Resume Tracking
  - Open Web Dashboard

### Monitoring Details

**Screenshots**:
- Captured every 30 seconds from primary monitor
- Sent to Tailo API for AI analysis
- Analysis includes: summary, productivity score, detected text (OCR)

**Window Tracking**:
- Active window checked every 1 second
- Time spent calculated per window
- Batched and sent to API every 10 seconds

**Power Events**:
- Automatically pauses on system suspend/lock
- Resumes on system wake/unlock

## Configuration

### API Endpoint

Default: `https://app.tailo.work`

To change, edit `windows-app/main.js`:

```javascript
const API_URL = 'https://your-custom-domain.com';
```

### Intervals

Edit `windows-app/main.js`:

```javascript
const CONFIG = {
  SCREENSHOT_INTERVAL: 30000,        // Screenshot every 30s
  WINDOW_CHECK_INTERVAL: 1000,       // Check active window every 1s
  BATCH_FLUSH_INTERVAL: 10000,       // Send window data every 10s
  AUTO_START: true                   // Start with Windows
};
```

### Auto-Start

Enabled by default. To disable:

```javascript
const CONFIG = {
  AUTO_START: false
};
```

Or manually remove from:
- Registry: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- Key: `TalioActivityMonitor`

## Permissions

The application requires:

- **Administrator Privileges**: For unrestricted screen capture
- **Internet Access**: To communicate with Tailo API
- **Screen Capture**: To take screenshots
- **Window Information**: To track active applications
- **Auto-start Registry**: To launch on Windows boot

## Privacy & Security

- All data encrypted in transit (HTTPS)
- JWT authentication for API calls
- Credentials stored securely in local storage (electron-store)
- Screenshots sent directly to server (not stored locally)
- Complies with company monitoring policies

## Troubleshooting

### Application Won't Start

1. Check if already running in system tray
2. Run installer as Administrator
3. Check Windows Event Viewer for errors
4. Verify .NET Framework 4.5+ installed

### Login Fails

1. Verify credentials on https://app.tailo.work
2. Check internet connection
3. Verify firewall allows outbound HTTPS
4. Check if VPN is required

### Screenshots Not Capturing

1. Ensure Administrator privileges granted
2. Check if screen capture blocked by antivirus
3. Verify monitor connected and active
4. Check application logs in `%APPDATA%\tailo-activity-monitor\logs`

### Auto-Start Not Working

1. Check Registry entry: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
2. Re-run installer as Administrator
3. Manually add shortcut to Startup folder: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`

### High CPU Usage

1. Increase intervals in `main.js`
2. Disable screenshot capture temporarily
3. Check for multiple instances running
4. Update to latest version

## Uninstallation

### NSIS/MSI Installer

1. Go to **Settings > Apps > Installed Apps**
2. Find "Tailo Activity Monitor"
3. Click "Uninstall"
4. Follow prompts

Or use uninstaller:
- `C:\Program Files\Tailo Activity Monitor\Uninstall Talio Activity Monitor.exe`

### Portable Version

1. Exit application from system tray
2. Delete the folder containing the executable
3. Remove auto-start registry entry if configured

## Support

For issues or questions:
- **Web Dashboard**: https://app.talio.work/dashboard
- **Documentation**: See `ACTIVITY_MONITORING_SYSTEM.md`
- **API Documentation**: `app/api/activity/` endpoints

## Version History

### v1.0.0 (Current)
- Initial release
- Screenshot capture every 30s
- Window tracking
- System tray integration
- Auto-start support
- Multi-architecture support (x64, ia32, arm64)
- Power event handling

## License

Proprietary - Tailo HRMS
© 2024 All rights reserved

---

**Note**: This application is part of the Tailo HRMS activity monitoring system. It must be used in conjunction with the Tailo web platform and Chrome extension for comprehensive monitoring.
