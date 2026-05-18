# SPEC — M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist + Foreman, Claude Code Opus 4.7 1M)
> **Authored on:** 2026-05-18 night (IDT)
> **Module:** 1 — Inventory Management
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md` (SEALED)
> **Plan position:** Stage 2A unblocker (closes Stage 2A's 🟡 carry T-BLOCK-2; must ship 🟢 before Stage 2B is authored)

---

## 0. Pre-Authoring Reality Check

### 0.1 Brief read in full

Brief read in full 2026-05-18 night. Stage 2A's FOREMAN_REVIEW §7 (T-BLOCK-2 escalation) read for context. Architect's read on Foreman's Option A — corrected: direct `is_platform_super_admin()` call inside policy USING/WITH CHECK is leaner than JWT-claim mint. Brief takes Architect's path.

### 0.2 Pre-flight verifications (live Supabase MCP, 2026-05-18 night)

All 5 pre-flight checks PASSED. Captured here as the SPEC's authority:

| Check | Result | Source |
|---|---|---|
| `public.is_platform_super_admin()` exists, callable, SECURITY DEFINER, returns boolean | ✅ Exists. Body: `SELECT EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid() AND role = 'super_admin' AND status = 'active')` | `pg_proc` JOIN `pg_namespace` query — function fully matches Brief §1 description |
| `platform_admins` table has ≥1 active super_admin with real `auth_user_id` | ✅ 1 row: `dannylis669@gmail.com` (Daniel) — 3 platform_admins total, 1 active super_admin | `SELECT COUNT(*) FROM platform_admins WHERE role='super_admin' AND status='active' AND auth_user_id IS NOT NULL` → 1 |
| `platform_admin_bypass` policy does NOT exist on any of the 4 target tables | ✅ Confirmed absent. Each table has exactly 3 policies: `owner_view`, `public_view`, `service_bypass`. | `SELECT policyname FROM pg_policies WHERE tablename IN ('lens_brand','lens_design','lens_variant','contact_lens_variant')` — 12 rows returned (3 per table × 4 tables); no `platform_admin_bypass` row anywhere |
| RLS enabled on all 4 tables | ✅ `relrowsecurity=true` on all 4 (forced=false) | `pg_class` query |
| No code reference to `platform_admin_bypass` anywhere in repo | ✅ Only references are in Brief + ACTIVATION_PROMPT + Stage 2A retrospective files. No DB code, no JS, no CSS. | `grep -r "platform_admin_bypass" .` → 4 documentation files only |

**Pre-flight verdict:** clean — SPEC can ship. All Brief §1 evidence is repo-current.

### 0.3 Runtime semantics rehearsal (Iron Rule 5.3 — RLS WRITE-path)

This SPEC's pattern is the FIRST direct-function-call-in-policy-clause in the project. Rehearsal of all caller classes against the new policy:

| Caller class | JWT claims | `is_platform_super_admin()` returns | New policy USING/WITH CHECK | Existing policies (OR-combined) | Net effect |
|---|---|---|---|---|---|
| Daniel (platform super admin, Google OAuth session) | `sub = <Daniel's auth.users.id>`, `aud='authenticated'` | `true` (auth.uid()=Daniel's uid, matches active super_admin row) | both true | owner_view false (NULL = NULL is NULL), public_view N/A for INSERT, service_bypass false | **INSERT permitted** ✅ |
| Tenant manager (demo, PIN-auth) | `sub = <fake uid>`, `tenant_id = '<demo-uuid>'` | `false` (auth.uid() not in platform_admins active super_admins) | both false | owner_view: true ONLY if `owner_tenant_id = jwt.tenant_id` | **INSERT into global (owner_tenant_id=NULL) → fails 403 ✅** (negative test); **INSERT into own tenant row → permitted via owner_view ✅** (tenant write path preserved) |
| Anon client (no JWT) | no `request.jwt.claims` set | `false` (auth.uid() returns NULL → query returns no row → EXISTS=false) | both false | owner_view false, public_view N/A for INSERT, service_bypass false | **INSERT fails 403** ✅ |
| service_role (server-side admin tooling, Edge Functions) | `role='service_role'` | irrelevant (service_role bypasses RLS by Supabase platform default) | irrelevant | service_bypass: `qual=true` matches | **INSERT permitted** ✅ (unchanged behavior) |

