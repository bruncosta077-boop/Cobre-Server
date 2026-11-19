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
  return http.createServer((req, res) => {
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
