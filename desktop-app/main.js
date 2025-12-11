/**
 * Talio Desktop App
 * - Web wrapper for https://app.talio.in
 * - Productivity monitoring (screenshots every 1 min when checked in)
 * - Activity tracking (keystrokes, mouse)
 * - Geolocation tracking
 * - Auto-start on boot
 * - System tray integration
 */

const { 
  app, 
  BrowserWindow, 
  Menu, 
  Tray, 
  shell, 
  ipcMain, 
  nativeImage, 
  desktopCapturer, 
  screen,
  systemPreferences,
  dialog
} = require('electron');
const path = require('path');
const Store = require('electron-store');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ==========================================
// CONFIGURATION
// ==========================================

app.setName('Talio');

const APP_URL = process.env.TALIO_URL || 'https://app.talio.in';
const SCREENSHOT_INTERVAL = 60 * 1000; // 1 minute

// Meeting room URL pattern to open in browser
const MEETING_ROOM_PATTERN = /\/dashboard\/meetings\/room\//;

// Persistent store
const store = new Store({
  name: 'talio-config',
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    authToken: null,
    userId: null,
    employeeId: null,
    employeeName: null,
    employeeCode: null,
    isCheckedIn: false,
    lastCaptureTime: null,
    autoLaunch: true
  }
});

// ==========================================
// STATE
// ==========================================

let mainWindow = null;
let tray = null;
let screenshotTimer = null;
let isCapturing = false;
let hasScreenPermission = false;

// Activity counters
let keystrokeCount = 0;
let mouseClicks = 0;
let mouseMovement = 0;

// ==========================================
// PERMISSION HANDLING
// ==========================================

async function checkScreenPermission() {
  if (process.platform === 'darwin') {
    // macOS requires explicit screen recording permission
    const status = systemPreferences.getMediaAccessStatus('screen');
    hasScreenPermission = status === 'granted';
    
    if (!hasScreenPermission) {
      // Show permission dialog
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Screen Recording Permission Required',
        message: 'Talio needs screen recording permission to capture productivity screenshots.',
        detail: 'Please go to System Preferences > Security & Privacy > Privacy > Screen Recording, and enable Talio.\n\nAfter enabling, restart the app.',
        buttons: ['Open System Preferences', 'Later'],
        defaultId: 0
      });
      
      if (response === 0) {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
    }
    return hasScreenPermission;
  }
  
  // Windows/Linux - no explicit permission needed
  hasScreenPermission = true;
  return true;
}

async function requestLocationPermission() {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('location');
    if (status !== 'granted') {
      // Request location access
      try {
        await systemPreferences.askForMediaAccess('location');
      } catch (e) {
        console.log('[Talio] Location permission not available');
      }
    }
  }
}

// ==========================================
// SCREENSHOT CAPTURE
// ==========================================

async function captureScreenshot() {
  if (isCapturing || !hasScreenPermission) return null;
  isCapturing = true;

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: Math.min(width, 1920), 
        height: Math.min(height, 1080) 
      }
    });

    if (sources.length === 0) {
      console.log('[Talio] No screen sources available');
      return null;
    }

    const screenshot = sources[0].thumbnail;
    
    // Resize to 1280x720 for upload efficiency
    const resized = screenshot.resize({ 
      width: 1280, 
      height: 720, 
      quality: 'best' 
    });
    
    // Convert to JPEG for smaller size (80% quality)
    const jpegBuffer = resized.toJPEG(80);
    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[Talio] Screenshot capture failed:', err.message);
    return null;
  } finally {
    isCapturing = false;
  }
}

