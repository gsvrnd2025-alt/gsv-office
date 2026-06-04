// Settings window preload
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testConnection: (url) => ipcRenderer.invoke('test-connection', url),
  getVersion: () => ipcRenderer.invoke('get-version')
});
