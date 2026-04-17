#!/usr/bin/env node
// 09_assemble_report.mjs — read all artifacts and write SEO_QA_REPORT.md.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');

const pages = JSON.parse(readFileSync(resolve(ARTIFACTS, 'pages.json'), 'utf-8'));
const queries = JSON.parse(readFileSync(resolve(ARTIFACTS, 'queries.json'), 'utf-8'));
const redirect = JSON.parse(readFileSync(resolve(ARTIFACTS, 'redirect-coverage.json'), 'utf-8'));
const sitemap = JSON.parse(readFileSync(resolve(ARTIFACTS, 'sitemap-check.json'), 'utf-8'));
const robots = JSON.parse(readFileSync(resolve(ARTIFACTS, 'robots-check.json'), 'utf-8'));
const fourohfour = JSON.parse(readFileSync(resolve(ARTIFACTS, '404-check.json'), 'utf-8'));
const onpage = JSON.parse(readFileSync(resolve(ARTIFACTS, 'onpage-top100.json'), 'utf-8'));
const noindex = JSON.parse(readFileSync(resolve(ARTIFACTS, 'noindex-sweep.json'), 'utf-8'));
const links = JSON.parse(readFileSync(resolve(ARTIFACTS, 'internal-links.json'), 'utf-8'));
const qcov = JSON.parse(readFileSync(resolve(ARTIFACTS, 'query-coverage.json'), 'utf-8'));
const lh = JSON.parse(readFileSync(resolve(ARTIFACTS, 'lighthouse-summary.json'), 'utf-8'));
const parity = JSON.parse(readFileSync(resolve(ARTIFACTS, 'redirect-parity.json'), 'utf-8'));

// ==== Helpers ====
function mdEscape(s) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
function pct(n, d) {
  if (!d) return '0%';
  return ((n / d) * 100).toFixed(1) + '%';
}
function fmtScore(s) {
  if (typeof s !== 'number') return 'N/A';
  return (s * 100).toFixed(1);
}

// ==== Classify MISSING URLs ====
const missing = redirect.entries
  .filter((e) => e.verdict === 'MISSING')
  .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

function suggestTarget(entry) {
  // Attempt to infer a storefront path:
  //   - en.prizma-optic.co.il → /en/…
  //   - ru.prizma-optic.co.il → /ru/…
  //   - product/:slug → /products/ (catalog index) — low confidence
  //   - Known static paths → guess same path
  const n = entry.requestPath || '';
  const entryHost = (entry.host || '').toLowerCase();
  if (entryHost === 'en.prizma-optic.co.il') {
    return { suggested_target: '/en' + n, confidence: 'LOW (subdomain fallback)' };
  }
  if (entryHost === 'ru.prizma-optic.co.il') {
    return { suggested_target: '/ru' + n, confidence: 'LOW (subdomain fallback)' };
  }
  if (/^\/product\//.test(n)) {
    return { suggested_target: '/products/ (catalog index)', confidence: 'LOW' };
  }
  if (/^\/product-category\//.test(n)) {
    return { suggested_target: '/categories/', confidence: 'LOW' };
  }
  if (/^\/brands?\//.test(n)) {
    return { suggested_target: '/brands/', confidence: 'LOW' };
  }
  return { suggested_target: 'manual review', confidence: 'NONE' };
}

// ==== DNS verdict ====
const verdictCounts = redirect.summary.verdicts;
const totalMissingHighTraffic = missing.filter((m) => m.clicks >= 10).length;
let dnsVerdict;
let dnsRationale;
if (totalMissingHighTraffic === 0 && missing.length <= 50) {
  dnsVerdict = 'GREEN';
  dnsRationale = 'All high-traffic URLs covered; remaining MISSING are long tail (<10 clicks) or 0-traffic.';
} else if (totalMissingHighTraffic <= 5 && missing.length <= 100) {
  dnsVerdict = 'YELLOW';
  dnsRationale = `${totalMissingHighTraffic} high-traffic URLs still MISSING; fix redirects before DNS switch.`;
} else {
  dnsVerdict = 'RED';
  dnsRationale = `${totalMissingHighTraffic} URLs with ≥10 clicks MISSING; ${missing.length} total MISSING. Must be fixed before DNS switch.`;
}

