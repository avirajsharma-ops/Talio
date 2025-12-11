/**
 * Talio Download Page Script
 * Handles OS and architecture detection with auto-selection of best download
 * Downloads are served from GitHub Releases
 */

// ============================================
// RELEASE CONFIGURATION - Update for new releases
// ============================================
const RELEASE_VERSION = '1.0.6';

// Direct download URLs from GitHub Releases
const DOWNLOADS = {
  mac: {
    arm64: {
      url: 'https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.6/Talio-1.0.6-arm64.dmg',
      filename: 'Talio-1.0.6-arm64.dmg',
      label: 'Apple Silicon (M1/M2/M3/M4)',
      size: '~100 MB',
      altLabel: 'Intel (x64)'
    },
    x64: {
      url: 'https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.6/Talio-1.0.6-x64.dmg',
      filename: 'Talio-1.0.6-x64.dmg',
      label: 'Intel (x64)',
      size: '~105 MB',
      altLabel: 'Apple Silicon'
    }
  },
  windows: {
    universal: {
      url: 'https://github.com/avirajsharma-ops/Talio/releases/download/v1.0.6/Talio-1.0.6-x64.exe',
      filename: 'Talio-1.0.6-x64.exe',
      label: 'Windows 64-bit',
      size: '~86 MB'
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const macBtn = document.getElementById('macBtn');
  const windowsBtn = document.getElementById('windowsBtn');
  const macDownload = document.getElementById('macDownload');
  const windowsDownload = document.getElementById('windowsDownload');
  const macReq = document.getElementById('macReq');
  const windowsReq = document.getElementById('windowsReq');

  // Mac elements
  const macArchBadge = document.getElementById('macArchBadge');
  const macDownloadBtn = document.getElementById('macDownloadBtn');
  const macDownloadText = document.getElementById('macDownloadText');
  const macFileInfo = document.getElementById('macFileInfo');
  const macAltLink = document.getElementById('macAltLink');
  const macVersion = document.getElementById('macVersion');

  // Windows elements
  const winArchBadge = document.getElementById('winArchBadge');
  const winDownloadBtn = document.getElementById('winDownloadBtn');
  const winDownloadText = document.getElementById('winDownloadText');
  const winFileInfo = document.getElementById('winFileInfo');
  const winVersion = document.getElementById('winVersion');

  // Set version numbers
  if (macVersion) macVersion.textContent = `Version ${RELEASE_VERSION}`;
  if (winVersion) winVersion.textContent = `Version ${RELEASE_VERSION}`;

  // Detect operating system
  function detectOS() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('mac') || userAgent.includes('mac')) {
      return 'mac';
    } else if (platform.includes('win') || userAgent.includes('win')) {
      return 'windows';
    }
    return 'mac'; // Default to mac
  }

  // Detect Mac architecture (Apple Silicon vs Intel)
  function detectMacArch() {
    // Check for Apple Silicon indicators
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Apple GPU indicates Apple Silicon
        if (renderer && renderer.includes('Apple')) {
          return 'arm64';
        }
      }
    }

    // Check platform for ARM indicators
    if (navigator.platform === 'MacIntel') {
      // Could be Intel or Rosetta on Apple Silicon
      // Check userAgentData if available (more reliable)
      if (navigator.userAgentData && navigator.userAgentData.platform === 'macOS') {
        // Modern browsers might indicate architecture
        return 'arm64'; // Default to arm64 for newer Macs
      }
    }

    // Default to arm64 for newer Macs (most common now)
    return 'arm64';
  }

  // Update Mac download UI
  function updateMacDownload(arch) {
    const primary = DOWNLOADS.mac[arch];
    const altArch = arch === 'arm64' ? 'x64' : 'arm64';
    const alt = DOWNLOADS.mac[altArch];

    if (macArchBadge) macArchBadge.textContent = primary.label;
    if (macDownloadBtn) {
      macDownloadBtn.href = primary.url;
      macDownloadBtn.setAttribute('download', primary.filename);
    }
    if (macDownloadText) macDownloadText.textContent = `Download for macOS (${primary.label})`;
    if (macFileInfo) macFileInfo.textContent = `DMG installer • ${primary.size}`;
    if (macAltLink) {
      macAltLink.href = alt.url;
      macAltLink.setAttribute('download', alt.filename);
      macAltLink.textContent = alt.label;
    }
  }

  // Update Windows download UI - single universal installer
  function updateWindowsDownload() {
    const installer = DOWNLOADS.windows.universal;

    if (winArchBadge) winArchBadge.textContent = installer.label;
    if (winDownloadBtn) {
      winDownloadBtn.href = installer.url;
      winDownloadBtn.setAttribute('download', installer.filename);
    }
    if (winDownloadText) winDownloadText.textContent = 'Download for Windows';
    if (winFileInfo) winFileInfo.textContent = `Universal Installer • ${installer.size} • Works on all Windows`;
  }

  // Switch to OS
  function switchToOS(os) {
    if (os === 'mac') {
      macBtn.classList.add('active');
      windowsBtn.classList.remove('active');
      macDownload.classList.remove('hidden');
      windowsDownload.classList.add('hidden');
      if (macReq) macReq.classList.remove('hidden');
      if (windowsReq) windowsReq.classList.add('hidden');
    } else {
      macBtn.classList.remove('active');
      windowsBtn.classList.add('active');
      macDownload.classList.add('hidden');
      windowsDownload.classList.remove('hidden');
      if (macReq) macReq.classList.add('hidden');
      if (windowsReq) windowsReq.classList.remove('hidden');
    }
  }

  // Event listeners
  macBtn.addEventListener('click', function() {
    switchToOS('mac');
  });

  windowsBtn.addEventListener('click', function() {
    switchToOS('windows');
  });

  // Initialize on page load
  const detectedOS = detectOS();
  const macArch = detectMacArch();

  // Update download buttons
  updateMacDownload(macArch);
  updateWindowsDownload();

  // Switch to detected OS
  switchToOS(detectedOS);

  // Track download clicks (analytics)
  document.querySelectorAll('.download-btn, .arch-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      console.log('Download initiated:', href);

      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'download', {
          'event_category': 'Desktop App',
          'event_label': href
        });
      }
    });
  });
});

