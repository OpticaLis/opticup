#!/usr/bin/env node
// 02_check_redirects.mjs — classify every GSC URL.
//
// Strategy:
//   1. For each GSC URL, extract a "path key" that represents what the URL
//      will be requested as post-DNS-switch. WP subdomain hosts
//      (en.prizma-optic.co.il, ru.prizma-optic.co.il) are rewritten to
//      path-prefix locales (/en/…, /ru/…) which is how the storefront serves
//      those locales today.
//   2. Simulate vercel.json redirects: if the path matches a rule, record
//      the 301 and continue resolving the destination.
//   3. Whatever pathname survives the redirect simulation is GET'd on
//      localhost:4321; the response status is recorded.
//   4. Verdict:
//        OK_200              — final GET returns 200
//        OK_301_REDIRECT     — matched a vercel redirect rule AND dest returns 200
//        OK_410_INTENTIONAL  — explicit 410 response
//        MISSING             — final response is 404/5xx and no redirect covers it
//
// The script does NOT hit the live WP site; all requests go to localhost:4321.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import { loadVercelRedirects, matchRedirect } from './lib/vercel-redirects.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(ROOT, 'artifacts');
const STOREFRONT = resolve('C:/Users/User/opticup-storefront');
const LOCAL = 'http://localhost:4321';

mkdirSync(ARTIFACTS, { recursive: true });

const pages = JSON.parse(readFileSync(resolve(ARTIFACTS, 'pages.json'), 'utf-8')).entries;
const redirectRules = loadVercelRedirects(resolve(STOREFRONT, 'vercel.json'));
console.error(`Loaded ${redirectRules.length} vercel redirect rules`);

// Extract the in-URL pathname + host from a GSC entry. No path rewriting —
// subdomain→path-prefix translation happens in vercel.json via the
// `has.host` catch-all rule, which we simulate in matchRedirect.
function rewriteToLocal(entry) {
  const n = entry.normalized;
  if (!n || !n.host) return null;
  const host = n.host.toLowerCase();
  const requestPath = n.pathname + (n.search || '');
  const known = [
    'prizma-optic.co.il',
    'www.prizma-optic.co.il',
    'en.prizma-optic.co.il',
    'ru.prizma-optic.co.il',
  ].includes(host);
  return {
    requestPath,
    host,
    httpsInsecure: n.protocol === 'http:',
    www: host === 'www.prizma-optic.co.il',
    unknownHost: !known,
  };
}

async function fetchStatus(pathname, { maxHops = 5 } = {}) {
  const hops = [];
  let current = pathname;
  for (let i = 0; i < maxHops; i++) {
    const url = LOCAL + current;
    let resp;
    try {
      resp = await fetch(url, { redirect: 'manual', method: 'GET' });
    } catch (err) {
      // Retry once after 2s
      await new Promise((r) => setTimeout(r, 2000));
      try {
        resp = await fetch(url, { redirect: 'manual', method: 'GET' });
      } catch (err2) {
        hops.push({ path: current, status: -1, error: err2.message });
        return { hops, final_status: -1, final_path: current };
      }
    }
    const status = resp.status;
    const location = resp.headers.get('location');
    hops.push({ path: current, status, location: location || null });
    // Drain body to free socket
    try { await resp.arrayBuffer(); } catch {}
    if (status >= 300 && status < 400 && location) {
      // Follow relative / absolute location
      if (location.startsWith('http://') || location.startsWith('https://')) {
        try {
          const u = new URL(location);
          if (u.host && u.host !== 'localhost:4321') {
            // Exited to external host — stop
            return { hops, final_status: status, final_path: location, external: true };
          }
          current = u.pathname + u.search;
        } catch {
          return { hops, final_status: status, final_path: current };
        }
      } else {
        current = location;
      }
      continue;
    }
    return { hops, final_status: status, final_path: current };
  }
  return { hops, final_status: null, final_path: current, chain_too_deep: true };
}

