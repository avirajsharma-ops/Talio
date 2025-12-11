const { app, BrowserWindow, systemPreferences, ipcMain, screen, Tray, Menu, nativeImage, Notification, desktopCapturer, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const { io } = require('socket.io-client');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Set app name to Talio (removes Electron branding from About panel, Dock, etc.)
app.setName('Talio');

// Set About panel options for macOS - this replaces Electron branding
app.setAboutPanelOptions({
  applicationName: 'Talio',
  applicationVersion: '1.0.9',
  version: '1.0.9',
  copyright: '© 2025 Talio. All rights reserved.',
  credits: 'HR that runs itself.',
  iconPath: path.join(__dirname, '../assets/icon.png')
});

// Auto-launch - wrap in try-catch as it can fail on some systems
let AutoLaunch = null;
try {
  AutoLaunch = require('auto-launch');
} catch (err) {
  console.log('[Talio] auto-launch module not available:', err.message);
}

// IMPORTANT: Always use app.talio.in - DO NOT change this
const APP_URL = process.env.APP_SERVER_URL || 'https://app.talio.in';
const SOCKET_PATH = process.env.SOCKET_IO_PATH || '/api/socketio';

// MAYA uses server-side Gemini API - no local AI keys needed
// All AI processing happens at APP_URL/api/maya/chat

// Initialize store for app settings AND local productivity data
const store = new Store({
  defaults: {
    autoLaunch: true,
    showMayaPIP: false,
    pipPosition: { x: null, y: null },
    blobPosition: { x: null, y: null },
    authToken: null,
    userId: null,
    screenshotInterval: 60 * 1000, // 1 minute default
    // Local productivity data storage
    pendingProductivityData: [],
    lastSyncTimestamp: null,
    instantFetchPending: false,
    instantFetchRequestId: null
  }
});

// Force update any cached wrong URL
store.delete('serverUrl');

// Track permission states - cached to avoid repeated prompts
let accessibilityGranted = false;
let screenPermissionChecked = false;
let screenPermissionGranted = false;

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
let websiteBuffer = [];
let mouseActivityBuffer = { clicks: 0, scrollDistance: 0, movementDistance: 0 };
let currentActiveApp = { name: '', title: '', startTime: null };
let lastActiveWindow = null;
let screenshotTimer = null;
let screenshotStartupTimer = null; // Timer for initial minute-boundary wait
let activitySyncTimer = null;
let periodicSyncTimer = null;
let keyListener = null;
let activeWin = null;
let periodStartTime = null;

// Socket.IO connection (for real-time instant fetch requests)
let socket = null;

// Activity tracking intervals
const SCREENSHOT_INTERVAL = store.get('screenshotInterval') || 60 * 1000; // 1 minute default
const ACTIVITY_SYNC_INTERVAL = 60 * 1000; // 1 minute for local buffer
const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes for API sync
const APP_CHECK_INTERVAL = 3000; // 3 seconds
const INSTANT_FETCH_POLL_INTERVAL = 5000; // 5 seconds

// Auto-launch configuration - only create if module is available
let autoLauncher = null;
if (AutoLaunch) {
  try {
    autoLauncher = new AutoLaunch({
      name: 'Talio HRMS',
      path: app.getPath('exe')
    });
  } catch (err) {
    console.log('[Talio] Failed to create auto-launcher:', err.message);
  }
}

// Check screen recording permission - caches result to avoid repeated checks
// Only checks once per app session, unless permission was previously denied
function checkScreenCapturePermission() {
  if (process.platform === 'darwin') {
    // If already granted in this session, don't check again
    if (screenPermissionChecked && screenPermissionGranted) {
      return true;
    }
    
    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log('[Talio] Screen capture permission status:', status);
    
    screenPermissionChecked = true;
    screenPermissionGranted = status === 'granted';
    
    return screenPermissionGranted;
  }
  // Windows/Linux always has permission
  screenPermissionGranted = true;
  screenPermissionChecked = true;
  return true;
}

// Request all required permissions on macOS
// This should be called on app startup to ensure permissions are available
async function requestAllPermissions() {
  if (process.platform !== 'darwin') {
    console.log('[Talio] Permissions: Not on macOS, skipping permission requests');
    return { camera: true, microphone: true, screen: true, accessibility: true, location: true };
  }

  console.log('[Talio] Requesting all permissions...');
  const results = { camera: false, microphone: false, screen: false, accessibility: false, location: false };

  // Check accessibility permission first (needed for floating windows)
  try {
    const isAccessibilityTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    console.log('[Talio] Accessibility permission status:', isAccessibilityTrusted ? 'granted' : 'not granted');
    results.accessibility = isAccessibilityTrusted;
    
    if (!isAccessibilityTrusted) {
      console.log('[Talio] Prompting for accessibility permission...');
      // This will show the system dialog asking for permission
      systemPreferences.isTrustedAccessibilityClient(true);
    }
  } catch (error) {
    console.error('[Talio] Error checking accessibility permission:', error);
  }

  // Check and request camera permission
  try {
    const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
    console.log('[Talio] Camera permission status:', cameraStatus);
    if (cameraStatus === 'not-determined') {
      results.camera = await systemPreferences.askForMediaAccess('camera');
      console.log('[Talio] Camera permission requested:', results.camera ? 'granted' : 'denied');
    } else {
      results.camera = cameraStatus === 'granted';
    }
  } catch (error) {
    console.error('[Talio] Error requesting camera permission:', error);
  }

  // Check and request microphone permission
  try {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    console.log('[Talio] Microphone permission status:', micStatus);
    if (micStatus === 'not-determined') {
      results.microphone = await systemPreferences.askForMediaAccess('microphone');
      console.log('[Talio] Microphone permission requested:', results.microphone ? 'granted' : 'denied');
    } else {
      results.microphone = micStatus === 'granted';
    }
  } catch (error) {
    console.error('[Talio] Error requesting microphone permission:', error);
  }

  // Check and trigger screen recording permission
  // On macOS, we MUST attempt a screen capture to trigger the permission dialog
  try {
    const screenStatus = systemPreferences.getMediaAccessStatus('screen');
    console.log('[Talio] Screen recording permission status:', screenStatus);
    results.screen = screenStatus === 'granted';
    
    // If screen permission not granted, trigger the permission dialog by attempting capture
    if (!results.screen) {
      console.log('[Talio] Screen recording permission not granted. Triggering capture to prompt...');
      try {
        // Attempt to get screen sources - this triggers the macOS permission dialog
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { width: 1, height: 1 } 
        });
        console.log('[Talio] Screen capture sources retrieved:', sources.length);
        // Check again after attempting capture
        const newScreenStatus = systemPreferences.getMediaAccessStatus('screen');
        results.screen = newScreenStatus === 'granted';
        console.log('[Talio] Screen recording permission after trigger:', results.screen ? 'granted' : 'still not granted');
        
        // If still not granted, open System Preferences
        if (!results.screen) {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        }
      } catch (captureError) {
        console.log('[Talio] Screen capture attempt triggered permission dialog');
        // Open System Preferences for screen recording
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
    }
  } catch (error) {
    console.error('[Talio] Error checking screen permission:', error);
  }

  // Request location permission
  try {
    console.log('[Talio] Requesting location permission...');
    // Location permission is handled differently - we request via the main window
    // The actual request happens when the web content requests geolocation
    results.location = true; // Will be requested when needed by web content
  } catch (error) {
    console.error('[Talio] Error requesting location permission:', error);
  }

  console.log('[Talio] Permission results:', results);
  return results;
}

