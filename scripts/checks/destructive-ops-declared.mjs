#!/usr/bin/env node
// Iron Rule 32 — Destructive Operations Gate
//
// Enforces two invariants:
//   (A) Every SPEC.md inside modules/*/docs/specs/*/ contains a
//       well-formed `## Destructive Operations` (or `## 4. Destructive
//       Operations`) section.
//   (B) Staged commits that touch a SPEC's working set do not introduce
//       destructive patterns (file deletes, DROP TABLE/COLUMN/POLICY,
//       TRUNCATE, ALTER TABLE ... DROP, git rebase/reset --hard/push
//       --force, mass renames ≥ 5 files in one staged set, unscoped
//       DELETE FROM, --no-verify text). When a destructive pattern is
//       detected, the script does NOT auto-block — it surfaces a
//       violation. The pre-commit hook turns that violation into a
//       blocked commit. Bypass requires Daniel's explicit go-ahead in
//       chat, not a flag.
//
// Authored by M1_5_FULL_AUTO_PIPELINE (2026-05-11).
//
// Usage:
//   - As a verify.mjs check module:
//       imported automatically (export default async (files, opts)).
//   - Standalone:
//       node scripts/checks/destructive-ops-declared.mjs --help     # exit 0
//       node scripts/checks/destructive-ops-declared.mjs --scan     # scan all SPECs
//       node scripts/checks/destructive-ops-declared.mjs --version  # exit 0

import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve, relative } from 'node:path';

const REPO = resolve(import.meta.dirname || '.', '..', '..');

const HELP_TEXT = `destructive-ops-declared.mjs — Iron Rule 32 enforcement

USAGE
  Auto-invoked by scripts/verify.mjs (--staged and --full modes).

  Standalone:
    node scripts/checks/destructive-ops-declared.mjs --help
    node scripts/checks/destructive-ops-declared.mjs --scan
    node scripts/checks/destructive-ops-declared.mjs --version

EXIT CODES
  0  No violations OR --help / --version
  1  At least one SPEC missing § Destructive Operations, OR a destructive
     pattern was introduced in staged files without an authorizing SPEC.

WHAT IT CHECKS
  (A) Every modules/*/docs/specs/*/SPEC.md has a
      "## Destructive Operations" (or "## 4. Destructive Operations")
      heading followed by non-empty content.
  (B) Staged files do not introduce destructive patterns:
        - File deletes (git status 'D ')
        - SQL: DROP TABLE / DROP COLUMN / DROP POLICY / TRUNCATE /
                ALTER TABLE ... DROP / DELETE FROM <table> without WHERE
        - Git: rebase / reset --hard / push --force
        - Flags: --no-verify
        - Mass renames ≥ 5 files in one staged set
`;

// ---------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------

const SPEC_HEADING_RE = /^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m;

const DESTRUCTIVE_PATTERNS = [
  { re: /\bDROP\s+TABLE\b/i,          label: 'SQL DROP TABLE' },
  { re: /\bDROP\s+COLUMN\b/i,         label: 'SQL DROP COLUMN' },
  { re: /\bDROP\s+POLICY\b/i,         label: 'SQL DROP POLICY' },
  { re: /\bTRUNCATE\s+TABLE\b/i,      label: 'SQL TRUNCATE' },
  { re: /\bALTER\s+TABLE\s+[^\n;]+\bDROP\b/i, label: 'SQL ALTER ... DROP' },
  { re: /\bgit\s+push\s+--force\b/i,  label: 'git push --force' },
  { re: /\bgit\s+reset\s+--hard\b/i,  label: 'git reset --hard' },
  { re: /\bgit\s+rebase\b/i,          label: 'git rebase' },
  { re: /--no-verify\b/i,             label: '--no-verify flag' },
];

// DELETE FROM <table> without a WHERE clause (or with WHERE 1=1)
const UNSCOPED_DELETE_RE = /\bDELETE\s+FROM\s+\w+(?:\s*;|\s+WHERE\s+1\s*=\s*1\b)/i;

