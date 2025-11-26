const { app, BrowserWindow, systemPreferences, ipcMain, screen, Tray, Menu, nativeImage, Notification, desktopCapturer } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const axios = require('axios');

// IMPORTANT: Always use app.talio.in - DO NOT change this
const APP_URL = 'https://app.talio.in';

// Initialize store for app settings
const store = new Store({
  defaults: {
    autoLaunch: true,
    showMayaPIP: false,
    pipPosition: { x: null, y: null },
    blobPosition: { x: null, y: null },
    authToken: null,
    userId: null
  }
});

// Force update any cached wrong URL
store.delete('serverUrl');

// Windows
let mainWindow = null;
let mayaWidgetWindow = null;
let mayaBlobWindow = null;
let dotMatrixOverlay = null;
let tray = null;
let mayaInactivityTimer = null;
const MAYA_INACTIVITY_TIMEOUT = 30000;

// Activity tracking
let authToken = null;
let currentUser = null;
let keystrokeBuffer = [];
let appUsageBuffer = [];
let currentActiveApp = { name: '', startTime: null };
let screenshotTimer = null;
let activitySyncTimer = null;
let keyListener = null;
let activeWin = null;

// Activity tracking intervals
const SCREENSHOT_INTERVAL = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_SYNC_INTERVAL = 60 * 1000; // 1 minute
const APP_CHECK_INTERVAL = 5000; // 5 seconds

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
  name: 'Talio HRMS',
  path: app.getPath('exe')
});

// Check and request screen recording permission
async function checkScreenCapturePermission() {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log('[Talio] Screen capture permission status:', status);

    if (status !== 'granted') {
      // Open System Preferences to grant permission
      const { shell } = require('electron');
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      return false;
    }
    return true;
  }
  return true;
}

// Check camera/microphone permissions
async function checkMediaPermissions() {
  if (process.platform === 'darwin') {
    const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');

    if (cameraStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('camera');
    }
    if (micStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }
  }
}