// ==== Build sections ====
let out = '';
out += `# SEO QA Report — Pre-DNS Switch (Prizma Optic)\n\n`;
out += `> **Generated:** ${new Date().toISOString()}\n`;
out += `> **SPEC:** \`modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/SPEC.md\`\n`;
out += `> **Mode:** Overnight automated audit (read-only)\n`;
out += `> **Local dev origin:** \`http://localhost:4321\`\n`;
out += `> **Canonical production origin:** \`https://prizma-optic.co.il\`\n\n`;

// 1. Executive Summary
out += `## 1. Executive Summary\n\n`;
out += `**Verdict for DNS switch: ${dnsVerdict}** — ${dnsRationale}\n\n`;
out += `- URLs audited from GSC Pages.csv: **${pages.entries.length}**\n`;
out += `- OK_200 (resolves natively on storefront): **${verdictCounts.OK_200 || 0}**\n`;
out += `- OK_301_REDIRECT (vercel.json rule → 200 destination): **${verdictCounts.OK_301_REDIRECT || 0}**\n`;
out += `- OK_410_INTENTIONAL: **${verdictCounts.OK_410_INTENTIONAL || 0}**\n`;
out += `- MISSING (no redirect, 404 on storefront): **${verdictCounts.MISSING || 0}** (of which **${totalMissingHighTraffic}** carry ≥10 clicks)\n`;
out += `- Multi-hop redirect chains: **${redirect.summary.multi_hop_count}**\n`;
out += `- HTTP (insecure) URLs in GSC: **${redirect.summary.https_insecure_count}**\n`;
out += `- Sitemap \`/sitemap-dynamic.xml\`: **${sitemap.total_locs} \\<loc\\> entries** — **${sitemap.broken_locs.length}** broken\n`;
out += `- robots.txt status: **${robots.status}**, ${robots.sitemap_directive_present ? robots.sitemap_directives.length + ' Sitemap directive(s)' : 'NO Sitemap directive'}, disallow-all: ${robots.disallow_all}\n`;
out += `- 404 handler: ${fourohfour.all_404 ? '✅ all probes returned 404' : '⚠ some probes returned non-404 (soft-404)'}\n`;
out += `- Top-100 on-page: canonical_ok **${onpage.entries.filter((e) => e.canonical_ok).length}/100**, og_complete **${onpage.entries.filter((e) => e.og_complete).length}/100**, twitter_complete **${onpage.entries.filter((e) => e.twitter_complete).length}/100**, title_ok **${onpage.entries.filter((e) => e.title_ok).length}/100**, desc_ok **${onpage.entries.filter((e) => e.desc_ok).length}/100**\n`;
out += `- noindex sweep (959 OK URLs): **${noindex.noindex_count}** hits\n`;
out += `- Internal links checked: **${links.total_links}**, broken: **${links.broken_count}**\n`;
out += `- Query coverage: 1000 queries analyzed; **${qcov.summary.query_term_true}** queries have their term on the guessed landing page\n`;
out += `- Lighthouse (top-20 URLs, mobile): avg Perf=**${fmtScore(lh.averages.performance)}**, A11y=**${fmtScore(lh.averages.accessibility)}**, BP=**${fmtScore(lh.averages['best-practices'])}**, SEO=**${fmtScore(lh.averages.seo)}** (dev-mode; production will score higher)\n\n`;