function isSpecPath(absPath) {
  const rel = relative(REPO, absPath).replace(/\\/g, '/');
  return /^modules\/[^/]+\/docs\/specs\/[^/]+\/SPEC\.md$/.test(rel);
}

function isDocFile(absPath) {
  const rel = relative(REPO, absPath).replace(/\\/g, '/');
  // Documentation-context files where destructive patterns are quoted
  // as examples / forbidden tokens, not actual operations. These are
  // listed verbatim — additions require a SPEC change.
  return (
    rel === 'CLAUDE.md' ||
    rel.startsWith('.claude/skills/') ||
    /^docs\//.test(rel) ||
    /^modules\/[^/]+\/docs\/specs\/[^/]+\/(SPEC|FOREMAN_REVIEW|EXECUTION_REPORT|FINDINGS|TEST_REPORT|ROLLBACK_SQL|DIAGNOSIS|REPLICATION_PLAN|READY-FOR-MAIN-MERGE|ARCHITECT_REVIEW_CHECKPOINT|DEPLOY_FALLBACK_NEEDED|SKILL_IMPROVEMENTS_TO_APPLY)\.md$/.test(rel) ||
    /^modules\/[^/]+\/architecture-brief\//.test(rel) ||
    /^modules\/[^/]+\/escalations\//.test(rel) ||
    // Module-scoped docs (SESSION_CONTEXT, CHANGELOG, MODULE_SPEC, etc.)
    // routinely describe destructive-op concepts by name.
    /^modules\/[^/]+\/docs\/[^/]+\.md$/.test(rel) ||
    rel === 'MASTER_ROADMAP.md' ||
    rel === 'OPEN_TASKS.md' ||
    rel === 'TECH_DEBT.md' ||
    // Check infrastructure itself: scripts/checks/*.mjs define the
    // patterns they look for; scripts/verify.mjs comments on them.
    // Treating these as live destructive ops would block the check
    // from ever updating itself.
    /^scripts\/checks\/.+\.mjs$/.test(rel) ||
    rel === 'scripts/verify.mjs'
  );
}

function getStagedDeletes() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=D', {
      cwd: REPO, encoding: 'utf8',
    });
    return out.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

