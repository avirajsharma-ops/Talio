const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, desktopCapturer, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');

// Set app name
app.setName('Talio');

// Remove default application menu
Menu.setApplicationMenu(null);

// Auto-launch module
let AutoLaunch = null;
try {
  AutoLaunch = require('auto-launch');
} catch (err) {
  console.log('[Talio] auto-launch module not available:', err.message);
}

// Configuration
const API_BASE_URL = process.env.NEXTAUTH_URL || 'https://app.talio.in';
const SCREENSHOT_INTERVAL = 60 * 1000; // 1 minute

// Store for persistent data
const store = new Store({
  defaults: {
    authToken: null,
    userId: null,
    employeeId: null,
    employeeName: null,
    employeeCode: null,
    isCheckedIn: false,
    autoLaunch: true,
    lastCaptureTime: null
  }
});

// Windows and state
let mainWindow = null;
let tray = null;
let screenshotTimer = null;
let isCapturing = false;

// Activity tracking
let keystrokeCount = 0;
let mouseClicks = 0;
let mouseMovement = 0;
let activeWindow = null;
let appUsageBuffer = [];
let lastAppCheck = Date.now();

// Auto-launch configuration
let autoLauncher = null;
if (AutoLaunch) {
  try {
    autoLauncher = new AutoLaunch({
      name: 'Talio',
      path: app.getPath('exe')
    });
  } catch (err) {
    console.log('[Talio] Failed to create auto-launcher:', err.message);
  }
}

// Create main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Create a simple default icon if file doesn't exist
      trayIcon = nativeImage.createEmpty();
    }
  } catch (err) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Talio HRMS');

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Update tray menu based on state
function updateTrayMenu() {
  const isCheckedIn = store.get('isCheckedIn');
  const employeeName = store.get('employeeName') || 'Not logged in';

  const contextMenu = Menu.buildFromTemplate([
    { label: `Talio - ${employeeName}`, enabled: false },
    { type: 'separator' },
    { 
      label: isCheckedIn ? '✓ Checked In' : 'Not Checked In', 
      enabled: false 
    },
    { type: 'separator' },
    { 
      label: 'Open Dashboard', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Capture screenshot
async function captureScreenshot() {
  if (isCapturing) return null;
  isCapturing = true;

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.min(width, 1280), height: Math.min(height, 720) }
    });

    if (sources.length === 0) {
      console.log('[Talio] No screen sources available');
      return null;
    }

    const screenshot = sources[0].thumbnail;
    
    // Resize for compression (Electron handles this natively)
    const resized = screenshot.resize({ width: 1280, height: 720, quality: 'good' });
    
    // Convert to JPEG for smaller file size
    const jpegBuffer = resized.toJPEG(75);
    const base64 = jpegBuffer.toString('base64');
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.error('[Talio] Screenshot capture failed:', err);
    return null;
  } finally {
    isCapturing = false;
  }
}

