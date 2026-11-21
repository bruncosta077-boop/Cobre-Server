'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createServer, isLanAddress } = require('../server');
const { createDashboard } = require('../dashboard');

let srv, base, dir;
const call = async (method, p, body, token) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json(), headers: r.headers };
};
const PC = { name: 'PC da sala', type: 'desktop' }, CEL = { name: 'Pixel', type: 'mobile' };

test('a API aceita por padrão somente origens loopback ou de rede local', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.254', '192.168.1.9', '169.254.2.3', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1%12', '::ffff:192.168.1.9']) {
    assert.equal(isLanAddress(ip), true, `${ip} deveria ser local`);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '100.64.0.1', '2001:4860:4860::8888', '::ffff:0808:0808', 'fclan', 'not-an-ip', '']) {
    assert.equal(isLanAddress(ip), false, `${ip} deveria ser recusado`);
  }
});

test('a API recusa um pedido vindo de endereço público antes de atender a rota', async () => {
  const requestHandler = srv.listeners('request')[0];
  const req = { socket: { remoteAddress: '8.8.8.8' }, method: 'GET', url: '/health', headers: {} };
  let status, body;
  const res = { writeHead(code) { status = code; }, end(value) { body = value; } };
  await requestHandler(req, res);
  assert.equal(status, 403);
  assert.equal(JSON.parse(body).error, 'network_not_allowed');
});

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-'));
  srv = createServer({ dataDir: dir, accessTtl: 3600, onlineWindow: 1500, maxFails: 3 });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = 'http://127.0.0.1:' + srv.address().port;
});
after(() => { srv.close(); srv.close_db(); fs.rmSync(dir, { recursive: true, force: true }); });

test('registro cria conta, dispositivo e sessão', async () => {
  const r = await call('POST', '/v1/register', { email: 'Ana@Exemplo.com', password: 'senha-forte-1', device: PC });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.email, 'ana@exemplo.com');
  assert.ok(r.body.accessToken && r.body.refreshToken && r.body.device.id);
});

test('painel local cria uma conta Cobre ID sem associar um aparelho falso', async () => {
  const account = await srv.createAccount({ email: 'painel@cobre.test', password: 'senha-forte-painel' });
  assert.equal(account.email, 'painel@cobre.test');
  assert.equal(srv.dashboardSnapshot().accountCount, 2);
  const login = await call('POST', '/v1/login', { email: account.email, password: 'senha-forte-painel', device: CEL });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, account.email);
  await assert.rejects(srv.createAccount({ email: account.email, password: 'senha-forte-painel' }), (error) => error.status === 409);
});

test('snapshot da base inclui alterações confirmadas e recusa sobrescrever destino', async () => {
  const snapshot = path.join(dir, 'snapshot.db');
  srv.createDatabaseSnapshot(snapshot);
  const copy = new DatabaseSync(snapshot, { readOnly: true });
  try {
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(copy.prepare('SELECT COUNT(*) AS count FROM users').get().count, 2);
  } finally { copy.close(); }
  assert.throws(() => srv.createDatabaseSnapshot(snapshot), /já existe/);
});

test('chave local corrompida impede inicialização com assinatura fraca', () => {
  const brokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-key-'));
  try {
    fs.writeFileSync(path.join(brokenDir, 'secret.key'), 'deadbeef');
    assert.throws(() => createServer({ dataDir: brokenDir }), /secret\.key está inválida/);
  } finally {
    fs.rmSync(brokenDir, { recursive: true, force: true });
  }
});

test('registro valida email, senha e duplicidade', async () => {
  assert.equal((await call('POST', '/v1/register', { email: 'x', password: 'senha-forte-1', device: PC })).body.error, 'bad_email');
  assert.equal((await call('POST', '/v1/register', { email: 'b@b.com', password: '123', device: PC })).body.error, 'weak_password');
  assert.equal((await call('POST', '/v1/register', { email: 'ana@exemplo.com', password: 'outra-senha-9', device: PC })).status, 409);
  assert.equal((await call('POST', '/v1/register', { email: 'c@c.com', password: 'senha-forte-1', device: { name: 'x', type: 'geladeira' } })).body.error, 'bad_device');
  assert.equal((await call('POST', '/v1/register', { email: 'c@c.com', password: 'senha-forte-1', device: PC })).status, 201);
});

