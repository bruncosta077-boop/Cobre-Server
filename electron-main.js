'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { createServer } = require('./server');
const { createDashboard } = require('./dashboard');
const { createBackup, openBackup } = require('./backup');

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

ipcMain.handle('cobre:backup-export', async (_event, passphrase) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar cópia de segurança do Cobre Server',
    defaultPath: `Cobre-Server-backup-${new Date().toISOString().slice(0, 10)}.cobre-backup`,
    filters: [{ name: 'Backup criptografado do Cobre Server', extensions: ['cobre-backup'] }],
  });
  if (result.canceled || !result.filePath) return false;
  const snapshotPath = path.join(os.tmpdir(), `cobre-server-${crypto.randomUUID()}.db`);
  const tempOutput = `${result.filePath}.${crypto.randomUUID()}.tmp`;
  try {
    apiServer.createDatabaseSnapshot(snapshotPath);
    const secretKey = fs.readFileSync(path.join(dataDirectory, 'secret.key'));
    const archive = createBackup({ database: fs.readFileSync(snapshotPath), secretKey, passphrase, version: app.getVersion() });
    fs.writeFileSync(tempOutput, archive, { flag: 'wx' });
    fs.renameSync(tempOutput, result.filePath);
    return true;
  } finally {
    for (const file of [snapshotPath, tempOutput]) { try { fs.rmSync(file, { force: true }); } catch {} }
  }
});

ipcMain.handle('cobre:backup-restore', async (_event, passphrase) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolher cópia de segurança do Cobre Server', properties: ['openFile'],
    filters: [{ name: 'Backup criptografado do Cobre Server', extensions: ['cobre-backup'] }],
  });
  if (result.canceled || !result.filePaths[0]) return false;
  const backupPath = result.filePaths[0];
  const stat = fs.statSync(backupPath);
  if (stat.size > 200 * 1024 * 1024) throw new Error('O arquivo de backup excede o limite de 200 MB.');
  const restored = openBackup(fs.readFileSync(backupPath), passphrase);
  const staging = fs.mkdtempSync(path.join(dataDirectory, '.restore-'));
  const candidateDb = path.join(staging, 'cobre-id.db');
  const candidateKey = path.join(staging, 'secret.key');
  let check, validationError;
  try {
    fs.writeFileSync(candidateDb, restored.database, { flag: 'wx' });
    fs.writeFileSync(candidateKey, restored.secretKey, { flag: 'wx' });
    check = new DatabaseSync(candidateDb, { readOnly: true });
    const integrity = check.prepare('PRAGMA integrity_check').get();
    if (integrity?.integrity_check !== 'ok') throw new Error('A verificação de integridade do banco não passou.');
    const names = new Set(check.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
    for (const table of ['users', 'devices', 'refresh', 'device_codes']) if (!names.has(table)) throw new Error('O banco não pertence a uma instância compatível do Cobre Server.');
  } catch (error) { validationError = error; }
  finally { check?.close(); }
  if (validationError) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw validationError;
  }

  let answer;
  try {
    answer = await dialog.showMessageBox(mainWindow, {
      type: 'warning', title: 'Restaurar cópia de segurança',
      message: 'Substituir os dados desta instância?',
      detail: `Contas e dispositivos atuais serão substituídos. Antes disso, será criada ao lado do arquivo escolhido uma cópia criptografada dos dados atuais com a mesma senha. O Server reiniciará ao concluir${restored.createdAt ? ` (backup de ${restored.createdAt})` : ''}.`,
      buttons: ['Cancelar', 'Criar cópia e restaurar'], defaultId: 0, cancelId: 0,
    });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  if (answer.response !== 1) { fs.rmSync(staging, { recursive: true, force: true }); return false; }

  const currentSnapshot = path.join(staging, 'current.db');
  let currentBackupPath = '';
  try {
    apiServer.createDatabaseSnapshot(currentSnapshot);
    const currentArchive = createBackup({
      database: fs.readFileSync(currentSnapshot),
      secretKey: fs.readFileSync(path.join(dataDirectory, 'secret.key')),
      passphrase, version: app.getVersion(),
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    currentBackupPath = path.join(path.dirname(backupPath), `Cobre-Server-antes-da-restauracao-${stamp}.cobre-backup`);
    fs.writeFileSync(currentBackupPath, currentArchive, { flag: 'wx' });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new Error(`Não consegui criar a cópia de segurança atual; os dados não foram alterados. ${error.message}`);
  }

  const dbPath = path.join(dataDirectory, 'cobre-id.db');
  const keyPath = path.join(dataDirectory, 'secret.key');
  const priorDb = path.join(staging, 'prior.db');
  const priorKey = path.join(staging, 'prior.key');
  let closed = false;
  try {
    await Promise.all([
      new Promise((resolve) => dashboardServer?.listening ? dashboardServer.close(resolve) : resolve()),
      new Promise((resolve) => apiServer?.listening ? apiServer.close(resolve) : resolve()),
    ]);
    apiServer.close_db();
    closed = true;
    fs.renameSync(dbPath, priorDb);
    fs.renameSync(keyPath, priorKey);
    fs.renameSync(candidateDb, dbPath);
    fs.renameSync(candidateKey, keyPath);
  } catch (error) {
    try {
      if (fs.existsSync(priorDb)) { fs.rmSync(dbPath, { force: true }); fs.renameSync(priorDb, dbPath); }
      if (fs.existsSync(priorKey)) { fs.rmSync(keyPath, { force: true }); fs.renameSync(priorKey, keyPath); }
    } catch (rollbackError) {
      throw new Error(`A restauração falhou e a recuperação automática também falhou. A cópia atual permanece em ${currentBackupPath}. ${rollbackError.message}`);
    }
    if (closed) {
      app.relaunch(); app.exit(1);
      return false;
    }
    throw new Error(`Não foi possível restaurar. A cópia atual permanece em ${currentBackupPath}. ${error.message}`);
  }
  fs.rmSync(staging, { recursive: true, force: true });
  app.relaunch();
  app.exit(0);
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