**Three traps eliminated by rehearsal:**

- **NULL-comparison trap:** `auth.uid() = NULL` evaluates to NULL, not true — but the function uses `EXISTS (SELECT ... WHERE auth_user_id = auth.uid())`. If `auth.uid()` is NULL, EXISTS returns false (because the WHERE clause filters out the row), not NULL. ✅ Safe.
- **Policy-evaluation-order trap:** RLS policies are OR-combined for the same operation. The new `platform_admin_bypass` is ADDITIVE — it does not weaken any existing policy. Tenants still write only their own tenant rows via `owner_view`. Anon still gets nothing. Service_role still bypasses everything. ✅ Safe.
- **NULL vs false on EXISTS trap:** `EXISTS()` is guaranteed to return boolean (never NULL). ✅ Safe.

**Runtime semantics rehearsed: yes — evidence captured.**

### 0.4 Pre-existing schema drift caught at pre-flight (NOT this SPEC's scope)

During the policy enumeration query I noted: `contact_lens_variant.public_view.cmd='ALL'` while sibling tables `lens_brand`/`lens_design`/`lens_variant` have `public_view.cmd='SELECT'`. Minor inconsistency in the existing schema; the `WITH CHECK` is null on all 4 anyway so behavior is essentially SELECT-only in practice (a non-SELECT op against an all-public_view row would fail any required WITH CHECK). **OUT OF SCOPE for this SPEC.** Logged as `F-PRE-1` in FINDINGS at SPEC author time so the Executor's FINDINGS.md can carry it forward. Future cleanup SPEC.

### 0.5 Lessons applied from prior FOREMAN_REVIEWs

| Source | Lesson | Honored here? |
|---|---|---|
| `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/FOREMAN_REVIEW.md` P-AUTHOR-1 | "§0.4 DB Schema Rehearsal MUST include RLS-policy WRITE-path probe" | YES — §0.2 captures the full pg_policies enumeration BEFORE seeding the SPEC. The very gap Stage 2A's FR identified is closed by this SPEC's pre-flight discipline. |
| Same FR P-AUTHOR-2 | "Sibling-pattern symmetry verify" | YES — §3 S-MIGRATION-IDEMPOTENT criterion verifies the 4 CREATE blocks have byte-identical structure (single Shared Edit Block §3a). |
| Same FR P-EXEC-1 | "Pre-stage diff of sibling files" | YES — Executor instructed in ACTIVATION_PROMPT to diff the 4 CREATE blocks byte-for-byte before stage. |
| Same FR P-EXEC-2 | "State-swap consumer audit" | N/A — no client-side state changes in this SPEC. |
| Memory `feedback_no_polish_by_validation.md` | "If zero changes needed, STOP and escalate" | YES — §5 stop-trigger: pre-flight already verified 0/4 policies exist; any post-migration probe showing 0/4 added → STOP escalate. |
| Stage 1 P-AUTHOR-2 | "List `docs/FILE_STRUCTURE.md` in §8" | YES — §8 lists with `DEFERRED — TECH_DEBT entry` annotation. |
| Cross-Reference Check rule | "Run grep for new names" | YES — §11 documents. |

### 0.6 Pre-existing untracked files survey

Captured 2026-05-18 night from `git status --porcelain | grep '^??'` — same 10 untracked + 4 M-tracked files as Stage 2A SPEC §0.7. The Brief author dropped a 5th architecture-brief file (`M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md` + `_ACTIVATION_PROMPT.md`). **Executor discipline:** selective `git add` by explicit filename for every commit. NO `git add -A`. The architecture-brief files belong to the Architect, not this SPEC's commit.

### 0.7 Baselines

