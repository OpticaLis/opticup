# FINDINGS — STRUCTURE_PROTECTIONS_SPEC

> **SPEC location:** `modules/Module 5 - Customers/architecture-brief/STRUCTURE_PROTECTIONS_SPEC.md` (TEMP — moves to `_archive/spec-history/STRUCTURE_PROTECTIONS/` at Module Close Ceremony)
> **Logged by:** opticup-executor
> **Logged on:** 2026-05-09
> **Convention:** one section per finding, with severity, location, description, recommendation, and suggested follow-up SPEC name.

---

## F1 — `verify.mjs` uses auto-load, but recent SPECs (and possibly past patterns) prescribe `spawnSync`

- **Severity:** LOW
- **Location:** `scripts/verify.mjs` (auto-load logic at lines 72-86); STRUCTURE_PROTECTIONS_SPEC §7 Commit 2/3 (prescribed `spawnSync` pattern).
- **Description:** `verify.mjs` already auto-loads any `.mjs` in `scripts/checks/` and treats them as check modules with the contract `export default async function(files, opts) → { violations, warnings }`. The SPEC for Commit 2/3 prescribed a different (older) pattern: a standalone script with `process.exit(1/2/0)`, spawned from a hand-edit to `verify.mjs`. The auto-load pattern is canonical, simpler, and already used by 7 existing checks (`file-size`, `null-bytes`, `rule-14-tenant-id`, `rule-15-rls`, `rule-18-unique-tenant`, `rule-21-orphans`, `rule-23-secrets`). Adapting was straightforward but consumed ~5 min of `verify.mjs` reading first.
- **Recommendation:** Update `opticup-executor` SKILL.md to document the auto-load contract (see EXECUTION_REPORT §9 P1). For future structural SPECs that add checks, the SPEC author should reference this contract instead of prescribing spawn-style implementations. Optionally update `opticup-strategic` SKILL too — the SPEC writer is the actual "owner" of this knowledge.
- **Suggested follow-up SPEC:** None — apply the lesson via SKILL update only.

## F2 — `.gitignore` line 34 duplicate `.claude/` continues to block new files in opticup-* skills

- **Severity:** MEDIUM (carry-forward, third occurrence)
- **Location:** `.gitignore` line 34 (`.claude/` re-ignore that overrides lines 6-9's negation).
- **Description:** First seen in PROJECT_STRUCTURE_CLEANUP_SPEC (logged as F2 there, MEDIUM, recommend `GITIGNORE_CLEANUP`). Re-encountered in MODULES_HOME_UNIFICATION_SPEC. NOW re-encountered in this SPEC for the third time — Sentinel Mission 10 file (`references/missions/10-structure-discipline.md`) and main-strategic SKILL.md couldn't `git add` without `-f`. Each SPEC inherits the workaround.
- **Recommendation:** Run `GITIGNORE_CLEANUP` SPEC immediately after this SPEC's Module Close Ceremony — the fix is small (delete lines 33–34 or the duplicate `.claude/`) but the impact is significant (every future skill-touching SPEC gets this same friction). Daniel has implicitly authorized inheriting the workaround for now, but the cumulative pain is now MEDIUM.
- **Suggested follow-up SPEC:** `GITIGNORE_CLEANUP` (small, single-commit) — covers F2 + F3 from PROJECT_STRUCTURE_CLEANUP (watcher.wrapper.log) + this F2.

## F3 — Parallel-sync site-overseer modifications appeared mid-execution (third occurrence)

- **Severity:** INFO (pattern recognition)
- **Location:** `roles/site-overseer/DECISIONS_LOG.md` (+15 lines), `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (+5 lines).
- **Description:** During execution, the watcher service synced 2 modifications from another machine where a parallel Site Overseer session ran. Same pattern as PROJECT_STRUCTURE_CLEANUP (where SITE_OVERSEER_HANDOFF.md was modified mid-execution) and MODULES_HOME_UNIFICATION (same). The cross-machine sync is working as designed; the executor correctly recognizes parallel-session edits as out-of-scope and leaves them for Daniel/next session to commit.
- **Recommendation:** No action needed in this SPEC. Pattern is now confirmed across 3 SPECs — could become a documented expected-behavior in `opticup-executor` SKILL.md ("Cross-machine sync may produce mid-session modifications to `roles/site-overseer/`, `roles/campaign-overseer/`, etc. Treat as out-of-scope.").
- **Suggested follow-up SPEC:** None — minor SKILL doc note suffices.

## F4 — `docs/FILE_STRUCTURE.md` doesn't enumerate `scripts/checks/`

- **Severity:** LOW
- **Location:** `docs/FILE_STRUCTURE.md` — the existing "scripts/" section lists watcher-related scripts but not `scripts/checks/`.
- **Description:** This SPEC adds 2 new files to `scripts/checks/` (the new check + the JSON allowlist). The existing 7 check files (`file-size.mjs`, etc.) aren't enumerated in `docs/FILE_STRUCTURE.md` either — `scripts/checks/` isn't a tracked subfolder there. Per Iron Rule 21 ("no orphans"), the doc should reflect the structure.
- **Recommendation:** In a small follow-up doc commit, add a `scripts/checks/` subsection to `docs/FILE_STRUCTURE.md` listing the 9 check files + the JSON allowlist, with one-line descriptions. Could bundle with the next docs sweep. Not blocking.
- **Suggested follow-up SPEC:** None needed — fold into the next `docs/FILE_STRUCTURE.md` refresh (next time anyone touches that doc).

## F5 — `serve.js` and `opticup-skills.plugin` are categorized as "legacy" but not formally documented

- **Severity:** INFO
- **Location:** `scripts/checks/root-allowlist.json` `category_legacy_acknowledged` array.
- **Description:** Two root files (`serve.js`, `opticup-skills.plugin`) are on the allowlist under a "legacy_acknowledged" category. CLAUDE.md §0.5 doesn't explicitly call these out as Category 1/2/3 — they sit in a fourth implicit "legacy" category. The allowlist documents this with a `_notes` block but the rule itself doesn't.
- **Recommendation:** Either (a) move both into a documented Category 1 or 2 in CLAUDE.md §0.5 (e.g., `serve.js` → "dev/test infra"; `opticup-skills.plugin` → "build artifact, gitignored normally but committed for distribution") — OR (b) explicitly add a 4th category "Legacy Acknowledged" to §0.5 with these 2 entries and a sunset plan. Option (b) is more honest: these are technical debt awaiting cleanup.
- **Suggested follow-up SPEC:** None right now — flag for the next CLAUDE.md §0.5 maintenance pass. If Daniel wants to clean these up, that's its own scope (e.g., `LEGACY_ROOT_FILES_RESOLUTION` SPEC).

---

## Summary table

| ID | Severity | Topic | Suggested follow-up |
|---|---|---|---|
| F1 | LOW | verify.mjs auto-load contract not documented in executor SKILL | EXECUTION_REPORT §9 P1 (SKILL update) |
| F2 | MEDIUM | `.gitignore` line 34 duplicate (third occurrence) | `GITIGNORE_CLEANUP` SPEC (small, urgent-ish) |
| F3 | INFO | Parallel-sync site-overseer edits (third occurrence) | Minor SKILL doc note |
| F4 | LOW | `docs/FILE_STRUCTURE.md` doesn't list `scripts/checks/` | Fold into next FILE_STRUCTURE refresh |
| F5 | INFO | Legacy root files not formally categorized in §0.5 | Flag for next §0.5 maintenance |

*FINDINGS complete.*
