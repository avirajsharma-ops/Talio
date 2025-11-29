const { app, BrowserWindow, systemPreferences, ipcMain, screen, Tray, Menu, nativeImage, Notification, desktopCapturer } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const { io } = require('socket.io-client');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

// NOTE: Camera/microphone/accessibility permissions are NOT needed for basic screenshot functionality
// We only need screen recording permission, which is checked via checkScreenCapturePermission()

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

  // Inject CSS for macOS title bar spacing when content loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      /* Add top padding for macOS traffic lights */
      body {
        padding-top: 38px !important;
      }
      /* Ensure sidebar also has top padding */
      .sidebar, [class*="sidebar"], nav, aside {
        padding-top: 38px !important;
      }
      /* Adjust ALL fixed positioned headers */
      header.fixed, header[class*="fixed"], .fixed-header, [class*="sticky"] {
        top: 38px !important;
      }
      /* Target Tailwind fixed class specifically */
      .fixed.top-0 {
        top: 38px !important;
      }
      /* Title bar drag region - displays Talio branding area */
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 38px;
        background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%);
        -webkit-app-region: drag;
        z-index: 9998;
        pointer-events: none;
        border-bottom: 1px solid #e5e7eb;
      }
    `);
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

  // NOTE: We only need screen recording permission for screenshots
  // Mic/camera/accessibility permissions are NOT needed for basic Maya functionality

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
    roundedCorners: true,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    skipTaskbar: true,
    hasShadow: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000', // Fully transparent background
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

// Start periodic screenshot and data sync
function startScreenMonitoring() {
  if (screenshotTimer) return;

  // Get current interval (global or from store)
  const currentInterval = global.SCREENSHOT_INTERVAL || store.get('screenshotInterval') || (5 * 60 * 1000);

  // Capture immediately after 5 seconds
  setTimeout(() => captureAndSyncProductivity(false), 5000);

  // Then at configured intervals
  screenshotTimer = setInterval(() => captureAndSyncProductivity(false), currentInterval);
  console.log(`[Talio] Screen monitoring started (${currentInterval / 60000} min intervals)`);
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
    if (activitySyncTimer) {
      clearInterval(activitySyncTimer);
      activitySyncTimer = null;
    }
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

  // Get Maya widget state (minimized or expanded)
  ipcMain.handle('maya-get-widget-state', () => {
    return {
      minimized: !mayaWidgetWindow || !mayaWidgetWindow.isVisible(),
      widgetVisible: mayaWidgetWindow && mayaWidgetWindow.isVisible(),
      blobVisible: mayaBlobWindow && mayaBlobWindow.isVisible()
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
  // On macOS, only show main window if no Maya windows are active
  // This prevents the main window from appearing when clicking the Maya widget
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
});
