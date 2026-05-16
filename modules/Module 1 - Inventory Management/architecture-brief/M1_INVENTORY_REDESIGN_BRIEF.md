# M1 — Inventory Screen Redesign (Approach A: Sidebar Categories)

**Author:** opticup-architect (Cowork, 2026-05-16)
**Owning module:** Module 1 — Inventory Management
**Type:** UI/UX redesign + log unification. Same DB, new screen structure.
**Mode:** Full Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman)
**Predecessors:**
- `M1_LENS_PHASE_2_COMPLETION` 🟢 (lens department production-complete, 2026-05-16)
- `D-M1-09 reframing` 🟢 (UX-consistency mandate, 2026-05-16)
**Source:** Daniel decision 2026-05-16 evening — Approach A from `INVENTORY_REDESIGN_SKETCHES.html` with log/sync moved to sidebar.

---

## 1. Purpose

The current inventory screen has 10 horizontal tabs for frames only. Adding lens department (and future contact-lenses + accessories) would compound the crowding. The lens work shipped this morning created a separate top-level card on the home screen, which broke the conceptual unity of "inventory management."

This Brief restructures the inventory screen so:
1. **One inventory screen** serves all product categories (frames / lenses / future contact-lenses / future accessories).
2. **Sidebar** chooses the product category (mental model: "which product am I working on").
3. **Horizontal tabs** stay as the action layer within each category (matches the existing pattern — minimal mental model change for staff).
4. **Cross-category items** (suppliers, incoming invoices, unified log, Access sync) live in their own sidebar section.
5. **The standalone "lens department" home card is removed** — lenses become a sidebar category inside inventory.

Daniel's reasoning, validated by audit: most of the ERP is built in pattern A; staff cognitive load is minimized by reusing patterns; click count is lower than dashboard-first approaches.

---

## 2. Scope — What This Pipeline Ships

### 2.1 Part A — Inventory screen restructure

**Sidebar (right side, RTL):**

```
📦 קטגוריות מלאי
   👓 מסגרות           (active by default)
   🔬 עדשות
   👁 עדשות מגע        (disabled, "בקרוב")
   🎒 אביזרים          (disabled, "בקרוב")

🔄 חוצה-קטגוריות
   🚚 ספקים
   📄 חשבוניות נכנסות
   📊 לוג מערכת מאוחד
   🔁 סנכרון Access
```

**Selecting a category** loads its horizontal-tabs strip in the main area:

**Frames category tabs (8 tabs, down from 10):**
- הכנסת מלאי
- הזמנות רכש
- מלאי ראשי
- ניהול מותגים
- ספירת מלאי
- זיכויים
- (לוג מערכת removed → moved to sidebar)
- (סנכרון Access removed → moved to sidebar)
- (ניהול ספקים removed → moved to sidebar as cross-category)
- (חשבוניות נכנסות removed → moved to sidebar as cross-category)

→ Net: 6 frames tabs

**Lens category tabs (6 tabs):**
- מלאי עדשות
- בחירת דגמים פעילים
- תמחור
- הזמנות רכש
- קבלת סחורה
- ניהול קטלוג (platform-admin only — permission-gated)

→ 6 lens tabs

### 2.2 Part B — Home screen cleanup

The "מחלקת עדשות" card on `index.html` (added 2026-05-15 in `e92fe64`) is **removed**. Lens screens become reachable only through inventory → sidebar → "עדשות" category.

This restores the home screen to its pre-Pipeline state of 8 active cards (frames inventory, supplier debt, shipments, CRM, storefront, employees, settings) — and avoids the misleading impression that lenses are a separate module.

### 2.3 Part C — Suppliers screen (cross-category awareness)

The existing suppliers screen already uses one `suppliers` table — confirmed via DB probe (no separate frames/lens supplier tables). The redesign:

1. **Add category indicators per supplier:** badges showing which categories the supplier supplies (frames / lenses / contact-lenses / accessories). Derived from existing relationships (`brands.supplier_id`, `supplier_brand_distribution`, `supplier_catalog_offering.supplier_id`).
2. **Filter by category** — pill bar at the top of the suppliers list.
3. **One supplier row = one supplier reality.** Combined invoices (frames + lenses on same invoice) naturally flow into one debt record on one supplier.

No schema changes. Pure UI enrichment of existing data.

### 2.4 Part D — Unified inventory log

A single "לוג מערכת מאוחד" screen, replacing the per-category log tabs. Three data sources merged:

