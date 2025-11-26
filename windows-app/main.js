/**
 * Talio Activity Monitor - Windows Desktop Application
 * Main Process - Handles screen capture, activity tracking, and system integration
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, powerMonitor, screen, desktopCapturer } = require('electron');
const path = require('path');
const axios = require('axios');
const screenshot = require('screenshot-desktop');
const { machineId } = require('node-machine-id');
const activeWindow = require('active-win');

// Configuration
const CONFIG = {
  API_URL: process.env.TALIO_API_URL || 'https://app.tailo.work',
  SCREENSHOT_INTERVAL: 30000, // 30 seconds
  ACTIVITY_CHECK_INTERVAL: 5000, // 5 seconds
  WINDOW_CHECK_INTERVAL: 1000, // 1 second
  BATCH_FLUSH_INTERVAL: 10000, // 10 seconds
  AUTO_START: true
};

// Global state
let mainWindow = null;
let tray = null;
let authToken = null;
let userInfo = null;
let sessionId = null;
let isTracking = false;
let deviceId = null;

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
    // Get unique device ID
    deviceId = await machineId();
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
      mainWindow.show();
      mainWindow.webContents.send('show-login');
    }

    // Set up auto-start
    if (CONFIG.AUTO_START) {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        path: process.execPath,
        args: ['--hidden']
      });
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
 * Capture screenshot
 */
async function captureScreenshot() {
  if (!isTracking || !authToken) return;

  try {
    console.log('📸 Capturing screenshot...');

    // Get all displays
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    // Capture primary display
    const img = await screenshot({ screen: primaryDisplay.id });
    const base64 = `data:image/png;base64,${img.toString('base64')}`;

    // Get current window info
    const activeWin = await activeWindow();

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
        displays: displays.length
      }
    };

    // Send to API immediately (don't buffer due to size)
    await sendToAPI('/api/activity/screenshot', screenshotData);
    
    console.log('✅ Screenshot captured and sent');
    
    // Notify renderer
    if (mainWindow) {
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

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  initialize();
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
