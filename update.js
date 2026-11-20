'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RELEASES_URL = 'https://api.github.com/repos/bruncosta077-boop/Cobre-Server/releases?per_page=30';
const MAX_INSTALLER_BYTES = 250 * 1024 * 1024;
const REDIRECT_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com']);

function parseVersion(value) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(String(value || ''));
  if (!match) return null;
  const prerelease = match[4] ? match[4].split('.') : null;
  if (prerelease?.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) return null;
  return { major: +match[1], minor: +match[2], patch: +match[3], prerelease };
}

function compareVersions(left, right) {
  const a = parseVersion(left); const b = parseVersion(right);
  if (!a || !b) throw new Error('A versão da atualização é inválida.');
  for (const key of ['major', 'minor', 'patch']) if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  const count = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < count; i++) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    if (a.prerelease[i] === b.prerelease[i]) continue;
    const an = /^\d+$/.test(a.prerelease[i]); const bn = /^\d+$/.test(b.prerelease[i]);
    if (an && bn) return Number(a.prerelease[i]) < Number(b.prerelease[i]) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return a.prerelease[i] < b.prerelease[i] ? -1 : 1;
  }
  return 0;
}

function releaseVersion(release) {
  const version = String(release?.tag_name || '').replace(/^v/, '');
  return parseVersion(version) ? version : null;
}

function installerAsset(release, version = releaseVersion(release)) {
  if (!version || !Array.isArray(release?.assets)) return null;
  const name = `Cobre-Server-${version}-Windows-x64.exe`;
  return release.assets.find((asset) => asset.name === name && Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= MAX_INSTALLER_BYTES) || null;
}

function isOfficialAssetUrl(release, asset) {
  try {
    const url = new URL(asset.browser_download_url);
    return url.protocol === 'https:' && url.hostname === 'github.com' && (!url.port || url.port === '443') &&
      url.pathname === `/bruncosta077-boop/Cobre-Server/releases/download/${release.tag_name}/${asset.name}`;
  } catch { return false; }
}

function selectLatestRelease(releases) {
  if (!Array.isArray(releases)) throw new Error('O GitHub retornou uma lista de versões inválida.');
  return releases
    .filter((release) => !release.draft && releaseVersion(release) && installerAsset(release))
    .sort((a, b) => compareVersions(releaseVersion(b), releaseVersion(a)))[0] || null;
}

