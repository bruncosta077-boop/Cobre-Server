'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const https = require('node:https');
const { createServer } = require('../server');
const { saveTlsPair, readConfiguredTlsPair, removeTlsPair } = require('../tls-config');

test('API serve /health sobre HTTPS usando par PEM configurado', { skip: process.platform !== 'win32' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-https-'));
  let api;
  try {
    const generated = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File', path.join(__dirname, 'create-test-certificate.ps1'), dir], { encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr || generated.stdout || 'Não foi possível gerar o certificado de teste.');
    const certificate = fs.readFileSync(path.join(dir, 'certificate.pem'));
    const privateKey = fs.readFileSync(path.join(dir, 'private-key.pem'));
    saveTlsPair(path.join(dir, 'data'), certificate, privateKey);
    saveTlsPair(path.join(dir, 'data'), certificate, privateKey);
    const tls = readConfiguredTlsPair(path.join(dir, 'data'));
    api = createServer({ dataDir: path.join(dir, 'data'), tls });
    await new Promise((resolve, reject) => { api.once('error', reject); api.listen(0, '127.0.0.1', resolve); });
    const body = await new Promise((resolve, reject) => {
      https.get({ hostname: 'localhost', port: api.address().port, path: '/health', rejectUnauthorized: false }, (response) => {
        let raw = ''; response.setEncoding('utf8'); response.on('data', (part) => { raw += part; });
        response.on('end', () => response.statusCode === 200 ? resolve(raw) : reject(new Error(`HTTPS respondeu ${response.statusCode}.`)));
      }).on('error', reject);
    });
    assert.deepEqual(JSON.parse(body), { ok: true });
    removeTlsPair(path.join(dir, 'data'));
  } finally {
    if (api) { await new Promise((resolve) => api.close(resolve)); api.close_db(); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
