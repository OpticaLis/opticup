// lib/vercel-redirects.mjs — simulate vercel.json redirect resolution.
// Converts source patterns into RegExps and resolves destinations with
// parameter substitution. Honors `has` conditions (scoped to host).

import { readFileSync } from 'node:fs';

const CANONICAL_ORIGIN = 'https://prizma-optic.co.il';

export function compileSource(source) {
  const params = [];
  let re = '';
  const parts = source.split('/');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === '') {
      re += '/';
      continue;
    }
    const m = p.match(/^:([A-Za-z_][A-Za-z0-9_]*)(\*|\+)?$/);
    if (m) {
      const [, name, modifier] = m;
      params.push({ name, modifier: modifier || '' });
      if (modifier === '*') {
        if (re.endsWith('/')) re = re.slice(0, -1);
        re += '(?:\\/(.*))?';
      } else if (modifier === '+') {
        if (re.endsWith('/')) re = re.slice(0, -1);
        re += '\\/(.+)';
      } else {
        re += '([^/]+)';
      }
      if (i < parts.length - 1) re += '/';
    } else {
      re += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (i < parts.length - 1) re += '/';
    }
  }
  let pattern;
  if (source.endsWith('/')) {
    pattern = new RegExp('^' + re + '?$');
  } else {
    pattern = new RegExp('^' + re + '\\/?$');
  }
  return { regex: pattern, params };
}

export function loadVercelRedirects(vercelJsonPath) {
  const raw = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
  const rules = (raw.redirects || []).map((r) => {
    const hasHosts = Array.isArray(r.has)
      ? r.has.filter((h) => h.type === 'host').map((h) => h.value.toLowerCase())
      : [];
    return {
      source: r.source,
      destination: r.destination,
      statusCode: r.statusCode || (r.permanent ? 308 : 307),
      permanent: r.permanent === true || r.statusCode === 301,
      hasHosts, // empty = applies to any host
      ...compileSource(r.source),
    };
  });
  return rules;
}

// Normalize a destination into a local path suitable for GET on localhost:4321.
// Strips the canonical production origin if present; keeps query.
function destToLocalPath(dest) {
  if (!dest) return dest;
  if (dest.startsWith(CANONICAL_ORIGIN)) {
    const tail = dest.slice(CANONICAL_ORIGIN.length);
    return tail.startsWith('/') ? tail : '/' + tail;
  }
  if (/^https?:\/\//i.test(dest)) {
    // External redirect — leave as-is
    return dest;
  }
  return dest.startsWith('/') ? dest : '/' + dest;
}

// Apply a redirect rule's destination with parameter substitution.
function buildDestination(rule, paramMap) {
  let dest = rule.destination;
  for (const p of rule.params) {
    const tokenRe = new RegExp(
      ':' + p.name + (p.modifier === '*' ? '\\*' : p.modifier === '+' ? '\\+' : ''),
      'g',
    );
    dest = dest.replace(tokenRe, paramMap[p.name] || '');
  }
  // Collapse ONLY after the scheme part — don't touch "https://"
  let schemePart = '';
  let rest = dest;
  const m = dest.match(/^(https?:\/\/)(.*)$/i);
  if (m) {
    schemePart = m[1];
    rest = m[2];
  }
  rest = rest.replace(/\/{2,}/g, '/');
  return schemePart + rest;
}

// Match pathname against rules, filtering by incoming host.
// `hostHint` is one of "prizma-optic.co.il", "en.prizma-optic.co.il",
// "ru.prizma-optic.co.il", "www.prizma-optic.co.il". Empty-hasHosts rules apply
// regardless of host; rules with hasHosts only apply when hostHint matches.
export function matchRedirect(pathname, rules, hostHint) {
  const hostLower = (hostHint || '').toLowerCase();
  for (const rule of rules) {
    if (rule.hasHosts.length > 0 && !rule.hasHosts.includes(hostLower)) continue;
    const m = pathname.match(rule.regex);
    if (m) {
      const paramMap = {};
      rule.params.forEach((p, idx) => {
        paramMap[p.name] = m[idx + 1] ?? '';
      });
      const destRaw = buildDestination(rule, paramMap);
      const destLocal = destToLocalPath(destRaw);
      return {
        rule,
        destination_raw: destRaw,
        destination: destLocal,
        params: paramMap,
        statusCode: rule.statusCode,
        external: /^https?:\/\//i.test(destLocal),
      };
    }
  }
  return null;
}
