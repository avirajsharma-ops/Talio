const { contextBridge, ipcRenderer } = require('electron');

// Expose Maya Bridge to renderer
contextBridge.exposeInMainWorld('mayaBridge', {
  // Widget controls
  closeWidget: () => ipcRenderer.invoke('maya-close-widget'),
  minimizeWidget: () => ipcRenderer.invoke('maya-minimize-widget'),
  
  // Dot matrix overlay
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),
  
  // Screenshot for screen analysis
  captureScreen: () => ipcRenderer.invoke('maya-capture-screen'),
  
  // Authentication
  onAuth: (callback) => {
    ipcRenderer.on('maya-auth', (event, data) => callback(data));
  },
  
  // Send notification
  sendNotification: (title, body) => ipcRenderer.invoke('maya-notification', { title, body }),
  
  // Activity tracking
  reportActivity: (data) => ipcRenderer.invoke('maya-report-activity', data),
  
  // Get stored credentials
  getCredentials: () => ipcRenderer.invoke('maya-get-credentials'),
  
  // Platform info
  platform: process.platform,
  isElectron: true
});

// Also expose as electronAPI for compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  showDotMatrix: () => ipcRenderer.invoke('show-dot-matrix'),
  hideDotMatrix: () => ipcRenderer.invoke('hide-dot-matrix'),
  isElectron: true
});

