// run-full.mjs — WEEKLY entrypoint. Scrapes the live sitemap-dynamic.xml,
// dedupes, runs Lighthouse + axe (via LH a11y category) against every URL,
// writes per-URL JSON + SUMMARY.md, detects regressions vs. last week's
// SUMMARY.md, appends alert to GUARDIAN_ALERTS.md, exits 0.
//
// Usage: node scripts/run-full.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, launchChrome, probeStatus, runLighthouse, extractScores, countAxeViolations, classifySkip } from './_lib.mjs';
import { writeSummary } from './write-summary.mjs';
import { detectRegressions } from './detect-regressions.mjs';
import { appendAlert } from './append-alert.mjs';

const TOOL_DIR = path.join(REPO_ROOT, 'roles/site-overseer/tools/lighthouse');
const REPORTS_ROOT = path.join(REPO_ROOT, 'docs/guardian/lighthouse-reports/weekly');
const ALERTS_FILE = path.join(REPO_ROOT, 'docs/guardian/GUARDIAN_ALERTS.md');
const SITEMAP_URL = 'https://www.prizma-optic.co.il/sitemap-dynamic.xml';

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function priorIsoWeek() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return isoWeek(d);
}

function detectLang(url) {
  const u = new URL(url);
  const seg = u.pathname.split('/').filter(Boolean)[0];
  if (seg === 'en' || seg === 'ru') return seg;
  return 'he';
}

function urlSlug(url) {
  const u = new URL(url);
  let p = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
  p = p.replace(/^(en|ru)-/, '');
  return p === '' ? 'home' : p;
}

async function fetchAndDedupeSitemap() {
  const r = await fetch(SITEMAP_URL);
  if (!r.ok) throw new Error(`sitemap fetch returned ${r.status}`);
  const xml = await r.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  return [...new Set(matches)];
}

async function runFullMain() {
  const startedAt = Date.now();
  const week = isoWeek();
  const reportDir = path.join(REPORTS_ROOT, week);
  await fs.mkdir(reportDir, { recursive: true });

  const thresholds = JSON.parse(await fs.readFile(path.join(REPO_ROOT, 'roles/site-overseer/tools/lighthouse/config/thresholds.json'), 'utf8'));

  console.log(`[run-full] ${week} — fetching sitemap from ${SITEMAP_URL}`);
  const urls = await fetchAndDedupeSitemap();
  console.log(`[run-full] ${urls.length} unique URLs in sitemap`);

  const chrome = await launchChrome();
  console.log(`[run-full] Chrome launched on port ${chrome.port}`);

  try {
    let idx = 0;
    for (const url of urls) {
      idx++;
      const lang = detectLang(url);
      const slug = urlSlug(url);
      const outFile = path.join(reportDir, `${lang}-${slug}.json`);

      const status = await probeStatus(url);
      if (status !== 200) {
        const skipKind = classifySkip(status);
        console.log(`[${idx}/${urls.length}] ${skipKind}  ${url}`);
        await fs.writeFile(outFile, JSON.stringify({
          url, lang, path: new URL(url).pathname, http: status,
          skip: true, skipKind, scores: null, axeViolationCount: null, capturedAt: new Date().toISOString(),
        }, null, 2));
        continue;
      }

      const t0 = Date.now();
      let lhr = null;
      try {
        lhr = await runLighthouse(url, chrome.port);
      } catch (e) {
        console.log(`[${idx}/${urls.length}] LH-ERR  ${url}: ${e.message}`);
        await fs.writeFile(outFile, JSON.stringify({
          url, lang, path: new URL(url).pathname, http: 200,
          skip: true, skipKind: 'LH_ERR', error: e.message, capturedAt: new Date().toISOString(),
        }, null, 2));
        continue;
      }
      const elapsed = Date.now() - t0;
      const scores = extractScores(lhr);
      const axeCount = countAxeViolations(lhr);

      await fs.writeFile(outFile, JSON.stringify({
        url, lang, path: new URL(url).pathname, http: 200,
        scores, axeViolationCount: axeCount, capturedAt: new Date().toISOString(),
        fetchTime: lhr.fetchTime, lighthouseVersion: lhr.lighthouseVersion,
      }, null, 2));

      console.log(`[${idx}/${urls.length}] ${elapsed}ms  ${url}  perf=${scores.performance} a11y=${scores.accessibility}`);
    }
  } finally {
    await chrome.kill();
  }

  const summaryStats = await writeSummary(reportDir);
  console.log(`[run-full] SUMMARY.md written: ${summaryStats.rowCount} rows (${summaryStats.okCount} OK, ${summaryStats.skipCount} skipped)`);

  const priorReportDir = path.join(REPORTS_ROOT, priorIsoWeek());
  const priorExists = await fs.access(priorReportDir).then(() => true).catch(() => false);
  const regResult = await detectRegressions(reportDir, priorExists ? priorReportDir : null, thresholds);
  console.log(`[run-full] Regressions: ${regResult.regressions.length} (compared ${regResult.comparisonsRun} URLs)`);

  const reportDirRel = path.relative(REPO_ROOT, reportDir).replace(/\\/g, '/');
  await appendAlert(ALERTS_FILE, {
    runType: 'weekly',
    date: week,
    reportDir,
    reportDirRel,
    regressions: regResult.regressions,
    comparisonsRun: regResult.comparisonsRun,
    baselineDate: regResult.baselineDate,
    summaryStats,
  });

  const fullElapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[run-full] Done in ${fullElapsedSec}s.`);
}

runFullMain().then(
  () => process.exit(0),
  (err) => { console.error('[run-full] FATAL', err); process.exit(1); }
);
