'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');

const MAX_PEM_BYTES = 2 * 1024 * 1024;
const CONFIG_DIR = 'transport-tls';

function validateTlsPair(certificate, privateKey, at = Date.now()) {
  const certText = Buffer.isBuffer(certificate) ? certificate.toString('utf8') : String(certificate || '');
  const keyText = Buffer.isBuffer(privateKey) ? privateKey.toString('utf8') : String(privateKey || '');
  if (!certText || !keyText || Buffer.byteLength(certText) > MAX_PEM_BYTES || Buffer.byteLength(keyText) > MAX_PEM_BYTES) {
    throw new Error('Certificado e chave PEM são obrigatórios e devem ter até 2 MB cada.');
  }
  if (/ENCRYPTED PRIVATE KEY|Proc-Type:\s*4,ENCRYPTED/i.test(keyText)) throw new Error('A chave privada está protegida por senha. Exporte uma chave PEM sem senha e mantenha o arquivo protegido no perfil do Windows.');
  let x509;
  try { x509 = new crypto.X509Certificate(certText); }
  catch { throw new Error('O certificado não é PEM/X.509 válido.'); }
  const validFrom = Date.parse(x509.validFrom), validTo = Date.parse(x509.validTo);
  if (!Number.isFinite(validFrom) || !Number.isFinite(validTo) || validFrom > at || validTo <= at) throw new Error('O certificado ainda não está válido ou já expirou.');
  try { tls.createSecureContext({ cert: certText, key: keyText }); }
  catch { throw new Error('A chave privada não corresponde ao certificado ou não está em formato PEM compatível.'); }
  const subjectAltName = x509.subjectAltName || '';
  const hosts = subjectAltName.split(/,\s*/).flatMap((entry) => {
    if (entry.startsWith('DNS:')) return [entry.slice(4).trim()];
    if (entry.startsWith('IP Address:')) return [entry.slice('IP Address:'.length).trim()];
    return [];
  }).filter(Boolean);
  return { cert: certText, key: keyText, subject: x509.subject, validTo: x509.validTo, subjectAltName, hosts };
}

function pathsFor(dataDir) {
  const root = path.join(dataDir, CONFIG_DIR);
  const pointer = path.join(root, 'active.json');
  return { root, pointer };
}

function readConfiguredTlsPair(dataDir) {
  const { root, pointer } = pathsFor(dataDir);
  if (!fs.existsSync(pointer)) return null;
  let active;
  try { active = JSON.parse(fs.readFileSync(pointer, 'utf8')); }
  catch { throw new Error('A configuração HTTPS local está corrompida. Reimporte o certificado e a chave.'); }
  if (typeof active?.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(active.fingerprint)) throw new Error('A configuração HTTPS local está inválida. Reimporte o certificado e a chave.');
  const dir = path.join(root, active.fingerprint);
  const result = validateTlsPair(fs.readFileSync(path.join(dir, 'certificate.pem')), fs.readFileSync(path.join(dir, 'private-key.pem')));
  return { cert: result.cert, key: result.key, certificateInfo: { subject: result.subject, validTo: result.validTo, subjectAltName: result.subjectAltName, hosts: result.hosts } };
}

function saveTlsPair(dataDir, certificate, privateKey) {
  const valid = validateTlsPair(certificate, privateKey);
  const fingerprint = crypto.createHash('sha256').update(valid.cert).update('\0').update(valid.key).digest('hex');
  const { root, pointer } = pathsFor(dataDir);
  const dir = path.join(root, fingerprint);
  fs.mkdirSync(dir, { recursive: true });
  const certPath = path.join(dir, 'certificate.pem'), keyPath = path.join(dir, 'private-key.pem');
  if (!fs.existsSync(certPath)) fs.writeFileSync(certPath, valid.cert, { flag: 'wx', mode: 0o600 });
  if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, valid.key, { flag: 'wx', mode: 0o600 });
  const tempPointer = path.join(root, `active-${crypto.randomUUID()}.tmp`);
  fs.writeFileSync(tempPointer, JSON.stringify({ fingerprint }), { flag: 'wx', mode: 0o600 });
  try { fs.renameSync(tempPointer, pointer); }
  catch (error) { fs.rmSync(tempPointer, { force: true }); throw error; }
  return { subject: valid.subject, validTo: valid.validTo, subjectAltName: valid.subjectAltName, hosts: valid.hosts };
}

function removeTlsPair(dataDir) {
  const { root } = pathsFor(dataDir);
  fs.rmSync(root, { recursive: true, force: true });
}

module.exports = { validateTlsPair, readConfiguredTlsPair, saveTlsPair, removeTlsPair };
