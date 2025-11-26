const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('talioDesktop', {
  // Screen capture for productivity monitoring
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // Permission management
  getScreenPermissionStatus: () => ipcRenderer.invoke('get-screen-permission-status'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),
  requestAllPermissions: () => ipcRenderer.invoke('request-all-permissions'),
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),

  // Maya widget control (native widget, not web PIP)
  toggleMayaPIP: (show) => ipcRenderer.invoke('toggle-maya-pip', show),
  openMayaFromBlob: () => ipcRenderer.invoke('open-maya-from-blob'),
  minimizeMayaToBlob: () => ipcRenderer.invoke('minimize-maya-to-blob'),

  // Dot matrix overlay for screen analysis
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),

  // Authentication (sets token and starts monitoring)
  setAuth: (token, user) => ipcRenderer.invoke('set-auth', { token, user }),

  // Push notifications
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', { title, body }),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Check if running in Electron
  isElectron: true,
  platform: process.platform,

  // Event listeners
  onScreenCaptureReady: (callback) => {
    ipcRenderer.on('screen-capture-ready', (event, data) => callback(data));
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
});

// Also expose on window.electronAPI for compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getScreenPermissionStatus: () => ipcRenderer.invoke('get-screen-permission-status'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),
  requestAllPermissions: () => ipcRenderer.invoke('request-all-permissions'),
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),
  openMayaFromBlob: () => ipcRenderer.invoke('open-maya-from-blob'),
  minimizeMayaToBlob: () => ipcRenderer.invoke('minimize-maya-to-blob'),
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),
  setAuth: (token, user) => ipcRenderer.invoke('set-auth', { token, user }),
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', { title, body }),
  isElectron: true
});