test('login: senha errada falha, certa funciona, mesma conta em dois dispositivos', async () => {
  assert.equal((await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'errada-errada', device: CEL })).status, 401);
  const r = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: CEL });
  assert.equal(r.status, 200);
  const list = await call('GET', '/v1/devices', null, r.body.accessToken);
  assert.equal(list.body.devices.length, 2);
  assert.equal(list.body.devices.filter((d) => d.current).length, 1);
});

test('rotas protegidas exigem token válido; token expira', async () => {
  assert.equal((await call('GET', '/v1/devices')).status, 401);
  assert.equal((await call('GET', '/v1/devices', null, 'a.b.c')).status, 401);
  const expiryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-expiry-'));
  const expiryServer = createServer({ dataDir: expiryDir, accessTtl: 1 });
  try {
    await new Promise((ok) => expiryServer.listen(0, '127.0.0.1', ok));
    const expiryBase = 'http://127.0.0.1:' + expiryServer.address().port;
    const registered = await fetch(expiryBase + '/v1/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'expira@teste.com', password: 'senha-forte-1', device: PC }),
    });
    const session = await registered.json();
    assert.equal(registered.status, 201);
    await new Promise((ok) => setTimeout(ok, 1200));
    const expired = await fetch(expiryBase + '/v1/devices', { headers: { Authorization: 'Bearer ' + session.accessToken } });
    assert.equal(expired.status, 401);
  } finally {
    await new Promise((resolve) => expiryServer.close(resolve));
    expiryServer.close_db();
    fs.rmSync(expiryDir, { recursive: true, force: true });
  }
});

test('refresh rotaciona e reuso derruba a sessão do dispositivo', async () => {
  const r = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: { name: 'Tablet', type: 'mobile' } });
  const r2 = await call('POST', '/v1/refresh', { refreshToken: r.body.refreshToken });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.user.email, 'ana@exemplo.com');
  assert.notEqual(r2.body.refreshToken, r.body.refreshToken);
  assert.equal((await call('GET', '/v1/devices', null, r2.body.accessToken)).status, 200);
  const reuse = await call('POST', '/v1/refresh', { refreshToken: r.body.refreshToken }); // token antigo
  assert.equal(reuse.body.error, 'refresh_reuse');
  assert.equal((await call('POST', '/v1/refresh', { refreshToken: r2.body.refreshToken })).status, 401); // família inteira morreu
  assert.equal((await call('POST', '/v1/refresh', { refreshToken: 'lixo' })).status, 401);
});

test('presença: online logo após heartbeat, offline depois da janela', async () => {
  const pc = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: PC });
  const lg = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: { name: 'Leitor', type: 'mobile' } });
  const measurementSentAt = Date.now();
  await call('POST', '/v1/presence', { meta: { platform: 'Android', appVersion: '0.7.0', catalogResponseMs: 132, streamLatencyMs: 54, streamBytesPerSecond: 2_000_000, streamAgeMs: 750, password: 'must-not-be-stored', localPath: 'C:\\Music' } }, pc.body.accessToken);
  let l = await call('GET', '/v1/devices', null, lg.body.accessToken);
  const me = l.body.devices.find((d) => d.id === pc.body.device.id);
  assert.equal(me.online, true); assert.equal(me.meta.appVersion, '0.7.0');
  assert.equal(me.meta.catalogResponseMs, 132); assert.equal(me.meta.streamBytesPerSecond, 2_000_000);
  assert.equal(me.meta.streamLatencyMs, 54);
  assert.ok(me.meta.streamMeasuredAt >= measurementSentAt - 1_000 && me.meta.streamMeasuredAt <= Date.now());
  assert.equal(me.meta.streamAgeMs, undefined);
  assert.equal(me.meta.password, undefined); assert.equal(me.meta.localPath, undefined);
  await call('POST', '/v1/presence', { meta: { streamLatencyMs: 40, streamBytesPerSecond: 1_000_000, streamAgeMs: 120_001 } }, lg.body.accessToken);
  l = await call('GET', '/v1/devices', null, pc.body.accessToken);
  const staleSample = l.body.devices.find((d) => d.id === lg.body.device.id);
  assert.equal(staleSample.meta.streamMeasuredAt, undefined);
  await new Promise((ok) => setTimeout(ok, 1700));
  l = await call('GET', '/v1/devices', null, lg.body.accessToken);
  assert.equal(l.body.devices.find((d) => d.id === pc.body.device.id).online, false);
});

