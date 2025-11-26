/**
 * Preload script - Bridge between main and renderer processes
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),

  // Status
  getStatus: () => ipcRenderer.invoke('get-status'),
  toggleTracking: () => ipcRenderer.invoke('toggle-tracking'),
  getStats: () => ipcRenderer.invoke('get-stats'),

  // Permission management
  requestAllPermissions: () => ipcRenderer.invoke('request-all-permissions'),
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),

  // Maya widget controls
  openMayaFromBlob: () => ipcRenderer.invoke('open-maya-from-blob'),
  minimizeMayaToBlob: () => ipcRenderer.invoke('minimize-maya-to-blob'),
  toggleMayaPIP: (show) => ipcRenderer.invoke('toggle-maya-pip', show),
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),

  // Authentication (sets token and starts monitoring)
  setAuth: (token, user) => ipcRenderer.invoke('set-auth', { token, user }),

  // Push notifications
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', { title, body }),

  // Events
  onShowLogin: (callback) => ipcRenderer.on('show-login', callback),
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', callback),
  onWindowChanged: (callback) => ipcRenderer.on('window-changed', callback),
  onNavigate: (callback) => ipcRenderer.on('navigate', callback),

  // Electron detection
  isElectron: true,
  platform: process.platform
});

// Also expose as talioDesktop for compatibility with web app
contextBridge.exposeInMainWorld('talioDesktop', {
  openMayaFromBlob: () => ipcRenderer.invoke('open-maya-from-blob'),
  minimizeMayaToBlob: () => ipcRenderer.invoke('minimize-maya-to-blob'),
  toggleMayaPIP: (show) => ipcRenderer.invoke('toggle-maya-pip', show),
  requestAllPermissions: () => ipcRenderer.invoke('request-all-permissions'),
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),
  setAuth: (token, user) => ipcRenderer.invoke('set-auth', { token, user }),
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', { title, body }),
  isElectron: true,
  platform: process.platform
});
