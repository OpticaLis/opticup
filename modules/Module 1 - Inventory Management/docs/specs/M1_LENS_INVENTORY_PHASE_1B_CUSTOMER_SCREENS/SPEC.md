# SPEC — M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS

> **STATUS: SUPERSEDED by `M1_LENS_PHASE_1B_GAP_CLOSURE` (2026-05-15).** This SPEC stub was an unfinished placeholder for the Phase 1B customer-screens work that ultimately split into `M1_LENS_PHASE_1B_FOUNDATION` + `M1_LENS_PHASE_1B_PROCUREMENT` + `M1_LENS_PHASE_1B_GAP_CLOSURE`. Retained on disk for historical reference per P30. See the GAP_CLOSURE SPEC folder for the closing artifacts.

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist / Foreman) — **STUB ONLY** (full SPEC will be authored after Phase 1A closes)
> **Authored on:** 2026-05-14
> **Module:** 1 — Inventory Management (Lens Expansion)
> **Phase:** 1B (6 Customer-Facing Screens) — second half of Phase 1; depends on `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/` having merged.
> **Brief reference:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md` (commit `b4a3745`)
> **Status:** ⏸️ STUB — DO NOT EXECUTE. The full SPEC will be authored after Phase 1A's `FOREMAN_REVIEW.md` is in, so lessons from 1A's execution can inform 1B's success criteria.

---

## Why this stub exists

Per Brief §7 Open Question #3, the Architect recommended splitting Phase 1 into 2 sub-phases:
- **Phase 1A** (sealed SPEC, sibling folder): Schema + 9 RPCs + 1 trigger + 1 View + Platform Catalog Admin (screen 5).
- **Phase 1B** (this folder): The 6 customer-facing screens — Lens Inventory Management, Active Designs Selection, Catalog & Pricing, Purchase Order, Active POs List, Goods Receipt.

This stub records the scope, dependencies, and known constraints so that:
1. The executor cannot accidentally start Phase 1B before Phase 1A merges.
2. The Phase 1A FOREMAN_REVIEW author has a placeholder to write into when handing off.
3. Cross-references from other SPECs (M7, M9) have a stable path to point at.

---

## 1. Goal (preview)

Build the 6 customer-facing M1 Lens Phase 1 screens against the schema + RPCs delivered by Phase 1A:

| # | Screen | Mockup | Primary user |
|---|---|---|---|
| 1 | Lens Inventory Management — SPH×CYL grid + add-to-refill | `LENS_INVENTORY_MOCKUP.html` | Store staff (daily) |
| 2 | Active Designs Selection — pick which lens series the optic carries | `LENS_DESIGNS_SELECTION_MOCKUP.html` | Branch manager (setup) |
| 3 | Catalog & Pricing — 3 columns (catalog/discount%/final) inline + bulk | `LENS_PRICING_MOCKUP.html` | Owner / pricing manager |
| 4 | Purchase Order (per supplier) — auto-fills shortages + custom-per-customer | `LENS_PURCHASE_ORDER_MOCKUP.html` | Procurement manager |
| 6 | Active Purchase Orders List — display-only across all suppliers | `LENS_ACTIVE_POS_LIST_MOCKUP.html` | Manager |
| 7 | Goods Receipt — anchored on existing frames pattern, mandatory delivery-note | `LENS_GOODS_RECEIPT_MOCKUP.html` | Receiving employee |

(Screen 5 — Platform Catalog Admin — shipped in Phase 1A.)

Each screen is permission-gated via the existing 1.5 PermissionUI infrastructure. The Goods Receipt screen specifically extends `modules/goods-receipts/` with a `product_category` dispatcher (Open Question #1 resolution from Phase 1A — option (c) divergence at the schema layer, code reuse at the UI layer).

---

## 2. Why this SPEC is NOT executable yet

1. **Schema dependency** — All 17 new tables ship in Phase 1A. This SPEC's RPCs and Views must already exist before the customer screens can read/write them.
2. **Catalog seeding** — Mockups 1, 2, 3 (Lens Inventory, Designs Selection, Pricing) require real catalog data (lens_brand → lens_design → lens_variant → supplier_catalog_offering). Phase 1A delivers the Platform Catalog Admin screen + structured-Excel bulk import EF that lets the Optic Up team seed this data.
3. **FOREMAN_REVIEW lessons** — Phase 1A's executor will surface findings (RPC behavior nuances, RLS edge cases, schema-deltas-in-practice) that should inform Phase 1B's success criteria. Authoring 1B before 1A's review = repeating mistakes.
4. **Iron Rule 32** — A SPEC with placeholder success criteria cannot pass the destructive-ops gate. This stub is intentionally non-executable.

---

## 3. Known scope items (will be detailed at full-SPEC time)

### Files this SPEC will create or extend (preview)

- **6 new HTML pages or extensions to existing pages** — to be decided whether to add to `inventory.html` as new tabs (extending the current 11-tab structure), or to create dedicated HTML files per screen. Iron Rule 6 (`index.html` stays in root) doesn't constrain other HTML; SPEC will pick based on §1.5 cross-reference at full-SPEC time.
- **`modules/lens-inventory/*.js`, `modules/lens-pricing/*.js`, `modules/lens-purchase-orders/*.js`, etc.** — per-screen modules; each ≤350 LOC per Iron Rule 12.
- **`modules/goods-receipts/*.js` extension** — add `product_category` parameter to entry-point + dispatcher to either legacy `goods_receipts` flow (frames) or new `purchase_receipt` flow (lenses). Goods Receipt screen wires into `m1_create_receipt_from_box` RPC from Phase 1A.

### Cross-Module contracts (from M1↔M9 overlap report §6.4)

This SPEC consumes contracts already declared in Phase 1A:
- **K2** `m1_create_receipt_from_box(box_id NULL, supplier_id, delivery_note_number, line_items[])` — used by screen 7 (Goods Receipt)
- **K5** `v_suppliers_for_m9` View — Phase 1B uses for read-only supplier reads in pricing & PO contexts where M9 data isn't available yet (might be redundant — to be decided at full-SPEC time)

This SPEC does NOT touch (M9 SPEC scope):
- K1 `m9_close_incoming_stock_box`
- K3-consuming-side
- K4 `m1_record_lens_loss`

### Forward-FK columns to add

- `purchase_receipt.shipping_box_id UUID NULL REFERENCES shipping_boxes(id) ON DELETE SET NULL` — the FK clause itself (not just the column) added once `shipping_boxes` exists. Phase 1A ships the column declared NULL with NO FK clause. **Phase 1B may or may not add the FK clause depending on whether M9 SPEC has merged by then.** If M9 hasn't shipped → leave FK-less and let M9 SPEC add it.

### Iron Rules in sharp focus (Phase 1B specifically)

- **Rule 1, 11** — `record_stock_movement`, `record_transfer`, `record_adjustment_found`, `m1_create_receipt_from_box`, `next_lot_number`, `next_transfer_number`, `next_receipt_number` — all defined in Phase 1A; Phase 1B uses them. Never read→compute→write.
- **Rule 8** — Permission gates on every screen using existing 1.5 `PermissionUI`.
- **Rule 12** — File-size discipline: 6 screens × ~3-7 files each = 20–40 new files, every one ≤350 LOC.
- **Rule 22** — Every `.insert()` / `.upsert()` includes `tenant_id: getTenantId()`; every `.select()` includes `.eq('tenant_id', getTenantId())` even though RLS enforces it.

### Anti-patterns to avoid (from Brief §8)

- Don't conflate Brand and Supplier in any screen.
- Don't put AXIS on lens_variant (it's M6 prescription scope).
- Don't write to lab_jobs from Phase 1B code paths.
- Don't pre-stage supplier_debt at PO-creation time (debt is at GR time per D-M1-11).
- Don't build single-row UIs that defer bulk-by-default — bulk-by-default is the rule for this Phase (D-M1-04 lesson).

---

## Destructive Operations

**None.** This SPEC is a non-executable stub. Per Iron Rule 32, declaring `None.` here forbids ALL destructive operations during execution. The stub itself is text-only and authorizes no actions; it cannot be promoted to a full executable SPEC without re-authoring (at which point a real Destructive Operations section will be written based on actual scope).

---

## 4. Out of Scope (preview — will be detailed at full-SPEC time)

- Contact lenses, accessories — separate future M1 phases.
- Auto-send PO via email/WhatsApp/API — Phase 2+.
- LLM-powered catalog import — Phase 2+.
- Promotional discount engine (time-window logic) — Phase 2+.
- Phone-scan OCR of delivery notes — Phase 2+.
- Reconciliation Agent code — Phase 2+ (only schema readiness shipped in 1A).
- M9 implementation — separate M9 SPEC.

---

## 5. Activation prerequisites

Before this stub can be promoted to a full SPEC and dispatched:

- [ ] Phase 1A SPEC closed with verdict 🟢 CLOSED in `../M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md`.
- [ ] All 17 Phase 1A tables visible in live DB on demo + prizma.
- [ ] All 9 Phase 1A RPCs callable.
- [ ] At least 1 brand + 1 design + 1 variant + 1 supplier_catalog_offering seeded on demo tenant via the Platform Catalog Admin (proves the seeding path works end-to-end).
- [ ] Phase 1A FOREMAN_REVIEW lessons reviewed by the next opticup-strategic session and incorporated into this SPEC's full version.
- [ ] No M1 SPEC is in-flight when Phase 1B starts.

---

## 6. Estimated scope (rough)

- Files created: 25–40
- Files modified: 5–8 (`js/shared.js` for any additional T-constants, FIELD_MAP entries; module-level docs)
- New SQL migrations: 0–2 (additions only; main schema shipped in 1A)
- Commits: 15–25 (one per screen pair + docs commits)
- LOC: ~5,000–8,000 added

This will be a large SPEC. May warrant a further sub-split during full-SPEC authoring (e.g., 1B-screens-1-2-3 vs 1B-screens-4-6-7) if the executor's autonomy budget can't sustain end-to-end. To-be-decided.

---

*End of stub. Promote to full SPEC after Phase 1A FOREMAN_REVIEW signs CLOSED.*
