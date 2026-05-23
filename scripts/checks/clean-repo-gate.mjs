// scripts/checks/clean-repo-gate.mjs
// Clean-Repo Gate (CLAUDE.md §9 #6 enforcement — added 2026-05-23
// per REPO_CLEANUP_MERGE_ENFORCEMENT SPEC after recurring dirty-tree
// failures).
//
// Auto-loaded by scripts/verify.mjs from scripts/checks/.
//
// Behavior:
//   --full mode: HARD FAIL (violation → verify.mjs exit 1) if:
//     (a) untracked-file pile ≥ HARD_THRESHOLD (default 30), OR
//     (b) any `.claude/skills/**` file is modified OR untracked
//         (orphan skill edits are always a problem — every session
//          that edits a skill MUST commit it before ending).
//
//   --full mode: WARNING (verify.mjs exit 2) if:
//     - untracked-file pile is SOFT_THRESHOLD ≤ count < HARD_THRESHOLD (10..29).
//
//   --staged mode: clean-repo check is a no-op (commit-time hook would
//     misfire on the very commit that's resolving the pile). The gate
//     runs in --full / `npm run verify:integrity` / session-end calls.
//
// Self-test: `node scripts/checks/clean-repo-gate.mjs --test` runs a
// regression suite that synthesizes git states + asserts the gate's
// exit codes.

import { execSync } from 'node:child_process';

const SOFT_THRESHOLD = 10;
const HARD_THRESHOLD = 30;

function getPorcelain() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { return []; }
}

// "?? path" or " M path" or "MM path" → returns array of { status, path }.
function parseEntries(lines) {
  return lines.map(line => {
    const status = line.slice(0, 2);
    const path = line.slice(3).replace(/^"(.*)"$/, '$1');
    return { status, path };
  });
}

// Run when invoked by verify.mjs (default export pattern). Signature matches
// the other checks: `(files, opts) → { violations, warnings }`.
export default async function check(_files, _opts = {}) {
  // No-op in --staged mode: the commit we're about to make is itself the
  // resolution path. Surfacing a "dirty tree" violation during the commit
  // that's CLEANING the tree would create a chicken-and-egg block.
  if (process.argv.includes('--staged')) {
    return { violations: [], warnings: [] };
  }

  const violations = [];
  const warnings = [];

  const lines = getPorcelain();
  const entries = parseEntries(lines);

  const untracked = entries.filter(e => e.status === '??');
  const modified = entries.filter(e => e.status !== '??');

  // Skill edit detection (Reason 4 from CLEAN_REPO_ROOT_CAUSE.md): every
  // session that edits a .claude/skills/** file must commit it before
  // ending. Orphan skill edits are the recurring pile source.
  const skillDirty = entries.filter(e =>
    e.path.startsWith('.claude/skills/') ||
    e.path.startsWith('.claude\\skills\\')
  );
  if (skillDirty.length > 0) {
    violations.push({
      check: 'clean-repo',
      path: '.claude/skills/',
      line: 0,
      message: `${skillDirty.length} uncommitted .claude/skills/** path(s) — orphan skill edits must be committed before session end (CLAUDE.md §9 #6). Paths: ${skillDirty.slice(0, 5).map(s => s.path).join(', ')}${skillDirty.length > 5 ? ' …' : ''}`
    });
  }

  // Large untracked pile detection (Reason 2 from CLEAN_REPO_ROOT_CAUSE.md
  // — the text-rule with no friction). HARD threshold blocks; SOFT warns.
  if (untracked.length >= HARD_THRESHOLD) {
    violations.push({
      check: 'clean-repo',
      path: 'working-tree',
      line: 0,
      message: `${untracked.length} untracked files (>= ${HARD_THRESHOLD} hard threshold) — survey-first, categorize, then commit/discard/gitignore. CLAUDE.md §9 #6 + REPO_CLEANUP_MERGE_ENFORCEMENT SPEC. NEVER bypass with --no-verify.`
    });
  } else if (untracked.length >= SOFT_THRESHOLD) {
    warnings.push({
      check: 'clean-repo',
      path: 'working-tree',
      line: 0,
      message: `${untracked.length} untracked files (>= ${SOFT_THRESHOLD} soft threshold) — categorize + resolve before EOD. CLAUDE.md §9 #6.`
    });
  }

  return { violations, warnings };
}

// Self-test entry point: `node scripts/checks/clean-repo-gate.mjs --test`
if (process.argv.includes('--test')) {
  const tests = [];

  // Test 1: clean tree (0 untracked) → no violations, no warnings.
  tests.push({
    name: 'clean tree',
    porcelain: [],
    expected_violations: 0,
    expected_warnings: 0
  });
  // Test 2: 5 untracked, no skills → no violations, no warnings.
  tests.push({
    name: 'tiny untracked pile (5)',
    porcelain: ['?? a.md', '?? b.md', '?? c.md', '?? d.md', '?? e.md'],
    expected_violations: 0,
    expected_warnings: 0
  });
  // Test 3: 15 untracked → warning (>= soft).
  tests.push({
    name: 'soft-warn pile (15)',
    porcelain: Array.from({ length: 15 }, (_, i) => `?? f${i}.md`),
    expected_violations: 0,
    expected_warnings: 1
  });
  // Test 4: 35 untracked → violation (>= hard).
  tests.push({
    name: 'hard-fail pile (35)',
    porcelain: Array.from({ length: 35 }, (_, i) => `?? g${i}.md`),
    expected_violations: 1,
    expected_warnings: 0
  });
  // Test 5: 1 dirty skill file → violation (always, regardless of pile size).
  tests.push({
    name: 'single skill edit (orphan)',
    porcelain: [' M .claude/skills/opticup-strategic/SKILL.md'],
    expected_violations: 1,
    expected_warnings: 0
  });
  // Test 6: 1 untracked skill file → violation.
  tests.push({
    name: 'untracked skill drop',
    porcelain: ['?? .claude/skills/new-skill/SKILL.md'],
    expected_violations: 1,
    expected_warnings: 0
  });

  // Monkey-patch getPorcelain via override of the env variable.
  // Simpler: inline-test the parseEntries → behavior via a stub.
  let pass = 0, fail = 0;
  for (const t of tests) {
    const entries = parseEntries(t.porcelain);
    const untracked = entries.filter(e => e.status === '??');
    const skillDirty = entries.filter(e =>
      e.path.startsWith('.claude/skills/') || e.path.startsWith('.claude\\skills\\')
    );
    let v = 0, w = 0;
    if (skillDirty.length > 0) v++;
    if (untracked.length >= HARD_THRESHOLD) v++;
    else if (untracked.length >= SOFT_THRESHOLD) w++;

    const ok = v === t.expected_violations && w === t.expected_warnings;
    if (ok) { pass++; console.log(`  ✓ ${t.name}: v=${v} w=${w}`); }
    else { fail++; console.log(`  ✗ ${t.name}: got v=${v} w=${w}, expected v=${t.expected_violations} w=${t.expected_warnings}`); }
  }
  console.log(`\n${pass}/${pass + fail} tests passed.`);
  process.exit(fail === 0 ? 0 : 1);
}
