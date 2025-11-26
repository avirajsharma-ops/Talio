/**
 * Talio Activity Monitor - Background Service Worker
 * Coordinates all activity tracking: keyboard, mouse, windows, screenshots
 */

// Configuration
const CONFIG = {
  API_URL: 'https://app.tailo.work', // Change for production
  SCREENSHOT_INTERVAL: 30000, // 30 seconds
  ACTIVITY_BATCH_INTERVAL: 5000, // Send activity every 5 seconds
  IDLE_THRESHOLD: 30, // seconds
  MAX_BATCH_SIZE: 100
};

// State management
let currentSession = null;
let activityBuffer = {
  keystrokes: [],
  mouse: [],
  windows: [],
  lastFlush: Date.now()
};
let currentWindowInfo = {
  title: '',
  url: '',
  domain: '',
  focusStart: null
};
let isTracking = false;
let userInfo = null;
let authToken = null;

/**
 * Initialize extension on install/startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🚀 Talio Activity Monitor installed/updated');
  
  // Create alarms for periodic tasks
  chrome.alarms.create('screenshot-capture', {
    periodInMinutes: CONFIG.SCREENSHOT_INTERVAL / 60000
  });
  
  chrome.alarms.create('activity-flush', {
    periodInMinutes: CONFIG.ACTIVITY_BATCH_INTERVAL / 60000
  });
  
  // Set badge to show monitoring status
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  
  await initializeTracking();
});

/**
 * Initialize tracking session
 */
async function initializeTracking() {
  try {
    // Get stored auth info
    const stored = await chrome.storage.local.get(['talioAuthToken', 'talioUserInfo']);
    
    if (stored.talioAuthToken && stored.talioUserInfo) {
      authToken = stored.talioAuthToken;
      userInfo = stored.talioUserInfo;
      currentSession = `session_${userInfo._id}_${Date.now()}`;
      isTracking = true;
      
      console.log('✅ Tracking initialized for user:', userInfo.email);
      
      // Start window tracking
      startWindowTracking();
      
      // Notify content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TRACKING_STARTED',
            session: currentSession
          }).catch(() => {}); // Ignore errors for tabs without content script
        });
      });
    } else {
      console.warn('⚠️ No authentication found. Tracking disabled.');
      isTracking = false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize tracking:', error);
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTracking) {
    sendResponse({ success: false, error: 'Tracking not initialized' });
    return true;
  }
  
  switch (message.type) {
    case 'AUTH_UPDATE':
      authToken = message.token;
      userInfo = message.user;
      chrome.storage.local.set({
        talioAuthToken: message.token,
        talioUserInfo: message.user
      });
      initializeTracking();
      sendResponse({ success: true });
      break;
      
    case 'KEYSTROKE_BATCH':
      activityBuffer.keystrokes.push(...message.data);
      checkBufferSize();
      sendResponse({ success: true });
      break;
      
    case 'MOUSE_BATCH':
      activityBuffer.mouse.push(...message.data);
      checkBufferSize();
      sendResponse({ success: true });
      break;
      
    case 'GET_SESSION':
      sendResponse({ session: currentSession, user: userInfo });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true;
});

/**
 * Window/Tab tracking
 */
function startWindowTracking() {
  // Track active tab changes
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleWindowSwitch(tab);
  });
  
  // Track tab updates (URL changes)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      handleWindowSwitch(tab);
    }
  });
  
  // Track window focus changes
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Lost focus
      handleWindowBlur();
    } else {
      const tabs = await chrome.tabs.query({ active: true, windowId });
      if (tabs[0]) {
        handleWindowSwitch(tabs[0]);
      }
    }
  });
}

/**
 * Handle window/tab switch
 */
