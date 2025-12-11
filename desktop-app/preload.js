/**
 * Talio Desktop App - Preload Script
 * Exposes minimal APIs to renderer for security
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth management
  setAuthToken: (token, user) => ipcRenderer.invoke('set-auth-token', { token, user }),
  clearAuth: () => ipcRenderer.invoke('clear-auth'),
  
  // Attendance events
  checkIn: () => ipcRenderer.invoke('check-in'),
  checkOut: () => ipcRenderer.invoke('check-out'),
  
  // Status
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Activity tracking
  trackKeystroke: () => ipcRenderer.send('activity-keystroke'),
  trackMouseClick: () => ipcRenderer.send('activity-mouse-click'),
  trackMouseMove: (distance) => ipcRenderer.send('activity-mouse-move', distance),
  
  // Capture events
  onCaptureSuccess: (callback) => {
    ipcRenderer.on('capture-success', (_, data) => callback(data));
  },
  
  // Offline retry
  retryConnection: () => ipcRenderer.send('retry-connection'),
  
  // Platform info
  platform: process.platform
});