| Symbol | Source | Metric | Value (captured 2026-05-18 night) |
|---|---|---|---|
| `BASE_POLICIES_PER_TABLE` | live DB | `COUNT(*) FROM pg_policies WHERE tablename = <each>` | 3 per table × 4 = 12 total |
| `BASE_FUNCTION_EXISTS` | live DB | `public.is_platform_super_admin` in pg_proc | 1 row (SECURITY DEFINER, STABLE) |
| `BASE_ACTIVE_SUPER_ADMINS` | live DB | `platform_admins` rows w/ role='super_admin' + status='active' + auth_user_id NOT NULL | 1 |
| `BASE_MIGRATION_PATTERN` | repo | most recent `supabase/migrations/` prefix | `20260518130007_` |
| `BASE_GLOBAL_DESIGNS` | live DB | `lens_design` global rows | 145 (86 glasses + 34 contact_lens + 25 accessory) |

---

## 1. Goal

Add a new RLS policy `platform_admin_bypass` to each of the 4 global lens-catalog tables (`lens_brand`, `lens_design`, `lens_variant`, `contact_lens_variant`) that grants ALL operations to users for whom `public.is_platform_super_admin()` returns true. This unblocks Stage 2A's 4 creation modals (which submit-fail with RLS 403 today) AND establishes the canonical "function-call inside policy clause" pattern for future similar admin bypass needs (M11 supplier portal, M13 loyalty config, M14 platform settings).

---

## 1.5 Schema Impact

ZERO new tables. ZERO new columns. ZERO new functions. **4 new RLS policies via ONE migration.**

```sql
-- Pseudocode (full text in §3a Shared Edit Block):
DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_brand;
CREATE POLICY platform_admin_bypass ON public.lens_brand
  FOR ALL TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
-- Repeat × 3 more (lens_design, lens_variant, contact_lens_variant).
```

Migration file: `supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql`.

Application method: Supabase MCP `apply_migration` (Level 2 autonomy — Brief D5 explicitly authorizes single-DB project covers demo + Prizma).

Impact on existing policies: **none.** Existing `owner_view` / `public_view` / `service_bypass` policies remain byte-identical. The new policy is ADDITIVE (RLS policies are OR-combined for the same operation, so the new policy grants additional access without weakening existing constraints).

---

## 2. Background & Motivation

Stage 2A (`M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A`) closed 🟡 with T-BLOCK-2 escalated to Architect: Stage 2A's 4 creation modals submit-fail with RLS 403 because no RLS policy permits a non-service-role platform admin to write to the 4 global lens-catalog tables. The Architect's read (Brief 2026-05-18 night) chose a direct function-call-in-policy approach over JWT-claim mint, since `public.is_platform_super_admin()` already exists and is callable from inside RLS policy clauses. This SPEC implements that decision.

Once shipped 🟢: Stage 2A's modals submit successfully, the version badge increments on first edit, the adoption count reflects reality, and Stage 2B (Excel import dialog) becomes the next viable build.

---

## 3. Success Criteria (Measurable)