// 2. Missing URLs (Traffic-Ranked)
out += `## 2. Missing URLs (Traffic-Ranked)\n\n`;
out += `The headline list — URLs that Google currently knows about but that return 404 on the new storefront with no vercel.json redirect in place. Sorted by clicks (descending).\n\n`;
out += `| # | URL | Clicks | Impressions | CTR | Position | Request path | Host | Suggested Target | Confidence |\n`;
out += `|---|-----|-------:|-----------:|----:|---------:|------|------|------|-----|\n`;
for (let i = 0; i < missing.length; i++) {
  const m = missing[i];
  const sug = suggestTarget(m);
  out += `| ${i + 1} | ${mdEscape(m.url)} | ${m.clicks} | ${m.impressions} | ${(m.ctr * 100).toFixed(2)}% | ${m.position ?? ''} | \`${mdEscape(m.requestPath)}\` | ${m.host} | ${mdEscape(sug.suggested_target)} | ${sug.confidence} |\n`;
}
out += `\n**Total MISSING:** ${missing.length}. **With ≥10 clicks:** ${totalMissingHighTraffic}.\n\n`;

// 3. Redirect Chain & HTTPS Canonicalization
out += `## 3. Redirect Chain & HTTPS Canonicalization\n\n`;
const multiHop = redirect.entries.filter((r) => r.redirect_hops > 1).sort((a, b) => b.redirect_hops - a.redirect_hops);
out += `### 3.1 Host canonicalization\n\n`;
out += `- Apex (\`prizma-optic.co.il\`) URLs in GSC: **${redirect.summary.hosts['prizma-optic.co.il'] || 0}**\n`;
out += `- WWW (\`www.prizma-optic.co.il\`) URLs in GSC: **${redirect.summary.hosts['www.prizma-optic.co.il'] || 0}**\n`;
out += `- EN subdomain (\`en.prizma-optic.co.il\`) URLs in GSC: **${redirect.summary.hosts['en.prizma-optic.co.il'] || 0}**\n`;
out += `- RU subdomain (\`ru.prizma-optic.co.il\`) URLs in GSC: **${redirect.summary.hosts['ru.prizma-optic.co.il'] || 0}**\n`;
out += `- **Decision:** apex \`prizma-optic.co.il\` is canonical — vercel.json contains \`has.host = (en|ru).prizma-optic.co.il\` catch-all rules that 308-redirect subdomain requests into \`/en/…\` and \`/ru/…\` on apex.\n`;
out += `- Recommendation: confirm at DNS that both apex and \`www\` point to Vercel, and that Vercel is configured to redirect \`www\` → apex. (Not testable on localhost; check Vercel dashboard.)\n\n`;
out += `### 3.2 Trailing-slash policy\n\n`;
out += `- GSC URLs with trailing slash: **${redirect.summary.trailing_slash.with}**\n`;
out += `- GSC URLs without trailing slash: **${redirect.summary.trailing_slash.without}**\n`;
out += `- The storefront canonical tags consistently use the trailing slash form. Astro's \`trailingSlash\` is default (allow both).\n\n`;
out += `### 3.3 Multi-hop chains (redirect_hops > 1)\n\n`;
out += `Total: **${multiHop.length}**.\n\n`;
if (multiHop.length > 0) {
  out += `| # | URL | Hops | Final status |\n|---|-----|----:|---|\n`;
  for (const m of multiHop.slice(0, 30)) {
    out += `| | ${mdEscape(m.url)} | ${m.redirect_hops} | ${m.final_status} |\n`;
  }
  if (multiHop.length > 30) out += `| | … and ${multiHop.length - 30} more | | |\n`;
}
out += `\n### 3.4 HTTPS canonicalization\n\nHTTP (insecure) URLs in GSC: **${redirect.summary.https_insecure_count}**. `;
out += `${redirect.summary.https_insecure_count === 0 ? 'No http→http or http→200 leaks detected.' : 'See \`artifacts/redirect-coverage.json\` for details.'}\n\n`;

