// MAYA Service Worker Installation Script

// Check service worker status
async function checkServiceWorkerStatus() {
  const statusEl = document.getElementById('swStatus');

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');

      if (registration) {
        statusEl.textContent = 'Installed';
        statusEl.className = 'status-value success';
        document.getElementById('installBtn').textContent = 'Reinstall Service Worker';
        return true;
      } else {
        statusEl.textContent = 'Not Installed';
        statusEl.className = 'status-value warning';
        return false;
      }
    } catch (error) {
      statusEl.textContent = 'Error';
      statusEl.className = 'status-value error';
      return false;
    }
  } else {
    statusEl.textContent = 'Not Supported';
    statusEl.className = 'status-value error';
    document.getElementById('installBtn').disabled = true;
    return false;
  }
}

// Detect browser
function detectBrowser() {
  const browserEl = document.getElementById('browserInfo');
  const ua = navigator.userAgent;

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browserEl.textContent = 'Chrome';
    browserEl.className = 'status-value success';
  } else if (ua.includes('Edg')) {
    browserEl.textContent = 'Edge';
    browserEl.className = 'status-value success';
  } else if (ua.includes('Firefox')) {
    browserEl.textContent = 'Firefox';
    browserEl.className = 'status-value warning';
  } else {
    browserEl.textContent = 'Unknown';
    browserEl.className = 'status-value';
  }
}

// Install service worker
document.getElementById('installBtn').addEventListener('click', async () => {
  try {
    const btn = document.getElementById('installBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Installing...';
    btn.disabled = true;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/maya-screen-capture-sw.js', {
        scope: '/'
      });

      console.log('[MAYA] Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      btn.textContent = 'Installed Successfully';

      await checkServiceWorkerStatus();

      setTimeout(() => {
        window.close();
        if (!window.closed) {
          window.location.href = '/dashboard';
        }
      }, 1500);

    } else {
      throw new Error('Service Workers are not supported in this browser');
    }

  } catch (error) {
    console.error('[MAYA] Installation failed:', error);
    alert('Installation failed: ' + error.message);
    const btn = document.getElementById('installBtn');
    btn.textContent = 'Install Service Worker';
    btn.disabled = false;
  }
});

// Close button
document.getElementById('closeBtn').addEventListener('click', () => {
  window.close();
  if (!window.closed) {
    window.location.href = '/dashboard';
  }
});

// Initialize
async function init() {
  detectBrowser();
  const isInstalled = await checkServiceWorkerStatus();

  if (isInstalled) {
    // Auto-close after 2 seconds if already installed
    setTimeout(() => {
      window.close();
      if (!window.closed) {
        window.location.href = '/dashboard';
      }
    }, 2000);
  }
}

init();

// Refresh status every 3 seconds
setInterval(checkServiceWorkerStatus, 3000);

