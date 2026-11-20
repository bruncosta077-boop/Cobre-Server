'use strict';

const $ = (id) => document.getElementById(id);
const formatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const typeNames = { desktop: 'Desktop', mobile: 'Mobile', tv: 'Google TV / Android TV' };
let snapshot = null;
let activeFilter = 'all';

function relativeTime(timestamp) {
  if (!timestamp) return 'Ainda não conectado';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'Agora';
  if (seconds < 60) return `Há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  return formatter.format(new Date(timestamp));
}

function cell(row, value) {
  const td = document.createElement('td');
  td.textContent = value || '—';
  row.append(td);
}

function deviceRow(device, compact = false) {
  const row = document.createElement('tr');
  cell(row, device.name);
  cell(row, typeNames[device.type] || 'Outro');
  if (!compact) cell(row, device.platform || '—');
  cell(row, device.appVersion || '—');
  cell(row, relativeTime(device.lastSeen));
  const state = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${device.online ? 'badge-online' : 'badge-offline'}`;
  const dot = document.createElement('span');
  badge.append(dot, document.createTextNode(device.online ? 'Online' : 'Offline'));
  state.append(badge);
  row.append(state);
  return row;
}

function renderDevices(devices) {
  const overview = $('overview-rows');
  const rows = $('device-rows');
  overview.replaceChildren();
  rows.replaceChildren();
  if (!devices.length) {
    for (const [target, colspan] of [[overview, 5], [rows, 6]]) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = colspan; td.className = 'empty'; td.textContent = 'Nenhum aparelho cadastrado ainda.';
      tr.append(td); target.append(tr);
    }
    return;
  }
  devices.slice(0, 6).forEach((device) => overview.append(deviceRow(device, true)));
  const query = ($('device-search')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const filtered = devices.filter((device) => {
    const matchesState = activeFilter === 'all' || (activeFilter === 'online') === device.online;
    const matchesText = `${device.name} ${device.type} ${device.platform || ''} ${device.appVersion || ''}`.toLocaleLowerCase('pt-BR').includes(query);
    return matchesState && matchesText;
  });
  if (!filtered.length) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 6; td.className = 'empty'; td.textContent = 'Nenhum aparelho corresponde a este filtro.';
    tr.append(td); rows.append(tr); return;
  }
  filtered.forEach((device) => rows.append(deviceRow(device)));
}

function renderAccessGrants(grants) {
  const rows = $('access-rows');
  if (!rows) return;
  rows.replaceChildren();
  if (!grants.length) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 6; td.className = 'empty'; td.textContent = 'Nenhuma permissão ativa para um Desktop.';
    tr.append(td); rows.append(tr); return;
  }
  const names = { 'library.read': 'Biblioteca', 'playback.read': 'Estado do player', 'playback.control': 'Controles', stream: 'Áudio' };
  for (const grant of grants) {
    const row = document.createElement('tr');
    cell(row, grant.accountEmail);
    cell(row, `${grant.clientName} · ${typeNames[grant.clientType] || grant.clientType}`);
    cell(row, grant.hostName);
    cell(row, (grant.scopes || []).map((scope) => names[scope] || scope).join(', '));
    cell(row, new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(grant.expiresAt)));
    const action = document.createElement('td');
    const revoke = document.createElement('button'); revoke.type = 'button'; revoke.className = 'danger-button'; revoke.textContent = 'Revogar';
    revoke.addEventListener('click', async () => {
      if (!window.confirm(`Revogar o acesso de "${grant.clientName}" ao Desktop "${grant.hostName}"?`)) return;
      revoke.disabled = true;
      try {
        const response = await fetch(`/api/access-grants/${encodeURIComponent(grant.grantId)}/revoke`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          cache: 'no-store', body: '{}',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Não foi possível revogar a permissão.');
        $('access-message').textContent = 'Permissão revogada.';
        $('access-message').className = 'account-message success';
        await refresh();
      } catch (error) {
        $('access-message').textContent = error.message || 'Não foi possível revogar a permissão.';
        $('access-message').className = 'account-message error';
        revoke.disabled = false;
      }
    });
    action.append(revoke); row.append(action); rows.append(row);
  }
}

