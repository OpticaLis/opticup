// write-summary.mjs — generates SUMMARY.md from per-URL JSON reports.
// Importable as a module (writeSummary(reportDir)) and runnable standalone:
//   node scripts/write-summary.mjs <abs-report-dir>
//
// SUMMARY.md columns: lang | path | perf | a11y | seo | best | axe-violations | http
// Per-row "http" column is "200" for success, "SKIP_404" / "SKIP_5XX" / "ERR" for non-200.

import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeSummary(reportDir) {
  const entries = await fs.readdir(reportDir).catch(() => []);
  const jsonFiles = entries.filter(f => f.endsWith('.json')).sort();
  const rows = [];

  for (const f of jsonFiles) {
    const payload = JSON.parse(await fs.readFile(path.join(reportDir, f), 'utf8'));
    rows.push({
      lang: payload.lang,
      path: payload.path,
      url: payload.url,
      http: payload.http,
      perf: payload.scores?.performance ?? null,
      a11y: payload.scores?.accessibility ?? null,
      seo: payload.scores?.seo ?? null,
      best: payload.scores?.['best-practices'] ?? null,
      axe: payload.axeViolationCount ?? null,
      jsonFile: f,
    });
  }

  const ts = new Date().toISOString();
  const okRows = rows.filter(r => r.http === 200);
  const skipRows = rows.filter(r => r.http !== 200);
  const avgPerf = okRows.length ? Math.round(okRows.reduce((s, r) => s + (r.perf ?? 0), 0) / okRows.length) : null;
  const avgA11y = okRows.length ? Math.round(okRows.reduce((s, r) => s + (r.a11y ?? 0), 0) / okRows.length) : null;

  let md = `# Lighthouse Report — ${path.basename(reportDir)}\n\n`;
  md += `**Generated:** ${ts}\n`;
  md += `**URLs probed:** ${rows.length} (${okRows.length} OK, ${skipRows.length} skipped)\n`;
  md += `**Average perf (OK only):** ${avgPerf ?? 'n/a'}\n`;
  md += `**Average a11y (OK only):** ${avgA11y ?? 'n/a'}\n\n`;

  md += `| lang | path | http | perf | a11y | seo | best | axe-violations | report |\n`;
  md += `|------|------|------|------|------|-----|------|----------------|--------|\n`;
  for (const r of rows) {
    const fmt = (n) => n === null || n === undefined ? '—' : n;
    md += `| ${r.lang} | \`${r.path}\` | ${r.http} | ${fmt(r.perf)} | ${fmt(r.a11y)} | ${fmt(r.seo)} | ${fmt(r.best)} | ${fmt(r.axe)} | [json](${r.jsonFile}) |\n`;
  }

  if (skipRows.length) {
    md += `\n## Skipped URLs (${skipRows.length})\n\n`;
    for (const r of skipRows) {
      md += `- \`${r.lang}${r.path}\` — HTTP ${r.http}\n`;
    }
  }

  await fs.writeFile(path.join(reportDir, 'SUMMARY.md'), md, 'utf8');
  return { rowCount: rows.length, okCount: okRows.length, skipCount: skipRows.length, avgPerf, avgA11y };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const reportDir = process.argv[2];
  if (!reportDir) {
    console.error('Usage: node write-summary.mjs <report-dir>');
    process.exit(2);
  }
  writeSummary(reportDir).then(r => console.log('SUMMARY.md written:', r));
}
