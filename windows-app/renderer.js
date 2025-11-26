/**
 * Renderer Process - UI Logic
 */

let isTracking = true;
let stats = {
  screenshots: 0,
  windows: 0,
  uptime: 0
};
let startTime = Date.now();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check initial status
  const status = await window.electronAPI.getStatus();
  
  if (status.user) {
    showDashboard(status.user);
    isTracking = status.isTracking;
    updateTrackingButton();
  } else {
    showLogin();
  }

  // Load stats
  loadStats();

  // Start uptime counter
  setInterval(updateUptime, 1000);

  // Set up event listeners
  setupEventListeners();
});

/**
 * Show login screen
 */
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard-screen').style.display = 'none';
}

/**
 * Show dashboard
 */
function showDashboard(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'block';
  document.getElementById('user-email').textContent = user.email;
  updateStatusIndicator();
}

/**
 * Handle login
 */
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');
  const errorDiv = document.getElementById('login-error');

  // Show loading
  loginBtn.querySelector('.btn-text').style.display = 'none';
  loginBtn.querySelector('.btn-loader').style.display = 'inline';
  loginBtn.disabled = true;
  errorDiv.textContent = '';

  try {
    const result = await window.electronAPI.login({ email, password });
    
    if (result.success) {
      const status = await window.electronAPI.getStatus();
      showDashboard(status.user);
      startTime = Date.now();
    } else {
      errorDiv.textContent = result.error || 'Login failed. Please check your credentials.';
    }
  } catch (error) {
    errorDiv.textContent = 'Connection error. Please check your internet connection.';
  } finally {
    loginBtn.querySelector('.btn-text').style.display = 'inline';
    loginBtn.querySelector('.btn-loader').style.display = 'none';
    loginBtn.disabled = false;
  }
});

/**
 * Handle logout
 */
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await window.electronAPI.logout();
  showLogin();
  stats = { screenshots: 0, windows: 0, uptime: 0 };
  updateStats();
});

/**
 * Toggle tracking
 */
document.getElementById('toggle-tracking-btn')?.addEventListener('click', async () => {
  const result = await window.electronAPI.toggleTracking();
  isTracking = result.isTracking;
  updateTrackingButton();
  updateStatusIndicator();
});

/**
 * Open web dashboard
 */
document.getElementById('open-dashboard-btn')?.addEventListener('click', () => {
  require('electron').shell.openExternal('https://app.tailo.work/dashboard/maya/activity-history');
});

/**
 * Update tracking button
 */
function updateTrackingButton() {
  const btn = document.getElementById('toggle-tracking-btn');
  const text = document.getElementById('toggle-btn-text');
  
  if (isTracking) {
    text.textContent = 'Pause Tracking';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  } else {
    text.textContent = 'Resume Tracking';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  }
}

/**
 * Update status indicator
 */
function updateStatusIndicator() {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  
  if (isTracking) {
    statusDot.classList.remove('status-paused');
    statusDot.classList.add('status-active');
    statusText.textContent = 'Monitoring Active';
  } else {
    statusDot.classList.remove('status-active');
    statusDot.classList.add('status-paused');
    statusText.textContent = 'Monitoring Paused';
  }
}

/**
 * Load and update stats
 */
async function loadStats() {
  const savedStats = await window.electronAPI.getStats();
  stats = { ...stats, ...savedStats };
  updateStats();
}

function updateStats() {
  document.getElementById('screenshot-count').textContent = stats.screenshots;
  document.getElementById('window-count').textContent = stats.windows;
}

/**
 * Update uptime
 */
function updateUptime() {
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  document.getElementById('uptime').textContent = `${hours}h ${minutes}m`;
}

/**
 * Add activity to feed
 */
function addActivityToFeed(type, data) {
  const feed = document.getElementById('activity-feed');
  const emptyState = feed.querySelector('.empty-state');
  
  if (emptyState) {
    emptyState.remove();
  }

  const item = document.createElement('div');
  item.className = 'activity-item';
  
  const time = new Date().toLocaleTimeString();
  
  if (type === 'screenshot') {
    item.innerHTML = `
      <div class="activity-icon">📸</div>
      <div class="activity-content">
        <div class="activity-title">Screenshot Captured</div>
        <div class="activity-meta">${data.app} • ${time}</div>
      </div>
    `;
    stats.screenshots++;
  } else if (type === 'window') {
    item.innerHTML = `
      <div class="activity-icon">🪟</div>
      <div class="activity-content">
        <div class="activity-title">Window Changed</div>
        <div class="activity-meta">${data.app} • ${time}</div>
      </div>
    `;
    stats.windows++;
    document.getElementById('current-app').textContent = data.app;
  }

  feed.insertBefore(item, feed.firstChild);

  // Keep only last 10 items
  while (feed.children.length > 10) {
    feed.removeChild(feed.lastChild);
  }

  updateStats();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Listen for screenshot captured
  window.electronAPI.onScreenshotCaptured((event, data) => {
    addActivityToFeed('screenshot', data);
  });

  // Listen for window changed
  window.electronAPI.onWindowChanged((event, data) => {
    addActivityToFeed('window', data);
  });

  // Listen for show login
  window.electronAPI.onShowLogin(() => {
    showLogin();
  });

  // Listen for navigation
  window.electronAPI.onNavigate((event, page) => {
    // Handle navigation if needed
  });
}
