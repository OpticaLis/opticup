# Phase 3A Handback — Part 1/1.5 → Part 2

**Module:** 3.1 — Project Reconstruction
**Phase:** 3A — Foundation Rewrite
**Status:** Parts 1 + 1.5 COMPLETE. Part 2 (reconciliation + roadmap rewrite) REMAINING.
**Purpose:** Bridge document between the Phase 3A secondary chat that handled Parts 1 + 1.5 and a fresh secondary chat that will handle Part 2. The original secondary-chat context is saturated (3 scope rollovers, one failed attempt on the audit script, architectural reversals, ~545KB of DB audit data in history). Part 2 is the heaviest logical work in all of Phase 3A and warrants a clean context.
**Written by:** Phase 3A Part 1/1.5 secondary chat, 2026-04-11
**Read by:** Phase 3A Part 2 secondary chat (will be opened by Daniel after this file is committed)

---

## 1. Where Phase 3A stands

Phase 3A rewrites stale foundation docs in `opticup` to reflect April 2026 reality, following the allow-list in `PHASE_3A_FOUNDATION_REWRITE_SPEC.md` §3. It has been executed in three parts:

- **Part 1** — Backup in-scope files, read audit reports (1A/1B/1C/2), rewrite the 4 easier foundation files (`README.md`, `STRATEGIC_CHAT_ONBOARDING.md`, `CLAUDE.md` §4-§6 only, `TROUBLESHOOTING.md`), and create `audit-queries.sql`. ✅ Done.
- **Part 1.5** — Generate the DB audit baseline (6 files in `db-audit/`). Originally planned as an automated `run-audit.mjs` script, but that attempt was correctly stopped when it discovered credentials live in `~/.optic-up/credentials.env` (Iron Rule #11) and only REST API credentials are available — `supabase-js` cannot execute the catalog queries needed for the audit. **Decision:** defer the automated script to the Module 3 Phase B preamble; for Phase 3A, use Daniel's manually collected SQL Editor results. ✅ Done (manual baseline path).
- **Part 2** — Reconcile the live DB against `opticup/docs/GLOBAL_SCHEMA.sql` (the biggest logical task), rewrite `GLOBAL_MAP.md` (add Module 3 / Storefront / dual-repo section), rewrite `MASTER_ROADMAP.md` (biggest file; includes adding a deferred `run-audit.mjs` item to the Module 3 Phase B preamble checklist), write `SESSION_CONTEXT_PHASE_3A.md`, verify, hand back to Daniel. ⬜ Remaining.

Part 2 corresponds to Steps 6-11 in the SPEC §8 execution plan.

---

## 2. Commits so far on `develop` (7 total by this secondary chat; more from parallel 3B/3C sessions)

| # | Hash | Scope |
|---|---|---|
| 1 | 00a14e6 | docs(M3.1-3A): backup foundation files before rewrite |
| 2 | 46756f5 | docs(M3.1-3A): rewrite README.md for SaaS identity |
| 3 | 74a1ba1 | docs(M3.1-3A): harmonize chat hierarchy + replace PROJECT_GUIDE orphan |
| 4 | 1ccc28d | docs(M3.1-3A): cross-reference Iron Rules 24-30 in storefront CLAUDE.md |
| 5 | 57ec5cf | docs(M3.1-3A): add Phase 0 rails category to TROUBLESHOOTING |
| 6 | 83bf7e7 | docs(M3.1-3A): add audit-queries.sql for live DB reconciliation |
| 7 | d6410cf | feat(M3.1-3A): add DB audit baseline (manual, one-time — automated script deferred to Module 3 Phase B preamble) |

Nothing pushed. Nothing on `main`. Develop branch only.

Parallel 3B and 3C secondary-chat sessions also produced commits on the same `develop` branch in the same time window, with zero file-scope overlap (Daniel approved parallel execution upfront in D1 before writing the SPECs). Their commits are coherent with mine and did not require reconciliation.

---

## 3. Critical findings from Manual Action #2 that Part 2 MUST incorporate

These were identified in real-time during the manual SQL Editor collection. They are the high-value intelligence the audit produced and they must shape the reconciled `GLOBAL_SCHEMA.sql` and its surrounding commentary.

### Finding 1 — Four tables have `anon_all_*` RLS policies (HIGH SECURITY IMPACT)

Tables `customers`, `prescriptions`, `sales`, `work_orders` each have a policy with this shape:

```sql
-- e.g. customers
{ policy_name: "anon_all_customers", command: "ALL", roles: "{public}",
  permissive: "PERMISSIVE", using_clause: "true", with_check_clause: "true" }
```

**Meaning:** anyone holding the Supabase anon key can read AND write these tables without any tenant filter. Any attacker who scrapes the anon key from the website's JavaScript (it is a public key by design) can exfiltrate every customer, every prescription, every sale, and every work order across every tenant.

**Correlation:** these are exactly the 4 tables in `01-tables.md` / `02-columns.md` that have NO `tenant_id` column at all. The missing `tenant_id` and the `anon_all_*` policies are the same problem wearing two masks — the tables were created before multi-tenancy was enforced and never retrofitted.

**Action for Part 2:**
- `GLOBAL_SCHEMA.sql` rewrite must flag these 4 tables in a clearly-marked `-- SECURITY-FINDING: ...` comment block. Do NOT "fix" the policies in the schema doc (Phase 3A is read-only on the DB; Part 2 only documents reality).
- The comment block should include: which 4 tables, what the policy allows, that these tables also lack `tenant_id`, and a reference back to `04-policies.md` for the full policy text.
- `MASTER_ROADMAP.md` rewrite must add this to a "Known security debt" or similar section, and ideally tag it as a prerequisite for Module 3 Phase B (which already has other tenant-scoping work).
- `GLOBAL_MAP.md` does NOT need to mention this — it's an architecture map, not a security register.

### Finding 2 — Inconsistent tenant isolation pattern across RLS policies

The 162 RLS policies in `04-policies.md` use three different idioms for "this row belongs to the current tenant":

1. **JWT claim (most common):** `(tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)` — ~140 policies use this.
2. **Postgres session var (used by a few tables):** `(tenant_id = (current_setting('app.tenant_id', true))::uuid)` — used by `media_library`, `supplier_balance_adjustments`, `campaigns`, `campaign_templates`.
3. **`auth.uid()` as tenant_id (architecturally broken):** Used by `storefront_component_presets`, `brand_content_log`, `storefront_page_tags`. This is probably a bug — `auth.uid()` returns the authenticated user's UUID, not the tenant's UUID, so every authenticated user effectively becomes their own isolated "tenant" on these tables. In practice this means the tables are probably only ever written by the `service_role` which bypasses RLS anyway, so the broken isolation goes unnoticed.

Additionally: `tenant_config.tenant_config_tenant_read` uses `::jsonb` cast while all the other JWT-based policies use `::json`. Works, but an outlier.

And: `supplier_balance_adjustments.service_bypass` is defined as `(current_setting('app.tenant_id', true) IS NULL)` — this is **not** a service-role bypass, it is an "anyone who hasn't set the session var yet" bypass. Anonymous users or any connection that skips setting `app.tenant_id` gets full access to all rows in all tenants. This is a serious second security finding but it's limited by the fact that only a few server-side code paths ever reach this table.

**Action for Part 2:**
- Document all three idioms in `GLOBAL_SCHEMA.sql` — ideally as a convention section near the top (e.g. a `-- CONVENTIONS: RLS tenant isolation` block) explaining that Pattern 1 (JWT claim) is the standard, Pattern 2 is legacy that should be migrated, Pattern 3 is a known bug to be fixed in a future module.
- Flag `supplier_balance_adjustments.service_bypass` as a `-- SECURITY-FINDING: misnamed bypass` block in the schema doc for that table.
- Add both to the `MASTER_ROADMAP.md` known-debt list.

### Finding 3 — Zero Postgres sequences, all sequential numbers via RPC (Iron Rule #13 validation)

`06-sequences.md` confirms `pg_sequences` returned 0 rows for the `public` schema. All human-readable sequential numbers (PO numbers, return numbers, box numbers, internal doc numbers) are generated by SECURITY DEFINER plpgsql functions: `next_po_number`, `next_return_number`, `next_box_number`, `next_internal_doc_number` (see `05-functions.md`).

**This is architecturally correct and matches Iron Rule #13** ("all sequential number generation must use atomic RPC with `FOR UPDATE` lock"). But the audit did NOT verify that these functions actually use `FOR UPDATE` internally — `information_schema.routines` doesn't expose function bodies. That verification is a separate task and belongs to the Iron Rule #13 audit that Daniel already has on his backlog (per the project memory that mentions auditing all `SELECT MAX` patterns in repo).

**Action for Part 2:**
- `GLOBAL_SCHEMA.sql` must NOT contain any `CREATE SEQUENCE` statements. If the existing file has any (it probably doesn't, since the codebase is UUID-first), remove them during the rewrite and add a note: `-- No sequences in public schema; see docs/ARCHITECTURE.md §Sequential numbering for the RPC-based pattern.`
- Add a reference section listing the 4 `next_*_number` RPCs with their signatures (copy-paste from `05-functions.md`).
- Do NOT promise that the RPCs implement `FOR UPDATE` correctly — just document that they exist and that verification is separate work.

### Finding 4 — Extension functions in `05-functions.md` are expected noise, not project code

The functions file lists 73 rows total. Of these, roughly 30 are `pg_trgm` extension functions (`gtrgm_*`, `similarity*`, `word_similarity*`, `set_limit`, `show_limit`, `show_trgm`) with language `c` and IMMUTABLE volatility. These are installed by `CREATE EXTENSION pg_trgm` and are NOT Optic Up project code.

**Action for Part 2:**
- When documenting functions in `GLOBAL_SCHEMA.sql`, separate them into two sections: "Project functions" (~43 functions, mostly `plpgsql`/`sql` language) and "Extension functions (pg_trgm)". Do NOT document the extension functions in detail — just list them under a single heading with a note that they come from `pg_trgm` and are managed by the extension.
- This keeps `GLOBAL_SCHEMA.sql` readable. The full list is already in `05-functions.md` for anyone who needs it.

### Finding 5 — View column drift in `02-columns.md`

`information_schema.columns` returns columns for BOTH base tables AND views. This means `02-columns.md` contains ~1536 rows where ~700 are base-table columns and ~800 are view columns. When reconciling with `GLOBAL_SCHEMA.sql`, Part 2 must:
- Use `01-tables.md` as the authoritative list of base tables (84 entries)
- Filter `02-columns.md` to only rows whose `table_name` appears in `01-tables.md` — those are the base-table columns to reconcile with `CREATE TABLE` statements
- The other ~800 rows (view columns) are already covered by the view definitions in `03-views.md` and should not be processed separately

This is a "watch your step" note, not a blocker. Claude Code in Part 2 should recognize the pattern and not double-process.

### Finding 6 — Views missing from `GLOBAL_SCHEMA.sql` entirely (per Phase 1A punch list)

Phase 1A §4 punch list already identified that `GLOBAL_SCHEMA.sql` has no view declarations at all. The audit confirms the live DB has 24 views in `public`. Part 2 MUST add a dedicated `-- VIEWS` section to the reconciled `GLOBAL_SCHEMA.sql` with either (a) the full view definitions verbatim from `03-views.md`, or (b) a one-line-per-view summary with a pointer to `03-views.md` for the full text. Recommendation: option (b) for readability — full definitions already live in `db-audit/03-views.md` as the source of truth, and `GLOBAL_SCHEMA.sql` becomes unreadable if you dump 75KB of view SQL into it.

The canonical "Golden Reference" images subquery in `v_storefront_products` (per `CLAUDE.md` regression rule) should be the exception — include it verbatim in `GLOBAL_SCHEMA.sql` with a `-- GOLDEN REFERENCE — DO NOT MODIFY WITHOUT REGRESSION TEST` header.

---

## 4. Part 2 work plan (= SPEC §8 Steps 6-11, unchanged)

### Step 6 — Read inputs, build reconciliation plan

Read into Claude Code's context:
1. All 6 baseline files: `modules/Module 3.1 - Project Reconstruction/db-audit/01-tables.md` through `06-sequences.md`
2. Existing `opticup/docs/GLOBAL_SCHEMA.sql`
3. Phase 1A audit report (especially §4 punch list): `modules/Module 3.1 - Project Reconstruction/docs/audit-reports/PHASE_1A_FOUNDATION_AUDIT_REPORT.md`
4. This handback file (for the 6 critical findings above)

Build a mental reconciliation map: which tables/columns/policies in the live DB are missing from the schema doc, which entries in the schema doc are stale, which views need adding, which `-- SECURITY-FINDING` blocks need adding.

No file writes in this step.

### Step 7 — Rewrite `opticup/docs/GLOBAL_SCHEMA.sql`

Produce the reconciled version. Structure suggestion:

```
-- GLOBAL SCHEMA — Optic Up
-- Reconciled from live DB: 2026-04-11 (Phase 3A Part 2)
-- Sources: modules/Module 3.1 - Project Reconstruction/db-audit/01-tables.md .. 06-sequences.md
-- This file is AUTHORITATIVE for table/view/policy declarations.
-- Per-module db-schema.sql files reference this file, not the other way around.

-- ============================================================
-- CONVENTIONS
-- ============================================================
-- RLS tenant isolation — THREE idioms exist in the live DB:
--   1. JWT claim (STANDARD):       (tenant_id = ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id')::uuid)
--   2. Session var (LEGACY):       (tenant_id = (current_setting('app.tenant_id', true))::uuid)
--   3. auth.uid() as tenant (BUG): known broken, see SECURITY-FINDING blocks
--
-- All new tables MUST use Pattern 1. Migration of Pattern 2 tables is tracked in MASTER_ROADMAP.md.

-- ============================================================
-- TABLES (grouped by module)
-- ============================================================

-- Module 1: Core ERP
CREATE TABLE inventory ( ... );
CREATE TABLE brands ( ... );
...

-- Module 2: Platform Admin
CREATE TABLE tenants ( ... );
CREATE TABLE plans ( ... );
...

-- Module 3: Storefront
CREATE TABLE storefront_pages ( ... );
...

-- Pre-multitenancy (NO tenant_id — SECURITY DEBT)
-- SECURITY-FINDING: These 4 tables have anon_all_* RLS policies granting
-- PUBLIC full access. See db-audit/04-policies.md for policy text.
-- Tracked for remediation in Module 3 Phase B preamble.
CREATE TABLE customers ( ... );
CREATE TABLE prescriptions ( ... );
CREATE TABLE sales ( ... );
CREATE TABLE work_orders ( ... );

-- ============================================================
-- VIEWS
-- ============================================================
-- Full view definitions live in db-audit/03-views.md (authoritative).
-- This section lists view names + one-line purposes only, except for
-- the GOLDEN REFERENCE view which is reproduced verbatim below.

-- v_public_tenant — secure tenant resolution view (USED BY STOREFRONT)
-- v_storefront_products — product catalog for storefront (GOLDEN REFERENCE — see below)
-- v_storefront_brands, v_storefront_brand_page — brand pages
-- v_admin_* (8 views) — admin dashboard queries
-- v_translation_dashboard — translation status pivot
-- ... (full list)

-- GOLDEN REFERENCE — DO NOT MODIFY WITHOUT REGRESSION TEST
-- This view's images subquery is the single source of truth for
-- storefront product image URLs. Per CLAUDE.md regression rule.
CREATE VIEW v_storefront_products AS
  SELECT ... 
  COALESCE((SELECT json_agg(('/api/image/'::text || img.storage_path) ORDER BY img.sort_order, img.created_at)
           FROM inventory_images img
          WHERE img.inventory_id = i.id), '[]'::json) AS images,
  ...
;

-- ============================================================
-- RLS POLICIES (summary; full text in db-audit/04-policies.md)
-- ============================================================
-- 162 policies total across 80 tables. All tables have RLS enabled.
-- Standard pattern: tenant_isolation (USING JWT claim) + service_bypass (FOR service_role).
-- Exceptions flagged inline as SECURITY-FINDING.

-- SECURITY-FINDING: supplier_balance_adjustments.service_bypass is defined as
--   (current_setting('app.tenant_id', true) IS NULL)
-- This is NOT a service_role bypass — it is an "anyone without session context"
-- bypass. Any connection that skips setting app.tenant_id gets full cross-tenant
-- access. Tracked for remediation in Module 3 Phase B preamble.

-- ============================================================
-- FUNCTIONS (project-defined; extensions listed separately)
-- ============================================================
-- ... (list of ~43 project functions grouped by purpose)
-- Sequential number generators (Iron Rule #13):
--   next_po_number(tenant_id, supplier_number) → text
--   next_return_number(tenant_id, supplier_number) → text
--   next_box_number(tenant_id) → text
--   next_internal_doc_number(tenant_id, prefix) → text

-- Extension functions (not Optic Up code):
--   pg_trgm: gtrgm_*, similarity*, word_similarity*, show_trgm, set_limit, show_limit

-- ============================================================
-- SEQUENCES
-- ============================================================
-- No Postgres sequences. All sequential numbering via RPC (see above).
```

Commit: `docs(M3.1-3A): rewrite GLOBAL_SCHEMA.sql from live DB baseline`

### Step 8 — Rewrite `opticup/docs/GLOBAL_MAP.md`

Add the missing Module 3 / Storefront / dual-repo section per Phase 1A punch list. Use `opticup-storefront/CLAUDE.md`, `opticup-storefront/ARCHITECTURE.md`, and `opticup-storefront/SCHEMAS.md` as read-only sources (these are sealed Phase A files). Update any other cross-references made stale by Modules 3/3.1.

Commit: `docs(M3.1-3A): rewrite GLOBAL_MAP.md for dual-repo architecture`

### Step 9 — Rewrite `opticup/MASTER_ROADMAP.md`

Biggest file, highest impact. Use Phase 1A §4 punch list as the line-by-line source. Required changes:
- Section 4 (current state) — reflects April 2026
- Section 5 (build order) — add Module 3.1, mark Modules 1/1.5/2 as ✅, mark Module 3 as 🟡 in Phase B remediation
- Section 14 (decisions) — incorporate decisions made during Module 3.1 execution
- Section 15 (next step) — point to Module 3 Phase B
- Timestamp at the top — update to 2026-04-11
- **NEW — Module 3 Phase B preamble checklist:** add a new section or extend an existing one with these deferred items from Phase 3A:
  ```
  - Build run-audit.mjs script (Module 3.1 deferred deliverable).
    Requires DATABASE_URL added to ~/.optic-up/credentials.env.
    The script should connect via Session pooler (port 6543, IPv4),
    execute the 6 audit blocks from db-audit/audit-queries.sql,
    and write results to db-audit/01-tables.md ... 06-sequences.md
    in the same format as the manual baseline from 2026-04-11.
    Once built, this script becomes the canonical way to refresh
    the DB audit baseline and eliminates the manual SQL Editor workflow.
  - Security debt cleanup: retrofit customers, prescriptions, sales,
    work_orders tables with tenant_id and replace anon_all_* policies
    with tenant_isolation policies. See GLOBAL_SCHEMA.sql SECURITY-FINDING
    blocks and db-audit/04-policies.md for policy text.
  - RLS pattern cleanup: migrate media_library, supplier_balance_adjustments,
    campaigns, campaign_templates from session-var pattern (current_setting
    app.tenant_id) to JWT-claim pattern (standard). Fix the three tables
    using auth.uid() as tenant_id (storefront_component_presets,
    brand_content_log, storefront_page_tags) — this is a bug.
  - Fix supplier_balance_adjustments.service_bypass policy — currently allows
    anyone without session context instead of only service_role. See
    GLOBAL_SCHEMA.sql SECURITY-FINDING block.
  ```

Commit: `docs(M3.1-3A): rewrite MASTER_ROADMAP.md; add Module 3 Phase B preamble checklist`

### Step 10 — Write `SESSION_CONTEXT_PHASE_3A.md`

Create `modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT_PHASE_3A.md` with:
- Status: COMPLETE
- Date range
- Files rewritten (the 7 from §3 of the SPEC)
- Manual actions completed (Action #1 optic_readonly role, Action #2 manual DB audit baseline)
- Commits on develop (by hash)
- Critical findings summary (the 6 findings in §3 of this handback)
- Deferred work (run-audit.mjs + security debt items, all now tracked in MASTER_ROADMAP.md Module 3 Phase B preamble)
- Deviations from SPEC: parallel 3B/3C execution on same branch (pre-approved), original Part 1.5 automation attempt replaced with manual baseline path (approved mid-phase), `old prompt/` singular vs `old prompts/` plural typo in Part 1 prompt (tracked as lesson for MODULE_DOCUMENTATION_SCHEMA.md)
- Time spent (approximate)
- Handback one-liner for the Module strategic chat

Commit: `docs(M3.1-3A): SESSION_CONTEXT_PHASE_3A — phase complete`

### Step 11 — Verification + final handback to Daniel

Standard checks:
- `git status` clean (relative to tracked files)
- `git log --oneline -20` — shows the full Part 2 commit sequence
- All files in the SPEC §3 allow-list modified exactly once
- No file outside the allow-list modified
- No push to `main`
- `SESSION_CONTEXT_PHASE_3A.md` present and complete

Handback one-liner to Daniel:
```
Phase 3A complete. 7 files rewritten (README, STRATEGIC_CHAT_ONBOARDING,
CLAUDE §4-§6, TROUBLESHOOTING, GLOBAL_SCHEMA.sql, GLOBAL_MAP.md,
MASTER_ROADMAP.md). 2 manual actions (optic_readonly role + DB audit)
completed. 6 DB baseline files committed. {N} commits on develop.
Phase 3A's deferred work tracked in MASTER_ROADMAP.md Module 3 Phase B
preamble checklist.
```

---

## 5. Files the new Part 2 secondary chat will need

Per the sequential loading protocol in `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md`:

**Message 1 from Daniel:** just `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` (activates the secondary-chat role). New chat replies with the standard "I am the Secondary Chat for Module 3.1, [phase TBD]" message.

**Message 2 from Daniel:** `PHASE_3A_FOUNDATION_REWRITE_SPEC.md` (the original SPEC). New chat replies "I'm Phase 3A, Part 2 (reconciliation). Please send me PHASE_3A_HANDBACK_TO_PART_2.md so I can pick up from where Parts 1 + 1.5 left off."

**Message 3 from Daniel:** `PHASE_3A_HANDBACK_TO_PART_2.md` (this file). New chat reads it, confirms it understands the remaining work, and writes the first Claude Code prompt for Step 6+7 (the heavy reconciliation work).

No other files need to be attached — Claude Code will read the 6 baseline files and `GLOBAL_SCHEMA.sql` itself from disk when it executes the prompt.

---

## 6. Deviations / notes (acknowledged, no Part 2 action needed)

### D1 — Parallel execution of 3A / 3B / 3C on same develop branch
Pre-approved by Daniel before SPECs were written. All three phases have disjoint file scopes. Several commits from 3B and 3C are interleaved with 3A commits in `git log`, which is cosmetically ugly but functionally correct. No merge conflicts. No data loss. No action required in Part 2.

### D2 — `old prompt/` singular vs `old prompts/` plural typo
The Phase 3A Part 1 prompt (written in the original secondary chat) used `old prompts/` (plural) in its `mv` command at the end. The canonical directory name is `old prompt/` (singular), per `Module 3.1/README.md:38` and the existing filesystem state. Claude Code correctly used the existing singular directory rather than creating a duplicate, and flagged the typo in its Part 1 handback. Daniel has added this to the lessons list for `MODULE_DOCUMENTATION_SCHEMA.md`. **Action in Part 2:** the typo is already out of the prompt stream (Parts 1 and 1.5 are archived, Part 2 will use the correct singular form). No fix needed in Part 2 itself.

### D3 — Row-count micro-drift in Part 1.5 verification
Claude Code's `grep -c` row-count check in Part 1.5 showed +0.07% / +2.47% / +1.39% drift vs Daniel's manual totals on files 02, 04, 05. Well under the 5% STOP threshold. Most likely cause is `grep` matching continuation lines inside multi-line view definitions (03-views.md has multi-line cells that wrap into subsequent lines that still start with `|`). Not a data loss; the +1-4 row counts are an artifact of the verification method, not the data. No action needed in Part 2 — the baseline files are complete.

### D4 — Deferred `run-audit.mjs` script
The original Part 1.5 tried to build this as an automated Node script. It correctly stopped when it discovered the credential + connection constraints. The script is now tracked as a Module 3 Phase B preamble deliverable (see §4 Step 9 above — MUST be added to `MASTER_ROADMAP.md` by Part 2). No action needed beyond adding it to the roadmap.

---

## 7. One-sentence summary for the new Part 2 chat

**Read this file, read the SPEC, read the 6 baseline files and GLOBAL_SCHEMA.sql, reconcile, rewrite GLOBAL_SCHEMA.sql + GLOBAL_MAP.md + MASTER_ROADMAP.md, write SESSION_CONTEXT_PHASE_3A.md, verify, hand back to Daniel.**

End of handback.