| # | ID | Criterion | Expected | Verify command |
|---|----|-----------|----------|----------------|
| 1 | S-BRANCH | Branch `develop`, repo clean at close | "nothing to commit, working tree clean" | `git status` |
| 2 | S-COMMITS | Commits produced on top of START_COMMIT | 2-3 commits (1 migration + 1 closure, optional 1 hotfix) | `git log <START>..HEAD --oneline \| wc -l` → 2-3 |
| 3 | S-MIGRATION-FILE | Migration file exists at expected path with correct prefix pattern | 1 file, prefix `20260518` | `ls supabase/migrations/20260518*m1_platform_catalog_rls_write_bypass.sql` → exit 0 |
| 4 | S-MIGRATION-CONTENT | Migration file contains 4 DROP POLICY IF EXISTS + 4 CREATE POLICY blocks | grep -c each = 4 | `grep -c "DROP POLICY IF EXISTS platform_admin_bypass" <file>` → 4; `grep -c "CREATE POLICY platform_admin_bypass" <file>` → 4 |
| 5 | S-MIGRATION-IDEMPOTENT | Safe-to-replay: every CREATE preceded by its DROP IF EXISTS in same file | order check | manual diff: in the file, line N: DROP for table T → line N+M: CREATE for table T. 4 pairs. |
| 6 | S-MIGRATION-USES-FUNCTION | Every USING/WITH CHECK clause calls `public.is_platform_super_admin()` (8 calls total: 4 USING + 4 WITH CHECK) | grep -c = 8 | `grep -c "public.is_platform_super_admin()" <file>` → 8 |
| 7 | S-MIGRATION-APPLIED | All 4 new policies exist on live DB after apply | 4 new rows in pg_policies | Supabase MCP `execute_sql`: `SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND policyname='platform_admin_bypass' AND tablename IN ('lens_brand','lens_design','lens_variant','contact_lens_variant')` → 4 |
| 8 | S-MIGRATION-CMD-ALL | Each new policy has `cmd='ALL'` (not split per op) | 4 rows all `cmd=ALL` | Supabase MCP: `SELECT cmd FROM pg_policies WHERE policyname='platform_admin_bypass'` → 4 rows, all `ALL` |
| 9 | S-MIGRATION-USING-WITH-CHECK | Each new policy has BOTH USING and WITH CHECK clauses set to `is_platform_super_admin()` | 4 rows with both `qual` AND `with_check` not null, both containing function name | Supabase MCP query: `qual IS NOT NULL AND with_check IS NOT NULL AND qual ILIKE '%is_platform_super_admin%' AND with_check ILIKE '%is_platform_super_admin%'` → 4 rows |
| 10 | S-MIGRATION-EXISTING-INTACT | Existing 3 policies per table are byte-identical to pre-SPEC | 12 rows unchanged | Supabase MCP: compare `qual` for `owner_view` / `public_view` / `service_bypass` across all 4 tables against §0.2 baseline texts |
| 11 | S-IRON-RULE-15 | Canonical RLS pattern honored — function call inside USING/WITH CHECK | Reviewer audit | manual review |
| 12 | S-IRON-RULE-21 | No collision — `platform_admin_bypass` is new policy name | 0 pre-existing | §0.2 + §11 documented |
| 13 | S-IRON-RULE-32 | `## Destructive Operations` section declares 4 DROP POLICY IF EXISTS as the only destructive op | declared | this SPEC §Destructive Operations |
| 14 | S-VERIFY-INTEGRITY | Iron Rule 31 gate passes | exit 0 or 2 | `npm run verify:integrity` |
| 15 | S-VERIFY-STAGED | `npm run verify -- --staged` passes | exit 0 | run command |
| 16 | S-NO-CLIENT-CHANGES | Zero JS / CSS / HTML changes in this SPEC | `git diff --name-only` shows ONLY migration file + docs | `git diff --name-only START..HEAD -- '*.js' '*.css' '*.html'` → empty |
| 17 | S-NO-POLISH | Real DB changes ship — 4 new policies created | `S-MIGRATION-APPLIED` returns 4 | if Executor finds policies already exist pre-apply → STOP escalate (per §5) |
| 18 | S-VFV-POSITIVE-LENS-BRAND | Platform admin can INSERT a global row into `lens_brand` (owner_tenant_id=NULL) | 1 new row | Tester sets JWT claims to mimic Daniel's session, INSERT, verify row exists |
| 19 | S-VFV-POSITIVE-LENS-DESIGN | Same on `lens_design` | 1 new row | Tester |
| 20 | S-VFV-POSITIVE-LENS-VARIANT | Same on `lens_variant` | 1 new row | Tester |
| 21 | S-VFV-POSITIVE-CONTACT-VARIANT | Same on `contact_lens_variant` | 1 new row | Tester |
| 22 | S-VFV-NEGATIVE-LENS-BRAND | Tenant manager INSERT into `lens_brand` with owner_tenant_id=NULL → 403 | RLS error | Tester sets JWT claims to mimic demo tenant manager, INSERT, expect failure |
| 23 | S-VFV-NEGATIVE-LENS-DESIGN | Same on `lens_design` | 403 | Tester |
| 24 | S-VFV-NEGATIVE-LENS-VARIANT | Same on `lens_variant` | 403 | Tester |
| 25 | S-VFV-NEGATIVE-CONTACT-VARIANT | Same on `contact_lens_variant` | 403 | Tester |
| 26 | S-VFV-CLEANUP | All test rows created during VFV deleted at end | 0 lingering rows from Tester | Tester documents DELETE statements |
| 27 | S-SESSION-CONTEXT | Stage 2A's 🟡 status updated to "unblocked — RLS bypass shipped" | Foreman closure block added | manual file diff |

