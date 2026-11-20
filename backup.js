'use strict';

const crypto = require('node:crypto');

const MAGIC = 'COBRE-SERVER-BACKUP';
const SCHEMA = 1;
const MAX_DATABASE_BYTES = 128 * 1024 * 1024;
const MIN_PASSPHRASE_LENGTH = 12;

function checkPassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE_LENGTH || passphrase.length > 256) {
    throw new Error('Use uma senha de backup com 12 a 256 caracteres.');
  }
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

function createBackup({ database, secretKey, passphrase, version, createdAt = new Date().toISOString() }) {
  checkPassphrase(passphrase);
  const db = Buffer.from(database);
  const key = Buffer.from(secretKey).toString('utf8').trim();
  if (db.length < 16 || db.length > MAX_DATABASE_BYTES || db.subarray(0, 16).toString('binary') !== 'SQLite format 3\0') {
    throw new Error('O banco de dados da instância não é válido ou excede 512 MB.');
  }
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('A chave de assinatura local está inválida.');

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  cipher.setAAD(Buffer.from(`${MAGIC}:${SCHEMA}`));
  const payload = Buffer.from(JSON.stringify({
    app: 'Cobre Server', schema: SCHEMA, version: String(version || ''), createdAt,
    database: db.toString('base64'), secretKey: key,
  }));
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.from(JSON.stringify({
    magic: MAGIC, schema: SCHEMA, kdf: 'scrypt-32768-8-1', cipher: 'aes-256-gcm',
    salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }, null, 2));
}

function openBackup(envelopeBytes, passphrase) {
  checkPassphrase(passphrase);
  if (!Buffer.isBuffer(envelopeBytes) || envelopeBytes.length > MAX_DATABASE_BYTES * 1.5) throw new Error('O arquivo de backup é inválido ou excede o limite.');
  let envelope;
  try { envelope = JSON.parse(envelopeBytes.toString('utf8')); } catch { throw new Error('O arquivo de backup não é válido.'); }
  if (envelope?.magic !== MAGIC || envelope.schema !== SCHEMA || envelope.kdf !== 'scrypt-32768-8-1' || envelope.cipher !== 'aes-256-gcm') {
    throw new Error('Este não é um backup compatível do Cobre Server.');
  }
  let salt, iv, tag, ciphertext;
  try {
    salt = Buffer.from(envelope.salt, 'base64'); iv = Buffer.from(envelope.iv, 'base64');
    tag = Buffer.from(envelope.tag, 'base64'); ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  } catch { throw new Error('O arquivo de backup está danificado.'); }
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || ciphertext.length < 16 || ciphertext.length > MAX_DATABASE_BYTES * 1.2) {
    throw new Error('O arquivo de backup está danificado ou excede o limite.');
  }
  let payload;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
    decipher.setAAD(Buffer.from(`${MAGIC}:${SCHEMA}`));
    decipher.setAuthTag(tag);
    payload = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
  } catch { throw new Error('Senha incorreta ou arquivo de backup alterado.'); }
  if (payload?.app !== 'Cobre Server' || payload.schema !== SCHEMA || typeof payload.database !== 'string' || !/^[a-f0-9]{64}$/i.test(payload.secretKey || '')) {
    throw new Error('Os dados deste backup estão incompletos.');
  }
  const database = Buffer.from(payload.database, 'base64');
  if (database.length < 16 || database.length > MAX_DATABASE_BYTES || database.subarray(0, 16).toString('binary') !== 'SQLite format 3\0') {
    throw new Error('O banco de dados deste backup está inválido.');
  }
  return { database, secretKey: Buffer.from(payload.secretKey, 'utf8'), version: String(payload.version || ''), createdAt: String(payload.createdAt || '') };
}

module.exports = { createBackup, openBackup, MIN_PASSPHRASE_LENGTH, MAX_DATABASE_BYTES };
