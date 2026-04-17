#!/usr/bin/env node
// 04_check_404.mjs — confirm that a bogus URL returns HTTP 404.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const LOCAL = 'http://localhost:4321';

mkdirSync(ARTIFACTS, { recursive: true });

const probes = [
  `/this-page-does-not-exist-${Date.now()}-xyz/`,
  `/en/unknown-article-${Date.now()}/`,
  `/ru/nonexistent-${Date.now()}/`,
];

const results = [];
for (const p of probes) {
  const url = LOCAL + p;
  try {
    const r = await fetch(url, { redirect: 'manual' });
    const text = await r.text();
    results.push({
      path: p,
      status: r.status,
      content_type: r.headers.get('content-type'),
      has_noindex_meta: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(text),
      has_404_text: /404|not\s*found|לא נמצא/i.test(text),
      length: text.length,
    });
  } catch (e) {
    results.push({ path: p, status: -1, error: e.message });
  }
}

const all404 = results.every((r) => r.status === 404);
writeFileSync(
  resolve(ARTIFACTS, '404-check.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), all_404: all404, probes: results }, null, 2),
);

console.log('all probes returned 404:', all404);
for (const r of results) console.log(`  ${r.path} → ${r.status}`);
process.exit(all404 ? 0 : 1);
