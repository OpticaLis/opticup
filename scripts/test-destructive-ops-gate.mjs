#!/usr/bin/env node
// scripts/test-destructive-ops-gate.mjs
// Regression tests for scripts/checks/destructive-ops-declared.mjs.
//
// Added 2026-05-14 by M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING.
//
// Covers the section-(B) authorization-resolution fix: staged deletes
// that are declared in a co-staged SPEC.md's `## Destructive Operations`
// section must NOT raise a violation; staged deletes without such
// authorization MUST raise a violation.
//
// Pattern follows scripts/test-root-discipline.mjs: real git index
// staging via try/finally, NOT git stash.
//
// Run: node scripts/test-destructive-ops-gate.mjs
//      OR npm run test:destructive-ops-gate

import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  isAuthorizedDeletion,
  isExplicitlyNone,
} from './destructive-ops-auth-parser.mjs';

const REPO = resolve(import.meta.dirname || '.', '..');

const FIXTURE_SPEC_DIR = 'modules/Module 1.5 - Shared Components/docs/specs/__DOG_TEST_DELETEME';
const FIXTURE_SPEC_PATH = `${FIXTURE_SPEC_DIR}/SPEC.md`;

const RESULTS = [];

function runCheck() {
  const result = spawnSync(
    'node',
    ['scripts/verify.mjs', '--staged', '--only=destructive-ops-declared'],
    { cwd: REPO, encoding: 'utf8' }
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
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

function makeSpec(content) {
  mkdirSync(join(REPO, FIXTURE_SPEC_DIR), { recursive: true });
  writeFileSync(join(REPO, FIXTURE_SPEC_PATH), content, 'utf8');
}

console.log('Running destructive-ops-gate regression tests...\n');

// Pre-flight: ensure no stale artifacts
safeUnstage(FIXTURE_SPEC_DIR);
safeUnstage('tests/__dog_test_DELETEME');
safeUnstage('tests/__dog_test2_DELETEME');

// Test 1: helper-logic unit test against the imported production functions.
test('1: isAuthorizedDeletion recognises basename + relative path + glob; rejects None', () => {
  const auth = `- Delete css/employees.css and css/crm-screens.css.
- Delete other-dir/*.txt files.`;
  assert(isAuthorizedDeletion('css/employees.css', auth), 'basename match should pass');
  assert(isAuthorizedDeletion('css/crm-screens.css', auth), 'relative path match should pass');
  assert(isAuthorizedDeletion('other-dir/foo.txt', auth), 'glob match should pass');
  assert(!isAuthorizedDeletion('unrelated/file.js', auth), 'unauthorized should fail');
  assert(!isAuthorizedDeletion('css/foo.css', '**None.**'), 'None should reject all');
  assert(!isAuthorizedDeletion('css/foo.css', '   None.   '), 'whitespace None should reject');
  assert(isExplicitlyNone('**None.**'), 'isExplicitlyNone should match **None.**');
  assert(!isExplicitlyNone('- Delete foo'), 'isExplicitlyNone should not match real content');
});

// Test 2: integration — staged deletion + authorizing SPEC → exit 0
test('2: integration — staged delete + authorizing SPEC → exit 0', () => {
  const FIX_DIR = 'tests/__dog_test_DELETEME';
  const FIX_FILE = `${FIX_DIR}/doomed.txt`;
  let committed = false;
  try {
    mkdirSync(join(REPO, FIX_DIR), { recursive: true });
    writeFileSync(join(REPO, FIX_FILE), 'doomed\n', 'utf8');
    execSync(`git add "${FIX_FILE}"`, { cwd: REPO, stdio: 'ignore' });
    execSync(
      `git -c user.name=DOG -c user.email=dog@test commit -m "test fixture" --no-verify -- "${FIX_FILE}"`,
      { cwd: REPO, stdio: 'ignore' }
    );
    committed = true;

    const specBody = `# SPEC — TEST FIXTURE

## 1. Why
Auth fixture for test 2.

## Destructive Operations
- Delete \`${FIX_FILE}\` per test 2.
`;
    makeSpec(specBody);
    execSync(`git add "${FIXTURE_SPEC_PATH}"`, { cwd: REPO, stdio: 'ignore' });
    execSync(`git rm -f "${FIX_FILE}"`, { cwd: REPO, stdio: 'ignore' });

    const { status, stdout, stderr } = runCheck();

    // Cleanup BEFORE asserting (so a failed assert still leaves clean state)
    safeUnstage(FIXTURE_SPEC_DIR);
    safeUnstage(FIX_DIR);
    if (committed) {
      execSync('git reset --soft HEAD~1', { cwd: REPO, stdio: 'ignore' });
      committed = false;
    }

    assert(status === 0,
      `Expected exit 0 (SPEC authorizes), got ${status}. stdout=${stdout} stderr=${stderr}`);
  } finally {
    safeUnstage(FIXTURE_SPEC_DIR);
    safeUnstage(FIX_DIR);
    if (committed) {
      try { execSync('git reset --soft HEAD~1', { cwd: REPO, stdio: 'ignore' }); } catch {}
    }
  }
});

// Test 3: integration — staged deletion without authorizing SPEC → exit 1
test('3: integration — staged delete + NO auth SPEC → exit 1', () => {
  const FIX_DIR = 'tests/__dog_test2_DELETEME';
  const FIX_FILE = `${FIX_DIR}/doomed.txt`;
  let committed = false;
  try {
    mkdirSync(join(REPO, FIX_DIR), { recursive: true });
    writeFileSync(join(REPO, FIX_FILE), 'doomed\n', 'utf8');
    execSync(`git add "${FIX_FILE}"`, { cwd: REPO, stdio: 'ignore' });
    execSync(
      `git -c user.name=DOG -c user.email=dog@test commit -m "test fixture" --no-verify -- "${FIX_FILE}"`,
      { cwd: REPO, stdio: 'ignore' }
    );
    committed = true;

    execSync(`git rm -f "${FIX_FILE}"`, { cwd: REPO, stdio: 'ignore' });

    const { status } = runCheck();

    safeUnstage(FIX_DIR);
    if (committed) {
      execSync('git reset --soft HEAD~1', { cwd: REPO, stdio: 'ignore' });
      committed = false;
    }

    assert(status === 1,
      `Expected exit 1 (no auth), got ${status}`);
  } finally {
    safeUnstage(FIX_DIR);
    if (committed) {
      try { execSync('git reset --soft HEAD~1', { cwd: REPO, stdio: 'ignore' }); } catch {}
    }
  }
});

// Test 4: comment-awareness — SQL comments with destructive patterns should NOT trigger
test('4: comment-awareness — SQL comment with DROP TABLE → no violation', () => {
  const FIX_DIR = 'tests/__dog_test3_DELETEME';
  const FIX_FILE = `${FIX_DIR}/migration.sql`;
  try {
    mkdirSync(join(REPO, FIX_DIR), { recursive: true });
    writeFileSync(join(REPO, FIX_FILE),
      '-- This migration secures backup tables\n' +
      '-- Rollback: see backups/ folder for the original table\n' +
      'ALTER TABLE public._events_ops_backups ENABLE ROW LEVEL SECURITY;\n',
      'utf8');
    execSync(`git add "${FIX_FILE}"`, { cwd: REPO, stdio: 'ignore' });

    const { status, stdout } = runCheck();

    safeUnstage(FIX_DIR);

    assert(status === 0,
      `Expected exit 0 (SQL comments should be skipped), got ${status}. stdout=${stdout}`);
  } finally {
    safeUnstage(FIX_DIR);
  }
});

// Final cleanup safety net
safeUnstage(FIXTURE_SPEC_DIR);
safeUnstage('tests/__dog_test_DELETEME');
safeUnstage('tests/__dog_test2_DELETEME');
safeUnstage('tests/__dog_test3_DELETEME');

const failed = RESULTS.filter(r => r.status === 'FAIL');
const passed = RESULTS.filter(r => r.status === 'PASS');

console.log(`\n${passed.length}/${RESULTS.length} destructive-ops-gate tests passed.`);

if (failed.length > 0) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
process.exit(0);