async function classifyEntry(entry) {
  const rewrite = rewriteToLocal(entry);
  if (!rewrite) {
    return {
      url: entry.url,
      clicks: entry.clicks,
      impressions: entry.impressions,
      verdict: 'MISSING',
      reason: 'URL_PARSE_FAIL',
      rewrite: null,
    };
  }
  if (rewrite.unknownHost) {
    return {
      url: entry.url,
      clicks: entry.clicks,
      impressions: entry.impressions,
      verdict: 'MISSING',
      reason: 'UNKNOWN_HOST',
      rewrite,
    };
  }

  // Step 1: apply vercel redirect rule (simulated; `has.host` honored)
  const vercelChain = [];
  let pathToFetch = rewrite.requestPath;
  let hostForMatch = rewrite.host;
  let externalRedirect = false;
  for (let i = 0; i < 5; i++) {
    const match = matchRedirect(pathToFetch, redirectRules, hostForMatch);
    if (!match) break;
    vercelChain.push({
      matched_source: match.rule.source,
      destination: match.destination,
      destination_raw: match.destination_raw,
      status: match.statusCode,
      external: match.external,
      simulated_vercel: true,
    });
    if (match.external) {
      pathToFetch = match.destination; // absolute URL
      externalRedirect = true;
      break;
    }
    pathToFetch = match.destination;
    // Subsequent simulated hops use the canonical host, since Vercel
    // would have already rewritten subdomain→path-prefix in the first hop.
    hostForMatch = 'prizma-optic.co.il';
  }
  const vercelMatch = vercelChain.length > 0 ? vercelChain[0] : null;

  // Step 2: fetch on localhost (only if the simulated chain landed on a
  // same-origin path; external redirects are final).
  const hops = [...vercelChain];
  let final_status;
  let final_path = pathToFetch;
  let chain_too_deep_local = false;
  if (externalRedirect) {
    final_status = vercelMatch ? vercelMatch.status : null;
    final_path = pathToFetch;
  } else {
    const fetched = await fetchStatus(pathToFetch, { maxHops: 5 });
    hops.push(...fetched.hops);
    final_status = fetched.final_status;
    final_path = fetched.final_path;
    chain_too_deep_local = fetched.chain_too_deep || false;
  }
  const redirect_hops = hops.filter(
    (h) => h.simulated_vercel || (h.status >= 300 && h.status < 400),
  ).length;

  let verdict;
  let reason;
  if (final_status === 200) {
    verdict = vercelMatch ? 'OK_301_REDIRECT' : 'OK_200';
  } else if (final_status === 410) {
    verdict = 'OK_410_INTENTIONAL';
  } else if (final_status === 404) {
    verdict = 'MISSING';
    reason = 'LOCAL_404';
  } else if (final_status === -1) {
    verdict = 'MISSING';
    reason = 'NETWORK_ERROR';
  } else if (final_status === null) {
    verdict = 'MISSING';
    reason = 'CHAIN_TOO_DEEP';
  } else if (final_status >= 500) {
    verdict = 'MISSING';
    reason = 'LOCAL_5XX_' + final_status;
  } else if (final_status >= 300 && final_status < 400 && fetched.external) {
    verdict = 'MISSING';
    reason = 'REDIRECTS_EXTERNAL';
  } else {
    verdict = 'MISSING';
    reason = 'UNEXPECTED_STATUS_' + final_status;
  }

  return {
    url: entry.url,
    clicks: entry.clicks,
    impressions: entry.impressions,
    ctr: entry.ctr,
    position: entry.position,
    host: rewrite.host,
    httpsInsecure: rewrite.httpsInsecure,
    www: rewrite.www,
    requestPath: rewrite.requestPath,
    pathToFetch,
    vercelMatch: vercelMatch
      ? {
          source: vercelMatch.matched_source,
          destination: vercelMatch.destination,
          destination_raw: vercelMatch.destination_raw,
          statusCode: vercelMatch.status,
        }
      : null,
    vercel_chain_length: vercelChain.length,
    external_redirect: externalRedirect,
    hops,
    redirect_hops,
    final_status,
    final_path,
    chain_too_deep: chain_too_deep_local,
    verdict,
    reason: reason || null,
  };
}

const limit = pLimit(10);
const t0 = Date.now();
let done = 0;
const results = await Promise.all(
  pages.map((p) =>
    limit(async () => {
      const r = await classifyEntry(p);
      done++;
      if (done % 50 === 0) {
        const rate = Math.round(done / ((Date.now() - t0) / 1000));
        console.error(`  ${done}/${pages.length}  (${rate}/s)`);
      }
      return r;
    }),
  ),
);

// Aggregate
const summary = {
  generated_at: new Date().toISOString(),
  total: results.length,
  verdicts: {},
  reasons: {},
  hosts: {},
  trailing_slash: { with: 0, without: 0 },
  https_insecure_count: 0,
  multi_hop_count: 0,
  chain_too_deep_count: 0,
};
for (const r of results) {
  summary.verdicts[r.verdict] = (summary.verdicts[r.verdict] || 0) + 1;
  if (r.reason) summary.reasons[r.reason] = (summary.reasons[r.reason] || 0) + 1;
  summary.hosts[r.host] = (summary.hosts[r.host] || 0) + 1;
  if (r.requestPath && r.requestPath.split('?')[0].endsWith('/')) summary.trailing_slash.with++;
  else summary.trailing_slash.without++;
  if (r.httpsInsecure) summary.https_insecure_count++;
  if (r.redirect_hops > 1) summary.multi_hop_count++;
  if (r.chain_too_deep) summary.chain_too_deep_count++;
}

writeFileSync(
  resolve(ARTIFACTS, 'redirect-coverage.json'),
  JSON.stringify({ summary, rules_loaded: redirectRules.length, entries: results }, null, 2),
);

// CSV too
const header = [
  'url',
  'clicks',
  'impressions',
  'ctr',
  'position',
  'host',
  'requestPath',
  'pathToFetch',
  'verdict',
  'reason',
  'final_status',
  'redirect_hops',
  'chain_too_deep',
  'vercel_source',
  'vercel_destination',
].join(',');
const csvLines = [header];
for (const r of results) {
  const row = [
    JSON.stringify(r.url),
    r.clicks,
    r.impressions,
    r.ctr ?? '',
    r.position ?? '',
    r.host,
    JSON.stringify(r.requestPath || ''),
    JSON.stringify(r.pathToFetch || ''),
    r.verdict,
    JSON.stringify(r.reason || ''),
    r.final_status ?? '',
    r.redirect_hops,
    r.chain_too_deep,
    JSON.stringify(r.vercelMatch?.source || ''),
    JSON.stringify(r.vercelMatch?.destination || ''),
  ].join(',');
  csvLines.push(row);
}
writeFileSync(resolve(ARTIFACTS, 'redirect-coverage.csv'), csvLines.join('\n'));

console.log('verdicts:', JSON.stringify(summary.verdicts));
console.log('reasons:', JSON.stringify(summary.reasons));
console.log('https_insecure:', summary.https_insecure_count);
console.log('multi_hop:', summary.multi_hop_count);
console.log('chain_too_deep:', summary.chain_too_deep_count);
console.log('done in', Math.round((Date.now() - t0) / 1000), 's');
