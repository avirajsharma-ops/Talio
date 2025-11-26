/**
 * Maya Native Module - Handles all Maya AI assistant functionality
 * - Wake word detection using native speech recognition
 * - Native transparent widget rendering
 * - Screen analysis with dot matrix overlay
 * - Activity monitoring and summarization
 */

const { BrowserWindow, screen, ipcMain, Notification, desktopCapturer, nativeImage, systemPreferences } = require('electron');
const path = require('path');
const axios = require('axios');

// Configuration
const MAYA_CONFIG = {
  API_URL: 'https://app.talio.in',
  WAKE_WORD: 'hey maya',
  SCREENSHOT_INTERVAL: 30 * 60 * 1000, // 30 minutes
  ACTIVITY_SYNC_INTERVAL: 60 * 1000, // 1 minute
  KEYSTROKE_BUFFER_SIZE: 100
};

// State
let mayaWidgetWindow = null;
let dotMatrixOverlay = null;
let wakeWordEnabled = true;
let isListening = false;
let authToken = null;
let currentUser = null;

// Activity tracking buffers
let keystrokeBuffer = [];
let appUsageBuffer = [];
let browserHistoryBuffer = [];
let screenshotTimer = null;
let activitySyncTimer = null;

/**
 * Initialize Maya Native Module
 */
function initialize(token, user) {
  authToken = token;
  currentUser = user;
  console.log('[Maya] Initialized with user:', user?.name || 'Unknown');
}

/**
 * Create the native Maya widget window
 */
function createMayaWidget() {
  if (mayaWidgetWindow) {
    mayaWidgetWindow.show();
    mayaWidgetWindow.focus();
    return mayaWidgetWindow;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const widgetWidth = 400;
  const widgetHeight = 550;

  mayaWidgetWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: width - widgetWidth - 20,
    y: height - widgetHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'maya-preload.js')
    },
    show: false
  });

  mayaWidgetWindow.loadFile(path.join(__dirname, '..', 'maya-widget.html'));

  mayaWidgetWindow.once('ready-to-show', () => {
    mayaWidgetWindow.show();
    // Send auth info to widget
    if (authToken && currentUser) {
      mayaWidgetWindow.webContents.send('maya-auth', { token: authToken, user: currentUser });
    }
  });

  mayaWidgetWindow.on('closed', () => {
    mayaWidgetWindow = null;
  });

  return mayaWidgetWindow;
}

/**
 * Create fullscreen dot matrix overlay
 */
function createDotMatrixOverlay() {
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  dotMatrixOverlay.setIgnoreMouseEvents(true);
  dotMatrixOverlay.loadFile(path.join(__dirname, '..', 'dot-matrix-overlay.html'));

  dotMatrixOverlay.on('closed', () => {
    dotMatrixOverlay = null;
  });

  return dotMatrixOverlay;
}

/**
 * Show dot matrix scanning animation
 */
function showDotMatrixScan() {
  const overlay = createDotMatrixOverlay();
  overlay.show();
  overlay.webContents.executeJavaScript('window.startScan()').catch(() => {});
}

/**
 * Hide dot matrix with fade animation
 */
function hideDotMatrixScan() {
  if (dotMatrixOverlay) {
    dotMatrixOverlay.webContents.executeJavaScript('window.stopScan()').catch(() => {});
    setTimeout(() => {
      if (dotMatrixOverlay) {
        dotMatrixOverlay.hide();
      }
    }, 1200);
  }
}

/**
 * Capture screenshot and summarize with AI
 */
