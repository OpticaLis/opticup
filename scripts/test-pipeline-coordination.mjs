#!/usr/bin/env node
// scripts/test-pipeline-coordination.mjs
//
// Regression + E2E tests for scripts/pipeline-coordination.mjs.
// Built by PARALLEL_PIPELINE_COORDINATION SPEC (2026-05-17) per §3 criteria #4, #8, #9.
//
// Pattern follows scripts/test-root-discipline.mjs + test-destructive-ops-gate.mjs:
// try/finally cleanup, NO git stash, runs all locks created during test through
// safe-unstage on every exit path. Tests must NOT leave orphan locks for the
// user's next session.
//
// Run: node scripts/test-pipeline-coordination.mjs OR npm run test:pipeline-coordination

import { execSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname || '.', '..');
const SCRIPT = resolve(REPO, 'scripts/pipeline-coordination.mjs');
const LOCK_DIR = resolve(REPO, '_archive/pipeline-sessions');

const TEST_SLUG_PREFIX = '__test_PARALLEL_PIPELINE_COORDINATION_';

const RESULTS = [];

function run(...args) {
  const r = spawnSync('node', [SCRIPT, ...args], { cwd: REPO, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function cleanupTestLocks() {
  if (!existsSync(LOCK_DIR)) return;
  for (const f of readdirSync(LOCK_DIR)) {
    if (f.includes(TEST_SLUG_PREFIX)) {
      try { unlinkSync(join(LOCK_DIR, f)); } catch {}
    }
  }
}

function listTestLocks() {
  if (!existsSync(LOCK_DIR)) return [];
  return readdirSync(LOCK_DIR).filter(f => f.includes(TEST_SLUG_PREFIX));
}

function test(name, fn) {
  try {
    fn();
    RESULTS.push({ name, status: 'PASS' });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    RESULTS.push({ name, status: 'FAIL', error: err.message });
    console.error(`  FAIL  ${name}: ${err.message}`);
  } finally {
    cleanupTestLocks();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ---------- pre-flight ----------
console.log('pipeline-coordination — regression + E2E tests\n');
if (!existsSync(SCRIPT)) {
  console.error(`FATAL: script not found at ${SCRIPT}`);
  process.exit(1);
}
// Ensure clean starting state — defensive (a prior crashed test could leave locks)
if (!existsSync(LOCK_DIR)) mkdirSync(LOCK_DIR, { recursive: true });
cleanupTestLocks();
const preTestActiveLocks = listTestLocks();
if (preTestActiveLocks.length !== 0) {
  console.error(`FATAL: ${preTestActiveLocks.length} test locks remain after pre-flight cleanup: ${preTestActiveLocks.join(', ')}`);
  process.exit(1);
}

// ---------- unit tests ----------

test('U1: --help exits 0 and lists all 5 commands', () => {
  const r = run('--help');
  assert(r.status === 0, `expected exit 0, got ${r.status}`);
  for (const cmd of ['claim', 'release', 'check-collision', 'heartbeat', 'cleanup-stale']) {
    assert(r.stdout.includes(cmd), `--help output missing command: ${cmd}`);
  }
});

test('U2: claim writes a lock file with correct YAML shape', () => {
  const slug = `${TEST_SLUG_PREFIX}u2`;
  const r = run('claim', '--spec-slug', slug, '--branch-owned', 'test-branch-u2', '--files-owned-globs', 'foo/**,bar/baz.md', '--session-id', 'sid-u2');
  assert(r.status === 0, `claim exit ${r.status}: stderr=${r.stderr}`);
  const filename = r.stdout.trim();
  assert(filename.endsWith('.lock'), `expected .lock filename, got ${filename}`);
  const path = join(LOCK_DIR, filename);
  assert(existsSync(path), `lock file not on disk: ${path}`);
  const body = readFileSync(path, 'utf8');
  assert(body.includes(`spec_slug: ${slug}`), `missing spec_slug line`);
  assert(body.includes('branch_owned: test-branch-u2'), `missing branch_owned line`);
  assert(body.includes('  - foo/**'), `missing files_owned_globs entry foo/**`);
  assert(body.includes('  - bar/baz.md'), `missing files_owned_globs entry bar/baz.md`);
  assert(body.includes('pid_or_session_id: sid-u2'), `missing pid_or_session_id`);
  assert(/last_heartbeat: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(body), `missing/malformed last_heartbeat`);
});

test('U3: release deletes own lock', () => {
  const slug = `${TEST_SLUG_PREFIX}u3`;
  const c = run('claim', '--spec-slug', slug, '--branch-owned', 'test-branch-u3', '--files-owned-globs', 'qux/**', '--session-id', 'sid-u3');
  assert(c.status === 0, `pre-claim failed: ${c.stderr}`);
  const beforeCount = listTestLocks().length;
  const r = run('release', '--spec-slug', slug, '--session-id', 'sid-u3');
  assert(r.status === 0, `release exit ${r.status}: ${r.stderr}`);
  const afterCount = listTestLocks().length;
  assert(afterCount === beforeCount - 1, `expected ${beforeCount - 1} locks after release, got ${afterCount}`);
  assert(r.stdout.includes('released 1'), `expected "released 1" in stdout, got ${r.stdout}`);
});

test('U4: heartbeat bumps last_heartbeat timestamp', () => {
  const slug = `${TEST_SLUG_PREFIX}u4`;
  const c = run('claim', '--spec-slug', slug, '--branch-owned', 'test-branch-u4', '--files-owned-globs', 'quux/**', '--session-id', 'sid-u4');
  assert(c.status === 0, `pre-claim failed: ${c.stderr}`);
  const filename = c.stdout.trim();
  const path = join(LOCK_DIR, filename);
  const before = readFileSync(path, 'utf8').match(/last_heartbeat: (.+)/)[1].trim();
  // small wait to ensure timestamp differs
  const t0 = Date.now(); while (Date.now() - t0 < 30) {}
  const r = run('heartbeat', '--spec-slug', slug, '--session-id', 'sid-u4');
  assert(r.status === 0, `heartbeat exit ${r.status}: ${r.stderr}`);
  assert(r.stdout.includes('heartbeat-bumped 1'), `expected "heartbeat-bumped 1", got ${r.stdout}`);
  const after = readFileSync(path, 'utf8').match(/last_heartbeat: (.+)/)[1].trim();
  assert(after !== before, `heartbeat did not change timestamp (before=after=${before})`);
  assert(new Date(after).getTime() > new Date(before).getTime(), `heartbeat went backwards`);
});

test('U5: cleanup-stale deletes stale locks + writes audit log', () => {
  // Plant a lock with an old heartbeat by writing it directly.
  const slug = `${TEST_SLUG_PREFIX}u5`;
  const oldTs = new Date(Date.now() - 11 * 60 * 1000).toISOString(); // 11 min ago
  const filename = `2026-01-01T00-00-00-000Z_${slug}_sid-u5.lock`;
  const path = join(LOCK_DIR, filename);
  writeFileSync(path, [
    `spec_slug: ${slug}`,
    `branch_started_on: test-branch-u5`,
    `branch_owned: test-branch-u5`,
    `files_owned_globs:`,
    `  - corge/**`,
    `last_heartbeat: ${oldTs}`,
    `pid_or_session_id: sid-u5`,
    '',
  ].join('\n'), 'utf8');
  assert(existsSync(path), 'planted lock missing');
  const r = run('cleanup-stale');
  assert(r.status === 0, `cleanup-stale exit ${r.status}: ${r.stderr}`);
  assert(r.stdout.includes('stale-deleted'), `expected "stale-deleted" in stdout, got ${r.stdout}`);
  assert(!existsSync(path), 'stale lock not deleted');
  // audit log entry
  const today = new Date().toISOString().slice(0, 10);
  const auditPath = join(LOCK_DIR, `stale-cleanup-${today}.log`);
  assert(existsSync(auditPath), `audit log not created at ${auditPath}`);
  const auditBody = readFileSync(auditPath, 'utf8');
  assert(auditBody.includes(filename), `audit log missing deleted lock filename`);
  assert(auditBody.includes('reason=heartbeat-stale'), `audit log missing reason`);
  // cleanup audit log file too (it has our test marker)
  try { unlinkSync(auditPath); } catch {}
});

test('U6: claim with collision exits 1 and prints blocking lock info', () => {
  const slugA = `${TEST_SLUG_PREFIX}u6_a`;
  const slugB = `${TEST_SLUG_PREFIX}u6_b`;
  const c = run('claim', '--spec-slug', slugA, '--branch-owned', 'shared-branch-u6', '--files-owned-globs', 'grault/**', '--session-id', 'sid-u6-a');
  assert(c.status === 0, `pre-claim A failed: ${c.stderr}`);
  const r = run('claim', '--spec-slug', slugB, '--branch-owned', 'shared-branch-u6', '--files-owned-globs', 'garply/**', '--session-id', 'sid-u6-b');
  assert(r.status === 1, `expected collision exit 1, got ${r.status} (stdout=${r.stdout}, stderr=${r.stderr})`);
  assert(r.stderr.includes('COLLISION'), `expected COLLISION in stderr, got: ${r.stderr}`);
  assert(r.stderr.includes(slugA), `expected blocking spec_slug ${slugA} in stderr, got: ${r.stderr}`);
});

// ---------- E2E tests (per SPEC §3 criteria #8 + #9) ----------

test('E2E-1: concurrent different-branch sessions both proceed', () => {
  const slugA = `${TEST_SLUG_PREFIX}e2e1_a`;
  const slugB = `${TEST_SLUG_PREFIX}e2e1_b`;
  const a = run('claim', '--spec-slug', slugA, '--branch-owned', 'branch-A-e2e1', '--files-owned-globs', 'modA/**', '--session-id', 'sid-e2e1-a');
  assert(a.status === 0, `session A claim failed: ${a.stderr}`);
  const b = run('claim', '--spec-slug', slugB, '--branch-owned', 'branch-B-e2e1', '--files-owned-globs', 'modB/**', '--session-id', 'sid-e2e1-b');
  assert(b.status === 0, `session B claim failed: ${b.stderr}`);
  // both can run check-collision against their own scope and pass
  const aChk = run('check-collision', '--branch-owned', 'branch-A-e2e1', '--files-owned-globs', 'modA/**', '--session-id', 'sid-e2e1-a');
  assert(aChk.status === 0, `session A check-collision failed: ${aChk.stderr}`);
  const bChk = run('check-collision', '--branch-owned', 'branch-B-e2e1', '--files-owned-globs', 'modB/**', '--session-id', 'sid-e2e1-b');
  assert(bChk.status === 0, `session B check-collision failed: ${bChk.stderr}`);
});

test('E2E-2: concurrent same-branch sessions: second halts + escalates', () => {
  const slugA = `${TEST_SLUG_PREFIX}e2e2_a`;
  const slugB = `${TEST_SLUG_PREFIX}e2e2_b`;
  // session A claims branch
  const a = run('claim', '--spec-slug', slugA, '--branch-owned', 'shared-branch-e2e2', '--files-owned-globs', 'modA/**', '--session-id', 'sid-e2e2-a');
  assert(a.status === 0, `session A claim failed: ${a.stderr}`);
  // session B attempts claim on same branch — must HALT (exit 1)
  const b = run('claim', '--spec-slug', slugB, '--branch-owned', 'shared-branch-e2e2', '--files-owned-globs', 'modB/**', '--session-id', 'sid-e2e2-b');
  assert(b.status === 1, `session B should have halted, got exit ${b.status}`);
  assert(b.stderr.includes('COLLISION'), `session B stderr missing COLLISION: ${b.stderr}`);
  assert(b.stderr.includes('branch shared-branch-e2e2'), `session B stderr should name the colliding branch: ${b.stderr}`);
  // simulate that B writes its escalation file (the SPEC §13 protocol fires here)
  // we don't actually write the file in the test; instead we verify that B has
  // the exact information it needs to write one: blocking lock's spec_slug + pid.
  assert(b.stderr.includes(slugA), `session B stderr should name blocking spec_slug ${slugA}: ${b.stderr}`);
  assert(b.stderr.includes('sid-e2e2-a'), `session B stderr should name blocking pid sid-e2e2-a: ${b.stderr}`);
  // verify session B did NOT silently create a lock anyway
  const remaining = listTestLocks().filter(f => f.includes('e2e2_b'));
  assert(remaining.length === 0, `session B should have created NO lock; found ${remaining.length}: ${remaining.join(', ')}`);
});

// ---------- final cleanup ----------
cleanupTestLocks();
const finalLeftover = listTestLocks();
if (finalLeftover.length > 0) {
  console.error(`\nFATAL: ${finalLeftover.length} test locks remain after all tests: ${finalLeftover.join(', ')}`);
  process.exit(1);
}

const failed = RESULTS.filter(r => r.status === 'FAIL');
const passed = RESULTS.filter(r => r.status === 'PASS');
console.log(`\n${passed.length}/${RESULTS.length} pipeline-coordination tests passed.`);
if (failed.length > 0) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
process.exit(0);
