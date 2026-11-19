'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createServer } = require('../server');
const { createDashboard } = require('../dashboard');

let srv, base, dir;
const call = async (method, p, body, token) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json(), headers: r.headers };
};
const PC = { name: 'PC da sala', type: 'desktop' }, CEL = { name: 'Pixel', type: 'mobile' };

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
  await call('POST', '/v1/presence', { meta: { platform: 'Android', appVersion: '0.7.0', catalogResponseMs: 132, streamBytesPerSecond: 2_000_000, password: 'must-not-be-stored', localPath: 'C:\\Music' } }, pc.body.accessToken);
  let l = await call('GET', '/v1/devices', null, lg.body.accessToken);
  const me = l.body.devices.find((d) => d.id === pc.body.device.id);
  assert.equal(me.online, true); assert.equal(me.meta.appVersion, '0.7.0');
  assert.equal(me.meta.catalogResponseMs, 132); assert.equal(me.meta.streamBytesPerSecond, 2_000_000);
  assert.equal(me.meta.password, undefined); assert.equal(me.meta.localPath, undefined);
  await new Promise((ok) => setTimeout(ok, 1700));
  l = await call('GET', '/v1/devices', null, lg.body.accessToken);
  assert.equal(l.body.devices.find((d) => d.id === pc.body.device.id).online, false);
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
  assert.equal((await call('GET', '/v1/nada')).status, 404);
  assert.equal((await call('GET', '/health')).status, 200);
});

test('painel local serve logo e bloqueia origens e hosts externos', async () => {
  const panel = createDashboard({ dashboardSnapshot: () => ({ ok: true }) });
  await new Promise((ok) => panel.listen(0, '127.0.0.1', ok));
  const panelBase = `http://127.0.0.1:${panel.address().port}`;
  try {
    const brand = await fetch(`${panelBase}/brand.png`);
    assert.equal(brand.status, 200);
    assert.equal(brand.headers.get('content-type'), 'image/png');
    assert.equal(brand.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(Buffer.from(await brand.arrayBuffer()).length, fs.statSync(path.join(__dirname, '..', 'dashboard', 'brand.png')).size);
    assert.equal((await fetch(`${panelBase}/api/status`)).status, 200);
    const blockedHost = await new Promise((resolve, reject) => {
      const req = http.get({ hostname: '127.0.0.1', port: panel.address().port, path: '/', headers: { Host: 'evil.example' } }, (res) => {
        res.resume(); res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
    });
    assert.equal(blockedHost, 403);
    assert.equal((await fetch(`${panelBase}/`, { headers: { Origin: 'https://evil.example' } })).status, 403);
  } finally {
    await new Promise((resolve) => panel.close(resolve));
  }
});
