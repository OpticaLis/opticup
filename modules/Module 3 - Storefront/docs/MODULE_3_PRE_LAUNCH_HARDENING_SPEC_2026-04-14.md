# Module 3 — Pre-Launch Hardening SPEC

**Date:** 2026-04-14
**Author:** Main Strategic
**Executor:** Secondary Chat (משני)
**Module:** Module 3 — Storefront
**Status:** APPROVED PLAN — execute end-to-end under Bounded Autonomy
**Merge policy:** NO `merge to main` and NO DNS switch in this SPEC. Both are explicitly deferred until Daniel's final approval after this SPEC closes.
**Revision:** v2 (2026-04-14) — Part B of M3-SAAS-04 folded in as authorized Level 3 schema change with copy-paste migration SQL, per Strategic directive to maximize single-run progress.

---

## 0. Scope Declaration

This SPEC is authoritative for the **pre-launch hardening work package**:

1. Fix 3 HIGH RLS alerts on storefront tables (M6-RLS-01/02/03)
2. Fix 4 HIGH SaaS hardcoded-value alerts (M3-SAAS-01, M3-SAAS-04, M3-SAAS-05, M1-R09-01)
3. Run §4.3 Prizma tenant safety check (defined in §5 below)
4. Run the full 18-test QA suite against demo tenant

This SPEC is NOT authoritative for:
- Any other GUARDIAN_ALERTS.md item (file-size debt, contract wrappers, migration-script hardening, etc.) — those are separate work packages
- Any Storefront repo work — all fixes here are in `opticalis/opticup` (ERP) repo
- Merge to main / DNS switch — deferred pending Daniel's approval after this SPEC's summary

**Phase-label discipline:** This SPEC uses a descriptive filename, not a Module 3 phase letter, per `CLAUDE.md §7` phase-label ownership rule (2026-04-14).

---

## 1. Evidence Gathered (opticup-guardian Step 1)

Every HIGH finding in this SPEC has been verified against live state. Evidence below is the state Secondary should find when they begin; if Secondary's own re-verification disagrees, that is a STOP-on-deviation trigger — escalate to Strategic before proceeding.

### 1.1 RLS Evidence — live Supabase query (2026-04-14)

Query against `pg_policies` for the 3 subject tables confirmed:

| Table | Policy Name | Role | CMD | USING | WITH CHECK |
|---|---|---|---|---|---|
| `storefront_components` | `storefront_components_authenticated_all` | `authenticated` | ALL | `true` | `true` |
| `storefront_pages` | `storefront_pages_authenticated_modify` | `authenticated` | ALL | `true` | `true` |
| `storefront_pages` | `storefront_pages_authenticated_select` | `authenticated` | SELECT | `true` | — |
| `storefront_reviews` | `storefront_reviews_authenticated_all` | `authenticated` | ALL | `true` | `true` |

Each table ALSO has:
- `*_service_all` (role = `service_role`) — correct, leave alone
- `*_anon_read` (role = `anon`) — restricted by status column (`is_active`, `published=true`, `is_visible=true`), correct, leave alone

All 3 tables have `tenant_id UUID NOT NULL` confirmed via `information_schema.columns`. Good.

**Canonical reference pattern** (from `pending_sales`, verified 2026-04-11, documented in `CLAUDE.md §5` Rule 15):

```
service_bypass:   ALL role=service_role USING(true)
tenant_isolation: ALL role=public
                  USING(tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
```

### 1.2 SaaS Hardcoded-Value Evidence

**M3-SAAS-04 — `scripts/sync-watcher.js` lines 45–54 (VERIFIED — two problems with one UUID):**

```javascript
const TENANT_ID = process.env.OPTICUP_TENANT_ID || '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
// ── Prizma-only guard ───────────────────────────────────────
const PRIZMA_TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
if (TENANT_ID !== PRIZMA_TENANT_ID) {
  console.log(`[sync-watcher] Tenant ${TENANT_ID} is not Prizma — Access sync disabled. Exiting.`);
  process.exit(0);
}
```

Problems:
1. **Part A — fallback default**: a missing env var silently targets Prizma. Must become an explicit failure.
2. **Part B — hardcoded tenant UUID as feature gate**: Access sync is currently Prizma-specific, which is fine; but the gating mechanism is a literal UUID. The correct SaaS-shape is a boolean column on `tenants` (consistent with existing flag columns like `require_tracking_before_lock`, `auto_print_on_lock`). This is a Level 3 schema change, but it is **pre-authorized in this SPEC** (§3.2.2 Part B) with exact migration SQL and the exact code refactor. Secondary executes it autonomously.

**Schema evidence gathered 2026-04-14 (Supabase MCP):**
- `tenants` table: 39 columns, no `access_sync_enabled` yet. Existing boolean-flag columns (`is_active`, `require_tracking_before_lock`, `auto_print_on_lock`, `is_super_admin`) establish the precedent pattern.
- 5 tenant rows: `prizma` (id `6ad0781b-...`), `demo`, `test-store-verify`, `test-store-v2`, `test-store-qa`. Only Prizma should initialize to `true`.
- `sync-watcher.js` line 57 creates `sb` (Supabase client with service_role key) — available for a DB lookup before the gate fires, but the async DB call requires wrapping the watcher startup (lines 469+) in a function. Refactor pattern specified in §3.2.2 Part B.

