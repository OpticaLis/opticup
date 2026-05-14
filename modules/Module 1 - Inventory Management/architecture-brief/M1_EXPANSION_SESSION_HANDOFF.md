# M1 Expansion — Session Handoff (Lens Inventory Schema SEALED)

**Status:** ✅ Schema sealed after 3 adversarial review rounds. Ready for UI mockup phase.
**Last updated:** 2026-05-12
**Architect skill needed:** `opticup-architect` (this skill loads automatically when user says "אתה הארכיטקט")
**Resume mode:** Cowork or Claude Code (mockup phase can happen in either)

---

## What M1 Expansion is

M1 today handles only **frames** (`inventory` table). To unblock M7 (Orders) and M9 (Lab/KDS) for LIVE, M1 must be expanded with 3 NEW categories:

1. **עדשות-ראייה** (Prescription Lenses) — lenses fitted into frames
2. **עדשות-מגע** (Contact Lenses) — daily/monthly/etc.
3. **אביזרים** (Accessories) — cleaning solutions, cases, etc.

Architectural decision LOCKED with Daniel 2026-05-12: **3 separate tables**, NOT one unified table with `category_type`. Reason: each category has materially different field sets; unified table = NULLs everywhere + bad indexes.

Daniel's stated order: **Lens Inventory first, then Contact Lenses, then Accessories**.

This handoff documents the **Lens Inventory** schema design only. Contact Lenses + Accessories schemas are separate future sessions.

---

## Lens Inventory Schema — SEALED (2026-05-12)

### Architectural model

Three-tier separation between catalog, commerce, and stock:

```
GLOBAL CATALOG (platform/supplier-owned, ~30-6000 rows)
  lens_brand → lens_design → lens_variant (with SPH/CYL/ADD ranges)
                                ↓
COMMERCIAL LAYER (supplier-owned in future, platform-owned today)
  supplier_catalog_offering (price components)
                                ↓
  pricing_overlay (per-retailer discounts, sparse, with approval workflow)
                                ↓
RETAILER LAYER (per-tenant)
  tenant_active_offerings (which offerings retailer chose)
                                ↓
  tenant_lens_stock (point SPH/CYL/ADD with qty_on_hand projection)
                                ↓
OPERATIONS LAYER (FIFO costing, multi-location)
  stock_lot (purchase batches with unit_cost + fx_snapshot)
  stock_movement (event ledger — one row per lot consumed)
  stock_transfer (parent for atomic inter-location transfers)
```

### Final 18-table schema

