#!/usr/bin/env node
// snapshot.mjs — git-tag based pre-SPEC snapshot + rollback workflow.
//
// Owner: opticup-localhost-tester chain (Task 3 of safety infra, 2026-05-10).
// v1: git tag only. Supabase branch snapshot deferred — see TODO at bottom.
//
// Usage:
//   node scripts/snapshot.mjs create <SPEC_SLUG>
//     → creates tag pre-spec-{SLUG}-{ISO_TIMESTAMP}, logs to snapshots/log.json
//
//   node scripts/snapshot.mjs rollback <TAG>
//     → git reset --hard <TAG>; refuses if working tree is dirty unless --force
//
//   node scripts/snapshot.mjs list
//     → prints snapshots/log.json entries

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(__dirname);
const LOG_PATH = join(REPO_ROOT, 'snapshots', 'log.json');

function sh(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function readLog() {
  if (!existsSync(LOG_PATH)) return [];
  try { return JSON.parse(readFileSync(LOG_PATH, 'utf8')); } catch { return []; }
}

function writeLog(entries) {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2) + '\n');
}

function logAction(entry) {
  const log = readLog();
  log.push({ ...entry, at: new Date().toISOString() });
  writeLog(log);
}

function isWorkingTreeClean() {
  const out = sh('git status --porcelain');
  return out.length === 0;
}

function cmdCreate(slug) {
  if (!slug) { console.error('Usage: snapshot.mjs create <SPEC_SLUG>'); process.exit(2); }
  if (!isWorkingTreeClean()) {
    console.error('FAIL: working tree is dirty. Commit or stash before snapshotting.');
    process.exit(1);
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
  const tag = `pre-spec-${slug}-${ts}`;
  const head = sh('git rev-parse HEAD');
  sh(`git tag -a "${tag}" -m "Pre-SPEC snapshot for ${slug}"`);
  logAction({ action: 'create', tag, slug, head });
  console.log(`Created snapshot tag: ${tag}`);
  console.log(`HEAD: ${head}`);
  console.log(`To rollback: node scripts/snapshot.mjs rollback ${tag}`);
}

function cmdRollback(tag) {
  if (!tag) { console.error('Usage: snapshot.mjs rollback <TAG>'); process.exit(2); }
  // verify tag exists
  try { sh(`git rev-parse "${tag}"`); }
  catch { console.error(`FAIL: tag not found: ${tag}`); process.exit(1); }

  const force = process.argv.includes('--force');
  if (!isWorkingTreeClean() && !force) {
    console.error('FAIL: working tree is dirty. Commit/stash first, or pass --force.');
    process.exit(1);
  }
  const head = sh('git rev-parse HEAD');
  console.log(`Rolling back from ${head} to ${tag} (git reset --hard)...`);
  sh(`git reset --hard "${tag}"`);
  const newHead = sh('git rev-parse HEAD');
  logAction({ action: 'rollback', tag, from_head: head, to_head: newHead });
  console.log(`Rollback complete. HEAD now at ${newHead}.`);
}

function cmdList() {
  const log = readLog();
  if (!log.length) { console.log('(no snapshots yet)'); return; }
  for (const e of log) {
    console.log(`${e.at}  ${e.action.padEnd(8)}  ${e.tag || ''}  ${e.slug || ''}`);
  }
}

const [, , cmd, arg] = process.argv;
switch (cmd) {
  case 'create':   cmdCreate(arg); break;
  case 'rollback': cmdRollback(arg); break;
  case 'list':     cmdList(); break;
  default:
    console.error('Usage:');
    console.error('  snapshot.mjs create <SPEC_SLUG>');
    console.error('  snapshot.mjs rollback <TAG> [--force]');
    console.error('  snapshot.mjs list');
    process.exit(2);
}

// TODO (v2): Supabase branch snapshot integration.
// When MCP-Supabase create_branch becomes part of an automated SPEC flow,
// extend create() to also call mcp__claude_ai_Supabase__create_branch and
// store the branch_id in the log entry. rollback() would then call reset_branch.
// Deferred from v1 because Supabase branches are heavy resources and most
// SPECs do not need DB-level rollback (git tag suffices for code-only SPECs).
