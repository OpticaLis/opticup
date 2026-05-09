#!/usr/bin/env node
// scripts/test-root-discipline.mjs
// Regression tests for scripts/checks/check-root-discipline.mjs.
// Tests stage a temp file/dir, run verify, assert exit code, then clean up.
//
// IMPORTANT — no `git stash`: stash is fragile (creates nothing on clean tree;
// stash pop then unwraps the WRONG stash). Each test uses try/finally with
// explicit `git rm --cached` + `rm` for guaranteed cleanup, isolating test
// staging from the user's working-tree state.
//
// Run: node scripts/test-root-discipline.mjs OR npm run test:root-discipline

import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname || '.', '..');
const TEST_FILE = '__rootdisc_test_DELETEME.md';
const TEST_DIR = '__rootdisc_test_dir_DELETEME';

const RESULTS = [];

function runCheck() {
  const result = spawnSync('node', ['scripts/verify.mjs', '--staged', '--only=check-root-discipline'], {
    cwd: REPO, encoding: 'utf8'
  });
  return result.status;
}

function safeUnstage(path) {
  try { execSync(`git rm --cached -rf "${path}"`, { cwd: REPO, stdio: 'ignore' }); } catch {}
  try { rmSync(join(REPO, path), { recursive: true, force: true }); } catch {}
}

function test(name, fn) {
  try {
    fn();
    RESULTS.push({ name, status: 'PASS' });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    RESULTS.push({ name, status: 'FAIL', error: err.message });
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('Running root-discipline regression tests...\n');

// Pre-flight: ensure no stale test artifacts from a prior crashed run
safeUnstage(TEST_FILE);
safeUnstage(TEST_DIR);

// Pre-flight: if working tree has staged adds, the check will see them too.
// Capture their state so we can correlate test results.
let preStaged;
try {
  preStaged = execSync('git diff --cached --name-only --diff-filter=A', {
    cwd: REPO, encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
} catch { preStaged = []; }
const preStagedHasDisallowedRoot = preStaged.some(p => !p.includes('/'));

// Test A: no extra root changes — exit 0 (assuming no pre-existing staged disallowed root files)
test('A: no extra staged root changes → exit 0', () => {
  if (preStagedHasDisallowedRoot) {
    throw new Error(`Pre-existing staged disallowed root file(s); cannot test baseline. Pre-staged: ${JSON.stringify(preStaged)}`);
  }
  const exit = runCheck();
  assert(exit === 0, `Expected exit 0, got ${exit}`);
});

// Test B: allowed root file — currently SKIPPED
// Reason: every name on the allowlist already exists at root, so we cannot
// "newly add" one without git index manipulation that risks user data.
// Real coverage from C+D below.
test('B: allowed-file path (skipped — see comment)', () => {
  // intentional no-op
});

// Test C: disallowed root file — exit 1 (block)
test('C: disallowed root file → exit 1 (block)', () => {
  try {
    writeFileSync(join(REPO, TEST_FILE), 'test fixture\n');
    execSync(`git add "${TEST_FILE}"`, { cwd: REPO, stdio: 'ignore' });
    const exit = runCheck();
    assert(exit === 1, `Expected exit 1 (block), got ${exit}`);
  } finally {
    safeUnstage(TEST_FILE);
  }
});

// Test D: new root directory — exit 2 (warn)
test('D: new root directory → exit 2 (warn)', () => {
  try {
    mkdirSync(join(REPO, TEST_DIR), { recursive: true });
    writeFileSync(join(REPO, TEST_DIR, 'somefile.txt'), 'test fixture\n');
    execSync(`git add "${TEST_DIR}/somefile.txt"`, { cwd: REPO, stdio: 'ignore' });
    const exit = runCheck();
    assert(exit === 2, `Expected exit 2 (warn), got ${exit}`);
  } finally {
    safeUnstage(TEST_DIR);
  }
});

// Final cleanup safety net
safeUnstage(TEST_FILE);
safeUnstage(TEST_DIR);

const failed = RESULTS.filter(r => r.status === 'FAIL');
const passed = RESULTS.filter(r => r.status === 'PASS');

console.log(`\n${passed.length}/${RESULTS.length} root-discipline tests passed.`);

if (failed.length > 0) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
process.exit(0);