// 4. Sitemap & robots.txt
out += `## 4. Sitemap & robots.txt\n\n`;
out += `### 4.1 Sitemap\n\n`;
out += `- Source: \`${sitemap.sitemap_index_url}\`\n`;
out += `- Total \`<loc>\` entries: **${sitemap.total_locs}**\n`;
out += `- Broken \`<loc>\` entries: **${sitemap.broken_locs.length}**\n`;
if (sitemap.broken_locs.length > 0) {
  out += `\n**Broken entries (sample, first 30):**\n\n| # | loc | Status |\n|---|-----|---|\n`;
  for (const b of sitemap.broken_locs.slice(0, 30)) {
    out += `| | ${mdEscape(b.url)} | ${b.status} |\n`;
  }
}
out += `\n### 4.2 robots.txt\n\n`;
out += `- Status: **${robots.status}**\n`;
out += `- \`Disallow: /\` present: **${robots.disallow_all}**\n`;
out += `- Sitemap directives: **${robots.sitemap_directives.length}** — ${robots.sitemap_directives.map((s) => '`' + s + '`').join(', ') || 'none'}\n`;
out += `- Sitemap URL resolves: **${robots.sitemap_url_resolves}**\n\n`;

// 5. Top-100 On-Page Signals
out += `## 5. Top-100 On-Page Signals + Site-Wide noindex Sweep\n\n`;
out += `Deep HTML analysis of the 100 highest-traffic URLs from GSC (clicks descending). Lightweight \`meta robots\` / \`X-Robots-Tag\` sweep across all 959 OK URLs.\n\n`;
const agg = {
  canonical_ok: onpage.entries.filter((e) => e.canonical_ok).length,
  hreflang_ge_3: onpage.entries.filter((e) => (e.hreflang_count || 0) >= 3).length,
  x_default: onpage.entries.filter((e) => e.has_x_default).length,
  title_ok: onpage.entries.filter((e) => e.title_ok).length,
  desc_ok: onpage.entries.filter((e) => e.desc_ok).length,
  og_complete: onpage.entries.filter((e) => e.og_complete).length,
  twitter_complete: onpage.entries.filter((e) => e.twitter_complete).length,
  jsonld_ge_1: onpage.entries.filter((e) => (e.jsonld_count || 0) >= 1).length,
  noindex_top100: onpage.entries.filter((e) => e.noindex).length,
  img_alt_ge_95: onpage.entries.filter((e) => (e.img_alt_coverage || 0) >= 0.95).length,
};
out += `| Signal | Count (of 100) | Pass % |\n|---|---:|---:|\n`;
out += `| Self-referential canonical | ${agg.canonical_ok} | ${pct(agg.canonical_ok, 100)} |\n`;
out += `| hreflang ≥ 3 entries | ${agg.hreflang_ge_3} | ${pct(agg.hreflang_ge_3, 100)} |\n`;
out += `| hreflang x-default present | ${agg.x_default} | ${pct(agg.x_default, 100)} |\n`;
out += `| Title present & ≤60 chars | ${agg.title_ok} | ${pct(agg.title_ok, 100)} |\n`;
out += `| Description present & ≤160 chars | ${agg.desc_ok} | ${pct(agg.desc_ok, 100)} |\n`;
out += `| Open Graph complete (5 tags) | ${agg.og_complete} | ${pct(agg.og_complete, 100)} |\n`;
out += `| Twitter card complete | ${agg.twitter_complete} | ${pct(agg.twitter_complete, 100)} |\n`;
out += `| JSON-LD ≥ 1 block | ${agg.jsonld_ge_1} | ${pct(agg.jsonld_ge_1, 100)} |\n`;
out += `| noindex present (BAD on indexed page) | ${agg.noindex_top100} | ${pct(agg.noindex_top100, 100)} |\n`;
out += `| Image alt coverage ≥ 95% | ${agg.img_alt_ge_95} | ${pct(agg.img_alt_ge_95, 100)} |\n\n`;
out += `**Site-wide noindex sweep:** scanned ${noindex.swept} URLs → **${noindex.noindex_count}** noindex hits.\n\n`;

