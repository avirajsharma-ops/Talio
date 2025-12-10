const { app, BrowserWindow, systemPreferences, ipcMain, screen, Tray, Menu, nativeImage, Notification, desktopCapturer, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const { io } = require('socket.io-client');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Set app name to Talio (removes Electron branding)
app.setName('Talio');

// Remove default application menu on Windows
Menu.setApplicationMenu(null);

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
    screenshotInterval: 5 * 60 * 1000, // 5 minutes default
    // Local productivity data storage
    pendingProductivityData: [],
    lastSyncTimestamp: null,
    instantFetchPending: false,
    instantFetchRequestId: null
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
let websiteBuffer = [];
let mouseActivityBuffer = { clicks: 0, scrollDistance: 0, movementDistance: 0 };
let currentActiveApp = { name: '', title: '', startTime: null };
let lastActiveWindow = null;
let screenshotTimer = null;
let preciseScreenshotTimer = null; // For precise minute-aligned screenshot timing
let activitySyncTimer = null;
let periodicSyncTimer = null;
let keyListener = null;
let activeWin = null;
let periodStartTime = null;

// Socket.IO connection (for real-time instant fetch requests)
let socket = null;

// Activity tracking intervals
const SCREENSHOT_INTERVAL = store.get('screenshotInterval') || 5 * 60 * 1000; // 5 minutes default
const ACTIVITY_SYNC_INTERVAL = 60 * 1000; // 1 minute for local buffer
const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes for API sync
const APP_CHECK_INTERVAL = 3000; // 3 seconds
const INSTANT_FETCH_POLL_INTERVAL = 5000; // 5 seconds

// Permission cache to avoid repeated checks
let screenPermissionChecked = false;
let screenPermissionGranted = true; // Windows doesn't require special permissions
let accessibilityGranted = true; // Windows doesn't need this

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

// Check and request screen recording permission
// Caches result to avoid repeated checks
async function checkScreenCapturePermission() {
  // Return cached result if already checked
  if (screenPermissionChecked) {
    return screenPermissionGranted;
  }
  
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log('[Talio] Screen capture permission status:', status);

    screenPermissionChecked = true;
    screenPermissionGranted = status === 'granted';
    
    if (!screenPermissionGranted) {
      // Only open System Preferences once if not granted
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
    return screenPermissionGranted;
  }
  
  // Windows doesn't require special permissions
  screenPermissionChecked = true;
  screenPermissionGranted = true;
  return true;
}

// NOTE: Camera/microphone/accessibility permissions are NOT needed for basic screenshot functionality
// Windows doesn't require special permissions for screen capture

// Create the main application window
function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 1024,
    minHeight: 768,
    title: 'Talio HRMS',
    icon: path.join(__dirname, 'build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    // Custom frameless window with white title bar
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#374151',
      height: 40
    },
    backgroundColor: '#ffffff',
    show: false
  });

  // Load the Talio web app - ALWAYS use APP_URL
  mainWindow.loadURL(APP_URL);

  // Inject CSS for Windows custom title bar spacing
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      /* Windows title bar offset - 40px for the custom title bar */
      :root {
        --talio-titlebar-height: 40px;
      }
      
      /* Title bar drag region - white Talio branding bar */
      body::before {
        content: 'Talio';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: var(--talio-titlebar-height);
        background-color: #ffffff;
        -webkit-app-region: drag;
        z-index: 9999;
        pointer-events: none;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        padding-left: 16px;
        font-weight: 600;
        font-size: 14px;
        color: #374151;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      /* Body needs padding to account for title bar */
      body {
        padding-top: var(--talio-titlebar-height) !important;
        box-sizing: border-box !important;
      }
      
      /* All h-screen elements should use available height */
      .h-screen {
        height: calc(100vh - var(--talio-titlebar-height)) !important;
      }
      
      /* Sidebar positioning - fixed to left, starts below title bar */
      aside.fixed.inset-y-0, .fixed.inset-y-0.left-0 {
        top: var(--talio-titlebar-height) !important;
        height: calc(100vh - var(--talio-titlebar-height)) !important;
        bottom: auto !important;
      }
      
      /* Fixed header - positioned below title bar */
      header.fixed.top-0, header[class*="fixed"][class*="top-0"] {
        top: var(--talio-titlebar-height) !important;
      }
      
      /* Main content wrapper */
      .flex.h-screen {
        margin-top: 0 !important;
      }
      
      /* Fix dropdown menus and popovers */
      [role="menu"], [role="listbox"], .dropdown-menu, [class*="dropdown"] {
        margin-top: 0 !important;
      }
    `);
    console.log('[Talio] Main window loaded with custom title bar');
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
      callback(true);
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
  // If blob window exists but was destroyed, reset it
  if (mayaBlobWindow && mayaBlobWindow.isDestroyed()) {
    console.log('[Maya] Blob window was destroyed, resetting reference');
    mayaBlobWindow = null;
  }
  
  if (mayaBlobWindow) {
    console.log('[Maya] Blob window exists, showing it');
    try {
      mayaBlobWindow.show();
      mayaBlobWindow.setAlwaysOnTop(true, 'floating');
    } catch (err) {
      console.error('[Maya] Error showing blob window:', err);
      mayaBlobWindow = null;
      createMayaBlobWindow(); // Recreate if error
    }
    return;
  }

  console.log('[Maya] Creating new blob window');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedPosition = store.get('blobPosition');

  const blobSize = 120;
  
  // Position at bottom-right corner with comfortable margin
  // 20px from right edge, 100px from bottom to be above taskbar and clearly visible
  const defaultX = width - blobSize - 20;
  const defaultY = height - blobSize - 100;

  mayaBlobWindow = new BrowserWindow({
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
    hasShadow: false, // Disable shadow to prevent square background
    roundedCorners: true,
    focusable: true,
    // Windows-specific: ensure true transparency
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'maya-preload.js')
    },
    show: false
  });

  // Load Maya blob HTML from server for easy updates
  mayaBlobWindow.loadURL(`${APP_URL}/maya/blob.html`);
  
  // Enable click-through for transparent areas on Windows
  mayaBlobWindow.setIgnoreMouseEvents(false);
  
  // Forward mouse events to allow clicking through transparent areas
  mayaBlobWindow.webContents.on('did-finish-load', () => {
    // Set up mouse event forwarding for transparent click-through
    mayaBlobWindow.webContents.executeJavaScript(`
      document.addEventListener('mousemove', (e) => {
        // Check if mouse is over the blob canvas area
        const card = document.getElementById('mayaBlobCard');
        if (card) {
          const rect = card.getBoundingClientRect();
          const isOverBlob = e.clientX >= rect.left && e.clientX <= rect.right && 
                            e.clientY >= rect.top && e.clientY <= rect.bottom;
          window.isOverBlob = isOverBlob;
        }
      });
    `).catch(() => {});
  });

  mayaBlobWindow.once('ready-to-show', () => {
    console.log('[Maya] Blob window ready, showing');
    mayaBlobWindow.show();
    mayaBlobWindow.setAlwaysOnTop(true, 'floating');
  });

  // Save position when moved
  mayaBlobWindow.on('moved', () => {
    if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
      const bounds = mayaBlobWindow.getBounds();
      store.set('blobPosition', { x: bounds.x, y: bounds.y });
    }
  });

  mayaBlobWindow.on('closed', () => {
    console.log('[Maya] Blob window closed');
    mayaBlobWindow = null;
  });
  
  // Handle minimize to prevent blob from disappearing
  mayaBlobWindow.on('minimize', (e) => {
    e.preventDefault();
    console.log('[Maya] Preventing blob minimize');
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
  dotMatrixOverlay.loadFile(path.join(__dirname, 'dot-matrix-overlay.html'));

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
  // If widget exists but is destroyed, reset reference
  if (mayaWidgetWindow && mayaWidgetWindow.isDestroyed()) {
    console.log('[Maya] Widget window was destroyed, resetting reference');
    mayaWidgetWindow = null;
  }
  
  if (mayaWidgetWindow) {
    console.log('[Maya] Widget window exists, showing and focusing');
    try {
      mayaWidgetWindow.show();
      mayaWidgetWindow.focus();
      mayaWidgetWindow.setAlwaysOnTop(true, 'floating');
      resetMayaInactivityTimer();
      // Hide blob
      if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
        mayaBlobWindow.hide();
      }
    } catch (err) {
      console.error('[Maya] Error showing widget:', err);
      mayaWidgetWindow = null;
      createMayaWidgetWindow(); // Retry
    }
    return;
  }

  console.log('[Maya] Creating new widget window');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const widgetWidth = 400;
  const widgetHeight = 550;
  
  // Position widget relative to blob if blob exists
  let widgetX, widgetY;
  if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
    const blobBounds = mayaBlobWindow.getBounds();
    console.log('[Maya] Positioning widget relative to blob at:', blobBounds);
    // Try to position to the left of blob
    widgetX = blobBounds.x - widgetWidth - 10;
    widgetY = blobBounds.y;
    
    // If widget would go off left edge, position to the right of blob
    if (widgetX < 0) {
      console.log('[Maya] Widget would go off left edge, positioning to right');
      widgetX = blobBounds.x + blobBounds.width + 10;
    }
    // If widget would go off right edge, position inside screen
    if (widgetX + widgetWidth > width) {
      console.log('[Maya] Widget would go off right edge, clamping to screen');
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
    console.log('[Maya] No blob window, using saved/default position');
    const savedPosition = store.get('pipPosition');
    widgetX = savedPosition.x ?? width - widgetWidth - 20;
    widgetY = savedPosition.y ?? height - widgetHeight - 80;
  }

  mayaWidgetWindow = new BrowserWindow({
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
    focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'maya-preload.js')
    },
    show: false
  });

  // Load native Maya widget HTML from server for easy updates
  mayaWidgetWindow.loadURL(`${APP_URL}/maya/widget.html`);

  mayaWidgetWindow.once('ready-to-show', () => {
    console.log('[Maya] Widget window ready, showing');
    mayaWidgetWindow.show();
    mayaWidgetWindow.focus();
    mayaWidgetWindow.setAlwaysOnTop(true, 'floating');
    // Send auth token to widget
    if (authToken) {
      mayaWidgetWindow.webContents.send('maya-auth', { token: authToken, user: currentUser });
    }
    // Hide blob when widget is shown
    if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
      mayaBlobWindow.hide();
    }
    resetMayaInactivityTimer();
  });

  // Save position when moved
  mayaWidgetWindow.on('moved', () => {
    if (mayaWidgetWindow && !mayaWidgetWindow.isDestroyed()) {
      const bounds = mayaWidgetWindow.getBounds();
      store.set('pipPosition', { x: bounds.x, y: bounds.y });
    }
  });

  // Track activity
  mayaWidgetWindow.webContents.on('before-input-event', () => {
    resetMayaInactivityTimer();
  });

  mayaWidgetWindow.on('focus', () => {
    resetMayaInactivityTimer();
  });

  mayaWidgetWindow.on('closed', () => {
    console.log('[Maya] Widget window closed');
    mayaWidgetWindow = null;
    clearMayaInactivityTimer();
    // Always show or create blob when widget closes
    if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
      console.log('[Maya] Showing blob after widget close');
      mayaBlobWindow.show();
      mayaBlobWindow.setAlwaysOnTop(true, 'floating');
    } else {
      console.log('[Maya] Creating blob after widget close');
      mayaBlobWindow = null;
      createMayaBlobWindow();
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
  console.log('[Maya] Minimizing widget to blob');
  try {
    // Hide widget if it exists
    if (mayaWidgetWindow && !mayaWidgetWindow.isDestroyed() && mayaWidgetWindow.isVisible()) {
      mayaWidgetWindow.hide();
    }
    
    // Show or create blob
    if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
      console.log('[Maya] Showing existing blob');
      mayaBlobWindow.show();
      mayaBlobWindow.setAlwaysOnTop(true, 'floating');
    } else {
      console.log('[Maya] Creating new blob window');
      mayaBlobWindow = null; // Reset reference if destroyed
      createMayaBlobWindow();
    }
  } catch (err) {
    console.error('[Maya] Error minimizing to blob:', err);
    // Try to create blob anyway
    try {
      mayaBlobWindow = null;
      createMayaBlobWindow();
    } catch (e) {
      console.error('[Maya] Failed to create blob:', e);
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
    if (!authToken || !activeWin) return;

    try {
      const win = await (activeWin.default || activeWin)();
      if (win) {
        const now = Date.now();
        const appName = win.owner?.name || 'Unknown';
        const windowTitle = win.title || '';

        // Check if this is a browser with URL
        const browserApps = ['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Brave Browser', 'Opera'];
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

// Extract domain from browser title
function extractDomainFromTitle(title) {
  if (!title) return null;
  
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
  
  const parts = title.split(/\s[-–|]\s/);
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].toLowerCase().trim();
    if (lastPart.includes('.') && !lastPart.includes(' ')) {
      return lastPart;
    }
  }
  
  return null;
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
      visitTime: site.visitTime
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
      timeout: 60000
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
      storeProductivityDataLocally(payload);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error('[Talio] Sync error:', error.message);
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

// Capture screenshot and sync all productivity data
async function captureAndSyncProductivity(isInstant = false, instantRequestId = null) {
  if (!authToken) {
    console.log('[Talio] Skipping capture - not authenticated');
    return;
  }

  console.log('[Talio] Starting productivity capture...');

  const mayaState = hideMayaWindowsForCapture();
  await new Promise(resolve => setTimeout(resolve, 100));

  let screenshot = null;

  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      screenshot = sources[0].thumbnail.toDataURL();
      console.log('[Talio] Screenshot captured, size:', Math.round(screenshot.length / 1024), 'KB');
    }
    
    restoreMayaWindowsAfterCapture(mayaState);
    
    const syncResult = await syncProductivityData(screenshot, isInstant, instantRequestId);
    
    if (syncResult.success) {
      console.log('[Talio] ✅ Productivity sync complete');
    } else {
      console.log('[Talio] ⚠️ Productivity sync failed, stored locally for retry');
    }
  } catch (error) {
    console.error('[Talio] Capture error:', error.message);
    restoreMayaWindowsAfterCapture(mayaState);
    await syncProductivityData(null, isInstant, instantRequestId);
  }
}

// Legacy function for backwards compatibility
async function captureAndSummarize() {
  await captureAndSyncProductivity(false);
}

// Track the last captured minute globally to persist across function calls
let lastCapturedMinute = -1;
let lastCaptureTime = 0;
let captureCount = 0; // Track number of captures for recalibration

// Start periodic screenshot and data sync - aligned to minute boundaries
// This runs in background even when window is hidden
function startScreenMonitoring() {
  if (screenshotTimer || preciseScreenshotTimer) return;

  console.log('[Talio] 🚀 Starting screen monitoring with precise minute alignment');

  // Function to capture exactly at each minute boundary
  const captureAtMinuteBoundary = async () => {
    if (!authToken) {
      console.log('[Talio] Skipping capture - not authenticated');
      return;
    }

    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    const minuteKey = currentHour * 60 + currentMinute; // Unique key per minute of day
    
    // Prevent duplicate captures within the same minute
    const timeSinceLastCapture = Date.now() - lastCaptureTime;
    if (minuteKey === lastCapturedMinute && timeSinceLastCapture < 55000) {
      return; // Already captured this minute
    }
    
    lastCapturedMinute = minuteKey;
    lastCaptureTime = Date.now();
    
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
    console.log(`[Talio] 📸 Capturing at ${timestamp} (minute :${currentMinute.toString().padStart(2, '0')})`);
    
    try {
      await captureAndSyncProductivity(false);
    } catch (err) {
      console.error('[Talio] Capture failed:', err.message);
    }
  };

  // Precise recursive scheduling - always aligns to next minute boundary
  const startPreciseScreenshotCapture = () => {
    const now = new Date();
    // Calculate exact milliseconds until next minute (at :00 seconds)
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    console.log(`[Talio] ⏱️ Next screenshot in ${(msUntilNextMinute / 1000).toFixed(1)}s (at :${((now.getMinutes() + 1) % 60).toString().padStart(2, '0')})`);
    
    preciseScreenshotTimer = setTimeout(async () => {
      captureCount++;
      await captureAtMinuteBoundary();
      
      // Every 10 captures, recalibrate to prevent any drift accumulation
      if (captureCount % 10 === 0) {
        console.log('[Talio] 🔄 Recalibrating timer for precision');
      }
      
      // Always recursively schedule next capture (self-correcting)
      startPreciseScreenshotCapture();
    }, msUntilNextMinute);
  };

  startPreciseScreenshotCapture();
  console.log('[Talio] ✅ Precise minute-aligned screenshot monitoring active');
}

// Start activity sync interval (now retries pending data)
function startActivitySync() {
  if (activitySyncTimer) return;
  
  activitySyncTimer = setInterval(() => {
    retryPendingSync();
  }, PERIODIC_SYNC_INTERVAL);
  
  console.log('[Talio] Activity sync started');
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

// Send native push notification
function sendNotification(title, body, options = {}) {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: title,
    body: body,
    icon: path.join(__dirname, 'build', 'icon.png'),
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
    
    // Initialize socket for real-time capture requests (best effort)
    initializeSocketConnection(user.id);
    
    // Start instant fetch polling as backup to Socket.IO
    startInstantFetchPolling();
    
    // Start activity tracking and sync
    startScreenMonitoring();
    startActivitySync();
    fetchScreenshotInterval();
    
    // Initialize period tracking
    periodStartTime = Date.now();
    
    // Show notification
    sendNotification('Talio Active', 'Activity monitoring is now running');
  } else if (!token) {
    // User logged out - stop monitoring
    console.log('[Talio] Auth cleared - stopping monitoring');
    if (screenshotTimer) {
      clearInterval(screenshotTimer);
      screenshotTimer = null;
    }
    if (preciseScreenshotTimer) {
      clearTimeout(preciseScreenshotTimer);
      preciseScreenshotTimer = null;
    }
    if (activitySyncTimer) {
      clearInterval(activitySyncTimer);
      activitySyncTimer = null;
    }
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
    
    // Update the interval
    global.SCREENSHOT_INTERVAL = newInterval;
    store.set('screenshotInterval', newInterval);
    
    // Restart screenshot timer with new interval
    if (screenshotTimer) {
      clearInterval(screenshotTimer);
      screenshotTimer = null;
    }
    if (preciseScreenshotTimer) {
      clearTimeout(preciseScreenshotTimer);
      preciseScreenshotTimer = null;
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
    let screenshot = null;
    
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

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'build/icon.ico');
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
        if (autoLauncher) {
          if (menuItem.checked) {
            autoLauncher.enable();
          } else {
            autoLauncher.disable();
          }
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
      // NOTE: We do NOT prompt automatically - user will be guided when capture fails
    } else {
      // Windows - no special permissions needed for screen capture
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

  // Check current permission status - alias for get-permission-status
  ipcMain.handle('check-permissions', async () => {
    // On Windows, permissions are generally granted by default
    // unless explicitly blocked by system settings
    const permissions = {
      camera: 'granted',
      microphone: 'granted',
      screen: 'granted',
      accessibility: 'granted'
    };
    console.log('[Talio] Checking permissions:', permissions);
    return permissions;
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
    console.log('[Maya IPC] open-maya-from-blob called');
    try {
      createMayaWidgetWindow();
      // Hide blob when widget opens
      if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
        mayaBlobWindow.hide();
      }
    } catch (err) {
      console.error('[Maya IPC] Error opening widget from blob:', err);
    }
  });

  // Minimize Maya to blob
  ipcMain.handle('minimize-maya-to-blob', () => {
    console.log('[Maya IPC] minimize-maya-to-blob called');
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
    console.log('[Maya IPC] maya-close-widget called');
    try {
      if (mayaWidgetWindow && !mayaWidgetWindow.isDestroyed()) {
        mayaWidgetWindow.hide();
      }
      // Always show or create blob when widget closes
      if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
        mayaBlobWindow.show();
        mayaBlobWindow.setAlwaysOnTop(true, 'floating');
      } else {
        mayaBlobWindow = null;
        createMayaBlobWindow();
      }
    } catch (err) {
      console.error('[Maya IPC] Error closing widget:', err);
    }
  });

  ipcMain.handle('maya-minimize-widget', () => {
    minimizeMayaToBob();
  });

  // Expand widget (called from blob when wake word detected)
  ipcMain.handle('maya-expand-widget', async () => {
    console.log('[Maya IPC] maya-expand-widget called');
    try {
      // First hide the blob
      if (mayaBlobWindow && !mayaBlobWindow.isDestroyed()) {
        console.log('[Maya] Hiding blob window');
        mayaBlobWindow.hide();
      }
      
      // Check if widget exists and is not destroyed
      if (mayaWidgetWindow && !mayaWidgetWindow.isDestroyed()) {
        console.log('[Maya] Widget exists, showing and focusing');
        mayaWidgetWindow.show();
        mayaWidgetWindow.focus();
        mayaWidgetWindow.setAlwaysOnTop(true, 'floating');
        // Send state change to widget
        mayaWidgetWindow.webContents.send('maya-widget-state-changed', { minimized: false });
      } else {
        console.log('[Maya] Widget does not exist, creating new one');
        mayaWidgetWindow = null; // Reset reference if destroyed
        createMayaWidgetWindow();
      }
      
      resetMayaInactivityTimer();
      return { success: true };
    } catch (err) {
      console.error('[Maya IPC] Error expanding widget:', err);
      // Try to recreate widget on error
      try {
        mayaWidgetWindow = null;
        createMayaWidgetWindow();
      } catch (e) {
        console.error('[Maya IPC] Failed to recreate widget:', e);
      }
      return { success: false, error: err.message };
    }
  });

  // Get widget state
  ipcMain.handle('maya-get-widget-state', () => {
    const isMinimized = !mayaWidgetWindow || !mayaWidgetWindow.isVisible();
    return { minimized: isMinimized };
  });

  // Maya screen capture with auto-hide widget for clean capture
  ipcMain.handle('maya-capture-screen', async () => {
    try {
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

  // Check screen permission (always true on Windows)
  ipcMain.handle('maya-check-screen-permission', () => {
    return true; // Windows doesn't require explicit permission
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

// Handle protocol URL (Windows uses second-instance event)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    // Protocol handler for Windows - argv includes the protocol URL
    const url = commandLine.find(arg => arg.startsWith('talio://'));
    if (url) {
      handleProtocolUrl(url);
    }
  });
}

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

  // NOTE: Permissions are now requested AFTER user logs in, not on app startup
  // The web app will call 'request-all-permissions' IPC handler after login

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
    // Restore auth on startup if we have stored userId so socket connects
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
  // Only show main window if no Maya windows are active
  // This prevents the main window from appearing when interacting with Maya widget
  const mayaActive = (mayaWidgetWindow && mayaWidgetWindow.isVisible()) || 
                     (mayaBlobWindow && mayaBlobWindow.isVisible());
  
  if (mayaActive) {
    // Maya is active, don't show main window - just keep focus on Maya
    return;
  }
  
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  clearMayaInactivityTimer();
  
  // Clean up screenshot timers
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
  if (preciseScreenshotTimer) {
    clearTimeout(preciseScreenshotTimer);
    preciseScreenshotTimer = null;
  }
});
