#!/usr/bin/env node
// scripts/pipeline-coordination.mjs
//
// Parallel Pipeline Coordination Protocol — file-system mediated session locks.
// Built by PARALLEL_PIPELINE_COORDINATION SPEC (2026-05-17) per Brief §3.
//
// 5 sub-commands:
//   claim            — write own lock; exit 1 if a collision exists
//   release          — delete own lock cleanly at session end
//   check-collision  — read all active locks; exit 1 if collision detected
//   heartbeat        — bump own lock's last_heartbeat timestamp
//   cleanup-stale    — delete locks whose heartbeat is older than STALE_MIN
//                      (with audit log entry)
//
// Lock file format (YAML inside _archive/pipeline-sessions/*.lock):
//   spec_slug: <string>
//   branch_started_on: <git-branch-at-claim>
//   branch_owned: <branch-this-session-must-stay-on>
//   files_owned_globs:
//     - <glob1>
//     - <glob2>
//   last_heartbeat: <ISO_TS>
//   pid_or_session_id: <string>
//
// Thresholds per Brief §3.4:
//   ACTIVE_MIN = 5  — heartbeat within last 5 minutes = active lock
//   STALE_MIN  = 10 — older than 10 minutes = may be cleaned by any session
//
// No deps outside Node built-ins. No daemon. No background process.
// Every collision halts + escalates per Brief §4.

import { readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync, appendFileSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const REPO = resolve(import.meta.dirname || '.', '..');
const LOCK_DIR = join(REPO, '_archive', 'pipeline-sessions');

const ACTIVE_MIN = 5;
const STALE_MIN = 10;

// ---------- arg parsing ----------
function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { args[key] = true; i++; }
      else { args[key] = next; i += 2; }
    } else { i++; }
  }
  return args;
}

function printHelp() {
  console.log(`pipeline-coordination — session-lock protocol (Brief §3, ${basename(import.meta.url)})

Commands:
  claim --spec-slug <S> --branch-owned <B> --files-owned-globs <G1,G2,...> [--session-id <ID>]
    Claim a session lock. Exits 1 on collision; prints lock filename on success.

  release --spec-slug <S> [--session-id <ID>]
    Delete this session's lock. Idempotent (no-op if lock already gone).

  check-collision --branch-owned <B> --files-owned-globs <G1,G2,...> [--session-id <ID>]
    Read all active locks; exit 1 if another session owns the branch
    or has overlapping file globs. Updates own heartbeat if a self-lock exists.

  heartbeat --spec-slug <S> [--session-id <ID>]
    Bump own lock's last_heartbeat. No-op if no self-lock.

  cleanup-stale
    Delete locks older than ${STALE_MIN} minutes. Writes audit log entry.

  --help
    Print this help and exit 0.

Thresholds: ACTIVE_MIN=${ACTIVE_MIN}m, STALE_MIN=${STALE_MIN}m (Brief §3.4).
`);
}

// ---------- lock file io (tiny YAML — Brief §3.1 shape, fixed schema) ----------
function ensureLockDir() {
  if (!existsSync(LOCK_DIR)) mkdirSync(LOCK_DIR, { recursive: true });
}

function readLockFile(path) {
  const text = readFileSync(path, 'utf8');
  const out = { files_owned_globs: [] };
  let inGlobs = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    if (inGlobs && line.startsWith('  - ')) { out.files_owned_globs.push(line.slice(4).trim()); continue; }
    inGlobs = false;
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === 'files_owned_globs') { inGlobs = true; continue; }
    out[k] = v.trim();
  }
  return out;
}

function writeLockFile(path, lock) {
  const lines = [
    `spec_slug: ${lock.spec_slug}`,
    `branch_started_on: ${lock.branch_started_on}`,
    `branch_owned: ${lock.branch_owned}`,
    `files_owned_globs:`,
    ...lock.files_owned_globs.map(g => `  - ${g}`),
    `last_heartbeat: ${lock.last_heartbeat}`,
    `pid_or_session_id: ${lock.pid_or_session_id}`,
    '',
  ];
  writeFileSync(path, lines.join('\n'), 'utf8');
}

