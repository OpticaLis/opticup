#!/usr/bin/env node
// 06_internal_links.mjs — for each top-100 page's extracted internal links,
// do a light-weight check (HEAD, falling back to GET on 405). Flag any
// returning 404 / 5xx. Also extracts homepage links one level deep to produce
// a broader link-integrity sample.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const LOCAL = 'http://localhost:4321';
const CANONICAL = 'https://prizma-optic.co.il';

mkdirSync(ARTIFACTS, { recursive: true });

const top100 = JSON.parse(readFileSync(resolve(ARTIFACTS, 'onpage-top100.json'), 'utf-8')).entries;

// Collect unique internal link set
const allLinks = new Set();
for (const p of top100) {
  (p.internal_links || []).forEach((l) => allLinks.add(l));
}
console.error(`top-100 collected ${allLinks.size} unique internal links`);

// Also crawl homepage one level deep
async function getHtml(url) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      try { await r.arrayBuffer(); } catch {}
      if (loc) {
        const next = loc.startsWith('http') ? loc : LOCAL + loc;
        const r2 = await fetch(next);
        return { status: r2.status, text: await r2.text() };
      }
    }
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: -1, error: e.message };
  }
}

function extractInternal(text) {
  const out = [];
  try {
    const dom = new JSDOM(text);
    dom.window.document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
      try {
        const u = new URL(href, LOCAL);
        if (u.origin === LOCAL || u.origin === CANONICAL) out.push(u.pathname + u.search);
      } catch {}
    });
  } catch {}
  return out;
}

const homeRes = await getHtml(LOCAL + '/');
if (homeRes.text) extractInternal(homeRes.text).forEach((l) => allLinks.add(l));

// Also crawl /en/ and /ru/ one level
for (const loc of ['/en/', '/ru/']) {
  const res = await getHtml(LOCAL + loc);
  if (res.text) extractInternal(res.text).forEach((l) => allLinks.add(l));
}

console.error(`broader set: ${allLinks.size} unique internal links`);

const limit = pLimit(10);
let done = 0;
const results = await Promise.all(
  [...allLinks].map((l) =>
    limit(async () => {
      const url = LOCAL + l;
      let r;
      try {
        r = await fetch(url, { method: 'HEAD', redirect: 'manual' });
        if (r.status === 405 || r.status === 501) {
          try { await r.arrayBuffer(); } catch {}
          r = await fetch(url, { method: 'GET', redirect: 'manual' });
          try { await r.arrayBuffer(); } catch {}
        } else {
          try { await r.arrayBuffer(); } catch {}
        }
      } catch (e) {
        done++;
        return { link: l, status: -1, error: e.message };
      }
      done++;
      if (done % 100 === 0) console.error(`  links ${done}/${allLinks.size}`);
      return { link: l, status: r.status, location: r.headers.get('location') || null };
    }),
  ),
);

const broken = results.filter((r) => r.status >= 400 || r.status === -1);
const redirects = results.filter((r) => r.status >= 300 && r.status < 400);

// Per-page breakdown
const perPage = top100.map((p) => {
  const links = p.internal_links || [];
  const brokenOnPage = links.filter((l) => {
    const res = results.find((r) => r.link === l);
    return res && (res.status >= 400 || res.status === -1);
  });
  return {
    url: p.url,
    localPath: p.localPath,
    clicks: p.clicks,
    total_links: links.length,
    broken_links: brokenOnPage.length,
    broken_sample: brokenOnPage.slice(0, 5),
  };
});

writeFileSync(
  resolve(ARTIFACTS, 'internal-links.json'),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      total_links: results.length,
      broken_count: broken.length,
      redirect_count: redirects.length,
      broken_list: broken.slice(0, 500),
      per_page: perPage,
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({
  total: results.length,
  broken: broken.length,
  redirects: redirects.length,
}, null, 2));
