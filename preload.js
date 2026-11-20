'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cobreApp', {
  closeServer: () => ipcRenderer.invoke('cobre:close-app'),
  openDataFolder: () => ipcRenderer.invoke('cobre:open-data-folder'),
  exportBackup: (passphrase) => ipcRenderer.invoke('cobre:backup-export', passphrase),
  restoreBackup: (passphrase) => ipcRenderer.invoke('cobre:backup-restore', passphrase),
  checkUpdate: () => ipcRenderer.invoke('cobre:update-check'),
  downloadUpdate: (version) => ipcRenderer.invoke('cobre:update-download', version),
  installUpdate: (version) => ipcRenderer.invoke('cobre:update-install', version),
  configureTls: () => ipcRenderer.invoke('cobre:tls-configure'),
  disableTls: () => ipcRenderer.invoke('cobre:tls-disable'),
});
