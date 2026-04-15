#!/usr/bin/env node
// 07_query_coverage.mjs — for ALL 1000 queries in Queries.csv:
//   1. Find the likely landing page by cross-referencing Pages.csv (URLs
//      that share a meaningful substring with the query term). If none,
//      leave landing_page_url = null.
//   2. If a landing URL is OK_200 in redirect-coverage.json, use the page's
//      already-fetched body_text/title/h1/h2 from onpage-top100.json (if in
//      top100) OR fetch it fresh.
//   3. Check whether the query term appears (case-insensitive) in title,
//      h1, h2, or body text. Record confidence HIGH/MEDIUM/LOW.
//   4. Top-100 queries get an extra synonym/stem pass (strip punctuation,
//      split words, each word presence).

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

mkdirSync(ARTIFACTS, { recursive: true });

const queries = JSON.parse(readFileSync(resolve(ARTIFACTS, 'queries.json'), 'utf-8')).entries;
const pages = JSON.parse(readFileSync(resolve(ARTIFACTS, 'pages.json'), 'utf-8')).entries;
const redirectCov = JSON.parse(readFileSync(resolve(ARTIFACTS, 'redirect-coverage.json'), 'utf-8')).entries;
const top100 = JSON.parse(readFileSync(resolve(ARTIFACTS, 'onpage-top100.json'), 'utf-8')).entries;

const top100ByUrl = new Map(top100.map((p) => [p.url, p]));
const covByUrl = new Map(redirectCov.map((r) => [r.url, r]));

// Normalize query / URL to share a common keyword space.
function normWord(s) {
  return (s || '').toLowerCase().normalize('NFC').replace(/[\s\-_]+/g, ' ').trim();
}

function scoreMatch(queryText, pageText) {
  const qWords = normWord(queryText).split(/\s+/).filter((w) => w.length >= 2);
  if (qWords.length === 0) return { matched: false, score: 0 };
  const text = normWord(pageText);
  let matched = 0;
  for (const w of qWords) if (text.includes(w)) matched++;
  return { matched: matched === qWords.length, score: matched / qWords.length };
}

// Pick best landing page guess. Score: count of query words in URL pathname.
function pickLanding(query) {
  const qWords = normWord(query).split(/\s+/).filter((w) => w.length >= 2);
  if (qWords.length === 0) return null;
  let best = null;
  let bestScore = 0;
  for (const p of pages) {
    const path = normWord(decodeURIComponent(p.normalized?.pathname || ''));
    const pathHost = normWord(p.normalized?.host || '');
    const candidate = path + ' ' + pathHost;
    let s = 0;
    for (const w of qWords) if (candidate.includes(w)) s++;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    } else if (s === bestScore && best && p.clicks > best.clicks) {
      best = p;
    }
  }
  if (bestScore === 0) return null;
  return { page: best, match_ratio: bestScore / qWords.length };
}

async function fetchPageFresh(url) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      try { await r.arrayBuffer(); } catch {}
      if (loc) {
        const next = loc.startsWith('http') ? loc : LOCAL + loc;
        const r2 = await fetch(next, { redirect: 'follow' });
        return { status: r2.status, text: await r2.text() };
      }
    }
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: -1, error: e.message };
  }
}

function textFromHtml(html) {
  try {
    const dom = new JSDOM(html);
    const title = dom.window.document.querySelector('title')?.textContent || '';
    const h1 = dom.window.document.querySelector('h1')?.textContent || '';
    const h2s = [...dom.window.document.querySelectorAll('h2')].map((h) => h.textContent || '').join(' ');
    const body = dom.window.document.body?.textContent || '';
    return { title, h1, h2s, body };
  } catch {
    return { title: '', h1: '', h2s: '', body: '' };
  }
}

// Cache fetched page text so we don't re-fetch across queries mapping to same URL
const pageCache = new Map();
async function getPageText(url) {
  if (pageCache.has(url)) return pageCache.get(url);
  // Prefer data from top100 if available
  const top = top100ByUrl.get(url);
  if (top && top.body_text_sample) {
    const v = {
      title: top.title || '',
      h1: top.h1 || '',
      h2s: (top.h2s || []).join(' '),
      body: top.body_text_sample || '',
    };
    pageCache.set(url, v);
    return v;
  }
  // Fetch fresh
  const cov = covByUrl.get(url);
  if (!cov) return null;
  let p = cov.pathToFetch || cov.requestPath || '/';
  if (p.startsWith('https://prizma-optic.co.il')) p = p.slice('https://prizma-optic.co.il'.length);
  const r = await fetchPageFresh(LOCAL + p);
  if (r.status !== 200 || !r.text) {
    pageCache.set(url, null);
    return null;
  }
  const t = textFromHtml(r.text);
  pageCache.set(url, t);
  return t;
}

const limit = pLimit(6);
let done = 0;
const results = await Promise.all(
  queries.map((q) =>
    limit(async () => {
      const landing = pickLanding(q.query);
      let landing_page_url = null;
      let landing_clicks = 0;
      let landing_verdict = null;
      if (landing && landing.page) {
        landing_page_url = landing.page.url;
        landing_clicks = landing.page.clicks;
        const cov = covByUrl.get(landing_page_url);
        landing_verdict = cov ? cov.verdict : null;
      }

      let query_term_appears = null;
      let confidence = 'LOW';
      let match_loc = null;
      if (landing_page_url && (landing_verdict === 'OK_200' || landing_verdict === 'OK_301_REDIRECT')) {
        const text = await getPageText(landing_page_url);
        if (text) {
          const all = text.title + ' ' + text.h1 + ' ' + text.h2s + ' ' + text.body;
          const exact = normWord(all).includes(normWord(q.query));
          const { matched, score } = scoreMatch(q.query, all);
          query_term_appears = exact || matched;
          if (exact) {
            confidence = 'HIGH';
            match_loc = normWord(text.title).includes(normWord(q.query))
              ? 'title'
              : normWord(text.h1).includes(normWord(q.query))
                ? 'h1'
                : normWord(text.h2s).includes(normWord(q.query))
                  ? 'h2'
                  : 'body';
          } else if (matched && score >= 0.8) {
            confidence = 'MEDIUM';
          } else if (score >= 0.5) {
            confidence = 'LOW';
          } else {
            confidence = 'LOW';
            query_term_appears = false;
          }
        } else {
          confidence = 'LOW';
        }
      }

      done++;
      if (done % 100 === 0) console.error(`  queries ${done}/${queries.length}`);

      return {
        query: q.query,
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        landing_page_url,
        landing_clicks,
        landing_verdict,
        query_term_appears,
        match_loc,
        confidence,
      };
    }),
  ),
);

const summary = {
  total: results.length,
  with_landing: results.filter((r) => r.landing_page_url).length,
  landing_ok: results.filter((r) => r.landing_verdict === 'OK_200' || r.landing_verdict === 'OK_301_REDIRECT').length,
  landing_missing: results.filter((r) => r.landing_verdict === 'MISSING').length,
  appearance: {
    HIGH: results.filter((r) => r.confidence === 'HIGH').length,
    MEDIUM: results.filter((r) => r.confidence === 'MEDIUM').length,
    LOW: results.filter((r) => r.confidence === 'LOW').length,
  },
  query_term_true: results.filter((r) => r.query_term_appears === true).length,
  query_term_false: results.filter((r) => r.query_term_appears === false).length,
  query_term_null: results.filter((r) => r.query_term_appears == null).length,
};

writeFileSync(
  resolve(ARTIFACTS, 'query-coverage.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), summary, entries: results }, null, 2),
);

console.log(JSON.stringify(summary, null, 2));
