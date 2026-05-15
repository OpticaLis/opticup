# Brief — M1A Debt Sweep (3 follow-ups + 4 skill improvements)

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect
**Hand-off to:** Module Strategist → Executor (Full Auto Pipeline)

---

## 1. Purpose

Clean up the 3 tracked debts that surfaced during Phase 1A + currencies-hotfix closure, and apply the 4 accumulated skill self-improvement proposals — all in one consolidated Pipeline run, before Phase 1B starts.

The goal: enter Phase 1B with clean Phase 1A infrastructure and improved tooling. Phase 1B's customer-facing screens are scoped large; running them over unresolved debt + un-applied skill improvements amplifies risk.

This is a **maintenance Pipeline**, not a feature Pipeline. No new functionality; only debt closure and skill upgrades.

## 2. Scope — In

Three debt items + four skill improvements, all interconnected enough to fit in one Pipeline:

### Debt #1 — M1A-DEBT-02: Legacy db-schema.sql cleanup

**Source:** Phase 1A FOREMAN_REVIEW deferred item (commit 285b5d6).

**Problem:** Module's `docs/db-schema.sql` could not receive the Phase 1A summary append because the file contains 48 pre-existing UNIQUE-without-tenant-id violations from the frames era. The verify hook (rule-18-tenant-id-unique.mjs) rejects any commit that touches the file.

**Fix:**
- Audit the 48 violations: which are intentional (e.g., `barcode` UNIQUE that we documented should be `(barcode, tenant_id)`) vs which are already-correct-but-falsely-flagged.
- Apply correct tenant-id-scoped UNIQUEs across the file.
- Append the Phase 1A summary section (17 new tables + 9 RPCs + trigger + view).
- File must pass `npm run verify:integrity` and all rule hooks after this commit.

**Risk:** LOW. This is doc-only — the authoritative DDL is in `supabase/migrations/`, so live DB is unaffected.

### Debt #2 — M1A-DEBT-03: T.CURRENCIES constant + FIELD_MAP

**Source:** Currencies-hotfix FOREMAN_REVIEW finding M1A-FINDINGS-05.

**Problem:** The `currencies` table was made global in M1A-DEBT-01 hotfix, but `js/shared.js` is missing the `T.CURRENCIES` constant, and `js/shared-field-map.js` is missing FIELD_MAP entries for `decimal_digits`.

**Fix:**
- Add `T.CURRENCIES = 'currencies'` to `js/shared.js`.
- Add FIELD_MAP entries for all 6 currencies columns (`code`, `name`, `symbol`, `decimal_digits`, `is_active`, `created_at`).
- No code consumers yet — pre-emptive cleanup before Phase 1B (which WILL consume).

**Risk:** TRIVIAL. Constants-and-map additions only.

### Debt #3 — M1_5_VERIFY_HOOKS_REGEX_FIXES

**Source:** Phase 1A FOREMAN_REVIEW M1A-INFRA-01.

**Problem:** Two verify-script regex defects that caused false-positive blockers during Phase 1A:
- `rule-15-rls.mjs` regex doesn't accept schema prefix (e.g., `public.lens_brand` is flagged when `lens_brand` alone would pass).
- `rule-21-no-orphans.mjs` performs full file-scan instead of diff-scan — fires on legacy unrelated code when only a small staged section is the actual issue.

**Fix:**
- 1-line regex patch on rule-15-rls.mjs to accept optional `public.` prefix.
- Modify rule-21 to operate on `git diff --cached` output instead of full-file scan, so it only flags new orphans introduced by the staged changes.

**Risk:** MEDIUM. Modifying verify hooks affects all future commits. Must include regression test — run the patched hooks against the Phase 1A commits to confirm they still pass.

### Skill Improvements (4) — to apply in this Pipeline

From two consecutive FOREMAN_REVIEWs (Phase 1A + currencies-hotfix), 8 skill improvement proposals have accumulated. The currencies-hotfix review explicitly lists the 4 most actionable:

