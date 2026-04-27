#!/usr/bin/env node
// test-integrity-gate.mjs — regression test for Iron Rule 31 null-byte detection.
// Creates a temp file with null bytes, runs the gate, asserts exit 1.
// Then creates a clean temp file, runs the gate, asserts exit 0 or 2.
// Rationale: PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27 §3 #6 — codify the
// guarantee that the gate detects null bytes ANYWHERE in a file (not just EOF).

import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname || '.', '..');
const FIXTURE_DIR = resolve(REPO, 'scripts', '_test_fixtures');

let pass = 0;
let fail = 0;

function makeFile(name, contents) {
  try { execSync(`mkdir -p "${FIXTURE_DIR}"`, { stdio: 'ignore' }); } catch {}
  const path = resolve(FIXTURE_DIR, name);
  writeFileSync(path, contents);
  return path;
}

function runGate(filePath) {
  try {
    execSync(`node ${resolve(REPO, 'scripts/verify-tree-integrity.mjs')} "${filePath}" --quiet`, {
      cwd: REPO, encoding: 'utf8', stdio: 'pipe'
    });
    return 0;
  } catch (e) {
    return e.status ?? -1;
  }
}

function assert(condition, label) {
  if (condition) { console.log(`✓ ${label}`); pass++; }
  else { console.log(`✗ ${label}`); fail++; }
}

console.log('Iron Rule 31 regression test — null-byte detection (anywhere in file)\n');

// Test 1: null byte at EOF (Cowork-VM padding pattern)
const f1 = makeFile('null-at-eof.js',
  Buffer.concat([Buffer.from('console.log("ok");\n'), Buffer.alloc(100, 0)])
);
assert(runGate(f1) === 1, 'null bytes at EOF → exit 1 (ERROR)');

// Test 2: null byte in middle of content
const f2 = makeFile('null-mid.js',
  Buffer.concat([Buffer.from('var a = "b";\n'), Buffer.from([0x00]), Buffer.from('var c = "d";\n')])
);
assert(runGate(f2) === 1, 'null byte mid-content → exit 1 (ERROR)');

// Test 3: null byte at very start
const f3 = makeFile('null-start.js',
  Buffer.concat([Buffer.from([0x00]), Buffer.from('console.log("ok");\n')])
);
assert(runGate(f3) === 1, 'null byte at offset 0 → exit 1 (ERROR)');

// Test 4: clean file → exit 0 or 2 (warning OK; not 1)
const f4 = makeFile('clean.js', Buffer.from('console.log("ok");\n'));
const code = runGate(f4);
assert(code === 0 || code === 2, `clean file → exit 0/2 (got ${code})`);

// Cleanup
for (const f of [f1, f2, f3, f4]) {
  try { if (existsSync(f)) unlinkSync(f); } catch {}
}
try { execSync(`rmdir "${FIXTURE_DIR}"`, { stdio: 'ignore' }); } catch {}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