// IPC handler for requesting permissions from renderer
ipcMain.handle('request-all-permissions', async () => {
  return await requestAllPermissions();
});

// IPC handler for checking permission status
ipcMain.handle('check-permissions', async () => {
  if (process.platform !== 'darwin') {
    return { camera: true, microphone: true, screen: true };
  }
  
  return {
    camera: systemPreferences.getMediaAccessStatus('camera') === 'granted',
    microphone: systemPreferences.getMediaAccessStatus('microphone') === 'granted',
    screen: systemPreferences.getMediaAccessStatus('screen') === 'granted'
  };
});

// Create the main application window
function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Platform-specific window options
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';
  
  const windowOptions = {
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 1024,
    minHeight: 768,
    title: 'Talio',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
      webSecurity: true
    },
    backgroundColor: '#f8fafc',
    show: false
  };
  
  // macOS: Use hidden inset title bar with traffic lights positioned properly
  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 12, y: 12 };
  }
  
  // Windows: Use frameless window with custom title bar overlay (removes File, Edit, View menu)
  if (isWindows) {
    windowOptions.frame = false;
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.titleBarOverlay = {
      color: '#ffffff',
      symbolColor: '#374151',
      height: 32
    };
  }

  mainWindow = new BrowserWindow(windowOptions);
  
  // Remove menu bar on Windows to hide File, Edit, View menus
  if (isWindows) {
    mainWindow.setMenu(null);
    Menu.setApplicationMenu(null);
  }

  // Load the Talio web app - ALWAYS use APP_URL
  mainWindow.loadURL(APP_URL);

  // Inject CSS for title bar spacing when content loads
  mainWindow.webContents.on('did-finish-load', () => {
    if (isMac) {
      // macOS: Add padding for the hidden inset title bar (traffic lights)
      mainWindow.webContents.insertCSS(`
        :root {
          --talio-titlebar-height: 28px;
        }
        
        /* Title bar drag region - only on left side for traffic lights */
        body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--talio-titlebar-height);
          -webkit-app-region: drag;
          z-index: 9998;
          pointer-events: none;
        }
        
        /* Body needs padding to account for title bar */
        body {
          padding-top: var(--talio-titlebar-height) !important;
          height: 100vh !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        /* Fix h-screen to fit within the padded body */
        .h-screen {
          height: 100% !important;
          max-height: 100% !important;
        }
        
        /* Ensure root container fills the space */
        body > div:first-child {
          height: 100% !important;
        }
        
        /* Ensure buttons and interactive elements are clickable */
        button, a, input, select, [role="button"] {
          -webkit-app-region: no-drag;
        }
      `);
    } else if (isWindows) {
      // Windows: Add padding for the custom title bar overlay
      mainWindow.webContents.insertCSS(`
        :root {
          --talio-titlebar-height: 32px;
        }
        
        /* Title bar drag region */
        body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          right: 140px; /* Leave space for window controls */
          height: var(--talio-titlebar-height);
          -webkit-app-region: drag;
          z-index: 9998;
          pointer-events: none;
        }
        
        /* Body needs padding to account for title bar */
        body {
          padding-top: var(--talio-titlebar-height) !important;
          height: 100vh !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        /* Fix h-screen to fit within the padded body */
        .h-screen {
          height: 100% !important;
          max-height: 100% !important;
        }
        
        /* Ensure root container fills the space */
        body > div:first-child {
          height: 100% !important;
        }
        
        /* Ensure buttons and interactive elements are clickable */
        button, a, input, select, [role="button"] {
          -webkit-app-region: no-drag;
        }
      `);
    } else {
      // Linux: Just ensure proper overflow handling
      mainWindow.webContents.insertCSS(`
        body {
          height: 100vh !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        .h-screen {
          height: 100% !important;
          max-height: 100% !important;
        }
        
        body > div:first-child {
          height: 100% !important;
        }
      `);
    }
  });

  // Prevent any external popups (blocks Electron website and other external links)
  // But open Google OAuth in external browser for proper account selection
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open Google OAuth in external browser
    if (url.includes('accounts.google.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Open external links in default browser instead of new Electron window
    if (url.startsWith('http') && !url.includes('app.talio.in') && !url.includes('talio.in')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Allow same-origin popups but deny everything else
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  
  // Intercept navigation to Google OAuth and open in external browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.includes('accounts.google.com')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle media permission requests (camera, microphone, screen share) for meetings
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'pointerLock', 'display-capture'];
    
    console.log(`[Talio] Permission requested: ${permission}`);
    
    if (allowedPermissions.includes(permission)) {
      // For macOS, we need to request system permission for camera/microphone
      if (process.platform === 'darwin' && permission === 'media') {
        // Request camera access
        systemPreferences.askForMediaAccess('camera').then(cameraGranted => {
          console.log(`[Talio] Camera access: ${cameraGranted ? 'granted' : 'denied'}`);
          // Request microphone access
          systemPreferences.askForMediaAccess('microphone').then(micGranted => {
            console.log(`[Talio] Microphone access: ${micGranted ? 'granted' : 'denied'}`);
            callback(cameraGranted || micGranted);
          });
        });
      } else {
        callback(true);
      }
    } else {
      console.log(`[Talio] Permission denied: ${permission}`);
      callback(false);
    }
  });

  // Handle permission check requests
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'pointerLock', 'display-capture'];
    return allowedPermissions.includes(permission);
  });

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
  if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
    console.log('[Talio] Maya blob window already exists, showing it');
    mayaBlobWindow.show();
    return;
  }

  console.log('[Talio] Creating Maya blob window');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedPosition = store.get('blobPosition');
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  const blobSize = 120;
  
  // Position at bottom-right corner with comfortable margin
  // 20px from right edge, 100px from bottom to be above dock/taskbar and clearly visible
  const defaultX = width - blobSize - 20;
  const defaultY = height - blobSize - (isMac ? 100 : 60);

  const blobOptions = {
    width: blobSize,
    height: blobSize,
    x: savedPosition.x ?? defaultX,
    y: savedPosition.y ?? defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../maya-preload.js'),
      webSecurity: true
    },
    show: false
  };
  
  // Platform-specific window type
  if (isMac) {
    blobOptions.type = 'panel';
    blobOptions.vibrancy = 'under-window';
  }
  // Windows doesn't need a special type - frameless + alwaysOnTop + skipTaskbar works

  mayaBlobWindow = new BrowserWindow(blobOptions);
  
  // Windows-specific: Set always on top with higher level
  if (isWindows) {
    mayaBlobWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  const blobUrl = `${APP_URL}/maya/blob.html`;
  console.log('[Talio] Loading Maya blob from:', blobUrl);
  
  // Load Maya blob HTML from server for easy updates
  mayaBlobWindow.loadURL(blobUrl);

  mayaBlobWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Talio] Maya blob failed to load:', errorCode, errorDescription);
    // Try loading a simple inline blob as fallback
    console.log('[Talio] Loading fallback Maya blob...');
    mayaBlobWindow.loadURL(`data:text/html,
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 120px; height: 120px; overflow: hidden; background: transparent !important; }
          .maya-shell { position: fixed; width: 120px; height: 120px; display: grid; place-items: center; -webkit-app-region: drag; cursor: move; }
          .maya-btn { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, %234dff9d 0%25, %2300c896 50%25, %238b5dff 100%25); cursor: pointer; -webkit-app-region: no-drag; border: none; box-shadow: 0 8px 32px rgba(77, 255, 163, 0.4); transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; }
          .maya-btn:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(77, 255, 163, 0.6); }
          .maya-btn:active { transform: scale(0.95); }
          .maya-text { color: white; font-weight: bold; font-size: 14px; font-family: system-ui, sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        </style>
      </head>
      <body>
        <div class="maya-shell">
          <button class="maya-btn" onclick="window.talioDesktop?.openMayaFromBlob()" title="Open MAYA">
            <span class="maya-text">MAYA</span>
          </button>
        </div>
      </body>
      </html>
    `);
  });

  mayaBlobWindow.webContents.on('did-finish-load', () => {
    console.log('[Talio] Maya blob loaded successfully');
    // Ensure window is visible on all spaces/desktops
    if (process.platform === 'darwin') {
      mayaBlobWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mayaBlobWindow.setAlwaysOnTop(true, 'floating', 1);
    } else if (process.platform === 'win32') {
      // Windows: Ensure always on top works properly
      mayaBlobWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  mayaBlobWindow.once('ready-to-show', () => {
    console.log('[Talio] Maya blob ready to show');
    mayaBlobWindow.show();
    // Set window level after showing
    if (process.platform === 'darwin') {
      mayaBlobWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mayaBlobWindow.setAlwaysOnTop(true, 'floating', 1);
    } else if (process.platform === 'win32') {
      // Windows: Ensure blob stays on top even when switching windows
      mayaBlobWindow.setAlwaysOnTop(true, 'screen-saver');
      // Focus back to prevent blob from disappearing
      setTimeout(() => {
        if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
          mayaBlobWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }, 500);
    }
  });

  // Save position when moved
  mayaBlobWindow.on('moved', () => {
    const bounds = mayaBlobWindow.getBounds();
    store.set('blobPosition', { x: bounds.x, y: bounds.y });
  });
  
  // Windows: Keep blob visible when it loses focus (when switching windows)
  if (process.platform === 'win32') {
    mayaBlobWindow.on('blur', () => {
      // Re-assert always on top after a short delay
      setTimeout(() => {
        if (mayaBlobWindow && !mayaBlobWindow.isDestroyed() && mayaBlobWindow.isVisible()) {
          mayaBlobWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }, 100);
    });
  }

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

  // NOTE: We only need screen recording permission for screenshots
  // Mic/camera/accessibility permissions are NOT needed for basic Maya functionality

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const widgetWidth = 400;
  const widgetHeight = 550;
  
  // Position widget relative to blob if blob exists
  let widgetX, widgetY;
  if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
    const blobBounds = mayaBlobWindow.getBounds();
    // Try to position to the left of blob
    widgetX = blobBounds.x - widgetWidth - 10;
    widgetY = blobBounds.y;
    
    // If widget would go off left edge, position to the right of blob
    if (widgetX < 0) {
      widgetX = blobBounds.x + blobBounds.width + 10;
    }
    // If widget would go off right edge, position inside screen
    if (widgetX + widgetWidth > width) {
      widgetX = width - widgetWidth - 20;
    }
    // Keep widget within vertical bounds
    if (widgetY + widgetHeight > height) {
      widgetY = height - widgetHeight - 20;
    }
    if (widgetY < 0) {
      widgetY = 20;
    }
  } else {
    const savedPosition = store.get('pipPosition');
    widgetX = savedPosition.x ?? width - widgetWidth - 20;
    widgetY = savedPosition.y ?? height - widgetHeight - 80;
  }

  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  const widgetOptions = {
    width: widgetWidth,
    height: widgetHeight,
    x: widgetX,
    y: widgetY,
    frame: false,
    roundedCorners: true,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    skipTaskbar: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../maya-preload.js')
    },
    show: false
  };
  
  // Platform-specific options
  if (isMac) {
    widgetOptions.vibrancy = 'under-window';
    widgetOptions.visualEffectState = 'active';
  }
  // Windows doesn't need special type - frameless + alwaysOnTop works

  mayaWidgetWindow = new BrowserWindow(widgetOptions);
  
  // Windows-specific: Set always on top with higher level
  if (isWindows) {
    mayaWidgetWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  // Load native Maya widget HTML from server for easy updates
  mayaWidgetWindow.loadURL(`${APP_URL}/maya/widget.html`);

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
    // Windows: Ensure widget stays on top
    if (process.platform === 'win32') {
      mayaWidgetWindow.setAlwaysOnTop(true, 'screen-saver');
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
    // Windows: Re-assert always on top when widget gets focus
    if (process.platform === 'win32' && mayaWidgetWindow && !mayaWidgetWindow.isDestroyed()) {
      mayaWidgetWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });
  
  // Windows: Keep widget visible when it loses focus
  if (process.platform === 'win32') {
    mayaWidgetWindow.on('blur', () => {
      setTimeout(() => {
        if (mayaWidgetWindow && !mayaWidgetWindow.isDestroyed() && mayaWidgetWindow.isVisible()) {
          mayaWidgetWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }, 100);
    });
  }

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

// Minimize Maya widget to blob - disabled, Maya floating windows removed
function minimizeMayaToBob() {
  // Maya floating windows have been disabled
  // AI features are available in-app only
}

// ============= ACTIVITY TRACKING =============

// Check if accessibility permission is granted (without prompting)
// NOTE: This is OPTIONAL - only used for advanced app tracking features
// Basic screenshot functionality works WITHOUT accessibility permission
function checkAccessibilityPermission() {
  if (process.platform !== 'darwin') {
    return true; // Not needed on Windows/Linux
  }
  
  try {
    // Check WITHOUT prompting (pass false) - NEVER prompt for accessibility
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    accessibilityGranted = isTrusted;
    // Don't log this to avoid confusion - it's optional
    return isTrusted;
  } catch (err) {
    return false;
  }
}

// NOTE: We no longer prompt for accessibility permission
// It's optional and only enables advanced app tracking
// Screenshot functionality works without it

// Initialize activity tracking modules
async function initializeActivityTracking() {
  // Initialize period start time
  periodStartTime = Date.now();
  
  // First check if accessibility is already granted (without prompting)
  const hasAccessibility = checkAccessibilityPermission();
  
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

  // Only initialize active-win if accessibility is already granted
  // This prevents the repeated permission popup
  if (hasAccessibility) {
    try {
      activeWin = await import('active-win');
      startAppTracking();
      console.log('[Talio] App tracking initialized');
    } catch (err) {
      console.log('[Talio] Active window tracking not available:', err.message);
    }
  } else {
    console.log('[Talio] Skipping app tracking - accessibility permission not granted');
    // We'll prompt once when user requests permissions
  }
}

// Record keystroke (count only, not content)
function recordKeystroke() {
  const now = new Date();
  const hourKey = now.getHours();

  // Find or create hourly entry
  const existing = keystrokeBuffer.find(k => k.hour === hourKey);
  if (existing) {
    existing.count++;
  } else {
    keystrokeBuffer.push({ hour: hourKey, count: 1 });
  }

  // Keep buffer size manageable
  if (keystrokeBuffer.length > 24) {
    keystrokeBuffer = keystrokeBuffer.slice(-24);
  }
}

// Track active application with enhanced data
function startAppTracking() {
  setInterval(async () => {
    // Skip if no auth, no activeWin module, or no accessibility permission
    if (!authToken || !activeWin || !accessibilityGranted) return;

    try {
      const win = await (activeWin.default || activeWin)();
      if (win) {
        const now = Date.now();
        const appName = win.owner?.name || 'Unknown';
        const windowTitle = win.title || '';

        // Check if this is a browser with URL
        const browserApps = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Brave Browser', 'Arc'];
        const isBrowser = browserApps.some(b => appName.includes(b));

        if (currentActiveApp.name !== appName || currentActiveApp.title !== windowTitle) {
          // App/window changed - save previous
          if (currentActiveApp.name && currentActiveApp.startTime) {
            const duration = now - currentActiveApp.startTime;
            
            appUsageBuffer.push({
              appName: currentActiveApp.name,
              windowTitle: currentActiveApp.title,
              duration: duration,
              startTime: new Date(currentActiveApp.startTime).toISOString(),
              endTime: new Date(now).toISOString()
            });

            // If previous was a browser, try to extract URL from title
            if (currentActiveApp.isBrowser && currentActiveApp.title) {
              const domain = extractDomainFromTitle(currentActiveApp.title);
              if (domain) {
                websiteBuffer.push({
                  url: `https://${domain}`,
                  title: currentActiveApp.title,
                  domain: domain,
                  duration: duration,
                  visitTime: new Date(currentActiveApp.startTime).toISOString()
                });
              }
            }
          }

          // Start tracking new app
          currentActiveApp = {
            name: appName,
            title: windowTitle,
            startTime: now,
            isBrowser: isBrowser
          };
        }

        // Keep buffers manageable
        if (appUsageBuffer.length > 200) {
          appUsageBuffer = appUsageBuffer.slice(-200);
        }
        if (websiteBuffer.length > 100) {
          websiteBuffer = websiteBuffer.slice(-100);
        }
      }
    } catch (err) {
      // Ignore errors silently
    }
  }, APP_CHECK_INTERVAL);
}

// Extract domain from browser title (e.g., "GitHub - main.js" -> "github.com")
function extractDomainFromTitle(title) {
  if (!title) return null;
  
  // Common patterns: "Title - Domain" or "Domain - Title"
  const domainPatterns = [
    /github\.com/i, /gitlab\.com/i, /stackoverflow\.com/i,
    /google\.com/i, /youtube\.com/i, /facebook\.com/i,
    /twitter\.com/i, /linkedin\.com/i, /reddit\.com/i,
    /slack\.com/i, /notion\.so/i, /figma\.com/i,
    /vercel\.com/i, /netlify\.com/i, /aws\.amazon\.com/i,
    /docs\.google\.com/i, /drive\.google\.com/i
  ];
  
  for (const pattern of domainPatterns) {
    const match = title.match(pattern);
    if (match) return match[0].toLowerCase();
  }
  
  // Try to extract from title format "Page Title - Site Name"
  const parts = title.split(/\s[-–|]\s/);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].toLowerCase().trim();
    if (lastPart.includes('.') && !lastPart.includes(' ')) {
      return lastPart;
    }
  }
  
  return null;
}

// PRECISE SCREENSHOT TIMING SYSTEM
// Screenshots are triggered exactly every 60 seconds from authentication time
// This ensures strict compliance with 1-minute interval policy
let screenshotAuthTime = null; // Time when auth was set (check-in time)
let preciseScreenshotTimer = null;

// Track last capture to prevent duplicates
let lastCaptureTimestamp = 0;

// Start periodic screenshot and data sync - PRECISE 60-second intervals
// Screenshots are taken exactly every 60 seconds from the moment monitoring starts
// This runs in background even when window is hidden
function startScreenMonitoring() {
  if (screenshotTimer || screenshotStartupTimer || preciseScreenshotTimer) return;

  console.log('[Talio] 🚀 Starting PRECISE screen monitoring (strict 60-second intervals)');
  
  // Record when monitoring started (this is effectively check-in time for the desktop app)
  screenshotAuthTime = Date.now();
  console.log(`[Talio] Screenshot baseline time set: ${new Date(screenshotAuthTime).toLocaleTimeString()}`);

  // Capture function with strict timing
  const captureScreenshot = async () => {
    if (!authToken) {
      console.log('[Talio] Skipping capture - not authenticated');
      return;
    }

    // Prevent duplicate captures (must be at least 55 seconds since last capture)
    const timeSinceLastCapture = Date.now() - lastCaptureTimestamp;
    if (timeSinceLastCapture < 55000) {
      console.log(`[Talio] Skipping duplicate capture (${Math.round(timeSinceLastCapture/1000)}s since last)`);
      return;
    }
    
    lastCaptureTimestamp = Date.now();
    
    const now = new Date();
    const elapsedSinceAuth = screenshotAuthTime ? Math.round((Date.now() - screenshotAuthTime) / 1000) : 0;
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
    console.log(`[Talio] 📸 Screenshot #${Math.ceil(elapsedSinceAuth / 60)} at ${timestamp} (${elapsedSinceAuth}s since start)`);
    
    try {
      await captureAndSyncProductivity(false);
    } catch (err) {
      console.error('[Talio] Capture failed:', err.message);
    }
  };

  // Take first screenshot immediately
  captureScreenshot();
  
  // Set up precise 60-second interval using setInterval
  // setInterval is sufficient for 60-second precision on desktop
  preciseScreenshotTimer = setInterval(() => {
    captureScreenshot();
  }, 60 * 1000); // Exactly 60,000 milliseconds
  
  console.log('[Talio] ✅ Screen monitoring active (screenshot every 60 seconds exactly)');
}

// Sync all productivity data to server via API
async function syncProductivityData(screenshot = null, isInstantCapture = false, instantRequestId = null) {
  if (!authToken) {
    console.log('[Talio] Skipping sync - not authenticated');
    return { success: false, error: 'Not authenticated' };
  }

  const now = Date.now();
  const totalKeystrokes = keystrokeBuffer.reduce((sum, k) => sum + k.count, 0);
  const periodDuration = now - (periodStartTime || now);
  const avgKeystrokesPerMin = periodDuration > 0 ? Math.round(totalKeystrokes / (periodDuration / 60000)) : 0;

  const payload = {
    screenshot: screenshot,
    appUsage: appUsageBuffer.map(app => ({
      appName: app.appName,
      windowTitle: app.windowTitle,
      duration: app.duration,
      startTime: app.startTime,
      endTime: app.endTime
    })),
    websiteVisits: websiteBuffer.map(site => ({
      url: site.url,
      title: site.title,
      domain: site.domain,
      duration: site.duration,
      visitTime: new Date(currentActiveApp.startTime).toISOString()
    })),
    keystrokes: {
      totalCount: totalKeystrokes,
      hourlyBreakdown: keystrokeBuffer,
      averagePerMinute: avgKeystrokesPerMin
    },
    mouseActivity: mouseActivityBuffer,
    periodStart: periodStartTime ? new Date(periodStartTime).toISOString() : new Date(now - 5 * 60 * 1000).toISOString(),
    periodEnd: new Date(now).toISOString(),
    deviceInfo: {
      platform: process.platform,
      hostname: os.hostname(),
      osVersion: os.release()
    },
    isInstantCapture: isInstantCapture,
    instantRequestId: instantRequestId
  };

  console.log(`[Talio] Syncing productivity data: ${appUsageBuffer.length} apps, ${websiteBuffer.length} sites, ${totalKeystrokes} keystrokes`);

  try {
    const response = await axios.post(`${APP_URL}/api/productivity/sync`, payload, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });

    if (response.data.success) {
      console.log('[Talio] ✅ Productivity data synced successfully:', response.data.data);
      
      // Clear buffers after successful sync
      appUsageBuffer = [];
      websiteBuffer = [];
      keystrokeBuffer = [];
      mouseActivityBuffer = { clicks: 0, scrollDistance: 0, movementDistance: 0 };
      periodStartTime = Date.now();
      
      return { success: true, data: response.data.data };
    } else {
      console.error('[Talio] Sync failed:', response.data.error);
      // Store locally for retry
      storeProductivityDataLocally(payload);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error('[Talio] Sync error:', error.message);
    // Store locally for retry
    storeProductivityDataLocally(payload);
    return { success: false, error: error.message };
  }
}

// Store productivity data locally for later sync
function storeProductivityDataLocally(data) {
  try {
    const pending = store.get('pendingProductivityData') || [];
    pending.push({
      ...data,
      storedAt: new Date().toISOString()
    });
    
    // Keep only last 50 pending syncs to avoid storage bloat
    if (pending.length > 50) {
      pending.splice(0, pending.length - 50);
    }
    
    store.set('pendingProductivityData', pending);
    console.log(`[Talio] Stored data locally for retry (${pending.length} pending)`);
  } catch (err) {
    console.error('[Talio] Failed to store data locally:', err.message);
  }
}

// Retry syncing locally stored data
async function retryPendingSync() {
  if (!authToken) return;
  
  const pending = store.get('pendingProductivityData') || [];
  if (pending.length === 0) return;
  
  console.log(`[Talio] Retrying ${pending.length} pending syncs...`);
  
  const stillPending = [];
  
  for (const data of pending) {
    try {
      const response = await axios.post(`${APP_URL}/api/productivity/sync`, {
        ...data,
        isBackfill: true
      }, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (!response.data.success) {
        stillPending.push(data);
      }
    } catch (err) {
      stillPending.push(data);
    }
  }
  
  store.set('pendingProductivityData', stillPending);
  
  if (stillPending.length < pending.length) {
    console.log(`[Talio] Retry complete: ${pending.length - stillPending.length} synced, ${stillPending.length} still pending`);
  }
}

// Start activity sync interval (now retries pending data)
function startActivitySync() {
  if (activitySyncTimer) return;
  
  // Retry pending syncs periodically
  activitySyncTimer = setInterval(() => {
    retryPendingSync();
  }, PERIODIC_SYNC_INTERVAL);
  
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
  console.log('[Talio] Setting auth - user:', user?.id);
  authToken = token;
  currentUser = user;
  store.set('authToken', token);
  store.set('userId', user?.id);

  // Start monitoring when authenticated
  if (token && user?.id) {
    console.log('[Talio] Starting monitoring services...');
    
    // Clear old cached screenshot interval to force fresh fetch from server
    store.delete('screenshotInterval');
    global.SCREENSHOT_INTERVAL = 60 * 1000; // Reset to 1 minute default
    
    // Initialize socket for real-time capture requests (best effort)
    initializeSocketConnection(user.id);
    
    // Start instant fetch polling as backup to Socket.IO
    startInstantFetchPolling();
    
    // Start activity tracking and sync
    startScreenMonitoring();
    startActivitySync();
    fetchScreenshotInterval(); // This will update interval from server
    
    // Initialize period tracking
    periodStartTime = Date.now();
    
    // Show notification
    sendNotification('Talio Active', 'Activity monitoring is now running');
  } else if (!token) {
    // User logged out - stop monitoring
    console.log('[Talio] Auth cleared - stopping monitoring');
    if (screenshotStartupTimer) {
      clearTimeout(screenshotStartupTimer);
      screenshotStartupTimer = null;
    }
    if (screenshotTimer) {
      clearInterval(screenshotTimer);
      screenshotTimer = null;
    }
    if (preciseScreenshotTimer) {
      clearInterval(preciseScreenshotTimer);
      preciseScreenshotTimer = null;
    }
    if (activitySyncTimer) {
      clearInterval(activitySyncTimer);
      activitySyncTimer = null;
    }
    // Reset screenshot timing
    screenshotAuthTime = null;
    lastCaptureTimestamp = 0;
    
    stopInstantFetchPolling();
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  // Send to Maya widget
  if (mayaWidgetWindow) {
    mayaWidgetWindow.webContents.send('maya-auth', { token, user });
  }
}

// Initialize Socket.IO connection for real-time screen capture requests
function initializeSocketConnection(userId) {
  if (!userId) {
    console.log('[Talio] Cannot initialize socket - no userId');
    return;
  }
  
  // Disconnect existing socket if any
  if (socket) {
    console.log('[Talio] Disconnecting existing socket...');
    socket.disconnect();
    socket = null;
  }

  console.log('[Talio] Connecting to Socket.IO server at', APP_URL, 'for user:', userId);
  
  socket = io(APP_URL, {
    path: SOCKET_PATH,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    auth: {
      userId: userId,
      token: authToken
    }
  });

  socket.on('connect', () => {
    console.log('✅ [Talio] Socket.IO connected, socket ID:', socket.id);
    console.log('✅ [Talio] Registering desktop app for user:', userId);
    socket.emit('desktop-app-ready', { userId });
    // Join user-specific room for notifications
    socket.emit('join-user-room', userId);
  });

  socket.on('registration-confirmed', (data) => {
    console.log('✅ [Talio] Desktop app registration confirmed:', data);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ [Talio] Socket.IO disconnected, reason:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 [Talio] Socket.IO reconnected after ${attemptNumber} attempts`);
    socket.emit('desktop-app-ready', { userId });
  });

  // Listen for instant capture requests
  socket.on('instant-capture-request', async (data) => {
    console.log('📸 [Talio] Instant capture requested:', data);
    await handleInstantCapture(data);
  });

  // Listen for screenshot interval updates
  socket.on('screenshot-interval-updated', (data) => {
    console.log('⏱️ [Talio] Screenshot interval updated:', data);
    updateScreenshotInterval(data.interval);
  });

  // Listen for push notifications from server
  socket.on('notification', (data) => {
    console.log('🔔 [Talio] Push notification received:', data);
    sendNotification(data.title || 'Talio', data.body || data.message || '');
  });

  // Listen for new-message events (chat notifications)
  socket.on('new-message', (data) => {
    console.log('💬 [Talio] New message notification:', data);
    const senderName = data.senderName || data.sender?.name || 'Someone';
    const preview = data.content?.substring(0, 50) || 'New message';
    sendNotification(`Message from ${senderName}`, preview);
  });

  socket.on('error', (error) => {
    console.error('⚠️ [Talio] Socket.IO error:', error);
  });
}

// Fetch screenshot interval from server
async function fetchScreenshotInterval() {
  if (!authToken) return;

  try {
    const response = await axios.get(`${APP_URL}/api/productivity/screenshot-interval`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const interval = response.data.data.interval;
      updateScreenshotInterval(interval);
      console.log(`[Talio] Screenshot interval fetched: ${response.data.data.intervalMinutes} minutes`);
    }
  } catch (error) {
    console.error('[Talio] Failed to fetch screenshot interval:', error.message);
  }
}

// Update screenshot interval and restart monitoring
function updateScreenshotInterval(newInterval) {
  if (newInterval && newInterval > 0) {
    const oldInterval = SCREENSHOT_INTERVAL;
    
    // Update the interval (note: SCREENSHOT_INTERVAL is const, so we use a workaround)
    global.SCREENSHOT_INTERVAL = newInterval;
    store.set('screenshotInterval', newInterval);
    
    // Restart screenshot timer with new interval
    if (screenshotStartupTimer) {
      clearTimeout(screenshotStartupTimer);
      screenshotStartupTimer = null;
    }
    if (screenshotTimer) {
      clearInterval(screenshotTimer);
      screenshotTimer = null;
    }
    
    startScreenMonitoring();
    
    console.log(`[Talio] Screenshot interval updated from ${oldInterval / 60000} to ${newInterval / 60000} minutes`);
  }
}

// Hide Maya windows temporarily for screenshot
function hideMayaWindowsForCapture() {
  const wasWidgetVisible = mayaWidgetWindow && mayaWidgetWindow.isVisible();
  const wasBlobVisible = mayaBlobWindow && mayaBlobWindow.isVisible();
  
  if (mayaWidgetWindow && mayaWidgetWindow.isVisible()) {
    mayaWidgetWindow.setOpacity(0);
  }
  if (mayaBlobWindow && mayaBlobWindow.isVisible()) {
    mayaBlobWindow.setOpacity(0);
  }
  
  return { wasWidgetVisible, wasBlobVisible };
}

// Restore Maya windows after screenshot
function restoreMayaWindowsAfterCapture(state) {
  if (mayaWidgetWindow && state.wasWidgetVisible) {
    mayaWidgetWindow.setOpacity(1);
  }
  if (mayaBlobWindow && state.wasBlobVisible) {
    mayaBlobWindow.setOpacity(1);
  }
}

// Handle instant screenshot capture request (via Socket.IO or API polling)
async function handleInstantCapture(captureRequest) {
  console.log('📸 [Talio] Processing instant capture request:', captureRequest);
  
  if (!authToken) {
    console.error('[Talio] No auth token - cannot upload screenshot');
    notifyInstantCaptureResult(captureRequest.requestId, false, 'Not authenticated');
    return;
  }

  // Hide Maya windows so they don't appear in screenshot
  const mayaState = hideMayaWindowsForCapture();
  
  // Small delay to ensure windows are hidden before capture
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Ensure screen capture permission on macOS (uses cached result)
    const hasPermission = checkScreenCapturePermission();
    
    let screenshot = null;
    
    if (hasPermission) {
      // Capture screenshot using desktopCapturer
      console.log('[Talio] Capturing screen...');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length > 0) {
        screenshot = sources[0].thumbnail.toDataURL();
        console.log('[Talio] Screenshot captured, size:', Math.round(screenshot.length / 1024), 'KB');
      } else {
        console.log('[Talio] No screen sources available');
      }
    } else {
      console.log('[Talio] No screen permission - syncing data without screenshot');
    }

    // Restore Maya windows after capture
    restoreMayaWindowsAfterCapture(mayaState);
    
    // Sync ALL productivity data (with or without screenshot) via API
    console.log('[Talio] Syncing productivity data for instant capture...');
    const syncResult = await syncProductivityData(screenshot, true, captureRequest.requestId);

    if (syncResult.success) {
      console.log('✅ [Talio] Instant capture synced successfully');
      notifyInstantCaptureResult(captureRequest.requestId, true);
      sendNotification('Data Captured', 'Your productivity data has been synced');
    } else {
      console.log('⚠️ [Talio] Instant capture sync failed, data stored locally');
      notifyInstantCaptureResult(captureRequest.requestId, false, syncResult.error);
      sendNotification('Sync Pending', 'Data will be synced when connection is restored');
    }
  } catch (error) {
    console.error('❌ [Talio] Instant capture error:', error.message);
    restoreMayaWindowsAfterCapture(mayaState);
    notifyInstantCaptureResult(captureRequest.requestId, false, error.message);
    sendNotification('Capture Error', error.message);
  }
}

// Notify server about instant capture result
function notifyInstantCaptureResult(requestId, success, error = null) {
  if (socket && socket.connected) {
    socket.emit('instant-capture-complete', {
      requestId: requestId,
      timestamp: new Date().toISOString(),
      success: success,
      error: error
    });
  }
}

// Capture screenshot and sync all productivity data (periodic monitoring)
async function captureAndSyncProductivity(isInstant = false, instantRequestId = null) {
  if (!authToken) {
    console.log('[Talio] Skipping capture - not authenticated');
    return;
  }

  console.log('[Talio] Starting productivity capture...');

  // Hide Maya windows so they don't appear in screenshot
  const mayaState = hideMayaWindowsForCapture();
  await new Promise(resolve => setTimeout(resolve, 100));

  let screenshot = null;

  try {
    const hasPermission = checkScreenCapturePermission();
    
    if (hasPermission) {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length > 0) {
        screenshot = sources[0].thumbnail.toDataURL();
        console.log('[Talio] Screenshot captured, size:', Math.round(screenshot.length / 1024), 'KB');
      }
    }
    
    // Restore Maya windows after capture
    restoreMayaWindowsAfterCapture(mayaState);
    
    // Sync productivity data with or without screenshot
    const syncResult = await syncProductivityData(screenshot, isInstant, instantRequestId);
    
    if (syncResult.success) {
      console.log('[Talio] ✅ Productivity sync complete');
    } else {
      console.log('[Talio] ⚠️ Productivity sync failed, stored locally for retry');
    }
  } catch (error) {
    console.error('[Talio] Capture error:', error.message);
    restoreMayaWindowsAfterCapture(mayaState);
    
    // Still try to sync whatever data we have
    await syncProductivityData(null, isInstant, instantRequestId);
  }
}

// Legacy function for backwards compatibility
async function captureAndSummarize() {
  await captureAndSyncProductivity(false);
}

// Poll for instant fetch requests (fallback when Socket.IO is unreliable)
let instantFetchPoller = null;

function startInstantFetchPolling() {
  if (instantFetchPoller) return;
  
  instantFetchPoller = setInterval(async () => {
    if (!authToken || !currentUser?.id) return;
    
    try {
      const response = await axios.get(`${APP_URL}/api/productivity/instant-fetch/pending`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        timeout: 10000
      });
      
      if (response.data.success && response.data.pendingRequest) {
        console.log('[Talio] 📸 Found pending instant fetch request via polling');
        await handleInstantCapture(response.data.pendingRequest);
      }
    } catch (error) {
      // Silently ignore polling errors
    }
  }, INSTANT_FETCH_POLL_INTERVAL);
  
  console.log('[Talio] Instant fetch polling started');
}

function stopInstantFetchPolling() {
  if (instantFetchPoller) {
    clearInterval(instantFetchPoller);
    instantFetchPoller = null;
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
    { type: 'separator' },
    {
      label: 'Screen Capture Permission',
      click: async () => {
        await checkScreenCapturePermission(true); // Force prompt when user clicks this
      }
    },
    { type: 'separator' },
    {
      label: 'Start at Login',
      type: 'checkbox',
      checked: store.get('autoLaunch'),
      click: (menuItem) => {
        store.set('autoLaunch', menuItem.checked);
        if (autoLauncher) {
          if (menuItem.checked) {
            autoLauncher.enable();
          } else {
            autoLauncher.disable();
          }
        }
      }
    },
    {
      label: 'Reset Cache & Settings',
      click: () => {
        // Clear cached settings
        store.delete('screenshotInterval');
        store.delete('pendingProductivityData');
        store.delete('lastSyncTimestamp');
        store.delete('pipPosition');
        store.delete('blobPosition');
        
        // Reset global interval
        global.SCREENSHOT_INTERVAL = 60 * 1000; // 1 minute default
        
        // Restart monitoring with fresh settings
        if (screenshotStartupTimer) {
          clearTimeout(screenshotStartupTimer);
          screenshotStartupTimer = null;
        }
        if (screenshotTimer) {
          clearInterval(screenshotTimer);
          screenshotTimer = null;
        }
        if (preciseScreenshotTimer) {
          clearTimeout(preciseScreenshotTimer);
          preciseScreenshotTimer = null;
        }
        startScreenMonitoring();
        
        sendNotification('Settings Reset', 'Talio cache and settings have been cleared');
        console.log('[Talio] Cache and settings reset');
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
    return await checkScreenCapturePermission(true); // Force prompt when user explicitly requests
  });

  // Request all permissions at once (called after user logs in)
  // SIMPLIFIED: Only screen recording permission is needed for screenshots
  ipcMain.handle('request-all-permissions', async () => {
    console.log('[Talio] Checking screen recording permission...');
    const results = {
      screen: false
    };

    if (process.platform === 'darwin') {
      // Only check screen capture status - this is ALL we need for screenshots
      const screenStatus = systemPreferences.getMediaAccessStatus('screen');
      results.screen = screenStatus === 'granted';
      console.log('[Talio] Screen recording permission:', screenStatus);

      // NOTE: We do NOT prompt automatically on login
      // User will be prompted when they first try to capture screen
      // This avoids annoying permission dialogs on every app launch
    } else {
      // Windows - permissions are typically granted automatically
      results.screen = true;
    }

    console.log('[Talio] Permission results:', results);
    return results;
  });

  // Get all permission statuses - simplified to only what we need
  ipcMain.handle('get-permission-status', () => {
    if (process.platform === 'darwin') {
      return {
        screen: systemPreferences.getMediaAccessStatus('screen')
      };
    }
    return {
      screen: 'granted'
    };
  });

  // Maya floating windows disabled - these handlers are kept for compatibility but do nothing
  ipcMain.handle('toggle-maya-pip', () => {
    // Maya floating windows disabled - AI available in-app
    console.log('[Talio] Maya floating windows disabled');
  });

  ipcMain.handle('open-maya-from-blob', () => {
    // Maya floating windows disabled - AI available in-app
    console.log('[Talio] Maya floating windows disabled');
  });

  ipcMain.handle('minimize-maya-to-blob', () => {
    // Maya floating windows disabled
  });

  // Dot matrix overlay - kept for potential future use
  ipcMain.handle('show-dot-matrix', () => {
    showDotMatrix();
  });

  ipcMain.handle('hide-dot-matrix', () => {
    hideDotMatrix();
  });

  // Maya widget controls - disabled
  ipcMain.handle('maya-close-widget', () => {
    // Maya floating windows disabled
  });

  ipcMain.handle('maya-minimize-widget', () => {
    // Maya floating windows disabled
  });

  // Get Maya widget state - always return disabled state
  ipcMain.handle('maya-get-widget-state', () => {
    return {
      minimized: true,
      widgetVisible: false,
      blobVisible: false,
      disabled: true // New flag to indicate Maya floating windows are disabled
    };
  });

  // Request microphone permission (for voice features)
  ipcMain.handle('maya-request-mic-permission', async () => {
    if (process.platform === 'darwin') {
      try {
        const status = await systemPreferences.askForMediaAccess('microphone');
        console.log('[Maya] Microphone permission:', status ? 'granted' : 'denied');
        return status;
      } catch (err) {
        console.error('[Maya] Microphone permission error:', err);
        return false;
      }
    }
    return true; // Windows/Linux don't need explicit permission
  });

  // Maya screen capture with auto-hide widget for clean capture
  ipcMain.handle('maya-capture-screen', async () => {
    try {
      // Check permission first (uses cached result)
      const hasPermission = checkScreenCapturePermission();
      if (!hasPermission) {
        console.log('[Maya] Screen capture permission not granted');
        return null;
      }

      // Hide Maya widget and blob before capture for clean screenshot
      const wasWidgetVisible = mayaWidgetWindow && mayaWidgetWindow.isVisible();
      const wasBlobVisible = mayaBlobWindow && mayaBlobWindow.isVisible();
      
      if (wasWidgetVisible) {
        mayaWidgetWindow.hide();
      }
      if (wasBlobVisible) {
        mayaBlobWindow.hide();
      }
      
      // Small delay to ensure windows are hidden
      await new Promise(resolve => setTimeout(resolve, 150));

      // Capture the ENTIRE screen (not just app window)
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      let screenshot = null;
      if (sources.length > 0) {
        // Get the primary display's screen source
        const primaryDisplay = screen.getPrimaryDisplay();
        // Try to find the primary screen source, fallback to first
        const primarySource = sources.find(s => 
          s.display_id === String(primaryDisplay.id)
        ) || sources[0];
        
        screenshot = primarySource.thumbnail.toDataURL();
        console.log('[Maya] Screen captured successfully, size:', Math.round(screenshot.length / 1024), 'KB');
      }
      
      // Small delay before restoring windows
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Restore Maya widget after capture
      if (wasWidgetVisible && mayaWidgetWindow) {
        mayaWidgetWindow.show();
      } else if (wasBlobVisible && mayaBlobWindow) {
        mayaBlobWindow.show();
      }
      
      return screenshot;
    } catch (error) {
      console.error('[Maya] Screen capture error:', error);
      // Try to restore windows even on error
      if (mayaBlobWindow) mayaBlobWindow.show();
      return null;
    }
  });

  // Check screen permission without triggering capture (uses cached status)
  ipcMain.handle('maya-check-screen-permission', () => {
    return checkScreenCapturePermission();
  });

  // Sync speaking state between widget and blob
  ipcMain.handle('maya-set-speaking', (event, speaking) => {
    if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
      mayaBlobWindow.webContents.executeJavaScript(`
        if (window.setSpeaking) window.setSpeaking(${speaking});
      `).catch(() => {});
    }
  });

  ipcMain.handle('maya-notification', (event, { title, body }) => {
    sendNotification(title, body);
  });

  ipcMain.handle('maya-get-credentials', () => {
    return {
      token: authToken || store.get('authToken'),
      userId: currentUser?.id || store.get('userId'),
      // MAYA uses server-side Gemini API - no local AI config needed
      serverUrl: APP_URL
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

  // Open URL in external browser (for OAuth)
  ipcMain.handle('open-external', (event, url) => {
    console.log('[Talio] Opening external URL:', url);
    shell.openExternal(url);
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

// Register custom protocol for OAuth callback
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('talio', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('talio');
}

// Handle protocol URL on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('[Talio] Received protocol URL:', url);
  handleProtocolUrl(url);
});

// Handle protocol URL
function handleProtocolUrl(url) {
  try {
    console.log('[Talio] Parsing protocol URL:', url);
    const urlObj = new URL(url);
    if (urlObj.protocol === 'talio:' && urlObj.host === 'auth') {
      const token = decodeURIComponent(urlObj.searchParams.get('token') || '');
      const userBase64 = decodeURIComponent(urlObj.searchParams.get('user') || '');
      
      if (token && userBase64) {
        // Decode base64 user data
        const userStr = Buffer.from(userBase64, 'base64').toString('utf-8');
        const user = JSON.parse(userStr);
        console.log('[Talio] OAuth callback received for user:', user.email);
        
        // Store auth
        store.set('authToken', token);
        store.set('userId', user.id || user._id);
        authToken = token;
        currentUser = user;
        
        // Initialize auth and start monitoring
        setAuth(token, user);
        
        // Notify main window to update
        if (mainWindow && mainWindow.webContents) {
          const escapedUser = JSON.stringify(user).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          mainWindow.webContents.executeJavaScript(`
            localStorage.setItem('token', '${token}');
            localStorage.setItem('user', '${escapedUser}');
            localStorage.setItem('userId', '${user.id || user._id}');
            document.cookie = 'token=${token}; path=/; max-age=${7 * 24 * 60 * 60}';
            window.location.href = '/dashboard';
          `).catch(err => console.error('[Talio] JS execution error:', err));
        }
        
        // Show and focus main window
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
        
        // Show notification
        sendNotification('Login Successful', `Welcome back, ${user.firstName || user.email}!`);
      }
    }
  } catch (error) {
    console.error('[Talio] Error handling protocol URL:', error);
    sendNotification('Login Error', 'Failed to complete login. Please try again.');
  }
}

app.whenReady().then(async () => {
  console.log('[Talio] App starting...');

  // Set custom macOS application menu (removes Electron branding from menu bar)
  const template = [
    {
      label: 'Talio',
      submenu: [
        { role: 'about', label: 'About Talio' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide Talio' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Talio' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'close' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Request permissions on app startup (macOS)
  // This ensures camera, mic, and screen permissions are requested early
  if (process.platform === 'darwin') {
    console.log('[Talio] Requesting permissions on startup...');
    requestAllPermissions().then(results => {
      console.log('[Talio] Startup permission results:', results);
    }).catch(err => {
      console.error('[Talio] Error requesting startup permissions:', err);
    });
  }

  // Setup auto-launch
  if (store.get('autoLaunch') && autoLauncher) {
    try {
      autoLauncher.enable();
    } catch (err) {
      console.log('[Talio] Failed to enable auto-launch:', err.message);
    }
  }

  // Load stored auth
  const storedToken = store.get('authToken');
  if (storedToken) {
    authToken = storedToken;
    console.log('[Talio] Loaded stored auth token');
    // If we have a stored userId, initialize auth and monitoring now so the
    // desktop app will register to Socket.IO rooms and receive instant-capture
    // requests even after app restart.
    const storedUserId = store.get('userId');
    if (storedUserId) {
      try {
        console.log('[Talio] Restoring auth for userId:', storedUserId);
        setAuth(storedToken, { id: storedUserId });
      } catch (e) {
        console.error('[Talio] Failed to restore auth on startup:', e);
      }
    }
  }

  // Create windows and tray
  createMainWindow();
  createTray();
  setupIPC();

  // Initialize activity tracking (will start when auth is confirmed)
  await initializeActivityTracking();

  // Maya floating windows disabled - AI features available in-app only
  // The web app has built-in Maya chat accessible from the UI

  console.log('[Talio] App ready');
});

app.on('window-all-closed', () => {
  // Keep app running in background on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, show main window when dock icon is clicked
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
