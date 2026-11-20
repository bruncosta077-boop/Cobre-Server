'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createServer } = require('../server');
const { createBackup, openBackup } = require('../backup');

const database = Buffer.concat([Buffer.from('SQLite format 3\0'), Buffer.from('database snapshot')]);
const secretKey = Buffer.from('0123456789abcdef'.repeat(4));
const validInput = { database, secretKey, passphrase: 'uma senha forte para backup', version: '0.5.0-beta.1' };

test('backup criptografado preserva base, chave e metadados', () => {
  const archive = createBackup(validInput);
  const restored = openBackup(archive, validInput.passphrase);
  assert.deepEqual(restored.database, database);
  assert.deepEqual(restored.secretKey, secretKey);
  assert.equal(restored.version, validInput.version);
  assert.ok(restored.createdAt);
  assert.equal(archive.toString().includes(database.toString()), false);
  assert.equal(archive.toString().includes(secretKey.toString()), false);
});

test('backup recusa senha errada e alteração do conteúdo', () => {
  const archive = createBackup(validInput);
  assert.throws(() => openBackup(archive, 'outra senha forte diferente'), /Senha incorreta/);
  const altered = JSON.parse(archive.toString());
  const ciphertext = Buffer.from(altered.ciphertext, 'base64');
  ciphertext[ciphertext.length - 1] ^= 1;
  altered.ciphertext = ciphertext.toString('base64');
  assert.throws(() => openBackup(Buffer.from(JSON.stringify(altered)), validInput.passphrase), /Senha incorreta/);
});

test('backup recusa formato, banco e senha inválidos', () => {
  assert.throws(() => createBackup({ ...validInput, passphrase: 'curta' }), /12 a 256/);
  assert.throws(() => createBackup({ ...validInput, database: Buffer.from('not sqlite') }), /banco de dados/);
  assert.throws(() => createBackup({ ...validInput, secretKey: Buffer.from('ruim') }), /chave/);
  assert.throws(() => openBackup(Buffer.from('{"magic":"outro"}'), validInput.passphrase), /compatível/);
});

test('backup da base de uma instância restaura a conta sem expor o email no arquivo', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-backup-integration-'));
  const target = path.join(dir, 'snapshot.db');
  const srv = createServer({ dataDir: dir });
  try {
    await srv.createAccount({ email: 'conta-privada@cobre.test', password: 'senha-segura-123' });
    srv.createDatabaseSnapshot(target);
    const key = fs.readFileSync(path.join(dir, 'secret.key'));
    const archive = createBackup({ database: fs.readFileSync(target), secretKey: key, passphrase: validInput.passphrase, version: '0.5.0-beta.1' });
    assert.equal(archive.toString().includes('conta-privada@cobre.test'), false);
    const restored = openBackup(archive, validInput.passphrase);
    const recoveredDb = path.join(dir, 'recovered.db');
    fs.writeFileSync(recoveredDb, restored.database);
    const db = new DatabaseSync(recoveredDb, { readOnly: true });
    try {
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
      assert.equal(db.prepare('SELECT email FROM users').get().email, 'conta-privada@cobre.test');
    } finally { db.close(); }
  } finally {
    srv.close_db();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
