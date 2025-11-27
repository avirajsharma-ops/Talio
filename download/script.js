/**
 * Talio Download Page Script
 * Handles OS detection and download switching
 * Downloads are served from GitHub Releases
 */

// GitHub Release URLs - Update these when releasing new versions
const RELEASE_VERSION = '1.0.2';
const GITHUB_RELEASE_BASE = 'https://github.com/avirajsharma-ops/Tailo/releases/download/v' + RELEASE_VERSION;
const DOWNLOAD_URLS = {
  mac: GITHUB_RELEASE_BASE + '/Talio-' + RELEASE_VERSION + '-arm64.dmg',
  windows: GITHUB_RELEASE_BASE + '/Talio-Setup-' + RELEASE_VERSION + '.exe'
};

document.addEventListener('DOMContentLoaded', function() {
  const macBtn = document.getElementById('macBtn');
  const windowsBtn = document.getElementById('windowsBtn');
  const macDownload = document.getElementById('macDownload');
  const windowsDownload = document.getElementById('windowsDownload');
  const macReq = document.getElementById('macReq');
  const windowsReq = document.getElementById('windowsReq');
  const archBadge = document.getElementById('archBadge');
  const mainDownloadBtn = document.getElementById('mainDownloadBtn');
  const downloadText = document.getElementById('downloadText');
  const fileInfo = document.getElementById('fileInfo');

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

  // Switch to OS
  function switchToOS(os) {
    if (os === 'mac') {
      macBtn.classList.add('active');
      windowsBtn.classList.remove('active');
      macDownload.classList.remove('hidden');
      windowsDownload.classList.add('hidden');
      macReq.classList.remove('hidden');
      windowsReq.classList.add('hidden');
    } else {
      macBtn.classList.remove('active');
      windowsBtn.classList.add('active');
      macDownload.classList.add('hidden');
      windowsDownload.classList.remove('hidden');
      macReq.classList.add('hidden');
      windowsReq.classList.remove('hidden');
    }
  }

  // Event listeners
  macBtn.addEventListener('click', function() {
    switchToOS('mac');
  });

  windowsBtn.addEventListener('click', function() {
    switchToOS('windows');
  });

  // Auto-detect and switch on page load
  const detectedOS = detectOS();
  switchToOS(detectedOS);

  // Track download clicks (analytics)
  document.querySelectorAll('.download-btn').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      console.log('Download initiated:', href);

      // You can add analytics tracking here
      // gtag('event', 'download', { 'file': href });
    });
  });
});

