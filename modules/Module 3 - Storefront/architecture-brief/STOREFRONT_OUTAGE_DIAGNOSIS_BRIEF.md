# Storefront Outage — Emergency Diagnosis Brief

**Author:** opticup-architect (Cowork, 2026-05-15 evening)
**Type:** READ-ONLY emergency diagnosis. NO writes, NO fixes, NO commits except the diagnosis report.
**Severity:** PRODUCTION OUTAGE — Prizma's public storefront shows 0 products across all categories.
**Owning module:** Module 3 — Storefront (consumer side); root cause likely in Module 1.5 / public data layer
**Suspect SPEC:** `STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15` (merged to main earlier today; 6 new mirror tables + 9 triggers + 8 view rewrites + `security_invoker=on` flips)
**Mode:** Single-pass diagnosis. Run on Sonnet (faster, sufficient for this scope).

---

## 1. Purpose

Daniel reports the production storefront at `prizma-optic.co.il` shows **0 products** across all categories (משקפי שמש, מסגרות ראייה, מותגים, etc.), and the homepage is broken. The site worked correctly earlier today. The most likely cause is the `STOREFRONT_PUBLIC_DATA_LAYER` merge (5th merge of the day, ~hours before the breakage report).

This Brief defines a READ-ONLY diagnosis run. The executor's job is to determine **what specifically is broken**, **why**, and **what the minimal fix is**. The executor must NOT apply the fix in this run — Daniel decides whether to fix-forward or `git revert` after seeing the diagnosis.

---

## 2. Context — What we know

- `STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15` merged to main today. It:
  - Created 6 mirror tables: `branches_public`, `storefront_config_public`, `media_public`, `brands_public`, `inventory_images_public`, `inventory_public`.
  - Created 9 trigger functions to keep mirror tables in sync with private base tables.
  - Rewrote 8 `v_storefront_*` views to read from the mirror tables instead of private base tables.
  - Flipped views to `security_invoker=on`.
  - REVOKE'd anon SELECT on 6 private base tables + `v_crm_lead_first_touch`.
  - GRANT'd anon SELECT on the 6 new `_public` tables.
  - Smoke matrix passed 7/7 at the time of merge (~hours ago).
  - Foreman Review reported `v_storefront_products` latency 480ms → 44ms post-fix; cross-tenant leak probes 0/0; trigger E2E 26/26 PASS.

- Yet Daniel sees: **0 products on every category page on the live site.** Homepage broken. Site previously worked.

- The Sentinel reported `H-NEW-25-1` (carry from 5 cycles ago): `v_storefront_products.updated_at does not exist` consumer error. That alert pre-dates today's SPEC and may or may not be related.