// Upload screenshot to server
async function uploadScreenshot(screenshotData) {
  const authToken = store.get('authToken');
  const employeeId = store.get('employeeId');
  const employeeName = store.get('employeeName');
  const employeeCode = store.get('employeeCode');

  if (!authToken || !employeeId) {
    console.log('[Talio] Cannot upload: not authenticated');
    return false;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/productivity/capture`,
      {
        screenshot: screenshotData,
        employeeId,
        employeeName,
        employeeCode,
        capturedAt: new Date().toISOString(),
        keystrokeCount,
        mouseClicks,
        mouseMovement,
        appUsage: appUsageBuffer
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data.success) {
      console.log('[Talio] Screenshot uploaded successfully');
      store.set('lastCaptureTime', Date.now());
      
      // Reset activity counters
      keystrokeCount = 0;
      mouseClicks = 0;
      mouseMovement = 0;
      appUsageBuffer = [];
      
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('capture-success', { 
          timestamp: new Date().toISOString() 
        });
      }
      
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Talio] Screenshot upload failed:', err.message);
    return false;
  }
}

// Screenshot capture loop
function startCapturing() {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
  }

  // Initial capture after 10 seconds
  setTimeout(async () => {
    const screenshot = await captureScreenshot();
    if (screenshot) {
      await uploadScreenshot(screenshot);
    }
  }, 10000);

  // Regular interval captures
  screenshotTimer = setInterval(async () => {
    const isCheckedIn = store.get('isCheckedIn');
    if (!isCheckedIn) {
      console.log('[Talio] Not checked in, skipping capture');
      return;
    }

    const screenshot = await captureScreenshot();
    if (screenshot) {
      await uploadScreenshot(screenshot);
    }
  }, SCREENSHOT_INTERVAL);

  console.log('[Talio] Screenshot capture started (1 min interval)');
}

function stopCapturing() {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
  console.log('[Talio] Screenshot capture stopped');
}

// Track active window
async function trackActiveWindow() {
  try {
    const activeWin = require('active-win');
    const win = await activeWin();
    
    if (win && win.owner && win.owner.name) {
      const now = Date.now();
      const appName = win.owner.name;
      const windowTitle = win.title || '';

      if (activeWindow !== appName) {
        // Log previous app usage
        if (activeWindow && lastAppCheck) {
          const duration = now - lastAppCheck;
          appUsageBuffer.push({
            appName: activeWindow,
            duration,
            endTime: new Date().toISOString()
          });
        }
        
        activeWindow = appName;
        lastAppCheck = now;
      }
    }
  } catch (err) {
    // active-win might not be available on all systems
  }
}

// Start activity tracking
function startActivityTracking() {
  // Track active window every 3 seconds
  setInterval(trackActiveWindow, 3000);
  
  // Track mouse clicks and movement via IPC from renderer
  console.log('[Talio] Activity tracking started');
}

// IPC Handlers
ipcMain.handle('login', async (event, { email, password }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email,
      password
    });

    if (response.data.token) {
      const { token, user } = response.data;
      
      // Extract employeeId - can be object or string
      let employeeId = null;
      let employeeName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      let employeeCode = user.employeeCode || '';
      
      if (user.employeeId) {
        if (typeof user.employeeId === 'object') {
          employeeId = user.employeeId._id || user.employeeId.id;
          employeeName = user.employeeId.fullName || `${user.employeeId.firstName || ''} ${user.employeeId.lastName || ''}`.trim() || employeeName;
          employeeCode = user.employeeId.employeeCode || employeeCode;
        } else {
          employeeId = user.employeeId;
        }
      }
      
      store.set('authToken', token);
      store.set('userId', user._id || user.id);
      store.set('employeeId', employeeId);
      store.set('employeeName', employeeName);
      store.set('employeeCode', employeeCode);

      updateTrayMenu();
      
      return { 
        success: true, 
        user: {
          ...user,
          name: employeeName,
          employeeCode: employeeCode
        }
      };
    }
    
    return { success: false, error: 'Login failed' };
  } catch (err) {
    console.error('[Talio] Login error:', err.message);
    return { 
      success: false, 
      error: err.response?.data?.message || 'Login failed' 
    };
  }
});

ipcMain.handle('logout', async () => {
  store.delete('authToken');
  store.delete('userId');
  store.delete('employeeId');
  store.delete('employeeName');
  store.delete('employeeCode');
  store.set('isCheckedIn', false);
  
  stopCapturing();
  updateTrayMenu();
  
  return { success: true };
});

ipcMain.handle('check-in', async () => {
  const authToken = store.get('authToken');
  const employeeId = store.get('employeeId');
  
  if (!authToken) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!employeeId) {
    return { success: false, error: 'Employee ID not found' };
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance`,
      {
        employeeId: employeeId,
        type: 'clock-in'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      store.set('isCheckedIn', true);
      startCapturing();
      updateTrayMenu();
      return { success: true, attendance: response.data.attendance };
    }
    
    return { success: false, error: response.data.message };
  } catch (err) {
    // If already checked in, still mark as checked in
    if (err.response?.status === 400 && err.response?.data?.message?.includes('already')) {
      store.set('isCheckedIn', true);
      startCapturing();
      updateTrayMenu();
      return { success: true, alreadyCheckedIn: true };
    }
    
    return { 
      success: false, 
      error: err.response?.data?.message || 'Check-in failed' 
    };
  }
});

ipcMain.handle('check-out', async () => {
  const authToken = store.get('authToken');
  const employeeId = store.get('employeeId');
  
  if (!authToken) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance`,
      {
        employeeId: employeeId,
        type: 'clock-out'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    store.set('isCheckedIn', false);
    stopCapturing();
    updateTrayMenu();
    
    return { success: true, attendance: response.data.attendance };
  } catch (err) {
    return { 
      success: false, 
      error: err.response?.data?.message || 'Check-out failed' 
    };
  }
});

ipcMain.handle('get-status', async () => {
  return {
    isLoggedIn: !!store.get('authToken'),
    isCheckedIn: store.get('isCheckedIn'),
    employeeName: store.get('employeeName'),
    employeeCode: store.get('employeeCode'),
    lastCaptureTime: store.get('lastCaptureTime')
  };
});

ipcMain.handle('get-attendance-status', async () => {
  const authToken = store.get('authToken');
  const employeeId = store.get('employeeId');
  
  if (!authToken || !employeeId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_BASE_URL}/api/attendance?employeeId=${employeeId}&date=${today}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      const attendanceRecords = response.data.attendance || response.data.data || [];
      const todayRecord = attendanceRecords[0]; // Get the first (today's) record
      
      const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
      
      store.set('isCheckedIn', isCheckedIn);
      updateTrayMenu();
      
      if (isCheckedIn) {
        startCapturing();
      }
      
      return { success: true, attendance: todayRecord, isCheckedIn };
    }
    
    return { success: false, error: 'Failed to get attendance status' };
  } catch (err) {
    return { 
      success: false, 
      error: err.response?.data?.message || 'Failed to get attendance status' 
    };
  }
});

// Track keyboard and mouse from renderer
ipcMain.on('activity-keystroke', () => {
  keystrokeCount++;
});

ipcMain.on('activity-mouse-click', () => {
  mouseClicks++;
});

ipcMain.on('activity-mouse-move', (event, distance) => {
  mouseMovement += distance;
});

// Window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  startActivityTracking();

  // Check if user is already logged in
  if (store.get('authToken')) {
    // Verify token and get attendance status
    setTimeout(async () => {
      const result = await ipcMain.emit('get-attendance-status');
    }, 2000);
  }

  // Configure auto-launch
  if (autoLauncher && store.get('autoLaunch')) {
    autoLauncher.enable().catch(err => {
      console.log('[Talio] Failed to enable auto-launch:', err.message);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, just hide to tray
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopCapturing();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