function showPage(name) {
  const labels = { overview: 'Visão geral', accounts: 'Contas Cobre ID', devices: 'Dispositivos', access: 'Acessos ao Desktop', connections: 'Conexões', settings: 'Configurações', releases: 'Notas da versão' };
  if (!labels[name]) return;
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === `page-${name}`));
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === name));
  $('breadcrumb-page').textContent = labels[name];
}

async function refresh() {
  const button = $('refresh');
  if (button) button.disabled = true;
  const started = performance.now();
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Serviço sem resposta');
    snapshot = await response.json();
    const online = snapshot.devices.filter((device) => device.online).length;
    const elapsed = Math.round(performance.now() - started);
    $('service-label').textContent = 'Servidor ativo';
    $('side-service').textContent = 'Servidor ativo';
    $('api-status').textContent = 'Operacional';
    $('identity-status').textContent = 'Serviço ativo';
    $('uptime').textContent = `Ativo há ${Math.floor(snapshot.uptimeSeconds / 60)} min`;
    $('accounts').textContent = snapshot.accountCount;
    $('account-total').textContent = snapshot.accountCount;
    $('online').textContent = online;
    $('device-count').textContent = snapshot.deviceCount;
    $('identity-online').textContent = online;
    $('nav-online').textContent = online;
    $('nav-grants').textContent = snapshot.accessGrants.length;
    $('latency').textContent = elapsed;
    $('last-update').textContent = `Atualizado às ${formatter.format(new Date())}`;
    const apiProtocol = snapshot.secureTransport ? 'https' : 'http';
    const hosts = snapshot.secureTransport
      ? (snapshot.certificateInfo?.hosts || [])
      : (snapshot.lanAddresses || []);
    const apiAddresses = hosts.map((host) => `${apiProtocol}://${host.includes(':') ? `[${host}]` : host}:${snapshot.apiPort || 8080}`);
    $('api-address').textContent = apiAddresses.length
      ? apiAddresses.join(' · ')
      : snapshot.secureTransport ? 'Use o nome/IP incluído no certificado' : `http://localhost:${snapshot.apiPort || 8080}`;
    $('tls-status').textContent = snapshot.secureTransport ? 'HTTPS · criptografado' : 'HTTP · sem criptografia';
    $('tls-enable').hidden = Boolean(snapshot.secureTransport);
    $('tls-disable').hidden = !snapshot.secureTransport;
    $('tls-details').textContent = snapshot.secureTransport
      ? `Certificado HTTPS ativo${snapshot.certificateInfo?.hosts?.length ? ` · válido para ${snapshot.certificateInfo.hosts.join(', ')}` : ''}${snapshot.certificateInfo?.validTo ? ` · expira ${snapshot.certificateInfo.validTo}` : ''}. Os aparelhos precisam usar um desses endereços.`
      : 'Use um certificado TLS válido e confiável para o endereço configurado nos aplicativos. Certificados autoassinados não são confiáveis automaticamente.';
    for (const id of ['side-version', 'footer-version']) $(id).textContent = `v${snapshot.version}`;
    const streamSamples = snapshot.devices.filter((device) => Number.isSafeInteger(device.streamBytesPerSecond) && device.streamBytesPerSecond > 0 && Number.isSafeInteger(device.streamLatencyMs));
    if (streamSamples.length) {
      const averageRate = Math.round(streamSamples.reduce((sum, device) => sum + device.streamBytesPerSecond, 0) / streamSamples.length);
      const averageLatency = Math.round(streamSamples.reduce((sum, device) => sum + device.streamLatencyMs, 0) / streamSamples.length);
      const rateLabel = averageRate >= 1_000_000 ? `${(averageRate / 1_000_000).toFixed(2)} MB/s` : `${Math.round(averageRate / 1_000)} KB/s`;
      $('stream-title').textContent = `Recepção de áudio: ${rateLabel}`;
      $('stream-note').textContent = `Leitura informada por ${streamSamples.length} aparelho(s) Mobile; latência média para o primeiro dado: ${averageLatency} ms. Mede o trecho Desktop → Mobile na rede local, não a conexão com o Cobre Server.`;
      $('stream-pill').textContent = 'Medição do Mobile';
    } else {
      const catalogSamples = snapshot.devices.filter((device) => Number.isSafeInteger(device.catalogResponseMs));
      if (catalogSamples.length) {
        const average = Math.round(catalogSamples.reduce((sum, device) => sum + device.catalogResponseMs, 0) / catalogSamples.length);
        $('stream-title').textContent = `Catálogo do Desktop: ${average} ms`;
        $('stream-note').textContent = `Média de ${catalogSamples.length} consulta(s) enviada(s) pelo Mobile. Essa medida não representa a velocidade do áudio.`;
        $('stream-pill').textContent = 'Resposta do catálogo';
      } else {
        $('stream-title').textContent = 'Streaming aguardando reprodução';
        $('stream-note').textContent = 'Ao tocar uma faixa do computador no Mobile, a próxima presença Cobre ID enviará a taxa e a latência medidas no próprio recebimento do áudio.';
        $('stream-pill').textContent = 'Sem reprodução medida';
      }
    }
    $('desktop-state').textContent = snapshot.devices.some((d) => d.type === 'desktop' && d.online) ? 'Online' : 'Aguardando';
    $('client-state').textContent = snapshot.devices.some((d) => ['mobile', 'tv'].includes(d.type) && d.online) ? 'Online' : 'Aguardando';
    renderDevices(snapshot.devices);
    renderAccessGrants(snapshot.accessGrants);
  } catch {
    $('service-label').textContent = 'Serviço indisponível';
    $('side-service').textContent = 'Sem conexão';
    $('api-status').textContent = 'Indisponível';
  } finally {
    if (button) button.disabled = false;
  }
}