test('acesso ao Desktop é aprovado pelo host, limitado, listável e revogável', async () => {
  const account = await call('POST', '/v1/register', { email: 'host-grants@teste.com', password: 'senha-forte-3', device: PC });
  const hostToken = account.body.accessToken, hostId = account.body.device.id;
  const secondHost = await call('POST', '/v1/login', { email: 'host-grants@teste.com', password: 'senha-forte-3', device: { name: 'Segundo PC', type: 'desktop' } });
  const mobile = await call('POST', '/v1/login', { email: 'host-grants@teste.com', password: 'senha-forte-3', device: { name: 'Celular de teste', type: 'mobile' } });
  const active = { meta: { platform: 'Windows', appVersion: '1.0.0', desktopHostActive: true } };
  await call('POST', '/v1/presence', active, hostToken);
  await call('POST', '/v1/presence', active, secondHost.body.accessToken);

  const hosts = await call('GET', '/v1/hosts', null, mobile.body.accessToken);
  assert.deepEqual(hosts.body.hosts.map((host) => host.id), [hostId, secondHost.body.device.id]);
  assert.equal(hosts.body.hosts.find((host) => host.id === hostId).online, true);
  assert.equal(hosts.body.hosts.find((host) => host.id === hostId).streamActive, true);

  const outsider = await call('POST', '/v1/register', { email: 'host-outsider@teste.com', password: 'senha-forte-4', device: PC });
  await call('POST', '/v1/presence', active, outsider.body.accessToken);
  assert.equal((await call('POST', `/v1/hosts/${outsider.body.device.id}/access-requests`, {}, mobile.body.accessToken)).status, 404);
  assert.equal((await call('POST', `/v1/hosts/${hostId}/access-requests`, { scopes: ['admin'] }, mobile.body.accessToken)).body.error, 'bad_scopes');

  const path = `/v1/hosts/${hostId}/access-requests`;
  const request = await call('POST', path, { scopes: ['stream', 'library.read', 'playback.control'] }, mobile.body.accessToken);
  assert.equal(request.status, 201);
  assert.equal(request.body.expiresIn, 300);
  const pendingForDashboard = srv.dashboardSnapshot().pendingAccessRequests.find((item) => item.requestId === request.body.requestId);
  assert.equal(pendingForDashboard.clientName, 'Celular de teste');
  assert.equal(pendingForDashboard.hostName, 'PC da sala');
  const pollPath = `${path}/${request.body.requestId}`;
  assert.equal((await call('GET', pollPath, null, mobile.body.accessToken)).body.status, 'pending');
  assert.equal((await call('GET', pollPath, null, secondHost.body.accessToken)).status, 404);
  assert.equal((await call('GET', `/v1/hosts/${secondHost.body.device.id}/access-requests`, null, secondHost.body.accessToken)).body.requests.length, 0);

  const inboxPath = `/v1/hosts/${hostId}/access-requests`;
  const inbox = await call('GET', inboxPath, null, hostToken);
  assert.equal(inbox.body.requests.length, 1);
  assert.equal(inbox.body.requests[0].clientName, 'Celular de teste');
  const approvePath = `${inboxPath}/${request.body.requestId}/approve`;
  assert.equal((await call('POST', `${`/v1/hosts/${secondHost.body.device.id}/access-requests`}/${request.body.requestId}/approve`, {}, secondHost.body.accessToken)).status, 404);
  const approved = await call('POST', approvePath, {}, hostToken);
  assert.equal(approved.body.status, 'approved');
  assert.equal(srv.dashboardSnapshot().pendingAccessRequests.some((item) => item.requestId === request.body.requestId), false);
  const dashboardGrant = srv.dashboardSnapshot().accessGrants.find((grant) => grant.grantId === approved.body.grantId);
  assert.equal(dashboardGrant.accountEmail, 'host-grants@teste.com');
  assert.equal(dashboardGrant.clientName, 'Celular de teste');
  assert.equal(dashboardGrant.hostName, 'PC da sala');
  const redeemed = await call('GET', pollPath, null, mobile.body.accessToken);
  assert.equal(redeemed.status, 200);
  assert.deepEqual(redeemed.body.scopes, ['library.read', 'playback.control', 'stream']);
  assert.equal((await call('POST', approvePath, {}, hostToken)).status, 404);
  const ready = await call('GET', pollPath, null, mobile.body.accessToken);
  assert.equal(ready.body.status, 'redeemed');

  const validate = await call('POST', '/v1/hosts/access-grants/validate', { grantToken: redeemed.body.grantToken }, hostToken);
  assert.equal(validate.status, 200);
  assert.equal(validate.body.clientDeviceId, mobile.body.device.id);
  assert.deepEqual(validate.body.scopes, redeemed.body.scopes);
  const grants = await call('GET', '/v1/hosts', null, mobile.body.accessToken);
  assert.equal(grants.body.accessGrants.length, 1);
  assert.equal(grants.body.accessGrants[0].grantId, validate.body.grantId);
  const dashboardMobile = await call('POST', '/v1/login', { email: 'host-grants@teste.com', password: 'senha-forte-3', device: { name: 'Segundo celular', type: 'mobile' } });
  const dashboardRequest = await call('POST', path, {}, dashboardMobile.body.accessToken);
  await call('POST', `${path}/${dashboardRequest.body.requestId}/approve`, {}, hostToken);
  const dashboardIssued = await call('GET', `${path}/${dashboardRequest.body.requestId}`, null, dashboardMobile.body.accessToken);
  assert.equal(srv.revokeHostGrantForDashboard(dashboardIssued.body.grantId), true);
  assert.equal((await call('POST', '/v1/hosts/access-grants/validate', { grantToken: dashboardIssued.body.grantToken }, hostToken)).body.error, 'host_grant_revoked');
  assert.equal((await call('POST', '/v1/hosts/access-grants/validate', { grantToken: redeemed.body.grantToken }, secondHost.body.accessToken)).status, 401);
  assert.equal((await call('POST', '/v1/hosts/access-grants/validate', { grantToken: `${redeemed.body.grantToken}x` }, hostToken)).status, 401);

  const revokePath = `/v1/hosts/${hostId}/access-grants/${validate.body.grantId}`;
  assert.equal((await call('DELETE', revokePath, null, mobile.body.accessToken)).status, 200);
  assert.equal((await call('POST', '/v1/hosts/access-grants/validate', { grantToken: redeemed.body.grantToken }, hostToken)).body.error, 'host_grant_revoked');

  const nextRequest = await call('POST', path, {}, mobile.body.accessToken);
  const nextRequestId = nextRequest.body.requestId;
  assert.equal((await call('POST', `${path}/${nextRequestId}/deny`, {}, hostToken)).body.status, 'denied');
  assert.equal((await call('GET', `${path}/${nextRequestId}`, null, mobile.body.accessToken)).body.error, 'access_request_denied');
  const afterRevoke = await call('POST', path, {}, mobile.body.accessToken);
  await call('POST', `${path}/${afterRevoke.body.requestId}/approve`, {}, hostToken);
  const nextGrant = await call('GET', `${path}/${afterRevoke.body.requestId}`, null, mobile.body.accessToken);
  assert.equal((await call('DELETE', `/v1/devices/${mobile.body.device.id}`, null, hostToken)).status, 200);
  assert.equal((await call('POST', '/v1/hosts/access-grants/validate', { grantToken: nextGrant.body.grantToken }, hostToken)).body.error, 'host_grant_revoked');
});

