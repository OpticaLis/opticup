#!/usr/bin/env node
// 05_onpage_top100.mjs — deep on-page audit for top-100 traffic URLs.
// Also runs a lightweight noindex sweep across all 1000 Pages.csv URLs
// that resolve 200 (per redirect-coverage.json).
//
// Extracts per-page:
//   - <title>, meta description
//   - canonical tag + self-referential check
//   - hreflang entries (he/en/ru/x-default)
//   - Open Graph tags, Twitter card tags
//   - JSON-LD blocks (parsed; types; valid)
//   - <meta name="robots"> + X-Robots-Tag header (noindex presence)
//   - <img> alt coverage
//   - internal link list (for later script 06)

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

const redirectCov = JSON.parse(readFileSync(resolve(ARTIFACTS, 'redirect-coverage.json'), 'utf-8'));
const okEntries = redirectCov.entries.filter((r) => r.verdict === 'OK_200' || r.verdict === 'OK_301_REDIRECT');

// Build localhost-servable paths for each OK entry
function pathForEntry(r) {
  let p;
  if (r.vercelMatch) {
    // Simulated redirect → final destination is pathToFetch
    p = r.pathToFetch;
  } else {
    p = r.requestPath;
  }
  // Strip canonical origin if present
  if (p && p.startsWith(CANONICAL)) p = p.slice(CANONICAL.length);
  return p || '/';
}

// Classify page type from the final URL so we can expect appropriate JSON-LD
function classifyPage(pathToFetch) {
  if (!pathToFetch || pathToFetch === '/' || pathToFetch === '/en/' || pathToFetch === '/ru/') return 'home';
  if (/\/products\/\d+\/?$/.test(pathToFetch)) return 'product';
  if (/\/(blog|en\/blog|ru\/blog)\//.test(pathToFetch) && pathToFetch.split('/').filter(Boolean).length > 2) return 'blog-post';
  if (/\/(blog|en\/blog|ru\/blog)\/?$/.test(pathToFetch)) return 'blog-index';
  if (/\/brands\//.test(pathToFetch)) return 'brand';
  if (/\/categories\//.test(pathToFetch)) return 'category';
  if (/\/product-category\//.test(pathToFetch)) return 'category';
  return 'other';
}

async function fetchPage(localPath) {
  const url = LOCAL + localPath;
  let resp;
  try {
    resp = await fetch(url, { redirect: 'manual' });
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get('location');
      if (loc) {
        try { await resp.arrayBuffer(); } catch {}
        const next = loc.startsWith('http') ? loc : LOCAL + loc;
        resp = await fetch(next, { redirect: 'manual' });
      }
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
  const headers = Object.fromEntries(resp.headers);
  let text;
  try {
    text = await resp.text();
  } catch (e) {
    text = '';
  }
  // Truncate very large docs to 2MB per SPEC §5
  if (text.length > 2 * 1024 * 1024) text = text.slice(0, 2 * 1024 * 1024);
  return { ok: true, status: resp.status, headers, text };
}

function analyze(html, localPath, expectedCanonical) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
    const canonicalNode = doc.querySelector('link[rel="canonical"]');
    const canonical = canonicalNode?.getAttribute('href')?.trim() || '';

    const hreflangs = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((el) => ({
      hreflang: el.getAttribute('hreflang'),
      href: el.getAttribute('href'),
    }));

    const og = {};
    doc.querySelectorAll('meta[property^="og:"]').forEach((el) => {
      const p = el.getAttribute('property');
      const v = el.getAttribute('content');
      if (p && v != null) og[p] = v;
    });
    const twitter = {};
    doc.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
      const p = el.getAttribute('name');
      const v = el.getAttribute('content');
      if (p && v != null) twitter[p] = v;
    });

    const jsonLdBlocks = [...doc.querySelectorAll('script[type="application/ld+json"]')];
    const jsonLdTypes = [];
    let jsonLdParseOk = true;
    for (const n of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(n.textContent || '');
        const collect = (obj) => {
          if (!obj) return;
          if (Array.isArray(obj)) obj.forEach(collect);
          else if (obj['@graph']) collect(obj['@graph']);
          else if (obj['@type']) {
            const t = obj['@type'];
            if (Array.isArray(t)) t.forEach((x) => jsonLdTypes.push(x));
            else jsonLdTypes.push(t);
          }
        };
        collect(parsed);
      } catch {
        jsonLdParseOk = false;
      }
    }

    const robotsMetaRaw = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    const noindexMeta = /noindex/i.test(robotsMetaRaw);

    const imgs = [...doc.querySelectorAll('img')];
    const withAlt = imgs.filter((i) => (i.getAttribute('alt') || '').length > 0);
    const imgAltCoverage = imgs.length === 0 ? 1 : withAlt.length / imgs.length;

    // H1/H2 for later query coverage
    const h1 = doc.querySelector('h1')?.textContent?.trim() || '';
    const h2s = [...doc.querySelectorAll('h2')].map((h) => h.textContent?.trim()).filter(Boolean);

    // Internal links: same-origin or relative
    const internalLinks = [];
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
      try {
        const u = new URL(href, LOCAL);
        if (u.origin === LOCAL || u.origin === CANONICAL) {
          internalLinks.push(u.pathname + u.search);
        }
      } catch {}
    });

    // Body text for later query match
    const bodyText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();

    const expectedCanonicalProd = CANONICAL + localPath;
    const canonicalOk = !!canonical && (
      canonical === expectedCanonicalProd ||
      canonical === expectedCanonicalProd.replace(/\/$/, '') ||
      canonical === expectedCanonicalProd + '/'
    );

    return {
      title,
      title_len: title.length,
      title_ok: title.length > 0 && title.length <= 60,
      desc,
      desc_len: desc.length,
      desc_ok: desc.length > 0 && desc.length <= 160,
      canonical,
      canonical_ok: canonicalOk,
      hreflang_entries: hreflangs,
      hreflang_count: hreflangs.length,
      has_x_default: hreflangs.some((h) => h.hreflang === 'x-default'),
      og,
      og_complete: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].every((k) => og[k]),
      twitter,
      twitter_complete: ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].every((k) => twitter[k]),
      jsonld_count: jsonLdBlocks.length,
      jsonld_parse_ok: jsonLdParseOk,
      jsonld_types: [...new Set(jsonLdTypes)],
      noindex_meta: noindexMeta,
      robots_meta_raw: robotsMetaRaw,
      img_total: imgs.length,
      img_with_alt: withAlt.length,
      img_alt_coverage: imgAltCoverage,
      h1,
      h2_count: h2s.length,
      h2s: h2s.slice(0, 20),
      internal_links: [...new Set(internalLinks)],
      body_text_sample: bodyText.slice(0, 5000),
    };
  } catch (err) {
    return { parse_error: err.message };
  }
}

