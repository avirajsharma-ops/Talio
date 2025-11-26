/**
 * Talio Activity Monitor - Windows Desktop Application
 * Main Process - Handles screen capture, activity tracking, and system integration
 * Features: Automatic silent screen capture, background running, auto-start
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, powerMonitor, screen, desktopCapturer, nativeImage, systemPreferences } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

// Dynamic imports for optional native modules
let screenshot, machineId, activeWindow;

// Configuration
const CONFIG = {
  API_URL: process.env.TALIO_API_URL || 'https://app.talio.in',
  SCREENSHOT_INTERVAL: 30000, // 30 seconds
  ACTIVITY_CHECK_INTERVAL: 5000, // 5 seconds
  WINDOW_CHECK_INTERVAL: 1000, // 1 second
  BATCH_FLUSH_INTERVAL: 10000, // 10 seconds
  AUTO_START: true,
  RUN_IN_BACKGROUND: true,
  SILENT_CAPTURE: true, // Capture without user interaction
  MAYA_INACTIVITY_TIMEOUT: 30000 // 30 seconds before Maya minimizes to blob
};

// Initialize optional modules
async function initializeModules() {
  try {
    const screenshotModule = await import('screenshot-desktop');
    screenshot = screenshotModule.default || screenshotModule;
  } catch (e) {
    console.log('screenshot-desktop not available, using desktopCapturer');
  }

  try {
    const machineIdModule = await import('node-machine-id');
    machineId = machineIdModule.machineId || machineIdModule.default?.machineId;
  } catch (e) {
    machineId = async () => require('crypto').randomBytes(16).toString('hex');
  }

  try {
    const activeWinModule = await import('active-win');
    activeWindow = activeWinModule.default || activeWinModule;
  } catch (e) {
    activeWindow = async () => null;
  }
}

// Global state
let mainWindow = null;
let mayaPIPWindow = null;
let mayaBlobWindow = null;
let dotMatrixWindow = null;
let tray = null;
let authToken = null;
let userInfo = null;
let sessionId = null;
let isTracking = false;
let deviceId = null;
let mayaInactivityTimer = null;

// Activity buffers
let activityBuffer = {
  windows: [],
  screenshots: [],
  lastFlush: Date.now()
};

// Current window tracking
let currentWindow = {
  title: '',
  owner: '',
  path: '',
  startTime: null
};

/**
 * Create main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Start hidden
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build/icon.ico')
  });

  mainWindow.loadFile('index.html');

  // Hide instead of close
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Development tools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Maya blob is ALWAYS visible (unless widget is open)
  // No hiding on main window focus/blur - blob stays visible

  mainWindow.on('focus', () => {
    // Blob stays visible
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
}

/**
 * Create system tray
 */
