'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { compareVersions, selectLatestRelease, checksumFromText, parseAtomReleases, checkForUpdate, prepareUpdate, verifyDownloadedUpdate } = require('../update');

test('compara estáveis e pré-releases conforme a ordem de versões', () => {
  assert.equal(compareVersions('0.5.0-beta.10', '0.5.0-beta.3'), 1);
  assert.equal(compareVersions('0.5.0', '0.5.0-beta.99'), 1);
  assert.equal(compareVersions('0.5.0-beta.2', '0.5.0-beta.3'), -1);
});

test('seleciona a release mais nova que tem instalador Windows e ignora rascunhos', () => {
  const release = (tag, draft = false) => ({
    tag_name: tag, draft,
    assets: [{ name: `Cobre-Server-${tag.slice(1)}-Windows-x64.exe`, size: 10 }],
  });
  assert.equal(selectLatestRelease([release('v0.8.0'), release('v1.0.0', true), release('v0.9.0')]).tag_name, 'v0.9.0');
  assert.equal(selectLatestRelease([{ tag_name: 'not-a-version', assets: [] }]), null);
});

test('lê somente a soma do arquivo esperado no manifesto', () => {
  const digest = 'a'.repeat(64);
  assert.equal(checksumFromText(`${digest}  cobre.exe\n${'b'.repeat(64)}  Cobre-Server.exe`, 'Cobre-Server.exe'), 'b'.repeat(64));
  assert.equal(checksumFromText(`${digest}  outro.exe`, 'Cobre-Server.exe'), null);
});

test('lê versões e notas do feed Atom oficial sem executar HTML', () => {
  const feed = '<feed><entry><link rel="alternate" href="https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.2.0"/><title>Cobre Server v1.2.0</title><updated>2026-11-20T14:00:00Z</updated><content type="html">&lt;p&gt;Notas &amp;amp; segurança&lt;/p&gt;&lt;ul&gt;&lt;li&gt;HTTPS&lt;/li&gt;&lt;/ul&gt;</content></entry></feed>';
  const [release] = parseAtomReleases(feed);
  assert.equal(release.tag_name, 'v1.2.0');
  assert.equal(release.prerelease, false);
  assert.match(release.body, /Notas & segurança/);
  assert.match(release.body, /HTTPS/);
  assert.deepEqual(parseAtomReleases('<feed><entry><link rel="alternate" href="https://evil.example/releases/tag/v2.0.0"/></entry></feed>'), []);
});

test('limite da API GitHub usa feed oficial para localizar e validar a atualização', async (t) => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-atom-'));
  t.after(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));
  const bytes = Buffer.from('installer bytes validated from Atom release');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const name = 'Cobre-Server-1.2.0-Windows-x64.exe';
  const checksumText = `${digest}  ${name}\n`;
  const feed = '<feed><entry><link rel="alternate" href="https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.2.0"/><title>Cobre Server v1.2.0</title><updated>2026-11-20T14:00:00Z</updated><content type="html">&lt;p&gt;TLS release notes&lt;/p&gt;</content></entry></feed>';
  const fetcher = async (url, options = {}) => {
    const target = new URL(String(url));
    if (target.hostname === 'api.github.com') return new Response('{"message":"API rate limit exceeded"}', { status: 403 });
    if (target.hostname === 'github.com' && target.pathname.endsWith('/releases.atom')) return new Response(feed, { status: 200 });
    if (target.hostname === 'github.com' && target.pathname.includes('/releases/download/')) {
      const artifact = target.pathname.endsWith('checksums-sha256.txt') ? 'checksums' : 'installer';
      return new Response(null, { status: 302, headers: { location: `https://release-assets.githubusercontent.com/${options.method === 'HEAD' ? 'head' : artifact}` } });
    }
    if (target.hostname === 'release-assets.githubusercontent.com') {
      if (target.pathname === '/head') return new Response(null, { status: 200, headers: { 'Content-Length': String(bytes.length) } });
      if (target.pathname === '/checksums') return new Response(checksumText, { status: 200 });
      if (target.pathname === '/installer') return new Response(bytes, { status: 200, headers: { 'Content-Length': String(bytes.length) } });
    }
    throw new Error('unexpected host');
  };
  const update = await checkForUpdate('1.1.0', fetcher);
  assert.equal(update.available, true);
  assert.equal(update.latestVersion, '1.2.0');
  assert.match(update.notes, /TLS release notes/);
  const prepared = await prepareUpdate('1.2.0', '1.1.0', tempDirectory, fetcher);
  assert.equal(prepared.digest, digest);
  assert.equal(await verifyDownloadedUpdate(prepared), true);
});