console.error(`okEntries: ${okEntries.length}`);

// Pick top-100 by clicks
const top100 = [...okEntries].sort((a, b) => b.clicks - a.clicks).slice(0, 100);

console.error(`deep-analyzing top ${top100.length} URLs`);
const limit = pLimit(6);
let done = 0;
const deepResults = await Promise.all(
  top100.map((r) =>
    limit(async () => {
      const p = pathForEntry(r);
      const fetched = await fetchPage(p);
      done++;
      if (done % 20 === 0) console.error(`  top100 ${done}/${top100.length}`);
      if (!fetched.ok) return { url: r.url, localPath: p, error: fetched.error };
      const headers = fetched.headers;
      const xRobots = headers['x-robots-tag'] || '';
      const noindexHeader = /noindex/i.test(xRobots);
      const analysis = analyze(fetched.text, p, CANONICAL + p);
      const pageType = classifyPage(p);
      return {
        url: r.url,
        requestPath: r.requestPath,
        localPath: p,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
        host_original: r.host,
        page_type: pageType,
        status: fetched.status,
        x_robots_tag: xRobots,
        noindex: analysis.noindex_meta || noindexHeader,
        ...analysis,
      };
    }),
  ),
);

writeFileSync(resolve(ARTIFACTS, 'onpage-top100.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  count: deepResults.length,
  entries: deepResults,
}, null, 2));

console.error('top-100 done; starting noindex sweep on all OK URLs…');

// Lightweight noindex sweep: all OK_200 + OK_301_REDIRECT entries
const sweepLimit = pLimit(10);
let sweepDone = 0;
const sweep = await Promise.all(
  okEntries.map((r) =>
    sweepLimit(async () => {
      const p = pathForEntry(r);
      const url = LOCAL + p;
      try {
        const resp = await fetch(url, { redirect: 'manual' });
        let text = '';
        if (resp.status >= 200 && resp.status < 400) {
          try { text = await resp.text(); } catch {}
        } else {
          try { await resp.arrayBuffer(); } catch {}
        }
        sweepDone++;
        if (sweepDone % 100 === 0) console.error(`  sweep ${sweepDone}/${okEntries.length}`);
        const xRobots = resp.headers.get('x-robots-tag') || '';
        const metaRobotsMatch = text.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
        const metaRobots = metaRobotsMatch ? metaRobotsMatch[1] : '';
        return {
          url: r.url,
          localPath: p,
          status: resp.status,
          x_robots_tag: xRobots,
          meta_robots: metaRobots,
          noindex: /noindex/i.test(xRobots) || /noindex/i.test(metaRobots),
        };
      } catch (e) {
        sweepDone++;
        return { url: r.url, localPath: p, error: e.message, noindex: null };
      }
    }),
  ),
);

const noindexHits = sweep.filter((s) => s.noindex === true);
writeFileSync(resolve(ARTIFACTS, 'noindex-sweep.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  swept: sweep.length,
  noindex_count: noindexHits.length,
  hits: noindexHits.slice(0, 200),
  all: sweep,
}, null, 2));

// Quick aggregates for log
const agg = {
  top100_count: deepResults.length,
  canonical_ok: deepResults.filter((d) => d.canonical_ok).length,
  hreflang_ge_3: deepResults.filter((d) => (d.hreflang_count || 0) >= 3).length,
  title_ok: deepResults.filter((d) => d.title_ok).length,
  desc_ok: deepResults.filter((d) => d.desc_ok).length,
  og_complete: deepResults.filter((d) => d.og_complete).length,
  twitter_complete: deepResults.filter((d) => d.twitter_complete).length,
  jsonld_ge_1: deepResults.filter((d) => (d.jsonld_count || 0) >= 1).length,
  jsonld_parse_ok: deepResults.filter((d) => d.jsonld_parse_ok === true).length,
  noindex_count_top100: deepResults.filter((d) => d.noindex).length,
  img_alt_ge_95: deepResults.filter((d) => (d.img_alt_coverage || 0) >= 0.95).length,
  noindex_sweep_hits: noindexHits.length,
};
console.log(JSON.stringify(agg, null, 2));
