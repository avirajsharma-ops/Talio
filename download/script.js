/**
 * Talio Download Page Script
 * Handles OS detection and download switching
 */

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
  const win32Link = document.getElementById('win32Link');

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

  // Detect Windows architecture
  function detectWindowsArch() {
    const userAgent = navigator.userAgent;
    
    // Check for 64-bit indicators
    if (userAgent.includes('Win64') || 
        userAgent.includes('x64') || 
        userAgent.includes('WOW64') ||
        userAgent.includes('AMD64')) {
      return 'x64';
    }
    
    // Check platform for ARM
    if (navigator.platform === 'ARM' || userAgent.includes('ARM')) {
      return 'arm64';
    }
    
    // Default to 32-bit for older systems
    return 'ia32';
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
      
      // Set correct architecture download
      updateWindowsDownload();
    }
  }

  // Update Windows download based on architecture
  function updateWindowsDownload() {
    const arch = detectWindowsArch();
    
    if (arch === 'x64') {
      archBadge.textContent = '64-bit (x64)';
      mainDownloadBtn.href = 'releases/windows/Talio-Setup-1.0.0-x64.exe';
      downloadText.textContent = 'Download for Windows (64-bit)';
      fileInfo.textContent = 'Installer • ~84 MB';
      win32Link.style.display = 'inline';
    } else {
      archBadge.textContent = '32-bit (x86)';
      mainDownloadBtn.href = 'releases/windows/Talio-Setup-1.0.0-ia32.exe';
      downloadText.textContent = 'Download for Windows (32-bit)';
      fileInfo.textContent = 'Installer • ~74 MB';
      win32Link.style.display = 'none'; // Hide 32-bit link since it's the main download
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
  document.querySelectorAll('.download-btn, .arch-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      console.log('Download initiated:', href);
      
      // You can add analytics tracking here
      // gtag('event', 'download', { 'file': href });
    });
  });
});