// Get current geolocation
function getGeolocation() {
  return new Promise((resolve) => {
    if (!mainWindow) {
      resolve(null);
      return;
    }
    
    // Use browser's geolocation API via the webContents
    mainWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ 
              latitude: pos.coords.latitude, 
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy 
            }),
            () => resolve(null),
            { timeout: 5000, enableHighAccuracy: true }
          );
        } else {
          resolve(null);
        }
      })
    `).then(resolve).catch(() => resolve(null));
  });
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
    // Get geolocation
    const location = await getGeolocation();
    
    const payload = JSON.stringify({
      screenshot: screenshotData,
      employeeId,
      employeeName,
      employeeCode,
      capturedAt: new Date().toISOString(),
      keystrokeCount,
      mouseClicks,
      mouseMovement,
      location,
      deviceInfo: {
        platform: process.platform,
        hostname: require('os').hostname()
      }
    });

    const url = new URL('/api/productivity/capture', APP_URL);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise((resolve) => {
      const req = transport.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success) {
              console.log('[Talio] Screenshot uploaded successfully');
              store.set('lastCaptureTime', Date.now());
              
              // Reset counters
              keystrokeCount = 0;
              mouseClicks = 0;
              mouseMovement = 0;
              
              // Notify renderer
              if (mainWindow) {
                mainWindow.webContents.send('capture-success', { 
                  timestamp: new Date().toISOString() 
                });
              }
              resolve(true);
            } else {
              console.log('[Talio] Upload failed:', json.error);
              resolve(false);
            }
          } catch (e) {
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Talio] Upload error:', err.message);
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  } catch (err) {
    console.error('[Talio] Upload error:', err.message);
    return false;
  }
}

// Screenshot capture loop
function startCapturing() {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
  }

  console.log('[Talio] Starting screenshot capture (1 min interval)');

  // Initial capture after 10 seconds
  setTimeout(async () => {
    if (store.get('isCheckedIn') && hasScreenPermission) {
      const screenshot = await captureScreenshot();
      if (screenshot) await uploadScreenshot(screenshot);
    }
  }, 10000);

  // Regular interval
  screenshotTimer = setInterval(async () => {
    if (!store.get('isCheckedIn')) {
      console.log('[Talio] Not checked in, skipping capture');
      return;
    }
    
    if (!hasScreenPermission) {
      console.log('[Talio] No screen permission, skipping capture');
      return;
    }

    const screenshot = await captureScreenshot();
    if (screenshot) await uploadScreenshot(screenshot);
  }, SCREENSHOT_INTERVAL);
}

function stopCapturing() {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
  console.log('[Talio] Screenshot capture stopped');
}

// ==========================================
// TRAY MENU
// ==========================================

function updateTrayMenu() {
  if (!tray) return;
  
  const isCheckedIn = store.get('isCheckedIn');
  const employeeName = store.get('employeeName') || 'Not logged in';

  const contextMenu = Menu.buildFromTemplate([
    { label: `Talio - ${employeeName}`, enabled: false },
    { type: 'separator' },
    { 
      label: isCheckedIn ? '✓ Checked In (Monitoring Active)' : 'Not Checked In', 
      enabled: false 
    },
    { type: 'separator' },
    { 
      label: 'Open Talio', 
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    { type: 'separator' },
    { label: 'Dashboard', click: () => mainWindow?.loadURL(`${APP_URL}/dashboard`) },
    { label: 'Attendance', click: () => mainWindow?.loadURL(`${APP_URL}/dashboard/attendance`) },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch (err) {
    trayIcon = nativeImage.createEmpty();
  }

  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Talio');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
    }
  });
}

// ==========================================
// MAIN WINDOW
// ==========================================

function createMainWindow() {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } }
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
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() + 0.1) },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomFactor(Math.max(0.5, mainWindow.webContents.getZoomFactor() - 0.1)) },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomFactor(1) },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Load the app
  mainWindow.loadURL(APP_URL);

  // Inject monitoring script when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('Talio');
    mainWindow.show();
    injectMonitoringScript();
  });

  // Handle meeting room URLs - open in browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (MEETING_ROOM_PATTERN.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    
    // External links open in browser
    if (!url.startsWith(APP_URL) && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle new window requests
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Meeting rooms open in browser
    if (MEETING_ROOM_PATTERN.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    if (url.startsWith(APP_URL)) {
      // Check if it's a meeting room
      if (MEETING_ROOM_PATTERN.test(url)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    }
    
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    mainWindow.show();
  });

  // Save window size on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    store.set('windowBounds', mainWindow.getBounds());
  });
}

// Inject monitoring script into web page
function injectMonitoringScript() {
  if (!mainWindow) return;
  
  const script = `
    (function() {
      if (window.__talioInjected) return;
      window.__talioInjected = true;
      
      console.log('[Talio Desktop] Monitoring active');
      
      // Activity tracking
      let lastMouseX = 0, lastMouseY = 0;
      
      document.addEventListener('keydown', () => {
        if (window.electronAPI) window.electronAPI.trackKeystroke();
      });
      
      document.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.trackMouseClick();
      });
      
      document.addEventListener('mousemove', (e) => {
        const distance = Math.sqrt(Math.pow(e.clientX - lastMouseX, 2) + Math.pow(e.clientY - lastMouseY, 2));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (distance > 5 && window.electronAPI) window.electronAPI.trackMouseMove(distance);
      });
      
      // Sync auth from localStorage
      const syncAuth = () => {
        try {
          const token = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');
          if (token && userStr && window.electronAPI) {
            window.electronAPI.setAuthToken(token, JSON.parse(userStr));
          }
        } catch (e) {}
      };
      
      syncAuth();
      setInterval(syncAuth, 5000);
      
      // Intercept fetch for attendance events
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const result = await originalFetch.apply(this, args);
        try {
          const url = args[0]?.url || args[0];
          if (typeof url === 'string' && url.includes('/api/attendance')) {
            const clone = result.clone();
            const data = await clone.json();
            if (data.success && window.electronAPI) {
              const body = args[1]?.body;
              if (body) {
                const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                if (parsed.type === 'clock-in') window.electronAPI.checkIn();
                else if (parsed.type === 'clock-out') window.electronAPI.checkOut();
              }
            }
          }
        } catch (e) {}
        return result;
      };
      
      // Check if already checked in
      setTimeout(async () => {
        try {
          const token = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');
          if (!token || !userStr) return;
          
          const user = JSON.parse(userStr);
          const employeeId = user.employeeId?._id || user.employeeId;
          if (!employeeId) return;
          
          const today = new Date().toISOString().split('T')[0];
          const res = await fetch('/api/attendance?date=' + today + '&employeeId=' + employeeId, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const data = await res.json();
          
          if (data.success) {
            const records = data.attendance || data.data || [];
            if (records[0]?.checkIn && !records[0]?.checkOut && window.electronAPI) {
              window.electronAPI.checkIn();
            }
          }
        } catch (e) {}
      }, 3000);
    })();
  `;
  
  mainWindow.webContents.executeJavaScript(script).catch(() => {});
}

// ==========================================
// IPC HANDLERS
// ==========================================

ipcMain.handle('set-auth-token', async (_, { token, user }) => {
  try {
    let employeeId = user.employeeId?._id || user.employeeId;
    let employeeName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    let employeeCode = user.employeeCode || user.employeeId?.employeeCode || '';
    
    store.set('authToken', token);
    store.set('userId', user._id || user.id);
    store.set('employeeId', employeeId);
    store.set('employeeName', employeeName);
    store.set('employeeCode', employeeCode);
    
    updateTrayMenu();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-auth', async () => {
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
  store.set('isCheckedIn', true);
  await checkScreenPermission();
  startCapturing();
  updateTrayMenu();
  return { success: true };
});

ipcMain.handle('check-out', async () => {
  store.set('isCheckedIn', false);
  stopCapturing();
  updateTrayMenu();
  return { success: true };
});

ipcMain.handle('get-status', async () => {
  return {
    isLoggedIn: !!store.get('authToken'),
    isCheckedIn: store.get('isCheckedIn'),
    employeeName: store.get('employeeName'),
    hasScreenPermission
  };
});

ipcMain.on('activity-keystroke', () => keystrokeCount++);
ipcMain.on('activity-mouse-click', () => mouseClicks++);
ipcMain.on('activity-mouse-move', (_, distance) => mouseMovement += distance);

ipcMain.on('retry-connection', () => mainWindow?.loadURL(APP_URL));

// ==========================================
// AUTO-LAUNCH
// ==========================================

function setupAutoLaunch() {
  try {
    const AutoLaunch = require('auto-launch');
    const autoLauncher = new AutoLaunch({
      name: 'Talio',
      path: app.getPath('exe')
    });
    
    if (store.get('autoLaunch')) {
      autoLauncher.enable().catch(() => {});
    }
  } catch (e) {
    console.log('[Talio] Auto-launch not available');
  }
}

// ==========================================
// APP LIFECYCLE
// ==========================================

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
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

app.whenReady().then(async () => {
  createMainWindow();
  createTray();
  setupAutoLaunch();
  
  // Check permissions
  await checkScreenPermission();
  await requestLocationPermission();
  
  // Resume monitoring if already checked in
  if (store.get('authToken') && store.get('isCheckedIn')) {
    startCapturing();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopCapturing();
});
