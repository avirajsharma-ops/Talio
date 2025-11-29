const { contextBridge, ipcRenderer } = require('electron');

// Expose Maya Bridge to renderer for Maya widget
contextBridge.exposeInMainWorld('mayaBridge', {
  // Widget controls
  closeWidget: () => ipcRenderer.invoke('maya-close-widget'),
  minimizeWidget: () => ipcRenderer.invoke('maya-minimize-widget'),
  expandWidget: () => ipcRenderer.invoke('open-maya-from-blob'),
  
  // Get widget state (minimized or expanded)
  getWidgetState: () => ipcRenderer.invoke('maya-get-widget-state'),

  // Dot matrix overlay
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),

  // Screenshot for screen analysis - now handles widget hiding automatically
  captureScreen: () => ipcRenderer.invoke('maya-capture-screen'),
  
  // Check if screen capture permission is granted (without triggering prompt)
  checkScreenPermission: () => ipcRenderer.invoke('maya-check-screen-permission'),

  // Authentication
  onAuth: (callback) => {
    ipcRenderer.on('maya-auth', (event, data) => callback(data));
  },

  // Send notification
  sendNotification: (title, body) => ipcRenderer.invoke('maya-notification', { title, body }),
  notification: (title, body) => ipcRenderer.invoke('maya-notification', { title, body }),

  // Activity tracking
  reportActivity: (data) => ipcRenderer.invoke('maya-report-activity', data),

  // Get stored credentials
  getCredentials: () => ipcRenderer.invoke('maya-get-credentials'),

  // Platform info
  platform: process.platform,
  isElectron: true
});

// Expose talioDesktop for blob window
contextBridge.exposeInMainWorld('talioDesktop', {
  openMayaFromBlob: () => ipcRenderer.invoke('open-maya-from-blob'),
  getWidgetState: () => ipcRenderer.invoke('maya-get-widget-state'),
  isElectron: true
});

// Also expose as electronAPI for compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),
  isElectron: true
});