| # | Table | Purpose | Notes |
|---|---|---|---|
| 1 | `tenants` (existing) | Identity | + `role` enum (retailer/supplier/platform_admin), + `base_currency_code` (ILS for Israeli tenants) |
| 2 | `lens_brand` | Manufacturers (Hoya, Essilor, etc.) | `owner_tenant_id` NULL today, set when brand adopted by supplier. + `is_published`, `lifecycle_status` |
| 3 | `supplier_brand_distribution` | Which supplier imports which brand | `UNIQUE(brand_id) WHERE status='active'` enforces 1:1 today; drop the partial unique for 1:N future |
| 4 | `lens_design` | Lens series (Hilux EYAS BLC) | `owner_tenant_id` NULL today. `UNIQUE(name, owner_tenant_id)` |
| 5 | `lens_variant` | Per (Design × Index × Diameter) with SPH/CYL/ADD RANGES | Immutable once stock_lot references it. Has `version`, `superseded_by_id`, `canonical_root_id` for analytics rollup |
| 6 | `supplier_catalog_offering` | (supplier × variant) with decomposed price | `price_amount`, `currency_code FK`, `is_vat_inclusive`, `vat_rate_id FK`, `price_components JSONB`, `supplier_sku_code` |
| 7 | `pricing_overlay` | Per-retailer discount (SPARSE — only actual discounts) | `overlay_type` (negotiated/promo/volume), `stacking_rule` (additive/multiplicative/exclusive_max), `application_order`, status workflow (proposed/active/rejected/superseded/expired) |
| 8 | `tenant_active_offerings` | Retailer's curated offering subset | `location_id NULL = all locations`. `UNIQUE(tenant_id, offering_id, COALESCE(location_id, sentinel))` |
| 9 | `tenant_lens_stock` | Physical stock with POINT SPH/CYL/ADD | `qty_on_hand` denormalized projection (trigger from stock_movement). `location_id NOT NULL`. References `stock_lot` for FIFO |
| 10 | `tenant_location` | Physical locations | `is_default BOOLEAN`. Single-store tenants auto-get one default at tenant creation |
| 11 | `stock_lot` | Purchase batches for FIFO | `unit_cost` (in tenant base currency, VAT-EXCLUSIVE), `qty_received`, `qty_remaining`, `received_at`, `supplier_offering_id`, `fx_rate_snapshot`, `fx_rate_date`, `origin_type` (purchase/customer_return/adjustment_found), `original_lot_id NULL` |
| 12 | `stock_movement` | Event ledger | One row per lot consumed (multi-lot sales = N rows grouped by `sale_order_id`). Explicit FK columns (sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id) — CHECK exactly one non-NULL. `cost_basis_at_movement`, `source_lot_id`, `vat_amount_at_movement`, `fx_rate_snapshot` |
| 13 | `stock_transfer` | Parent for inter-location transfers | Wraps 2 stock_movement children atomically via `record_transfer()` RPC. `from_location_id`, `to_location_id`, `status` enum, `transfer_number` (sequential RPC) |
| 14 | `currencies` | ISO 4217 reference | Per Iron Rule 19 |
| 15 | `vat_rates` | Dated VAT rates per country | Israel 18%, immutable once referenced, has `effective_from/until`, `supersedes_id` |
| 16 | `supplier_permissions` | Granular per-action policy per supplier | Immutable + dated. Defines what supplier can change auto vs requires platform admin approval vs requires retailer approval |
| 17 | `change_approval_log` | Governance audit (catalog/price changes only) | NOT for stock movements — those log to stock_movement |
| 18 | `activity_log` (existing) | System events not covered above | Existing project-wide log |

### Stub tables (NOT in M1 — defined here as FK targets, will be built in M7/M8)

| Table | Built in | Purpose |
|---|---|---|
| `purchase_receipt` | M7 Phase 1 | Goods receipt from supplier — creates stock_lot |
| `customer_return` | M7 Phase 2 | Customer returns — creates new stock_lot with origin_type='customer_return' |
| `sale_order` | M7 Phase 1 | Customer sales — triggers FIFO consumption (N stock_movements) |
| `adjustment` | M1 sub-phase | Count corrections — adjustment_found creates new lot, adjustment_lost consumes FIFO |

The M1 SPEC must mention these as known forward references but does not build them.

### Critical RPCs (mandatory per Iron Rules 1, 11)

- **`record_stock_movement(...)`** — atomic INSERT INTO stock_movement + UPDATE qty_on_hand + UPDATE stock_lot.qty_remaining, all in single transaction with `SELECT FOR UPDATE` on the lot row. Validates qty_remaining >= 0.
- **`record_transfer(...)`** — wraps stock_transfer parent INSERT + 2 stock_movement child INSERTs + 2 qty_on_hand UPDATEs in single transaction. FIFO drains source lots in order; destination receives child lots with `original_lot_id` reference and preserved `received_at`.
- **`record_adjustment_found(...)`** — creates new stock_lot with `origin_type='adjustment_found'`, `unit_cost = latest active supplier_catalog_offering price for variant`, fx-converted. Then INSERT stock_movement.
- **`next_lot_number(tenant_id)`**, **`next_transfer_number(tenant_id)`** — sequential generators with FOR UPDATE lock.
- **`effective_price(offering_id, tenant_id, as_of_ts)`** — orchestrator: `_active_overlays()` → `_apply_stacking(application_order ASC)` → `_convert_currency()` → `_apply_vat()`. Returns VAT-inclusive final price for retailer's customer-facing UI.

### Critical triggers

- **`trg_stock_movement_qty_projection`** — AFTER INSERT ON stock_movement: updates `tenant_lens_stock.qty_on_hand += qty_delta`. AFTER INSERT also updates `stock_lot.qty_remaining` based on movement_type.
- **Nightly reconciliation job** — re-projects qty_on_hand from stock_movement ledger; alerts platform admin on drift (P1 alert). **NEVER auto-corrects** — drift = bug signal.

### RLS pattern (per Iron Rule 15)

