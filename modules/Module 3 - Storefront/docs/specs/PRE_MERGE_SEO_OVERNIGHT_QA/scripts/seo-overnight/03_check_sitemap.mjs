#!/usr/bin/env node
// 03_check_sitemap.mjs — fetch & parse sitemap, HEAD every <loc>.
// Also verifies robots.txt presence + sanity.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const LOCAL = 'http://localhost:4321';
const CANONICAL = 'https://prizma-optic.co.il';

mkdirSync(ARTIFACTS, { recursive: true });

async function fetchText(url) {
  const r = await fetch(url);
  const text = await r.text();
  return { status: r.status, text, headers: Object.fromEntries(r.headers) };
}

function extractLocs(xml) {
  const matches = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

// Astro sitemap integration emits the production origin. Rewrite to localhost for HEAD checks.
function toLocal(absUrl) {
  try {
    const u = new URL(absUrl);
    return LOCAL + u.pathname + u.search;
  } catch {
    return null;
  }
}

console.error('fetching sitemap index + child sitemaps...');
const candidates = ['/sitemap-dynamic.xml', '/sitemap-index.xml', '/sitemap.xml'];
let sitemapIndexUrl = null;
let sitemapIndexText = null;
let sitemapIndexStatus = null;

for (const c of candidates) {
  const r = await fetchText(LOCAL + c);
  if (r.status === 200) {
    sitemapIndexUrl = LOCAL + c;
    sitemapIndexText = r.text;
    sitemapIndexStatus = r.status;
    break;
  }
}

if (!sitemapIndexUrl) {
  const robots = await fetchText(LOCAL + '/robots.txt').catch(() => ({ status: -1, text: '' }));
  writeFileSync(
    resolve(ARTIFACTS, 'sitemap-check.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        valid: false,
        reason: 'NO_SITEMAP_FOUND',
        candidates_tried: candidates,
      },
      null,
      2,
    ),
  );
  console.log('No sitemap at /sitemap-index.xml or /sitemap.xml');
  console.log('robots.txt status:', robots.status);
} else {
  // Collect all <loc>s (child sitemaps + final URLs)
  const firstLocs = extractLocs(sitemapIndexText);
  let childSitemaps = [];
  let allUrls = [];

  // If the first doc's locs are sitemaps (ending .xml) — treat as index
  const looksLikeIndex = firstLocs.some((u) => /\.xml(\?|$)/i.test(u));
  if (looksLikeIndex) {
    childSitemaps = firstLocs;
    const fetchLimit = pLimit(4);
    const childResults = await Promise.all(
      childSitemaps.map((c) =>
        fetchLimit(async () => {
          const url = toLocal(c) || c;
          const r = await fetchText(url).catch((e) => ({ status: -1, text: '', error: e.message }));
          return { sitemap: c, status: r.status, locs: r.status === 200 ? extractLocs(r.text) : [] };
        }),
      ),
    );
    for (const cr of childResults) allUrls.push(...cr.locs);
    var childSummary = childResults.map((c) => ({ sitemap: c.sitemap, status: c.status, loc_count: c.locs.length }));
  } else {
    allUrls = firstLocs;
    var childSummary = [];
  }

  // HEAD-check every URL (but fall back to GET because some Astro dev 404 responses differ)
  const limit = pLimit(10);
  const checkResults = await Promise.all(
    allUrls.map((u) =>
      limit(async () => {
        const local = toLocal(u) || u;
        try {
          let r = await fetch(local, { method: 'HEAD' });
          // Some endpoints reject HEAD; fall back to GET if non-2xx/3xx
          if (r.status === 405 || r.status === 501) {
            r = await fetch(local, { method: 'GET' });
            try { await r.arrayBuffer(); } catch {}
          }
          return { url: u, local, status: r.status };
        } catch (e) {
          return { url: u, local, status: -1, error: e.message };
        }
      }),
    ),
  );
  const brokenLocs = checkResults.filter((r) => r.status !== 200 && r.status !== 301 && r.status !== 302);

  // robots.txt
  const robots = await fetchText(LOCAL + '/robots.txt').catch(() => ({ status: -1, text: '' }));
  const disallowAllRe = /^Disallow:\s*\/\s*$/m;
  const sitemapDirectiveRe = /^Sitemap:\s*(\S+)\s*$/gim;
  const sitemapDirectives = [];
  let m;
  while ((m = sitemapDirectiveRe.exec(robots.text || '')) !== null) sitemapDirectives.push(m[1]);

  // Verify robots.txt sitemap URL resolves
  const sitemapUrlResolves = sitemapDirectives.length > 0
    ? await (async () => {
        for (const s of sitemapDirectives) {
          const local = toLocal(s) || s;
          try {
            const r = await fetch(local, { method: 'HEAD' });
            if (r.status === 200) return true;
          } catch {}
        }
        return false;
      })()
    : false;

  const result = {
    generated_at: new Date().toISOString(),
    sitemap_index_url: sitemapIndexUrl,
    sitemap_index_status: sitemapIndexStatus,
    is_index: looksLikeIndex,
    child_sitemaps: childSummary,
    total_locs: allUrls.length,
    valid: allUrls.length >= 50 && brokenLocs.length === 0,
    broken_locs: brokenLocs,
    sample_locs: allUrls.slice(0, 10),
  };
  writeFileSync(resolve(ARTIFACTS, 'sitemap-check.json'), JSON.stringify(result, null, 2));
  writeFileSync(
    resolve(ARTIFACTS, 'robots-check.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        status: robots.status,
        bytes: robots.text?.length ?? 0,
        disallow_all: disallowAllRe.test(robots.text || ''),
        sitemap_directive_present: sitemapDirectives.length > 0,
        sitemap_directives: sitemapDirectives,
        sitemap_url_resolves: sitemapUrlResolves,
        text_preview: (robots.text || '').slice(0, 1000),
      },
      null,
      2,
    ),
  );

  console.log('sitemap index URL:', sitemapIndexUrl);
  console.log('is_index:', looksLikeIndex);
  console.log('total locs:', allUrls.length);
  console.log('broken:', brokenLocs.length);
  console.log('robots.txt status:', robots.status, 'sitemap directives:', sitemapDirectives.length);
}