document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => showPage(item.dataset.page)));
document.querySelectorAll('[data-go]').forEach((item) => item.addEventListener('click', () => showPage(item.dataset.go)));
document.querySelectorAll('.filter').forEach((item) => item.addEventListener('click', () => {
  activeFilter = item.dataset.filter;
  document.querySelectorAll('.filter').forEach((filter) => filter.classList.toggle('active', filter === item));
  if (snapshot) renderDevices(snapshot.devices);
}));
$('device-search').addEventListener('input', () => { if (snapshot) renderDevices(snapshot.devices); });
$('refresh').addEventListener('click', refresh);
$('open-data').addEventListener('click', () => window.cobreApp?.openDataFolder());
$('quit-app').addEventListener('click', () => window.cobreApp?.closeServer());
$('tls-enable').addEventListener('click', async () => {
  const button = $('tls-enable'); button.disabled = true;
  try { const changed = await window.cobreApp?.configureTls(); if (changed) $('tls-details').textContent = 'HTTPS validado. O Cobre Server está reiniciando…'; }
  catch (error) { $('tls-details').textContent = error.message || 'Não foi possível configurar HTTPS.'; }
  finally { button.disabled = false; }
});
$('tls-disable').addEventListener('click', async () => {
  const button = $('tls-disable'); button.disabled = true;
  try { const changed = await window.cobreApp?.disableTls(); if (changed) $('tls-details').textContent = 'O Cobre Server está reiniciando em HTTP…'; }
  catch (error) { $('tls-details').textContent = error.message || 'Não foi possível desativar HTTPS.'; }
  finally { button.disabled = false; }
});

