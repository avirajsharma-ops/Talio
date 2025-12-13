const { systemPreferences, dialog, desktopCapturer, Notification } = require('electron');
const Store = require('electron-store');

const store = new Store();

/**
 * Permission Handler
 * Requests all required permissions explicitly through native popups
 */
class PermissionHandler {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.permissions = {
      camera: false,
      microphone: false,
      screen: false,
      notifications: false,
      location: false
    };
  }

  /**
   * Request all permissions
   */
  async requestAllPermissions() {
    console.log('[PermissionHandler] Requesting all permissions...');

    // Check if already shown permission dialogs
    if (store.get('permissionsRequested')) {
      console.log('[PermissionHandler] Permissions already requested, checking status...');
      await this.checkAllPermissions();
      return;
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      await this.requestMacPermissions();
    } else if (platform === 'win32') {
      await this.requestWindowsPermissions();
    }

    store.set('permissionsRequested', true);
  }

  /**
   * Request macOS specific permissions
   */
  async requestMacPermissions() {
    console.log('[PermissionHandler] Requesting macOS permissions...');

    // 1. Camera permission
    await this.requestCameraPermission();

    // 2. Microphone permission
    await this.requestMicrophonePermission();

    // 3. Screen Recording permission (most important for screenshots)
    await this.requestScreenRecordingPermission();

    // 4. Notifications permission
    await this.requestNotificationPermission();

    // 5. Location permission (will be handled by web content)
    // macOS location is handled at app level through entitlements
  }

  /**
   * Request Windows specific permissions
   */
  async requestWindowsPermissions() {
    console.log('[PermissionHandler] Requesting Windows permissions...');

    // Windows handles most permissions at runtime through the web API
    // We just need to show a dialog explaining what permissions are needed

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Talio Permissions',
      message: 'Talio needs the following permissions to work properly:',
      detail: `• Camera - For video calls and meetings
• Microphone - For audio calls and meetings
• Screen Recording - For productivity monitoring and screen sharing
• Notifications - For alerts and updates
• Location - For attendance geofencing

Please allow these permissions when prompted by your browser or system.`,
      buttons: ['OK, Got it!'],
      defaultId: 0
    });

    // Trigger a screen capture to prompt for permission
    await this.triggerScreenCapture();
    
    // Trigger notification permission
    await this.requestNotificationPermission();
  }

  /**
   * Request camera permission (macOS)
   */
  async requestCameraPermission() {
    if (process.platform !== 'darwin') return;

    const status = systemPreferences.getMediaAccessStatus('camera');
    console.log(`[PermissionHandler] Camera status: ${status}`);

    if (status === 'not-determined') {
      const granted = await systemPreferences.askForMediaAccess('camera');
      this.permissions.camera = granted;
      console.log(`[PermissionHandler] Camera access ${granted ? 'granted' : 'denied'}`);
    } else {
      this.permissions.camera = status === 'granted';
    }

    if (!this.permissions.camera && status === 'denied') {
      await this.showPermissionDeniedDialog('Camera', 'Privacy & Security > Camera');
    }
  }

  /**
   * Request microphone permission (macOS)
   */
  async requestMicrophonePermission() {
    if (process.platform !== 'darwin') return;

    const status = systemPreferences.getMediaAccessStatus('microphone');
    console.log(`[PermissionHandler] Microphone status: ${status}`);

    if (status === 'not-determined') {
      const granted = await systemPreferences.askForMediaAccess('microphone');
      this.permissions.microphone = granted;
      console.log(`[PermissionHandler] Microphone access ${granted ? 'granted' : 'denied'}`);
    } else {
      this.permissions.microphone = status === 'granted';
    }

    if (!this.permissions.microphone && status === 'denied') {
      await this.showPermissionDeniedDialog('Microphone', 'Privacy & Security > Microphone');
    }
  }

  /**
   * Request screen recording permission (macOS)
   */
  async requestScreenRecordingPermission() {
    if (process.platform !== 'darwin') return;

    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log(`[PermissionHandler] Screen recording status: ${status}`);

    if (status !== 'granted') {
      // Show dialog explaining why screen recording is needed
      const result = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Screen Recording Permission Required',
        message: 'Talio needs Screen Recording permission',
        detail: `This permission is required for:
• Taking screenshots for productivity monitoring
• Sharing your screen in meetings

Click "Open Settings" to enable Screen Recording for Talio in System Preferences.`,
        buttons: ['Open Settings', 'Later'],
        defaultId: 0
      });

      if (result.response === 0) {
        // Open System Preferences to Screen Recording
        const { shell } = require('electron');
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }

      // Trigger a capture to prompt for permission
      await this.triggerScreenCapture();
    }

    this.permissions.screen = status === 'granted';
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (Notification.isSupported()) {
      // Just check if notifications are enabled
      // Electron handles this automatically
      this.permissions.notifications = true;
      console.log('[PermissionHandler] Notifications supported');
    }
  }

  /**
   * Trigger a screen capture to prompt for permission
   */
  async triggerScreenCapture() {
    try {
      const sources = await desktopCapturer.getSources({ 
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 } // Minimal size just to trigger permission
      });
      this.permissions.screen = sources.length > 0;
      console.log(`[PermissionHandler] Screen capture test: ${sources.length} sources found`);
    } catch (error) {
      console.error('[PermissionHandler] Screen capture test failed:', error.message);
      this.permissions.screen = false;
    }
  }

  /**
   * Show dialog for denied permissions
   */
  async showPermissionDeniedDialog(permission, settingsPath) {
    await dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: `${permission} Permission Denied`,
      message: `${permission} access is required for Talio to work properly.`,
      detail: `Please enable ${permission} access in System Preferences:\n\n${settingsPath}`,
      buttons: ['OK']
    });
  }

  /**
   * Check all permission statuses
   */
  async checkAllPermissions() {
    if (process.platform === 'darwin') {
      this.permissions.camera = systemPreferences.getMediaAccessStatus('camera') === 'granted';
      this.permissions.microphone = systemPreferences.getMediaAccessStatus('microphone') === 'granted';
      this.permissions.screen = systemPreferences.getMediaAccessStatus('screen') === 'granted';
    } else {
      // On Windows, assume granted if we haven't been denied
      this.permissions.camera = true;
      this.permissions.microphone = true;
      this.permissions.screen = true;
    }

    this.permissions.notifications = Notification.isSupported();

    console.log('[PermissionHandler] Current permissions:', this.permissions);
    return this.permissions;
  }

  /**
   * Get current permission statuses
   */
  getPermissions() {
    return this.permissions;
  }

  /**
   * Check if a specific permission is granted
   */
  hasPermission(permission) {
    return this.permissions[permission] || false;
  }
}

module.exports = { PermissionHandler };
