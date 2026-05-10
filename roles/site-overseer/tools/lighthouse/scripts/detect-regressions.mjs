// detect-regressions.mjs — compares today's per-URL JSONs vs. the prior baseline.
// Returns a list of REGRESSION objects to feed into append-alert.mjs.
//
// Inputs:
//   - todayDir:  absolute path to today's report dir (e.g. .../daily/2026-05-10/)
//   - priorDir:  absolute path to prior baseline dir (e.g. .../daily/2026-05-09/)
//                or null if no prior baseline (= first run; no regressions to flag).
//   - thresholds: parsed config/thresholds.json
//
// Output: { regressions: [...], comparisonsRun: N, baselineDate: "..." | null }
//
// Each regression entry shape:
// { url, lang, path, metric, prior, current, deltaOrFloor, jsonFile }

import fs from 'node:fs/promises';
import path from 'node:path';

export async function detectRegressions(todayDir, priorDir, thresholds) {
  const regressions = [];

  if (!priorDir) {
    return { regressions, comparisonsRun: 0, baselineDate: null };
  }

  const todayFiles = (await fs.readdir(todayDir).catch(() => []))
    .filter(f => f.endsWith('.json'))
    .sort();

  let comparisonsRun = 0;
  for (const f of todayFiles) {
    const todayPayload = JSON.parse(await fs.readFile(path.join(todayDir, f), 'utf8'));
    if (todayPayload.http !== 200) continue;

    const priorPath = path.join(priorDir, f);
    const priorRaw = await fs.readFile(priorPath, 'utf8').catch(() => null);
    if (!priorRaw) continue;
    const priorPayload = JSON.parse(priorRaw);
    if (priorPayload.http !== 200) continue;

    comparisonsRun++;

    const ts = todayPayload.scores ?? {};
    const ps = priorPayload.scores ?? {};

    // Perf score floor (absolute) — fires regardless of delta
    if (typeof ts.performance === 'number' && ts.performance < thresholds.perf_score_floor) {
      regressions.push({
        url: todayPayload.url, lang: todayPayload.lang, path: todayPayload.path,
        metric: 'performance', prior: ps.performance, current: ts.performance,
        deltaOrFloor: `< floor ${thresholds.perf_score_floor}`,
        jsonFile: f,
      });
    } else {
      // Perf score drop (delta)
      const perfDrop = (ps.performance ?? 0) - (ts.performance ?? 0);
      if (perfDrop >= thresholds.perf_score_drop_min) {
        regressions.push({
          url: todayPayload.url, lang: todayPayload.lang, path: todayPayload.path,
          metric: 'performance', prior: ps.performance, current: ts.performance,
          deltaOrFloor: `-${perfDrop} pts`,
          jsonFile: f,
        });
      }
    }

    // a11y delta
    const a11yDrop = (ps.accessibility ?? 0) - (ts.accessibility ?? 0);
    if (a11yDrop >= thresholds.a11y_score_drop_min) {
      regressions.push({
        url: todayPayload.url, lang: todayPayload.lang, path: todayPayload.path,
        metric: 'accessibility', prior: ps.accessibility, current: ts.accessibility,
        deltaOrFloor: `-${a11yDrop} pts`,
        jsonFile: f,
      });
    }

    // SEO delta
    const seoDrop = (ps.seo ?? 0) - (ts.seo ?? 0);
    if (seoDrop >= thresholds.seo_score_drop_min) {
      regressions.push({
        url: todayPayload.url, lang: todayPayload.lang, path: todayPayload.path,
        metric: 'seo', prior: ps.seo, current: ts.seo,
        deltaOrFloor: `-${seoDrop} pts`,
        jsonFile: f,
      });
    }

    // best-practices delta
    const bestDrop = (ps['best-practices'] ?? 0) - (ts['best-practices'] ?? 0);
    if (bestDrop >= thresholds.best_practices_drop_min) {
      regressions.push({
        url: todayPayload.url, lang: todayPayload.lang, path: todayPayload.path,
        metric: 'best-practices', prior: ps['best-practices'], current: ts['best-practices'],
        deltaOrFloor: `-${bestDrop} pts`,
        jsonFile: f,
      });
    }

    // axe violation count increase
    if (thresholds.axe_violation_increase_alert) {
      const priorAxe = priorPayload.axeViolationCount ?? 0;
      const todayAxe = todayPayload.axeViolationCount ?? 0;
      if (todayAxe > priorAxe) {
        regressions.push({
          url: todayPayload.url, lang: todayPayload.lang, path: todayPayload.path,
          metric: 'axe-violations', prior: priorAxe, current: todayAxe,
          deltaOrFloor: `+${todayAxe - priorAxe} new`,
          jsonFile: f,
        });
      }
    }
  }

  return { regressions, comparisonsRun, baselineDate: path.basename(priorDir) };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const [todayDir, priorDir, thresholdsPath] = process.argv.slice(2);
  if (!todayDir || !thresholdsPath) {
    console.error('Usage: node detect-regressions.mjs <today-dir> <prior-dir|""> <thresholds.json>');
    process.exit(2);
  }
  const thresholds = JSON.parse(await fs.readFile(thresholdsPath, 'utf8'));
  const result = await detectRegressions(todayDir, priorDir || null, thresholds);
  console.log(JSON.stringify(result, null, 2));
}
