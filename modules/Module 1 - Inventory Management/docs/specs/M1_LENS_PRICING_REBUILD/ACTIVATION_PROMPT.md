# ACTIVATION_PROMPT — SPEC 5: M1_LENS_PRICING_REBUILD

**Paste into Claude Code session on Daniel's Windows desktop.** Group A's second + largest SPEC. Dispatch order per Daniel's Path X / Path Y decision — see parent Brief.

---

You are **opticup-executor**. Execute the SPEC at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRICING_REBUILD/SPEC.md
```

This is the LARGEST SPEC of the 6 (Brief estimate: 6–7h). Includes F-5 resolution from Foundation Phase 4a — the sell-price resolver wires both the new pricing screen AND the existing inventory lots-table.

## Bootstrap

1. Load skill `opticup-executor`. First Action protocol.
2. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --spec-slug M1_LENS_PRICING_REBUILD --files-owned-globs "modules/lens-pricing/**,modules/lens-inventory/lens-inventory-lot-pane.js,shared/js/lens-price-resolver.js,inventory.html,docs/GLOBAL_MAP.md,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRICING_REBUILD/**" --branch-owned develop
   ```
3. Read SPEC.md in full — §0 contains 2 Brief defects already caught + 2 Foreman decisions:
   - PostgREST CRUD for `lens_variant_notes` (no new RPCs; RLS verified)
   - `shared/js/lens-price-resolver.js` extracted to Module 1.5 ownership (cross-module helper)
4. Read mockup: `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` (1211 lines).
5. Read SPEC 4a FINDINGS F-5 + SPEC 4.5 §2 for F-5 context (sell-price resolver was deferred to this SPEC).

## Execute SPEC

8-commit plan per §10:

1. (Foreman commit — already exists)
2. **Refactor: partial + main bootstrap + view-mode toggle** (~28 → 350–600 lines partial):
   - Replace skeleton with mockup structure (view-mode toggle + 4 tabs + bulk toolbar + approval card + drawer mount + table mount + chip-filter mount + stat-card mount)
   - Rewrite main.js: bootstrap + view-mode toggle (default state driven by `hasPermission('lens_pricing.edit')`)
   - Preserve `LensPricing.bootstrap` global per shell-lens.js manifest

3. **4 top-tabs + bulk toolbar + approval card per mockup**:
   - Tabs: פעילים / ממתינים לאישור / מבצעים / היסטוריה (per mockup §3.1)
   - Bulk toolbar visible only in edit mode
   - Approval card with count badge (RPC: count `pricing_overlay` where `status='proposed'`)

4. **Table with cost-permission gating + chip-filter row**:
   - `TableBuilder.create()` with `data-table` extensions (column-permission via `.col-permission-gated` + `data-permission="inventory.view_cost_price"`)
   - PermissionUI re-scan after render (per SPEC 4a lesson)
   - Chip-filter-row populated from supplier/brand facets

5. **Lens Details drawer with logs + notes CRUD on lens_variant_notes**:
   - `LensDetailsDrawer.init()` from shared/
   - 2 tabs: לוגים (read-only logs from price_changes + stock_movements) + הערות (CRUD on `lens_variant_notes`)
   - Notes CRUD: direct PostgREST per §0 Foreman decision; tenant_id defense-in-depth on every op
   - UI gate: write actions only visible when `hasPermission('lens_pricing.edit')`