// Create the main application window
function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 1024,
    minHeight: 768,
    title: 'Talio HRMS',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
      webSecurity: true
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#f8fafc',
    show: false
  });

  // Load the Talio web app - ALWAYS use APP_URL
  mainWindow.loadURL(APP_URL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Maya blob is ALWAYS visible (unless widget is open)
  // No hiding on main window focus/blur - blob stays visible

  mainWindow.on('focus', () => {
    // Blob stays visible - don't hide
  });

  mainWindow.on('blur', () => {
    // Blob stays visible
  });

  mainWindow.on('minimize', () => {
    // Blob stays visible
  });

  mainWindow.on('restore', () => {
    // Blob stays visible
  });

  mainWindow.on('show', () => {
    // Blob stays visible
  });

  mainWindow.on('hide', () => {
    // Blob stays visible
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create Maya Blob (small floating button at bottom)
function createMayaBlobWindow() {
  if (mayaBlobWindow) {
    mayaBlobWindow.show();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedPosition = store.get('blobPosition');

  const blobSize = 120;

  mayaBlobWindow = new BrowserWindow({
    width: blobSize,
    height: blobSize,
    x: savedPosition.x ?? width - blobSize - 20,
    y: savedPosition.y ?? height - blobSize - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../maya-preload.js')
    },
    show: false
  });

  // Load Maya blob HTML
  mayaBlobWindow.loadFile(path.join(__dirname, '../maya-blob.html'));

  mayaBlobWindow.once('ready-to-show', () => {
    mayaBlobWindow.show();
  });

  // Save position when moved
  mayaBlobWindow.on('moved', () => {
    const bounds = mayaBlobWindow.getBounds();
    store.set('blobPosition', { x: bounds.x, y: bounds.y });
  });

  mayaBlobWindow.on('closed', () => {
    mayaBlobWindow = null;
  });
}

// Create native dot matrix overlay for full screen coverage
function createDotMatrixOverlayWindow() {
  if (dotMatrixOverlay) {
    return dotMatrixOverlay;
  }

  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  dotMatrixOverlay = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    type: 'panel', // Makes it float above fullscreen apps on macOS
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  dotMatrixOverlay.setIgnoreMouseEvents(true);
  dotMatrixOverlay.setVisibleOnAllWorkspaces(true);
  dotMatrixOverlay.loadFile(path.join(__dirname, '..', 'dot-matrix-overlay.html'));

  dotMatrixOverlay.on('closed', () => {
    dotMatrixOverlay = null;
  });

  return dotMatrixOverlay;
}

// Show dot matrix scan animation
function showDotMatrix() {
  const overlay = createDotMatrixOverlayWindow();
  overlay.show();
  overlay.webContents.executeJavaScript('window.startScan()').catch(() => {});
}

// Hide dot matrix with smooth fade
function hideDotMatrix() {
  if (dotMatrixOverlay) {
    dotMatrixOverlay.webContents.executeJavaScript('window.stopScan()').catch(() => {});
    setTimeout(() => {
      if (dotMatrixOverlay) {
        dotMatrixOverlay.hide();
      }
    }, 1200);
  }
}

// Create native Maya widget window (transparent, professional UI)
function createMayaWidgetWindow() {
  if (mayaWidgetWindow) {
    mayaWidgetWindow.show();
    mayaWidgetWindow.focus();
    resetMayaInactivityTimer();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedPosition = store.get('pipPosition');

  const widgetWidth = 400;
  const widgetHeight = 550;

  mayaWidgetWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: savedPosition.x ?? width - widgetWidth - 20,
    y: savedPosition.y ?? height - widgetHeight - 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    skipTaskbar: true,
    hasShadow: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../maya-preload.js')
    },
    show: false
  });

  // Load native Maya widget HTML
  mayaWidgetWindow.loadFile(path.join(__dirname, '..', 'maya-widget.html'));

  mayaWidgetWindow.once('ready-to-show', () => {
    mayaWidgetWindow.show();
    // Send auth token to widget
    if (authToken) {
      mayaWidgetWindow.webContents.send('maya-auth', { token: authToken, user: currentUser });
    }
    // Hide blob when widget is shown
    if (mayaBlobWindow) {
      mayaBlobWindow.hide();
    }
    resetMayaInactivityTimer();
  });

  // Save position when moved
  mayaWidgetWindow.on('moved', () => {
    const bounds = mayaWidgetWindow.getBounds();
    store.set('pipPosition', { x: bounds.x, y: bounds.y });
  });

  // Track activity
  mayaWidgetWindow.webContents.on('before-input-event', () => {
    resetMayaInactivityTimer();
  });

  mayaWidgetWindow.on('focus', () => {
    resetMayaInactivityTimer();
  });

  mayaWidgetWindow.on('closed', () => {
    mayaWidgetWindow = null;
    clearMayaInactivityTimer();
    if (mayaBlobWindow) {
      mayaBlobWindow.show();
    }
  });
}

// Alias for backward compatibility
function createMayaPIPWindow() {
  createMayaWidgetWindow();
}

// Reset Maya inactivity timer
function resetMayaInactivityTimer() {
  clearMayaInactivityTimer();
  mayaInactivityTimer = setTimeout(() => {
    minimizeMayaToBob();
  }, MAYA_INACTIVITY_TIMEOUT);
}

// Clear Maya inactivity timer
function clearMayaInactivityTimer() {
  if (mayaInactivityTimer) {
    clearTimeout(mayaInactivityTimer);
    mayaInactivityTimer = null;
  }
}

// Minimize Maya widget to blob
function minimizeMayaToBob() {
  if (mayaWidgetWindow && mayaWidgetWindow.isVisible()) {
    mayaWidgetWindow.hide();
    if (mayaBlobWindow) {
      mayaBlobWindow.show();
    } else {
      createMayaBlobWindow();
    }
  }
}

// ============= ACTIVITY TRACKING =============

// Initialize activity tracking modules
async function initializeActivityTracking() {
  try {
    // Try to load native modules
    const { GlobalKeyboardListener } = require('node-global-key-listener');
    keyListener = new GlobalKeyboardListener();

    keyListener.addListener((e) => {
      if (e.state === 'DOWN' && authToken) {
        recordKeystroke();
      }
    });
    console.log('[Talio] Keyboard tracking initialized');
  } catch (err) {
    console.log('[Talio] Keyboard tracking not available:', err.message);
  }

  try {
    activeWin = await import('active-win');
    startAppTracking();
    console.log('[Talio] App tracking initialized');
  } catch (err) {
    console.log('[Talio] Active window tracking not available:', err.message);
  }
}

// Record keystroke (count only, not content)
function recordKeystroke() {
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

  const existing = keystrokeBuffer.find(k => k.hourKey === hourKey);
  if (existing) {
    existing.count++;
  } else {
    keystrokeBuffer.push({ hourKey, count: 1, timestamp: now.toISOString() });
  }

  // Keep buffer size manageable
  if (keystrokeBuffer.length > 24) {
    keystrokeBuffer = keystrokeBuffer.slice(-24);
  }
}

// Track active application
function startAppTracking() {
  setInterval(async () => {
    if (!authToken || !activeWin) return;

    try {
      const win = await (activeWin.default || activeWin)();
      if (win) {
        const now = Date.now();

        if (currentActiveApp.name !== win.owner.name) {
          // App changed - save previous
          if (currentActiveApp.name && currentActiveApp.startTime) {
            appUsageBuffer.push({
              app: currentActiveApp.name,
              title: currentActiveApp.title,
              duration: now - currentActiveApp.startTime,
              timestamp: new Date(currentActiveApp.startTime).toISOString()
            });
          }

          // Start tracking new app
          currentActiveApp = {
            name: win.owner.name,
            title: win.title,
            startTime: now
          };
        }

        // Keep buffer manageable
        if (appUsageBuffer.length > 100) {
          appUsageBuffer = appUsageBuffer.slice(-100);
        }
      }
    } catch (err) {
      // Ignore errors
    }
  }, APP_CHECK_INTERVAL);
}

// Capture screenshot and summarize
async function captureAndSummarize() {
  if (!authToken) return;

  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length === 0) return;

    const screenshot = sources[0].thumbnail.toDataURL();

    // Send to API for AI summarization and storage
    await axios.post(`${APP_URL}/api/monitoring/screenshot`, {
      screenshot: screenshot,
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('[Talio] Screenshot captured and saved');
  } catch (error) {
    console.error('[Talio] Screenshot error:', error.message);
  }
}

// Start periodic screenshot monitoring
function startScreenMonitoring() {
  if (screenshotTimer) return;

  // Capture immediately
  setTimeout(captureAndSummarize, 5000);

  // Then every 30 minutes
  screenshotTimer = setInterval(captureAndSummarize, SCREENSHOT_INTERVAL);
  console.log('[Talio] Screen monitoring started (30 min intervals)');
}

// Sync activity data to server
async function syncActivityData() {
  if (!authToken) return;
  if (keystrokeBuffer.length === 0 && appUsageBuffer.length === 0) return;

  try {
    await axios.post(`${APP_URL}/api/monitoring/activity`, {
      keystrokes: keystrokeBuffer,
      appUsage: appUsageBuffer,
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    // Clear buffers after successful sync
    keystrokeBuffer = [];
    appUsageBuffer = [];
    console.log('[Talio] Activity data synced');
  } catch (error) {
    console.error('[Talio] Activity sync error:', error.message);
  }
}

// Start activity sync interval
function startActivitySync() {
  if (activitySyncTimer) return;
  activitySyncTimer = setInterval(syncActivityData, ACTIVITY_SYNC_INTERVAL);
  console.log('[Talio] Activity sync started');
}

// Send native push notification
function sendNotification(title, body, options = {}) {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: title,
    body: body,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    urgency: 'critical',
    timeoutType: 'default',
    silent: false
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
    if (options.onClick) options.onClick();
  });

  notification.show();
  return notification;
}

// Set authentication
function setAuth(token, user) {
  authToken = token;
  currentUser = user;
  store.set('authToken', token);
  store.set('userId', user?.id);

  // Start monitoring when authenticated
  if (token) {
    startScreenMonitoring();
    startActivitySync();
  }

  // Send to Maya widget
  if (mayaWidgetWindow) {
    mayaWidgetWindow.webContents.send('maya-auth', { token, user });
  }
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 18, height: 18 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Talio HRMS',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Toggle Maya Assistant',
      click: () => {
        if (mayaWidgetWindow) {
          if (mayaWidgetWindow.isVisible()) {
            mayaWidgetWindow.hide();
            store.set('showMayaPIP', false);
            if (mayaBlobWindow) mayaBlobWindow.show();
          } else {
            mayaWidgetWindow.show();
            store.set('showMayaPIP', true);
            if (mayaBlobWindow) mayaBlobWindow.hide();
          }
        } else {
          createMayaWidgetWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Screen Capture Permission',
      click: async () => {
        await checkScreenCapturePermission();
      }
    },
    { type: 'separator' },
    {
      label: 'Start at Login',
      type: 'checkbox',
      checked: store.get('autoLaunch'),
      click: (menuItem) => {
        store.set('autoLaunch', menuItem.checked);
        if (menuItem.checked) {
          autoLauncher.enable();
        } else {
          autoLauncher.disable();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Talio',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Talio HRMS');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// IPC Handlers
function setupIPC() {
  // Screen capture for productivity monitoring
  ipcMain.handle('capture-screen', async () => {
    const hasPermission = await checkScreenCapturePermission();
    if (!hasPermission) {
      return { success: false, error: 'Screen capture permission not granted' };
    }

    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toDataURL();
      return { success: true, screenshot };
    }
    return { success: false, error: 'No screen sources found' };
  });

  // Get screen capture permission status
  ipcMain.handle('get-screen-permission-status', () => {
    if (process.platform === 'darwin') {
      return systemPreferences.getMediaAccessStatus('screen');
    }
    return 'granted';
  });

  // Request screen capture permission
  ipcMain.handle('request-screen-permission', async () => {
    return await checkScreenCapturePermission();
  });

  // Request all permissions at once (called after user logs in)
  ipcMain.handle('request-all-permissions', async () => {
    console.log('[Talio] Requesting all permissions after login...');
    const results = {
      screen: false,
      camera: false,
      microphone: false
    };

    if (process.platform === 'darwin') {
      // Request camera permission (native dialog)
      try {
        results.camera = await systemPreferences.askForMediaAccess('camera');
      } catch (e) {
        console.error('[Talio] Camera permission error:', e);
      }

      // Request microphone permission (native dialog)
      try {
        results.microphone = await systemPreferences.askForMediaAccess('microphone');
      } catch (e) {
        console.error('[Talio] Microphone permission error:', e);
      }

      // Check screen capture status (requires manual grant in System Preferences)
      const screenStatus = systemPreferences.getMediaAccessStatus('screen');
      results.screen = screenStatus === 'granted';

      // If screen not granted, open System Preferences
      if (!results.screen) {
        const { shell } = require('electron');
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
    } else {
      // Windows - permissions are typically granted automatically
      results.screen = true;
      results.camera = true;
      results.microphone = true;
    }

    console.log('[Talio] Permission results:', results);
    return results;
  });

  // Get all permission statuses
  ipcMain.handle('get-permission-status', () => {
    if (process.platform === 'darwin') {
      return {
        screen: systemPreferences.getMediaAccessStatus('screen'),
        camera: systemPreferences.getMediaAccessStatus('camera'),
        microphone: systemPreferences.getMediaAccessStatus('microphone')
      };
    }
    return {
      screen: 'granted',
      camera: 'granted',
      microphone: 'granted'
    };
  });

  // Toggle Maya PIP
  ipcMain.handle('toggle-maya-pip', (event, show) => {
    if (show) {
      createMayaPIPWindow();
      if (mayaBlobWindow) mayaBlobWindow.hide();
    } else {
      minimizeMayaToBob();
    }
  });

  // Open Maya from blob click - activates listening mode
  ipcMain.handle('open-maya-from-blob', () => {
    createMayaPIPWindow();
    // Widget will auto-start listening mode
  });

  // Minimize Maya to blob
  ipcMain.handle('minimize-maya-to-blob', () => {
    minimizeMayaToBob();
  });

  // Dot matrix overlay for screen analysis
  ipcMain.handle('show-dot-matrix', () => {
    showDotMatrix();
  });

  ipcMain.handle('hide-dot-matrix', () => {
    hideDotMatrix();
  });

  // Maya widget controls
  ipcMain.handle('maya-close-widget', () => {
    if (mayaWidgetWindow) {
      mayaWidgetWindow.hide();
      if (mayaBlobWindow) mayaBlobWindow.show();
    }
  });

  ipcMain.handle('maya-minimize-widget', () => {
    minimizeMayaToBob();
  });

  ipcMain.handle('maya-capture-screen', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  });

  ipcMain.handle('maya-notification', (event, { title, body }) => {
    sendNotification(title, body);
  });

  ipcMain.handle('maya-get-credentials', () => {
    return {
      token: authToken || store.get('authToken'),
      userId: currentUser?.id || store.get('userId')
    };
  });

  // Set auth from web app
  ipcMain.handle('set-auth', (event, { token, user }) => {
    setAuth(token, user);
  });

  // Send push notification from web app
  ipcMain.handle('send-notification', (event, { title, body }) => {
    sendNotification(title, body);
  });

  // Get app info
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch
    };
  });
}

// App lifecycle
app.whenReady().then(async () => {
  console.log('[Talio] App starting...');

  // NOTE: Permissions are now requested AFTER user logs in, not on app startup
  // The web app will call 'request-all-permissions' IPC handler after login

  // Setup auto-launch
  if (store.get('autoLaunch')) {
    autoLauncher.enable();
  }

  // Load stored auth
  const storedToken = store.get('authToken');
  if (storedToken) {
    authToken = storedToken;
    console.log('[Talio] Loaded stored auth token');
  }

  // Create windows and tray
  createMainWindow();
  createTray();
  setupIPC();

  // Initialize activity tracking (will start when auth is confirmed)
  await initializeActivityTracking();

  // Create Maya blob after short delay - always visible
  setTimeout(() => {
    createMayaBlobWindow();
    // Blob is always visible (unless widget is open)
  }, 2000);

  console.log('[Talio] App ready');
});

app.on('window-all-closed', () => {
  // Keep app running in background on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  clearMayaInactivityTimer();
});