test('prepara somente o instalador oficial após conferir tamanho e SHA-256', async (t) => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-test-'));
  t.after(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));
  const bytes = Buffer.from('installer bytes for Cobre Server test');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const releases = [{
    tag_name: 'v1.2.0', name: 'Cobre Server 1.2.0', body: 'Notas de teste', html_url: 'https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.2.0',
    assets: [{ name: 'Cobre-Server-1.2.0-Windows-x64.exe', size: bytes.length, digest: `sha256:${digest}`, browser_download_url: 'https://github.com/bruncosta077-boop/Cobre-Server/releases/download/v1.2.0/Cobre-Server-1.2.0-Windows-x64.exe' }],
  }];
  const fetcher = async (url) => {
    if (String(url).startsWith('https://api.github.com/')) return new Response(JSON.stringify(releases), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (String(url).startsWith('https://github.com/')) return new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/cobre.exe' } });
    if (String(url).startsWith('https://release-assets.githubusercontent.com/')) return new Response(bytes, { status: 200, headers: { 'Content-Length': String(bytes.length) } });
    throw new Error('unexpected host');
  };
  const prepared = await prepareUpdate('1.2.0', '1.1.0', tempDirectory, fetcher);
  assert.equal(prepared.digest, digest);
  assert.equal(await verifyDownloadedUpdate(prepared), true);
  fs.appendFileSync(prepared.path, 'tamper');
  assert.equal(await verifyDownloadedUpdate(prepared), false);
});

test('descarta download com checksum incorreto', async (t) => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-bad-'));
  t.after(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));
  const bytes = Buffer.from('alterado');
  const release = [{ tag_name: 'v1.2.0', assets: [{ name: 'Cobre-Server-1.2.0-Windows-x64.exe', size: bytes.length, digest: `sha256:${'0'.repeat(64)}`, browser_download_url: 'https://github.com/bruncosta077-boop/Cobre-Server/releases/download/v1.2.0/Cobre-Server-1.2.0-Windows-x64.exe' }] }];
  const fetcher = async (url) => {
    if (String(url).startsWith('https://api.github.com/')) return new Response(JSON.stringify(release), { status: 200 });
    if (String(url).startsWith('https://github.com/')) return new Response(bytes, { status: 200, headers: { 'Content-Length': String(bytes.length) } });
    throw new Error('unexpected host');
  };
  await assert.rejects(prepareUpdate('1.2.0', '1.1.0', tempDirectory, fetcher), /SHA-256/);
  assert.deepEqual(fs.readdirSync(tempDirectory), []);
});

test('recusa URL de instalador fora da release oficial antes de baixá-lo', async () => {
  const bytes = Buffer.from('installer');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const release = [{ tag_name: 'v1.2.0', assets: [{
    name: 'Cobre-Server-1.2.0-Windows-x64.exe', size: bytes.length, digest: `sha256:${digest}`,
    browser_download_url: 'https://evil.example/Cobre-Server-1.2.0-Windows-x64.exe',
  }] }];
  const fetcher = async (url) => {
    if (String(url).startsWith('https://api.github.com/')) return new Response(JSON.stringify(release), { status: 200 });
    throw new Error('O teste não deve iniciar o download externo.');
  };
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-host-'));
  try {
    await assert.rejects(prepareUpdate('1.2.0', '1.1.0', tempDirectory, fetcher), /release oficial/);
    assert.deepEqual(fs.readdirSync(tempDirectory), []);
  } finally { fs.rmSync(tempDirectory, { recursive: true, force: true }); }
});