function getStagedRenames() {
  try {
    const out = execSync('git diff --cached --name-status --diff-filter=R', {
      cwd: REPO, encoding: 'utf8',
    });
    return out.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

async function checkSpecHasSection(specPath) {
  try {
    const text = await readFile(specPath, 'utf8');
    if (!SPEC_HEADING_RE.test(text)) {
      return {
        ok: false,
        message: 'SPEC.md missing "## Destructive Operations" (or "## 4. Destructive Operations") heading',
      };
    }
    // Verify the section is not empty (next non-blank line after heading
    // is not another heading or EOF).
    const idx = text.search(SPEC_HEADING_RE);
    const after = text.slice(idx).split('\n').slice(1);
    const firstContent = after.find(l => l.trim().length > 0);
    if (!firstContent || firstContent.startsWith('## ')) {
      return {
        ok: false,
        message: '"## Destructive Operations" section is empty',
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `read error: ${err.message}` };
  }
}

async function scanDestructivePatternsInDiff(filePath) {
  // Read the staged diff for this file. If any added line (`^+`, not
  // `^+++`) contains a destructive pattern AND the file is not a doc
  // file → violation.
  if (isDocFile(filePath)) return [];
  try {
    const out = execSync(`git diff --cached -- "${filePath}"`, {
      cwd: REPO, encoding: 'utf8',
    });
    const violations = [];
    let lineNo = 0;
    for (const line of out.split('\n')) {
      if (line.startsWith('@@')) {
        const m = line.match(/\+(\d+)/);
        if (m) lineNo = parseInt(m[1], 10) - 1;
        continue;
      }
      if (line.startsWith('+++') || line.startsWith('---')) continue;
      if (line.startsWith('+')) {
        lineNo += 1;
        const content = line.slice(1);
        for (const { re, label } of DESTRUCTIVE_PATTERNS) {
          if (re.test(content)) {
            violations.push({ line: lineNo, label, text: content.trim().slice(0, 120) });
          }
        }
        if (UNSCOPED_DELETE_RE.test(content)) {
          violations.push({ line: lineNo, label: 'unscoped DELETE FROM', text: content.trim().slice(0, 120) });
        }
      } else if (!line.startsWith('-')) {
        lineNo += 1;
      }
    }
    return violations;
  } catch { return []; }
}

// ---------------------------------------------------------------------
// verify.mjs check-module entry point
// ---------------------------------------------------------------------

export default async function destructiveOpsDeclared(files, _opts) {
  const violations = [];
  const warnings = [];

  // (A) Any staged SPEC.md must have a § Destructive Operations section.
  for (const f of files) {
    if (isSpecPath(f)) {
      const result = await checkSpecHasSection(f);
      if (!result.ok) {
        violations.push({
          check: 'destructive-ops-declared',
          path: f,
          line: 0,
          message: result.message,
        });
      }
    }
  }

  // (B) Staged file deletes — destructive unless declared.
  const deletes = getStagedDeletes();
  for (const del of deletes) {
    violations.push({
      check: 'destructive-ops-declared',
      path: resolve(REPO, del),
      line: 0,
      message: 'File deletion staged — destructive op. Must be declared in SPEC § Destructive Operations.',
    });
  }

  // (C) Mass renames ≥ 5 in one staged set.
  const renames = getStagedRenames();
  if (renames.length >= 5) {
    violations.push({
      check: 'destructive-ops-declared',
      path: resolve(REPO, '.'),
      line: 0,
      message: `Mass rename of ${renames.length} files staged — destructive op. Must be declared in SPEC.`,
    });
  }

  // (D) Destructive patterns in added diff content (non-doc files only).
  for (const f of files) {
    const hits = await scanDestructivePatternsInDiff(f);
    for (const h of hits) {
      violations.push({
        check: 'destructive-ops-declared',
        path: f,
        line: h.line,
        message: `Destructive pattern (${h.label}) introduced: ${h.text}`,
      });
    }
  }

  return { violations, warnings };
}

// ---------------------------------------------------------------------
// Standalone CLI entry point
// ---------------------------------------------------------------------

const isMain = (() => {
  try {
    const argv1 = process.argv[1] || '';
    return argv1.includes('destructive-ops-declared');
  } catch { return false; }
})();

if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  if (argv.includes('--version')) {
    console.log('destructive-ops-declared.mjs v1.0 (Iron Rule 32, 2026-05-11)');
    process.exit(0);
  }
  if (argv.includes('--scan')) {
    // Scan every SPEC.md under modules/*/docs/specs/* and report which
    // ones are missing the section. Non-blocking — exit 1 only if any
    // SPEC is non-compliant.
    const { glob } = await import('node:fs/promises').then(m => ({
      glob: async (_pattern) => {
        const out = execSync(
          'git ls-files "modules/*/docs/specs/*/SPEC.md"',
          { cwd: REPO, encoding: 'utf8' }
        );
        return out.trim().split('\n').filter(Boolean).map(p => resolve(REPO, p));
      },
    }));
    const specs = await glob();
    let bad = 0;
    for (const s of specs) {
      const r = await checkSpecHasSection(s);
      const rel = relative(REPO, s);
      if (!r.ok) {
        console.log(`MISSING  ${rel}  — ${r.message}`);
        bad += 1;
      } else {
        console.log(`OK       ${rel}`);
      }
    }
    console.log(`\n${specs.length} SPECs scanned, ${bad} non-compliant.`);
    process.exit(bad === 0 ? 0 : 1);
  }
  // No flags → print help and exit 0 (so CI smoke `--help` test succeeds).
  console.log(HELP_TEXT);
  process.exit(0);
}