**8 of the 27 criteria are Tester-observable** (S-VFV-POSITIVE-* × 4 + S-VFV-NEGATIVE-* × 4); **19 are Executor-measurable** including S-MIGRATION-APPLIED via Supabase MCP. S-VFV-CLEANUP is operational discipline observable by Foreman during closure verification.

---

## 3a. Shared Edit Block — Migration SQL (the SAME edit applies to 4 tables)

Per Stage 2A FR P-AUTHOR Author Proposal #1 (multi-file identical edits): declare the per-table block ONCE; Executor expands to 4 tables in the migration file.

### Block A — RLS policy per table

**Insertion location:** in the migration file, in this exact order (preserves alphabetical sort for readability): `contact_lens_variant`, `lens_brand`, `lens_design`, `lens_variant`.

**Per-table SQL (byte-identical except `<TABLE>` token):**

```sql
DROP POLICY IF EXISTS platform_admin_bypass ON public.<TABLE>;
CREATE POLICY platform_admin_bypass ON public.<TABLE>
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
```

**Apply to:** `contact_lens_variant`, `lens_brand`, `lens_design`, `lens_variant`.

**Full migration file content (Executor writes verbatim):**

```sql
-- M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS — adds platform-super-admin RLS bypass on 4 global lens-catalog tables.
-- Author: opticup-strategic (Foreman, Module Strategist) — 2026-05-18 night IDT.
-- Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md
-- Predecessor: Stage 2A 🟡 (T-BLOCK-2 escalation closes here).
-- Idempotent: DROP POLICY IF EXISTS precedes each CREATE.
-- Pattern: canonical "function-call inside policy clause" (Iron Rule 15 evolution).
--   public.is_platform_super_admin() returns true iff auth.uid() matches an active super_admin in platform_admins.
--   Policy is ADDITIVE — existing owner_view / public_view / service_bypass policies untouched.
-- Rollback: DROP POLICY IF EXISTS platform_admin_bypass ON each of the 4 tables.

DROP POLICY IF EXISTS platform_admin_bypass ON public.contact_lens_variant;
CREATE POLICY platform_admin_bypass ON public.contact_lens_variant
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_brand;
CREATE POLICY platform_admin_bypass ON public.lens_brand
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_design;
CREATE POLICY platform_admin_bypass ON public.lens_design
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_variant;
CREATE POLICY platform_admin_bypass ON public.lens_variant
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
```

Reviewer can verify the block's content once and check per-table conformance via single `grep -c` (S-MIGRATION-USES-FUNCTION). No per-table line-by-line re-verification needed.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file, run read-only SQL (Level 1)
- Create the migration file at the exact path declared in §1.5
- Apply migration via `mcp__claude_ai_Supabase__apply_migration` with the project_id `tsxrrxzmdxaenlvocyit` (Level 2 autonomy — DDL authorized by this SPEC §1.5 + Brief D5)
- Commit + push with selective `git add` by explicit filename
- Run verify scripts
- Re-run pre-flight queries to confirm baseline

### What REQUIRES stopping and reporting

- ANY pre-existing `platform_admin_bypass` policy on any of the 4 tables before migration apply → STOP (Brief §12 trigger; polish-by-validation guard)
- ANY changes to existing policies (`owner_view` / `public_view` / `service_bypass`) — out of scope
- ANY JS/CSS/HTML edits — out of scope (S-NO-CLIENT-CHANGES)
- ANY `platform_admins` row inserts/updates — out of scope
- Migration apply returning non-zero or warning → STOP
- Post-apply policy count ≠ 4 for `platform_admin_bypass` → STOP
- Any §3 actual diverging from §3 expected

## 5. Stop-on-Deviation Triggers (additive to CLAUDE.md §9 globals)

