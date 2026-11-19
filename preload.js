'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cobreApp', {
  closeServer: () => ipcRenderer.invoke('cobre:close-app'),
  openDataFolder: () => ipcRenderer.invoke('cobre:open-data-folder'),
});