async function fetchReleases(fetcher = fetch) {
  const response = await fetcher(RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Cobre-Server-Updater' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'O GitHub limitou as consultas. Tente novamente em alguns minutos.' : 'Não foi possível consultar as versões do Cobre Server.');
  return response.json();
}

async function checkForUpdate(currentVersion, fetcher = fetch) {
  const current = String(currentVersion || '').replace(/^v/, '');
  if (!parseVersion(current)) throw new Error('A versão instalada do Cobre Server é inválida.');
  const latest = selectLatestRelease(await fetchReleases(fetcher));
  if (!latest) throw new Error('O GitHub não encontrou uma versão compatível do Cobre Server para Windows.');
  const version = releaseVersion(latest);
  const asset = installerAsset(latest, version);
  return {
    currentVersion: current,
    latestVersion: version,
    available: compareVersions(version, current) > 0,
    prerelease: latest.prerelease === true,
    name: String(latest.name || `Cobre Server ${version}`).slice(0, 160),
    notes: String(latest.body || 'Esta versão não publicou notas adicionais.').slice(0, 12_000),
    publishedAt: String(latest.published_at || ''),
    releaseUrl: latest.html_url,
    asset: { name: asset.name, size: asset.size, url: asset.browser_download_url, digest: asset.digest || '' },
  };
}

function checksumFromText(text, filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^([a-fA-F0-9]{64})\\s+\\*?${escaped}\\s*$`, 'm').exec(String(text || ''));
  return match?.[1].toLowerCase() || null;
}

async function getExpectedDigest(release, asset, fetcher) {
  const digest = /^sha256:([a-f0-9]{64})$/i.exec(asset.digest || '');
  if (digest) return digest[1].toLowerCase();
  const sums = release.assets.find((item) => item.name === 'checksums-sha256.txt');
  if (!sums?.browser_download_url || !isOfficialAssetUrl(release, sums)) throw new Error('A release não informa o checksum SHA-256 oficial do instalador.');
  const response = await fetchDownload(sums.browser_download_url, fetcher, 2 * 1024 * 1024);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new Error('O arquivo de checksums excede o limite permitido.');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const expected = checksumFromText(text, asset.name);
  if (!expected) throw new Error('O checksum do instalador não aparece no arquivo oficial da release.');
  return expected;
}

async function fetchDownload(url, fetcher, maxBytes) {
  let target;
  try { target = new URL(url); } catch { throw new Error('O endereço do instalador é inválido.'); }
  if (target.protocol !== 'https:' || target.hostname !== 'github.com' || (target.port && target.port !== '443') ||
      !target.pathname.startsWith('/bruncosta077-boop/Cobre-Server/releases/download/')) {
    throw new Error('O instalador não veio da página oficial do Cobre no GitHub.');
  }
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetcher(target, {
      headers: { Accept: 'application/octet-stream', 'User-Agent': 'Cobre-Server-Updater' },
      redirect: 'manual', signal: AbortSignal.timeout(120_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === 4) throw new Error('O GitHub redirecionou o instalador muitas vezes.');
      const location = response.headers.get('location');
      if (!location) throw new Error('O GitHub retornou um redirecionamento inválido.');
      target = new URL(location, target);
      if (target.protocol !== 'https:' || (target.port && target.port !== '443') || !REDIRECT_HOSTS.has(target.hostname)) throw new Error('O instalador foi redirecionado para um endereço não confiável.');
      continue;
    }
    if (!response.ok || !response.body) throw new Error('Não foi possível baixar o instalador oficial.');
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > maxBytes) throw new Error('O instalador excede o tamanho máximo permitido.');
    return response;
  }
  throw new Error('Não foi possível acessar o instalador oficial.');
}

async function prepareUpdate(version, currentVersion, tempDirectory, fetcher = fetch) {
  const update = await checkForUpdate(currentVersion, fetcher);
  if (!update.available || update.latestVersion !== version) throw new Error('A versão disponível mudou. Verifique novamente antes de baixar.');
  const releases = await fetchReleases(fetcher);
  const release = releases.find((item) => releaseVersion(item) === version && !item.draft);
  const asset = release && installerAsset(release, version);
  if (!release || !asset || asset.name !== update.asset.name || asset.size !== update.asset.size) throw new Error('O instalador desta versão não está mais disponível.');
  if (!isOfficialAssetUrl(release, asset)) throw new Error('O endereço do instalador não corresponde a esta release oficial.');
  const expectedDigest = await getExpectedDigest(release, asset, fetcher);
  const response = await fetchDownload(asset.browser_download_url, fetcher, MAX_INSTALLER_BYTES);
  const filename = `Cobre-Server-update-${version}-${crypto.randomUUID()}.exe`;
  const finalPath = path.join(tempDirectory, filename);
  const partialPath = `${finalPath}.partial`;
  const handle = await fs.promises.open(partialPath, 'wx', 0o600);
  const hash = crypto.createHash('sha256');
  let received = 0;
  try {
    for await (const chunk of response.body) {
      received += chunk.length;
      if (received > MAX_INSTALLER_BYTES || received > asset.size) throw new Error('O download excedeu o tamanho informado pela release.');
      hash.update(chunk);
      let offset = 0;
      while (offset < chunk.length) {
        const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset);
        if (!bytesWritten) throw new Error('Não foi possível gravar o instalador completo.');
        offset += bytesWritten;
      }
    }
    await handle.sync();
    if (received !== asset.size) throw new Error('O download terminou antes do tamanho esperado.');
    const actualDigest = hash.digest('hex');
    if (actualDigest !== expectedDigest) throw new Error('O SHA-256 do instalador não confere; o arquivo foi descartado.');
    await handle.close();
    await fs.promises.rename(partialPath, finalPath);
    return { path: finalPath, version, digest: expectedDigest, size: received };
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.promises.rm(partialPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function verifyDownloadedUpdate(update) {
  if (!update || !parseVersion(update.version) || !/^([a-f0-9]{64})$/i.test(update.digest || '')) return false;
  const base = path.basename(update.path || '');
  if (!base.startsWith(`Cobre-Server-update-${update.version}-`) || !base.endsWith('.exe')) return false;
  const stat = await fs.promises.stat(update.path).catch(() => null);
  if (!stat?.isFile() || stat.size !== update.size || stat.size > MAX_INSTALLER_BYTES) return false;
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(update.path);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex') === update.digest.toLowerCase();
}

async function cleanupTemporaryInstallers(tempDirectory) {
  const names = await fs.promises.readdir(tempDirectory).catch(() => []);
  await Promise.all(names.filter((name) => /^Cobre-Server-update-.*\.exe(?:\.partial)?$/i.test(name))
    .map((name) => fs.promises.rm(path.join(tempDirectory, name), { force: true }).catch(() => {})));
}

module.exports = { compareVersions, parseVersion, selectLatestRelease, checksumFromText, checkForUpdate, prepareUpdate, verifyDownloadedUpdate, cleanupTemporaryInstallers };
