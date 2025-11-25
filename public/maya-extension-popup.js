// MAYA Extension Popup Script

console.log('[MAYA Extension Popup] Loaded');

// Get DOM elements
const captureBtn = document.getElementById('captureBtn');
const openDashboard = document.getElementById('openDashboard');

// Capture screen button
captureBtn.addEventListener('click', async () => {
  try {
    console.log('[MAYA Extension Popup] Capture button clicked');
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      alert('No active tab found');
      return;
    }
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'TRIGGER_CAPTURE',
      data: {}
    });
    
    if (response.success) {
      console.log('[MAYA Extension Popup] Screenshot captured successfully');
      
      // Show success message
      captureBtn.textContent = '✅ Captured!';
      captureBtn.style.background = '#4ade80';
      captureBtn.style.color = 'white';
      
      setTimeout(() => {
        captureBtn.textContent = '📸 Capture Screen';
        captureBtn.style.background = 'white';
        captureBtn.style.color = '#667eea';
      }, 2000);
      
    } else {
      throw new Error(response.error || 'Capture failed');
    }
    
  } catch (error) {
    console.error('[MAYA Extension Popup] Capture error:', error);
    
    captureBtn.textContent = '❌ Failed';
    captureBtn.style.background = '#ef4444';
    captureBtn.style.color = 'white';
    
    setTimeout(() => {
      captureBtn.textContent = '📸 Capture Screen';
      captureBtn.style.background = 'white';
      captureBtn.style.color = '#667eea';
    }, 2000);
  }
});

// Open dashboard button
openDashboard.addEventListener('click', async () => {
  try {
    console.log('[MAYA Extension Popup] Opening dashboard...');
    
    // Get the current tab to determine the base URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    let dashboardUrl = 'http://localhost:3000/dashboard';
    
    if (tab && tab.url) {
      const url = new URL(tab.url);
      if (url.hostname.includes('talio.in') || url.hostname.includes('zenova.sbs')) {
        dashboardUrl = `${url.origin}/dashboard`;
      }
    }
    
    // Open dashboard in new tab
    await chrome.tabs.create({ url: dashboardUrl });
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('[MAYA Extension Popup] Error opening dashboard:', error);
  }
});

// Check extension status on load
async function checkStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const isTalioPage = url.hostname.includes('talio.in') || 
                          url.hostname.includes('zenova.sbs') || 
                          url.hostname === 'localhost';
      
      if (!isTalioPage) {
        captureBtn.disabled = true;
        captureBtn.textContent = '⚠️ Not on Talio HRMS';
        captureBtn.style.opacity = '0.5';
      }
    }
    
  } catch (error) {
    console.error('[MAYA Extension Popup] Status check error:', error);
  }
}

// Run status check on load
checkStatus();

console.log('[MAYA Extension Popup] Ready');