| Source | Maps to |
|---|---|
| `inventory_logs` (frames + Access-sync historical) | "פעולות מלאי" rows |
| `stock_movement` (lens FIFO movements) | "תזוזות מלאי" rows |
| `activity_log` (system actions tagged for inventory) | "פעולות מערכת" rows |

**Implementation approach:** create a new SQL view `v_inventory_unified_log` that UNIONs the three sources, mapping each to a common shape:

```
v_inventory_unified_log columns:
- tenant_id, created_at, source_table, source_id
- category (frames / lenses / contact_lenses / accessories / cross)
- action_type (insert / update / qty_change / price_change / receipt / sale / return / sync)
- user_display (employee name or 'system')
- entity_label (barcode + brand + model OR variant identifier)
- qty_before, qty_after, qty_delta
- price_before, price_after
- amount, currency_code
- details_json (full original row for drill-down)
```

**Filter UI (5 filters):**

1. **Category** — מסגרות / עדשות / עדשות מגע / אביזרים / הכל
2. **Action type** — הכנסה / הוצאה / שינוי כמות / שינוי מחיר / קבלת סחורה / ספירה / זיכוי / סנכרון / הכל
3. **User** — dropdown of employees who appear in the log
4. **Date range** — from / to date picker
5. **Free search** — searches barcode + brand name + model name (server-side ILIKE with trigram support if available, else simple ILIKE)

**Performance note:** if the union view turns out slow at production scale (thousands of rows per source), the executor MAY materialize the view OR add a `category` column directly to `inventory_logs` and `stock_movement` for index acceleration. Decided based on EXPLAIN ANALYZE during Pipeline.

### 2.5 Part E — Access sync screen (relocation)

The Access sync tab moves to the sidebar without functional changes. Same UI, same logic — just a new entry point. Keeps the existing `sync_log` table read by the same code path.

---

## 3. Out of Scope (Explicit Deferrals)

- **No DB schema changes to product/inventory/lens tables.** Only the new `v_inventory_unified_log` view + optional acceleration columns.
- **No changes to the underlying CRUD logic of any tab.** Only the navigation/sidebar shell + log unification.
- **No new RPCs.**
- **No tenant settings panel for inventory** — deferred (F-07 from Strategic Audit, tenant-2 onboarding scope).
- **No mobile/responsive rework.** Desktop-only (per Daniel: staff works from desktops in store).
- **No contact-lenses or accessories implementation** — sidebar entries are disabled placeholders only.
- **No change to D-M1-09 UX-consistency mandate work** — that's the next step after this Brief lands.

---

## 4. Iron Rule Compliance

- **Rule 1** (atomic quantity changes via RPC) — preserved; this Brief doesn't touch quantity logic.
- **Rule 12** (file size ≤350 lines) — split inventory shell JS into modules if needed.
- **Rule 14** (tenant_id on every table) — no new tables; the view inherits tenant_id from sources.
- **Rule 15** (RLS on every table) — the view runs with `security_invoker=on` so source-table RLS applies to anon/authenticated/service queries.
- **Rule 21** (No Orphans, No Duplicates) — the 4 log sources stay; the view consolidates **read access**, not data. Source-of-truth unchanged. Existing per-category log tabs are removed from the UI (not the data).
- **Rule 22** (defense-in-depth on writes) — N/A, this is read-only consolidation.
- **Rule 31** (integrity gate) — runs at every commit.
- **Rule 32** (destructive ops) — see §6.

---

## 5. Cross-Module Impact

- **M2 Platform Admin** — none. Lens catalog admin screen remains where it is, just reached via inventory sidebar instead of standalone home card.
- **M4 CRM** — none. CRM also writes to `activity_log` (596 rows visible in probe); the unified inventory log view filters to `entity_type` matching inventory categories only.
- **M3 Storefront** — none.
- **Future M7 Orders** — orders will write to `stock_movement` via `sale_order_id` FK (already exists). The unified log will pick up sale events automatically once M7 ships.

---

## 6. Destructive Operations (Iron Rule 32)

Declared:

1. **`index.html` modification** — remove the "מחלקת עדשות" card. The card's JS-array entry (line 149) is deleted; no other home-screen cards touched.
2. **Inventory shell HTML modification** — replace the existing 10-tab horizontal nav with the new sidebar + category-aware tabs structure. This is structural HTML rewrite of `inventory.html`.
3. **CSS additions** — new sidebar styles in shared/css or inventory-specific CSS. No deletions of existing styles unless they are exclusively for old structure.
4. **`v_inventory_unified_log` view creation** — `CREATE VIEW`. Additive; no view DROPs.
5. **`git tag pre-inventory-redesign`** — anchor for rollback. Tag-only.

