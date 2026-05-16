# SPEC — M1_INVENTORY_REDESIGN

> **Foreman / Author:** opticup-strategic (Module Strategist + Foreman hat)
> **Date sealed:** 2026-05-16
> **Pipeline mode:** Full Auto, single chat (Foreman → Executor → Reviewer → Localhost-Tester → Foreman)
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_INVENTORY_REDESIGN_BRIEF.md`
> **Mockup reference:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/INVENTORY_REDESIGN_SKETCHES.html` (Approach A, with Brief amendments per §2.1)

---

## 0. Pre-Authoring Reality Check (§0.A probes + §0.B decision gates + §0.C Brief-vs-DB findings)

This section codifies what was empirically verified on live Supabase + repo state **before** sealing the SPEC. Per `opticup-strategic` SKILL §1.5 + P-AUTHOR-4 (Brief-vs-DB-reality gap audit, harvested from `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` 2026-05-15).

### §0.A — Probes run at SPEC author time (2026-05-16 ~07:00 local)

| # | Probe | Tool | Result pinned |
|---|---|---|---|
| P1 | Column lists for the 4 log-source tables (`inventory_logs`, `stock_movement`, `activity_log`, `sync_log`) | `information_schema.columns` MCP query | Pinned in §2.4 below. All 4 tables exist; all 4 have `tenant_id UUID NOT NULL` + `created_at` (NOT NULL on 3, NULLABLE on 1 — see §0.C F-DB-9). |
| P2 | Row counts per source per tenant | `count(*) GROUP BY tenant_id` MCP query | Prizma: `inventory_logs=4335 / stock_movement=0 / activity_log=936 / sync_log=922 = 6193 union rows`. Demo: `506 / 18 / 655 / 59 = 1238`. Worst-case scale 6193 rows. |
| P3 | `activity_log.entity_type` distinct values | `GROUP BY entity_type` MCP query | 10 values, ALL CRM-related (`crm`, `crm_leads`, `crm_events`, `crm_event_attendees`, …). **Zero inventory entries today.** View must still include `entity_type IN ('inventory','stock_movement','stock_lot','stock_adjustment','purchase_order','purchase_receipt','sync')` filter for future-proofing. |
| P4 | `permissions` table schema + existing `lens.*` keys | MCP query | 9 existing `lens.*` keys (`lens.designs.manage`, `lens.gr.add_manual_line`, `lens.gr.create`, `lens.inventory.adjust`, `lens.inventory.view`, `lens.po.cancel`, `lens.po.create`, `lens.po.view`, `lens.pricing.manage`). `lens.catalog.manage` **DOES NOT EXIST**. Catalog admin already gated via `is_platform_super_admin()` RPC (see `shared/js/lens-nav-strip.js:30` `gate: '__platform_admin__'`). |
| P5 | EXPLAIN ANALYZE on prototype unified-log query on Prizma | `EXPLAIN (ANALYZE, BUFFERS) ...` MCP query | **Execution: 106.325 ms / Planning: 12.341 ms.** Top cost = `Seq Scan on inventory_logs` (100 ms / 4335 rows). `activity_log` uses `idx_activity_log_entity` index (2.3 ms). `sync_log` Seq Scan (0.4 ms / 922 rows). `stock_movement` 0 rows on Prizma. **Materialization NOT required** (DG-1 threshold 500 ms unmet). |
| P6 | `suppliers` columns | MCP query | 30 columns. **No `category` column.** No direct FK to brands. Supplier→brand link is via `supplier_brand_distribution` (junction); supplier→lens link is via `supplier_catalog_offering` → `lens_variant`. |
| P7 | `brands.supplier_id` existence (Brief assumption) | `information_schema.columns` MCP query | **`brands.supplier_id` DOES NOT EXIST.** Brief §2.3 claim is WRONG. Resolution: derive supplier categories from junction tables only — see §0.C F-DB-1. |
| P8 | Tenant identity | MCP query | demo=`8d8cfa7e-ef58-49af-9702-a862d459cccb`, prizma=`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. `tenants.name` (not `name_he`) holds Hebrew. |
| P9 | RLS state on the 4 source tables | `pg_class.relrowsecurity` + `pg_policies` MCP | All 4 RLS-enabled. `inventory_logs`/`stock_movement`/`sync_log` each have 2 policies (service_bypass + tenant_isolation canonical pair); `activity_log` has 1 (tenant_isolation only — service_role works via Postgres native bypass). A view with `security_invoker=on` inherits these correctly. |
| P10 | `inventory.html` tab inventory | Repo read | 11 `<button data-tab="…">` entries on lines 38–48 (not 10 as Brief asserts). 11 `<section id="tab-…">` blocks confirmed by grep (entry, reduction, inventory, brands, suppliers, systemlog, receipt, purchase-orders, access-sync, stock-count, returns, incoming-invoices — see §0.C F-DB-5). |
| P11 | Lens HTML page inventory | Repo file scan via `shared/js/lens-nav-strip.js:23-31` `LENS_PAGES` array | 7 lens pages: lens-inventory, lens-goods-receipt, lens-purchase-order, lens-pos-list, lens-pricing, lens-active-designs, lens-catalog-admin. Brief §2.1 lists only 6 (omits `lens-pos-list.html`). See §0.C F-DB-6. |
| P12 | Existing `verify:integrity` + `destructive-ops-declared` hook state on develop HEAD | `npm run verify:integrity` | exit 0 (7 files scanned, all clear). Confirms tree clean before SPEC seal. |

### §0.B — Decision gates (per `opticup-strategic` SKILL §"P-AUTHOR-2 Decision-gate pattern", harvested from `M1_LENS_PHASE_2_COMPLETION/FOREMAN_REVIEW.md` 2026-05-16)

This SPEC carries three high-uncertainty decisions. Each has a measurable threshold and a pre-authorized branch outcome so the Executor never has to escalate mid-Pipeline.

#### DG-1 — Materialization of `v_inventory_unified_log`

- **Assumption:** A regular view UNIONing 4 sources is fast enough on prod-scale data (Prizma's 6193 rows).
- **Empirical test:** P5 above. `EXPLAIN (ANALYZE, BUFFERS)` of the prototype on Prizma's full data set.
- **Branches:**
  - **A. Execution < 250 ms → ship as regular view** (no materialization).
  - **B. 250 ms ≤ execution < 1000 ms → ship as regular view + add `(tenant_id, created_at DESC)` index on `inventory_logs`** (pre-authorized in §4 destructive ops list).
  - **C. Execution ≥ 1000 ms → materialize via `CREATE MATERIALIZED VIEW` + a refresh trigger or pg_cron job** (pre-authorized in §4 with rollback plan).
- **Actual result:** 106.325 ms → **Branch A: regular view, no acceleration.** Documented in §2.4.

#### DG-2 — Retirement of `shared/js/lens-nav-strip.js`

- **Assumption:** The new inventory-shell sidebar can fully replace the lens-nav-strip's role.
- **Empirical test:** Can sidebar-driven navigation deliver within-lens-category navigation without refactoring all 7 lens HTML pages?
- **Branches:**
  - **A. Lens screens become tabs inside `inventory.html` (true SPA) → retire `lens-nav-strip.js`** (large refactor, risks lens-page regression).
  - **B. Lens screens stay as separate HTML pages; sidebar entry "עדשות" navigates to `lens-inventory.html`; `lens-nav-strip.js` keeps its job as the lens-category horizontal-tabs strip → KEEP `lens-nav-strip.js`** (update its "← דף הבית" link to point to `inventory.html` instead of `index.html` to preserve the "I'm inside inventory" framing).
- **Actual decision:** **Branch B — KEEP lens-nav-strip.js, retarget its home-link to inventory.html.** Rationale: minimal disruption, lens department is production-complete and 7 HTML pages exist; embedding them as iframes/sections would be a significantly larger SPEC. Lens-nav-strip.js becomes the lens category's horizontal-tabs layer; the inventory sidebar handles cross-category navigation. The two layers compose cleanly. Brief autonomy clause "may retire `lens-nav-strip.js`" explicitly authorized either outcome — selecting B with rationale.

#### DG-3 — New permission key for catalog-admin gating

- **Assumption:** Brief §2.1 lens-category tab "ניהול קטלוג" needs a new permission key (`lens.catalog.manage` or similar).
- **Empirical test:** Does an existing gate already cover this case?
- **Branches:**
  - **A. No existing gate → seed `lens.catalog.manage` × 2 tenants × matching role_permissions** (uses 1 of the Brief's "max 1 new permission" autonomy budget).
  - **B. Existing `is_platform_super_admin()` RPC already gates `lens-catalog-admin.html` → 0 new permission keys needed.**
- **Actual:** P4 + read of `lens-nav-strip.js:30` confirms gate is `__platform_admin__` (calls the RPC) — **Branch B: 0 new permission keys.** Documented in §6 (Out of Scope) and §10 (Autonomy Envelope) as "permission-key budget used: 0/1."

### §0.C — Brief-vs-DB reality findings (P-AUTHOR-4 audit)

Every Brief claim about DB shape, column names, file inventory, or permission keys was cross-checked. Findings:

| # | Brief claim | Reality | Resolution in this SPEC |
|---|---|---|---|
| F-DB-1 | Brief §2.3: "Derived from existing relationships (`brands.supplier_id`, …)" | `brands.supplier_id` **does not exist.** supplier→frames-brand link is via `supplier_brand_distribution` (junction, has `status='active'` + `NOT is_deleted` filters) | §2.3 below uses `supplier_brand_distribution` exclusively for the frames badge; `supplier_catalog_offering` (already correct in Brief) for the lens badge. |
| F-DB-2 | Brief §2.1 + §8 #6: lens-category 6th tab is "ניהול קטלוג (platform-admin only — permission-gated)" + "verify `lens.catalog.manage` (or equivalent) exists; if not, the executor MAY seed it" | No such permission key exists. Existing screen `lens-catalog-admin.html` is gated via `is_platform_super_admin()` Supabase RPC (see `shared/js/lens-nav-strip.js:30`). | DG-3 above selects Branch B (0 new keys). The lens-category sidebar entry's "ניהול קטלוג" link visibility is gated by the **same** `is_platform_super_admin()` RPC call, mirrored from lens-nav-strip's existing gate. Documented in §6. |
| F-DB-3 | (None in Brief) | `tenants.name_he` does **not** exist. Hebrew name lives in `tenants.name`. | SPEC body uses `tenants.name`. |
| F-DB-4 | (None in Brief) | `permissions.key` does **not** exist. The dotted-key string lives in `permissions.id` (TEXT). | SPEC body uses `permissions.id` for all references. |
| F-DB-5 | Brief §2.1: "Frames category tabs (8 tabs, down from 10)" + a list of 6 kept items + 4 removed | Existing `inventory.html` has **11** tabs (entry, reduction, inventory, brands, suppliers, systemlog, receipt, purchase-orders, access-sync, stock-count, returns, incoming-invoices). After removing the 4 cross-category items (suppliers, systemlog, access-sync, incoming-invoices), **7** frames tabs remain (entry, reduction, inventory, brands, receipt, purchase-orders, stock-count, returns — 8 actually; receipt is wired-from `entry-choice` not a top-level tab button, see P10 cross-check). Brief was wrong on both counts. | §2.1 below uses the empirically-verified list: **7 frames-category top-level tabs** = entry, reduction, purchase-orders, inventory, brands, stock-count, returns. The `receipt` section stays (entered via `entry-choice` sub-page button); `incoming-invoices` moves to sidebar; `systemlog` is **superseded** by the new unified log; `access-sync` + `suppliers` move to sidebar. |
| F-DB-6 | Brief §2.1: "Lens category tabs (6 tabs): … הזמנות רכש, קבלת סחורה, ניהול קטלוג" | `lens-nav-strip.js LENS_PAGES` has **7** entries. Missing from Brief: `lens-pos-list.html` (the "active POs list" screen distinct from the "create PO" form). | §2.1 below uses 7 lens-category entries matching `LENS_PAGES`. The "ניהול הזמנות פעילות" tab is preserved (production screen, `lens.po.view` permission, used by staff). |
| F-DB-7 | Brief §2.4: `activity_log` mapped to "פעולות מערכת" rows; expects inventory-relevant entries | All 10 distinct `activity_log.entity_type` values today are CRM-only. Inventory entries: **zero**. | §2.4 below keeps the filter for forward-compatibility (when frames-side starts writing to `activity_log`); today the branch contributes 0 rows. Documented in F-DB-7 callout in the view's body comment. |
| F-DB-8 | (None in Brief) | `inventory_logs` lacks `(tenant_id, created_at DESC)` composite index. Today's 100 ms Seq Scan is fine; at 10× scale it'll be ~1 s. | Pre-authorize index creation under DG-1 Branch B (not used today; available if Executor's pre-flight EXPLAIN re-run shows degradation). |
| F-DB-9 | (None in Brief) | `activity_log.created_at` is NULLABLE; the other 3 sources have it NOT NULL. | View body coalesces `created_at` defensively (`COALESCE(created_at, '1970-01-01'::timestamptz)`) in the activity_log branch so the ORDER BY is total. Marginal cost; eliminates a class of NULL-sort surprise. |

These 9 findings would have surfaced as Stage-2 deviations had they not been pinned at author time. P-AUTHOR-4 pays for itself again.

### §0.D — Lessons from the 3 most recent M1 FOREMAN_REVIEWs that affect this SPEC

Per `opticup-strategic` SKILL §"SPEC Authoring Protocol" Step 1 #7 (harvest lessons from prior reviews):

| Source | Lesson | Applied here |
|---|---|---|
| `M1_LENS_PHASE_2_COMPLETION/FOREMAN_REVIEW.md` P-AUTHOR-1 (CREATE OR REPLACE FUNCTION semantics) | `CREATE OR REPLACE` with different signature creates a new overload, not a replacement; DROP required | N/A — this SPEC creates ONE view and ZERO functions; no RPC signature changes. |
| `M1_LENS_PHASE_2_COMPLETION/FOREMAN_REVIEW.md` P-AUTHOR-2 (decision-gate pattern) | Codify decision gates for high-uncertainty parts | Applied: DG-1 / DG-2 / DG-3 in §0.B above, each with measurable thresholds and pre-authorized branches. |
| `M1_LENS_PHASE_1B_GAP_CLOSURE/FOREMAN_REVIEW.md` P-AUTHOR-1 (per-column reference probe) | Every column name in the SPEC body must be empirically verified | Applied: P1+P4+P6+P7+P8 above probe every column the SPEC body references. |
| `M1_LENS_PHASE_1B_GAP_CLOSURE/FOREMAN_REVIEW.md` P-AUTHOR-2 (MCP apply_migration PK-collision fallback) | Pre-authorize `execute_sql` fallback for concurrent-session collisions | Applied: §10 Autonomy Envelope explicitly authorizes the fallback for the single DDL block (CREATE VIEW). |
| `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` P-AUTHOR-3 (RPC body probe) | Probe RPC bodies before assuming SPEC behavior | N/A — no RPC changes in this SPEC. |
| `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` P-AUTHOR-4 (Brief-vs-DB-reality audit) | Cross-reference every Brief claim against live DB | Applied: §0.C above. 9 findings. |

**Cross-Reference Check completed 2026-05-16 against GLOBAL_SCHEMA rev current + live Supabase: 0 net-new collisions / 9 Brief-vs-reality hits resolved.** Per `opticup-strategic` SKILL §1.5 mandatory line.

---

## 1. Goal

Restructure the inventory module from a 11-tab single-screen into a sidebar-driven hub with two product categories (frames + lenses, active) + two placeholder categories (contact-lenses + accessories, "בקרוב") + four cross-category items (suppliers, incoming invoices, unified log, Access sync). Remove the "מחלקת עדשות" home-card from `index.html`; lens screens become reachable only via the inventory sidebar. Ship a unified log view that merges 4 historical log sources behind a single filterable UI.

**Non-goal:** Database schema changes to product/inventory/lens tables. The single DDL is `CREATE VIEW v_inventory_unified_log` (and optionally one index, per DG-1 Branch B — not expected). No new RPCs, no new permission keys (per DG-3).

---

## 2. Implementation — what changes, where

### 2.1 Sidebar shell (`inventory.html`)

**Add** a right-side (RTL `border-left`) sidebar at the top of `<main>` (current sidebar = none; current navigation = the 11 `<button data-tab>` strip in `<nav id="mainNav">`).

Sidebar structure (matches Approach A mockup, with Brief amendments per F-DB-5/6):

```
📦 קטגוריות מלאי
   👓 מסגרות           (active by default; data-category="frames")
   🔬 עדשות            (active; data-category="lenses"; click → window.location = lens-inventory.html?t=…)
   👁 עדשות מגע        (disabled, "בקרוב")
   🎒 אביזרים          (disabled, "בקרוב")