const updateBox = document.createElement('div');
updateBox.className = 'server-update';
const updateLabel = document.createElement('p');
updateLabel.className = 'eyebrow'; updateLabel.textContent = 'ATUALIZAÇÕES';
const updateHeading = document.createElement('h3'); updateHeading.textContent = 'Atualizar Cobre Server';
const updateDescription = document.createElement('p');
updateDescription.className = 'settings-copy';
updateDescription.textContent = 'Confira as notas, baixe o instalador oficial e atualize por cima. A cópia de contas e configurações fica no perfil do Windows.';
const updateStatus = document.createElement('p');
updateStatus.className = 'update-status'; updateStatus.setAttribute('role', 'status'); updateStatus.setAttribute('aria-live', 'polite');
updateStatus.textContent = 'Verifique quando quiser procurar uma versão nova.';
const updateActions = document.createElement('div'); updateActions.className = 'update-actions';
const checkUpdateButton = document.createElement('button'); checkUpdateButton.className = 'secondary-button'; checkUpdateButton.textContent = 'Verificar atualizações';
const downloadUpdateButton = document.createElement('button'); downloadUpdateButton.className = 'secondary-button'; downloadUpdateButton.textContent = 'Baixar e conferir'; downloadUpdateButton.hidden = true;
const installUpdateButton = document.createElement('button'); installUpdateButton.className = 'primary-button'; installUpdateButton.textContent = 'Fechar e abrir instalador'; installUpdateButton.hidden = true;
updateActions.append(checkUpdateButton, downloadUpdateButton, installUpdateButton);
const updateDetails = document.createElement('div'); updateDetails.className = 'update-details'; updateDetails.hidden = true;
const updateVersion = document.createElement('b');
const updateNotes = document.createElement('pre'); updateNotes.className = 'update-notes';
updateDetails.append(updateVersion, updateNotes);
updateBox.append(updateLabel, updateHeading, updateDescription, updateStatus, updateDetails, updateActions);
$('quit-app').closest('.settings-card').insertBefore(updateBox, $('quit-app'));
const latestNotesCard = document.createElement('article'); latestNotesCard.className = 'panel note-panel release-entry dynamic-release-notes'; latestNotesCard.hidden = true;
const latestTitleRow = document.createElement('div'); latestTitleRow.className = 'release-title';
const latestTitleGroup = document.createElement('div');
const latestVersionLabel = document.createElement('p'); latestVersionLabel.className = 'eyebrow';
const latestReleaseTitle = document.createElement('h2');
latestTitleGroup.append(latestVersionLabel, latestReleaseTitle);
const latestReleaseBadge = document.createElement('span'); latestReleaseBadge.className = 'release-badge';
latestTitleRow.append(latestTitleGroup, latestReleaseBadge);
const latestReleaseNotes = document.createElement('pre'); latestReleaseNotes.className = 'dynamic-release-body';
latestNotesCard.append(latestTitleRow, latestReleaseNotes);
$('page-releases').prepend(latestNotesCard);
let availableUpdate = null;
let downloadedVersion = null;

checkUpdateButton.addEventListener('click', async () => {
  checkUpdateButton.disabled = true;
  downloadUpdateButton.hidden = true; installUpdateButton.hidden = true; updateDetails.hidden = true;
  updateStatus.textContent = 'Consultando as versões oficiais…'; updateStatus.className = 'update-status';
  try {
    const update = await window.cobreApp?.checkUpdate();
    if (!update) throw new Error('Não foi possível consultar atualizações.');
    latestVersionLabel.textContent = `VERSÃO ${update.latestVersion}`;
    latestReleaseTitle.textContent = update.name;
    latestReleaseBadge.textContent = update.prerelease ? 'BETA' : 'ESTÁVEL';
    latestReleaseNotes.textContent = update.notes;
    latestNotesCard.hidden = false;
    updateVersion.textContent = `${update.name} · ${update.latestVersion} · ${(update.asset.size / 1024 / 1024).toFixed(1)} MB`;
    updateNotes.textContent = update.notes;
    updateDetails.hidden = false;
    if (!update.available) {
      availableUpdate = null;
      updateStatus.textContent = `O Cobre Server ${update.currentVersion} já está na versão mais recente.`;
      return;
    }
    availableUpdate = update;
    downloadUpdateButton.hidden = false;
    updateStatus.textContent = 'Nova versão disponível. Confira as notas antes de instalar.';
  } catch (error) {
    updateStatus.textContent = error.message || 'Não foi possível verificar atualizações.';
    updateStatus.classList.add('error');
  } finally { checkUpdateButton.disabled = false; }
});

downloadUpdateButton.addEventListener('click', async () => {
  if (!availableUpdate) return;
  downloadUpdateButton.disabled = true;
  updateStatus.textContent = 'Baixando e conferindo SHA-256…'; updateStatus.className = 'update-status';
  try {
    const result = await window.cobreApp?.downloadUpdate(availableUpdate.latestVersion);
    if (!result || result.version !== availableUpdate.latestVersion) throw new Error('O instalador não foi preparado corretamente.');
    downloadedVersion = result.version;
    updateStatus.textContent = `Instalador ${result.version} baixado e verificado.`;
    downloadUpdateButton.hidden = true; installUpdateButton.hidden = false;
  } catch (error) {
    updateStatus.textContent = error.message || 'Não foi possível baixar a atualização.';
    updateStatus.classList.add('error');
  } finally { downloadUpdateButton.disabled = false; }
});