test('token de acesso expira e pode ser renovado enquanto o consentimento segue ativo', async (t) => {
  const expiryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-host-grant-expiry-'));
  t.after(() => fs.rmSync(expiryDir, { recursive: true, force: true }));
  let clock = Date.now();
  const expiryServer = createServer({ dataDir: expiryDir, accessTtl: 3600, hostGrantTtl: 1000, hostConsentTtl: 2000, now: () => clock });
  await new Promise((ok) => expiryServer.listen(0, '127.0.0.1', ok));
  const local = 'http://127.0.0.1:' + expiryServer.address().port;
  const localCall = async (method, url, body, token) => {
    const response = await fetch(local + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json() };
  };
  try {
    const host = await localCall('POST', '/v1/register', { email: 'expiry-host@teste.com', password: 'senha-forte-5', device: PC });
    const mobile = await localCall('POST', '/v1/login', { email: 'expiry-host@teste.com', password: 'senha-forte-5', device: CEL });
    await localCall('POST', '/v1/presence', { meta: { desktopHostActive: true } }, host.body.accessToken);
    const request = await localCall('POST', `/v1/hosts/${host.body.device.id}/access-requests`, {}, mobile.body.accessToken);
    await localCall('POST', `/v1/hosts/${host.body.device.id}/access-requests/${request.body.requestId}/approve`, {}, host.body.accessToken);
    const redeemed = await localCall('GET', `/v1/hosts/${host.body.device.id}/access-requests/${request.body.requestId}`, null, mobile.body.accessToken);
    assert.equal((await localCall('POST', '/v1/hosts/access-grants/validate', { grantToken: redeemed.body.grantToken }, host.body.accessToken)).status, 200);
    clock += 1001;
    const expired = await localCall('POST', '/v1/hosts/access-grants/validate', { grantToken: redeemed.body.grantToken }, host.body.accessToken);
    assert.equal(expired.status, 401);
    assert.equal(expired.body.error, 'invalid_host_grant');
    const refreshPath = `/v1/hosts/${host.body.device.id}/access-grants/${redeemed.body.grantId}/refresh`;
    const renewed = await localCall('POST', refreshPath, {}, mobile.body.accessToken);
    assert.equal(renewed.status, 200);
    assert.equal((await localCall('POST', '/v1/hosts/access-grants/validate', { grantToken: renewed.body.grantToken }, host.body.accessToken)).status, 200);
    assert.equal((await localCall('POST', refreshPath, {}, host.body.accessToken)).status, 404);
    clock += 1001;
    const consentExpired = await localCall('POST', refreshPath, {}, mobile.body.accessToken);
    assert.equal(consentExpired.status, 410);
  } finally {
    await new Promise((resolve) => expiryServer.close(resolve));
    expiryServer.close_db();
  }
});

