// run-tier1.mjs — DAILY entrypoint. Runs Lighthouse + axe (via LH a11y category)
// against the 30-URL Tier 1 list, writes per-URL JSON + SUMMARY.md, detects
// regressions vs. yesterday, appends alert to GUARDIAN_ALERTS.md, exits 0.
//
// Usage: node scripts/run-tier1.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, launchChrome, safeKillChrome, probeStatus, runLighthouse, extractScores, countAxeViolations, classifySkip } from './_lib.mjs';
import { writeSummary } from './write-summary.mjs';
import { detectRegressions } from './detect-regressions.mjs';
import { appendAlert } from './append-alert.mjs';

const TOOL_DIR = path.join(REPO_ROOT, 'roles/site-overseer/tools/lighthouse');
const REPORTS_ROOT = path.join(REPO_ROOT, 'docs/guardian/lighthouse-reports/daily');
const ALERTS_FILE = path.join(REPO_ROOT, 'docs/guardian/GUARDIAN_ALERTS.md');

function todayDate() { return new Date().toISOString().slice(0, 10); }
function priorDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function slugify(routePath) {
  const trimmed = routePath.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
}

async function runTier1Main() {
  const startedAt = Date.now();
  const date = todayDate();
  const reportDir = path.join(REPORTS_ROOT, date);
  await fs.mkdir(reportDir, { recursive: true });

  const config = JSON.parse(await fs.readFile(path.join(TOOL_DIR, 'config/tier1-pages.json'), 'utf8'));
  const thresholds = JSON.parse(await fs.readFile(path.join(TOOL_DIR, 'config/thresholds.json'), 'utf8'));
  const origin = config._meta.origin;
  const langPrefixes = config._lang_prefixes;

  console.log(`[run-tier1] ${date} — origin=${origin}, ${config.routes.length} routes × ${Object.keys(langPrefixes).length} langs`);

  const chrome = await launchChrome();
  console.log(`[run-tier1] Chrome launched on port ${chrome.port}`);

  let runIdx = 0;
  const totalRuns = config.routes.length * Object.keys(langPrefixes).length;
  try {
    for (const route of config.routes) {
      for (const [lang, prefix] of Object.entries(langPrefixes)) {
        runIdx++;
        const url = `${origin}/${prefix}${route.path.replace(/^\//, '')}`;
        const slug = slugify(route.path);
        const outFile = path.join(reportDir, `${lang}-${slug}.json`);

        const status = await probeStatus(url);
        if (status !== 200) {
          const skipKind = classifySkip(status);
          console.log(`[${runIdx}/${totalRuns}] ${skipKind}  ${url}`);
          await fs.writeFile(outFile, JSON.stringify({
            url, lang, path: route.path, label: route.label, http: status,
            skip: true, skipKind, scores: null, axeViolationCount: null, capturedAt: new Date().toISOString(),
          }, null, 2));
          continue;
        }

        const t0 = Date.now();
        let lhr = null;
        try {
          lhr = await runLighthouse(url, chrome.port);
        } catch (e) {
          console.log(`[${runIdx}/${totalRuns}] LH-ERR  ${url}: ${e.message}`);
          await fs.writeFile(outFile, JSON.stringify({
            url, lang, path: route.path, label: route.label, http: 200,
            skip: true, skipKind: 'LH_ERR', error: e.message, capturedAt: new Date().toISOString(),
          }, null, 2));
          continue;
        }
        const elapsed = Date.now() - t0;
        const scores = extractScores(lhr);
        const axeCount = countAxeViolations(lhr);

        await fs.writeFile(outFile, JSON.stringify({
          url, lang, path: route.path, label: route.label, http: 200,
          scores, axeViolationCount: axeCount, capturedAt: new Date().toISOString(),
          fetchTime: lhr.fetchTime, lighthouseVersion: lhr.lighthouseVersion,
        }, null, 2));

        console.log(`[${runIdx}/${totalRuns}] ${elapsed}ms  ${url}  perf=${scores.performance} a11y=${scores.accessibility} seo=${scores.seo} best=${scores['best-practices']} axe=${axeCount}`);
      }
    }
  } finally {
    await safeKillChrome(chrome);
  }

  const summaryStats = await writeSummary(reportDir);
  console.log(`[run-tier1] SUMMARY.md written: ${summaryStats.rowCount} rows (${summaryStats.okCount} OK, ${summaryStats.skipCount} skipped)`);

  const priorReportDir = path.join(REPORTS_ROOT, priorDate());
  const priorExists = await fs.access(priorReportDir).then(() => true).catch(() => false);
  const regResult = await detectRegressions(reportDir, priorExists ? priorReportDir : null, thresholds);
  console.log(`[run-tier1] Regressions: ${regResult.regressions.length} (compared ${regResult.comparisonsRun} URLs against ${regResult.baselineDate ?? '(no prior baseline)'})`);

  const reportDirRel = path.relative(REPO_ROOT, reportDir).replace(/\\/g, '/');
  await appendAlert(ALERTS_FILE, {
    runType: 'daily',
    date,
    reportDir,
    reportDirRel,
    regressions: regResult.regressions,
    comparisonsRun: regResult.comparisonsRun,
    baselineDate: regResult.baselineDate,
    summaryStats,
  });

  const tier1ElapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[run-tier1] Done in ${tier1ElapsedSec}s. Alert appended to ${path.relative(REPO_ROOT, ALERTS_FILE)}.`);
}

runTier1Main().then(
  () => process.exit(0),
  (err) => { console.error('[run-tier1] FATAL', err); process.exit(1); }
);