**M3-SAAS-05 — `modules/storefront/studio-shortcodes.js` lines 100–115 (VERIFIED):**

```
wa.me/972533645404         // line ~107
instagram.com/optic_prizma/ // line ~112
```

A TODO(B4) comment already exists acknowledging this. The correct fix is to read from `storefront_config.custom_domain` / `storefront_config.social_whatsapp` / `storefront_config.social_instagram` (or equivalent keys — Secondary must discover the exact keys by reading `storefront_config` rows for Prizma).

**M1-R09-01 — `modules/storefront/studio-brands.js` line 425 (VERIFIED):**

```javascript
<a href="${STOREFRONT_BASE}/brands/${encodeURIComponent(brand.slug || '')}/?t=prizma" target="_blank"
```

Replace `?t=prizma` with `?t=${TENANT_SLUG}` where `TENANT_SLUG` comes from `getTenantConfig('slug')` or equivalent helper (Secondary must locate the helper — pattern is already used elsewhere in the Studio per B1–B4 work).

**M3-SAAS-01 — `inventory.html:12,277` ([UNVERIFIED — POSSIBLY STALE]):**

```
Assumption: GUARDIAN_ALERTS.md claims title tag and header logo show hardcoded "אופטיקה פריזמה" at lines 12 and 277.
Actual state on 2026-04-14 read: line 12 is `<title>Optic Up — מערכת מלאי</title>` (generic, no tenant). Line 277 is a brand search placeholder (unrelated).
To verify: Secondary runs `grep -n "אופטיקה פריזמה\|Prizma" inventory.html` at start of §3.1. If ZERO hits — alert is stale, mark resolved in SPEC summary and move on. If hits exist at other line numbers — fix them using getTenantConfig('name').
Potential severity if found: HIGH (Rule 9 violation).
```

### 1.3 §4.3 Prizma Tenant Safety Check — first-principles definition

The original `PHASE_B_SPEC.md` files that once defined §4.3 are not present in the current Module 3 docs folder. This SPEC defines §4.3 from first principles using Rule 14/15/20/22 as guardrails. See §5.

### 1.4 QA — 18 Tests

Enumerated from `MODULE_3_ROADMAP.md` lines 400–421. Full list in §6.

---

## 2. Roles & Authority (Read Before Starting)

Secondary operates per `CLAUDE.md §9` Bounded Autonomy + `opticup-guardian` roles matrix. Quick reference:

| You CAN | You CANNOT |
|---|---|
| Execute every §3/§4/§5/§6 step end-to-end without per-step approval | Talk to Daniel directly — ever |
| Write the migration SQL + apply via Supabase MCP (Level 2/3 — see exception in §3.1) | Promote yourself to Module Strategic or Code Writer |
| Commit to `develop` with explicit file-by-file `git add` | `git add -A`, `git add .`, or `git commit -am` |
| Run the full QA suite on demo tenant | Run QA on Prizma production data |
| Flag unrelated issues in the final summary | Fix issues outside this SPEC's scope |
| Stop on deviation and escalate to Strategic | Continue past a deviation "because it seems fine" |

**Escalate to Strategic (Main Strategic Chat) — not to Daniel — when:**
See §7 Escalation Rails. Read that section before beginning.

---

## 3. Work Package 1 — Fixes

### 3.1 RLS Policy Rewrite (M6-RLS-01/02/03)

**Rule anchors:** CLAUDE.md §5 Rule 15 (canonical JWT-claim pattern + two-policy pair), Rule 22 (defense in depth).

**SQL autonomy level:** Level 3 (ALTER POLICY / DROP POLICY / CREATE POLICY on tenant-scoped tables).

**Exception granted in this SPEC:** Because the USING clause is a verbatim copy of the canonical pattern from `pending_sales` and the affected tables are NOT production-critical write paths during pre-launch (storefront_components is edited via Studio only, storefront_pages likewise, storefront_reviews not yet accepting public writes), Secondary is authorized to apply the migration directly via Supabase MCP **without** per-SQL approval — provided the migration SQL matches the template in §3.1.1 byte-for-byte. Any deviation (alternate USING clause, wrong role, altered CMD) → STOP and escalate.

#### 3.1.1 Migration SQL Template (copy-paste, do NOT rewrite from memory)

Apply in one transaction per table. Repeat three times (once for each table name in `{{TABLE}}`).

```sql
BEGIN;

-- Drop the wide-open policies
DROP POLICY IF EXISTS {{TABLE}}_authenticated_all ON public.{{TABLE}};
DROP POLICY IF EXISTS {{TABLE}}_authenticated_modify ON public.{{TABLE}};
DROP POLICY IF EXISTS {{TABLE}}_authenticated_select ON public.{{TABLE}};

-- Create canonical tenant_isolation policy (replaces the wide-open ones)
CREATE POLICY {{TABLE}}_tenant_isolation
  ON public.{{TABLE}}
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- DO NOT TOUCH the service_bypass policy or the anon_read policy — they are correct.

COMMIT;
```

Apply for: `storefront_components`, `storefront_pages`, `storefront_reviews`.