test('remover dispositivo invalida suas sessões; não remove de outra conta', async () => {
  const a = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: { name: 'Vai sair', type: 'mobile' } });
  const b = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: { name: 'Fica', type: 'mobile' } });
  const del = await call('DELETE', '/v1/devices/' + a.body.device.id, null, b.body.accessToken);
  assert.equal(del.status, 200);
  assert.equal((await call('GET', '/v1/devices', null, a.body.accessToken)).body.error, 'device_revoked');
  assert.equal((await call('POST', '/v1/refresh', { refreshToken: a.body.refreshToken })).status, 401);
  const other = await call('POST', '/v1/register', { email: 'bia@exemplo.com', password: 'senha-forte-2', device: PC });
  assert.equal((await call('DELETE', '/v1/devices/' + b.body.device.id, null, other.body.accessToken)).status, 404);
});

test('logout remove o próprio dispositivo', async () => {
  const a = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: { name: 'Temp', type: 'mobile' } });
  assert.equal((await call('POST', '/v1/logout', {}, a.body.accessToken)).status, 200);
  assert.equal((await call('GET', '/v1/devices', null, a.body.accessToken)).status, 401);
});

test('pareamento da TV aprova uma vez, cria o dispositivo e emite a sessão', async () => {
  const account = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: CEL });
  const request = await call('POST', '/v1/device/authorization', { device: { name: 'Cobre TV sala' } });
  assert.equal(request.status, 200);
  assert.match(request.body.deviceCode, /^[A-Za-z0-9_-]{40,60}$/);
  assert.match(request.body.userCode, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

  const approval = await call('POST', '/v1/device/authorize', { userCode: request.body.userCode, approve: true }, account.body.accessToken);
  assert.equal(approval.status, 200);
  assert.equal(approval.body.device.type, 'tv');
  assert.equal(approval.body.device.name, 'Cobre TV sala');

  const redeemed = await call('POST', '/v1/device/token', { deviceCode: request.body.deviceCode });
  assert.equal(redeemed.status, 200);
  assert.ok(redeemed.body.accessToken && redeemed.body.refreshToken);
  assert.equal(redeemed.body.device.id, approval.body.device.id);

  const listed = await call('GET', '/v1/devices', null, account.body.accessToken);
  assert.equal(listed.body.devices.filter((device) => device.type === 'tv' && device.name === 'Cobre TV sala').length, 1);
  assert.equal((await call('POST', '/v1/device/token', { deviceCode: request.body.deviceCode })).body.error, 'expired_token');
});

