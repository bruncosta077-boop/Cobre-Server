'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateTlsPair, readConfiguredTlsPair, removeTlsPair } = require('../tls-config');

test('HTTPS fica desligado quando ainda não há configuração TLS', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-tls-'));
  try { assert.equal(readConfiguredTlsPair(dir), null); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('certificado PEM inválido e chave cifrada são recusados', () => {
  assert.throws(() => validateTlsPair('not a certificate', 'not a key'), /não é PEM\/X\.509 válido/);
  assert.throws(() => validateTlsPair('not a certificate', '-----BEGIN ENCRYPTED PRIVATE KEY-----\n...\n-----END ENCRYPTED PRIVATE KEY-----'), /protegida por senha/);
});

test('configuração ativa corrompida falha fechada e pode ser removida', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-tls-'));
  const tlsDir = path.join(dir, 'transport-tls');
  try {
    fs.mkdirSync(tlsDir);
    fs.writeFileSync(path.join(tlsDir, 'active.json'), JSON.stringify({ fingerprint: '../outside' }));
    assert.throws(() => readConfiguredTlsPair(dir), /configuração HTTPS local está inválida/);
    removeTlsPair(dir);
    assert.equal(readConfiguredTlsPair(dir), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