- **Tenant-scoped tables** (offerings, stock, movements, etc.): canonical pattern `tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid` + service_bypass policy for service_role.
- **Platform-owned tables** (brands, designs, variants, currencies, vat_rates): two PERMISSIVE policies — `owner_view` (`owner_tenant_id = jwt_tenant_id()`) + `public_view` (`is_published = true AND lifecycle_status = 'active'`). Postgres OR-combines PERMISSIVE policies efficiently.
- **`currencies`** is the one exception with no tenant_id — global reference data, explicitly documented in CLAUDE.md as a Rule 14 exception.

### Iron Rule compliance check

| Rule | Status | Notes |
|---|---|---|
| 1 — Atomic qty changes | ✅ | All qty changes via `record_stock_movement()` RPC with FOR UPDATE |
| 2 — writeLog for changes | ✅ | stock_movement is the qty log; change_approval_log is the governance log; activity_log for everything else |
| 11 — Sequential numbers via RPC | ✅ | `next_lot_number()`, `next_transfer_number()` |
| 14 — tenant_id everywhere | ⚠️ | `currencies` is the documented exception. `lens_brand/lens_design/lens_variant` use `owner_tenant_id` (different semantic, documented) |
| 15 — RLS canonical pattern | ✅ | Two-PERMISSIVE-policy pattern for platform-owned tables |
| 16 — Contracts between modules | ✅ | `record_stock_movement()`, `effective_price()`, `record_transfer()` are the only entrypoints from M7/M4 |
| 18 — UNIQUE includes tenant_id | ✅ | All offerings/overlays/stock have tenant-scoped uniques. Platform tables use `owner_tenant_id`-scoped uniques |
| 19 — Configurable values as tables | ✅ | currencies, vat_rates as tables. movement_type/status as ENUMs (accounting-semantics-bounded, not tenant-configurable) |
| 21 — No orphans/duplicates | ✅ | Three distinct logs documented routing rule in CONVENTIONS.md TBD |
| 22 — Defense-in-depth | ✅ | All RPCs include tenant_id checks |

---

## Cost-basis method LOCKED: FIFO

Daniel chose FIFO (First-In-First-Out) over Weighted Average or Specific Identification on 2026-05-12.

**Reasoning:**
1. Standard for Israeli accounting (Israeli accountants will expect FIFO)
2. Real per-product profitability (avoids blending old/new lot costs)
3. Intuitive for store owners ("first in, first out")
4. Aligns with IFRS / IAS 2 for non-fungible inventory

**Schema impact:** stock_lot table required (was the gating decision in iteration 2 of adversarial review).

---

## Brand-Supplier model LOCKED: 1:1 today, 1:N future-ready

**Today:** Each lens brand is imported by exactly one Israeli supplier (Lapidot/Bdolach/Segam/etc.). Enforced by `UNIQUE INDEX (brand_id) WHERE status='active'` on `supplier_brand_distribution`.

**Brand-supplier transition** (Hoya moves from Lapidot to Bdolach): handled by atomic RPC that flips Lapidot offerings to inactive, supersedes proposed overlays, writes migration flag for affected retailers, logs to change_approval_log.

**Future 1:N:** Drop the partial unique index. Add `tenant_supplier_preference` table for retailer's preferred source per variant. **Zero data migration, zero code changes in M1.**

---

## v2 features — Forward Compatibility Promise

All four deferred features are additive-only (no migration, no v1 code changes):

| Feature | How it enters | Schema impact |
|---|---|---|
| **Promotional bundles** | 2 new tables: `bundle_definition`, `bundle_component`. Sales reference bundle_id. | Zero existing column changes |
| **Supplier rebates** | 1 new table: `supplier_rebate_agreement`. + new movement_type='rebate_credit' (ENUM extension) | Zero existing column changes |
| **Consignment stock** | + `stock_lot.ownership_type ENUM('owned','consignment')` default 'owned' | One column added, defaults preserve existing rows |
| **Drop-ship** | + `sale_order.fulfillment_method ENUM('from_stock','drop_ship')` (table built in M7) | sale_order doesn't exist yet — designed correctly from M7 outset |

This forward-compatibility section is non-negotiable — it must appear in the M1 Lens Inventory SPEC's §"v2 Forward Compatibility" section.

---

## Three adversarial review rounds — Summary

The schema went through 3 rounds of adversarial review by an external researcher mandate. Each round was instructed to BREAK the schema, not validate it.

