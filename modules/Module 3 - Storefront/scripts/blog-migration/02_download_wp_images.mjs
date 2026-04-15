/**
 * 02_download_wp_images.mjs
 * ─────────────────────────
 * Downloads each WP image URL from _catalog.json into ./_downloads/
 * Records HTTP status for each: 200, 404, 5xx, timeout.
 *
 * Run after: 01_catalog_wp_urls.mjs
 * Run: node 02_download_wp_images.mjs
 */

import { createWriteStream, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '_catalog.json');
const DOWNLOADS_DIR = join(__dirname, '_downloads');

if (!existsSync(CATALOG_PATH)) {
  console.error('ERROR: _catalog.json not found. Run 01_catalog_wp_urls.mjs first.');
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
mkdirSync(DOWNLOADS_DIR, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        downloadFile(res.headers.location, dest).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve({ status: res.statusCode, ok: false });
        return;
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve({ status: 200, ok: true })));
      file.on('error', err => resolve({ status: 0, ok: false, err: err.message }));
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, ok: false, err: 'timeout' }); });
    req.on('error', err => resolve({ status: 0, ok: false, err: err.message }));
  });
}

const results = [];
for (const img of catalog.images) {
  const destPath = join(DOWNLOADS_DIR, img.sanitizedFilename);
  if (existsSync(destPath)) {
    console.log(`  SKIP (already exists): ${img.sanitizedFilename}`);
    results.push({ ...img, downloadStatus: 'already_exists' });
    continue;
  }
  process.stdout.write(`  Downloading: ${img.rawFilename} ... `);
  const result = await downloadFile(img.url, destPath);
  if (result.ok) {
    const { statSync } = await import('fs');
    const size = statSync(destPath).size;
    console.log(`${result.status} OK (${(size/1024).toFixed(1)}KB)`);
    results.push({ ...img, downloadStatus: 'ok', localPath: destPath, fileSize: size });
  } else if (result.status === 404) {
    console.log(`404 NOT FOUND`);
    results.push({ ...img, downloadStatus: 'skipped_already_404' });
  } else {
    console.log(`FAILED (${result.status || result.err})`);
    results.push({ ...img, downloadStatus: 'skipped_error', err: result.err || result.status });
  }
}

// Update catalog with download results
catalog.downloadResults = results;
writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

const ok = results.filter(r => r.downloadStatus === 'ok' || r.downloadStatus === 'already_exists');
const missing = results.filter(r => r.downloadStatus === 'skipped_already_404');
const errors = results.filter(r => r.downloadStatus === 'skipped_error');
console.log(`\n✓ Download complete: ${ok.length} OK, ${missing.length} 404, ${errors.length} errors`);
