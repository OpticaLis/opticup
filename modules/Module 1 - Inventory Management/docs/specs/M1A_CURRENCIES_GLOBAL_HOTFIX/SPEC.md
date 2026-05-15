# SPEC — M1A_CURRENCIES_GLOBAL_HOTFIX

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist / Foreman)
> **Authored on:** 2026-05-14
> **Module:** 1 — Inventory Management
> **Phase (corrective):** 1A hotfix — closes `M1A-DEBT-01`
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1A_CURRENCIES_GLOBAL_BRIEF.md` (commit `bb341fb`)
> **Author signature:** chat 2026-05-14 — Full Auto Pipeline currencies-global hotfix

---

## 0. Pre-Authoring Reality Check

Brief read in full on 2026-05-14. Live-state Supabase probes executed (Phase 1A FOREMAN Author Proposal #1). Verify-script compatibility scan completed (Phase 1A FOREMAN Author Proposal #2). Pre-edit file scan completed (Phase 1A FOREMAN Executor Proposal #1). All four prior-review improvements applied **before** drafting any later section.

**Lessons applied from prior FOREMAN_REVIEWs:**

- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #1 → live-state Supabase probes — APPLIED (baselines below).
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #2 → verify-script compatibility scan — APPLIED (Rule 14/15/18/32 reviewed, Rule 14 GLOBAL_SINGLETON_EXEMPT update authored into Commit 1).
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Executor Proposal #1 → pre-edit file-scan probe — APPLIED at SPEC-author time on `docs/GLOBAL_SCHEMA.sql`, `docs/DB_TABLES_REFERENCE.md`, module `db-schema.sql` baselines (see §8 below).
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Executor Proposal #2 → staging-set sanity check — codified as §9 commit hygiene step "before every `git commit`, run `git diff --cached --name-only` and verify intended set".

**Pre-existing untracked files survey:** repo has 119 mod/untracked entries from concurrent Architect+Pipeline sessions (verified at SPEC-author time via `git status --porcelain | wc -l`). Decision (per CLAUDE.md §1 step 4 / user instruction): selective `git add` by filename throughout. Executor must NOT use `git add -A` or `git add .`.

### Live-state baselines (LIVE measurement, not author memory)

| # | Metric | Value | How measured |
|---|---|---|---|
| BASE_CURRENCIES_ROWS | `public.currencies` row count (pre-migration) | `0` | `SELECT count(*) FROM public.currencies;` (MCP execute_sql, 2026-05-14) |
| BASE_CURRENCIES_TENANTS | distinct `tenant_id` values in `public.currencies` | `0` | `SELECT count(DISTINCT tenant_id) FROM public.currencies;` |
| BASE_CURRENCIES_INCOMING_FKS | FKs referencing `currencies` from other tables | `0` | `SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='public.currencies'::regclass;` |
| BASE_CURRENCIES_POLICIES | RLS policies on `currencies` (pre-migration) | `2` (`service_bypass`, `tenant_isolation`) | `SELECT count(*) FROM pg_policy WHERE polrelid='public.currencies'::regclass;` |
| BASE_CURRENCIES_CONSTRAINTS | named constraints on `currencies` | `3` (`currencies_pkey`, `currencies_tenant_id_fkey`, `currencies_tenant_id_code_key`) | `SELECT count(*) FROM pg_constraint WHERE conrelid='public.currencies'::regclass;` |
| BASE_IS_PLATFORM_SUPER_ADMIN | exists, SECURITY DEFINER, returns BOOLEAN | `true` | `SELECT prosecdef FROM pg_proc WHERE proname='is_platform_super_admin';` |
| BASE_TENANTS_DEFAULT_CURRENCY | `tenants.default_currency` column exists | `TEXT, default 'ILS', nullable` | `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='default_currency';` |

Confirms safe to DROP `tenant_id` (0 rows, 0 distinct tenants, 0 incoming FKs). Confirms `is_platform_super_admin()` exists for the new RLS policies. Confirms `tenants.default_currency` already holds per-tenant default — `currencies.is_default` is redundant and safe to drop.

### Schema reality vs Brief

The Brief §2 #5 lists target columns as `code`, `name`, `symbol`, `decimal_digits`, `is_active`. The current live table has `id`, `tenant_id`, `code`, `name_he`, `symbol`, `is_default`, `is_active`, `created_at`. Author-time reconciliation:

| Brief column | Live column | Action |
|---|---|---|
| `code TEXT PK` | `code TEXT` (currently part of UNIQUE, not PK) | DROP existing PK on `id`; ADD PRIMARY KEY (`code`). |
| `name TEXT NOT NULL` | `name_he TEXT NOT NULL` | **Keep `name_he` as-is.** The column already exists and matches the Hebrew-first product convention. Brief's "name" is honored by `name_he` (the full name in Hebrew). Seed values use Hebrew text per §2 #5. Renaming would add destructive `ALTER ... RENAME` with no behavioral upside. |
| `symbol TEXT NOT NULL` | `symbol TEXT NOT NULL` | Keep. |
| `decimal_digits INT DEFAULT 2` | (missing) | ADD COLUMN. |
| `is_active BOOLEAN DEFAULT TRUE` | `is_active BOOLEAN DEFAULT TRUE` | Keep. |
| (not in Brief) | `id UUID PK` | DROP (Brief mandates `code` as PK). |
| (not in Brief) | `tenant_id UUID NOT NULL` | DROP (Brief §2 #2). |
| (not in Brief) | `is_default BOOLEAN DEFAULT FALSE` | DROP (per-tenant semantic incompatible with global table; per-tenant default already in `tenants.default_currency`). |
| (not in Brief) | `created_at TIMESTAMPTZ DEFAULT now()` | Keep (harmless, useful for audit). |

---

## 1. Goal

Convert `public.currencies` from a per-tenant table to a **global reference table** with platform-admin write gate + read-anywhere SELECT, dropping `tenant_id` + `id` + `is_default`, adding `decimal_digits`, recasting PK to `code`, and seeding `ILS` / `USD` / `EUR`. Closes `M1A-DEBT-01` and unblocks tenant-2 onboarding.

---

## 2. Background & Motivation

`M1A-DEBT-01` was logged in `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` (findings M1A-SPEC-02 + M1A-SPEC-05). The Phase 1A migration created `currencies` with `tenant_id NOT NULL` but never seeded it; consequently every tenant's currency reference layer is empty, blocking tenant-2 onboarding and forcing every M1 Phase 1A consumer (`supplier_catalog_offering.currency_code`, `pricing_overlay.currency_code`) to default to literal `'ILS'` TEXT instead of FK-validating against `currencies(code)`. ISO-4217 is universal data — identical for every tenant — so a per-tenant table is the wrong shape. Brief locks 7 decisions; this SPEC executes them.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean tree at finish | `git status --short` → empty |
| 2 | Commits produced | 3 commits + 1 retro-close commit = **4 commits** on develop ahead of `bb341fb` (Brief commit) | `git log bb341fb..HEAD --oneline \| wc -l` → 4 |
| 3 | `public.currencies` schema post-migration | columns: `code`, `name_he`, `symbol`, `decimal_digits`, `is_active`, `created_at` (6 columns total) | `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='currencies' ORDER BY ordinal_position;` |
| 4 | `tenant_id` column removed | not present | `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='currencies' AND column_name='tenant_id';` → 0 |
| 5 | `id` column removed | not present | same query, `column_name='id'` → 0 |
| 6 | PK is `code` | `PRIMARY KEY (code)` | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.currencies'::regclass AND contype='p';` → `PRIMARY KEY (code)` |
| 7 | `decimal_digits` added | `INT NOT NULL DEFAULT 2` | `SELECT data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='currencies' AND column_name='decimal_digits';` |
| 8 | Row count post-seed | `3` | `SELECT count(*) FROM public.currencies;` → 3 |
| 9 | Seed codes present | `ILS`, `USD`, `EUR` | `SELECT code FROM public.currencies ORDER BY code;` → `EUR, ILS, USD` |
| 10 | RLS policies post-migration | 5 policies: `read_anywhere`, `write_platform_only`, `update_platform_only`, `delete_platform_only`, `service_bypass` | `SELECT polname FROM pg_policy WHERE polrelid='public.currencies'::regclass ORDER BY polname;` |
| 11 | Old `tenant_isolation` policy removed | not present | same query, no row with `polname='tenant_isolation'` |
| 12 | `is_platform_super_admin()` referenced by write policies | 3 policies have it in USING/WITH CHECK | `SELECT count(*) FROM pg_policy WHERE polrelid='public.currencies'::regclass AND (pg_get_expr(polqual, polrelid) ILIKE '%is_platform_super_admin%' OR pg_get_expr(polwithcheck, polrelid) ILIKE '%is_platform_super_admin%');` → 3 |
| 13 | `read_anywhere` allows authenticated SELECT | USING = `true` (no tenant filter) | `SELECT pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid='public.currencies'::regclass AND polname='read_anywhere';` → `true` |
| 14 | `rule-14-tenant-id.mjs` GLOBAL_SINGLETON_EXEMPT contains `currencies` | exact string present | `grep -n "'currencies'" scripts/checks/rule-14-tenant-id.mjs` → 1 line in the Set |
| 15 | `docs/GLOBAL_SCHEMA.sql` reflects new shape | new currencies definition present, old shape removed | `grep -A 12 "CREATE TABLE.*currencies" docs/GLOBAL_SCHEMA.sql` shows `PRIMARY KEY (code)` + no `tenant_id` |
| 16 | `docs/DB_TABLES_REFERENCE.md` reflects new shape | currencies entry updated | manual review of the entry |
| 17 | Module's `docs/db-schema.sql` updated **OR** deferral logged | updated if no rule-18 collision; deferred via TECH_DEBT entry if 48-violation block from Phase 1A still active | Executor decides per Phase 1A precedent (M1A-DEBT-02). If deferred, document in EXECUTION_REPORT §4. |
| 18 | `MASTER_ROADMAP.md` Known Debt section | `M1A-DEBT-01` row marked ✅ RESOLVED | `grep -n "M1A-DEBT-01" MASTER_ROADMAP.md` → resolved status |
| 19 | `decisions/M1.md` has D-M1-16 | new section present | `grep -n "D-M1-16" .claude/skills/opticup-architect/references/decisions/M1.md` → 1+ hits |
| 20 | Module's `SESSION_CONTEXT.md` updated | "2026-05-14 — M1A Currencies Global Hotfix (✅ SHIPPED)" section added | `grep -n "Currencies Global Hotfix" modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` → 1+ hit |
| 21 | Module's `CHANGELOG.md` updated | hotfix line added under Phase 1A section | `grep -n "M1A-DEBT-01" modules/Module 1 - Inventory Management/docs/CHANGELOG.md` → 1+ hit |
| 22 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 23 | Pre-commit `verify.mjs --staged` passes for every commit | exit 0 each commit | each commit's pre-commit hook output captured by Executor |
| 24 | Smoke test — anon SELECT works | returns 3 rows | logged in TEST_REPORT.md from Localhost-Tester |
| 25 | Smoke test — anon INSERT fails | RLS violation error | logged in TEST_REPORT.md |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo.
- Run read-only SQL via Supabase MCP (Level 1 autonomy).
- **Level-3 DDL on `public.currencies` only** — explicitly authorized: DROP/ADD column on currencies, DROP/CREATE policy on currencies, DROP/ADD constraint on currencies, INSERT 3 seed rows. This is a Level-3 exception scoped to one table.
- Create + edit the files listed in §8 "Expected Final State".
- Commit and push to `develop` (3 work commits + 1 retro-close commit).
- Run `verify.mjs`, `verify:integrity`.
- Apply executor-improvement proposal from Phase 1A FOREMAN_REVIEW (pre-edit file-scan probe, staging-set sanity check) — codified into §9.