installUpdateButton.addEventListener('click', async () => {
  if (!downloadedVersion || !window.confirm(`O Cobre Server vai fechar para abrir o instalador ${downloadedVersion}. Suas contas e configurações continuam no perfil do Windows. Continuar?`)) return;
  installUpdateButton.disabled = true;
  updateStatus.textContent = 'Conferindo o instalador e abrindo a atualização…'; updateStatus.className = 'update-status';
  try { await window.cobreApp?.installUpdate(downloadedVersion); }
  catch (error) { updateStatus.textContent = error.message || 'Não foi possível abrir o instalador.'; updateStatus.classList.add('error'); installUpdateButton.disabled = false; }
});

let backupMode = 'export';
function openBackupDialog(mode) {
  backupMode = mode;
  $('backup-title').textContent = mode === 'export' ? 'Salvar cópia criptografada' : 'Restaurar cópia';
  $('backup-description').textContent = mode === 'export'
    ? 'Crie uma senha com pelo menos 12 caracteres. Você precisará dela para restaurar este arquivo.'
    : 'Informe a senha usada ao criar o arquivo. O Cobre valida o backup antes de alterar os dados.';
  $('backup-confirm-wrap').hidden = mode !== 'export';
  $('backup-passphrase').value = '';
  $('backup-confirm').value = '';
  $('backup-status').textContent = '';
  $('backup-status').className = 'backup-status';
  $('backup-modal').hidden = false;
  $('backup-passphrase').focus();
}
function closeBackupDialog() { $('backup-modal').hidden = true; $('backup-form').reset(); }
$('backup-export').addEventListener('click', () => openBackupDialog('export'));
$('backup-restore').addEventListener('click', () => openBackupDialog('restore'));
$('backup-close').addEventListener('click', closeBackupDialog);
$('backup-cancel').addEventListener('click', closeBackupDialog);
$('backup-modal').addEventListener('click', (event) => { if (event.target === $('backup-modal')) closeBackupDialog(); });
$('backup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const passphrase = $('backup-passphrase').value;
  const status = $('backup-status');
  const submit = $('backup-submit');
  if (passphrase.length < 12) { status.textContent = 'A senha precisa ter pelo menos 12 caracteres.'; status.classList.add('error'); return; }
  if (backupMode === 'export' && passphrase !== $('backup-confirm').value) { status.textContent = 'As senhas não coincidem.'; status.classList.add('error'); return; }
  submit.disabled = true;
  status.textContent = backupMode === 'export' ? 'Preparando a cópia criptografada…' : 'Validando a cópia…';
  try {
    const result = backupMode === 'export'
      ? await window.cobreApp?.exportBackup(passphrase)
      : await window.cobreApp?.restoreBackup(passphrase);
    if (result) {
      status.textContent = backupMode === 'export' ? 'Cópia salva com segurança.' : 'Restauração iniciada. O Cobre Server vai reiniciar.';
      status.classList.add('success');
      if (backupMode === 'export') window.setTimeout(closeBackupDialog, 1200);
    } else if (backupMode === 'restore') {
      status.textContent = 'Restauração cancelada; os dados atuais não foram alterados.';
    }
  } catch (error) {
    status.textContent = error.message || 'Não foi possível processar esta cópia.';
    status.classList.add('error');
  } finally { submit.disabled = false; }
});
$('account-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('account-email').value.trim();
  const password = $('account-password').value;
  const confirm = $('account-confirm').value;
  const message = $('account-message');
  const submit = $('account-submit');
  message.className = 'account-message';
  if (password !== confirm) { message.textContent = 'As senhas não coincidem.'; message.classList.add('error'); return; }
  submit.disabled = true; submit.textContent = 'Criando conta…'; message.textContent = '';
  try {
    const response = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, cache: 'no-store', body: JSON.stringify({ email, password }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Não foi possível criar a conta.');
    $('account-email').value = '';
    $('account-password').value = '';
    $('account-confirm').value = '';
    message.textContent = `Conta ${result.account.email} criada. Já pode entrar nos aplicativos Cobre.`;
    message.classList.add('success');
    await refresh();
  } catch (error) {
    message.textContent = error.message || 'Não foi possível criar a conta.';
    message.classList.add('error');
  } finally {
    submit.disabled = false; submit.textContent = 'Criar conta Cobre ID';
  }
});
refresh();
window.setInterval(refresh, 15_000);
