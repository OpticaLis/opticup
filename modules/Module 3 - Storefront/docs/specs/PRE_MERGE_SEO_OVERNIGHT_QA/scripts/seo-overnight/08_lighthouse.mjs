#!/usr/bin/env node
// 08_lighthouse.mjs — run Lighthouse CLI on top-20 traffic URLs (mobile).
// Results stored per URL in artifacts/lighthouse/{slug}.json.
// Retries once with 5s backoff on failure, then records error and moves on.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const LHDIR = resolve(ARTIFACTS, 'lighthouse');
const LOCAL = 'http://localhost:4321';
const CANONICAL = 'https://prizma-optic.co.il';

mkdirSync(LHDIR, { recursive: true });

const redirectCov = JSON.parse(readFileSync(resolve(ARTIFACTS, 'redirect-coverage.json'), 'utf-8')).entries;
const okEntries = redirectCov
  .filter((r) => r.verdict === 'OK_200' || r.verdict === 'OK_301_REDIRECT')
  .sort((a, b) => b.clicks - a.clicks);
const top20 = okEntries.slice(0, 20);

function slugify(s) {
  return s
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '_')
    .replace(/[^\w._-]/g, '')
    .slice(0, 80) || 'root';
}

function pathFor(entry) {
  let p = entry.vercelMatch ? entry.pathToFetch : entry.requestPath;
  if (p && p.startsWith(CANONICAL)) p = p.slice(CANONICAL.length);
  return p || '/';
}

const LH = resolve(
  __dirname,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'lighthouse.cmd' : 'lighthouse',
);

function runLighthouse(url, outPath) {
  return new Promise((resolvePromise) => {
    const args = [
      url,
      '--output=json',
      '--output-path=' + outPath,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--form-factor=mobile',
      '--throttling-method=simulate',
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
      '--max-wait-for-load=45000',
    ];
    // Windows-safe: invoke through cmd.exe with the .cmd path quoted so
    // spaces in the full path don't break argv splitting.
    const isWin = process.platform === 'win32';
    let cmd, spawnArgs, opts;
    if (isWin) {
      // Build the full command line string ourselves and use `shell: true`
      // with windowsVerbatimArguments via a single string.
      const quoted = (s) => '"' + String(s).replace(/"/g, '\\"') + '"';
      const line = [quoted(LH), quoted(url),
        '--output=json',
        '--output-path=' + quoted(outPath),
        '--only-categories=performance,accessibility,best-practices,seo',
        '--form-factor=mobile',
        '--throttling-method=simulate',
        '--quiet',
        '--chrome-flags=' + quoted('--headless=new --no-sandbox --disable-gpu'),
        '--max-wait-for-load=45000',
      ].join(' ');
      cmd = line;
      spawnArgs = [];
      opts = { shell: true };
    } else {
      cmd = LH;
      spawnArgs = args;
      opts = { shell: false };
    }
    const child = spawn(cmd, spawnArgs, opts);
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const to = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, 180000);
    child.on('close', (code) => {
      clearTimeout(to);
      resolvePromise({ code, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(to);
      resolvePromise({ code: -1, stderr: err.message });
    });
  });
}

async function auditOne(entry, idx) {
  const p = pathFor(entry);
  const fullUrl = LOCAL + p;
  const slug = slugify(entry.url) + '_' + idx;
  const outPath = join(LHDIR, slug + '.json');
  console.error(`[${idx + 1}/20] ${fullUrl} → ${slug}`);
  let attempt = 0;
  let result;
  while (attempt < 2) {
    result = await runLighthouse(fullUrl, outPath);
    if (result.code === 0 && existsSync(outPath)) break;
    attempt++;
    if (attempt < 2) {
      console.error(`  retry in 5s (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  let parsed = null;
  if (existsSync(outPath)) {
    try {
      const raw = JSON.parse(readFileSync(outPath, 'utf-8'));
      parsed = {
        finalUrl: raw.finalUrl,
        requestedUrl: raw.requestedUrl,
        scores: {
          performance: raw.categories?.performance?.score,
          accessibility: raw.categories?.accessibility?.score,
          'best-practices': raw.categories?.['best-practices']?.score,
          seo: raw.categories?.seo?.score,
        },
      };
    } catch (e) {
      parsed = { parse_error: e.message };
    }
  }
  return {
    url: entry.url,
    localPath: p,
    clicks: entry.clicks,
    slug,
    outPath,
    exit_code: result.code,
    parsed,
    stderr_tail: (result.stderr || '').slice(-400),
  };
}

const summary = [];
for (let i = 0; i < top20.length; i++) {
  const r = await auditOne(top20[i], i);
  summary.push(r);
}

const averages = (() => {
  const cats = ['performance', 'accessibility', 'best-practices', 'seo'];
  const avgs = {};
  for (const c of cats) {
    const vals = summary.map((s) => s.parsed?.scores?.[c]).filter((v) => typeof v === 'number');
    avgs[c] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return avgs;
})();

writeFileSync(
  resolve(ARTIFACTS, 'lighthouse-summary.json'),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      top20_count: top20.length,
      averages,
      per_url: summary,
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ averages, count: summary.length, failed: summary.filter((s) => !s.parsed?.scores).length }, null, 2));
