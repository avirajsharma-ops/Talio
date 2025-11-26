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
  
  // Events
  onShowLogin: (callback) => ipcRenderer.on('show-login', callback),
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', callback),
  onWindowChanged: (callback) => ipcRenderer.on('window-changed', callback),
  onNavigate: (callback) => ipcRenderer.on('navigate', callback)
});
