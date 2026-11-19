'use strict';

const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { createServer } = require('./server');
const { createDashboard } = require('./dashboard');

const apiPort = Number(process.env.PORT || 8080);
const dashboardPort = Number(process.env.DASHBOARD_PORT || 8788);
const apiHost = process.env.HOST || '0.0.0.0';
const dataDirectory = process.env.DATA_DIR || path.join(app.getPath('userData'), 'data');
let apiServer;
let dashboardServer;
let mainWindow;
let quitting = false;

app.setName('Cobre Server');
app.setAppUserModelId('app.cobre.server');

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.removeListener('listening', onListening); reject(error); };
    const onListening = () => { server.removeListener('error', onError); resolve(); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.focus(); return; }
  const panelUrl = `http://127.0.0.1:${dashboardPort}/`;
  mainWindow = new BrowserWindow({
    width: 1260, height: 860, minWidth: 980, minHeight: 680,
    title: 'Cobre Server', backgroundColor: '#111110', show: false, autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (new URL(target).origin !== new URL(panelUrl).origin) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(panelUrl);
}

ipcMain.handle('cobre:close-app', async () => {
  if (quitting) return true;
  const answer = await dialog.showMessageBox(mainWindow, {
    type: 'question', title: 'Fechar Cobre Server', message: 'Fechar o Cobre Server?',
    detail: 'Os aparelhos deixarão de acessar o Cobre ID por esta instância.',
    buttons: ['Continuar aberto', 'Fechar servidor'], defaultId: 0, cancelId: 0,
  });
  if (answer.response === 1) app.quit();
  return answer.response === 1;
});

ipcMain.handle('cobre:open-data-folder', async () => {
  await shell.openPath(dataDirectory);
  return true;
});

async function start() {
  process.env.DATA_DIR = dataDirectory;
  apiServer = createServer({ dataDir: dataDirectory });
  dashboardServer = createDashboard(apiServer);
  dashboardServer.on('error', (error) => dialog.showErrorBox('Painel do Cobre Server', error.message));
  await listen(apiServer, apiPort, apiHost);
  try {
    await listen(dashboardServer, dashboardPort, '127.0.0.1');
  } catch (error) {
    apiServer.close(); apiServer.close_db();
    throw error;
  }
  createWindow();
}

function closeServices() {
  if (quitting) return;
  quitting = true;
  if (dashboardServer?.listening) dashboardServer.close();
  if (apiServer?.listening) apiServer.close();
  if (apiServer) { try { apiServer.close_db(); } catch {} }
}

app.whenReady().then(() => hasSingleInstanceLock ? start() : undefined).catch((error) => {
  dialog.showErrorBox('Cobre Server não iniciou', `Não foi possível iniciar a API ou o painel local.\n\n${error.message}\n\nVerifique se as portas ${apiPort} e ${dashboardPort} estão livres.`);
  app.quit();
});
app.on('second-instance', createWindow);
app.on('activate', createWindow);
app.on('before-quit', closeServices);
app.on('window-all-closed', () => app.quit());
