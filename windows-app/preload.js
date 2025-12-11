const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('talio', {
  // Authentication
  login: (email, password) => ipcRenderer.invoke('login', { email, password }),
  logout: () => ipcRenderer.invoke('logout'),
  
  // Attendance
  checkIn: () => ipcRenderer.invoke('check-in'),
  checkOut: () => ipcRenderer.invoke('check-out'),
  getAttendanceStatus: () => ipcRenderer.invoke('get-attendance-status'),
  
  // Status
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Activity tracking (for local events)
  trackKeystroke: () => ipcRenderer.send('activity-keystroke'),
  trackMouseClick: () => ipcRenderer.send('activity-mouse-click'),
  trackMouseMove: (distance) => ipcRenderer.send('activity-mouse-move', distance),
  
  // Event listeners
  onCaptureSuccess: (callback) => {
    ipcRenderer.on('capture-success', (event, data) => callback(data));
  },
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close')
});