function createTray() {
  tray = new Tray(path.join(__dirname, 'build/icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Talio Activity Monitor',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Status: ' + (isTracking ? 'Active' : 'Inactive'),
      enabled: false
    },
    {
      label: userInfo ? `User: ${userInfo.email}` : 'Not logged in',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        require('electron').shell.openExternal(`${CONFIG.API_URL}/dashboard/maya/activity-history`);
      }
    },
    {
      label: 'Show Window',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: isTracking ? 'Pause Tracking' : 'Resume Tracking',
      click: () => {
        toggleTracking();
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', 'settings');
      }
    },
    {
      label: 'Logout',
      click: () => {
        logout();
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Talio Activity Monitor');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

/**
 * Initialize application
 */
async function initialize() {
  try {
    // Initialize optional native modules
    await initializeModules();

    // Get unique device ID
    if (machineId) {
      deviceId = await machineId();
    } else {
      deviceId = require('crypto').randomBytes(16).toString('hex');
    }
    console.log('🖥️ Device ID:', deviceId);

    // Check for saved credentials
    const { default: Store } = await import('electron-store');
    const store = new Store();

    authToken = store.get('authToken');
    userInfo = store.get('userInfo');

    if (authToken && userInfo) {
      console.log('✅ Found saved credentials for:', userInfo.email);
      sessionId = `session_${userInfo._id}_${Date.now()}_desktop`;
      startTracking();
    } else {
      console.log('⚠️ No saved credentials. Please login.');
      if (mainWindow) {
        mainWindow.show();
        mainWindow.webContents.send('show-login');
      }
    }

    // Set up auto-start at login (background run)
    if (CONFIG.AUTO_START) {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        path: process.execPath,
        args: ['--hidden']
      });
      console.log('✅ Auto-start at login enabled');
    }

  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

/**
 * Start activity tracking
 */
function startTracking() {
  if (isTracking) return;
  
  isTracking = true;
  console.log('🚀 Activity tracking started');

  // Update tray
  updateTray();

  // Start screenshot capture
  setInterval(captureScreenshot, CONFIG.SCREENSHOT_INTERVAL);

  // Start window tracking
  setInterval(trackActiveWindow, CONFIG.WINDOW_CHECK_INTERVAL);

  // Start activity flush
  setInterval(flushActivityBuffer, CONFIG.BATCH_FLUSH_INTERVAL);

  // Track power events
  powerMonitor.on('suspend', handleSuspend);
  powerMonitor.on('resume', handleResume);
  powerMonitor.on('lock-screen', handleLock);
  powerMonitor.on('unlock-screen', handleUnlock);
}

/**
 * Stop activity tracking
 */
function stopTracking() {
  isTracking = false;
  console.log('⏸️ Activity tracking paused');
  updateTray();
}

/**
 * Toggle tracking
 */
function toggleTracking() {
  if (isTracking) {
    stopTracking();
  } else {
    startTracking();
  }
}

/**
 * Capture screenshot - Silent automatic capture without user interaction
 * Uses multiple methods for maximum compatibility
 */
async function captureScreenshot() {
  if (!isTracking || !authToken) return;

  try {
    console.log('📸 Capturing screenshot silently...');

    // Get all displays
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    let base64 = null;
    let activeWin = null;

    // Try to get active window info
    try {
      if (activeWindow) {
        activeWin = await activeWindow();
      }
    } catch (e) {
      console.log('Could not get active window info');
    }

    // Method 1: Use screenshot-desktop (preferred - silent, no permission needed on Windows)
    if (screenshot) {
      try {
        const img = await screenshot({ screen: primaryDisplay.id });
        base64 = `data:image/png;base64,${img.toString('base64')}`;
        console.log('✅ Screenshot captured via screenshot-desktop');
      } catch (e) {
        console.log('screenshot-desktop failed, trying desktopCapturer');
      }
    }

    // Method 2: Use Electron's desktopCapturer (fallback)
    if (!base64) {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: {
            width: primaryDisplay.size.width,
            height: primaryDisplay.size.height
          }
        });

        if (sources.length > 0) {
          const thumbnail = sources[0].thumbnail;
          base64 = thumbnail.toDataURL();
          console.log('✅ Screenshot captured via desktopCapturer');
        }
      } catch (e) {
        console.error('desktopCapturer failed:', e);
      }
    }

    if (!base64) {
      console.error('❌ All screenshot methods failed');
      return;
    }

    const screenshotData = {
      screenshot: base64,
      capturedAt: new Date().toISOString(),
      windowTitle: activeWin?.title || 'Unknown',
      activeApplication: activeWin?.owner?.name || 'Unknown',
      url: activeWin?.url || null,
      domain: activeWin?.url ? extractDomain(activeWin.url) : null,
      sessionId: sessionId,
      deviceId: deviceId,
      deviceInfo: {
        platform: 'windows',
        screenResolution: `${primaryDisplay.size.width}x${primaryDisplay.size.height}`,
        displays: displays.length,
        captureMethod: screenshot ? 'screenshot-desktop' : 'desktopCapturer'
      }
    };

    // Send to API immediately (don't buffer due to size)
    await sendToAPI('/api/activity/screenshot', screenshotData);

    console.log('✅ Screenshot sent to server');

    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screenshot-captured', {
        time: new Date().toISOString(),
        app: activeWin?.owner?.name
      });
    }

  } catch (error) {
    console.error('❌ Screenshot capture error:', error);
  }
}

/**
 * Track active window
 */
async function trackActiveWindow() {
  if (!isTracking || !authToken) return;

  try {
    const activeWin = await activeWindow();
    
    if (!activeWin) return;

    const windowTitle = activeWin.title || 'Unknown';
    const ownerName = activeWin.owner?.name || 'Unknown';
    const ownerPath = activeWin.owner?.path || '';

    // Check if window changed
    if (windowTitle !== currentWindow.title || ownerName !== currentWindow.owner) {
      // Save previous window if it existed
      if (currentWindow.startTime) {
        const timeSpent = Date.now() - currentWindow.startTime;
        
        activityBuffer.windows.push({
          windowTitle: currentWindow.title,
          applicationName: currentWindow.owner,
          applicationPath: currentWindow.path,
          url: activeWin.url || null,
          domain: activeWin.url ? extractDomain(activeWin.url) : null,
          focusStartTime: new Date(currentWindow.startTime).toISOString(),
          focusEndTime: new Date().toISOString(),
          timeSpent: timeSpent,
          sessionId: sessionId,
          deviceId: deviceId
        });
      }

      // Update current window
      currentWindow = {
        title: windowTitle,
        owner: ownerName,
        path: ownerPath,
        startTime: Date.now()
      };

      console.log('🪟 Window changed:', ownerName, '-', windowTitle);

      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('window-changed', {
          app: ownerName,
          title: windowTitle
        });
      }
    }

  } catch (error) {
    console.error('❌ Window tracking error:', error);
  }
}

