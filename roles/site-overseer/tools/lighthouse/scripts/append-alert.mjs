// append-alert.mjs — appends ALL CLEAR / REGRESSION blocks to GUARDIAN_ALERTS.md.
// File is created if missing. Uses an idempotent per-run section header so
// repeat runs of the same date overwrite that section, not the whole file.
// Sentinel coexistence: this script ONLY appends below a marker; Sentinel's
// regenerated content lives ABOVE the marker.

import fs from 'node:fs/promises';
import path from 'node:path';

const ALERTS_FILE_HEADER = `# Guardian Alerts — Optic Up Sentinel

> **Note:** Sentinel re-generates the section above the LIGHTHOUSE-CRON marker each scan. The Lighthouse cron appends below the marker. Do not delete the marker line.

`;

const MARKER = '<!-- LIGHTHOUSE-CRON-APPEND-MARKER — entries below this line are managed by roles/site-overseer/tools/lighthouse/scripts/append-alert.mjs. Do not edit by hand. -->';

export async function appendAlert(alertsFilePath, runMeta) {
  // runMeta = { runType: 'daily'|'weekly', date, reportDir, regressions, comparisonsRun, baselineDate, summaryStats }
  let existing = '';
  try {
    existing = await fs.readFile(alertsFilePath, 'utf8');
  } catch {
    // file missing — create with header + marker
    existing = ALERTS_FILE_HEADER + MARKER + '\n';
  }

  if (!existing.includes(MARKER)) {
    // append marker
    existing = existing.trimEnd() + '\n\n' + MARKER + '\n';
  }

  const [head, tail] = existing.split(MARKER);
  // tail = everything below marker (existing cron entries)
  // We append a fresh section for this run.

  const sectionId = `<!-- run:${runMeta.runType}:${runMeta.date} -->`;
  const tailWithoutSameRun = (tail || '')
    .split('\n## ')
    .filter((s, i) => i === 0 || !s.startsWith(`${runMeta.runType.charAt(0).toUpperCase() + runMeta.runType.slice(1)} run — ${runMeta.date}`))
    .join('\n## ');

  let newSection = '';
  newSection += `\n## ${runMeta.runType.charAt(0).toUpperCase() + runMeta.runType.slice(1)} run — ${runMeta.date} ${sectionId}\n\n`;

  if (runMeta.regressions.length === 0) {
    newSection += `**ALL CLEAR** — ${runMeta.summaryStats.okCount}/${runMeta.summaryStats.rowCount} URLs OK; `;
    newSection += `${runMeta.comparisonsRun} comparisons against ${runMeta.baselineDate ?? 'no prior baseline'}; `;
    newSection += `0 regressions. avg perf ${runMeta.summaryStats.avgPerf ?? 'n/a'}, avg a11y ${runMeta.summaryStats.avgA11y ?? 'n/a'}.\n`;
    newSection += `→ Full report: \`${runMeta.reportDirRel}/SUMMARY.md\`\n`;
  } else {
    newSection += `**REGRESSION** — ${runMeta.regressions.length} regression(s) detected vs. ${runMeta.baselineDate}:\n\n`;
    newSection += `| URL | metric | prior | current | delta/floor | report |\n`;
    newSection += `|-----|--------|-------|---------|-------------|--------|\n`;
    for (const r of runMeta.regressions) {
      newSection += `| ${r.url} | ${r.metric} | ${r.prior ?? '—'} | ${r.current ?? '—'} | ${r.deltaOrFloor} | [json](${runMeta.reportDirRel}/${r.jsonFile}) |\n`;
    }
    newSection += `\n→ Full report: \`${runMeta.reportDirRel}/SUMMARY.md\`\n`;
  }

  const updated = head + MARKER + tailWithoutSameRun + newSection;

  await fs.mkdir(path.dirname(alertsFilePath), { recursive: true });
  await fs.writeFile(alertsFilePath, updated, 'utf8');

  return { wroteSection: true, regressionCount: runMeta.regressions.length };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const [alertsPath, metaJsonPath] = process.argv.slice(2);
  if (!alertsPath || !metaJsonPath) {
    console.error('Usage: node append-alert.mjs <GUARDIAN_ALERTS.md> <run-meta.json>');
    process.exit(2);
  }
  const runMeta = JSON.parse(await fs.readFile(metaJsonPath, 'utf8'));
  const result = await appendAlert(alertsPath, runMeta);
  console.log(JSON.stringify(result));
}