#### 3.1.2 Verification (mandatory — all three must pass)

Run via Supabase MCP `execute_sql`:

```sql
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('storefront_components', 'storefront_pages', 'storefront_reviews')
ORDER BY tablename, policyname;
```

**Expected result per table:**
- Exactly 3 policies: `*_service_all` (service_role, ALL), `*_anon_read` (anon, SELECT), `*_tenant_isolation` (public, ALL).
- ZERO policies with role=`authenticated`.
- ZERO policies with `USING (true)` (except `*_service_all`).

**Smoke test — cross-tenant isolation:**

```sql
-- As service_role via MCP: read one row from each table, note its tenant_id.
-- Simulate an authenticated call with a different tenant_id in JWT claim:
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"tenant_id":"00000000-0000-0000-0000-000000000000"}';
SELECT COUNT(*) FROM storefront_components;  -- MUST return 0
SELECT COUNT(*) FROM storefront_pages;       -- MUST return 0
SELECT COUNT(*) FROM storefront_reviews;     -- MUST return 0
RESET role;
```

If any of the three returns > 0 → STOP, escalate.

#### 3.1.3 Commit

```
fix(rls): tenant-scope storefront_components/pages/reviews to JWT claim pattern (M6-RLS-01/02/03)

Replaces wide-open `USING(true)` policies on role=authenticated with the
canonical tenant_isolation pattern from pending_sales (CLAUDE.md §5 Rule 15).
Eliminates cross-tenant read/write exposure on three storefront tables.
Service_role and anon read paths unchanged.

Refs: docs/guardian/GUARDIAN_ALERTS.md M6-RLS-01, M6-RLS-02, M6-RLS-03
```

Stage only the migration SQL file (if saved under `db-audit/migrations/` — match existing convention) and any generated Supabase migration artifacts.

---

### 3.2 SaaS Hardcoded-Value Fixes

**Rule anchors:** CLAUDE.md §4 Rule 9, §5 Rule 20 (SaaS litmus test).

Each sub-item below is a separate commit.

#### 3.2.1 M3-SAAS-01 — `inventory.html` (conditional)

1. `grep -nE "אופטיקה פריזמה|Prizma|prizma" inventory.html`
2. If ZERO hits → no fix needed. In summary: mark M3-SAAS-01 RESOLVED/STALE and include the grep output as evidence.
3. If hits exist at any line → replace each literal with the appropriate dynamic call:
   - Tenant display name → `getTenantConfig('name')` (helper already used elsewhere in ERP per B1)
   - Tenant slug → `getTenantConfig('slug')`
4. Verify: `grep -nE "אופטיקה פריזמה|Prizma|prizma" inventory.html` → 0 hits (OR only hits inside comments/tests).
5. Commit (only if fix was needed):
   ```
   fix(inventory): replace hardcoded tenant name with getTenantConfig (M3-SAAS-01)
   ```

#### 3.2.2 M3-SAAS-04 — `scripts/sync-watcher.js` (TWO PARTS, BOTH EXECUTED)

Part A (env-var fallback) and Part B (feature-gate schema change) are BOTH executed in this SPEC. They are committed as TWO separate commits to keep the history reviewable.

---

**Part A — Remove fallback default (autonomous, Level 2):**

Replace lines 45 (old):
```javascript
const TENANT_ID = process.env.OPTICUP_TENANT_ID || '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
```

With:
```javascript
const TENANT_ID = process.env.OPTICUP_TENANT_ID;
if (!TENANT_ID) {
  console.error('[sync-watcher] OPTICUP_TENANT_ID env var is required. Exiting.');
  process.exit(1);
}
```

Commit:
```
fix(sync-watcher): require OPTICUP_TENANT_ID env var, remove silent Prizma default (M3-SAAS-04 part A)
```

---

**Part B — Replace hardcoded Prizma UUID gate with DB-backed feature flag (authorized Level 3):**

Four sub-steps in strict order. Each is independently verified. If any step's verification fails — STOP and escalate (per §7).

##### Part B — Step 1: Migration SQL (copy-paste verbatim, do NOT rewrite from memory)

Apply via Supabase MCP `apply_migration` with name `add_tenant_access_sync_enabled_flag`:

```sql
BEGIN;

-- Add feature-flag column. Default false = safe (new tenants start with Access sync OFF).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS access_sync_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.access_sync_enabled IS
  'Enables the local Access/Excel sync-watcher for this tenant. Currently Prizma-only; set to true per tenant that opts in.';

-- Initialize Prizma only. Verified slug='prizma', id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' on 2026-04-14.
UPDATE public.tenants
   SET access_sync_enabled = true
 WHERE slug = 'prizma';

COMMIT;
```

##### Part B — Step 2: Post-migration verification (via execute_sql)

```sql
-- 1. Column exists with the expected shape.
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'tenants'
   AND column_name = 'access_sync_enabled';
-- Expected: exactly one row, data_type=boolean, is_nullable=NO, column_default=false.

-- 2. Prizma is the only tenant with the flag enabled.
SELECT slug, access_sync_enabled FROM public.tenants ORDER BY slug;
-- Expected: prizma=true, all others=false.
```

If either query diverges from expected → STOP. Do NOT proceed to Step 3.

