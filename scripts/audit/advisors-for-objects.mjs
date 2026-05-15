#!/usr/bin/env node
// advisors-for-objects.mjs
//
// Filter a Supabase MCP advisors JSON dump for HIGH-severity findings that
// match a caller-supplied list of object names (tables, functions, views,
// policies, etc.). Designed as the post-DDL Pipeline verification gate so
// the Executor can replace ad-hoc subagent greps over 100KB+ advisor JSON
// with a single exit-code-bearing command.
//
// Usage:
//   node scripts/audit/advisors-for-objects.mjs --advisors-json <path> <name1> [<name2> ...]
//   node scripts/audit/advisors-for-objects.mjs --help
//
// Inputs:
//   --advisors-json <path>  Path to a JSON file holding the MCP get_advisors
//                           output (security or performance). Either the raw
//                           top-level object with a `lints` array, or an
//                           array, is accepted.
//   <name1> ...             One or more positional object names to filter
//                           against. A finding matches an object name if any
//                           of these fields case-insensitively CONTAIN the
//                           name: metadata.name, metadata.table,
//                           metadata.function, metadata.schema_name,
//                           description, detail, title, name, cache_key.
//
// Severity filter:
//   The script treats these `level` values as HIGH and triggers a non-zero
//   exit on match: ERROR, HIGH, CRITICAL. Case-insensitive. WARN / INFO /
//   anything else is ignored.
//
// Exit codes:
//   0   OK — no HIGH advisor matches any of the named objects (or the
//       advisor dump had zero HIGH entries to begin with).
//   1   HIGH advisor finding matched a named object. Matching rows are
//       printed to stdout in human-readable form.
//   2   Usage error — missing required arg, file not found, malformed JSON,
//       or no positional object names supplied. Error message goes to
//       stderr.
//
// Iron Rule 23 (no secrets): the script reads only a JSON file path and
// positional names. No env vars, no credentials, no network calls.
//
// Reference: documented in `.claude/skills/opticup-executor/SKILL.md`
// §"Verification After Changes" and §"SQL Autonomy Levels" / Level 1.
// Promoted from M1B0_PURCHASE_ORDER_SCHEMA FOREMAN_REVIEW §7 Proposal 2
// (2026-05-15) via M1_SKILL_IMPROVEMENT_HARVEST SPEC.

import { readFile } from 'node:fs/promises';
import { argv, stderr, stdout, exit } from 'node:process';

const HIGH_LEVELS = new Set(['ERROR', 'HIGH', 'CRITICAL']);

const USAGE = `Usage: node scripts/audit/advisors-for-objects.mjs --advisors-json <path> <name1> [<name2> ...]

Filters a Supabase MCP advisors JSON dump for HIGH-severity findings
(level=ERROR / HIGH / CRITICAL) that match any of the positional object
names. Match is case-insensitive substring over advisor metadata + text.

Options:
  --advisors-json <path>  Path to JSON file with MCP get_advisors output.
  --help                  Show this usage and exit 0.

Exit codes:
  0  No HIGH match on any named object.
  1  At least one HIGH advisor matched a named object. Matches printed.
  2  Usage error (missing flag / file / names; malformed JSON).
`;

function printUsage(toStderr = false) {
  (toStderr ? stderr : stdout).write(USAGE);
}

function parseArgs(args) {
  const opts = { advisorsJson: null, names: [], help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      opts.help = true;
    } else if (a === '--advisors-json') {
      opts.advisorsJson = args[++i] ?? null;
    } else if (a.startsWith('--')) {
      stderr.write(`Unknown flag: ${a}\n`);
      return null;
    } else {
      opts.names.push(a);
    }
  }
  return opts;
}

function extractLints(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.lints)) return parsed.lints;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (Array.isArray(parsed.findings)) return parsed.findings;
  }
  return null;
}

function isHigh(lint) {
  const level = String(lint?.level ?? '').toUpperCase();
  return HIGH_LEVELS.has(level);
}

function lintHaystack(lint) {
  const md = lint?.metadata ?? {};
  return [
    md.name,
    md.table,
    md.function,
    md.view,
    md.policy,
    md.schema_name,
    md.schema,
    md.type,
    lint?.name,
    lint?.title,
    lint?.description,
    lint?.detail,
    lint?.cache_key,
  ]
    .filter((v) => typeof v === 'string' && v.length > 0)
    .join('\n')
    .toLowerCase();
}

function matchAny(haystack, names) {
  for (const n of names) {
    if (haystack.includes(n.toLowerCase())) return n;
  }
  return null;
}

function formatLint(lint, matchedName) {
  const md = lint?.metadata ?? {};
  const objName = md.name ?? md.table ?? md.function ?? lint?.name ?? '<unknown>';
  const level = String(lint?.level ?? '?').toUpperCase();
  const title = lint?.title ?? lint?.name ?? '<no title>';
  const detail = (lint?.detail ?? lint?.description ?? '').toString().slice(0, 200);
  return `[${level}] matched "${matchedName}" on ${objName} — ${title}\n        ${detail}`;
}

async function main() {
  const args = argv.slice(2);
  const opts = parseArgs(args);
  if (opts === null) {
    printUsage(true);
    exit(2);
  }
  if (opts.help) {
    printUsage(false);
    exit(0);
  }
  if (!opts.advisorsJson) {
    stderr.write('Error: --advisors-json <path> is required.\n');
    printUsage(true);
    exit(2);
  }
  if (opts.names.length === 0) {
    stderr.write('Error: at least one positional object name is required.\n');
    printUsage(true);
    exit(2);
  }

  let raw;
  try {
    raw = await readFile(opts.advisorsJson, 'utf8');
  } catch (err) {
    stderr.write(`Error: cannot read ${opts.advisorsJson}: ${err.message}\n`);
    exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    stderr.write(`Error: malformed JSON in ${opts.advisorsJson}: ${err.message}\n`);
    exit(2);
  }

  const lints = extractLints(parsed);
  if (!lints) {
    stderr.write(
      `Error: cannot find a lints/data/findings array in the JSON; structure not recognized.\n`,
    );
    exit(2);
  }

  const hits = [];
  for (const lint of lints) {
    if (!isHigh(lint)) continue;
    const matched = matchAny(lintHaystack(lint), opts.names);
    if (matched) hits.push({ lint, matched });
  }

  if (hits.length === 0) {
    stdout.write(
      `advisors-for-objects: 0 HIGH matches across ${opts.names.length} named objects ` +
        `(${lints.length} advisor entries scanned).\n`,
    );
    exit(0);
  }

  stdout.write(`advisors-for-objects: ${hits.length} HIGH match(es):\n`);
  for (const h of hits) stdout.write('  ' + formatLint(h.lint, h.matched) + '\n');
  exit(1);
}

main().catch((err) => {
  stderr.write(`Unexpected error: ${err.stack || err.message || err}\n`);
  exit(2);
});