**NOT authorized:**
- DROP of any table, column, policy, RPC, or view.
- Modification of `inventory_logs`, `stock_movement`, `activity_log`, or `sync_log` table structures.
- Removal of any per-category log writer in code.
- Touching main branch.
- Touching Prizma tenant data (all verification on demo).
- Force-push.

---

## 7. Success Criteria

The SPEC is 🟢 when:

1. Opening ERP → inventory module → sidebar shows 4 product categories (2 active: frames + lenses, 2 disabled with "בקרוב") + 4 cross-category items.
2. Clicking "מסגרות" loads exactly the frames tabs (no log, no sync, no suppliers).
3. Clicking "עדשות" loads exactly the lens tabs (6 tabs, catalog-admin permission-gated).
4. Clicking "ספקים" loads suppliers screen with category badges + filter pills.
5. Clicking "חשבוניות נכנסות" loads existing incoming-invoices screen.
6. Clicking "לוג מערכת" loads unified log with 5 working filters + free-text search.
7. Clicking "סנכרון Access" loads existing Access sync screen with no functional change.
8. Home screen has 8 cards (lens card removed).
9. All existing functional smokes pass (frames inventory CRUD, lens screens CRUD, supplier ops, receipt flow).
10. New smoke: unified log filters work end-to-end on demo — each filter individually + combined.
11. Smoke 7/7 baseline PASS.
12. Iron Rule 31 integrity gate exit 0 on every commit.
13. Prizma untouched (row-count delta = 0 on all touched tables; this Pipeline is UI/view only, so this should be trivial).
14. Permission gating: catalog-admin only visible to platform-admin role; non-admin sees lens-inventory/active-designs/pricing only.
15. Chrome visual smoke: 4 screenshots (frames view, lens view, suppliers with badges, unified log with filters) saved to `_archive/m1-redesign-2026-05-16/screenshots/`.

---

## 8. Pre-Flight (mandatory before Commit 1)

Executor MUST run these probes before any edit:

1. **Read `inventory.html`** end-to-end to understand current structure.
2. **Grep for all current entry points to lens-*.html** to ensure none are broken when home card is removed. Update any other navigation pointers.
3. **Read `lens-nav-strip.js`** (created 2026-05-16 in `e92fe64`) — verify whether to keep as the lens sub-nav inside the new shell or to retire in favor of the new horizontal-tabs pattern.
4. **Verify `activity_log` entity_types** — confirm there are no inventory-related `entity_type` values that need inclusion in the unified view (probe showed 10 CRM-only types as of 2026-05-16; if frames inventory starts writing to activity_log later, the view needs amendment).
5. **EXPLAIN ANALYZE** on a sample `v_inventory_unified_log` query for Prizma tenant — confirm performance is acceptable at current data scale before committing.
6. **Permission keys probe** — verify `lens.catalog.manage` (or equivalent) exists; if not, the executor MAY seed it as part of this Pipeline (max 1 new permission).

If any probe reveals a divergence from this Brief's assumptions → STOP, write a finding, propose amendment, wait for go-ahead.

---

## 9. Execution Flow

Full Auto Pipeline, single chat. 5-skill chain:

1. **opticup-strategic (Foreman)** — author SPEC at `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/SPEC.md` after running §8 probes.
2. **opticup-executor** — execute commit-by-commit. Expected ~6-8 commits (sidebar shell, frames tabs migration, lens tabs migration, suppliers badge enrichment, unified log view + UI, home-screen card removal, retro).
3. **opticup-reviewer** — full review against §7.
4. **opticup-localhost-tester** — runtime smoke on demo + Chrome visual on 4 screens.
5. **opticup-strategic (Foreman)** — FOREMAN_REVIEW + Hebrew summary.

Estimated Pipeline duration: 4-6 hours.

If pre-flight reveals scope unmet → escalation file at `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_REDESIGN_BLOCKER.md`.

---

## 10. Hebrew morning summary template

```
M1_INVENTORY_REDESIGN נסגר [🟢/🟡/🔴].
מבנה חדש: סייד-בר עם 4 קטגוריות + 4 חוצה-קטגוריות. הצוות נכנס לעדשות מתוך מסך ניהול מלאי.
לוג מאוחד עם 5 פילטרים + חיפוש פעיל.
כרטיס "מחלקת עדשות" הוסר מעמוד הבית.
smoke 7/7 PASS, פריזמה ללא נגיעה.
```

---

*End of Brief. UI/UX redesign anchored in existing DB. Iron Rule 32 §Destructive Operations declared. Bounded autonomy standard. No Daniel intervention expected during Pipeline.*
