'use strict';

const $ = (id) => document.getElementById(id);
const formatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const typeNames = { desktop: 'Desktop', mobile: 'Mobile', tv: 'TV' };

function relativeTime(timestamp) {
  if (!timestamp) return 'Ainda não conectado';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'Agora';
  if (seconds < 60) return `Há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  return formatter.format(new Date(timestamp));
}

function renderDevices(devices) {
  const rows = $('device-rows');
  if (!devices.length) {
    rows.innerHTML = '<tr><td colspan="5" class="empty">Nenhum aparelho cadastrado ainda.</td></tr>';
    return;
  }
  rows.replaceChildren(...devices.map((device) => {
    const row = document.createElement('tr');
    const values = [device.name, typeNames[device.type] || 'Outro', device.appVersion || '—', relativeTime(device.lastSeen)];
    for (const value of values) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    const state = document.createElement('td');
    const badge = document.createElement('span'); badge.className = `badge ${device.online ? 'badge-online' : 'badge-offline'}`;
    badge.innerHTML = `<span></span>${device.online ? 'Online' : 'Offline'}`; state.append(badge); row.append(state);
    return row;
  }));
}

async function refresh() {
  const button = $('refresh'); button.disabled = true;
  const started = performance.now();
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Painel sem resposta');
    const data = await response.json();
    const elapsed = Math.round(performance.now() - started);
    const online = data.devices.filter((device) => device.online).length;
    $('service-label').textContent = 'Serviço ativo';
    $('api-status').textContent = 'Operacional';
    $('uptime').textContent = `Ativo há ${Math.floor(data.uptimeSeconds / 60)} min`;
    $('accounts').textContent = data.accountCount;
    $('online').textContent = online;
    $('device-count').textContent = data.deviceCount;
    $('latency').textContent = elapsed;
    $('version').textContent = `v${data.version}`;
    $('presence-summary').textContent = `${online} online`;
    $('last-update').textContent = `Atualizado às ${formatter.format(new Date())}`;
    const catalogSamples = data.devices.filter((device) => Number.isFinite(device.catalogResponseMs));
    if (catalogSamples.length) {
      const average = Math.round(catalogSamples.reduce((sum, item) => sum + item.catalogResponseMs, 0) / catalogSamples.length);
      $('stream-note').textContent = `Catálogo: média de ${average} ms entre ${catalogSamples.length} aparelho(s)`;
    }
    renderDevices(data.devices);
  } catch {
    $('service-label').textContent = 'Painel sem resposta';
    $('api-status').textContent = 'Indisponível';
    $('device-rows').innerHTML = '<tr><td colspan="5" class="empty">Não foi possível consultar o serviço.</td></tr>';
  } finally {
    button.disabled = false;
  }
}

$('refresh').addEventListener('click', refresh);
refresh();
window.setInterval(refresh, 15_000);