test('pareamento recusado não cria um dispositivo', async () => {
  const account = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: CEL });
  const request = await call('POST', '/v1/device/authorization', { device: { name: 'TV recusada' } });
  const denial = await call('POST', '/v1/device/authorize', { userCode: request.body.userCode, approve: false }, account.body.accessToken);
  assert.equal(denial.status, 200);
  assert.equal(denial.body.approved, false);
  const token = await call('POST', '/v1/device/token', { deviceCode: request.body.deviceCode });
  assert.equal(token.body.error, 'access_denied');
  const devices = await call('GET', '/v1/devices', null, account.body.accessToken);
  assert.equal(devices.body.devices.some((device) => device.type === 'tv' && device.name === 'TV recusada'), false);
});

test('pedidos simultâneos não aprovam nem resgatam o mesmo código duas vezes', async () => {
  const account = await call('POST', '/v1/login', { email: 'ana@exemplo.com', password: 'senha-forte-1', device: CEL });
  const request = await call('POST', '/v1/device/authorization', { device: { name: 'TV concorrente' } });
  const approvals = await Promise.all([
    call('POST', '/v1/device/authorize', { userCode: request.body.userCode, approve: true }, account.body.accessToken),
    call('POST', '/v1/device/authorize', { userCode: request.body.userCode, approve: true }, account.body.accessToken),
  ]);
  assert.deepEqual(approvals.map((result) => result.status).sort(), [200, 404]);
  const storedDevices = await call('GET', '/v1/devices', null, account.body.accessToken);
  assert.equal(storedDevices.body.devices.filter((device) => device.name === 'TV concorrente').length, 1);

  const redemptions = await Promise.all([
    call('POST', '/v1/device/token', { deviceCode: request.body.deviceCode }),
    call('POST', '/v1/device/token', { deviceCode: request.body.deviceCode }),
  ]);
  assert.deepEqual(redemptions.map((result) => result.status).sort(), [200, 400]);
  const success = redemptions.find((result) => result.status === 200);
  assert.ok(success.body.accessToken && success.body.refreshToken);
  assert.equal(redemptions.find((result) => result.status === 400).body.error, 'expired_token');
});

test('relogin com o mesmo deviceId reaproveita o dispositivo e invalida o refresh antigo', async () => {
  const a = await call('POST', '/v1/login', { email: 'bia@exemplo.com', password: 'senha-forte-2', device: { id: undefined, name: 'Cel', type: 'mobile' } });
  const again = await call('POST', '/v1/login', { email: 'bia@exemplo.com', password: 'senha-forte-2', device: { id: a.body.device.id, name: 'Cel', type: 'mobile' } });
  assert.equal(again.body.device.id, a.body.device.id);
  assert.equal((await call('POST', '/v1/refresh', { refreshToken: a.body.refreshToken })).status, 401);
});

test('limite de tentativas bloqueia depois de 3 falhas (config de teste)', async () => {
  const body = { email: 'bia@exemplo.com', password: 'errada-errada', device: CEL };
  for (let i = 0; i < 3; i++) assert.equal((await call('POST', '/v1/login', body)).status, 401);
  const r = await call('POST', '/v1/login', body);
  assert.equal(r.status, 429); assert.ok(r.headers.get('retry-after'));
  // mesmo a senha certa fica bloqueada durante a janela
  assert.equal((await call('POST', '/v1/login', { ...body, password: 'senha-forte-2' })).status, 429);
});