// 5.1 Top-100 per-URL table (condensed)
out += `### 5.1 Per-URL detail (top 50 by clicks)\n\n`;
out += `| URL | Clicks | Title len | Desc len | Canonical ✓ | hreflang | OG ✓ | TW ✓ | JSON-LD | Alt% | noindex |\n`;
out += `|---|---:|---:|---:|:---:|---:|:---:|:---:|---:|---:|:---:|\n`;
for (const e of onpage.entries.slice(0, 50)) {
  out += `| ${mdEscape(e.url)} | ${e.clicks} | ${e.title_len ?? ''} | ${e.desc_len ?? ''} | ${e.canonical_ok ? '✓' : '✗'} | ${e.hreflang_count ?? 0} | ${e.og_complete ? '✓' : '✗'} | ${e.twitter_complete ? '✓' : '✗'} | ${e.jsonld_count ?? 0} | ${((e.img_alt_coverage || 0) * 100).toFixed(0)}% | ${e.noindex ? '✗' : '✓'} |\n`;
}
out += `\n_Full set: \`artifacts/onpage-top100.json\`._\n\n`;

// 6. Lighthouse
out += `## 6. Lighthouse Scores (Top-20 URLs, Mobile Emulation)\n\n`;
out += `All scores computed against the Astro **dev server** (\`http://localhost:4321\`). Production build (minified, image-optimized, served via Vercel edge) will score meaningfully higher on Performance and Best Practices. SEO score is category-specific and less affected by dev-mode overhead.\n\n`;
out += `**Averages:** Performance **${fmtScore(lh.averages.performance)}**, Accessibility **${fmtScore(lh.averages.accessibility)}**, Best Practices **${fmtScore(lh.averages['best-practices'])}**, SEO **${fmtScore(lh.averages.seo)}**\n\n`;
out += `| # | URL | Perf | A11y | BP | SEO |\n|---|-----|---:|---:|---:|---:|\n`;
for (let i = 0; i < lh.per_url.length; i++) {
  const r = lh.per_url[i];
  const s = r.parsed?.scores || {};
  out += `| ${i + 1} | ${mdEscape(r.url)} | ${fmtScore(s.performance)} | ${fmtScore(s.accessibility)} | ${fmtScore(s['best-practices'])} | ${fmtScore(s.seo)} |\n`;
}
out += `\n`;

// 7. Query Coverage
out += `## 7. Query Coverage (all 1000 GSC queries)\n\n`;
out += `Each query was mapped to its likely GSC landing page (via Pages.csv cross-reference), then the query text was searched inside the page's title / h1 / h2 / body text.\n\n`;
out += `- Queries with a guessed landing page: **${qcov.summary.with_landing}** / 1000\n`;
out += `- Landing page resolves OK on storefront: **${qcov.summary.landing_ok}**\n`;
out += `- Landing page is MISSING: **${qcov.summary.landing_missing}**\n`;
out += `- Query term appears on page (confidence **HIGH**): **${qcov.summary.appearance.HIGH}**\n`;
out += `- Query term partially appears (confidence **MEDIUM**): **${qcov.summary.appearance.MEDIUM}**\n`;
out += `- Query term not found or low confidence: **${qcov.summary.appearance.LOW}**\n\n`;
out += `### 7.1 Top-50 queries — per-query result\n\n`;
out += `| Query | Clicks | Landing | Term? | Where | Confidence |\n|---|---:|---|:---:|---|---|\n`;
for (const q of qcov.entries.slice(0, 50)) {
  const appears = q.query_term_appears === true ? '✓' : q.query_term_appears === false ? '✗' : '—';
  out += `| ${mdEscape(q.query)} | ${q.clicks} | ${mdEscape(q.landing_page_url || '—')} | ${appears} | ${q.match_loc || ''} | ${q.confidence} |\n`;
}
out += `\n_Full 1000-row set: \`artifacts/query-coverage.json\`._\n\n`;

