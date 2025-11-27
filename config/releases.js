/**
 * Talio Desktop App Release Configuration
 * 
 * Update this file when releasing new versions.
 * All download pages will automatically use these URLs.
 */

const RELEASE_CONFIG = {
  version: '1.0.2',
  github: {
    owner: 'avirajsharma-ops',
    repo: 'Tailo'
  },
  downloads: {
    mac: {
      filename: 'Talio-1.0.2-arm64.dmg',
      size: '78 MB',
      arch: 'Apple Silicon (M1/M2/M3/M4)'
    },
    windows: {
      filename: 'Talio-Setup-1.0.2.exe', 
      size: '66 MB',
      arch: '64-bit (x64)'
    }
  }
};

// Generate download URLs from config
const getDownloadUrl = (platform) => {
  const { github, version, downloads } = RELEASE_CONFIG;
  const filename = downloads[platform]?.filename;
  if (!filename) return null;
  return `https://github.com/${github.owner}/${github.repo}/releases/download/v${version}/${filename}`;
};

// Export for use in both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RELEASE_CONFIG, getDownloadUrl };
}

// For browser/ES modules
if (typeof window !== 'undefined') {
  window.RELEASE_CONFIG = RELEASE_CONFIG;
  window.getDownloadUrl = getDownloadUrl;
}

export { RELEASE_CONFIG, getDownloadUrl };