##### Part B — Step 3: Code refactor in `scripts/sync-watcher.js`

The goal: replace the hardcoded Prizma UUID gate (lines 47–54) with an async DB lookup on `tenants.access_sync_enabled`. Because the DB lookup is async and the original watcher startup is synchronous at top level, wrap the watcher startup in a `main()` function called after the gate passes.

**Replacement A — Remove lines 47–54** (the `// ── Prizma-only guard ──` block and its contents):

```javascript
// ── Prizma-only guard ───────────────────────────────────────
// Access sync is a temporary feature only for Prizma Optics.
// If TENANT_ID is not Prizma's UUID, the watcher exits silently.
const PRIZMA_TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
if (TENANT_ID !== PRIZMA_TENANT_ID) {
  console.log(`[sync-watcher] Tenant ${TENANT_ID} is not Prizma — Access sync disabled. Exiting.`);
  process.exit(0);
}
```

→ delete entirely. These lines go away.

**Replacement B — Wrap the watcher startup in a `main()` function.**

Locate the block that begins with `const watcher = chokidar.watch(CONFIG.watchDir, {` (line 469) and ends with the last `process.on('SIGINT', shutdown);` (line 494). Indent all of it inside:

```javascript
async function main() {
  // Feature-flag gate: require tenants.access_sync_enabled = true for this tenant.
  const { data: tenantRow, error: tenantErr } = await sb
    .from('tenants')
    .select('slug, access_sync_enabled')
    .eq('id', TENANT_ID)
    .single();

  if (tenantErr) {
    console.error(`[sync-watcher] Failed to load tenant config for ${TENANT_ID}: ${tenantErr.message}`);
    process.exit(1);
  }
  if (!tenantRow || tenantRow.access_sync_enabled !== true) {
    console.log(`[sync-watcher] access_sync_enabled=false for tenant ${tenantRow?.slug || TENANT_ID} — Access sync disabled. Exiting.`);
    process.exit(0);
  }

  log(`[sync-watcher] Access sync enabled for tenant '${tenantRow.slug}'. Starting watcher…`);

  // ── Original watcher startup (unchanged behavior) ──────────
  const watcher = chokidar.watch(CONFIG.watchDir, {
    // … all original options and handlers, verbatim …
  });

  // … all original watcher.on() handlers, verbatim …

  process.on('SIGTERM', shutdown);
  process.on('SIGINT',  shutdown);
}

main().catch((err) => {
  console.error(`[sync-watcher] Fatal error during startup: ${err.stack || err}`);
  process.exit(1);
});
```

**CRITICAL:** Do NOT change any other behavior in the watcher block. Copy the original lines 469–494 verbatim into the function body. No logic changes, no reordering, no "while I'm here" improvements (CLAUDE.md §9 Scope Rule 4).

##### Part B — Step 4: Post-refactor verification

```bash
# 1. No hardcoded Prizma UUID remains in the file.
grep -nE "6ad0781b-37f0-47a9-92e3-be9ed1477e1c|PRIZMA_TENANT_ID" scripts/sync-watcher.js
# Expected: 0 hits.

# 2. File is syntactically valid (Node parse).
node --check scripts/sync-watcher.js
# Expected: exit code 0, no output.

# 3. File size still within Rule 12 limits (target 300, max 350 — watcher was ~494 lines pre-existing, NOT introduced by this SPEC).
wc -l scripts/sync-watcher.js
# Expected: count is pre-existing-count + ~5 to +10 lines (added main() wrapper and gate). Record the delta in the summary.
```