6. **Sell-price resolver + lens-inventory F-5 wiring** (KEY COMMIT):
   - **NEW file:** `shared/js/lens-price-resolver.js` (~60–100 lines)
     - `window.LensPriceResolver.resolve(offeringId, tenantId, asOfTs)` → `sb.rpc('effective_price', {...})` returns Numeric
     - `window.LensPriceResolver.resolveMany(offeringIds, tenantId, asOfTs)` → batch via Promise.all (chunked if needed)
   - Modify `modules/lens-inventory/lens-inventory-lot-pane.js` `renderLots()`:
     - Replace `const sellPrice = '—';` with resolver call (one RPC per lot OR batched per render)
     - On error: fall back to `—` + console.warn (don't break the table)
   - Modify `inventory.html` to load `shared/js/lens-price-resolver.js` BEFORE module scripts that consume it

7. **Wire sell-price column on lens-pricing table via resolver**:
   - grid.js or main.js calls resolver for each offering row
   - Optional perf: batch via `resolveMany` if N is large; per-row OK if <100

8. **Closeout**: EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG + MODULE_MAP + GLOBAL_MAP (register `LensPriceResolver`)

## Tier C VFV is MANDATORY (§8) — most thorough of all SPECs

Standard Tier C protocol PLUS F-5 cross-tab verification:

- Start ERP localhost (likely already running)
- Chrome MCP: navigate to `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=pricing`
- Side-by-side vs mockup (1211 lines — focus on top region: tabs + toggle + table)
- **Edit mode** test (default for ceo/manager):
  - All 4 tabs render with content + badge counts
  - Bulk toolbar visible
  - Click row → drawer opens → switch tabs → write a note → save → reload → note persists
  - Cost column visible (ceo has `inventory.view_cost_price`)
- **View-mode toggle** test:
  - Click "👁 צפייה" → edit-only controls hide
  - Click "✏️ עריכה" → controls return
- **Read-only mode** test (worker — no `lens_pricing.edit`):
  - Default state = readonly (toggle disabled or hidden)
  - No bulk toolbar, no Edit/Delete on notes, no inline edit
  - All other UI present
- **Cost-permission test** (user without `inventory.view_cost_price`):
  - Cost column hidden in pricing table
  - Cost column hidden in lens-inventory lots-table (regression)
- **F-5 cross-tab test (MUST PASS)**:
  - Navigate to `inventory` tab
  - Select a variant that has active offerings (Supabase MCP: `SELECT count(*) FROM supplier_catalog_offering WHERE variant_id = X AND tenant_id = demo AND status='active'`)
  - Lots-table `מחיר מכירה` column shows live price (not `—`)
  - Toast OR console.warn shows on resolver error (not silent break)
- ≥4 screenshots in `screenshots/` subdir
- Soft/hard-delete smoke notes (tenant-scoped + author-scoped)

## Stop-on-deviation triggers (SPEC §6)

- View-mode default doesn't match permission → STOP
- Edit action visible without `lens_pricing.edit` → STOP (UX leak)
- Cost column visible without `inventory.view_cost_price` → STOP
- Drawer notes shows cross-tenant rows → STOP **CRITICAL** (RLS leak)
- Resolver returns wrong price (VAT confusion / stale overlay) → STOP
- F-5 inventory regression after resolver wiring → STOP, do NOT close
- Iron Rule 32 (§4 declares `None.` — any destructive op is a SPEC defect)
- Iron Rule 12 — file >350 lines without clean split → STOP, propose split

## Split-watch reminder

This is the largest SPEC of the 6. SPEC §0 explicitly DECIDED not to pre-split. If during execution any single JS file approaches 350 lines OR wall-clock approaches 7h, halt at clean commit boundary and report. Foreman may re-author as 5a + 5b. Don't push through unbounded.

## No time budget

Per parent Brief. ~6–7h estimate; quality wins. Tier C VFV is non-negotiable.

## Closeout

1. EXECUTION_REPORT.md + FINDINGS.md
2. Update SESSION_CONTEXT + CHANGELOG + MODULE_MAP
3. Update `docs/GLOBAL_MAP.md` — register `LensPriceResolver` as shared helper
4. Commit + push to `origin/develop`
5. Release coordination lock
6. Notify Daniel: SPEC 5 closed, F-5 RESOLVED, Group A 100% complete

After SPEC 5 closes 🟢, Cowork-Architect writes brief FOREMAN_REVIEW.md. Then Groups B + C dispatch decision (Path X vs Path Y, second time).

**Bounded Autonomy. Stop only on deviation.**
