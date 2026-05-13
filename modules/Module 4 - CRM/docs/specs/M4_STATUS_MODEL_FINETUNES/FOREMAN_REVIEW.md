# M4_STATUS_MODEL_FINETUNES — Foreman Review

**Reviewer:** opticup-strategic (Foreman)
**Date:** 2026-05-14

---

## SPEC Quality Audit

Strength: §0 Pre-Authoring Reality Check did the scope correction inline — F2 trigger renaming was found to be cross-module (M1, not M4) before the SPEC committed to a destructive operation. The earlier discipline lesson (M4_REMOVE_CONFIRMED_VERIFIED, 2026-05-14) is paying off — pre-flight is now standard.

Weakness: the SPEC could have caught F2's cross-module nature in the Brief-authoring step BEFORE the overnight pipeline read it. Brief §3.3 said "two conventions coexist" — true, but didn't say which module the legacy convention lived in. A 30-second `grep` while drafting the Brief would have surfaced that. Author proposal #1 below addresses this.

## Execution Quality Audit

Trivial: one `CREATE OR REPLACE FUNCTION` migration, 1-line change inside a 60-line function body. All criteria verified. No drift.

## Findings Processing

- F-SMF-1 (cross-module trigger naming) — documented in SPEC #4's STATUS_MODEL.md edit. Defers active work to a future M1 SPEC.
- F-SMF-2 (other RPCs may share the idiom) — added to `TECH_DEBT.md` track on Daniel's morning review (not committed by this overnight run; the morning summary flags it).

## Author Skill Improvement Proposals

### Proposal 1 — Briefs should pin findings to module ownership

**File:** `.claude/skills/opticup-architect/SKILL.md` (Brief-authoring section)
**Why:** This Brief asked an M4-scoped SPEC to address what turned out to be an M1-scoped finding. A 30-second `grep` during Brief authoring would have caught it. The harvest-from-findings step needs a "verify the finding's home module" check.
**Proposed change:** Add to the Brief-authoring checklist: "Every finding listed in §3 SPECs To Ship must be verified to live in the module the Brief targets, via grep against `pg_trigger`, `pg_proc`, file paths, etc. Cross-module findings must be split into separate Briefs per module."

### Proposal 2 — Document the `IS NULL` vs `NOT FOUND` idiom in CONVENTIONS.md

**File:** `docs/CONVENTIONS.md` (new "PL/pgSQL idioms" section)
**Why:** F-CSF-3 is a class-of-issue, not a one-off. Other RPCs may share the pattern (F-SMF-2). Documenting the correct idiom makes future authors avoid it.
**Proposed change:** Add a sub-section "SELECT INTO miss check — use `IF NOT FOUND`, not `IF v_x IS NULL`" with a 5-line code example. (Not done by this SPEC because CONVENTIONS.md edits are scope-creep; logged for the next opticup-strategic session to apply per the Self-Improvement Mandate.)

## Executor Skill Improvement Proposals

### Proposal 1 — Multi-statement queries via MCP `execute_sql` only return the LAST result

**File:** `.claude/skills/opticup-executor/SKILL.md` (DB smoke section)
**Why:** First attempt to verify C1+C2+C3+S1+S2 in one `execute_sql` call with 5 `SELECT` statements returned only the LAST row (S2 only). The MCP tool apparently returns the result of the final statement. Rerun as a single `SELECT` with sub-queries worked. Capture the lesson.
**Proposed change:** Add to "DB verification idioms": "When verifying multiple criteria in one MCP `execute_sql` call, ALWAYS combine into one `SELECT (sub1) AS c1, (sub2) AS c2, ...` rather than chaining standalone SELECT statements. Standalone SELECTs return only the last result."

### Proposal 2 — Save the migration file BEFORE applying via MCP

**File:** `.claude/skills/opticup-executor/SKILL.md` (Migration discipline)
**Why:** This SPEC's executor applied the migration via MCP `apply_migration` (which targets the remote DB) but then needed a SEPARATE `Write` step to put the local migration file under `supabase/migrations/`. If the local file is forgotten, the team's source-of-truth diverges. The right order is: write file first, then apply via MCP using the same SQL.
**Proposed change:** Add to "Migration discipline": "Step 1 — Write the migration file at the timestamped path under `supabase/migrations/`. Step 2 — Apply it via `apply_migration` using the same SQL. NEVER apply remotely without the local file. Saving last → drift risk."

## Verdict

**🟢 CLOSED.**

1-line change landed. Pre-flight discipline working. Improvement proposals captured.

---

*End of FOREMAN_REVIEW.*