async function captureAndSummarize() {
  try {
    if (!authToken) return;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length === 0) return;

    const screenshot = sources[0].thumbnail.toDataURL();

    // Send to API for summarization and storage
    const response = await axios.post(`${MAYA_CONFIG.API_URL}/api/monitoring/screenshot`, {
      screenshot: screenshot,
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('[Maya] Screenshot captured and summarized');
    return response.data;
  } catch (error) {
    console.error('[Maya] Screenshot capture error:', error.message);
  }
}

/**
 * Start periodic screenshot monitoring
 */
function startScreenMonitoring() {
  if (screenshotTimer) return;

  // Capture immediately
  captureAndSummarize();

  // Then every 30 minutes
  screenshotTimer = setInterval(captureAndSummarize, MAYA_CONFIG.SCREENSHOT_INTERVAL);
  console.log('[Maya] Screen monitoring started (30 min intervals)');
}

/**
 * Stop screenshot monitoring
 */
function stopScreenMonitoring() {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
    console.log('[Maya] Screen monitoring stopped');
  }
}

/**
 * Record keystroke (count only, not content for privacy)
 */
function recordKeystroke(keyInfo) {
  const timestamp = new Date().toISOString();
  keystrokeBuffer.push({
    timestamp,
    app: keyInfo.app || 'unknown',
    count: 1
  });

  // Keep buffer manageable
  if (keystrokeBuffer.length > MAYA_CONFIG.KEYSTROKE_BUFFER_SIZE) {
    keystrokeBuffer = keystrokeBuffer.slice(-MAYA_CONFIG.KEYSTROKE_BUFFER_SIZE);
  }
}

/**
 * Record app usage
 */
function recordAppUsage(appInfo) {
  const timestamp = new Date().toISOString();
  appUsageBuffer.push({
    timestamp,
    app: appInfo.name,
    title: appInfo.title,
    duration: appInfo.duration || 0
  });
}

/**
 * Sync activity data to server
 */
async function syncActivityData() {
  if (!authToken || (keystrokeBuffer.length === 0 && appUsageBuffer.length === 0)) return;

  try {
    await axios.post(`${MAYA_CONFIG.API_URL}/api/monitoring/activity`, {
      keystrokes: keystrokeBuffer,
      appUsage: appUsageBuffer,
      browserHistory: browserHistoryBuffer,
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    // Clear buffers after successful sync
    keystrokeBuffer = [];
    appUsageBuffer = [];
    browserHistoryBuffer = [];
    console.log('[Maya] Activity data synced');
  } catch (error) {
    console.error('[Maya] Activity sync error:', error.message);
  }
}

/**
 * Start activity tracking sync
 */
function startActivitySync() {
  if (activitySyncTimer) return;
  activitySyncTimer = setInterval(syncActivityData, MAYA_CONFIG.ACTIVITY_SYNC_INTERVAL);
  console.log('[Maya] Activity sync started');
}

/**
 * Stop activity sync
 */
function stopActivitySync() {
  if (activitySyncTimer) {
    clearInterval(activitySyncTimer);
    activitySyncTimer = null;
  }
}

/**
 * Send native push notification
 */
function sendNotification(title, body, options = {}) {
  const notification = new Notification({
    title: title,
    body: body,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    urgency: options.urgency || 'normal',
    timeoutType: options.timeout || 'default',
    silent: options.silent || false
  });

  notification.on('click', () => {
    if (options.onClick) options.onClick();
  });

  notification.show();
  return notification;
}

/**
 * Get Maya widget window
 */
function getMayaWidget() {
  return mayaWidgetWindow;
}

/**
 * Hide Maya widget
 */
function hideMayaWidget() {
  if (mayaWidgetWindow) {
    mayaWidgetWindow.hide();
  }
}

/**
 * Set auth credentials
 */
function setAuth(token, user) {
  authToken = token;
  currentUser = user;
  if (mayaWidgetWindow) {
    mayaWidgetWindow.webContents.send('maya-auth', { token, user });
  }
}

// Export functions
module.exports = {
  initialize,
  createMayaWidget,
  getMayaWidget,
  hideMayaWidget,
  createDotMatrixOverlay,
  showDotMatrixScan,
  hideDotMatrixScan,
  captureAndSummarize,
  startScreenMonitoring,
  stopScreenMonitoring,
  recordKeystroke,
  recordAppUsage,
  syncActivityData,
  startActivitySync,
  stopActivitySync,
  sendNotification,
  setAuth,
  MAYA_CONFIG
};