- Hypotheses (each must be investigated):
  - **H1:** The mirror tables (`inventory_public`, `brands_public`, etc.) are empty for Prizma's tenant_id — the initial backfill on SPEC execution may have failed silently, or only ran for demo, or only ran for a subset of rows.
  - **H2:** The triggers backfill on INSERT/UPDATE but the **initial seed migration** for existing rows (1133 inventory rows on Prizma) didn't run for production.
  - **H3:** The rewritten `v_storefront_*` views have a WHERE clause or JOIN condition that filters out all of Prizma's rows (e.g., visibility flag, brand-cascade column, image-paths cache not populated).
  - **H4:** The `security_invoker=on` flip broke anon access — RLS on the new `_public` tables may have a USING clause that returns 0 rows for anon (anon's JWT has no tenant_id claim by design — RLS must permit anon globally on `_public` tables).
  - **H5:** Vercel cached an old build of the storefront from before the merge, but the views/tables changed — schema drift between code expectation and live DB.
  - **H6:** A non-obvious side effect of the REVOKE on private base tables — e.g., a function/view that anon needs still tries to reach through to a now-locked base table.

---

## 3. Read List (mandatory)

Read in this order:

1. `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/SPEC.md` — what was supposed to happen
2. `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/EXECUTION_REPORT.md` — what actually ran
3. `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/FOREMAN_REVIEW.md` — what was verified
4. `docs/PUBLIC_DATA_LAYER.md` — the canonical reference for the new architecture
5. `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — current storefront state
6. The 8 rewritten views — fetch the live DDL via Supabase MCP `execute_sql` against `pg_views`:
   - `v_storefront_products`, `v_storefront_brands`, `v_storefront_categories`, `v_storefront_media`, `v_storefront_branches`, `v_storefront_config`, `v_storefront_reviews`, `v_storefront_components`

---

## 4. Diagnostic Probes (mandatory, in this order)

Run each probe against **production Supabase** (project `tsxrrxzmdxaenlvocyit`). All are SELECT-only — zero writes.

### 4.1 Verify the actual user-visible failure

1. Open `https://prizma-optic.co.il/` in Chrome via `mcp__Claude_in_Chrome` tools. Confirm: products absent, homepage broken.
2. Open Chrome DevTools Network tab. Capture the actual XHR / fetch calls to Supabase that the page makes. Note:
   - URL of each request
   - HTTP status code returned
   - Response body (especially: is it 200 with empty array, 4xx with error, 5xx with crash)
3. Open Chrome DevTools Console tab. Capture any JS errors.
4. Report the failing call(s) verbatim in §6.1 of the diagnosis report.

### 4.2 Probe row counts in mirror tables (Prizma tenant)

Prizma's tenant_id is in `tenants` table where `slug='prizma-optic'` — fetch it first, then probe:

```sql
-- Replace <PRIZMA_TENANT_ID> with the actual UUID
SELECT 'inventory_public' AS tbl, count(*) FROM inventory_public WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'brands_public', count(*) FROM brands_public WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'inventory_images_public', count(*) FROM inventory_images_public WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'branches_public', count(*) FROM branches_public WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'storefront_config_public', count(*) FROM storefront_config_public WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'media_public', count(*) FROM media_public WHERE tenant_id = '<PRIZMA_TENANT_ID>';
```

Compare to private base table counts:

```sql
SELECT 'inventory' AS tbl, count(*) FROM inventory WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'brands', count(*) FROM brands WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'inventory_images', count(*) FROM inventory_images WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'branches', count(*) FROM branches WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'storefront_config', count(*) FROM storefront_config WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'media_library', count(*) FROM media_library WHERE tenant_id = '<PRIZMA_TENANT_ID>';
```

**Expected per Foreman Review:** 1133 rows in `inventory` ≈ 1133 in `inventory_public`. **If counts diverge → H2 (initial seed failure) is confirmed.**

### 4.3 Probe view output as anon

Simulate an anon call to `v_storefront_products`:

```sql
SET LOCAL ROLE anon;
SELECT count(*) FROM v_storefront_products WHERE tenant_id = '<PRIZMA_TENANT_ID>';
RESET ROLE;
```

**If count = 0 but mirror table has rows → H3 (view filter) or H4 (RLS).**

### 4.4 Probe RLS policies on mirror tables

```sql
SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
WHERE tablename LIKE '%_public' ORDER BY tablename, policyname;
```

**Look for:** does each `_public` table have a policy that PERMITS anon SELECT (not a tenant_id-scoped one — anon has no JWT claim, so a tenant-scoped policy returns 0 rows for anon)?

### 4.5 Probe GRANTs on mirror tables

```sql
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name LIKE '%_public' AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY table_name, grantee;
```

**Expected:** anon should have SELECT on all 6 `_public` tables. If missing → H4 confirmed.

### 4.6 Probe view definitions

```sql
SELECT viewname, definition FROM pg_views
WHERE viewname LIKE 'v_storefront_%' ORDER BY viewname;
```

Read each definition. For `v_storefront_products` specifically:
- Does it reference `_public` tables or `_private` tables?
- Does the WHERE clause filter on a column like `is_published`, `visibility`, `is_active`, `has_sellable_inventory`?
- Does the WHERE filter return 0 rows for Prizma's current data?

Sample the actual data:

```sql
-- What does inventory_public look like for Prizma?
SELECT id, tenant_id, visibility, is_active, category, brand_id
FROM inventory_public
WHERE tenant_id = '<PRIZMA_TENANT_ID>'
LIMIT 5;

-- What does brands_public look like for Prizma?
SELECT id, tenant_id, has_sellable_inventory, is_active
FROM brands_public
WHERE tenant_id = '<PRIZMA_TENANT_ID>'
LIMIT 5;
```

**If a cached aggregate column (`has_sellable_inventory`, `image_paths`) is NULL or false for every row → cache never populated → H3 confirmed.**

### 4.7 Probe pg_trigger to verify triggers fired during SPEC execution

```sql
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND (event_object_table IN ('inventory', 'brands', 'media_library', 'inventory_images', 'branches', 'storefront_config'))
ORDER BY event_object_table, trigger_name;
```

Confirm triggers exist. Then check if there's evidence the initial backfill ran:

```sql
-- Compare oldest mirror row's created_at to private table's oldest
SELECT 'inventory' AS tbl, min(created_at) AS oldest FROM inventory WHERE tenant_id = '<PRIZMA_TENANT_ID>'
UNION ALL SELECT 'inventory_public', min(created_at) FROM inventory_public WHERE tenant_id = '<PRIZMA_TENANT_ID>';
```

If `inventory_public.oldest` is "today" while `inventory.oldest` is months ago → backfill happened but is recent (good); if mirror is missing oldest rows entirely → backfill was incomplete.

### 4.8 Probe Vercel deployment state

Via `mcp__2dc271a5-...__list_deployments` + `get_deployment` against the Prizma storefront project. Check:
- Latest deployment timestamp
- Was there a deployment AFTER the SPEC merged to main? (If no → Vercel still serves old build → H5)
- Build logs for any errors

### 4.9 Probe what the storefront code expects

Locate the actual Supabase query the storefront makes for the products page. Likely in the sibling repo `opticup-storefront`. The Cowork session has access via mounted folder if cloned; otherwise read the EXECUTION_REPORT for any code change in the storefront repo this SPEC made (it may have rewritten storefront query code to use new column names).

If storefront code queries `v_storefront_products.updated_at` and that column doesn't exist on the new view (Sentinel H-NEW-25-1) → that's a third independent failure mode.

---

## 5. Decision Tree — Map probe results to root cause + fix path

After all probes complete, the diagnosis report's §7 must classify the root cause into ONE of:

| Root cause | Probe signature | Recommended fix | Effort | Risk |
|---|---|---|---|---|
| **RC-A: Empty mirror tables** | §4.2 mirror counts << private counts | Re-run backfill migration for Prizma | LOW (single migration) | LOW |
| **RC-B: Missing anon GRANT** | §4.5 missing anon SELECT | Apply `GRANT SELECT ON <table> TO anon` | LOW (single SQL) | LOW |
| **RC-C: RLS too restrictive** | §4.4 policy filters by JWT claim only | Add anon-permissive RLS or rewrite policy | MEDIUM | MEDIUM (RLS changes) |
| **RC-D: View WHERE filter eliminates all rows** | §4.6 view def + sample data shows filter mismatch | Rewrite the view OR fix the cached column populator | MEDIUM | MEDIUM |
| **RC-E: `has_sellable_inventory` cache never populated** | §4.6 `brands_public.has_sellable_inventory=false` for all Prizma rows | Trigger backfill / fix trigger logic | LOW | LOW |
| **RC-F: Vercel cache** | §4.8 no deployment after merge | Force redeploy on Vercel | TRIVIAL | LOW |
| **RC-G: Storefront code expects schema that doesn't exist** | §4.9 + §4.6 column mismatch | Fix the view OR the storefront code | MEDIUM | MEDIUM |
| **RC-H: Multiple compounding** | More than one of the above | Sequence fixes RC-A → RC-B → RC-E → others | varies | varies |

If diagnosis points to RC-A through RC-G with high confidence → fix-forward is the recommendation. If diagnosis is **ambiguous** or signs of deeper damage → recommend `git revert` of the merge commit instead.

---

## 6. Deliverable — `STOREFRONT_OUTAGE_DIAGNOSIS_REPORT.md`

Path: `modules/Module 3 - Storefront/architecture-brief/STOREFRONT_OUTAGE_DIAGNOSIS_REPORT.md`

Required sections:

1. **§1 — Headline** (3 lines max): what's broken, root cause classification (RC-A..H), recommended action (fix-forward vs revert).
2. **§2 — User-visible symptom** — what Daniel sees on the live site, with the failing Network call(s) verbatim.
3. **§3 — Probes run + results** — every probe from §4 of this Brief with its actual output.
4. **§4 — Root cause** — single most likely RC class with evidence.
5. **§5 — Fix path** — exact SQL / commands needed to fix, NOT executed yet.
6. **§6 — Rollback option** — the exact `git revert <commit-hash>` command for the merge commit, with the commit hash filled in from `git log`.
7. **§7 — Confidence level** — HIGH / MEDIUM / LOW. If LOW → recommend revert over fix-forward.
8. **§8 — Hebrew summary to Daniel** — 4 lines max, plain language: what's broken, why, recommended action.

---

## 7. Constraints

- **READ-ONLY.** No SQL writes. No code changes. No file edits except the diagnosis report itself.
- **No `git revert` execution.** Daniel decides after seeing the report.
- **No fix application.** Even if the fix is obvious (e.g., a missing `GRANT SELECT TO anon`) — write it in §5, do not apply.
- **No interference with the active Pipeline.** There is another Claude Code session running the `M1_LENS_PHASE_1B_GAP_CLOSURE` Pipeline. This diagnosis runs in a separate Claude Code session on a DIFFERENT branch or on develop without conflicting commits. If branches conflict — STOP and escalate.
- **One commit only:** the diagnosis report. Commit message: `docs(m3): storefront outage diagnosis 2026-05-15 evening`.
- **Iron Rule 32:** Destructive operations = None.

---

## 8. Hebrew summary template (executor returns this)

```
אבחון השבתת הסטורפרונט הסתיים. דוח: modules/Module 3 - Storefront/architecture-brief/STOREFRONT_OUTAGE_DIAGNOSIS_REPORT.md.
מה שבור: [שורה אחת בעברית פשוטה].
שורש הבעיה: RC-[A/B/C/D/E/F/G/H] — [שורה אחת].
ההמלצה: [תיקון מהיר / revert של המיזוג]. רמת ביטחון: [גבוהה/בינונית/נמוכה].
```

---

*End of Brief. Emergency diagnosis only — Daniel decides fix path after reading the report.*
