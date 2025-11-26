// MAYA Extension Content Script
// Injected into Talio HRMS pages to enable screen capture functionality

console.log('[MAYA Extension] Content script loaded');

// Listen for messages from the extension background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[MAYA Extension] Message received:', message);
  
  const { type, data } = message;
  
  switch (type) {
    case 'TRIGGER_CAPTURE':
      triggerScreenCapture(data).then(sendResponse);
      return true; // Keep channel open for async response
      
    case 'SHOW_PERMISSION_DIALOG':
      showPermissionDialog(data).then(sendResponse);
      return true;
      
    case 'GET_PAGE_INFO':
      sendResponse(getPageInfo());
      break;
      
    default:
      console.log('[MAYA Extension] Unknown message type:', type);
  }
});

// Trigger screen capture using chrome.desktopCapture API
async function triggerScreenCapture(data) {
  try {
    console.log('[MAYA Extension] Triggering screen capture...');
    
    // Request desktop capture
    const streamId = await new Promise((resolve, reject) => {
      chrome.desktopCapture.chooseDesktopMedia(
        ['screen', 'window', 'tab'],
        (streamId) => {
          if (streamId) {
            resolve(streamId);
          } else {
            reject(new Error('User cancelled screen capture'));
          }
        }
      );
    });
    
    // Get media stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
          maxWidth: 1920,
          maxHeight: 1080
        }
      }
    });
    
    // Capture frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    
    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const screenshot = canvas.toDataURL('image/jpeg', 0.8);
    
    // Stop stream
    stream.getTracks().forEach(track => track.stop());
    
    console.log('[MAYA Extension] Screenshot captured successfully');
    
    return {
      success: true,
      screenshot,
      pageInfo: getPageInfo()
    };
    
  } catch (error) {
    console.error('[MAYA Extension] Screen capture error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Show permission dialog
async function showPermissionDialog(data) {
  try {
    const { requestedBy, requestId } = data;
    
    // Trigger MAYA to show permission dialog
    if (window.mayaShowPanel) {
      window.mayaShowPanel();
    }
    
    // Dispatch custom event for MAYA to handle
    window.dispatchEvent(new CustomEvent('maya:screen-capture-request', {
      detail: {
        requestId,
        requestedBy
      }
    }));
    
    return { success: true };
    
  } catch (error) {
    console.error('[MAYA Extension] Permission dialog error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get current page information
function getPageInfo() {
  return {
    url: window.location.href,
    title: document.title,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  };
}

// Notify background script that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href
});

console.log('[MAYA Extension] Content script ready');

