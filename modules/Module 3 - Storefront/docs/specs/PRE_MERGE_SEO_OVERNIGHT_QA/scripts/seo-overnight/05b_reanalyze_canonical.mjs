#!/usr/bin/env node
// 05b — re-analyze canonical_ok with a URL-encoding-aware comparator.
// No re-fetch; reads the existing onpage-top100.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const CANONICAL = 'https://prizma-optic.co.il';

const data = JSON.parse(readFileSync(resolve(ARTIFACTS, 'onpage-top100.json'), 'utf-8'));

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
function normUrl(u) {
  try {
    const x = new URL(u, CANONICAL);
    const p = safeDecode(x.pathname).replace(/\/+$/, '');
    return x.origin + p + (x.search || '');
  } catch {
    return u;
  }
}

let fixed = 0;
for (const e of data.entries) {
  const expected = normUrl(CANONICAL + (e.localPath || '/'));
  const actual = normUrl(e.canonical || '');
  const was = e.canonical_ok;
  e.canonical_ok = actual !== '' && expected === actual;
  // Tolerate trailing-slash-only differences
  if (!e.canonical_ok && actual && expected) {
    const a = actual.replace(/\/+$/, '');
    const b = expected.replace(/\/+$/, '');
    if (a === b) e.canonical_ok = true;
  }
  if (e.canonical_ok !== was) fixed++;
}

writeFileSync(resolve(ARTIFACTS, 'onpage-top100.json'), JSON.stringify(data, null, 2));

const ok = data.entries.filter((e) => e.canonical_ok).length;
console.log(`canonical_ok: ${ok}/100 (re-analysis changed ${fixed} rows)`);
