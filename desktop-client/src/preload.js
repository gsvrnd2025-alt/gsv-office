// Preload script for main window (sandboxed - no Node.js access)
const { contextBridge, ipcRenderer } = require('electron');

// Expose only what's needed for the web app
contextBridge.exposeInMainWorld('gsvDesktop', {
  isDesktop: true,
  platform: process.platform,
  remoteInput: (event) => ipcRenderer.invoke('remote-input', event),
  getSources: () => ipcRenderer.invoke('get-sources'),
  selectSource: (sourceId) => ipcRenderer.invoke('select-source', sourceId),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window')
});