- **HARD RULE — NO polish-by-validation closure.** Pre-flight verified 0/4 policies exist 2026-05-18 night. If Executor's pre-apply re-probe finds ANY of the 4 already exist → STOP, write escalation file. Per Brief §12 + memory `feedback_no_polish_by_validation.md`.
- If `is_platform_super_admin()` function disappears or its body changes between pre-flight and apply → STOP, escalate (the SPEC depends on its semantics).
- If the negative test (Tester) shows a tenant manager CAN insert global rows after the migration → STOP, the bypass is too wide; investigate before close.
- If the migration's `DROP POLICY IF EXISTS` somehow drops MORE than what it should (i.e., affects any policy other than `platform_admin_bypass`) → STOP, rollback per §6.
- If `platform_admins` table is empty of active super_admins by the time the Tester runs → STOP (positive test can't run).

## 6. Rollback Plan

If the SPEC fails partway through:

1. Migration rollback:
   ```sql
   DROP POLICY IF EXISTS platform_admin_bypass ON public.contact_lens_variant;
   DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_brand;
   DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_design;
   DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_variant;
   ```
   Apply via Supabase MCP `apply_migration` with this rollback SQL.

2. Git rollback if commit hash is corrupt: `git reset --hard <START_COMMIT>` (Executor records START_COMMIT in EXECUTION_REPORT §1).

3. Pipeline lock release.

4. Notify Foreman; SPEC marked REOPEN, not CLOSED.

## Destructive Operations

The following destructive operations are authorized by this SPEC (per Iron Rule 32):

1. **4× `DROP POLICY IF EXISTS platform_admin_bypass ON public.<table>;`** — for tables `contact_lens_variant`, `lens_brand`, `lens_design`, `lens_variant`.

These are idempotent guards (the policies don't exist pre-apply; the DROPs are no-ops on first run; they're safe-to-replay guards in case of migration re-apply).

NO other destructive operations are authorized:
- No `DROP TABLE`, `DROP COLUMN`, `DROP FUNCTION`.
- No `TRUNCATE`, no `DELETE` without tenant_id-scoped WHERE.
- No file deletes, no mass renames (≥5 files).
- No `git reset --hard`, no `git push --force`, no merge to `main`.
- No modification of `is_platform_super_admin()` function.
- No modification of existing `owner_view` / `public_view` / `service_bypass` policies.

Any encounter with need for destructive ops beyond this list → STOP per Iron Rule 32 protocol.

## 7. Out of Scope (explicit)

- **T-INFRA-1** — `inventory-shell-lens.js gatePlatformAdminTabs()` `?dev=1` honor. Brief §4 explicitly excluded.
- **The 3 misclassified "brands"** (יומיות / חודשיות / שנתיות) — separate curation SPEC.
- Stage 2A's TECH_DEBT items (display_id RPC, FIELD_MAP, lens_type CHECK, detail-pane split, modal-API consolidation) — defer to housekeeping.
- `contact_lens_variant.public_view.cmd='ALL'` vs siblings' `cmd='SELECT'` drift — `F-PRE-1` for future cleanup; not this SPEC.
- ALL client-side code (JS / CSS / HTML / partials) — zero changes.
- `is_platform_super_admin()` function body or definition — unchanged.
- `platform_admins` table or its rows — unchanged.
- Any policy on tables OTHER than the 4 declared.
- Storefront repo — not touched.

## 8. Expected Final State

### New files

- `supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql` (~30-40 LOC including header comment + 4 DROP + 4 CREATE)

### Modified files

- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — prepend RLS bypass closure block above Stage 2A's Foreman closure block (~25 lines)
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — append RLS bypass section (~15 lines)
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` — add 1 row for the new migration file
- _(optionally if Stage 2A's status visibly changes)_ Stage 2A's SESSION_CONTEXT block remains historical record; do NOT rewrite — the new block supersedes via TOP-prepend.

### DB state

- `pg_policies` row count on the 4 tables changes from 3 each (12 total) to 4 each (16 total). New row per table: `policyname='platform_admin_bypass'`, `cmd='ALL'`, `roles='{public}'`, `qual='public.is_platform_super_admin()'`, `with_check='public.is_platform_super_admin()'`.
- Existing 12 rows on the same tables are byte-identical (S-MIGRATION-EXISTING-INTACT).

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` — N/A (no module status change yet; M1 lens-catalog still "in rebuild" until Stage 5)
- `docs/GLOBAL_MAP.md` — N/A (no new shared functions)
- `docs/GLOBAL_SCHEMA.sql` — DEFERRED to Stage 5 Integration Ceremony. The migration file is the canonical record until then.
- `docs/FILE_STRUCTURE.md` — DEFERRED — TECH_DEBT entry recommended per Stage 1 P-AUTHOR-2 (new file under `supabase/migrations/` is a registered directory). Bundle with other deferred entries in housekeeping session.
- Module `SESSION_CONTEXT.md` + `CHANGELOG.md` + `MODULE_MAP.md` — UPDATED per "Modified files" above.

## 9. Commit Plan

2 commits expected (3 if a hotfix is needed mid-pipeline).

| # | Type | Scope | Subject | Files |
|---|------|-------|---------|-------|
| 1 | feat | db | `add platform-super-admin RLS bypass on 4 global lens-catalog tables` | `supabase/migrations/20260518230000_m1_platform_catalog_rls_write_bypass.sql` + `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` |
| 2 | chore | spec | `close M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS with retrospective` | SPEC.md (this file, if amended) + `EXECUTION_REPORT.md` + `FINDINGS.md` + `SESSION_CONTEXT.md` + `CHANGELOG.md` |

Foreman closure commit (Foreman, not Executor): `chore(spec): Foreman closure M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS` — `FOREMAN_REVIEW.md` + `SESSION_CONTEXT.md` (Foreman-block prepend) + this SPEC file if any redaction. Reviewer + Tester each commit their own report files.

## 10. Dependencies / Preconditions

- Stage 2A (`M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A`) closed 🟡 — verified.
- `public.is_platform_super_admin()` exists + behaves per §0.2 — verified.
- `platform_admins` has ≥1 active super_admin — verified (Daniel, `dannylis669@gmail.com`).
- Supabase MCP available (project_id `tsxrrxzmdxaenlvocyit`) — assumed online.
- Migration directory: `supabase/migrations/` (preferred over `migrations/` per recent project pattern).

## 11. Lessons Already Incorporated

See §0.5 for the lessons-table.

Cross-Reference Check (Rule 21 author-time sweep) completed 2026-05-18 night:
- New policy name `platform_admin_bypass` → `grep -r "platform_admin_bypass" .` returns 4 documentation files only (Brief + ACTIVATION_PROMPT + Stage 2A FOREMAN_REVIEW + Stage 2A TEST_REPORT — all references to the PROPOSED policy name, no existing DB/code reference). 0 collisions.
- New migration filename `20260518230000_m1_platform_catalog_rls_write_bypass.sql` → 0 collisions in `supabase/migrations/`.
- 0 new functions, columns, tables, views — nothing else to sweep.

**Cross-Reference Check completed 2026-05-18 night against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE + per-module db-schema.sql + per-module MODULE_MAP + repo-wide grep: 0 collisions / 1 new name introduced cleanly.**

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values in EXECUTION_REPORT.md §2.
- [ ] Migration applied successfully via Supabase MCP, verified by `S-MIGRATION-APPLIED` query showing 4 rows.
- [ ] Existing 12 policies byte-identical (`S-MIGRATION-EXISTING-INTACT`).
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty at close (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in the SPEC folder.
- [ ] Tester's TEST_REPORT.md present with 8 cases (4 positive + 4 negative) reported.
- [ ] Reviewer's REVIEWER_REPORT.md present.
- [ ] Module SESSION_CONTEXT.md / CHANGELOG.md / MODULE_MAP.md updated per §8.
- [ ] All test rows from Tester deleted post-run (`S-VFV-CLEANUP`).
- [ ] Pipeline locks released.

---

**End of SPEC. Dispatch to opticup-executor next.**
