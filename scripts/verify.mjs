#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname || '.');
const REPO = resolve(ROOT, '..');
const CHECKS_DIR = join(ROOT, 'checks');
const WALK_EXCLUDE = ['node_modules', '.git', 'backups', '.husky'];

// --- Arg parsing ---
const args = process.argv.slice(2);
const flagStaged = args.includes('--staged');
const flagFull = args.includes('--full');
const verbose = args.includes('--verbose');
const onlyFlag = args.find(a => a.startsWith('--only='));
const onlyCheck = onlyFlag ? onlyFlag.split('=')[1] : null;

// --- Chalk import (ESM) ---
let red, yellow, green, gray, bold;
try {
  const chalk = await import('chalk');
  const c = chalk.default || chalk;
  red = c.red; yellow = c.yellow; green = c.green; gray = c.gray; bold = c.bold;
} catch {
  const id = s => s;
  red = id; yellow = id; green = id; gray = id; bold = id;
}

// --- File list ---
async function walkDir(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch { return results; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (WALK_EXCLUDE.includes(entry.name)) continue;
      results.push(...await walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: REPO, encoding: 'utf8',
    });
    return out.trim().split('\n').filter(Boolean).map(f => resolve(REPO, f));
  } catch { return []; }
}

let files;
if (flagFull) {
  files = await walkDir(REPO);
} else {
  files = getStagedFiles();
}
// Normalize to relative paths for display, absolute for reading
files = files.map(f => resolve(f));

if (verbose) {
  console.log(gray(`Scanning ${files.length} files...\n`));
}

// --- Load checks ---
let checkEntries;
try {
  checkEntries = await readdir(CHECKS_DIR);
} catch {
  console.error(red('No checks directory found at scripts/checks/'));
  process.exit(1);
}
const checkModules = [];
for (const entry of checkEntries.filter(e => e.endsWith('.mjs'))) {
  const name = entry.replace('.mjs', '');
  if (onlyCheck && name !== onlyCheck) continue;
  const mod = await import(pathToFileURL(join(CHECKS_DIR, entry)).href);
  checkModules.push({ name, fn: mod.default });
}

// --- Run checks ---
let totalViolations = 0;
let totalWarnings = 0;
const allViolations = [];
const allWarnings = [];

for (const { name, fn } of checkModules) {
  const result = await fn(files, { verbose });
  for (const v of result.violations) {
    const rel = relative(REPO, v.path);
    allViolations.push(`${red(`[${v.check}]`)} ${rel}:${v.line} — ${v.message}`);
  }
  for (const w of result.warnings) {
    const rel = relative(REPO, w.path);
    allWarnings.push(`${yellow(`[${w.check}]`)} ${rel}:${w.line} — ${w.message}`);
  }
  totalViolations += result.violations.length;
  totalWarnings += result.warnings.length;
}

// --- Output ---
for (const v of allViolations) console.log(v);
for (const w of allWarnings) console.log(w);

console.log('');
if (totalViolations === 0 && totalWarnings === 0) {
  console.log(green(bold(`All clear — 0 violations, 0 warnings across ${files.length} files`)));
  process.exit(0);
} else if (totalViolations > 0) {
  console.log(red(bold(`${totalViolations} violations, ${totalWarnings} warnings across ${files.length} files`)));
  process.exit(1);
} else {
  // Warnings: exit 2 — informational, CI may treat as non-blocking via workflow config
  console.log(yellow(bold(`0 violations, ${totalWarnings} warnings across ${files.length} files`)));
  process.exit(2);
}