🔄 חוצה-קטגוריות
   🚚 ספקים            (data-category="suppliers" — loads existing tab-suppliers section)
   📄 חשבוניות נכנסות   (data-category="incoming-invoices" — loads existing tab-incoming-invoices section)
   📊 לוג מערכת מאוחד   (data-category="unified-log" — loads NEW tab; supersedes tab-systemlog)
   🔁 סנכרון Access     (data-category="access-sync" — loads existing tab-access-sync section, gated by `data-feature="access_sync"`)
```

**Restructure the horizontal `<nav id="mainNav">`** so it becomes a category-aware tab strip. Selecting "מסגרות" in the sidebar shows the frames-category buttons (entry, reduction, purchase-orders, inventory, brands, stock-count, returns — **7 buttons**). Selecting "ספקים" / "חשבוניות נכנסות" / "סנכרון Access" / "לוג מערכת מאוחד" hides the frames-buttons row entirely (those are single-section screens; no inner tabs).

**Implementation note (for Executor):** Add a small `inventory-shell.js` (~150-200 lines) under `modules/inventory/`:

- Owns the sidebar state machine (which category is active).
- On category click: hide `<nav id="mainNav">` if the category has no inner tabs; show only the matching `<section id="tab-…">` blocks; deactivate any unrelated `.active` tabs.
- Persists current category to `sessionStorage` so refreshing returns the user to the same screen.
- On "עדשות" click: `window.location.href = urlWithTenant('lens-inventory.html')` (full-page navigation per DG-2).
- Uses `urlWithTenant()` (already exists in inventory.html closing `<script>` block) for any link with the tenant param.

**CSS:** Add a new file `css/inventory-shell.css` (~80-120 lines) defining `.inv-sidebar`, `.inv-sidebar-section`, `.inv-cat-item`, `.inv-cat-item.active`, `.inv-cat-item.disabled`. Mockup CSS values are the reference (width: 240px; right border 1px solid `#e2e8f0`; active state uses `#1e3a8a` Navy + `#eff6ff` background). RTL-friendly: use `border-inline-start` instead of `border-left` so logical inheritance is preserved.

