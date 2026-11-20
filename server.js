'use strict';
// Cobre ID — servidor de contas, dispositivos, sessões, presença e pareamento por código (v0.2).
// Sem dependências externas: Node >= 22.13 (node:sqlite embutido).
// HTTPS opcional: o processo principal importa o certificado configurado e não abre HTTP em paralelo.
const http = require('http');
const https = require('https');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DatabaseSync } = require('node:sqlite');
const { createDashboard } = require('./dashboard');
const appInfo = require('./package.json');

const b64u = (b) => Buffer.from(b).toString('base64url');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const now = () => Date.now();

function isLanAddress(raw) {
  const address = String(raw || '').toLowerCase().split('%')[0];
  const family = net.isIP(address);
  if (family === 6) {
    if (address === '::1') return true;
    if (address.startsWith('::ffff:')) {
      const mapped = address.slice(7);
      if (net.isIP(mapped) === 4) return isLanAddress(mapped);
      const words = mapped.split(':');
      if (words.length === 2 && words.every((word) => /^[0-9a-f]{1,4}$/.test(word))) {
        const high = Number.parseInt(words[0], 16), low = Number.parseInt(words[1], 16);
        return isLanAddress(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
      }
      return false;
    }
    const first = Number.parseInt(address.split(':')[0] || '0', 16);
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80; // ULA ou link-local
  }
  if (family !== 4) return false;
  const octets = address.split('.').map(Number);
  const [a, b] = octets;
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

function createServer(opts = {}) {
  const cfg = {
    dataDir: opts.dataDir || process.env.DATA_DIR || path.join(__dirname, 'data'),
    accessTtl: opts.accessTtl ?? Number(process.env.ACCESS_TTL || 600),          // segundos
    refreshTtl: opts.refreshTtl ?? Number(process.env.REFRESH_TTL || 60 * 86400), // segundos
    onlineWindow: opts.onlineWindow ?? 45_000,                                     // ms
    maxFails: opts.maxFails ?? 10,                                                 // por email+ip em 15 min
    maxFailsIp: opts.maxFailsIp ?? 40,
    trustProxy: opts.trustProxy ?? process.env.TRUST_PROXY === '1',
  };
  fs.mkdirSync(cfg.dataDir, { recursive: true });

  const keyFile = path.join(cfg.dataDir, 'secret.key');
  if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  const keyText = fs.readFileSync(keyFile, 'utf8').trim();
  if (!/^[0-9a-f]{64}$/i.test(keyText)) throw new Error('A chave local secret.key está inválida; o Cobre Server não iniciou. Restaure a cópia de segurança da chave.');
  const SECRET = Buffer.from(keyText, 'hex');

  const db = new DatabaseSync(path.join(cfg.dataDir, 'cobre-id.db'));
  db.exec(`
    PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT NOT NULL, created INTEGER NOT NULL, last_seen INTEGER NOT NULL DEFAULT 0, meta TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS refresh(hash TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS device_codes(code_hash TEXT PRIMARY KEY, user_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, type TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT REFERENCES devices(id) ON DELETE CASCADE, last_poll INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS ix_dev_user ON devices(user_id);
    CREATE INDEX IF NOT EXISTS ix_device_codes_exp ON device_codes(expires);
  `);
  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT id, email FROM users WHERE id = ?'),
    addUser: db.prepare('INSERT INTO users(id,email,pass,created) VALUES(?,?,?,?)'),
    addDevice: db.prepare('INSERT INTO devices(id,user_id,name,type,created,last_seen) VALUES(?,?,?,?,?,?)'),
    device: db.prepare('SELECT * FROM devices WHERE id = ?'),
    devicesOf: db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY created'),
    delDevice: db.prepare('DELETE FROM devices WHERE id = ? AND user_id = ?'),
    seen: db.prepare('UPDATE devices SET last_seen = ?, meta = ? WHERE id = ?'),
    addRef: db.prepare('INSERT INTO refresh(hash,device_id,expires) VALUES(?,?,?)'),
    ref: db.prepare('SELECT * FROM refresh WHERE hash = ?'),
    useRef: db.prepare('UPDATE refresh SET used = 1 WHERE hash = ?'),
    delRefOf: db.prepare('DELETE FROM refresh WHERE device_id = ?'),
    purge: db.prepare('DELETE FROM refresh WHERE expires < ?'),
    addDeviceCode: db.prepare('INSERT INTO device_codes(code_hash,user_code,name,type,created,expires) VALUES(?,?,?,?,?,?)'),
    deviceCode: db.prepare('SELECT * FROM device_codes WHERE code_hash = ?'),
    deviceCodeByUser: db.prepare('SELECT * FROM device_codes WHERE user_code = ?'),
    approveDeviceCode: db.prepare("UPDATE device_codes SET status = 'approved', user_id = ?, device_id = ? WHERE code_hash = ? AND status = 'pending'"),
    denyDeviceCode: db.prepare("UPDATE device_codes SET status = 'denied', user_id = ? WHERE code_hash = ? AND status = 'pending'"),
    pollDeviceCode: db.prepare('UPDATE device_codes SET last_poll = ? WHERE code_hash = ?'),
    consumeDeviceCode: db.prepare("DELETE FROM device_codes WHERE code_hash = ? AND status = 'redeemed'"),
  };
  const transaction = (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      db.exec('COMMIT');
      return value;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  // ---- senhas: scrypt (embutido no Node). Argon2id é o ideal; migrar quando houver na plataforma. ----
  const SC = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
  const hashPass = (pw) => new Promise((ok, no) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(pw, salt, 32, SC, (e, k) => e ? no(e) : ok(`scrypt$${SC.N}$${SC.r}$${SC.p}$${salt.toString('base64')}$${k.toString('base64')}`));
  });
  const checkPass = (pw, stored) => new Promise((ok) => {
    try {
      const [, N, r, p, s, h] = stored.split('$');
      crypto.scrypt(pw, Buffer.from(s, 'base64'), 32, { N: +N, r: +r, p: +p, maxmem: SC.maxmem }, (e, k) => {
        const want = Buffer.from(h, 'base64');
        ok(!e && k.length === want.length && crypto.timingSafeEqual(k, want));
      });
    } catch { ok(false); }
  });
  const DUMMY = hashPass('x'.repeat(12)); // para igualar o tempo quando o email não existe

  // ---- tokens de acesso: HS256 compacto ----
  const signAccess = (uid, did) => {
    const body = b64u(JSON.stringify({ sub: uid, did, exp: Math.floor(now() / 1000) + cfg.accessTtl }));
    const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const sig = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
    return `${head}.${body}.${sig}`;
  };
  const verifyAccess = (tok) => {
    const parts = String(tok || '').split('.');
    if (parts.length !== 3) return null;
    const want = crypto.createHmac('sha256', SECRET).update(`${parts[0]}.${parts[1]}`).digest();
    const got = Buffer.from(parts[2], 'base64url');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
    try {
      const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (!p.exp || p.exp * 1000 < now()) return null;
      return p;
    } catch { return null; }
  };
  const newRefresh = (did) => {
    const tok = crypto.randomBytes(32).toString('base64url');
    q.addRef.run(sha(tok), did, now() + cfg.refreshTtl * 1000);
    return tok;
  };
  const session = (user, did) => ({
    accessToken: signAccess(user.id, did), refreshToken: newRefresh(did), expiresIn: cfg.accessTtl,
    user: { id: user.id, email: user.email }, device: { id: did },
  });

  // ---- limite de tentativas (memória; reinicia com o processo) ----
  const fails = new Map();
  const deviceStarts = new Map();
  const failKey = (k) => { const e = fails.get(k); if (!e || e.reset < now()) { fails.set(k, { n: 0, reset: now() + 15 * 60_000 }); } return fails.get(k); };
  const blocked = (k, max) => { const e = fails.get(k); return e && e.reset >= now() && e.n >= max ? Math.ceil((e.reset - now()) / 1000) : 0; };
  const addFail = (k) => { failKey(k).n++; };
  const presenceMeta = (input) => {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const out = {};
    for (const key of ['platform', 'appVersion']) {
      const value = str(source[key], 32);
      if (value) out[key] = value;
    }
    for (const key of ['catalogResponseMs', 'streamLatencyMs', 'streamBytesPerSecond']) {
      const value = source[key];
      if (Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000) out[key] = value;
    }
    if (typeof source.desktopHostActive === 'boolean') out.desktopHostActive = source.desktopHostActive;
    return out;
  };
  setInterval(() => { for (const [k, e] of fails) if (e.reset < now()) fails.delete(k); for (const [k, t] of deviceStarts) if (t < now() - 15 * 60_000) deviceStarts.delete(k); q.purge.run(now()); db.prepare('DELETE FROM device_codes WHERE expires < ?').run(now()); }, 600_000).unref();

  // ---- util HTTP ----
  class HttpError extends Error { constructor(status, error, message, extra) { super(message); this.status = status; this.error = error; this.extra = extra; } }
  const send = (res, status, obj, headers = {}) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(body);
  };
  const readBody = (req) => new Promise((ok, no) => {
    let n = 0; const ch = [];
    req.on('data', (c) => { n += c.length; if (n > 16 * 1024) { no(new HttpError(413, 'too_large', 'Requisição grande demais.')); req.destroy(); } else ch.push(c); });
    req.on('end', () => {
      try {
        const value = ch.length ? JSON.parse(Buffer.concat(ch).toString()) : {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('body precisa ser objeto');
        ok(value);
      } catch { no(new HttpError(400, 'bad_json', 'Envie um objeto JSON válido.')); }
    });
    req.on('error', no);
  });
  const ipOf = (req) => (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
  const auth = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    const p = m && verifyAccess(m[1]);
    if (!p) throw new HttpError(401, 'unauthorized', 'Sessão inválida ou expirada.');
    const d = q.device.get(p.did);
    if (!d || d.user_id !== p.sub) throw new HttpError(401, 'device_revoked', 'Este dispositivo foi removido da conta.');
    return { uid: p.sub, did: p.did };
  };
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const TYPES = new Set(['desktop', 'mobile', 'tv']);
  const deviceIn = (u, dev) => {
    const name = str(dev?.name, 60) || 'Dispositivo';
    const type = TYPES.has(dev?.type) ? dev.type : null;
    if (!type) throw new HttpError(400, 'bad_device', 'Tipo de dispositivo inválido.');
    const existing = typeof dev.id === 'string' ? q.device.get(dev.id) : null;
    if (existing && existing.user_id === u.id) { q.delRefOf.run(existing.id); return existing.id; }
    const id = crypto.randomUUID();
    q.addDevice.run(id, u.id, name, type, now(), 0);
    return id;
  };
  const view = (d, cur) => {
    let meta = {}; try { meta = JSON.parse(d.meta); } catch {}
    return { id: d.id, name: d.name, type: d.type, online: d.last_seen > now() - cfg.onlineWindow, lastSeen: d.last_seen || null, current: d.id === cur, meta };
  };
  const CODE_TTL = 10 * 60_000, CODE_INTERVAL = 5;
  const USER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makeUserCode = () => Array.from({ length: 8 }, () => USER_CODE_CHARS[crypto.randomInt(USER_CODE_CHARS.length)]).join('').replace(/^(.{4})/, '$1-');
  const issueDeviceCode = (name) => {
    for (let i = 0; i < 8; i++) {
      const raw = crypto.randomBytes(32).toString('base64url'), userCode = makeUserCode();
      try { q.addDeviceCode.run(sha(raw), userCode, name, 'tv', now(), now() + CODE_TTL); return { deviceCode: raw, userCode, expiresIn: CODE_TTL / 1000, interval: CODE_INTERVAL }; }
      catch (e) { if (!String(e.message).includes('UNIQUE')) throw e; }
    }
    throw new HttpError(503, 'code_unavailable', 'Não foi possível gerar um código agora. Tente novamente.');
  };

  const routes = {
    'GET /health': async () => [200, { ok: true }],

    'POST /v1/register': async (req, body) => {
      const ip = ipOf(req);
      const wait = blocked('ip:' + ip, cfg.maxFailsIp);
      if (wait) throw new HttpError(429, 'rate_limited', 'Muitas tentativas. Aguarde.', { retryAfter: wait });
      const email = str(body.email, 254).toLowerCase();
      const pw = typeof body.password === 'string' ? body.password : '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'bad_email', 'Email inválido.');
      if (pw.length < 8 || pw.length > 200) throw new HttpError(400, 'weak_password', 'A senha precisa ter de 8 a 200 caracteres.');
      if (!TYPES.has(body.device?.type)) throw new HttpError(400, 'bad_device', 'Tipo de dispositivo inválido.');
      addFail('ip:' + ip); // registros também contam no limite por IP
      if (q.userByEmail.get(email)) throw new HttpError(409, 'email_taken', 'Este email já tem conta.');
      const user = { id: crypto.randomUUID(), email };
      q.addUser.run(user.id, email, await hashPass(pw), now());
      const did = deviceIn(user, body.device);
      return [201, session(user, did)];
    },

    'POST /v1/login': async (req, body) => {
      const ip = ipOf(req);
      const email = str(body.email, 254).toLowerCase();
      const k1 = `em:${email}|${ip}`, k2 = 'ip:' + ip;
      const wait = Math.max(blocked(k1, cfg.maxFails), blocked(k2, cfg.maxFailsIp));
      if (wait) throw new HttpError(429, 'rate_limited', 'Muitas tentativas. Aguarde.', { retryAfter: wait });
      const u = q.userByEmail.get(email);
      const pw = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
      const ok = await checkPass(pw, u ? u.pass : await DUMMY);
      if (!u || !ok) { addFail(k1); addFail(k2); throw new HttpError(401, 'bad_credentials', 'Email ou senha incorretos.'); }
      fails.delete(k1);
      const did = deviceIn(u, body.device);
      return [200, session(u, did)];
    },

    'POST /v1/refresh': async (req, body) => {
      const tok = typeof body.refreshToken === 'string' ? body.refreshToken : '';
      const row = tok ? q.ref.get(sha(tok)) : null;
      if (!row) throw new HttpError(401, 'bad_refresh', 'Sessão expirada. Entre novamente.');
      if (row.used) { // reuso de refresh antigo: possível roubo -> derruba a sessão do dispositivo
        q.delRefOf.run(row.device_id);
        throw new HttpError(401, 'refresh_reuse', 'Sessão encerrada por segurança. Entre novamente.');
      }
      if (row.expires < now()) throw new HttpError(401, 'bad_refresh', 'Sessão expirada. Entre novamente.');
      const d = q.device.get(row.device_id);
      if (!d) throw new HttpError(401, 'device_revoked', 'Este dispositivo foi removido da conta.');
      q.useRef.run(row.hash);
      return [200, session(q.userById.get(d.user_id), d.id)];
    },

    'POST /v1/logout': async (req) => {
      const a = auth(req);
      q.delDevice.run(a.did, a.uid);
      return [200, { ok: true }];
    },

    'GET /v1/devices': async (req) => {
      const a = auth(req);
      return [200, { devices: q.devicesOf.all(a.uid).map((d) => view(d, a.did)) }];
    },

    'POST /v1/presence': async (req, body) => {
      const a = auth(req);
      const meta = JSON.stringify(presenceMeta(body.meta));
      q.seen.run(now(), meta, a.did);
      return [200, { ok: true, serverTime: now() }];
    },

    // TV requests a short-lived code, then an already authenticated Cobre app approves it.
    'POST /v1/device/authorization': async (req, body) => {
      const ip = ipOf(req), starts = deviceStarts.get(ip) || [];
      const recent = starts.filter((t) => t > now() - 15 * 60_000);
      if (recent.length >= 5) throw new HttpError(429, 'rate_limited', 'Muitos códigos de TV solicitados. Aguarde alguns minutos.', { retryAfter: Math.ceil((recent[0] + 15 * 60_000 - now()) / 1000) });
      recent.push(now()); deviceStarts.set(ip, recent);
      const name = str(body.device?.name, 60) || 'Cobre TV';
      return [200, issueDeviceCode(name)];
    },

    'POST /v1/device/authorize': async (req, body) => {
      const a = auth(req), userCode = str(body.userCode, 9).toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(userCode)) throw new HttpError(400, 'bad_user_code', 'Código de TV inválido.');
      const row = q.deviceCodeByUser.get(userCode);
      if (!row || row.expires < now() || row.status !== 'pending') throw new HttpError(404, 'code_not_found', 'Este código não existe, expirou ou já foi usado.');
      if (body.approve === true) {
        const did = transaction(() => {
          const current = q.deviceCodeByUser.get(userCode);
          if (!current || current.expires < now() || current.status !== 'pending') throw new HttpError(404, 'code_not_found', 'Este código não existe, expirou ou já foi usado.');
          const id = crypto.randomUUID();
          q.addDevice.run(id, a.uid, current.name, 'tv', now(), 0);
          const updated = q.approveDeviceCode.run(a.uid, id, current.code_hash);
          if (updated.changes !== 1) throw new HttpError(404, 'code_not_found', 'Este código não existe, expirou ou já foi usado.');
          return id;
        });
        return [200, { ok: true, approved: true, device: { id: did, name: row.name, type: 'tv' } }];
      }
      if (body.approve === false) {
        const denied = q.denyDeviceCode.run(a.uid, row.code_hash);
        if (denied.changes !== 1) throw new HttpError(404, 'code_not_found', 'Este código não existe, expirou ou já foi usado.');
        return [200, { ok: true, approved: false }];
      }
      throw new HttpError(400, 'bad_request', 'Informe approve como true ou false.');
    },

    'POST /v1/device/token': async (_req, body) => {
      const raw = typeof body.deviceCode === 'string' ? body.deviceCode : '';
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(raw)) throw new HttpError(400, 'bad_device_code', 'Código de dispositivo inválido.');
      const hash = sha(raw), row = q.deviceCode.get(hash);
      if (!row || row.expires < now()) throw new HttpError(400, 'expired_token', 'O código expirou. Inicie o pareamento novamente.');
      if (row.last_poll && now() - row.last_poll < CODE_INTERVAL * 1000) {
        q.pollDeviceCode.run(now(), hash);
        throw new HttpError(429, 'slow_down', 'Aguarde antes de consultar novamente.', { retryAfter: CODE_INTERVAL });
      }
      q.pollDeviceCode.run(now(), hash);
      if (row.status === 'pending') throw new HttpError(400, 'authorization_pending', 'Aprove este Cobre TV no celular ou computador.');
      if (row.status === 'denied') throw new HttpError(400, 'access_denied', 'O pareamento foi recusado.');
      if (row.status !== 'approved' || !row.user_id || !row.device_id) throw new HttpError(400, 'expired_token', 'Este código não pode mais ser usado.');
      const device = q.device.get(row.device_id), user = q.userById.get(row.user_id);
      if (!device || !user || device.user_id !== user.id) throw new HttpError(400, 'access_denied', 'O dispositivo autorizado foi removido da conta.');
      const out = transaction(() => {
        const current = q.deviceCode.get(hash);
        if (!current || current.status !== 'approved' || current.expires < now()) throw new HttpError(400, 'expired_token', 'Este código não pode mais ser usado.');
        const redeemed = db.prepare("UPDATE device_codes SET status = 'redeemed' WHERE code_hash = ? AND status = 'approved'").run(hash);
        if (redeemed.changes !== 1) throw new HttpError(400, 'expired_token', 'Este código não pode mais ser usado.');
        const tokens = session(user, device.id);
        q.consumeDeviceCode.run(hash);
        return tokens;
      });
      return [200, out];
    },
  };

  const transport = opts.tls || null;
  const handler = async (req, res) => {
    try {
      if (!isLanAddress(req.socket.remoteAddress)) throw new HttpError(403, 'network_not_allowed', 'O Cobre Server aceita conexões locais por padrão.');
      const url = new URL(req.url, 'http://x');
      let key = `${req.method} ${url.pathname}`;
      let handler = routes[key];
      let param;
      const del = /^\/v1\/devices\/([0-9a-f-]{36})$/.exec(url.pathname);
      if (!handler && req.method === 'DELETE' && del) {
        param = del[1];
        handler = async (rq) => {
          const a = auth(rq);
          const target = q.device.get(param);
          if (!target || target.user_id !== a.uid) throw new HttpError(404, 'not_found', 'Dispositivo não encontrado.');
          q.delDevice.run(param, a.uid);
          return [200, { ok: true }];
        };
      }
      if (!handler) throw new HttpError(404, 'not_found', 'Rota não encontrada.');
      const body = req.method === 'GET' || req.method === 'DELETE' ? {} : await readBody(req);
      const [status, out] = await handler(req, body);
      send(res, status, out);
    } catch (e) {
      if (e instanceof HttpError) {
        send(res, e.status, { error: e.error, message: e.message, ...(e.extra || {}) }, e.extra?.retryAfter ? { 'Retry-After': String(e.extra.retryAfter) } : {});
      } else { console.error('erro interno:', e.message); send(res, 500, { error: 'internal', message: 'Erro interno.' }); }
    }
  };
  const server = transport
    ? https.createServer({ cert: transport.cert, key: transport.key, minVersion: 'TLSv1.2' }, handler)
    : http.createServer(handler);
  server.requestTimeout = 15_000;
  server.dashboardSnapshot = () => {
    const devices = db.prepare('SELECT id,name,type,created,last_seen,meta FROM devices ORDER BY last_seen DESC,created DESC').all();
    return {
      name: 'Cobre Server', version: appInfo.version, serverTime: now(), uptimeSeconds: Math.floor(process.uptime()), dataDir: cfg.dataDir,
      secureTransport: Boolean(transport), certificateInfo: transport?.certificateInfo || null,
      apiPort: server.address()?.port || Number(process.env.PORT || 8080),
      lanAddresses: Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address),
      onlineWindowMs: cfg.onlineWindow, accountCount: db.prepare('SELECT COUNT(*) AS count FROM users').get().count,
      deviceCount: devices.length,
      devices: devices.map((d) => {
        let meta = {}; try { meta = JSON.parse(d.meta); } catch {}
        return { id: d.id, name: d.name, type: d.type, createdAt: d.created, lastSeen: d.last_seen || null,
          online: d.last_seen > now() - cfg.onlineWindow, appVersion: str(meta.appVersion, 32), platform: str(meta.platform, 32),
          catalogResponseMs: Number.isSafeInteger(meta.catalogResponseMs) ? meta.catalogResponseMs : null,
          streamLatencyMs: Number.isSafeInteger(meta.streamLatencyMs) ? meta.streamLatencyMs : null,
          streamBytesPerSecond: Number.isSafeInteger(meta.streamBytesPerSecond) ? meta.streamBytesPerSecond : null,
          desktopHostActive: meta.desktopHostActive === true };
      }),
    };
  };
  server.createAccount = async (input = {}) => {
    const email = str(input.email, 254).toLowerCase();
    const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'bad_email', 'Informe um email válido.');
    if (password.length < 8 || password.length > 200) throw new HttpError(400, 'weak_password', 'A senha precisa ter de 8 a 200 caracteres.');
    try {
      const id = crypto.randomUUID();
      q.addUser.run(id, email, await hashPass(password), now());
      return { id, email };
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'email_taken', 'Este email já tem uma conta Cobre ID.');
      throw error;
    }
  };
  server.createDatabaseSnapshot = (targetPath) => {
    const safePath = path.resolve(targetPath).replaceAll("'", "''");
    if (fs.existsSync(targetPath)) throw new Error('O destino do backup já existe.');
    db.exec(`VACUUM INTO '${safePath}'`);
  };
  server.close_db = () => db.close();
  return server;
}

module.exports = { createServer, isLanAddress };

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '0.0.0.0';
  const dashboardPort = Number(process.env.DASHBOARD_PORT || 8788);
  const os = require('os');
  const score = (ip) => (ip.startsWith('192.168.') ? 3 : ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : ip.startsWith('169.254.') ? -1 : 0);
  const lan = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address).sort((a, b) => score(b) - score(a));
  const { readConfiguredTlsPair } = require('./tls-config');
  const transport = readConfiguredTlsPair(process.env.DATA_DIR || path.join(__dirname, 'data'));
  const protocol = transport ? 'https' : 'http';
  const api = createServer({ tls: transport });
  api.listen(port, host, () => {
    console.log('Cobre ID no ar.');
    console.log(`  Neste computador:  ${protocol}://localhost:${port}`);
    for (const ip of lan.slice(0, 3)) console.log(`  No celular (mesmo Wi-Fi):  ${protocol}://${ip}:${port}`);
    const dashboard = createDashboard(api);
    dashboard.on('error', (e) => console.error('Painel local indisponível:', e.message));
    dashboard.listen(dashboardPort, '127.0.0.1', () => {
      console.log('  Painel local: http://127.0.0.1:' + dashboardPort + ' (somente neste computador)');
    });
  });
}