| # | Skill | Improvement | Target file |
|---|---|---|---|
| 1 | opticup-strategic | New reference doc `RLS_PATTERN_GLOBAL_REFERENCE.md` documenting the two-policy pattern for global reference tables (read-anywhere, write-platform-only) | `.claude/skills/opticup-strategic/references/RLS_PATTERN_GLOBAL_REFERENCE.md` (new) + pointer in `SKILL.md` |
| 2 | opticup-strategic | Step 1.5.7 — DDL boundary scan during SPEC authoring (catch table-already-exists or column-already-exists upfront) | `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" Step 1.5 |
| 3 | opticup-executor | Mandatory `verify.mjs --staged` before commit (would have prevented the bad f1789c7 commit from Phase 1A) | `.claude/skills/opticup-executor/SKILL.md` "Autonomy Playbook" |
| 4 | opticup-executor | Rule 32 boundary — DROP-migration heuristic (which DROPs count as destructive ops requiring explicit SPEC authorization) | `.claude/skills/opticup-executor/SKILL.md` "SQL Autonomy Levels" |

## 3. Scope — Out

- **Other M1 work** — Phase 1B SPEC, future M1 phases, M9 SPEC: separate Pipelines.
- **The other 4 skill improvements** from Phase 1A's FOREMAN_REVIEW (Strategic A/B + Executor A/B about live-state probes and file-scan probes): defer to the next round of skill-improvement consolidation. Reason: the 4 listed above are higher-impact and more concrete; the other 4 are more strategic and benefit from observing one more SPEC before locking the pattern.
- **Iron Rule additions or CLAUDE.md edits**: deferred until the global-reference RLS pattern is observed in at least one more SPEC.
- **Merge to main**: stays on develop. Phase 1B will trigger the next main merge consideration.

## 4. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Run all 3 debts + 4 skill improvements in ONE Pipeline | Smallest unit of work that improves the tooling before Phase 1B; minimizes context-switch overhead. |
| 2 | Apply skill improvements BEFORE the 3 debt fixes | The improved tooling (Step 1.5.7 DDL scan, verify-script regex) makes the debt fixes themselves safer. Order: skill commits → debt commits. |
| 3 | M1A-DEBT-02 audit must classify each of the 48 violations | "Already-correct" violations get added to a whitelist; "needs-fix" violations get patched. No silent skips. |
| 4 | Verify-hook patches must be regression-tested against Phase 1A | The patched hooks must still pass on existing clean commits and still fail on known-bad patterns. Test commands documented in the SPEC. |
| 5 | Each debt closes with a TECH_DEBT.md row deleted (or struck through) | The intent is debt CLOSURE, not just patching. After Pipeline closes, MASTER_ROADMAP.md §5 and TECH_DEBT.md should reflect 3 closed items. |

## 5. Dependencies

### Upstream

- Phase 1A schema live (✅ verified — commit 285b5d6)
- Currencies-hotfix closed (✅ verified — commit 442295d)
- Both FOREMAN_REVIEWs exist and were read by Architect (✅ verified before authoring this Brief)

### Downstream

- **Phase 1B SPEC** — waits for this sweep to close
- **Future tenant-2 onboarding** — benefits from improved verify-hooks catching tenant-id violations earlier

## 6. Cross-Module Contracts

None affected. This Pipeline doesn't touch M1↔M9 K1-K5 contracts.

## 7. Open Questions

None. All 3 debts are scoped + locked. All 4 skill improvements are pre-decided in the source FOREMAN_REVIEWs.

## 8. Anti-Patterns

- **Do not bundle "while we're here" features.** This is a maintenance Pipeline. Resist any temptation to also fix M1A-INFRA-03 (baseline correction note), M1A-FINDINGS-04 (CLAUDE.md §4 pattern doc), or unrelated tech-debt items. They belong in separate runs.
- **Do not skip the regression test on verify-hooks.** Modifying hooks without testing against existing clean commits is how Phase 1A's f1789c7 happened.
- **Do not declare debt "closed" without removing/striking the TECH_DEBT.md row.** Closure means the tracking artifact is updated, not just the code.

## 9. Iron Rules in Sharp Focus

- **Rule 31 (Integrity gate)** — every commit in this Pipeline must pass `verify:integrity`. The verify-hook patches themselves must run AGAINST themselves — patched hooks must not break their own commit.
- **Rule 32 (Destructive Operations Gate)** — none of the 3 debts include destructive ops. SPEC's §"Destructive Operations" should say `None.` and mean it.
- **Rule 18 (UNIQUE includes tenant_id)** — central to M1A-DEBT-02. Every UNIQUE constraint in the fixed `db-schema.sql` must include tenant_id (or be on a tenant-id-exempt table per documented exception).

## 10. Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` | Source of M1A-DEBT-02 + M1A-INFRA-01 |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` | Source of M1A-DEBT-03 + 4 skill improvements |
| `TECH_DEBT.md` | Records to update at closure |
| `MASTER_ROADMAP.md` §5 | Tracked debt section to update |
| `modules/Module 1 - Inventory Management/docs/db-schema.sql` | The file to fix in M1A-DEBT-02 |
| `js/shared.js`, `js/shared-field-map.js` | The files to extend in M1A-DEBT-03 |
| `scripts/checks/rule-15-rls.mjs`, `rule-21-no-orphans.mjs` | The hooks to patch in VERIFY_HOOKS_REGEX_FIXES |
| `.claude/skills/opticup-strategic/SKILL.md`, `.claude/skills/opticup-executor/SKILL.md` | The skill files to update with the 4 improvements |

## 11. Hand-off Note

Module Strategist authoring this SPEC must decide the folder structure. Architect recommendation: **one SPEC folder with 3 commit groups**:

- Commit group A (4 commits): apply the 4 skill improvements first — each as its own commit so they can be cherry-picked if needed.
- Commit group B (3 commits): one commit per debt — DEBT-02, DEBT-03, VERIFY_HOOKS_REGEX_FIXES.
- Commit group C (1 commit): retrospective + TECH_DEBT.md + MASTER_ROADMAP.md closure entries.

Folder: `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/` (or any name the Strategist prefers).

Full Auto Pipeline as standard: Strategic → Executor → Reviewer → Localhost-Tester → Foreman review. No mid-pipeline escalation expected — scope is small + locked.

After this sweep closes, Phase 1B SPEC is the next call.

---

*End of Brief.*