**Permission gating on sidebar entries:**
- "מסגרות" — `inventory.view`
- "עדשות" — `lens.inventory.view`
- "ספקים" — `suppliers.view`
- "חשבוניות נכנסות" — (no perm key — same as today's tab)
- "לוג מערכת מאוחד" — `settings.view` (same as today's `tab-systemlog`)
- "סנכרון Access" — `sync.view` + `data-feature="access_sync"` (mirror existing tab)

Tabs hidden when permission lacking (matches `applyUIPermissions()` pattern already in `auth-service.js`).

### 2.2 Home-card removal (`index.html` line 149)

Per Brief §2.2, **delete line 149** (`{ id: 'lenses', label: 'מחלקת עדשות', icon: '👓', url: 'lens-inventory.html', status: 'active', permission: 'lens.inventory.view', feature: 'lenses' },`).

Effect: home screen returns to 8 active cards (inventory, debt, shipments, crm, storefront, employees, settings + the 3 coming_soon placeholders that don't render).

Lens-category sidebar entry inside `inventory.html` (§2.1 above) becomes the sole entry point.

### 2.3 Suppliers screen — category badges + filter pills (UI enrichment only)

Inside the existing `tab-suppliers` section + supporting JS (`modules/brands/suppliers.js`), enrich the suppliers list with category badges:

- For each supplier row, compute two booleans at load time:
  - `supplies_frames` = `EXISTS (SELECT 1 FROM supplier_brand_distribution WHERE supplier_id = s.id AND status='active' AND NOT is_deleted AND tenant_id = current_tenant)`
  - `supplies_lenses` = `EXISTS (SELECT 1 FROM supplier_catalog_offering WHERE supplier_id = s.id AND status='active' AND NOT is_deleted AND tenant_id = current_tenant)`
- Render badges next to supplier name: `👓 מסגרות` (light-purple chip, `#ede9fe / #5b21b6` per mockup) + `🔬 עדשות` (light-blue chip, `#dbeafe / #1e40af`).
- Suppliers with no category indicator show no badge (graceful default).

**Filter pill bar** at the top of the suppliers list (above the existing table toolbar):

```
[הכל] [👓 מסגרות (N)] [🔬 עדשות (N)] [⚪ ללא קטגוריה (N)]
```

Counts are derived client-side from the loaded supplier list. Clicking a pill filters the rendered table (client-side filtering on already-loaded data, mirrors the existing `applySupplierFilters` pattern in `debt-supplier-filters.js`).

**No schema changes. No new tables. Pure UI enrichment via additional SELECT joins or per-row sub-queries on already-loaded data.**

Implementation hint for Executor: extend the existing `suppliers.js` `loadSuppliersTab()` flow with a single batched fetch:

```js
const [{data: sbd}, {data: sco}] = await Promise.all([
  sb.from('supplier_brand_distribution').select('supplier_id').eq('tenant_id', getTenantId()).eq('status','active').eq('is_deleted', false),
  sb.from('supplier_catalog_offering').select('supplier_id').eq('tenant_id', getTenantId()).eq('status','active').eq('is_deleted', false)
]);
const framesSet = new Set(sbd.map(r => r.supplier_id));
const lensSet = new Set(sco.map(r => r.supplier_id));
// then per-row: supplies_frames = framesSet.has(s.id); supplies_lenses = lensSet.has(s.id);
```

### 2.4 Unified inventory log (`v_inventory_unified_log` view + new UI tab)

#### View definition

```sql
CREATE VIEW public.v_inventory_unified_log
  WITH (security_invoker = on)
  AS
WITH inv_logs AS (
  SELECT
    tenant_id,
    created_at,
    'inventory_logs'::text       AS source_table,
    id::text                     AS source_id,
    'frames'::text               AS category,
    action                       AS action_type,
    performed_by                 AS user_display,
    barcode                      AS entity_label,
    qty_before, qty_after,
    (COALESCE(qty_after,0) - COALESCE(qty_before,0)) AS qty_delta,
    price_before, price_after,
    final_amount                 AS amount,
    NULL::text                   AS currency_code,
    NULL::jsonb                  AS details_json
  FROM public.inventory_logs
), stock_mov AS (
  SELECT
    tenant_id,
    created_at,
    'stock_movement'::text,
    id::text,
    'lenses'::text,
    movement_type,
    performed_by::text,
    variant_id::text,
    NULL::integer, NULL::integer,
    qty_delta,
    NULL::numeric, NULL::numeric,
    cost_basis_at_movement,
    NULL::text,
    NULL::jsonb
  FROM public.stock_movement
), act_log AS (
  SELECT
    tenant_id,
    COALESCE(created_at, '1970-01-01'::timestamptz)  AS created_at,   -- F-DB-9 NULL safety
    'activity_log'::text,
    id::text,
    'cross'::text,
    action,
    user_id::text,
    entity_id,
    NULL::integer, NULL::integer, NULL::integer,
    NULL::numeric, NULL::numeric,
    NULL::numeric,
    NULL::text,
    details
  FROM public.activity_log
  WHERE entity_type IN ('inventory','stock_movement','stock_lot','stock_adjustment','purchase_order','purchase_receipt','sync')
   -- F-DB-7: today this returns 0 rows; future-proofing for frames-side activity_log writers.
), sync_l AS (
  SELECT
    tenant_id,
    created_at,
    'sync_log'::text,
    id::text,
    'cross'::text,
    status,
    NULL::text,
    filename,
    NULL::integer, NULL::integer, NULL::integer,
    NULL::numeric, NULL::numeric,
    NULL::numeric,
    NULL::text,
    errors
  FROM public.sync_log
)
SELECT * FROM inv_logs
UNION ALL SELECT * FROM stock_mov
UNION ALL SELECT * FROM act_log
UNION ALL SELECT * FROM sync_l;

COMMENT ON VIEW public.v_inventory_unified_log IS
  'Cross-source inventory activity log. UNIONs inventory_logs (frames + Access-sync historical), stock_movement (lens FIFO), activity_log (sync/CRM-style entries with entity_type in inventory family), sync_log. RLS inherited from source tables via security_invoker=on. Authored 2026-05-16 by M1_INVENTORY_REDESIGN SPEC §2.4.';

GRANT SELECT ON public.v_inventory_unified_log TO authenticated;
-- No anon GRANT — inventory log is staff-only.
```

**Why `security_invoker=on`:** Source tables already carry the canonical tenant_isolation RLS pair (P9 above). With `security_invoker=on`, anon/authenticated/service queries against the view inherit each source table's row-level filtering — no double-implementation, no leak risk.

**Why no anon GRANT:** Inventory log contents (employee names, qty deltas, prices) are not safe for the storefront. Defense in depth — the source tables already block anon, the view adds the GRANT exclusion for clarity.

#### Filter UI (new `tab-unified-log` section in `inventory.html`)

5 filter controls + free-text search, matching Brief §2.4:

```
<section id="tab-unified-log" class="tab">
  <div class="card">
    <h3>📊 לוג מערכת מאוחד</h3>
    <div class="filter-bar">
      <select id="ul-cat">                  <!-- 1. category -->
        <option value="">הכל</option>
        <option value="frames">מסגרות</option>
        <option value="lenses">עדשות</option>
        <option value="cross">חוצה-קטגוריות</option>
      </select>
      <select id="ul-action">               <!-- 2. action type — populated client-side from distinct values -->
        <option value="">פעולה — הכל</option>
      </select>
      <select id="ul-user">                 <!-- 3. user — populated from distinct user_display values -->
        <option value="">משתמש — הכל</option>
      </select>
      <input type="date" id="ul-from"/>     <!-- 4. date range from -->
      <input type="date" id="ul-to"/>       <!-- 4. date range to -->
      <input type="search" id="ul-q" placeholder="חיפוש חופשי — ברקוד / מותג / דגם…"/>  <!-- 5. -->
      <button class="btn btn-p" onclick="loadUnifiedLog()">🔄 רענן</button>
    </div>
    <div id="ul-summary"></div>
    <div class="table-wrap">
      <table id="ul-table">
        <thead><tr>
          <th>תאריך</th><th>מקור</th><th>קטגוריה</th><th>פעולה</th><th>משתמש</th>
          <th>פריט</th><th>כמות</th><th>סכום</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <div class="pagination">
      <button id="ul-prev" onclick="ulPage(-1)">← הקודם</button>
      <span id="ul-page-label">1</span>
      <button id="ul-next" onclick="ulPage(+1)">הבא →</button>
    </div>
  </div>
</section>
```

New JS: `modules/inventory/unified-log.js` (~200-250 lines):

- `loadUnifiedLog()` — calls `sb.from('v_inventory_unified_log').select('*').eq('tenant_id', getTenantId())` + applied filters + `order('created_at', {ascending:false})` + `range(offset, offset+pageSize-1)`.
- Defense-in-depth `.eq('tenant_id', getTenantId())` even though view inherits RLS (Iron Rule 22).
- Free-text search uses client-side filter on the loaded page (server-side ILIKE on JSONB `details_json` is deferred to a future SPEC if needed).
- Distinct-values dropdowns (action_type + user_display) populated once on first load (server-side aggregate query).

### 2.5 Lens-nav-strip.js — single-line update

Per DG-2 Branch B, **keep `shared/js/lens-nav-strip.js`** but update line 91:

```diff
-    homeAnchor.textContent = '← דף הבית';
-    homeAnchor.href = urlWithTenant('index.html');
+    homeAnchor.textContent = '← מרכז המלאי';
+    homeAnchor.href = urlWithTenant('inventory.html');
```

(Specific lines: `shared/js/lens-nav-strip.js:90-91`.)

This single change re-routes the "back" link from each lens HTML page so it lands the user back at the inventory sidebar (where the lens category will be selected) instead of dropping them onto the home screen. Preserves the "I'm inside inventory management" mental model the Brief is establishing.

### 2.6 Existing `tab-systemlog` deprecation

Today's `<section id="tab-systemlog">` (lines 339-397 of inventory.html) renders the legacy per-source system log via `modules/admin/system-log.js`. It is **superseded** by the new unified log section.

- HTML: `<section id="tab-systemlog">` block remains in inventory.html but is **hidden** by the new shell (no sidebar entry points to it). The associated `<button data-tab="systemlog">` in `<nav id="mainNav">` is **deleted** in C3.
- JS: `modules/admin/system-log.js` stays on disk (it has the existing `loadSystemLog()` implementation we can mine for filter idioms when building `unified-log.js`). Iron Rule 21: this is a **replace** — old screen unreachable, new screen takes over.
- After Pipeline close, in the next M1 maintenance Pipeline, `system-log.js` + the orphaned `<section id="tab-systemlog">` block + this `data-tab` button residue should be cleaned up. **Out of scope here** to keep this SPEC's destructive-ops surface minimal.

---

## 3. Success Criteria (measurable)

Verdict mapping (per Brief §10): all 🟢 → SPEC 🟢; any 🔴 not deferred → SPEC 🔴; mix of 🟢 + intentional 🟡 deferrals → SPEC 🟡.

### Part A — Sidebar shell + frames-category restructure

| # | Criterion | Verify command / expected value |
|---|---|---|
| A1 | `inventory.html` line count is within ±10% of `1046` after the redesign (target absolute max 1200) | `wc -l inventory.html` returns 950–1200 |
| A2 | Right-side sidebar block exists with `id="inv-sidebar"` and 8 category entries (4 product + 4 cross-category) | `grep -c 'class="inv-cat-item"' inventory.html` ≥ 8; `grep 'data-category="frames"' inventory.html` ≥ 1 |
| A3 | Frames category sidebar entry is `.active` by default | `grep 'data-category="frames"[^>]*\bactive\b' inventory.html` ≥ 1 |
| A4 | The 4 cross-category tabs were REMOVED from `<nav id="mainNav">`: suppliers, systemlog, access-sync, incoming-invoices | `grep -c 'data-tab="suppliers"' inventory.html` = 0 (button removed); `grep -c 'data-tab="systemlog"' inventory.html` = 0; `data-tab="access-sync"` = 0; `data-tab="incoming-invoices"` = 0 |
| A5 | 7 frames-category buttons remain in `<nav id="mainNav">` | `grep -c '<button data-tab=' inventory.html` = 7 (entry, reduction, purchase-orders, inventory, brands, stock-count, returns) |
| A6 | New CSS file `css/inventory-shell.css` exists, ≤ 350 lines (Iron Rule 12) | `[ -f css/inventory-shell.css ] && [ $(wc -l < css/inventory-shell.css) -le 350 ]` |
| A7 | New JS file `modules/inventory/inventory-shell.js` exists, ≤ 350 lines | `[ -f modules/inventory/inventory-shell.js ] && [ $(wc -l < modules/inventory/inventory-shell.js) -le 350 ]` |
| A8 | `inventory-shell.js` is loaded by `inventory.html` (script tag present, after `auth-service.js`) | `grep "inventory-shell.js" inventory.html` ≥ 1 |
| A9 | Clicking "מסגרות" sidebar item shows the 7 frames tabs and the matching `<section id="tab-entry">` is `.active` | Manual via Stage 4 Localhost-Tester + Chrome MCP screenshot |
| A10 | Clicking "עדשות" sidebar item navigates to `lens-inventory.html?t=…` (full-page nav, not in-page swap) | Manual via Stage 4 Chrome MCP click + URL check |

### Part B — Home-card removal

| # | Criterion | Verify command / expected value |
|---|---|---|
| B1 | `index.html` MODULES array no longer contains the `id: 'lenses'` entry | `grep -c "id: 'lenses'" index.html` = 0 |
| B2 | `index.html` line count drops by exactly 1 from its pre-SPEC value | `wc -l index.html` = `pre_value - 1` (pre = 390; post = 389) |
| B3 | Home screen shows 8 active cards + 3 coming_soon | Manual via Stage 4 Chrome MCP + count `.module-card:not(.coming-soon)` = 8 |

### Part C — Suppliers badge enrichment

| # | Criterion | Verify command / expected value |
|---|---|---|
| C1 | `modules/brands/suppliers.js` references `supplier_brand_distribution` and `supplier_catalog_offering` table names | `grep -c "supplier_brand_distribution" modules/brands/suppliers.js` ≥ 1 AND `grep -c "supplier_catalog_offering" modules/brands/suppliers.js` ≥ 1 |
| C2 | Loading the suppliers tab on demo shows at least 1 supplier with the lens badge (demo has 1 lens offering — `Prizma Optic (דמו)`) | Manual via Stage 4 Chrome MCP screenshot |
| C3 | Filter pill bar with `הכל / מסגרות / עדשות / ללא קטגוריה` renders | `grep -c "filter-pill\|cat-pill" modules/brands/suppliers.js` ≥ 1 (or matching markup in inventory.html) |
| C4 | All 4 pills work end-to-end on demo (Stage 4 manual) | Localhost-Tester clicks each pill, verifies row count changes match expected |

### Part D — Unified log view + UI

| # | Criterion | Verify command / expected value |
|---|---|---|
| D1 | View `public.v_inventory_unified_log` exists with `security_invoker=on` | MCP: `SELECT viewname, definition FROM pg_views WHERE schemaname='public' AND viewname='v_inventory_unified_log'` returns 1 row; `SELECT reloptions FROM pg_class WHERE relname='v_inventory_unified_log'` contains `security_invoker=on` |
| D2 | The view returns 6193 rows when queried with Prizma tenant_id (matches §0.A P2 totals) | MCP: `SELECT count(*) FROM v_inventory_unified_log WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` = 6193 ± 5 (allow for rows added between SPEC seal + execution) |
| D3 | The view returns 1238 rows for demo tenant_id | MCP: same query, demo tenant_id, = 1238 ± 5 |
| D4 | `authenticated` role has SELECT on the view; `anon` does NOT | MCP: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='v_inventory_unified_log'` shows `authenticated:SELECT` and no `anon` row |
| D5 | New JS file `modules/inventory/unified-log.js` exists, ≤ 350 lines | `[ -f modules/inventory/unified-log.js ] && [ $(wc -l < modules/inventory/unified-log.js) -le 350 ]` |
| D6 | New `<section id="tab-unified-log">` block exists in `inventory.html` with 5 filter controls (category, action, user, date-from, date-to) + 1 search input | `grep -c 'id="ul-cat"\|id="ul-action"\|id="ul-user"\|id="ul-from"\|id="ul-to"\|id="ul-q"' inventory.html` ≥ 6 |
| D7 | Sidebar entry `data-category="unified-log"` exists | `grep -c 'data-category="unified-log"' inventory.html` ≥ 1 |
| D8 | All 5 filters + free-text search work end-to-end on demo (Stage 4) | Localhost-Tester exercises each filter individually + 2 combined |
| D9 | EXPLAIN ANALYZE re-run on Prizma after view creation returns within ±2× of the §0.A P5 baseline (212 ms cap) | MCP `EXPLAIN ANALYZE SELECT * FROM v_inventory_unified_log WHERE tenant_id='6ad0781b…' ORDER BY created_at DESC LIMIT 100` shows execution_time < 212 ms |

### Part E — `lens-nav-strip.js` home-link update

| # | Criterion | Verify command / expected value |
|---|---|---|
| E1 | `lens-nav-strip.js` home link text is `← מרכז המלאי` and href targets `inventory.html` | `grep "← מרכז המלאי" shared/js/lens-nav-strip.js` returns 1 line; `grep "urlWithTenant('inventory.html')" shared/js/lens-nav-strip.js` returns 1 line |

### Part F — Cross-cutting

| # | Criterion | Verify command / expected value |
|---|---|---|
| F1 | Iron Rule 31 integrity gate exit 0 on every Pipeline commit | `npm run verify:integrity` returns exit 0 at HEAD of each commit + before each push |
| F2 | Iron Rule 32 destructive-ops gate accepts every commit | `npm run verify -- --staged` (or implicit pre-commit) passes on each commit |
| F3 | All Pipeline work happens on `develop`, no main-branch ops, no `--amend`, no `--no-verify`, no wildcard adds | `git log develop --since="..." --format="%H %s"` shows 6-8 commits, all `develop` only |
| F4 | Prizma tenant data untouched | Row-count delta on `inventory_logs`/`stock_movement`/`activity_log`/`sync_log`/`brands`/`suppliers`/`supplier_brand_distribution`/`supplier_catalog_offering` for `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` = 0 before vs after |
| F5 | Smoke 7/7 baseline passes pre-Pipeline + post-Pipeline | `npm run smoke` (or equivalent) returns 7 PASS / 0 FAIL at both checkpoints |
| F6 | No new Sentinel CRITICAL/HIGH alerts post-Pipeline (deferred to Stage 4 Localhost-Tester scope; Sentinel runs hourly and surfaces in next refresh) | Manual via reading `docs/guardian/GUARDIAN_ALERTS.md` after Stage 4; any new CRITICAL/HIGH that traces back to this Pipeline → 🔴 |
| F7 | 4 Chrome MCP visual screenshots saved to `_archive/m1-redesign-2026-05-16/screenshots/` | Stage 4 deliverable: `frames-view.png`, `lens-view.png`, `suppliers-with-badges.png`, `unified-log-with-filters.png` |
| F8 | `MASTER_ROADMAP.md` cross-module impact assessment confirmed unchanged (no M2/M3/M4 ripple) | Stage 5 spot-check + Reviewer probe |

**Verdict rule:** all 🟢 → 🟢. Any single criterion 🔴 (e.g., Iron Rule 31 fails, Prizma touched, smoke FAIL) → 🔴 verdict on the entire Pipeline. Intentional 🟡 deferrals (e.g., F6 if Sentinel hasn't refreshed by close) noted in §3 of FOREMAN_REVIEW; do not block.

---

## 4. Destructive Operations

Per `scripts/checks/destructive-ops-declared.mjs` enforcement at every commit:

1. **`index.html` line 149 deletion** — the "מחלקת עדשות" MODULES entry. This is a 1-line deletion in the JS array; no other content touched.
2. **`inventory.html` structural HTML rewrite** — replace the existing `<nav id="mainNav">` 11-button strip with a category-aware shell + sidebar. Pre-existing `<section id="tab-…">` blocks are PRESERVED (no section deletions in this SPEC) but some become unreachable via the new sidebar (specifically `tab-systemlog` — its `<button data-tab>` is removed). This counts as "structural rewrite" per the Brief §6 declaration.
3. **`<button data-tab="systemlog">` removal from `<nav id="mainNav">`** — 1-line deletion. The `<section id="tab-systemlog">` block stays in HTML (orphan to be cleaned in future SPEC); the `<button>` is removed so the section becomes unreachable via UI.
4. **`<button data-tab="suppliers">` removal from `<nav id="mainNav">`** — 1-line deletion. (Suppliers is reachable via sidebar.)
5. **`<button data-tab="access-sync">` removal from `<nav id="mainNav">`** — 1-line deletion. (Access sync is reachable via sidebar.)
6. **`<button data-tab="incoming-invoices">` removal from `<nav id="mainNav">`** — 1-line deletion. (Incoming invoices is reachable via sidebar.)
7. **`CREATE VIEW public.v_inventory_unified_log`** — additive DDL. No view drops. (Iron Rule 32 hook treats CREATE VIEW as authorized when declared here.)
8. **`GRANT SELECT ON public.v_inventory_unified_log TO authenticated`** — additive DCL.
9. **`shared/js/lens-nav-strip.js` line 90-91 edit** — text + href change on the home-link only. No file deletion.
10. **`git tag pre-inventory-redesign-2026-05-16`** — anchor for rollback (Tag-only; non-destructive in Iron Rule 32 sense but declared per protocol).
11. **(Conditional, DG-1 Branch B fallback only — NOT expected per §0.A P5)** `CREATE INDEX idx_inventory_logs_tenant_created ON inventory_logs(tenant_id, created_at DESC)` — additive DDL. Executor MUST re-run EXPLAIN at execution time; if execution exceeds 250 ms then create the index, otherwise skip. Either outcome is authorized.

**NOT authorized:**

- `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `DROP FUNCTION`, `DROP VIEW`, `DROP INDEX`, `TRUNCATE`, `DELETE FROM <table>` without a tenant-scoped WHERE.
- Any modification to `inventory_logs` / `stock_movement` / `activity_log` / `sync_log` table structure (columns, types, constraints, RLS policies).
- Any modification to `brands` / `suppliers` / `supplier_brand_distribution` / `supplier_catalog_offering` table structure.
- Any new permission key (per DG-3 Branch B — budget 0/1 used).
- Any new RPC.
- Any modification of `main` branch (merge, push, rebase).
- Any modification of Prizma tenant data (`tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'`).
- `git push --force` of any kind, on any branch.
- `git clean -fd` (Cowork-VM gate rule — never autonomous).
- `--no-verify`, `--no-gpg-sign`, `-c commit.gpgsign=false`, or any other hook-bypass flag.

---

## 5. Stop-on-deviation triggers (in addition to CLAUDE.md §9 globals)

Stop immediately and write a finding to `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{SLUG}.md` if:

1. **§0.A P5 EXPLAIN re-run at Executor pre-flight shows execution time > 250 ms** on Prizma → Branch B (index creation) is exercised. > 1000 ms → Branch C (materialization) → escalate to Foreman before proceeding (DG-1 thresholds).
2. **`brands.supplier_id` exists** at Executor pre-flight (would invalidate F-DB-1 resolution; the SPEC body would need an alternate derivation path).
3. **A new lens-* permission key was seeded between SPEC seal (07:00 local) and Executor start** → DG-3 baseline shifted; flag and proceed.
4. **The `inventory.html` `<nav id="mainNav">` has been modified by another commit** between SPEC seal and C2 start → potential merge race, halt + survey.
5. **Iron Rule 31 integrity gate failure** at any commit → STOP and investigate before touching another file (no `--no-verify` bypass — see "NOT authorized" above).
6. **Iron Rule 32 hook rejects any Pipeline commit** → STOP, inspect, re-declare the destructive op in §4 above if legitimate (then re-commit; never bypass).
7. **Prizma row-count delta > 0** on any of the 8 touched tables at any post-commit verification step.
8. **Any new console error on `inventory.html` or `lens-inventory.html` post-redesign** that wasn't there pre-redesign (regression).
9. **The Brief's autonomy clause exceeded** — specifically: adding more than 1 new permission key, retiring `lens-nav-strip.js` (DG-2 Branch B locked at B; switching to A is a Brief amendment requiring escalation), or any DROP of any kind.

For each triggered stop, the escalation file MUST include: timestamp, trigger #, observed state, proposed resolution options (A/B/C). Pipeline halts until Foreman + Daniel respond.

---

## 6. Out of Scope (explicit deferrals — these are NOT done in this Pipeline)

Per Brief §3 + this SPEC's tightening:

1. **No DB schema changes** to product/inventory/lens tables (`inventory`, `brands`, `suppliers`, `supplier_brand_distribution`, `supplier_catalog_offering`, `inventory_logs`, `stock_movement`, `activity_log`, `sync_log`, all `lens_*` tables). Only `v_inventory_unified_log` view creation + optional `idx_inventory_logs_tenant_created` index (DG-1 Branch B contingent).
2. **No CRUD logic changes** on any existing tab. Pure shell + log unification.
3. **No new RPCs.**
4. **No new permission keys** (DG-3 Branch B).
5. **No tenant settings panel** for inventory.
6. **No mobile/responsive rework.** Desktop-only.
7. **No contact-lenses or accessories implementation.** Sidebar entries are disabled placeholders.
8. **No D-M1-09 UX-consistency work.** That's the next SPEC after this one.
9. **No retirement of `shared/js/lens-nav-strip.js`** (DG-2 Branch B). Only the home-link string + href changes.
10. **No cleanup of orphaned `<section id="tab-systemlog">` block** in `inventory.html` after its `<button>` is removed. Defer to a maintenance SPEC.
11. **No cleanup of `modules/admin/system-log.js`** — file stays on disk (reference for filter idioms during `unified-log.js` build). Maintenance SPEC removes it.
12. **No ROADMAP marker flip** for M-NEW-34-3 (M1 Lens-1B ⬜ → ✅/🟡). That's a Module 1 Close Ceremony task (Architect-tier), out of this Pipeline.
13. **No CLAUDE.md / GLOBAL_MAP / GLOBAL_SCHEMA edits.** Master-doc updates deferred to Integration Ceremony (Stage 5 Foreman OR next Architect session).
14. **No `.claude/skills/` edits.** Skill-improvement proposals captured in FOREMAN_REVIEW; applied in next Architect session per the Self-Improvement Mandate.
15. **No `lens-pos-list.html` removal** even though Brief §2.1 omitted it from the lens-tabs list (F-DB-6). Per scope-protection, the screen is production and reachable via `lens-nav-strip.js`; SPEC chooses preserve-and-document.
16. **No server-side ILIKE / trigram search** on the unified log free-text field. Client-side filter on loaded page is sufficient for v1; trigram is a future optimization.
17. **No `pg_cron` job** for view refresh. The view is regular (not materialized) per DG-1 Branch A.

---

## 7. Rollback Plan

Should the Pipeline need to roll back AFTER any commit:

1. **For commits not yet pushed:** `git reset --hard <previous_commit>`. Daniel pre-authorized (the SPEC author) only because the working tree was clean at C1 start.
2. **For commits already pushed to `develop`:** `git revert <commit_hash>` per commit, push as a new commit. Never `--force-push` to `develop`.
3. **For the CREATE VIEW DDL (C6):** `DROP VIEW IF EXISTS public.v_inventory_unified_log CASCADE;` — fast, no data loss (view is read-only projection). Executor pre-flight should have a rollback SQL block ready before running the migration.
4. **For the `inventory_logs` index (C6 contingent, DG-1 Branch B):** `DROP INDEX IF EXISTS idx_inventory_logs_tenant_created;` — fast, additive structure only.
5. **Master anchor:** `git tag pre-inventory-redesign-2026-05-16` at C1 (SPEC seal commit). Allows `git reset --hard pre-inventory-redesign-2026-05-16` to undo the entire Pipeline if needed (only if no other concurrent commits landed between then and the rollback — concurrent-Pipeline orthogonality is the Executor's responsibility, per `M1_LENS_PHASE_1B_GAP_CLOSURE` precedent).

Rollback authorization: Daniel only (per CLAUDE.md §9 #7). Foreman + Executor may PREPARE the rollback artifacts and propose; Daniel decides whether to fire.

---

## 8. Expected Final State

After the full Pipeline (all 5 stages) closes 🟢:

**Repo state:**
- `inventory.html` ≈ 1050–1200 lines, has a right-side sidebar with 8 category entries + a category-aware tab strip.
- `index.html` is 389 lines (was 390), no "מחלקת עדשות" entry.
- New file `css/inventory-shell.css` (~80-120 lines).
- New file `modules/inventory/inventory-shell.js` (~150-200 lines).
- New file `modules/inventory/unified-log.js` (~200-250 lines).
- `shared/js/lens-nav-strip.js` line 90-91 updated (home link points to inventory.html).
- 4 new screenshots in `_archive/m1-redesign-2026-05-16/screenshots/`.
- New SPEC folder at `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/` containing this SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md.
- `docs/guardian/GUARDIAN_ALERTS.md` may have been updated by the Sentinel cron between SPEC seal and close — if so, NO new CRITICAL/HIGH attributable to this Pipeline.

**DB state:**
- One new view: `public.v_inventory_unified_log` (security_invoker=on, GRANT SELECT TO authenticated only).
- Zero new tables / RPCs / RLS policies / functions.
- (Contingent) Zero or one new index on `inventory_logs(tenant_id, created_at DESC)`.
- Zero row changes on Prizma; demo unchanged except possibly the Stage 4 smoke artifacts (Localhost-Tester may write 1-2 demo rows during smoke; cleaned up or documented per usual smoke-artifact pattern).

**UX state:**
- Staff member opens app → home screen has 8 cards, no separate "מחלקת עדשות" card.
- Click "ניהול מלאי" → land on inventory.html with sidebar visible, frames category active by default.
- Click "עדשות" in sidebar → navigate to lens-inventory.html, lens-nav-strip renders, "← מרכז המלאי" link visible (was "← דף הבית").
- Click "ספקים" in sidebar → suppliers screen with category badges + filter pills.
- Click "לוג מערכת מאוחד" in sidebar → unified log with 5 filters + free-text search.
- Click "סנכרון Access" in sidebar → existing Access sync screen, no functional change.

**Documentation state:**
- This SPEC folder + 5 sibling files (EXECUTION_REPORT, FINDINGS, REVIEW, TEST_REPORT, FOREMAN_REVIEW).
- SESSION_CONTEXT.md gets an M1_INVENTORY_REDESIGN entry at top (Foreman updates at Stage 5).
- MASTER_ROADMAP.md gets a 1-line addition under "Previously this morning" (Stage 5).
- 4 skill-improvement proposals (2 author + 2 executor) harvested in FOREMAN_REVIEW (Stage 5).
- Hebrew morning summary at `_archive/m1-redesign-2026-05-16/MORNING_SUMMARY_FOR_DANIEL.md`.

---

## 9. Commit Plan (~7 commits expected)

| # | Commit | Files touched | Iron Rule 32 ops invoked |
|---|---|---|---|
| C1 | `chore(spec): seal M1_INVENTORY_REDESIGN — sidebar redesign + unified log` | This SPEC.md (NEW) | None (additive doc only) |
| C2 | `feat(m1): inventory sidebar shell — frames category default + 7-tab strip` | `inventory.html` (rewrite `<nav id="mainNav">` + add `<aside id="inv-sidebar">`), `css/inventory-shell.css` (NEW), `modules/inventory/inventory-shell.js` (NEW) | §4 #2 + #3 + #4 + #5 + #6 (structural HTML rewrite + 4 `<button>` removals) |
| C3 | `feat(m1): retarget lens-nav-strip home link to inventory hub` | `shared/js/lens-nav-strip.js` (lines 90-91) | §4 #9 |
| C4 | `feat(m1): suppliers screen — category badges + filter pills` | `modules/brands/suppliers.js`, possibly `inventory.html` (filter-bar markup), `css/inventory-shell.css` (badge styles) | None |
| C5 | `feat(db,m1): v_inventory_unified_log view (4-source UNION ALL, security_invoker)` | MCP `apply_migration` only — no `supabase/migrations/*.sql` file (per TD-2 precedent applied across M1 SPECs) | §4 #7 + #8, optionally #11 |
| C6 | `feat(m1): unified inventory log UI — 5 filters + free-text search` | `inventory.html` (new `<section id="tab-unified-log">` + sidebar entry), `modules/inventory/unified-log.js` (NEW) | §4 #2 reinforcement (added one more `<section>` to inventory.html) |
| C7 | `feat(m1): remove "מחלקת עדשות" home-card — lens reachable via inventory sidebar only` | `index.html` (line 149 delete) | §4 #1 |
| C8 | `chore(spec): close M1_INVENTORY_REDESIGN — EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT` | `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/EXECUTION_REPORT.md` (NEW), `…/FINDINGS.md` (NEW if any), `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` (M1_INVENTORY_REDESIGN section at top) | None |

(Then Stage 3 Reviewer adds REVIEW.md commit; Stage 4 Localhost-Tester adds TEST_REPORT.md commit; Stage 5 Foreman adds FOREMAN_REVIEW.md + MASTER_ROADMAP.md updates + morning summary commit. Pipeline total = ~10-11 commits when all 5 stages count.)

Commit messages follow CLAUDE.md §9 convention: English, present-tense, scoped, lowercase scope. Each commit is single-concern. No wildcard adds.

**`git tag pre-inventory-redesign-2026-05-16`** is placed at the C1 commit's parent (i.e., on the commit BEFORE the SPEC seal, so the tag covers the entire Pipeline range).

---

## 10. Autonomy Envelope (per CLAUDE.md §9 Bounded Autonomy + Brief expanded clauses)

The Executor MAY do the following without asking:

1. **Execute every commit in §9 sequentially** without per-commit Foreman approval. Stop-on-deviation triggers (§5) are the only halt criteria.
2. **Re-run §0.A P5 EXPLAIN at C5 pre-flight** and choose DG-1 Branch A or B per the threshold. Branch C requires escalation (it's a Brief amendment).
3. **Use MCP `apply_migration` for C5 (CREATE VIEW + optional CREATE INDEX)**. If `23505: duplicate key value violates unique constraint "schema_migrations_pkey"` collision with a concurrent session, fall back to MCP `execute_sql` per `M1_LENS_PHASE_1B_GAP_CLOSURE` precedent (P-AUTHOR-2). Document the fallback in EXECUTION_REPORT.md.
4. **Refactor existing helpers in suppliers.js** to surface the category booleans (rather than adding new top-level functions), as long as net file size stays ≤ 350 lines (Iron Rule 12).
5. **Add up to 5 helper functions** in `inventory-shell.js` or `unified-log.js` without asking — as long as they don't escape those files and don't collide with existing globals (Iron Rule 10 grep check is mandatory).
6. **Apply skill-improvement learnings from §0.D** silently — e.g., the runtime semantics rehearsal pattern, the per-column probe, the decision-gate codification. No need to call out each application.
7. **Re-name `inventory-shell.js` helpers** if a clearer name surfaces during implementation (e.g., `activateSidebarCategory` → `setActiveCategory`) as long as references are updated atomically in the same commit.
8. **Add the screenshot directory** `_archive/m1-redesign-2026-05-16/screenshots/` and its placeholder README at Stage 1 close OR Stage 4 first action — either is acceptable.
9. **Pre-authorize execute_sql fallback** for the single DDL block — see #3 above.
10. **Permission-key budget: 0/1** consumed by DG-3 Branch B. The remaining 1-key budget is available if Executor's pre-flight surfaces an unanticipated gating need; if used, document in EXECUTION_REPORT §"In-flight decisions" + amend §4 destructive ops list.
11. **Index budget (DG-1 Branch B):** 0 or 1 index on `inventory_logs(tenant_id, created_at DESC)`. Executor picks based on EXPLAIN re-run. Either outcome OK.

The Executor MUST NOT (escalation required):

1. Add anything to §4 destructive ops list not already authorized.
2. Touch `lens-nav-strip.js` beyond the line 90-91 edit.
3. Modify any of the 4 log-source tables' structure.
4. Add a new permission key OR a second new permission key (budget cap is 1).
5. Refactor `index.html` MODULES array beyond the 1-line deletion.
6. Touch `main`, force-push, skip hooks.
7. Use `git add -A` / `git add .` / `git commit -am`.

---

## 11. Lessons Already Incorporated

Per `opticup-strategic` SKILL "Self-Improvement Mandate" — every SPEC must show evidence the author harvested and applied learnings from recent FOREMAN_REVIEWs. This SPEC applied:

1. **P-AUTHOR-4 (Brief-vs-DB-reality audit)** from `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` 2026-05-15 → §0.C above (9 findings).
2. **P-AUTHOR-1 (per-column reference probe)** from `M1_LENS_PHASE_1B_GAP_CLOSURE/FOREMAN_REVIEW.md` 2026-05-15 → §0.A probes P1+P4+P6+P7+P8 verify every column the SPEC body references.
3. **P-AUTHOR-2 (MCP apply_migration PK-collision fallback)** from `M1_LENS_PHASE_1B_GAP_CLOSURE/FOREMAN_REVIEW.md` 2026-05-15 → §10 #3 explicitly pre-authorizes execute_sql fallback.
4. **P-AUTHOR-2 (decision-gate pattern)** from `M1_LENS_PHASE_2_COMPLETION/FOREMAN_REVIEW.md` 2026-05-16 → §0.B (DG-1 / DG-2 / DG-3) gives Executor measurable evidence-based exits for the 3 highest-uncertainty Parts.
5. **D-FOREMAN-1 lesson on `CREATE OR REPLACE FUNCTION` semantics** from same Pipeline → N/A here (no RPC changes), noted in §0.D table as "Applied: N/A".
6. **§5.3 Runtime semantics rehearsal** from `opticup-strategic` SKILL → applied implicitly: the unified-log view has been mentally tested against (a) anon caller (will fail at GRANT level), (b) authenticated caller with wrong tenant_id (RLS on source tables blocks), (c) authenticated caller correct tenant_id (returns expected rows), (d) NULL `created_at` on activity_log rows (COALESCE handles).
7. **P-AUTHOR-2 from M1_LENS_PHASE_1B_PROCUREMENT (UI smoke matrix)** — counter was at 2/3. This SPEC's Stage 4 Localhost-Tester is required to exercise the UI in a real browser via Chrome MCP (4 screenshots + filter sweeps) — completing the 3rd firing. If applied at Stage 4 + recorded at Stage 5, P-AUTHOR-1 will auto-apply to the skill file in the next opticup-strategic session.

**Counter status this SPEC will affect:**
- P-AUTHOR-1 (UI smoke matrix) — 2/3 → 3/3 expected at Stage 4. Auto-apply trigger at next Architect session.
- P-AUTHOR-4 (Brief-vs-DB audit) — 1/3 → 2/3 (this is the 2nd consecutive SPEC applying it).
- P-AUTHOR-2 (decision-gate pattern) — 1/3 → 2/3 (this is the 4th consecutive Pipeline using it; previous PHASE_2 review noted 3 already, formalization began there).

---

## 12. References

- **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_INVENTORY_REDESIGN_BRIEF.md`
- **Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/INVENTORY_REDESIGN_SKETCHES.html` (Approach A is the selected design)
- **Architecture pre-decisions log:** `MASTER_ROADMAP.md` §3 Current State (this SPEC is one entry in the post-2026-05-16 series)
- **Iron Rule 32 enforcement:** `scripts/checks/destructive-ops-declared.mjs`
- **Iron Rule 31 enforcement:** `scripts/verify-tree-integrity.mjs`
- **Recent FOREMAN_REVIEWs harvested:** `M1_LENS_PHASE_2_COMPLETION/FOREMAN_REVIEW.md`, `M1_LENS_PHASE_1B_GAP_CLOSURE/FOREMAN_REVIEW.md`, `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md`
- **Existing patterns inherited:** `shared/js/lens-nav-strip.js` (LENS_PAGES single-source-of-truth pattern), `modules/admin/system-log.js` (filter idioms for unified-log.js), `modules/debt/debt-supplier-filters.js` (client-side pill-filter pattern for the suppliers UI).
- **Authority Matrix (CLAUDE.md §7):** All M1 SPECs live under `modules/Module 1 - Inventory Management/docs/specs/{SLUG}/`. This SPEC honors that location.

---

*End of SPEC.md. Sealed by opticup-strategic Foreman, 2026-05-16. Ready for Executor dispatch under Bounded Autonomy.*
