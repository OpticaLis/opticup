#!/usr/bin/env node
// 01_parse_gsc.mjs — parse GSC CSVs into normalized JSON.
// Inputs:  ../../../current prompt/{Pages,Queries}.csv
// Outputs: ../../artifacts/{pages,queries}.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const SRC = resolve(ROOT, '..', '..', 'current prompt');

mkdirSync(ARTIFACTS, { recursive: true });

function pctToFloat(s) {
  if (s == null) return null;
  const t = String(s).trim().replace('%', '');
  const n = Number(t);
  return Number.isFinite(n) ? n / 100 : null;
}
function numOrNull(s) {
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : null;
}

// Normalize URL: decode, strip fragment, unify host to apex prizma-optic.co.il
function normalizeUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    // record original host as-is, but also canonical form
    return {
      raw: raw.trim(),
      href: u.toString(),
      protocol: u.protocol,
      host: u.host,
      pathname: decodeURIComponent(u.pathname),
      search: u.search,
      hasTrailingSlash: u.pathname.endsWith('/'),
    };
  } catch {
    return { raw: raw.trim(), href: null, error: 'URL_PARSE_FAIL' };
  }
}

function parsePagesCsv(buf) {
  // GSC CSV: "Top pages,Clicks,Impressions,CTR,Position"
  const rows = parse(buf, { bom: true, skip_empty_lines: true });
  const header = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const [url, clicks, impressions, ctr, position] = rows[i];
    const n = normalizeUrl(url);
    out.push({
      url: n?.href ?? url,
      raw_url: url,
      normalized: n,
      clicks: numOrNull(clicks) ?? 0,
      impressions: numOrNull(impressions) ?? 0,
      ctr: pctToFloat(ctr) ?? 0,
      position: numOrNull(position) ?? null,
    });
  }
  return { header, entries: out };
}

function parseQueriesCsv(buf) {
  // GSC CSV: "Top queries,Clicks,Impressions,CTR,Position"
  const rows = parse(buf, { bom: true, skip_empty_lines: true });
  const header = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const [query, clicks, impressions, ctr, position] = rows[i];
    out.push({
      query: String(query ?? '').trim(),
      clicks: numOrNull(clicks) ?? 0,
      impressions: numOrNull(impressions) ?? 0,
      ctr: pctToFloat(ctr) ?? 0,
      position: numOrNull(position) ?? null,
    });
  }
  return { header, entries: out };
}

const pagesBuf = readFileSync(resolve(SRC, 'Pages.csv'));
const queriesBuf = readFileSync(resolve(SRC, 'Queries.csv'));

const pages = parsePagesCsv(pagesBuf);
const queries = parseQueriesCsv(queriesBuf);

// Sort by clicks desc for downstream top-N selection
pages.entries.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
queries.entries.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

const summary = {
  generated_at: new Date().toISOString(),
  pages_count: pages.entries.length,
  queries_count: queries.entries.length,
  pages_total_clicks: pages.entries.reduce((s, r) => s + r.clicks, 0),
  queries_total_clicks: queries.entries.reduce((s, r) => s + r.clicks, 0),
  hosts: [...new Set(pages.entries.map((p) => p.normalized?.host).filter(Boolean))],
};

writeFileSync(
  resolve(ARTIFACTS, 'pages.json'),
  JSON.stringify({ summary, entries: pages.entries }, null, 2),
);
writeFileSync(
  resolve(ARTIFACTS, 'queries.json'),
  JSON.stringify({ summary, entries: queries.entries }, null, 2),
);

console.log('pages:', pages.entries.length, 'queries:', queries.entries.length);
console.log('hosts:', summary.hosts.join(', '));
console.log('top page:', pages.entries[0]?.url, pages.entries[0]?.clicks);
console.log('top query:', queries.entries[0]?.query, queries.entries[0]?.clicks);