// 8. Internal Link Integrity
out += `## 8. Internal Link Integrity\n\n`;
out += `- Unique internal links extracted from top-100 pages + home + /en/ + /ru/: **${links.total_links}**\n`;
out += `- Broken (404/5xx/error): **${links.broken_count}**\n`;
out += `- Redirects (300/302): **${links.redirect_count}**\n\n`;
if (links.broken_count > 0) {
  out += `**Sample of broken links:**\n\n| Link | Status |\n|---|---|\n`;
  for (const b of links.broken_list.slice(0, 30)) out += `| ${mdEscape(b.link)} | ${b.status} |\n`;
  out += `\n`;
}
out += `### 8.1 Per-top-100-page summary (pages with ≥1 broken link)\n\n`;
const pagesWithBroken = links.per_page.filter((p) => p.broken_links > 0);
if (pagesWithBroken.length === 0) {
  out += `_None._\n\n`;
} else {
  out += `| Page | Clicks | Links | Broken |\n|---|---:|---:|---:|\n`;
  for (const p of pagesWithBroken) {
    out += `| ${mdEscape(p.url)} | ${p.clicks} | ${p.total_links} | ${p.broken_links} |\n`;
  }
  out += `\n`;
}

// 9. Structured Data Summary
out += `## 9. Structured Data (schema.org JSON-LD) Summary\n\n`;
const typeCounts = {};
const byPageType = {};
for (const e of onpage.entries) {
  (e.jsonld_types || []).forEach((t) => (typeCounts[t] = (typeCounts[t] || 0) + 1));
  byPageType[e.page_type] = byPageType[e.page_type] || { count: 0, with_jsonld: 0 };
  byPageType[e.page_type].count++;
  if ((e.jsonld_count || 0) > 0) byPageType[e.page_type].with_jsonld++;
}
out += `### 9.1 Types seen across top-100\n\n`;
out += `| @type | Pages |\n|---|---:|\n`;
for (const [t, c] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  out += `| ${t} | ${c} |\n`;
}
out += `\n### 9.2 JSON-LD coverage by page type\n\n`;
out += `| Page type | Count | With JSON-LD | Coverage |\n|---|---:|---:|---:|\n`;
for (const [k, v] of Object.entries(byPageType)) {
  out += `| ${k} | ${v.count} | ${v.with_jsonld} | ${pct(v.with_jsonld, v.count)} |\n`;
}
out += `\n`;

// 10. Findings & Recommended Next SPEC
out += `## 10. Findings & Recommended Next SPEC\n\n`;
out += `See the sibling file \`FINDINGS.md\` for the full severity-tagged list (INFO / LOW / MEDIUM / HIGH / CRITICAL) — each finding carries a location pointer and a suggested next action.\n\n`;
out += `**Recommended follow-up SPEC:** \`PRE_MERGE_SEO_FIXES\` — group the MISSING-URL redirect additions, the canonical/title/OG deficiencies on top-100 pages, the ${sitemap.broken_locs.length}-broken sitemap entries, and the sitemap/robots.txt host drift in \`/dist/client/\` into a single pre-DNS fixup SPEC. All fixes touch config files or Astro page components (head meta + JSON-LD); none require DB changes.\n\n`;
out += `**Pass/fail against SPEC Criterion 5 (high-traffic MISSING):** `;
if (totalMissingHighTraffic === 0) {
  out += `✅ PASS — no MISSING URL carries ≥10 clicks.\n`;
} else {
  out += `❌ FAIL — ${totalMissingHighTraffic} MISSING URLs carry ≥10 clicks. Must redirect before DNS switch.\n`;
}
out += `\n---\n\n*End of SEO_QA_REPORT.*\n`;

writeFileSync(resolve(ROOT, 'SEO_QA_REPORT.md'), out);

console.log('SEO_QA_REPORT.md written —', out.length, 'chars');
console.log('dnsVerdict:', dnsVerdict);
console.log('missing count:', missing.length, '/ high-traffic:', totalMissingHighTraffic);