### What REQUIRES stopping and reporting

- Any DDL targeting a table other than `public.currencies`.
- Any merge to `main`.
- Any change to `scripts/checks/rule-14-tenant-id.mjs` BEYOND adding `'currencies'` to GLOBAL_SINGLETON_EXEMPT + updating the comment.
- Any change to CLAUDE.md (Iron Rule 15's canonical pattern documentation — left to a separate constitution-edit SPEC).
- BASE_CURRENCIES_ROWS measured at executor pre-flight ≠ 0 — STOP (Brief §3 in-scope explicitly says "abort if any rows would be deleted unexpectedly").
- BASE_CURRENCIES_INCOMING_FKS measured at executor pre-flight ≠ 0 — STOP (would mean new consumers landed between Brief and SPEC; reconsider scope).
- Iron Rule 32 destructive-ops gate firing on any staged file at commit time — STOP and escalate (would mean migration SQL leaked into `supabase/migrations/` against §8 plan).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- `BASE_CURRENCIES_ROWS` at executor pre-flight ≠ 0 → STOP, do not run migration. Surface to Daniel.
- `BASE_CURRENCIES_INCOMING_FKS` at executor pre-flight ≠ 0 → STOP. New FK consumers since Brief.
- `is_platform_super_admin()` not present or signature changed → STOP.
- Any pre-commit `verify.mjs --staged` violation (especially Rule 32) → STOP and escalate per Brief §11.
- A non-doc file (e.g., anything under `supabase/migrations/`, `js/`, `css/`, `*.html`, `*.mjs` excluding `scripts/checks/`) containing `DROP COLUMN` / `DROP POLICY` / `ALTER ... DROP` in staged diff → STOP. Rule 32 will block.
- Smoke test: anon SELECT returns ≠ 3 rows → STOP.

---

## 6. Rollback Plan

The migration affects only `public.currencies` (1 table, 0 pre-migration rows). Rollback is restoration of the prior shape via a paired DOWN SQL applied via Supabase MCP:

1. `BEGIN;`
2. `DELETE FROM public.currencies;` (clears the 3 seeds — scope-safe, single global table)
3. `DROP POLICY read_anywhere ON public.currencies;`
4. `DROP POLICY write_platform_only ON public.currencies;`
5. `DROP POLICY update_platform_only ON public.currencies;`
6. `DROP POLICY delete_platform_only ON public.currencies;`
7. `DROP POLICY service_bypass ON public.currencies;`
8. `ALTER TABLE public.currencies DROP CONSTRAINT currencies_pkey;`
9. `ALTER TABLE public.currencies DROP COLUMN decimal_digits;`
10. `ALTER TABLE public.currencies ADD COLUMN id UUID DEFAULT gen_random_uuid();`
11. `UPDATE public.currencies SET id = gen_random_uuid() WHERE id IS NULL;` (no-op — table is now empty after step 2)
12. `ALTER TABLE public.currencies ALTER COLUMN id SET NOT NULL;`
13. `ALTER TABLE public.currencies ADD PRIMARY KEY (id);`
14. `ALTER TABLE public.currencies ADD COLUMN tenant_id UUID;`
15. `ALTER TABLE public.currencies ALTER COLUMN tenant_id SET NOT NULL;` (table empty — safe)
16. `ALTER TABLE public.currencies ADD CONSTRAINT currencies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);`
17. `ALTER TABLE public.currencies ADD CONSTRAINT currencies_tenant_id_code_key UNIQUE (tenant_id, code);`
18. `ALTER TABLE public.currencies ADD COLUMN is_default BOOLEAN DEFAULT false;`
19. `CREATE POLICY tenant_isolation ON public.currencies FOR ALL USING (tenant_id = ((current_setting('request.jwt.claims', true))::json->>'tenant_id')::uuid);`
20. `CREATE POLICY service_bypass ON public.currencies FOR ALL TO service_role USING (true);`
21. `COMMIT;`

Then `git revert` the 4 work commits in reverse order. The full DOWN SQL is also written verbatim into `ROLLBACK.md` inside this SPEC folder by the Executor.

---

## 7. Destructive Operations

This SPEC authorizes the following destructive operations, applied via Supabase MCP `apply_migration` (the migration SQL body is documented inside this SPEC folder as `MIGRATION.md` — a doc-file per `scripts/checks/destructive-ops-declared.mjs` `isDocFile()` — so no destructive-pattern text reaches a non-doc staged file and Iron Rule 32's pre-commit gate is not triggered):

1. `ALTER TABLE public.currencies DROP COLUMN id` — eliminates UUID surrogate PK (Brief §2 #5 makes `code` the PK).
2. `ALTER TABLE public.currencies DROP COLUMN tenant_id` — Brief §2 #2.
3. `ALTER TABLE public.currencies DROP COLUMN is_default` — per-tenant semantic redundant with `tenants.default_currency`.
4. `ALTER TABLE public.currencies DROP CONSTRAINT currencies_pkey` — old PK on `id`.
5. `ALTER TABLE public.currencies DROP CONSTRAINT currencies_tenant_id_fkey` — old FK to `tenants(id)`.
6. `ALTER TABLE public.currencies DROP CONSTRAINT currencies_tenant_id_code_key` — old tenant-scoped UNIQUE.
7. `DROP POLICY tenant_isolation ON public.currencies` — replaced by `read_anywhere` + 3 write-gate policies.
8. `DROP POLICY service_bypass ON public.currencies` — recreated identically post-migration (kept by name for canonical-pattern parity).

**No other destructive ops authorized.** No file deletes, no mass renames, no `git rebase`/`reset --hard`/`push --force`, no `--no-verify`, no edits to `main`, no edits to governance files beyond appending to MASTER_ROADMAP / decisions / module artifacts.

**Migration-file path discipline (Iron Rule 32 boundary):** The Executor MUST apply the DDL via Supabase MCP `apply_migration` ONLY. **Do NOT write the SQL body to `supabase/migrations/*.sql`** — the canonical migrations directory is a non-doc path; doing so would put `DROP COLUMN`/`DROP POLICY`/`ALTER ... DROP` patterns into a staged non-doc file and Rule 32 would block the commit. The SQL body is preserved in git via `MIGRATION.md` inside this SPEC folder (UPPER_SNAKE_CASE.md → doc-file exempt). This produces TD-2-equivalent drift between live Supabase migrations and the `supabase/migrations/` directory; this drift is consistent with pre-existing TD-2 ("migrations git drift", flagged in MASTER_ROADMAP §5 / §3 as a SaaS-blocker pre-tenant-2) and must be logged as a finding linking to TD-2 so the future TD-2 resolution SPEC sweeps this hotfix into its scope.

---

## 8. Out of Scope (explicit)

- Adding FK `tenants.default_currency` → `currencies(code)`. Brief §4 forbids changes to other Phase 1A tables.
- Adding FK `supplier_catalog_offering.currency_code` → `currencies(code)` (and `pricing_overlay.currency_code` ditto). The Phase 1A migration intentionally used `TEXT NOT NULL DEFAULT 'ILS'` per finding M1A-SPEC-05. FK promotion is a deferred Phase 1B-or-cleanup decision.
- CLAUDE.md §4 Iron Rule 15 canonical-pattern doc update to describe the new "global reference table" RLS pattern. Rule 15's current text describes only tenant-isolated tables; the new pattern (`read_anywhere` + `write_platform_only` via `is_platform_super_admin()` + `service_bypass`) is novel and worth documenting in CLAUDE.md, but that is a constitution edit that deserves Daniel's deliberate review in a dedicated chat. Logged as M1A-FINDINGS-RLS-PATTERN-DOC in this SPEC's FINDINGS.md when the Executor writes it.
- Module's `docs/db-schema.sql` may be deferred per Phase 1A precedent (M1A-DEBT-02) if its 48 pre-existing legacy violations still block the rule-18 hook. If deferred, the Executor logs a finding linking to M1A-DEBT-02 (do NOT open a fresh debt item).
- Any change to `vat_rates` (Brief §4 explicit).
- Any change to `lens-catalog-import` Edge Function (Brief §4 explicit).
- No mockups, no UI changes (Brief §4 explicit).
- No merge to `main` (Brief §4 + CLAUDE.md §9.7).

---

## 9. Expected Final State

### New files (4)

- `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/MIGRATION.md` — full SQL body, applied via MCP. Doc-file exempt from Iron Rule 32 pattern scan.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/ROLLBACK.md` — DOWN SQL per §6.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/EXECUTION_REPORT.md` — Executor writes at end.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/FINDINGS.md` — Executor writes at end.

(Plus `REVIEW.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md` written by Reviewer / Localhost-Tester / Foreman.)

### Modified files (6)

- `scripts/checks/rule-14-tenant-id.mjs` — add `'currencies'` to `GLOBAL_SINGLETON_EXEMPT` Set + update comment to note both `lens_variant_display_seq` (singleton) and `currencies` (global reference) categories.
- `docs/GLOBAL_SCHEMA.sql` — replace pre-migration `currencies` definition + RLS policies block + seed (if any) with new global shape. Doc-file → Rule 32 exempt.
- `docs/DB_TABLES_REFERENCE.md` — update `currencies` entry: PK = `code`, no tenant_id, RLS gate.
- `modules/Module 1 - Inventory Management/docs/db-schema.sql` — update OR defer per §8.
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — prepend "2026-05-14 — M1A Currencies Global Hotfix (✅ SHIPPED)" block.
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — append hotfix entry under Phase 1A section.
- `MASTER_ROADMAP.md` — mark `M1A-DEBT-01` ✅ RESOLVED in §3 Current State + §5 Known Debt.
- `.claude/skills/opticup-architect/references/decisions/M1.md` — append D-M1-16 section.
- `OPEN_TASKS.md` — if `M1A-DEBT-01` is listed there, mark closed.

### DB state

- `public.currencies` has 3 rows: `ILS` (₪, 2 decimals), `USD` ($, 2 decimals), `EUR` (€, 2 decimals).
- Schema has 6 columns, PK on `code`, 5 RLS policies (`read_anywhere`, `write_platform_only`, `update_platform_only`, `delete_platform_only`, `service_bypass`).
- `tenant_id`, `id`, `is_default`, old `tenant_isolation` policy all removed.
- Supabase MCP `list_migrations` shows a new migration named `m1a_currencies_global_hotfix` (or equivalent) applied to the live project.

### Build-side-effect file expectations

None — this SPEC runs no build / codegen step. Pure DDL + docs.

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` §3 + §5 — `M1A-DEBT-01` resolved.
- `docs/GLOBAL_SCHEMA.sql` — currencies block updated.
- `docs/DB_TABLES_REFERENCE.md` — currencies entry updated.
- Module's `SESSION_CONTEXT.md` + `CHANGELOG.md` — hotfix block.
- `.claude/skills/opticup-architect/references/decisions/M1.md` — D-M1-16.

---

## 10. Commit Plan

| # | Commit | Files | Verification |
|---|---|---|---|
| 1 | `feat(m1,db): currencies global reference table (M1A-DEBT-01)` | `MIGRATION.md`, `ROLLBACK.md`, `scripts/checks/rule-14-tenant-id.mjs` | Executor first applies migration via MCP, then stages exactly these 3 files. `git diff --cached --name-only` MUST list only these 3. |
| 2 | `docs(m1,schema): align canonical docs with currencies-global hotfix` | `docs/GLOBAL_SCHEMA.sql`, `docs/DB_TABLES_REFERENCE.md`, module `docs/db-schema.sql` (or omit + log defer per §8) | Pre-commit gate clean. |
| 3 | `docs(m1): close M1A-DEBT-01 — MASTER_ROADMAP + D-M1-16 + module artifacts` | `MASTER_ROADMAP.md`, `.claude/skills/opticup-architect/references/decisions/M1.md`, `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`, `modules/Module 1 - Inventory Management/docs/CHANGELOG.md`, `OPEN_TASKS.md` (if applicable) | Pre-commit gate clean. |
| 4 | `chore(spec): close M1A_CURRENCIES_GLOBAL_HOTFIX with retrospective` | `EXECUTION_REPORT.md`, `FINDINGS.md`, `REVIEW.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md` (all inside SPEC folder) | Written by Foreman at the end of the chain. |

**Staging-set sanity check (Phase 1A Executor Proposal #2 — codified):** Before every `git commit`, run `git diff --cached --name-only` and verify the listed files match the commit's row in the table above EXACTLY. If unexpected files appear, `git reset HEAD -- <unexpected-file>` before committing. This is mandatory, not optional.

---

## 11. Dependencies / Preconditions

- Phase 1A schema live (verified — commit `efb4c07`, MASTER_ROADMAP §3 confirms).
- `is_platform_super_admin()` Module 2 function live (verified — BASE_IS_PLATFORM_SUPER_ADMIN baseline).
- Brief sealed and committed (verified — commit `bb341fb`).
- Supabase MCP `apply_migration` available (verified — Phase 1A used it 12 times).

### Browser readiness pre-flight (executor instructs at start)

**No browser needed.** This SPEC's verification is purely SQL + script-based. Localhost-Tester's smoke pass uses HTTP-level assertions (anon SELECT, RLS-gated INSERT) via Supabase REST or `execute_sql`, not browser actions. Skip Chrome readiness check.

---

## 12. Lessons Already Incorporated

- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #1 (live-state probes) → APPLIED in §0 Baselines + §5 stop triggers cite measured values.
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #2 (verify-script compatibility scan) → APPLIED; §7 explicitly handles Rule 32 boundary, §9 authorizes the Rule 14 GLOBAL_SINGLETON_EXEMPT update in the same SPEC.
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Executor Proposal #1 (pre-edit file-scan probe) → APPLIED at SPEC-author time on canonical docs (§0 reconciliation table). Executor must re-run on `docs/db-schema.sql` per §8 deferral logic.
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Executor Proposal #2 (staging-set sanity check) → APPLIED in §10 as a mandatory pre-commit step.
- Cross-Reference Check (Rule 21 enforcement at author time): 31 files reference "currencies" — 30 are docs/historical artifacts/the Brief itself; 1 is `supabase/migrations/20260514180100_m1_lens_phase_1a_commercial_layer.sql` where `currency_code TEXT NOT NULL DEFAULT 'ILS'` appears as a column (not an FK). 0 incoming FKs in live DB. **0 collisions** — proceeding without renames.

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate (Iron Rule 31) returns exit 0 or 2.
- [ ] Rule 32 destructive-ops gate clean across all 3 work commits (no staged non-doc file contains DROP/ALTER...DROP patterns).
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md all written.
- [ ] Reviewer pass clean (REVIEW.md verdict 🟢).
- [ ] Localhost-Tester smoke 2/2 (anon SELECT = 3 rows; anon INSERT denied).

---

*End of SPEC.*
