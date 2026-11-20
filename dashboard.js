'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'dashboard');
const ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/brand.png', ['brand.png', 'image/png']],
]);
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function createDashboard(api) {
  return http.createServer(async (req, res) => {
    const remote = req.socket.remoteAddress || '';
    let host = '';
    try { host = new URL(`http://${req.headers.host || ''}`).hostname.replace(/^\[|\]$/g, '').toLowerCase(); } catch {}
    const origin = req.headers.origin;
    if (!LOOPBACK.has(remote) || !['localhost', '127.0.0.1', '::1'].includes(host) ||
        (origin && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin))) {
      res.writeHead(403, { 'Cache-Control': 'no-store' }); return res.end('Painel disponível somente neste computador.');
    }
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const snapshot = api.dashboardSnapshot();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      });
      return res.end(JSON.stringify(snapshot));
    }
    if (req.method === 'POST' && url.pathname === '/api/accounts') {
      const expectedOrigin = `http://${req.headers.host}`;
      // Account creation is a local administrative action: require same-origin JSON to block cross-site form posts.
      if (!origin || origin !== expectedOrigin || !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
        res.writeHead(403, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ error: 'origin_not_allowed', message: 'A criação de contas só pode ser feita pelo painel local do Cobre Server.' }));
      }
      let raw = '';
      try {
        for await (const chunk of req) {
          raw += chunk.toString('utf8');
          if (Buffer.byteLength(raw) > 4096) {
            res.writeHead(413, { 'Cache-Control': 'no-store' });
            return res.end(JSON.stringify({ error: 'too_large', message: 'Requisição grande demais.' }));
          }
        }
        const input = raw ? JSON.parse(raw) : {};
        const account = await api.createAccount(input);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ account }));
      } catch (error) {
        const status = Number(error.status) || 400;
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ error: error.error || 'bad_request', message: status < 500 ? error.message : 'Não foi possível criar a conta.' }));
      }
    }
    const revokeGrant = /^\/api\/access-grants\/([0-9a-f-]{36})\/revoke$/.exec(url.pathname);
    if (req.method === 'POST' && revokeGrant) {
      const expectedOrigin = `http://${req.headers.host}`;
      if (!origin || origin !== expectedOrigin || !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
        res.writeHead(403, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ error: 'origin_not_allowed', message: 'A revogação só pode ser feita pelo painel local do Cobre Server.' }));
      }
      try {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk.toString('utf8');
          if (Buffer.byteLength(raw) > 1024) {
            res.writeHead(413, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            return res.end(JSON.stringify({ error: 'too_large', message: 'Requisição grande demais.' }));
          }
        }
        let input = {};
        try { input = raw ? JSON.parse(raw) : {}; } catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(JSON.stringify({ error: 'bad_json', message: 'Envie um objeto JSON válido.' }));
        }
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(JSON.stringify({ error: 'bad_json', message: 'Envie um objeto JSON válido.' }));
        }
        const revoked = api.revokeHostGrantForDashboard(revokeGrant[1]);
        if (!revoked) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(JSON.stringify({ error: 'grant_not_found', message: 'A permissão não está mais ativa.' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ ok: true, grantId: revokeGrant[1] }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ error: 'internal', message: 'Não foi possível revogar a permissão.' }));
      }
    }
    if (req.method !== 'GET' || !ASSETS.has(url.pathname)) {
      res.writeHead(404, { 'Cache-Control': 'no-store' }); return res.end('Não encontrado.');
    }
    const [file, type] = ASSETS.get(url.pathname);
    const body = fs.readFileSync(path.join(ROOT, file));
    res.writeHead(200, {
      'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    res.end(body);
  });
}

module.exports = { createDashboard };
