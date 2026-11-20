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

function showPage(name) {
  const labels = { overview: 'Visão geral', accounts: 'Contas Cobre ID', devices: 'Dispositivos', connections: 'Conexões', settings: 'Configurações', releases: 'Notas da versão' };
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
    $('latency').textContent = elapsed;
    $('last-update').textContent = `Atualizado às ${formatter.format(new Date())}`;
    $('api-address').textContent = snapshot.lanAddresses?.length
      ? snapshot.lanAddresses.map((address) => `http://${address}:${snapshot.apiPort || 8080}`).join(' · ')
      : `http://localhost:${snapshot.apiPort || 8080}`;
    for (const id of ['side-version', 'footer-version']) $(id).textContent = `v${snapshot.version}`;
    const catalogSamples = snapshot.devices.filter((device) => Number.isSafeInteger(device.catalogResponseMs));
    if (catalogSamples.length) {
      const average = Math.round(catalogSamples.reduce((sum, device) => sum + device.catalogResponseMs, 0) / catalogSamples.length);
      $('stream-title').textContent = `Catálogo do Desktop: ${average} ms`;
      $('stream-note').textContent = `Média de ${catalogSamples.length} consulta(s) enviada(s) pelo Mobile. Essa medida não representa a velocidade do áudio.`;
      $('stream-pill').textContent = 'Resposta do catálogo';
    } else {
      $('stream-title').textContent = 'Streaming ainda sem medição';
      $('stream-note').textContent = 'O painel mede a resposta da API local. A taxa e a estabilidade do áudio precisam ser reportadas pelo Desktop e pelo aparelho que reproduz.';
      $('stream-pill').textContent = 'Aguardando métricas dos clientes';
    }
    $('desktop-state').textContent = snapshot.devices.some((d) => d.type === 'desktop' && d.online) ? 'Online' : 'Aguardando';
    $('client-state').textContent = snapshot.devices.some((d) => ['mobile', 'tv'].includes(d.type) && d.online) ? 'Online' : 'Aguardando';
    renderDevices(snapshot.devices);
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
