// _lib.mjs — shared helpers for run-tier1.mjs + run-full.mjs.
// Internal module (underscore prefix) — not part of the public 5-script list.
// Exports: REPO_ROOT, probeStatus, runLighthouse, extractScores, countAxeViolations.

import { execSync } from 'node:child_process';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

export const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

export const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];

export async function launchChrome() {
  return launch({ chromeFlags: CHROME_FLAGS });
}

// Safe kill — chrome-launcher's destroyTmp() can throw EPERM on Windows
// when the runtime profile dir still has open handles (Chrome's own cleanup
// is racy). Swallow it; the OS reaps the temp on logoff anyway.
export async function safeKillChrome(chrome) {
  try {
    await chrome.kill();
  } catch (e) {
    console.warn('[chrome.kill] non-fatal:', e.code || e.name || e.message);
  }
}

export async function probeStatus(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return r.status;
  } catch {
    return -1;
  }
}

export async function runLighthouse(url, chromePort) {
  const result = await lighthouse(url, {
    port: chromePort,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
  });
  return result?.lhr ?? null;
}

export function extractScores(lhr) {
  const c = lhr.categories || {};
  const r = (s) => s == null ? null : Math.round(s * 100);
  return {
    performance: r(c.performance?.score),
    accessibility: r(c.accessibility?.score),
    seo: r(c.seo?.score),
    'best-practices': r(c['best-practices']?.score),
  };
}

export function countAxeViolations(lhr) {
  // Lighthouse's accessibility category uses axe-core under the hood. Count
  // failed accessibility audits (binary-mode score === 0) as violations.
  let count = 0;
  for (const audit of Object.values(lhr.audits || {})) {
    if (!audit.id) continue;
    const ref = lhr.categories?.accessibility?.auditRefs?.find(x => x.id === audit.id);
    if (!ref) continue;
    if (audit.scoreDisplayMode === 'binary' && audit.score === 0) count++;
  }
  return count;
}

export function classifySkip(status) {
  if (status === 404) return 'SKIP_404';
  if (status >= 500) return 'SKIP_5XX';
  if (status === -1) return 'ERR';
  return `SKIP_${status}`;
}
