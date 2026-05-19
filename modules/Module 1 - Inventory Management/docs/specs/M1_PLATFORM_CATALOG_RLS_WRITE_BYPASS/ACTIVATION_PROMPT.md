# Activation Prompt — M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS

> Dispatched by: opticup-strategic (Foreman) 2026-05-18 night IDT.
> Pipeline: Path X sequential — Executor → Reviewer → Localhost-Tester → Foreman closure.

---

You are the **opticup-executor**. Load that skill BEFORE any action.

## Your task

Execute the SPEC at:
`modules/Module 1 - Inventory Management/docs/specs/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/SPEC.md`

This is a small surgical SPEC: ONE migration file, 4 DROP + 4 CREATE RLS policies. No client-side code changes. Zero JS/CSS/HTML edits.

## Hard constraints (re-read SPEC §4 + §5 + §Destructive Operations)

1. **NO polish-by-validation closure.** Pre-flight verified 0/4 policies exist 2026-05-18 night. If your pre-apply re-probe finds ANY of the 4 already exist → STOP, write escalation file at `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_rls-policies-already-exist.md`. Memory `feedback_no_polish_by_validation.md` is binding.
2. **DO NOT modify** existing `owner_view` / `public_view` / `service_bypass` policies on the 4 tables.
3. **DO NOT modify** `is_platform_super_admin()` function or `platform_admins` table or its rows.
4. **DO NOT touch** any JS/CSS/HTML/partial file. S-NO-CLIENT-CHANGES enforces this.
5. **Iron Rule 32:** 4× `DROP POLICY IF EXISTS` are the ONLY destructive ops authorized. No `DROP TABLE`/`DROP COLUMN`/`DROP FUNCTION`/`TRUNCATE`. No `git reset --hard`.
6. **Selective `git add` by filename for EVERY commit.** The 10+ pre-existing untracked files (Brief + Stage 2A Brief + others) are NOT yours.
7. **Single migration file:** `supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql`. Full content provided verbatim in SPEC §3a Block A.

## Pre-Action Collision Check

```
node scripts/pipeline-coordination.mjs release --spec-slug M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS --session-id foreman-rls-bypass-author
node scripts/pipeline-coordination.mjs claim --spec-slug M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS --branch-owned develop --files-owned-globs "supabase/migrations/**,modules/Module 1 - Inventory Management/docs/specs/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/**,modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md,modules/Module 1 - Inventory Management/docs/CHANGELOG.md,modules/Module 1 - Inventory Management/docs/MODULE_MAP.md" --session-id executor-rls-bypass
```

Release your lock at the very end of your run.

## Execution outline

1. **Pre-apply re-probe** — run `SELECT policyname FROM pg_policies WHERE schemaname='public' AND policyname='platform_admin_bypass' AND tablename IN ('lens_brand','lens_design','lens_variant','contact_lens_variant')`. Expect 0 rows. If ≥1 row → STOP, polish-by-validation guard fires.
2. **Write migration file** at `supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql`. Copy the SQL from SPEC §3a Block A verbatim.
3. **Apply migration** via `mcp__claude_ai_Supabase__apply_migration` with `project_id='tsxrrxzmdxaenlvocyit'` and name `m1_platform_catalog_rls_write_bypass`.
4. **Verify** — `SELECT COUNT(*) FROM pg_policies WHERE policyname='platform_admin_bypass' AND tablename IN (...)` → MUST be 4. Per-table: `SELECT cmd, qual, with_check FROM pg_policies WHERE policyname='platform_admin_bypass'` → 4 rows all with `cmd='ALL'`, qual + with_check both containing `is_platform_super_admin`.
5. **Verify existing policies UNTOUCHED** — `SELECT policyname, qual FROM pg_policies WHERE tablename IN (...) AND policyname IN ('owner_view','public_view','service_bypass')` → 12 rows, qual texts match the §0.2 baseline texts in SPEC.
6. **Commit 1** — `feat(db): add platform-super-admin RLS bypass on 4 global lens-catalog tables` — add the migration file + MODULE_MAP.md row. Selective git add.
7. **Update docs** — SESSION_CONTEXT.md (prepend block), CHANGELOG.md (append section), MODULE_MAP.md (already in Commit 1 if pre-staged; otherwise add here).
8. **Commit 2** — `chore(spec): close M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS with retrospective` — SPEC folder retrospective files + docs updates.
9. **Push** `origin develop`.
10. **Release pipeline lock.**

## Deliverables

1. **2 commits on `develop`** (3 if a hotfix is needed).
2. **EXECUTION_REPORT.md** in SPEC folder with §3 actual values captured + 1-10 self-scores on 4 dimensions.
3. **FINDINGS.md** in SPEC folder (carry forward `F-PRE-1` from SPEC §0.4 if no new findings: `contact_lens_variant.public_view.cmd='ALL'` drift vs siblings — INFO severity, future cleanup).
4. **Pre-execution git tag:** `pre-M1-rls-bypass-20260518-NNNN`.

## When you finish

Emit ONE Hebrew status line: verdict + commit count + policy count post-apply (must be 4) + any blockers.

Return final summary with:
- Verdict (🟢/🟡/🔴)
- Commit hashes
- Migration status (applied / failed / rolled back)
- §3 actual values per Executor-measurable criterion (19 items)
- FINDINGS count + severity
- 2 author-skill + 2 executor-skill improvement proposals
- Hebrew status line

Begin.