/**
 * Flush activity buffer
 */
async function flushActivityBuffer() {
  if (!isTracking || !authToken) return;

  if (activityBuffer.windows.length === 0) return;

  try {
    const batch = {
      windows: [...activityBuffer.windows]
    };

    // Clear buffer
    activityBuffer.windows = [];
    activityBuffer.lastFlush = Date.now();

    // Send to API
    await sendToAPI('/api/activity/batch', batch);
    
    console.log('📤 Activity batch sent:', batch.windows.length, 'windows');

  } catch (error) {
    console.error('❌ Activity flush error:', error);
    // Re-add on failure
    activityBuffer.windows.push(...batch.windows);
  }
}

/**
 * Send data to API
 */
async function sendToAPI(endpoint, data) {
  if (!authToken) {
    throw new Error('No authentication token');
  }

  try {
    const response = await axios.post(`${CONFIG.API_URL}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      timeout: 30000 // 30 second timeout for screenshots
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Authentication failed. Please login again.');
      logout();
    }
    throw error;
  }
}

/**
 * Handle power events
 */
function handleSuspend() {
  console.log('💤 System suspending...');
  if (currentWindow.startTime) {
    trackActiveWindow(); // Save current window
  }
  flushActivityBuffer();
}

function handleResume() {
  console.log('⚡ System resumed');
  currentWindow.startTime = Date.now();
}

function handleLock() {
  console.log('🔒 Screen locked');
  if (currentWindow.startTime) {
    trackActiveWindow();
  }
  currentWindow.startTime = null;
}

function handleUnlock() {
  console.log('🔓 Screen unlocked');
  currentWindow.startTime = Date.now();
}

/**
 * Update tray menu
 */
function updateTray() {
  if (!tray) return;
  createTray(); // Recreate with updated status
}

/**
 * Logout
 */
async function logout() {
  const { default: Store } = await import('electron-store');
  const store = new Store();
  
  store.delete('authToken');
  store.delete('userInfo');
  
  authToken = null;
  userInfo = null;
  sessionId = null;
  
  stopTracking();
  
  mainWindow.show();
  mainWindow.webContents.send('show-login');
  updateTray();
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

// IPC Handlers
ipcMain.handle('login', async (event, credentials) => {
  try {
    const response = await axios.post(`${CONFIG.API_URL}/api/auth/login`, credentials);
    
    if (response.data.success) {
      authToken = response.data.token;
      userInfo = response.data.user;
      sessionId = `session_${userInfo._id}_${Date.now()}_desktop`;

      // Save credentials
      const { default: Store } = await import('electron-store');
      const store = new Store();
      store.set('authToken', authToken);
      store.set('userInfo', userInfo);

      startTracking();
      mainWindow.hide();

      return { success: true };
    }
    
    return { success: false, error: 'Login failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('logout', async () => {
  await logout();
  return { success: true };
});

ipcMain.handle('get-status', () => {
  return {
    isTracking,
    user: userInfo,
    sessionId,
    deviceId
  };
});

ipcMain.handle('toggle-tracking', () => {
  toggleTracking();
  return { isTracking };
});

ipcMain.handle('get-stats', async () => {
  const { default: Store } = await import('electron-store');
  const store = new Store();
  return store.get('stats', {
    screenshots: 0,
    windows: 0,
    uptime: 0
  });
});

// Maya blob IPC handlers
ipcMain.handle('open-maya-from-blob', () => {
  createMayaPIPWindow();
});

ipcMain.handle('minimize-maya-to-blob', () => {
  minimizeMayaToBlob();
});

ipcMain.handle('toggle-maya-pip', (event, show) => {
  if (show) {
    createMayaPIPWindow();
    if (mayaBlobWindow) mayaBlobWindow.hide();
  } else {
    minimizeMayaToBlob();
  }
});

// Request all permissions (Windows doesn't need special permissions like macOS)
ipcMain.handle('request-all-permissions', async () => {
  console.log('[Talio] Permissions requested (Windows - auto-granted)');
  return {
    screen: true,
    camera: true,
    microphone: true
  };
});

// Get permission status (Windows - always granted)
ipcMain.handle('get-permission-status', () => {
  return {
    screen: 'granted',
    camera: 'granted',
    microphone: 'granted'
  };
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
  if (mayaPIPWindow) {
    mayaPIPWindow.hide();
    if (mayaBlobWindow) mayaBlobWindow.show();
  }
});

ipcMain.handle('maya-minimize-widget', () => {
  minimizeMayaToBlob();
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
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'build', 'icon.ico')
    });
    notification.show();
  }
});

ipcMain.handle('maya-get-credentials', () => {
  return {
    token: authToken,
    userId: userInfo?._id
  };
});

// Set auth from web app
ipcMain.handle('set-auth', async (event, { token, user }) => {
  authToken = token;
  userInfo = user;

  const { default: Store } = await import('electron-store');
  const store = new Store();
  store.set('authToken', token);
  store.set('userInfo', user);

  // Send to Maya widget
  if (mayaPIPWindow) {
    mayaPIPWindow.webContents.send('maya-auth', { token, user });
  }
});

// Send push notification from web app
ipcMain.handle('send-notification', (event, { title, body }) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'build', 'icon.ico')
    });
    notification.show();
  }
});

/**
 * Create dot matrix overlay window for screen analysis
 */
function createDotMatrixWindow() {
  if (dotMatrixWindow) {
    return dotMatrixWindow;
  }

  const { width, height } = screen.getPrimaryDisplay().size;

  dotMatrixWindow = new BrowserWindow({
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  dotMatrixWindow.setIgnoreMouseEvents(true);
  dotMatrixWindow.loadFile('dot-matrix-overlay.html');

  dotMatrixWindow.on('closed', () => {
    dotMatrixWindow = null;
  });

  return dotMatrixWindow;
}

function showDotMatrix() {
  const win = createDotMatrixWindow();
  win.show();
  win.webContents.executeJavaScript('window.startScan && window.startScan()');
}

function hideDotMatrix() {
  if (dotMatrixWindow) {
    dotMatrixWindow.webContents.executeJavaScript('window.stopScan && window.stopScan()');
    setTimeout(() => {
      if (dotMatrixWindow) {
        dotMatrixWindow.hide();
      }
    }, 1100);
  }
}

/**
 * Create Maya Blob (floating button at bottom)
 */
function createMayaBlobWindow() {
  if (mayaBlobWindow) {
    mayaBlobWindow.show();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const blobSize = 120;

  mayaBlobWindow = new BrowserWindow({
    width: blobSize,
    height: blobSize,
    x: width - blobSize - 20,
    y: height - blobSize - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'maya-preload.js')
    },
    show: false
  });

  mayaBlobWindow.loadFile('maya-blob.html');
  mayaBlobWindow.once('ready-to-show', () => {
    mayaBlobWindow.show();
  });

  mayaBlobWindow.on('closed', () => {
    mayaBlobWindow = null;
  });
}

/**
 * Create native Maya widget window (transparent, professional UI)
 */
function createMayaPIPWindow() {
  if (mayaPIPWindow) {
    mayaPIPWindow.show();
    mayaPIPWindow.focus();
    resetMayaInactivityTimer();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const widgetWidth = 400;
  const widgetHeight = 550;

  mayaPIPWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: width - widgetWidth - 20,
    y: height - widgetHeight - 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    skipTaskbar: true,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'maya-preload.js')
    },
    show: false
  });

  // Load native Maya widget HTML
  mayaPIPWindow.loadFile('maya-widget.html');

  mayaPIPWindow.once('ready-to-show', () => {
    mayaPIPWindow.show();
    // Send auth token to widget
    if (authToken) {
      mayaPIPWindow.webContents.send('maya-auth', { token: authToken, user: userInfo });
    }
    if (mayaBlobWindow) mayaBlobWindow.hide();
    resetMayaInactivityTimer();
  });

  mayaPIPWindow.webContents.on('before-input-event', () => {
    resetMayaInactivityTimer();
  });

  mayaPIPWindow.on('focus', () => {
    resetMayaInactivityTimer();
  });

  mayaPIPWindow.on('closed', () => {
    mayaPIPWindow = null;
    clearMayaInactivityTimer();
    if (mayaBlobWindow) mayaBlobWindow.show();
  });
}

/**
 * Reset Maya inactivity timer
 */
function resetMayaInactivityTimer() {
  clearMayaInactivityTimer();
  mayaInactivityTimer = setTimeout(() => {
    minimizeMayaToBlob();
  }, CONFIG.MAYA_INACTIVITY_TIMEOUT);
}

/**
 * Clear Maya inactivity timer
 */
function clearMayaInactivityTimer() {
  if (mayaInactivityTimer) {
    clearTimeout(mayaInactivityTimer);
    mayaInactivityTimer = null;
  }
}

/**
 * Minimize Maya PIP to blob
 */
function minimizeMayaToBlob() {
  if (mayaPIPWindow && mayaPIPWindow.isVisible()) {
    mayaPIPWindow.hide();
    if (mayaBlobWindow) {
      mayaBlobWindow.show();
    } else {
      createMayaBlobWindow();
    }
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  initialize();

  // Create Maya blob after short delay - always visible
  setTimeout(() => {
    createMayaBlobWindow();
    // Blob is always visible (unless widget is open)
  }, 3000);
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  if (currentWindow.startTime) {
    await trackActiveWindow();
  }
  await flushActivityBuffer();
});

console.log('✅ Talio Activity Monitor started');