| Round | Date | Result |
|---|---|---|
| 1 | 2026-05-12 | Found 4 load-bearing gaps: locations missing, stock_movement ledger missing, price decomposition missing, variant immutability missing. All fixed → schema grew 11 → 15 tables. |
| 2 | 2026-05-12 | Found 3 more gaps: stock_lot for FIFO missing, stock_transfer parent missing, polymorphic ref_doc_id risk. All fixed → schema grew 15 → 18 tables. FIFO decision triggered. |
| 3 | 2026-05-12 | Found 6 spec-clarifications: multi-lot FIFO consumption, adjustment-found-creates-lot, VAT-exclusive invariant, tenant base currency, customer-return-creates-new-lot, stub tables for M7. No new structural tables needed. |

After round 3 the researcher explicitly stated: "After these 6 spec clarifications, no further adversarial pass needed." Schema is sealed.

---

## What's next — UI Mockup Phase

The next step (current pending work) is to build HTML mockups (P35 pattern from `opticup-architect`) for these 2 screens BEFORE writing the M1 SPEC:

1. **Lens Inventory Management Screen** — retailer-facing
   - Top filters: lens type / material / index / brand / supplier
   - Center grid: SPH × CYL matrix per active variant (like the screenshots Daniel shared from Pentax-Israel's order system — Available/OutOfStock/NotAvailable)
   - "Bulk Add Wizard" — select variant + SPH range + CYL range + initial qty → creates N stock_lot rows in one click
   - Per-cell view: barcode, qty_on_hand, cost_basis, source lot

2. **Active Offerings Selection Screen** — retailer chooses which catalog items to carry
   - Browse global catalog by brand/design/variant
   - Toggle "active for my tenant" + per-location if multi-store
   - Shows pending supplier price-change proposals + retailer's approval inbox

After Daniel approves mockups → write SPEC at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1/SPEC.md`.

---

## Architect mode (reminder for resumption)

- P22 format: one question, recommendation + reason, ending in `?`
- Hebrew responses to Daniel
- Short, focused conversations
- Stop on deviation; checkpoint at natural phase boundaries
- Self-verify before asking Daniel (P4)
- Honest uncertainty (P1) — never confabulate
- **Do NOT propose AXIS or other per-prescription fields as inventory columns** — historical mistake corrected 2026-05-12

---

## Key lessons learned this session (for `opticup-architect` skill improvements)

1. **Industry research before architecture decisions saves rounds.** First adversarial round found 4 gaps that an unguided design would have shipped. Second round found 3 more. The user's instinct to "send a researcher" was correct — adversarial review is now a documented step in major architecture decisions.

2. **AXIS confusion (recorded lesson):** When proposing inventory columns, the test is "is this a stock characteristic (held in inventory) or a per-prescription characteristic (calculated per customer order)?" AXIS/PD/Prism are per-prescription. SPH/CYL/ADD/Index/Diameter/Coating/Tint are stock characteristics.

3. **Brand ≠ Supplier in optical industry.** International manufacturers (Hoya, Essilor) are brands. Israeli importers (Lapidot, Bdolach) are suppliers. They are different entities with 1:1 or 1:N relationships. Future architect work should never conflate them again.

4. **FIFO decision is a business decision, not a technical one.** Always escalate cost-basis method to the user — don't choose by schema omission.

5. **Three rounds of adversarial review is the right depth for foundational schema work.** First round caught load-bearing gaps. Second caught second-order. Third caught spec clarifications. Beyond three is diminishing returns.

---

*End of handoff. Schema sealed. Next session: UI mockup phase.*

---

## 2026-05-14 — Mockup Review Session (Decisions D-M1-01 → D-M1-11)

**Session goal:** review the 4 mockups built post-schema-seal that had never been walked through with Daniel.

**Result:** 11 decisions locked, 3 new screens surfaced (Phase 1 final count = **7 screens**, was 4 in the original handoff), 7 additive schema deltas captured. Full per-decision detail lives at `.claude/skills/opticup-architect/references/decisions/M1.md`.

### Phase 1 Final Screen Count: 7 (was 4)

| # | Screen | Mockup status |
|---|---|---|
| 1 | Lens Inventory Management | ✅ mockup exists — needs stock/custom filter |
| 2 | Active Designs Selection | ✅ mockup exists — needs stock/custom filter |
| 3 | Catalog & Pricing | ✅ mockup exists — needs 3 cols + inline + bulk + filter |
| 4 | Purchase Order (per supplier) | ✅ mockup exists — needs source-split + manual-send + customer-link |
| 5 | Platform Catalog Admin | ⬜ NEW — needs sketch |
| 6 | Active Purchase Orders List | ⬜ NEW — needs sketch |
| 7 | Goods Receipt | ⬜ NEW — anchor on existing frames pattern |

### Schema deltas (all additive, no breaking changes)

```
supplier_catalog_offering
  + production_type ENUM('stock','custom') NOT NULL

pricing_overlay
  + scope_design_id UUID NULL  -- default layer
  + scope_supplier_id UUID NULL  -- default layer
  -- variant_id stays as exception layer
  -- CHECK exactly one of (variant_id, design_id, supplier_id) NOT NULL

purchase_receipt
  + delivery_note_number TEXT NOT NULL
  + delivery_note_received_at TIMESTAMPTZ
  + goods_received_at TIMESTAMPTZ
  + scanned_doc_url TEXT NULL  -- optional PDF/photo

stock_lot
  + purchase_order_id UUID  -- link to PO that spawned the lot

purchase_order (new or existing — confirm)
  + ordered_at TIMESTAMPTZ
  + sent_to_supplier_at TIMESTAMPTZ
  + expected_delivery_at TIMESTAMPTZ

purchase_order_line (new or existing — confirm)
  + sale_order_id UUID NULL  -- for custom-per-customer orders

purchase_discrepancy (new) OR add to purchase_receipt_line
  + discrepancy_qty INT
  + discrepancy_reason TEXT
  + discrepancy_status ENUM('open','resolved','accepted')

stock_transfer
  + actual_received_qty INT  -- inter-branch reconciliation
```

### Highlights of the 11 decisions (full detail in `decisions/M1.md`)

- **D-M1-01** — `production_type` flag lives on `supplier_catalog_offering` (commercial offer), NOT on `lens_variant` (physical SKU). Custom lenses can sit as `qty_on_hand > 0` at the optic. Stock/custom = **primary filter** in every M1 + M7/M9 screen.
- **D-M1-04** — Pricing screen: 3 columns (catalog / discount% / final), inline edit (permission-gated) on discount AND final price, NO separate edit screen. Bulk multi-select required Phase 1.
- **D-M1-05** — `pricing_overlay` gets a default layer at `lens_design` or `supplier` level. Variant rows = exceptions. "Add 5% to all HOYA" = 1 row update.
- **D-M1-06** — NEW screen: Platform Catalog Admin (CRUD on lens_brand / lens_design / lens_variant / supplier_catalog_offering — Optic Up only, hidden from optic).
- **D-M1-07** — PO screen: "Mark as sent to supplier" (no auto-send Phase 1). PDF+Excel export primary. Lines split by source: stock-shortage / custom-per-customer (with customer_id) / manual. Tenant setting "auto-send custom orders" default OFF.
- **D-M1-08** — NEW screen: Active Purchase Orders List (master list across suppliers; Draft → Sent → Partially received → Fully received).
- **D-M1-09** — NEW screen: Goods Receipt — anchored on existing frames receiving pattern, generic component in Module 1.5, mandatory delivery-note number, optional scanned PDF, creates stock_lot with FIFO + receipt-date + unit_cost.
- **D-M1-10** — **CRITICAL** Reconciliation-Agent schema readiness: mandatory Phase 1 fields = `purchase_receipt.delivery_note_number`, `stock_lot.purchase_order_id`, `purchase_order_line.sale_order_id`, discrepancy fields, 5 timestamps, `stock_transfer.actual_received_qty`.
- **D-M1-11** — **Correction:** supplier_debt is created from delivery note / invoice at goods-receipt time, NEVER at PO creation. Lesson: accounting events follow physical events, not intent events.

### Next steps

1. Build mockups for screens 5 / 6 / 7 (3 new).
2. Retrofit mockups for screens 1 / 2 / 3 / 4 (additions per D-M1-02/03/04/07).
3. After all 7 mockups sealed → write SPEC at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1/` and hand off to Module Strategist.

*End of 2026-05-14 mockup review section.*
