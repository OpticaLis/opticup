# Escalation — Iron Rule 32 hook lacks SQL-pattern authorization parsing

**Spec:** `M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS`
**Pipeline:** Executor (`executor-rls-bypass` session lock)
**Raised:** 2026-05-18T17:35:01Z
**Severity:** BLOCK — pre-commit hook prevents committing SPEC-authorized destructive ops

---

## What happened

1. Executor read SPEC + ACTIVATION_PROMPT in full.
2. Executor ran pre-apply re-probe — 0 `platform_admin_bypass` policies pre-existed (matches SPEC §0.2 baseline). Polish-by-validation guard did NOT fire.
3. Executor created pre-execution git tag `pre-M1-rls-bypass-20260518-1731`.
4. Executor wrote migration file `supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql` with content from SPEC §3a Block A verbatim (37 LOC, 4× DROP POLICY IF EXISTS + 4× CREATE POLICY).
5. Executor applied migration via `mcp__claude_ai_Supabase__apply_migration` → **`{"success":true}`**.
6. Executor verified post-apply state via `mcp__claude_ai_Supabase__execute_sql` — **all 4 new `platform_admin_bypass` policies present**, cmd=ALL, qual + with_check both = `is_platform_super_admin()` (Postgres stripped `public.` schema prefix via search_path resolution — functionally equivalent). All 12 existing policies byte-identical to §0.2 baseline. **DB STATE IS COMPLETE.**
7. Executor updated `MODULE_MAP.md` with 1 row for the new migration file.
8. Executor staged migration + MODULE_MAP.md and attempted commit.
9. Pre-commit hook (`scripts/checks/destructive-ops-declared.mjs`) **failed with 5 violations**:
   - Line 5 (header comment): "DROP POLICY IF EXISTS precedes each CREATE."
   - Line 11/18/25/32 (active SQL): `DROP POLICY IF EXISTS platform_admin_bypass ON public.<table>;`

## Root cause

The Iron Rule 32 gate (`scripts/checks/destructive-ops-declared.mjs`) has **two known gaps**:

1. **Comment-awareness gap** (already tracked as `IRON_RULE_32_HOOK_COMMENT_AWARENESS` SPEC per `opticup-executor/SKILL.md`): the hook's destructive-pattern regex `\bDROP\s+POLICY\b` matches both active SQL and SQL comments inside migration files. The executor skill's installed mitigation is "AVOID destructive-pattern keywords inside `--` SQL comments." The migration's header comment violates this — but the SPEC §3a Shared Edit Block declared the comment verbatim, expecting it to ship.

2. **SQL-pattern authorization gap** (NOT tracked anywhere, surfaced today): the auth-parser (`scripts/destructive-ops-auth-parser.mjs`) only handles **file-deletion** authorization (via path/basename/glob matching against the SPEC's `## Destructive Operations` section). It does NOT parse SQL patterns for authorization. So even though SPEC §Destructive Operations explicitly declares "4× `DROP POLICY IF EXISTS platform_admin_bypass ON public.<table>;` are the ONLY destructive ops authorized" (S-IRON-RULE-32 criterion), the gate cannot consume this authorization at all. The 4 active DROP POLICY lines are flagged unconditionally.

This is the FIRST migration in the project's history to use `DROP POLICY` after the Iron Rule 32 hook was installed (M1_5_FULL_AUTO_PIPELINE, 2026-05-11). Past migrations either didn't use it (most) or used `REVOKE` (which is NOT in the destructive patterns list, line 75-90 of `destructive-ops-declared.mjs`). So this gap was latent until now.

## Why Executor cannot proceed autonomously

- **Iron Rule 32:** "Bypass requires Daniel's explicit go-ahead in the chat, never a flag."
- **Executor skill autonomy playbook:** "Pre-commit hook fails → Fix root cause, re-stage, new commit (never --amend, never --no-verify)." The "root cause" is the gate's architectural gap, which is OUT OF SCOPE for this SPEC.
- **CLAUDE.md Iron Rule 32:** "Non-overridable. Same regime as Rule 31: never bypass with `--no-verify`."

## Current state (live)

| Item | Status |
|---|---|
| Migration applied to live DB | ✅ Yes (4 policies present, verified) |
| Migration file written to disk | ✅ Yes (`supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql`) |
| Migration file staged | ✅ Yes |
| Migration file COMMITTED | ❌ No (gate blocks) |
| MODULE_MAP.md staged | ✅ Yes |
| MODULE_MAP.md committed | ❌ No (gate blocks) |
| Pre-execution git tag | ✅ Created (`pre-M1-rls-bypass-20260518-1731`) |
| Pipeline lock | ✅ Claimed (`executor-rls-bypass`) — still held |
| Stage 2A 4 creation modals | UNBLOCKED in DB (RLS now permits platform-admin writes); ERP-side change not committed |

**Critical observation:** the DB ALREADY has the 4 new policies. Reverting them via "DROP POLICY platform_admin_bypass" rollback (SPEC §6) would require... committing the same SQL pattern. Same gate failure. The DB and source control are now temporarily out of sync.

## Options for Foreman / Architect / Daniel

| Option | Description | Cost | Risk |
|---|---|---|---|
| A | Daniel grants one-time explicit `--no-verify` bypass for this Executor run only. Executor commits with the flag, then surfaces this in EXECUTION_REPORT for posterity. | LOW (5 min) | LOW — DB already has the change; rollback path exists if needed |
| B | Foreman authors emergency micro-SPEC `IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION` extending `destructive-ops-auth-parser.mjs` to parse SQL patterns from SPEC §Destructive Operations sections. Then re-run Executor. | MEDIUM (1-2h) | LOW — fixes the gap permanently |
| C | Roll back DB via separate apply_migration with `DROP POLICY platform_admin_bypass` × 4, leave SPEC re-open until Option B ships. | MEDIUM (30 min) | MEDIUM — Stage 2A modals re-block; pipeline-lock churn |
| D | Restructure migration to avoid `DROP POLICY` (use `CREATE POLICY` without idempotent guard) — but SPEC §Destructive Operations + Brief §3.2 explicitly mandate idempotency via DROP IF EXISTS. Would require SPEC amendment. | HIGH (SPEC re-author) | MEDIUM — violates idempotency contract |

**Executor recommendation:** Option A (Daniel one-time go-ahead) — fastest path; DB already in target state; Option B can be authored asynchronously as follow-up SPEC; risk is minimal because the destructive ops are the EXACT ones the SPEC authorized.

## Suggested re-dispatch line

> Daniel grants one-time `--no-verify` bypass for executor-rls-bypass session on commit 1 (migration + MODULE_MAP.md) AND commit 2 (retrospective). Executor proceeds. Author Option-B follow-up SPEC after this SPEC closes 🟢.

## Pipeline lock status

`executor-rls-bypass` lock held. NOT released — waiting for Foreman's decision.

## Files staged but not committed

- `A  supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql`
- `M  modules/Module 1 - Inventory Management/docs/MODULE_MAP.md`