NOTE on file size: `sync-watcher.js` was 494 lines BEFORE this SPEC — already over the Rule 12 max. This SPEC does NOT attempt to split it (that's a separate work package). The delta introduced here is small and does not make the situation materially worse. Record in summary as a known pre-existing debt, not a regression.

##### Part B — Step 5: Smoke test against demo tenant (mandatory)

```bash
# Simulate a non-Prizma tenant. Watcher must exit with message before starting chokidar.
OPTICUP_TENANT_ID=8d8cfa7e-ef58-49af-9702-a862d459cccb \
OPTICUP_SERVICE_ROLE_KEY=$OPTICUP_SERVICE_ROLE_KEY \
OPTICUP_WATCH_DIR=/tmp/optic-watch-test \
  timeout 10 node scripts/sync-watcher.js
# Expected: prints "access_sync_enabled=false for tenant demo … Exiting." and exits 0.
# DO NOT run this with Prizma's tenant_id in any environment other than its intended production host.
```

If the smoke test does not behave as expected → STOP and escalate.

##### Part B — Commit

Stage only: the migration SQL file (under the migrations folder where Supabase MCP writes it — match existing convention) and `scripts/sync-watcher.js`.

```
fix(sync-watcher): replace hardcoded Prizma UUID gate with tenants.access_sync_enabled flag (M3-SAAS-04 part B)

Adds a boolean column `tenants.access_sync_enabled` (default false, Prizma=true)
and switches the watcher's startup gate from a literal UUID comparison to a DB
lookup. Eliminates the last hardcoded tenant identifier in the sync pipeline
and makes Access sync opt-in per Rule 9 / Rule 20.

Watcher behavior unchanged for Prizma (flag is true). Non-Prizma tenants now
receive a clear log line identifying the flag rather than an opaque UUID check.

Refs: docs/guardian/GUARDIAN_ALERTS.md M3-SAAS-04
```

#### 3.2.3 M3-SAAS-05 — `modules/storefront/studio-shortcodes.js`

1. Discover the correct storefront_config keys for WhatsApp and Instagram:
   ```sql
   SELECT key, value FROM storefront_config
   WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
     AND (key ILIKE '%whatsapp%' OR key ILIKE '%instagram%' OR key ILIKE '%social%');
   ```
2. If the keys exist → replace the hardcoded `wa.me/972533645404` and `instagram.com/optic_prizma/` with lookups via the existing getter (same pattern B1/B4 used for `name`, `name_en`, etc.).
3. If the keys do NOT exist → ESCALATE to Strategic. Do not invent schema. The fallback path is to add the keys to `storefront_config` for Prizma, but Secondary must not create new config keys without approval.
4. Remove the `TODO(B4)` comment once fixed.
5. Verify:
   ```
   grep -nE "wa\.me/972533645404|optic_prizma|972-53-3645404" modules/storefront/studio-shortcodes.js
   ```
   → 0 hits.
6. Commit:
   ```
   fix(studio-shortcodes): read social links from tenant config, remove Prizma hardcoding (M3-SAAS-05)
   ```

#### 3.2.4 M1-R09-01 — `modules/storefront/studio-brands.js`

1. Locate the tenant slug helper used elsewhere in the file (pattern from B1). If the file already imports `getTenantConfig` or reads `window.TENANT_SLUG`, use the same mechanism.
2. Replace:
   ```javascript
   /?t=prizma
   ```
   with:
   ```javascript
   /?t=${encodeURIComponent(getTenantConfig('slug'))}
   ```
   (Use the exact helper idiomatic to this file. Do NOT introduce a new helper.)
3. Verify:
   ```
   grep -nE "[?&]t=prizma" modules/storefront/studio-brands.js
   ```
   → 0 hits.
4. Commit:
   ```
   fix(studio-brands): dynamic tenant slug in brand preview URL (M1-R09-01)
   ```

---

## 4. Work Package 2 — Alert File Update

After §3 completes, update `docs/guardian/GUARDIAN_ALERTS.md`:

1. Move every fixed alert from HIGH section to "Resolved in this run" section with a one-line note (commit hash + verification command that now passes).
2. If M3-SAAS-01 was stale, note it as "RESOLVED — stale, verified clean at {timestamp}".
3. If M3-SAAS-04 Part B was escalated, keep it in HIGH with an updated note: "Part A (fallback default) fixed in commit {hash}; Part B (feature gate) pending Strategic review → schema change required".
4. Bump the `Last updated` timestamp and the active-alerts count at the top.
5. Commit as a SINGLE commit, separately from the fixes:
   ```
   docs(guardian): mark M6-RLS-01/02/03 + M3-SAAS-01/04a/05 + M1-R09-01 resolved
   ```

---

## 5. Work Package 3 — §4.3 Prizma Tenant Safety Check

**Purpose:** Before Module 3 is eligible for merge-to-main, confirm Prizma's live tenant data is cleanly isolated and no hardcoded tenant coupling remains outside explicit Prizma-only feature gates.

**Rule anchors:** CLAUDE.md §4 Rule 9, §5 Rules 14/15/18/20/22.

**Do NOT execute against Prizma production writes.** All checks are READ-ONLY. Writes for QA happen on `demo` tenant only (§6).

### 5.1 Cross-Tenant Isolation Smoke

Run the cross-tenant isolation query from §3.1.2 against ALL tables that handle storefront-visible data. Full list:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'storefront_%'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

For each table returned, repeat the "simulate authenticated call with nonexistent tenant_id" check. Every COUNT must be 0.

### 5.2 Hardcoded Prizma Sweep

```
grep -rnE "6ad0781b-37f0-47a9-92e3-be9ed1477e1c|אופטיקה פריזמה|optic_prizma|\\?t=prizma|prizma-optic\\.co\\.il" \
  --include="*.js" --include="*.html" --include="*.ts" --include="*.astro" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=backups \
  .
```

Expected: every remaining hit is either (a) inside a backup/snapshot folder, (b) in the explicit Prizma-only feature gate in `sync-watcher.js` documented in §3.2.2 Part B, (c) inside a migration script under `scripts/` flagged as informational MEDIUM in GUARDIAN_ALERTS (M3-SAAS-09), or (d) inside a test/fixture file.

Any hit that does NOT fit one of (a)–(d) → STOP and escalate.

### 5.3 RLS Policy Completeness

```sql
SELECT t.table_name
FROM information_schema.tables t
LEFT JOIN pg_tables pt ON pt.tablename = t.table_name AND pt.schemaname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND pt.rowsecurity = false
ORDER BY t.table_name;
```

Expected: zero rows (every table has RLS enabled). Any row returned → escalate.

### 5.4 UNIQUE Constraint Tenant-Scoping (Rule 18)

```sql
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE contype = 'u'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;
```

Review the list. Every UNIQUE constraint on a tenant-scoped table must include `tenant_id` in its column list. Record any exceptions in the final summary (informational — this is an existing debt, not introduced by this SPEC). The `suppliers_name_key`, `supplier_number_key`, `po_number_key` items from M1-R18-01/02 are known and remain in GUARDIAN_ALERTS — re-confirm they are the ONLY exceptions.

### 5.5 View Leakage Check

Every storefront-read View (`v_storefront_*`) must filter by tenant_id in its definition. Fetch each and grep:

```sql
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_storefront_%'
ORDER BY table_name;
```

For each, verify the definition includes `tenant_id` in a JOIN or WHERE. Any view that does NOT → STOP and escalate (this would be a catastrophic finding).

### 5.6 Output

A file `modules/Module 3 - Storefront/docs/PRIZMA_SAFETY_CHECK_2026-04-14.md` with:

1. Timestamp + commit hash of HEAD at time of run
2. Each sub-check 5.1–5.5 with its result (counts, hits, any deviations)
3. Final verdict: **PASS** (all checks clean) or **FAIL** (escalated, SPEC halts)

---

## 6. Work Package 4 — Full QA (18 Tests)

**Tenant:** `demo` only (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN `12345`). Never Prizma.

**Execution:** Follow the order below. Record PASS/FAIL + evidence (screenshot path, log excerpt, or command output) for each.

Extract the 18 tests from `MODULE_3_ROADMAP.md` lines 400–421. If the file has drifted and now contains fewer or more tests, **STOP and escalate** — do not invent tests.

For each test:
1. Set up: switch to demo tenant, load relevant page, note starting state.
2. Execute the action.
3. Verify the expected outcome.
4. Record: test name, PASS/FAIL, evidence pointer.

Save the full QA log at `modules/Module 3 - Storefront/docs/QA_REPORT_2026-04-14.md`. Include the final count `X/18 PASS`.

If ANY test fails → STOP. Do not attempt to fix failing QA items inside this SPEC. Record the failure, include reproduction steps, and escalate.

---

## 7. Escalation Rails

**STOP immediately and escalate to Strategic (Main Strategic Chat) when any of the following occur.** These are non-negotiable. Do NOT proceed "because it seems fine" after any of these.

### 7.1 Rule-violation triggers

- Any step would require writing a literal tenant UUID, slug, name, phone, domain, or social handle in code (Rule 9)
- Any step would require modifying `service_bypass` policy, `anon_read` policy, or any other existing policy outside the 3 target policies (Rule 15)
- Any step would require adding a UNIQUE constraint without `tenant_id` (Rule 18)
- Any step would introduce direct `sb.from()` calls outside `shared.js` (Rule 7)
- Any step would require `innerHTML` with user input (Rule 8)
- Any step requires a schema change (ALTER TABLE, new column, new table) — Level 3 SQL, always escalates. **Exception:** the migration `add_tenant_access_sync_enabled_flag` in §3.2.2 Part B Step 1 is pre-authorized here — apply it verbatim. No other schema change is authorized.

### 7.2 Evidence-deviation triggers (opticup-guardian)

- Supabase query returns different policies than §1.1 lists
- `inventory.html` grep shows hardcoded tenant strings in a location this SPEC doesn't anticipate
- `storefront_config` lookup in §3.2.3 returns different keys than the pattern from B1/B4
- `studio-brands.js` uses a slug-helper pattern different from the rest of the file
- `MODULE_3_ROADMAP.md` QA-test count has changed from 18
- A §5 sub-check returns a finding not anticipated in §5.1–5.5 "expected"

### 7.3 Scope-creep triggers

- You notice a bug or rule violation that is NOT in this SPEC's §3–§6 → note in final summary, do NOT fix in this session
- A fix in §3 would naturally extend to another file not listed here → STOP, escalate, do not widen scope autonomously
- Anyone (including code comments like "TODO: also fix X") suggests doing more than what's in this SPEC → log in summary, do not expand

### 7.4 Safety triggers

- Any command prints a non-zero exit code (except robocopy 1–3 on Windows)
- Any SQL returns unexpected row counts
- Any commit produces more changes than the narrow scope of that step (check `git diff --stat` before committing — if a file you didn't touch appears, STOP)
- The `git status` after a step shows modifications you didn't intend

### 7.5 HOW to escalate

- DO NOT attempt to message Daniel.
- DO NOT attempt to "try the next thing" in the hope it works.
- STOP, write a short report in this format:

```
ESCALATION from Secondary to Strategic
SPEC: MODULE_3_PRE_LAUNCH_HARDENING_SPEC_2026-04-14.md
Step: §X.Y
What happened: <one-paragraph description>
What I verified: <commands run + their outputs>
What I think the options are: <optional>
```

Wait for Strategic's response before any further action.

---

## 8. Execution Order & Commit Plan

Follow this exact order. Each row = one commit (unless noted).

| # | Step | Section | Commit message prefix |
|---|---|---|---|
| 1 | Backup repo (create timestamped folder outside source tree) | §9 | no commit |
| 2 | Apply RLS migrations (3 tables, 1 SQL transaction per table) | §3.1 | `fix(rls):` |
| 3 | Verify RLS smoke + cross-tenant isolation | §3.1.2 | no commit (evidence in summary) |
| 4 | Fix M3-SAAS-01 (conditional) | §3.2.1 | `fix(inventory):` |
| 5 | Fix M3-SAAS-04 Part A (env-var fallback) | §3.2.2 Part A | `fix(sync-watcher): … part A` |
| 6 | Fix M3-SAAS-04 Part B Step 1 — apply migration `add_tenant_access_sync_enabled_flag` | §3.2.2 Part B Step 1 | no commit (Supabase MCP handles) |
| 7 | Fix M3-SAAS-04 Part B Step 2 — verify column + Prizma-only = true | §3.2.2 Part B Step 2 | no commit |
| 8 | Fix M3-SAAS-04 Part B Steps 3–4 — code refactor + grep/parse verify | §3.2.2 Part B Steps 3–4 | `fix(sync-watcher): … part B` |
| 9 | Fix M3-SAAS-04 Part B Step 5 — smoke test against demo tenant | §3.2.2 Part B Step 5 | no commit (evidence in summary) |
| 10 | Fix M3-SAAS-05 | §3.2.3 | `fix(studio-shortcodes):` |
| 11 | Fix M1-R09-01 | §3.2.4 | `fix(studio-brands):` |
| 12 | Update GUARDIAN_ALERTS.md | §4 | `docs(guardian):` |
| 13 | Run §4.3 Prizma safety check + write report | §5 | `docs(safety-check):` (for report only) |
| 14 | Run 18-test QA on demo + write report | §6 | `docs(qa):` (for report only) |
| 15 | Write final summary (§10) | §10 | `docs(summary):` |

**Never** run `git add -A` or `git add .`. Every commit uses explicit filenames.

**Never** push to main. All commits land on `develop`. Pushes to `develop` are allowed.

---

## 9. Pre-flight Checklist

Secondary runs this at the start of the session and confirms each line:

- [ ] `git remote -v` → `opticalis/opticup` (ERP)
- [ ] `git branch` → on `develop`
- [ ] `git pull origin develop` → up to date
- [ ] `git status` → clean (if not, follow CLAUDE.md §1 step 4 protocol)
- [ ] Read `CLAUDE.md` §1, §4 Rules 1-13, §5 Rules 14-20, §6 Rules 21-23
- [ ] Read `docs/guardian/GUARDIAN_ALERTS.md` — confirm the 15 active alerts match §1.1–§1.2 evidence here
- [ ] Backup created at `C:\Users\User\opticup-backups\<timestamp>_pre-pre-launch-hardening\` (Windows) or equivalent outside-source path (Mac/Linux). Destination MUST NOT be inside the source repo tree.
- [ ] opticup-guardian skill understood (verify-before-write, evidence-backed findings, mark UNVERIFIED when uncertain)

---

## 10. Final Summary — Template (Secondary Fills This)

After §3–§6 complete, Secondary creates `modules/Module 3 - Storefront/docs/PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` with exactly this structure:

```markdown
# Pre-Launch Hardening — Execution Summary

**SPEC:** MODULE_3_PRE_LAUNCH_HARDENING_SPEC_2026-04-14.md
**Executor:** Secondary Chat
**Started:** <timestamp>
**Ended:** <timestamp>
**Final status:** COMPLETE / PARTIAL / HALTED

## 1. Commits

| # | Hash | Message | Files | Lines +/- |

## 2. Fixes Applied

### M6-RLS-01, M6-RLS-02, M6-RLS-03
- Migration SQL: <path>
- Verification output: <pg_policies query result>
- Cross-tenant smoke result: <counts — all 0>

### M3-SAAS-01
- Action taken: FIXED / STALE-NO-FIX-NEEDED
- Evidence: <grep output>

### M3-SAAS-04 Part A
- Diff: <short description>
- Verification: <env var behavior confirmed>

### M3-SAAS-04 Part B
- Migration SQL applied: <migration name + timestamp>
- Column verification: <pg output confirming shape + default>
- Prizma-only flag check: <row output, prizma=true, others=false>
- Code refactor diff summary: <short description>
- grep verification: <0 hits for hardcoded UUID>
- Node parse check: <exit 0>
- Demo smoke test output: <one line: "access_sync_enabled=false for tenant demo … Exiting.">
- Commit hash: <hash>

### M3-SAAS-05
- Storefront_config keys used: <list>
- Diff: <short description>
- Verification: <grep output, 0 hits>

### M1-R09-01
- Helper used: <name>
- Diff: <short description>
- Verification: <grep output, 0 hits>

## 3. §4.3 Prizma Safety Check

- Report path: PRIZMA_SAFETY_CHECK_2026-04-14.md
- Verdict: PASS / FAIL
- Any unexpected findings: <list>

## 4. QA

- Report path: QA_REPORT_2026-04-14.md
- Result: X/18 PASS
- Any failures: <list with reproduction steps>

## 5. Deviations from SPEC

List every place where actual state differed from SPEC's stated expectation, even if it didn't require escalation. Format:
- §N.M — SPEC said X, actual was Y, action taken: Z

## 6. Escalations

List every escalation raised during execution + Strategic's response.

## 7. Retrospective — for defining the "SPEC Executor" skill

Answer each honestly. This drives Strategic's next skill-creator iteration.

1. **Token-efficiency observations:** Where did I spend tokens unnecessarily? (e.g., reading whole files when grep would have sufficed; re-reading docs I already had in context; verbose intermediate reports)
2. **Places where I almost violated a rule:** Which rail in §7 almost didn't trigger? What would have made it more obvious?
3. **Places where the SPEC was ambiguous:** Exact passages + what would have helped.
4. **Things I did that weren't covered by the SPEC but felt right:** Did I stop to check, or did I do them autonomously? Was that the right call?
5. **Tooling gaps:** Commands/scripts that would have saved time. (e.g., "a script that greps for all hardcoded tenant strings in one pass")
6. **Checklist items missing from the pre-flight:** Anything I wish was in §9.
7. **Evidence-format friction:** Were the SPEC's "verification" commands the right granularity? Too many? Too few?
8. **One change that would most improve future SPEC executions:** Your top recommendation.

## 8. NOT done in this SPEC (flagged for Strategic)

List everything outside scope that Secondary noticed during execution. Do NOT fix — just record.

- <item>
- <item>

## 9. Next step ownership

- Merge-to-main: DEFERRED — awaits Daniel's approval after Main Strategic reviews this summary.
- DNS switch: DEFERRED — same gate.
- Any follow-up SPECs suggested: <list>
```

---

## 11. Skill-Creator Deliverable — "SPEC Executor" Skill Spec

**Context:** Daniel's stated goal is a reusable skill for the role that executes SPECs at the highest quality — minimum token waste, thorough testing, no bugs, by-the-book. This SPEC is the first disciplined instance. After Secondary returns the §10 summary, Main Strategic uses the summary to author the skill.

**To be drafted by Main Strategic using the skill-creator skill AFTER this SPEC closes.** Target path:
`.claude/skills/opticup-spec-executor/SKILL.md`

**Skill must include:**

1. **Trigger phrases:** "execute SPEC", "implement this SPEC", "run the SPEC", variants in Hebrew
2. **Preconditions gate:** First action is always the §9-style pre-flight (repo, branch, pull, clean status, read rules files)
3. **Evidence-before-action protocol:** For every finding, verify current state matches SPEC's claimed state BEFORE modifying anything. If mismatch → escalate, not fix.
4. **Commit discipline enforcement:** Reject any `git add -A` / `git add .` / `git commit -am`. Reject any merge-to-main attempt regardless of who instructed it.
5. **Escalation triggers:** Import §7 of this SPEC as the canonical list.
6. **Token discipline:** Prefer grep over Read-entire-file. Prefer diffs over re-reads. Emit progress in structured tables, not prose.
7. **Summary-template enforcement:** Every SPEC execution ends with a §10-style summary file in the SPEC's home folder.
8. **Self-review gate:** Before final "I'm done" message, the skill runs an internal checklist: every fix has a verification line, every escalation has a reason, every commit exists with the claimed hash, `git status` is clean on `develop`.
9. **"Ask once" rule for ambiguity:** If three or more steps could be interpreted two ways, the skill stops and asks Strategic ONCE — not per-step.
10. **Iteration mechanism:** Every SPEC summary's §7 retrospective feeds the next skill revision.

**Evaluation criteria (how Strategic will score future SPEC runs):**
- Deviations caught before proceeding (more = better)
- Unnecessary reads / redundant greps (fewer = better)
- Rule violations shipped to `develop` (must be zero)
- Escalations used appropriately (neither too many nor too few — each justified by §7)
- Summary completeness (every §10 section filled with real evidence, not placeholder text)

---

## 12. Explicit Non-Goals

To prevent scope creep, this SPEC explicitly does **NOT** include:

- File-size debt fixes (M1-R12-01/02, M5-DEBT-05)
- UNIQUE constraint migrations (M1-R18-01/02)
- Cross-module contract wrappers (M8-XMOD-01/05)
- MODULE_MAP.md doc-drift fix (M4-DOC-04)
- Leaked-password protection toggle (M6-AUTH-01) — Supabase Auth dashboard action
- MEDIUM informational items (M3-SAAS-09/10/11, M5-DEBT-05)
- Any merge to main
- Any DNS switch
- Any QA on Prizma production data
- Any schema changes other than the pre-authorized `add_tenant_access_sync_enabled_flag` migration in §3.2.2 Part B Step 1

Each of these is a separate work package, to be specified separately by Main Strategic when prioritized.

---

## 13. Acceptance Criteria — SPEC Close

This SPEC is CLOSED when:

1. All §3 commits land on `develop` with commit messages matching the templates.
2. `docs/guardian/GUARDIAN_ALERTS.md` reflects the resolved items and the bumped count.
3. `PRIZMA_SAFETY_CHECK_2026-04-14.md` exists with verdict PASS.
4. `QA_REPORT_2026-04-14.md` exists with 18/18 PASS.
5. `PRE_LAUNCH_HARDENING_SUMMARY_2026-04-14.md` exists with all §10 template sections filled.
6. `git status` on `develop` is clean.
7. No merge to main occurred.
8. No writes to Prizma production data occurred.

If any of 1–8 fails → SPEC is PARTIAL/HALTED, not CLOSED. Strategic decides next step.

---

**End of SPEC.**
