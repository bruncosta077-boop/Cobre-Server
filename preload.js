'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cobreApp', {
  closeServer: () => ipcRenderer.invoke('cobre:close-app'),
  openDataFolder: () => ipcRenderer.invoke('cobre:open-data-folder'),
  exportBackup: (passphrase) => ipcRenderer.invoke('cobre:backup-export', passphrase),
  restoreBackup: (passphrase) => ipcRenderer.invoke('cobre:backup-restore', passphrase),
});