function listLockFiles() {
  ensureLockDir();
  return readdirSync(LOCK_DIR)
    .filter(f => f.endsWith('.lock'))
    .map(f => join(LOCK_DIR, f));
}

// ---------- helpers ----------
function nowIso() { return new Date().toISOString(); }

function tsForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function minutesSince(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return Infinity;
  return (Date.now() - t) / 60000;
}

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO, encoding: 'utf8' }).trim();
  } catch { return '<no-git>'; }
}

function sessionIdFromArgs(args) {
  return args['session-id'] || `pid-${process.pid}-${randomBytes(4).toString('hex')}`;
}

function parseGlobs(s) {
  if (!s || s === true) return [];
  return s.split(',').map(g => g.trim()).filter(Boolean);
}

// Crude glob overlap — both sides as prefix-style globs (`foo/**`, `bar/*.md`).
// Conservative: if either glob's literal prefix (chars before first wildcard)
// is a prefix of the other's literal prefix, treat as overlapping. Brief §3.2
// requires escalation on overlap, not surgical containment — false positives
// are acceptable (they escalate to Daniel); false negatives are not.
function globsOverlap(a, b) {
  const prefix = g => {
    const idx = g.search(/[*?[]/);
    return idx === -1 ? g : g.slice(0, idx);
  };
  const pa = prefix(a);
  const pb = prefix(b);
  if (!pa || !pb) return true;
  return pa.startsWith(pb) || pb.startsWith(pa);
}

// ---------- commands ----------
function cmdClaim(args) {
  const spec_slug = args['spec-slug'];
  const branch_owned = args['branch-owned'] || currentBranch();
  const files_owned_globs = parseGlobs(args['files-owned-globs']);
  const session_id = sessionIdFromArgs(args);
  if (!spec_slug) { console.error('claim: --spec-slug required'); process.exit(1); }
  ensureLockDir();

  // collision check BEFORE writing own lock
  const collision = detectCollision({ branch_owned, files_owned_globs, session_id, spec_slug });
  if (collision) {
    console.error(`claim: COLLISION — ${collision.reason}`);
    console.error(`  blocking-lock: ${collision.path}`);
    console.error(`  spec_slug=${collision.lock.spec_slug} branch_owned=${collision.lock.branch_owned} pid=${collision.lock.pid_or_session_id}`);
    process.exit(1);
  }

  const filename = `${tsForFilename()}_${spec_slug}_${session_id}.lock`;
  const path = join(LOCK_DIR, filename);
  writeLockFile(path, {
    spec_slug,
    branch_started_on: currentBranch(),
    branch_owned,
    files_owned_globs,
    last_heartbeat: nowIso(),
    pid_or_session_id: session_id,
  });
  console.log(filename);
  process.exit(0);
}

function cmdRelease(args) {
  const spec_slug = args['spec-slug'];
  const session_id = args['session-id'];
  if (!spec_slug) { console.error('release: --spec-slug required'); process.exit(1); }
  ensureLockDir();
  let removed = 0;
  for (const path of listLockFiles()) {
    let lock; try { lock = readLockFile(path); } catch { continue; }
    if (lock.spec_slug !== spec_slug) continue;
    if (session_id && lock.pid_or_session_id !== session_id) continue;
    unlinkSync(path); removed++;
  }
  console.log(`released ${removed}`);
  process.exit(0);
}

function cmdCheckCollision(args) {
  const branch_owned = args['branch-owned'] || currentBranch();
  const files_owned_globs = parseGlobs(args['files-owned-globs']);
  const session_id = args['session-id'];
  const spec_slug = args['spec-slug'];
  ensureLockDir();
  // self-heartbeat bump (if a lock matches this session)
  if (session_id || spec_slug) {
    for (const path of listLockFiles()) {
      let lock; try { lock = readLockFile(path); } catch { continue; }
      const selfBySid = session_id && lock.pid_or_session_id === session_id;
      const selfBySlug = !session_id && spec_slug && lock.spec_slug === spec_slug;
      if (selfBySid || selfBySlug) {
        lock.last_heartbeat = nowIso();
        writeLockFile(path, lock);
      }
    }
  }
  const collision = detectCollision({ branch_owned, files_owned_globs, session_id, spec_slug });
  if (collision) {
    console.error(`check-collision: COLLISION — ${collision.reason}`);
    console.error(`  blocking-lock: ${collision.path}`);
    console.error(`  spec_slug=${collision.lock.spec_slug} branch_owned=${collision.lock.branch_owned} pid=${collision.lock.pid_or_session_id}`);
    process.exit(1);
  }
  console.log('no collision');
  process.exit(0);
}

function cmdHeartbeat(args) {
  const spec_slug = args['spec-slug'];
  const session_id = args['session-id'];
  if (!spec_slug && !session_id) { console.error('heartbeat: --spec-slug or --session-id required'); process.exit(1); }
  ensureLockDir();
  let bumped = 0;
  for (const path of listLockFiles()) {
    let lock; try { lock = readLockFile(path); } catch { continue; }
    const match = (spec_slug && lock.spec_slug === spec_slug) || (session_id && lock.pid_or_session_id === session_id);
    if (!match) continue;
    lock.last_heartbeat = nowIso();
    writeLockFile(path, lock);
    bumped++;
  }
  console.log(`heartbeat-bumped ${bumped}`);
  process.exit(0);
}

function cmdCleanupStale() {
  ensureLockDir();
  const deleterId = `cleanup-${process.pid}-${randomBytes(2).toString('hex')}`;
  const logPath = join(LOCK_DIR, `stale-cleanup-${new Date().toISOString().slice(0, 10)}.log`);
  let deleted = 0;
  for (const path of listLockFiles()) {
    let lock; try { lock = readLockFile(path); } catch { continue; }
    const ageMin = minutesSince(lock.last_heartbeat);
    if (ageMin <= STALE_MIN) continue;
    const lastHb = lock.last_heartbeat;
    unlinkSync(path);
    appendFileSync(logPath, `${nowIso()} deleted-by=${deleterId} stale-lock=${basename(path)} last-heartbeat=${lastHb} reason=heartbeat-stale\n`, 'utf8');
    deleted++;
  }
  console.log(`stale-deleted ${deleted}`);
  process.exit(0);
}

// ---------- collision detection ----------
function detectCollision({ branch_owned, files_owned_globs, session_id, spec_slug }) {
  for (const path of listLockFiles()) {
    let lock; try { lock = readLockFile(path); } catch { continue; }
    const ageMin = minutesSince(lock.last_heartbeat);
    if (ageMin > ACTIVE_MIN) continue;
    // self-lock skip
    if (session_id && lock.pid_or_session_id === session_id) continue;
    if (!session_id && spec_slug && lock.spec_slug === spec_slug) continue;
    // branch collision (Brief §3.3 — one Pipeline per branch)
    if (lock.branch_owned === branch_owned) {
      return { path, lock, reason: `branch ${branch_owned} already owned by spec_slug=${lock.spec_slug}` };
    }
    // file glob overlap (Brief §3.2)
    for (const mine of files_owned_globs) {
      for (const theirs of (lock.files_owned_globs || [])) {
        if (globsOverlap(mine, theirs)) {
          return { path, lock, reason: `files-owned-globs overlap: mine=${mine} theirs=${theirs}` };
        }
      }
    }
  }
  return null;
}

// ---------- entry ----------
const argv = process.argv.slice(2);
const [cmd, ...rest] = argv;
const args = parseArgs(rest);

if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') { printHelp(); process.exit(0); }

switch (cmd) {
  case 'claim': cmdClaim(args); break;
  case 'release': cmdRelease(args); break;
  case 'check-collision': cmdCheckCollision(args); break;
  case 'heartbeat': cmdHeartbeat(args); break;
  case 'cleanup-stale': cmdCleanupStale(); break;
  default:
    console.error(`unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
}