function handleWindowSwitch(tab) {
  if (!isTracking) return;
  
  const now = new Date();
  
  // Save previous window activity
  if (currentWindowInfo.focusStart) {
    const timeSpent = now - new Date(currentWindowInfo.focusStart);
    
    activityBuffer.windows.push({
      windowTitle: currentWindowInfo.title,
      url: currentWindowInfo.url,
      domain: currentWindowInfo.domain,
      focusStartTime: currentWindowInfo.focusStart,
      focusEndTime: now.toISOString(),
      timeSpent,
      sessionId: currentSession
    });
  }
  
  // Update current window
  currentWindowInfo = {
    title: tab.title || 'Unknown',
    url: tab.url || '',
    domain: extractDomain(tab.url),
    focusStart: now.toISOString()
  };
  
  checkBufferSize();
}

/**
 * Handle window blur (lost focus)
 */
function handleWindowBlur() {
  if (!isTracking || !currentWindowInfo.focusStart) return;
  
  const now = new Date();
  const timeSpent = now - new Date(currentWindowInfo.focusStart);
  
  activityBuffer.windows.push({
    windowTitle: currentWindowInfo.title,
    url: currentWindowInfo.url,
    domain: currentWindowInfo.domain,
    focusStartTime: currentWindowInfo.focusStart,
    focusEndTime: now.toISOString(),
    timeSpent,
    sessionId: currentSession
  });
  
  currentWindowInfo.focusStart = null;
  checkBufferSize();
}

/**
 * Screenshot capture
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!isTracking) return;
  
  if (alarm.name === 'screenshot-capture') {
    captureScreenshot();
  } else if (alarm.name === 'activity-flush') {
    flushActivityBuffer();
  }
});

/**
 * Capture screenshot and send to API
 */
async function captureScreenshot() {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    // Capture visible tab
    const screenshot = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90
    });
    
    // Get current window info
    const windowTitle = tab.title || 'Unknown';
    const url = tab.url || '';
    const domain = extractDomain(url);
    
    // Send to API
    await sendToAPI('/api/activity/screenshot', {
      screenshot,
      capturedAt: new Date().toISOString(),
      windowTitle,
      url,
      domain,
      sessionId: currentSession
    });
    
    console.log('📸 Screenshot captured:', domain);
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
  }
}

/**
 * Check if buffer needs flushing
 */
function checkBufferSize() {
  const totalSize = activityBuffer.keystrokes.length + 
                   activityBuffer.mouse.length + 
                   activityBuffer.windows.length;
  
  if (totalSize >= CONFIG.MAX_BATCH_SIZE) {
    flushActivityBuffer();
  }
}

/**
 * Flush activity buffer to API
 */
async function flushActivityBuffer() {
  if (!isTracking) return;
  
  const buffer = { ...activityBuffer };
  const hasData = buffer.keystrokes.length > 0 || 
                  buffer.mouse.length > 0 || 
                  buffer.windows.length > 0;
  
  if (!hasData) return;
  
  // Reset buffer
  activityBuffer = {
    keystrokes: [],
    mouse: [],
    windows: [],
    lastFlush: Date.now()
  };
  
  try {
    await sendToAPI('/api/activity/batch', buffer);
    console.log('📤 Activity batch sent:', {
      keystrokes: buffer.keystrokes.length,
      mouse: buffer.mouse.length,
      windows: buffer.windows.length
    });
  } catch (error) {
    console.error('❌ Failed to send activity batch:', error);
    // Re-add to buffer on failure
    activityBuffer.keystrokes.push(...buffer.keystrokes);
    activityBuffer.mouse.push(...buffer.mouse);
    activityBuffer.windows.push(...buffer.windows);
  }
}

/**
 * Send data to API
 */
async function sendToAPI(endpoint, data) {
  if (!authToken) {
    throw new Error('No authentication token');
  }
  
  const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Handle idle state
 */
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    handleWindowBlur();
  } else if (state === 'active') {
    // Resume tracking
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension startup - initializing tracking');
  initializeTracking();
});

console.log('✅ Talio Activity Monitor background service loaded');