test('corpo grande, JSON inválido e rota inexistente', async () => {
  const big = await fetch(base + '/v1/login', { method: 'POST', body: 'x'.repeat(20000) }).catch(() => ({ status: 'reset' }));
  assert.ok(big.status === 413 || big.status === 'reset');
  assert.equal((await fetch(base + '/v1/login', { method: 'POST', body: '{ruim' })).status, 400);
  for (const value of ['null', '[]', '"texto"', '42']) {
    const response = await fetch(base + '/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: value });
    assert.equal(response.status, 400, `JSON não objeto deve ser recusado: ${value}`);
    assert.equal((await response.json()).error, 'bad_json');
  }
  assert.equal((await call('GET', '/v1/nada')).status, 404);
  assert.equal((await call('GET', '/health')).status, 200);
});

test('painel local serve logo e bloqueia origens e hosts externos', async () => {
  let revokedGrantId = null;
  const panel = createDashboard({ dashboardSnapshot: () => ({ ok: true, accessGrants: [] }), createAccount: async (input) => ({ email: input.email }), revokeHostGrantForDashboard: (id) => { revokedGrantId = id; return id === '123e4567-e89b-42d3-a456-426614174000'; } });
  await new Promise((ok) => panel.listen(0, '127.0.0.1', ok));
  const panelBase = `http://127.0.0.1:${panel.address().port}`;
  try {
    const brand = await fetch(`${panelBase}/brand.png`);
    assert.equal(brand.status, 200);
    assert.equal(brand.headers.get('content-type'), 'image/png');
    assert.equal(brand.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(Buffer.from(await brand.arrayBuffer()).length, fs.statSync(path.join(__dirname, '..', 'dashboard', 'brand.png')).size);
    const settings = await (await fetch(`${panelBase}/`)).text();
    assert.match(settings, /backup-export/);
    assert.match(settings, /backup-restore/);
    assert.match(settings, /page-access/);
    const dashboardScript = await (await fetch(`${panelBase}/app.js`)).text();
    assert.match(dashboardScript, /exportBackup/);
    assert.match(dashboardScript, /restoreBackup/);
    assert.match(dashboardScript, /renderAccessGrants/);
    assert.equal((await fetch(`${panelBase}/api/status`)).status, 200);
    const grantId = '123e4567-e89b-42d3-a456-426614174000';
    const revoked = await fetch(`${panelBase}/api/access-grants/${grantId}/revoke`, { method: 'POST', headers: { Origin: panelBase, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(revoked.status, 200);
    assert.equal(revokedGrantId, grantId);
    const forgedRevoke = await fetch(`${panelBase}/api/access-grants/${grantId}/revoke`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(forgedRevoke.status, 403);
    const invalidRevoke = await fetch(`${panelBase}/api/access-grants/${grantId}/revoke`, { method: 'POST', headers: { Origin: panelBase, 'Content-Type': 'application/json' }, body: '{bad' });
    assert.equal(invalidRevoke.status, 400);
    const blockedHost = await new Promise((resolve, reject) => {
      const req = http.get({ hostname: '127.0.0.1', port: panel.address().port, path: '/', headers: { Host: 'evil.example' } }, (res) => {
        res.resume(); res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
    });
    assert.equal(blockedHost, 403);
    assert.equal((await fetch(`${panelBase}/`, { headers: { Origin: 'https://evil.example' } })).status, 403);
    const account = await fetch(`${panelBase}/api/accounts`, { method: 'POST', headers: { Origin: panelBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'novo@cobre.test', password: 'senha-forte-1' }) });
    assert.equal(account.status, 201);
    assert.equal((await account.json()).account.email, 'novo@cobre.test');
    const forged = await fetch(`${panelBase}/api/accounts`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'fraude@cobre.test', password: 'senha-forte-1' }) });
    assert.equal(forged.status, 403);
  } finally {
    await new Promise((resolve) => panel.close(resolve));
  }
});
