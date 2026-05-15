// scripts/checks/architect-pending-applied.mjs
// Architect-pending-entries advisory check (Layer 2 of PENDING_ENTRIES_AUTO_RESOLUTION).
//
// Purpose:
//   Warns when `_archive/architect-pending-entries/` has unconsumed `.md` files.
//   These are pending DECISIONS_LOG / SKILL.md entries authored by Cowork
//   Architect sessions (which cannot write to `.claude/skills/`) and waiting
//   for a Claude Code session to apply them. The Executor's "Pending Entries
//   Sweep" (opticup-executor SKILL.md, Step 4.5 in SPEC Execution Protocol)
//   should consume them. This check catches anything that slips past Layer 1
//   before the commit lands.
//
// Auto-loaded by `scripts/verify.mjs` from `scripts/checks/`.
//
// Exit semantics (advisory-only — per Brief D2):
//   - violations: ALWAYS empty (never blocks a commit).
//   - warnings:   one entry per pending `.md` file (excluding `.gitkeep`).
//   - verify.mjs treats warnings-only → exit 2 (yellow), exit 0 if folder empty.
//
// Added 2026-05-15 by PENDING_ENTRIES_AUTO_RESOLUTION SPEC (Module 1.5).
// Reference: modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/SPEC.md §6 + Appendix B.

import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO = resolve(__dirname, '..', '..');
const FOLDER = join(REPO, '_archive', 'architect-pending-entries');

export default async function checkArchitectPendingApplied(_files) {
  const violations = [];
  const warnings = [];

  let entries;
  try {
    entries = await readdir(FOLDER);
  } catch {
    // Folder doesn't exist → nothing pending → clean.
    return { violations, warnings };
  }

  const pending = entries.filter(e => e.endsWith('.md') && e !== '.gitkeep');

  for (const f of pending) {
    warnings.push({
      check: 'architect-pending-applied',
      path: join(FOLDER, f),
      line: 0,
      message: `pending architect entry "${f}" not yet applied to its target. Run the Executor's Pending Entries Sweep before commit (see opticup-executor SKILL.md → Pending Entries Sweep).`,
    });
  }

  return { violations, warnings };
}
