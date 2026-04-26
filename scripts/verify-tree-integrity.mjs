#!/usr/bin/env node
// verify-tree-integrity.mjs — Iron Rule 31 whole-tree corruption gate.
// Source of truth: git status --porcelain -z + git ls-files -z (NEVER a raw
// filesystem walk — avoids autocrlf false positives).
//
// Checks:
//   - null-bytes (ERROR): any 0x00 in a text file is Cowork-VM-style corruption.
//   - trailing-newline (WARNING): source files that don't end with \n.
//     Warning-only because this repo has a number of legitimate files ending
//     without a trailing newline; tune up to ERROR after a repo-wide sweep.
//
// CRLF is NOT checked — core.autocrlf handles line endings per machine.
// Tail-regex and bracket-balance heuristics were considered and dropped per
// tuning pass 2026-04-24 (FINDING M4-GATE-TUNING-01): too noisy on real code.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const REPO = resolve(import.meta.dirname || '.', '..');
const SOURCE_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.astro', '.css', '.html', '.htm', '.sql']);
const TEXT_EXT = new Set([...SOURCE_EXT, '.md', '.json']);
const EXCLUDED_PREFIXES = ['node_modules/', '.git/', 'backups/', 'dist/', 'build/', '.husky/'];
const FAST_PATH_THRESHOLD = 500;
const CONCURRENCY = 32;

let red, yellow, green, gray, bold;
try {
  const chalk = await import('chalk');
  const c = chalk.default || chalk;
  red = c.red; yellow = c.yellow; green = c.green; gray = c.gray; bold = c.bold;
} catch {
  const id = s => s;
  red = id; yellow = id; green = id; gray = id; bold = id;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
verify-tree-integrity.mjs — whole-tree corruption gate (Iron Rule 31)

Usage: node scripts/verify-tree-integrity.mjs [flags] [files...]

Flags:
  --help, -h            Show this help
  --check-truncation    Run only the truncation check
  --check-null-bytes    Run only the null-byte check
  --all                 Force full file sweep (override auto-fast)
  --fast                Force fast path (porcelain-only file list)
  --verbose             Print per-file progress
  --quiet               Suppress clean-summary output

If paths are provided, only those paths are scanned (overrides git listing).
Source of truth: git status --porcelain + git ls-files (never filesystem walk).
CRLF is NOT checked — core.autocrlf handles per machine.

Exit codes: 0 = clean, 1 = null-byte ERROR, 2 = warnings only.
`);
  process.exit(0);
}

const onlyTruncation = args.includes('--check-truncation');
const onlyNullBytes = args.includes('--check-null-bytes');
const runTruncation = onlyTruncation || (!onlyTruncation && !onlyNullBytes);
const runNullBytes = onlyNullBytes || (!onlyTruncation && !onlyNullBytes);
const forceAll = args.includes('--all');
const forceFast = args.includes('--fast');
const verbose = args.includes('--verbose');
const quiet = args.includes('--quiet');
const explicitPaths = args.filter(a => !a.startsWith('--') && a !== '-h');

function getPorcelainFiles() {
  try {
    const out = execSync('git status --porcelain -z', { cwd: REPO, encoding: 'utf8' });
    const entries = out.split('\x00').filter(Boolean);
    const files = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const status = entry.slice(0, 2);
      const path = entry.slice(3);
      if (status[0] === 'R' || status[0] === 'C') i++; // rename: skip old path
      if (status[0] === 'D' || status[1] === 'D') continue;
      if (path) files.push(path);
    }
    return files;
  } catch { return []; }
}

function getLsFiles() {
  try {
    const out = execSync('git ls-files -z', { cwd: REPO, encoding: 'utf8' });
    return out.split('\x00').filter(Boolean);
  } catch { return []; }
}

function shouldCheck(path) {
  const lower = path.toLowerCase();
  for (const pref of EXCLUDED_PREFIXES) if (lower.startsWith(pref)) return false;
  const dot = lower.lastIndexOf('.');
  if (dot === -1) return false;
  return TEXT_EXT.has(lower.slice(dot));
}

let toCheck;
let mode;
if (explicitPaths.length > 0) {
  toCheck = explicitPaths.filter(shouldCheck);
  mode = 'explicit';
} else {
  const porcelain = new Set(getPorcelainFiles());
  const tracked = new Set(getLsFiles());
  const union = new Set([...porcelain, ...tracked]);
  const fullPool = [...union].filter(shouldCheck);
  const fastPool = [...porcelain].filter(shouldCheck);
  const useFast = forceFast || (!forceAll && fullPool.length > FAST_PATH_THRESHOLD);
  toCheck = useFast ? fastPool : fullPool;
  mode = useFast ? 'fast' : 'full';
  if (verbose) {
    console.log(gray(`tracked=${tracked.size}, porcelain=${porcelain.size}, pool=${fullPool.length}, checking=${toCheck.length}, mode=${mode}`));
  }
}

function checkNullBytes(buf, path) {
  const firstNul = buf.indexOf(0x00);
  if (firstNul === -1) return [];
  let count = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0x00) count++;
  return [{
    severity: 'error', check: 'null-bytes', path,
    message: `contains ${count} NUL byte${count === 1 ? '' : 's'} (first at offset ${firstNul}) — Cowork-VM-style padding; repair by truncating content at offset ${firstNul} and adding a trailing LF`,
  }];
}

function checkTruncation(buf, path) {
  if (buf.length === 0) return [];
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (!SOURCE_EXT.has(ext)) return [];
  const lastByte = buf[buf.length - 1];
  if (lastByte === 0x0A || lastByte === 0x0D) return [];
  return [{
    severity: 'warning', check: 'trailing-newline', path,
    message: `source file does not end with newline (last byte: 0x${lastByte.toString(16).padStart(2, '0')}) — possible mid-statement truncation (warning; legitimate in this repo for some files)`,
  }];
}

async function runChecksOn(path) {
  const abs = resolve(REPO, path);
  let buf;
  try { buf = await readFile(abs); } catch { return []; }
  const out = [];
  if (runNullBytes) out.push(...checkNullBytes(buf, path));
  if (runTruncation) out.push(...checkTruncation(buf, path));
  return out;
}

async function pool(items, worker) {
  const results = [];
  let idx = 0;
  async function one() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, one));
  return results.flat();
}

const start = Date.now();
const findings = await pool(toCheck, runChecksOn);
const elapsed = Date.now() - start;

const errors = findings.filter(f => f.severity === 'error');
const warnings = findings.filter(f => f.severity === 'warning');

for (const f of errors) console.log(`${red(`[${f.check}]`)} ${f.path} — ${f.message}`);
for (const f of warnings) console.log(`${yellow(`[${f.check}]`)} ${f.path} — ${f.message}`);

if (!quiet) {
  console.log('');
  if (errors.length === 0 && warnings.length === 0) {
    console.log(green(bold(`All clear — ${toCheck.length} files scanned in ${elapsed}ms (Iron Rule 31 gate)`)));
  } else if (errors.length > 0) {
    console.log(red(bold(`${errors.length} violations, ${warnings.length} warnings across ${toCheck.length} files (${elapsed}ms)`)));
  } else {
    console.log(yellow(bold(`0 violations, ${warnings.length} warnings across ${toCheck.length} files (${elapsed}ms)`)));
  }
}

if (errors.length > 0) process.exit(1);
if (warnings.length > 0) process.exit(2);
process.exit(0);
