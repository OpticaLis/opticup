# M1 ↔ M9 Overlap Investigation Report

**Author:** Claude Code investigation executor (read-only mission)
**Mandate:** [`M1_M9_OVERLAP_INVESTIGATION_BRIEF.md`](../../../../../AppData/Local/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/local-agent-mode-sessions/.../outputs/m1-mockups/M1_M9_OVERLAP_INVESTIGATION_BRIEF.md) (Cowork session outputs, 2026-05-14)
**Date:** 2026-05-14
**Scope:** Investigate where M1 (Inventory — Lens Expansion) ends and M9 (Lab/KDS) begins. Map every touch-point. Recommend the architecture.
**Mode:** Read-only. No code, schema, or mockup edits. No SPEC writing.

---

## 1. Executive Summary

The two Briefs were authored independently — M1 Lens Expansion schema sealed 2026-05-12, M9 Lab/KDS Brief sealed 2026-05-10 — but they **converge correctly**. M9's Brief (§5 "חוזים מול מודולים אחרים") explicitly declares the M1 dependency, locks the supplier-identity contract (M1 source-of-truth, M9 read-only), and consolidates all physical-box tracking into M9 (deprecating the legacy `shipments` / `shipment_items` tables in M1). The 6 touch-points examined resolve to **0 genuine overlaps**, **5 clean hand-offs**, and **1 ambiguity** that is an M9-internal Brief gap (the `lab_couriers` vs legacy `courier_companies` naming question), not a Daniel-decision.

**Verdict: PROCEED-WITH-M1-AS-IS, with three minor refinements.** The M1 Lens mockups are architecturally sound to seal as Phase 1 SPEC input. Three small adjustments are recommended before SPEC writing:

1. **One mockup tweak** in `LENS_GOODS_RECEIPT_MOCKUP.html` — make the M9-box linkage visible in the step-meta and re-word the "M7 ready" hint to credit M9 as the lab-job-status owner.
2. **Two additive schema columns** (one on M1's `purchase_receipt`, one on M9's `lab_jobs`) to wire the goods-receipt-fulfills-lens-waiting contract.
3. **Two new contract events / RPCs** to declare in either M1 SPEC or M9 SPEC (whichever lands first), so the boundary is enforced by code, not by hope.

No escalation to Daniel is required. The investigation found no schema collision, no overlapping ownership, no unfinished deprecation that blocks M1 Lens Phase 1.

---

## 2. Question A — M9 Scope Summary

### 2.1 What M9 is

M9 is the **"McDonalds System"** of the optic — a single operational-control plane that tracks every order from staff intake to customer hand-over. It consolidates three previously-separate domains:

1. **Lab tracking (KDS)** — order state-machine from creation to customer pickup
2. **Shipment management** — every physical box that enters or leaves the optic (supplier-bound, customer-bound, inter-branch)
3. **Credits / replacements / repairs** — long-tail supplier-return flows with their own SLA clocks

**Daniel reframed scope dramatically on 2026-05-10** from the prior framing of "M9 = extension of M1.shipments" to "M9 = full satisfaction-system". Decision D2 (overturning the older decision) is the load-bearing decision; D3 (M1's legacy shipments module is deprecated and absorbed by M9) is its corollary.

### 2.2 M9's 5 engines (per Brief §4 + DECISIONS_LOG entry #15)

| # | Engine | Trigger | Output |
|---|---|---|---|
| 4.1 | **Clock Engine** | pg_cron every minute | Scans non-delivered, non-paused `lab_jobs`; computes processing-time elapsed; flips `status_color` (yellow/red/comp); INSERTs alert log + dispatches sound + WhatsApp at compensation threshold |
| 4.2 | **Compensation Engine** | Manager "approve compensation" click | Validates request ≤ defined + `manager_max_addition`; if exceeded → owner approval required; calls `loyalty_grant_credit_compensation` in M13 (which auto-creates basic-free membership if customer is not already a member) |
| 4.3 | **Shipping Box Engine** | Optician "+ box" + close-drawer | INSERTs `shipping_boxes` + `shipping_box_items`; for outgoing: UPDATEs linked `lab_jobs.status='sent_for_framing'`; for incoming: UPDATEs `lab_jobs.status` (returned_from_framing if OK, re_do if damaged + auto-creates outgoing credit/replace/repair box) |
| 4.4 | **Notification Engine** | 6 lifecycle events | Calls `send_message_by_template` in M12 — pickup-reminder, internal red/comp alerts, customer outgoing-shipment alert, supplier overdue alert |
| 4.5 | **Inventory Receipt Engine** | Optician closes a `stock_inbound` box in M9 | Persists `delivery_doc_numbers` JSONB to the box; **M1's goods-receipt screen later imports the goods into stock, linking back to this box.** This engine is the M9 side of the M1↔M9 stock-inbound contract. |

### 2.3 M9's 8 entities (per Brief §3)

Counted as 8 in the Brief summary, the actual entity list contains 10 tables (lab_status_log is a View, not a table):

| # | Entity | Purpose | Notes |
|---|---|---|---|
| 1 | `lab_jobs` | Source of truth for lab-job state from M9's perspective | One row per **sub-order** (zoog-zoog — a customer can order 2 pairs in different `lab_flow`s) — FK to M7 |
| 2 | `lab_categories` | Per-tenant category config | Synced from M7 (M7 is source-of-truth; M9 reads). 5 SLA thresholds per category × 2 clocks = 10 numbers |
| 3 | `lab_compensation_tiers` | Per-(category × tier) compensation matrix | + tenant-global `manager_compensation_max_addition_ils` (Daniel's additive-cap correction) |
| 4 | `lab_status_log` | **View, not table** — filters `activity_log` for M9-relevant entries (Iron Rule 21 — no duplication) |
| 5 | `lab_notes` | Free-form optician notes on sub-row drawer |
| 6 | `shipping_boxes` | **Unified entity for ALL box types** — replaces legacy `shipments` | 9 box_types: `return_from_lab`, `outgoing_to_lab`, `outgoing_to_customer`, `outgoing_credit`, `outgoing_replace`, `outgoing_repair`, `stock_inbound`, `inter_branch_inbound`, `inter_branch_outbound` |
| 7 | `shipping_box_items` | Many-to-many between boxes and lab_jobs | Includes `quality_status`, `damage_reason_id`, `linked_outgoing_box_id` (back-ref), `delivery_doc_numbers` JSONB for stock_inbound |
| 8 | `lab_damage_reasons` | Per-tenant damage taxonomy config | Seed: scratch / wrong prescription / broken / missing part / quality |
| 9 | `lab_couriers` | Per-tenant courier-company config | Katz + others. **Potential naming collision with legacy `courier_companies` — see §6** |
| 10 | `lab_supplier_thresholds` | Per-supplier expected-return-days threshold | FK `supplier_id` → M1 suppliers (read-only) |

### 2.4 M9's 4 sketch areas (per Brief §6)

| Sketch | File | Daniel's choice |
|---|---|---|
| KDS (main "McDonalds Screen") | `M9_SKETCHES.html` | Sketch C v2 (priority-split + sub-row drawer + 3 tabs) |
| Shipments | `M9_SHIPMENTS_SKETCHES.html` | Sketch A v3 + drawer-per-incoming-box |
| Manager dashboard | `M9_DASHBOARD_SKETCHES.html` | Hybrid C (will be built by M11) |
| Settings (8 domains incl. compensation matrix) | `M9_SETTINGS_SKETCHES.html` | Sidebar v2 |

### 2.5 M9's contracts with other modules (per Brief §5)

| Module | Contract |
|---|---|
| **M1 (Inventory)** | M1 = source-of-truth for suppliers. M9 reads suppliers read-only (locked in M9 settings — cannot edit; can ADD lab-only suppliers that don't exist in M1). M9 replaces M1's old shipments module entirely. **M9 depends on M1 Lens-extension (3 inventory tables) as a hard blocker.** |
| **M5 (Customers)** | M5 = source-of-truth. M9 reads only. No write interaction. |
| **M7 (Orders)** | M7 creates order + sub-order with `lab_flow` field. M7 prints barcoded order form that scans into M9 boxes. M7 sends customer "ready" notification manually from customer card (M9 only marks status). M9 deep-links to M7 customer card. |
| **M8 (Payments)** | Compensation = credit (M13), not net payment. M9 calls M13 directly, not M8. |
| **M11 (Reports)** | M9 exposes 3 Views (`v_lab_delays_by_supplier`, `v_lab_processing_time`, `v_lab_optician_kpi`); M11 builds the manager dashboard on top. |
| **M12 (Communications)** | M9 calls `send_message_by_template` at 6 lifecycle events. |
| **M13 (Loyalty)** | M9 calls `loyalty_grant_credit_compensation` on compensation approval. M13 auto-creates basic-free membership on first credit grant if not a member. |
| **Permissions module (central)** | M9 declares ~15 permission keys. Uses central permissions, no internal matrix (Iron Rule 21). |

### 2.6 The "McDonalds System, not shipping extension" framing — what it meant concretely

Before reframing, M9 was conceived as **"M1's shipments table + 2 extra columns"** (the older Mar 2026 decision). Operating consequence: shipments would have remained an M1-internal concept; lab-job status would have been a column on `shipments`; SLAs would have lived as ad-hoc rules.

After reframing, M9 is **the operational source-of-truth for the order's customer-facing lifecycle**. Concrete consequences:

1. **Status ownership moved.** The "order is ready / waiting for lens / sent to lab" status of a customer's pair of glasses is now M9's `lab_jobs.status` field, not M7's `sale_order.status` and not M1's `shipments.status`.
2. **Two independent clocks were added** (processing + pickup), each with its own thresholds and notifications.
3. **The compensation matrix became a Day-1 entity** — a per-(category × tier) configurable structure with manager-discretion-bounded-by-additive-cap.
4. **All physical-box tracking unified** — the same `shipping_boxes` table holds incoming-from-supplier, outgoing-to-lab, outgoing-to-customer-credit, inter-branch. The legacy M1 `shipments` table is deprecated.
5. **Lab work itself stays manual today** — no API integration with Hoya/Essilor (F2 future slot). M9 doesn't replace lab work, it tracks it.

### 2.7 Old shipping module — what was deprecated, where it went

M9 D3: "מודול-המשלוחים-הישן של M1 — מבוטל; הכל עובר ל-M9" ("M1's old shipments module — deprecated; everything moves to M9").

Brief §9 To-dos line: "Migration plan — אין migration נדרש (M9 מתחיל-נקי). מודול-משלוחים-הישן של M1 לא בשימוש פעיל." ("No migration needed — M9 starts fresh. M1's legacy shipments module isn't in active use.").

**State on disk today (verified by this investigation):**

| Asset | Path | State |
|---|---|---|
| Tables | `shipments`, `shipment_items` (T.SHIPMENTS, T.SHIP_ITEMS in `js/shared.js:36-37`) | Still present in live DB |
| Code | `modules/shipments/*.js` (9 files: list, create, detail, lock, items, items-table, manifest, couriers, settings) | Still present, still functional |
| Page | `shipments.html` (root) | Still present in repo, still listed in GLOBAL_MAP §5.3 ERP HTML Pages |
| Counter RPC | `increment_shipment_counters(...)` (per GLOBAL_MAP §5.1) | Still present in DB |
| Couriers table | `courier_companies` (T.COURIERS) | Still present in live DB |

M9 D3 + Brief §9 say *"isn't in active use"* — meaning the assumption is that no live workflow depends on these tables today. Spot-checks in `modules/shipments/shipments-create.js` show a 3-step new-box wizard built around `shipment_type` ENUM with values like `delivery`. The code exists but no current SPEC pipeline writes to these tables, per the M9 Brief's claim.

**Why this matters for M1 Lens Phase 1:** the deprecation is M9 SPEC territory, not M1 Lens SPEC territory. M1 Lens Phase 1 must **not** reference `shipments` / `shipment_items` for the new lens-receipt flow — and per the M1 Lens Brief's schema deltas, it doesn't (M1 Lens introduces `purchase_receipt` + `stock_lot` + `stock_movement`, none of which touch the legacy shipments tables). **The deprecation is owed but is not a blocker.** It is correctly listed in M9 §9 as M9 SPEC scope.

---

## 3. Question B — M1 Lens Expansion Scope Summary

### 3.1 The 18-table schema (sealed 2026-05-12 after 3 adversarial rounds)

M1 Lens Expansion adds a three-tier separation between catalog, commercial layer, and physical stock:

```
GLOBAL CATALOG (platform/supplier-owned, ~30-6000 rows)
  lens_brand → lens_design → lens_variant (SPH/CYL/ADD ranges)
                                ↓
COMMERCIAL LAYER (supplier-owned in future, platform-owned today)
  supplier_catalog_offering (price components, currency, VAT)
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

Full 18-table count: `tenants` (existing) · `lens_brand` · `supplier_brand_distribution` · `lens_design` · `lens_variant` · `supplier_catalog_offering` · `pricing_overlay` · `tenant_active_offerings` · `tenant_lens_stock` · `tenant_location` · `stock_lot` · `stock_movement` · `stock_transfer` · `currencies` · `vat_rates` · `supplier_permissions` · `change_approval_log` · `activity_log` (existing).

### 3.2 The 7 Phase 1 screens (decided 2026-05-14 — was 4)

| # | Screen | Mockup status (post-2026-05-14) |
|---|---|---|
| 1 | Lens Inventory Management | ✅ exists; needs stock/custom filter retrofit (D-M1-02) |
| 2 | Active Designs Selection | ✅ exists; needs stock/custom filter retrofit (D-M1-03) |
| 3 | Catalog & Pricing | ✅ exists; needs 3-col + inline-edit + bulk + filter retrofit (D-M1-04) |
| 4 | Purchase Order (per supplier) | ✅ exists; needs source-split + manual-send + customer-link retrofit (D-M1-07) |
| 5 | **Platform Catalog Admin** (NEW) | ✅ built 2026-05-14 in Cowork outputs `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` |
| 6 | **Active Purchase Orders List** (NEW) | ✅ built 2026-05-14 in Cowork outputs `LENS_ACTIVE_POS_LIST_MOCKUP.html` |
| 7 | **Goods Receipt** (NEW) | ✅ built 2026-05-14 in Cowork outputs `LENS_GOODS_RECEIPT_MOCKUP.html` |

### 3.3 The 11 D-M1 decisions (locked 2026-05-14)

Full text in `.claude/skills/opticup-architect/references/decisions/M1.md`. Single-line summary of each (with the four cross-relevant ones flagged):

| # | Decision (one line) | Cross-cutting? |
|---|---|---|
| D-M1-01 | `production_type ENUM('stock','custom')` lives on `supplier_catalog_offering` (commercial), NOT `lens_variant` (SKU). Custom lenses CAN sit as `qty_on_hand > 0`. Primary filter in every M1/M7/M9 screen. | M7+M9 are downstream consumers of the flag, not authors |
| D-M1-02/03 | Mockups 1 + 2 approved + stock/custom filter added | — |
| D-M1-04 | Pricing screen: 3 cols (catalog/discount%/final), inline edit (permission-gated), bulk multi-select required Phase 1 | — |
| D-M1-05 | `pricing_overlay` adds default-layer columns (`scope_design_id`, `scope_supplier_id`). Variant rows = exceptions. | — |
| D-M1-06 | NEW screen: Platform Catalog Admin (Optic Up only, hidden from optic) | — |
| **D-M1-07** | **PO screen**: PDF+Excel primary; lines split by source (stock / custom-per-customer with customer_id / manual); tenant setting "auto-send custom orders" default OFF | Custom-per-customer lines carry `sale_order_id` FK — direct M7 linkage |
| D-M1-08 | NEW screen: Active Purchase Orders List | — |
| **D-M1-09** | **NEW screen: Goods Receipt — anchor on existing frames pattern, generic 1.5 component, mandatory delivery-note number, optional scanned PDF, creates stock_lot with FIFO + receipt-date + unit_cost** | **This is the M1↔M9 contact surface** |
| **D-M1-10** | **CRITICAL** — Reconciliation-Agent schema readiness: mandatory fields = `purchase_receipt.delivery_note_number`, `stock_lot.purchase_order_id`, `purchase_order_line.sale_order_id`, discrepancy fields, 5 timestamps, `stock_transfer.actual_received_qty` | M7+M9 are downstream consumers |
| **D-M1-11** | **Correction**: supplier_debt created from delivery note / invoice at goods-receipt time, NEVER at PO creation. *Accounting events follow physical events, not intent events.* | — (M1 internal contract, no M9 touch) |

### 3.4 Cost basis: FIFO (locked 2026-05-12)

Reasons (per handoff): (1) Israeli accountants expect FIFO, (2) real per-product profitability, (3) intuitive for store owners, (4) IFRS / IAS 2 compliant. Schema consequence: `stock_lot` is a Phase 1 mandatory table (was the gating decision in adversarial round 2). FIFO is the only cost basis M1 supports today.

### 3.5 Reconciliation agent: future-feature schema readiness (D-M1-10)

The schema must capture **all event-time data NOW** so that a future Reconciliation Agent can audit nothing-disappears between PO → delivery note → goods receipt → M7 sale. Concretely:

- `purchase_receipt.delivery_note_number` mandatory
- `stock_lot.purchase_order_id` (back-pointer)
- `purchase_order_line.sale_order_id` (forward-pointer to M7 sale)
- `purchase_discrepancy` table OR receipt-line discrepancy fields (`discrepancy_qty`, `discrepancy_reason`, `discrepancy_status`)
- 5 mandatory timestamps: `ordered_at`, `sent_to_supplier_at`, `expected_delivery_at`, `delivery_note_received_at`, `goods_received_at`
- `stock_transfer.actual_received_qty` (inter-branch coverage)

**M9 implication of D-M1-10:** none of the listed fields conflict with M9's schema. The `purchase_order_line.sale_order_id` field links *into* M7, not M9, but M9 reads `sale_order_id` via M7 → `lab_jobs.sub_order_id` and can join the chain transitively if it ever needs to. M9 does not store its own copy.

---

## 4. Question C — Touch-point Analysis

The verdict-table from the brief, filled with evidence. Each verdict is one of:

- **NO OVERLAP** — Each module's scope is clearly disjoint
- **CLEAN HAND-OFF** — Defined contract function or event between them
- **GENUINE OVERLAP** — Both modules currently claim ownership; needs resolution
- **AMBIGUOUS** — Not enough evidence in current docs; investigation needed before SPEC

| # | Touch-point | M1 says | M9 says | Verdict |
|---|---|---|---|---|
| C1 | **Custom lens ordered for a specific sale_order** | `purchase_order_line.sale_order_id NULL` (D-M1-10): when M7 sale needs a custom lens, M1 creates a PO line tied to that sale. Receipt of that line creates `stock_lot` + `stock_movement(sale_order_id=...)`. (Mockup 4 / D-M1-07 splits PO lines into 3 sources, including "custom-per-customer" rows that display the customer name + OS#.) | M9 `lab_jobs.order_id` + `sub_order_id` FK to M7 (Brief §3.1); `lab_flow='lens_order_internal'` means M9 created an outgoing-to-lab box AFTER the lens was received by M1 (Brief §2.1). `lab_jobs.status` includes `waiting_lens` state — flips when M1 GR confirms the lens. | **CLEAN HAND-OFF** — M1 = the *commercial/accounting* record (PO line + stock_lot creation); M9 = the *service status* (lab_job waits for lens, then advances). The hand-off is implicit today; explicit contract needed (see §6). |
| C2 | **Goods Receipt for lenses from supplier** | D-M1-09 — M1 owns the "kalat schorah" (goods-receipt-into-stock) screen end-to-end. Mandatory delivery-note number per receipt. Anchors on existing frames receiving pattern (`modules/goods-receipts/*` in M1.5). Creates `stock_lot` with FIFO + supplier-debt at receipt-time (D-M1-11). | M9 Engine 4.5: "Trigger: closing a `stock_inbound` incoming-box. Flow: persist delivery_doc_numbers JSONB. **When the optic later imports the goods in M1 (goods-receipt screen), the import links back to this box.**" M9 SHIPMENTS sketch drawer help-text says the same explicitly: *"הסחורה עצמה נכנסת למלאי במסך-קליטת-סחורה (M1) — שם תוכל לקשר בחזרה לקופסה זו."* | **CLEAN HAND-OFF** — M9 records the *physical box* (with courier_company + supplier_barcode + delivery_doc_numbers); M1 records the *stock entering FIFO inventory* (with delivery_note_number + stock_lot creation + supplier_debt). Linkage: M1 `purchase_receipt.shipping_box_id` (proposed, see §6.4). |
| C3 | **Inter-branch transfers (stock_transfer)** | M1 `stock_transfer` (handoff §6 table 13) — parent for 2 atomic `stock_movement` children, FIFO drains source lots, destination receives child lots with `original_lot_id` reference. Wrapped in `record_transfer()` RPC. `from_location_id`, `to_location_id`, `status` enum, `transfer_number` (sequential RPC). | M9 `shipping_boxes(box_type='inter_branch_inbound' OR 'inter_branch_outbound')` (Brief §3.6) — the **physical box** that moves between branches. For Day-1 Prizma is single-branch, so neither is exercised. | **CLEAN HAND-OFF** (Day-N) — different layers. M1.stock_transfer = bookkeeping (qty moves between locations atomically). M9.shipping_boxes = packaging (the actual box that travels). They reference each other 1:1 when used together (the M9 box can store `stock_transfer_id`). Day-1 has no scenario where they collide. |
| C4 | **Lab compensation / write-off** | When a custom-per-customer lens (sale_order_id linked) is ruined, the lens never hit shelf-stock — no M1 stock-movement write-off needed. When a stock-shelf lens (in_stock flow) is fitted by lab and damaged in-process, the original sale's `stock_movement(sale_order_id=...)` already decremented qty_on_hand. To "return" it = a new `stock_movement` with movement_type=`adjustment_lost` and a back-ref to the sale. | M9 D24 + Brief §2.3 — compensation = credit (M13), not money. M9 incoming-box marks damaged item → auto-creates outgoing credit/replace/repair box + `lab_jobs.status='re_do'`. Approval → calls `loyalty_grant_credit_compensation(M13)`, which auto-creates basic-free membership (M13 D14) if customer is not already a member. **No M1 stock-movement is mentioned in M9 Brief.** | **CLEAN HAND-OFF** with one gap — M9 owns the credit flow (M13). M1 owns the stock-movement write-off if the ruined lens was a stock-shelf lens. M9 must call M1 in that case (new RPC `m1_record_lens_loss(lab_job_id, sale_order_id, reason)` proposed in §6.2). Custom-per-customer ruin → no M1 call needed (lens never sat in shelf stock). |
| C5 | **Supplier-to-optic shipment tracking** | M1 owns supplier-debt + PO + receipt. **Does NOT own** any physical-shipment-tracking entity in the Lens Expansion schema. The legacy `shipments` / `shipment_items` tables are M1's pre-existing infra and are explicitly deprecated by M9 D3. | M9 §3.6 — `shipping_boxes(box_type='stock_inbound')` is the canonical incoming-supplier-box. Drawer flow in M9_SHIPMENTS_SKETCHES: scan supplier_barcode + select courier + record delivery_doc_numbers + close. Then M1 imports the goods in M1's GR screen. | **CLEAN HAND-OFF** — M9 owns supplier-direction box tracking. M1 owns inventory effects. The legacy M1 `shipments` table is dead-code-pending-deprecation; M1 Lens Phase 1 must not reference it (and per Brief schema deltas, doesn't). |
| C6 | **Customer "ready for fitting" status** | M1 GR mockup side panel (line 564–567): *"→ M7 יסומן: 'מוכן ללב'"* — when a custom-per-customer lens is GR-confirmed, the side panel claims "M7 status will be marked: ready for fitting". | M9 `lab_jobs.status` ENUM includes `ready` state. M9 Brief §3.1 lists `ready_notification_sent_at` timestamp. M9 D6 says: "Ready notification is sent manually by the optician from M7's customer card; M9 only flags status." M9 D18 says: "Order's shipment history is shown in M7 customer card — single source of truth via activity_log." | **CLEAN HAND-OFF with mockup-wording correction** — Per M9 Brief, lab-job status is M9-owned; the customer-card UI in M7 reads M9's status. The M1 GR mockup wording "M7 יסומן" is informal shorthand and should be rewritten as "M9 lab_job יתקדם" so the boundary is unambiguous in mockup form. The data flow itself is correct: M1 GR fires event → M9 advances lab_job → M7 customer card reflects M9 state. |

**Tally:**

- **NO OVERLAP:** 0
- **CLEAN HAND-OFF:** 5 of 6 (C1, C2, C3, C4, C5)
- **CLEAN HAND-OFF with mockup-wording correction:** 1 of 6 (C6)
- **GENUINE OVERLAP:** 0
- **AMBIGUOUS:** 0 (C-touch-points are all resolved; one schema-level ambiguity exists — see §5.3 — but it's M9-internal, not C-line)

---

## 5. Question D — Schema Collision Analysis

Cross-reference M1 Lens Expansion's 18 tables + 7 stub-additions vs M9's 8 entities + 2 config tables.

### 5.1 Table name collisions

| Name pattern | M1 has | M9 has | Collision? |
|---|---|---|---|
| `shipping_*` | — | `shipping_boxes`, `shipping_box_items` | NO — M1 doesn't claim this namespace |
| `shipments`, `shipment_items` | YES (legacy, T.SHIPMENTS, T.SHIP_ITEMS) | NO (replaced by `shipping_boxes`) | **DEPRECATION OWED** (M9 SPEC scope, not M1 Lens scope) |
| `lab_*` | — | `lab_jobs`, `lab_categories`, `lab_compensation_tiers`, `lab_notes`, `lab_damage_reasons`, `lab_couriers`, `lab_supplier_thresholds` | NO — M1 doesn't claim this namespace |
| `courier_*` | YES (legacy `courier_companies`, T.COURIERS) | YES (`lab_couriers`) | **POTENTIAL SOFT COLLISION** — two tables for the same functional concept (courier-company config). See §5.3. |
| `stock_*` | YES (M1 Lens NEW — `stock_lot`, `stock_movement`, `stock_transfer`) | — | NO — M9 doesn't claim this namespace |
| `purchase_*` | YES (M1 — `purchase_order`, `purchase_order_line`, `purchase_receipt`, optional `purchase_discrepancy`) | — | NO |
| `lens_*` | YES (M1 Lens NEW — `lens_brand`, `lens_design`, `lens_variant`) | — | NO |
| `compensation_*` | — | `lab_compensation_tiers` (NOT `compensation_event` despite the brief's "claim ownership of compensation_event" hypothetical) | NO |
| `damage_*` | — | `lab_damage_reasons` | NO |

**Result:** Zero hard table-name collisions. One soft naming question (`courier_companies` vs `lab_couriers` — see §5.3).

### 5.2 Status enum overlap

| Enum (verbatim) | M1 owns | M9 owns | Overlap? |
|---|---|---|---|
| `purchase_order.status` | `Draft → Sent to supplier → Partially received → Fully received` (D-M1-08) | — | NO |
| `purchase_discrepancy.status` | `open / resolved / accepted` (D-M1-10) | — | NO |
| `stock_lot.origin_type` | `purchase / customer_return / adjustment_found` (handoff §3 table 11) | — | NO |
| `stock_movement.movement_type` | (implied — sale / receipt / transfer / adjustment_found / adjustment_lost / customer_return) | — | NO |
| `lab_jobs.status` | — | `new / sent_for_framing / waiting_lens / waiting_client / ready / delivered / re_do` (Brief §3.1) | NO — different semantic domain |
| `lab_jobs.compensation_status` | — | `none / threshold_passed / proposed / approved / paid / overridden` (Brief §3.1) | NO |
| `shipping_boxes.status` | — | `draft / sent / received / handled / closed` (Brief §3.6) | NO — different layer than M1 PO status |
| `shipping_boxes.box_type` | — | `return_from_lab / outgoing_to_lab / outgoing_to_customer / outgoing_credit / outgoing_replace / outgoing_repair / stock_inbound / inter_branch_inbound / inter_branch_outbound` | NO |
| `shipping_boxes.direction` | — | `outgoing / incoming` | NO |
| `shipping_box_items.quality_status` | — | `pending / ok / damaged / not_inspected` | NO |
| `legacy shipments.shipment_type` | YES (existing live DB ENUM with values including `delivery`, used by `modules/shipments/shipments-list.js:113`) | — | DEPRECATED-BY-M9 (per M9 D3); not in M1 Lens scope |

**Status enums are perfectly disjoint.** M1's PO `status` describes the **procurement lifecycle** (Draft → Sent → Partially → Fully). M9's `lab_jobs.status` describes the **service-delivery lifecycle** (new → waiting → ready → delivered). M9's `shipping_boxes.status` describes the **physical-package lifecycle** (draft → sent → received → closed). Three different domains, three different state machines, zero overlap.

### 5.3 FK ambiguity and the one soft collision

| FK | Resolution | Notes |
|---|---|---|
| M9 `lab_jobs.order_id` → M7 `sale_order` | Clean (M7 source) | M7 builds the table; M9 references |
| M9 `lab_jobs.sub_order_id` → M7 sub-order | Clean (M7 source) | |
| M9 `lab_jobs.customer_id` → M5 `customers` | Clean (M5 source) | |
| M9 `lab_supplier_thresholds.supplier_id` → M1 `suppliers` | Clean (M1 source) | Per M9 §5 contract row |
| M9 `shipping_box_items.lab_job_id` → M9 `lab_jobs` | Clean (M9 internal) | |
| M9 `shipping_boxes.target_or_source_id` → **polymorphic** (supplier_id OR customer_id) | **Polymorphic FK risk** — flagged by Brief §3.6 itself with annotation `(supplier_id או customer_id)`. Mitigation: split into 2 nullable columns + CHECK exactly-one-NOT-NULL. M9 SPEC scope. | Not an M1 issue per se |
| M9 `shipping_boxes.courier_company_id` → ? | **AMBIGUOUS** — Brief §3.6 names the FK column but Brief §3.9 introduces `lab_couriers` as the courier-config table. The legacy `courier_companies` table (T.COURIERS in `js/shared.js:35`) already exists with the same conceptual schema. M9 SPEC must decide: (a) reuse legacy `courier_companies` (and rename `lab_couriers` references in Brief to `courier_companies`), or (b) introduce new `lab_couriers` and migrate legacy `courier_companies` data into it. | **M9 Brief gap — flagged for M9 SPEC** (not Daniel-decision). Does not block M1 Lens Phase 1. |
| **PROPOSED** — M1 `purchase_receipt.shipping_box_id` NULL → M9 `shipping_boxes` | New FK — see §6.4 schema deltas | Wires the C2 contract |
| **PROPOSED** — M9 `lab_jobs.purchase_receipt_id` NULL → M1 `purchase_receipt` | New FK — see §6.4 schema deltas | Wires the C1 contract |

### 5.4 The legacy `shipments` deprecation — is it unfinished state that affects M1?

Brief stop-trigger #3 asks: "Old shipping module deprecation (M9 absorption) has unfinished state in the repo that affects M1 (e.g., active code paths still calling deprecated tables)."

Investigation result: **the legacy `modules/shipments/*` code exists and the `shipments` / `shipment_items` tables exist in live DB, but no M1 Lens Phase 1 mockup or schema delta references them.** M1 Lens introduces a completely separate `purchase_receipt` flow that bypasses `shipments` entirely. The deprecation is M9 SPEC scope (M9 §9 to-dos line 8: "Migration plan — no migration needed; old M1 shipments module isn't in active use").

**Does this trigger the stop-rule?** No. The trigger fires when *active code paths in M1 are calling deprecated tables*. M1 Lens Phase 1 code (which doesn't exist yet — only mockups + schema deltas) does not call `shipments` / `shipment_items`. The legacy code is dormant. M9 SPEC will decide whether to retire it before or after M9 lands.

### 5.5 Schema collision summary

- **Hard table-name collisions:** 0
- **Status-enum collisions:** 0
- **FK ambiguity:** 1 (M9 internal — `courier_companies` vs `lab_couriers`); does not affect M1
- **Polymorphic-FK risk:** 1 (M9 `shipping_boxes.target_or_source_id`); M9 SPEC scope
- **Deprecation backlog:** 1 (legacy `shipments` + `modules/shipments/*`); M9 SPEC scope
- **New FKs needed to wire M1↔M9 contracts:** 2 (proposed in §6.4)

---

## 6. Question E — Recommended Architecture

### 6.1 Module boundary statement

**M1 owns the *commercial and accounting record* of inventory:**

- Catalog (`lens_brand`, `lens_design`, `lens_variant`)
- Commercial offerings (`supplier_catalog_offering` with price, currency, VAT) and discount overlays (`pricing_overlay`)
- Per-tenant active offerings + curated stock (`tenant_active_offerings`, `tenant_lens_stock`)
- FIFO lot bookkeeping (`stock_lot` with unit_cost + fx_snapshot)
- Stock event ledger (`stock_movement` with explicit FK columns)
- Purchase orders + lines to suppliers (`purchase_order`, `purchase_order_line`)
- Supplier-delivery confirmation into stock (`purchase_receipt` + creation of `stock_lot` rows)
- Supplier-debt creation at receipt-time (D-M1-11, ties to `purchase_receipt`)
- Inter-location atomic bookkeeping (`stock_transfer` parent + `record_transfer()` RPC)
- Supplier identity (`suppliers` — read-only consumed by M9)

**M9 owns the *operational service flow* of every customer order:**

- `lab_jobs` state machine from sale-order-intake to customer-handover (one row per sub-order)
- Dual-clock (processing + pickup), each per-category-configured (`lab_categories`)
- Compensation matrix per (category × tier) with manager-additive-cap (`lab_compensation_tiers`)
- All physical-box tracking — outgoing-to-supplier, outgoing-to-customer, incoming-from-supplier (stock_inbound), incoming-from-lab, inter-branch packaging (`shipping_boxes` + `shipping_box_items`)
- Courier identity (`lab_couriers` — or the legacy `courier_companies`, pending §5.3 resolution)
- Damage-reason taxonomy (`lab_damage_reasons`)
- Per-supplier expected-return thresholds (`lab_supplier_thresholds`, references M1 supplier_id)

**The two modules touch at exactly three contract points:**

1. **Supplier identity** — M1 is source-of-truth; M9 reads suppliers read-only, locked-for-edit in M9 settings (M9_SETTINGS_SKETCHES line 233). M9 may add lab-only suppliers that don't exist in M1 (a lab-vendor catalog distinct from inventory-vendor catalog).
2. **Stock-inbound box → goods-receipt hand-off** — M9 closes a `shipping_box(box_type='stock_inbound')` with `delivery_doc_numbers JSONB`; the optic later opens M1's goods-receipt screen, which reads the M9 box, creates `purchase_receipt` referencing `shipping_box_id`, creates N `stock_lot` rows (FIFO), creates N `stock_movement` rows, creates the `supplier_debt` entry (D-M1-11).
3. **Goods-received → lab-job-advancement event** — M1 GR confirms a receipt-line carrying `sale_order_id NOT NULL` (a custom-per-customer line per D-M1-07); M1 emits an event that advances any M9 `lab_jobs.status` from `waiting_lens` to the next state (`ready_for_framing` or `returned_from_framing` depending on `lab_flow`). The event also stamps `lab_jobs.purchase_receipt_id` for audit.

These three contracts are sufficient to keep the boundary clean. Nothing else crosses.

### 6.2 Contract functions (RPCs + events)

The architecture should be enforced by **explicit RPCs and triggers**, not by handshake. Five contract points:

| # | RPC / Event | Direction | Purpose | Status |
|---|---|---|---|---|
| K1 | `m9_close_incoming_stock_box(box_id, delivery_doc_numbers JSONB, supplier_id, supplier_barcode, courier_company_id)` | optician → M9 | M9 closes the stock_inbound shipping_box after scanning the supplier-barcode + recording delivery docs. Already implicit in M9 Brief Engine 4.3 (Shipping Box Engine) + 4.5 (Inventory Receipt Engine). | **Already in M9 Brief scope.** M9 SPEC names the RPC. |
| K2 | `m1_create_receipt_from_box(box_id NULL, supplier_id, delivery_note_number, line_items[])` | optician (M1 GR screen) → M1 | M1 GR creates `purchase_receipt` with `shipping_box_id` FK (nullable for box-less direct receipts), then creates N `stock_lot` rows (FIFO), N `stock_movement(purchase_receipt_id=...)` rows, supplier_debt. Box-linking auto-copies `delivery_doc_numbers[0]` into M1's mandatory `delivery_note_number` (editable). | **M1 Lens SPEC scope.** New RPC to declare. |
| K3 | `m9_lens_received_for_sale_order(sale_order_id, sub_order_id, purchase_receipt_id)` | M1 → M9 | When M1 GR confirms a `stock_movement` insert with `sale_order_id IS NOT NULL` AND `purchase_receipt_id IS NOT NULL`, M1 fires this event. M9 advances the matching `lab_jobs.status` from `waiting_lens` to next state (per flow). Stamps `lab_jobs.purchase_receipt_id` for audit. Can be implemented as a Postgres `AFTER INSERT` trigger on `stock_movement` filtered by these conditions. | **NEW** — needs declaration in either M1 SPEC or M9 SPEC, whichever lands first. |
| K4 | `m1_record_lens_loss(sale_order_id, lab_job_id, reason)` | M9 → M1 | When M9 incoming-box marks a lab-fitted lens as damaged AND the lab_flow was `in_stock` (lens originally came from shelf-stock, not custom PO), M9 calls M1 to insert an `adjustment_lost` `stock_movement` referencing the lab_job + sale_order. For lab_flow=`lens_order_internal` (custom-per-customer), this RPC is NOT called — the custom lens never sat in shelf-stock, so no shelf-stock decrement is needed; M9 just creates the outgoing replace/credit/repair box and updates lab_jobs.status. | **NEW** — needs declaration in M9 SPEC. |
| K5 | `v_suppliers_for_m9(tenant_id)` View | M9 read-only | A View over M1 `suppliers` exposing only the columns M9 needs (name, contact, default_courier_company_id, expected_return_days inherited from `lab_supplier_thresholds` join). M9 settings consumes this; M1 retains write authority. Per Iron Rule 16 (contracts), modules communicate via Views and RPCs, not direct table access. | **M1 SPEC scope** — small View. |

Five contracts, each with a clear direction. The K1 + K2 + K3 trio is the spine of the stock-inbound flow. K4 is the loss-write-off contract. K5 is the suppliers-read-only contract.

### 6.3 Shared infrastructure (Module 1.5)

**What should live in 1.5 (shared between M1 and M9 / future modules):**

- ✅ **`shipping_boxes` + `shipping_box_items` tables themselves** — M9 owns these by Brief, but they are inherently cross-cutting (M1 might one day want direct supplier-box tracking outside the lab flow; M5 customer-direct-shipment fantasy; etc.). Recommendation: M9 SPEC creates them, but the M9 Brief should add a forward-looking note that if the tables become heavily consumed by non-M9 modules, they may migrate to 1.5 as platform infrastructure. **Decision is M9 SPEC scope, not blocker.**

- ✅ **The existing M1 frame goods-receipts code in `modules/goods-receipts/*`** (per D-M1-09) — already cross-cutting in spirit ("anchor on existing frames pattern + generic 1.5 component"). The M1 Lens Phase 1 SPEC should extend (not duplicate) `modules/goods-receipts/goods-receipt.js` + supporting files (`receipt-form.js`, `receipt-confirm.js`, `receipt-doc-numbers.js`, `receipt-debt.js`, `receipt-actions.js`, etc.) to accept a `product_category` parameter (frames / lenses / contact-lenses / accessories) and dispatch to the right schema. Iron Rule 21 — no duplication.

- ✅ **PIN / auth gates** — from 1.5 (`auth-service.js`); both M1 and M9 use.
- ✅ **Modal / Toast / TableBuilder** — from 1.5; both use.
- ✅ **`activity_log`** — from 1.5; both write to it for cross-cutting audit. M9 `lab_status_log` is explicitly a View over `activity_log`, not a separate table (Iron Rule 21).
- ✅ **`change_approval_log`** — M1 Lens new (per handoff §3); is this cross-cutting or M1-internal? Brief positions it as M1-scoped for now ("governance audit, catalog/price changes only"). If M9 later wants to log compensation-matrix changes through the same gate, the table could be promoted to 1.5. **Not Phase 1 concern.**

**What should NOT be shared (M9 keeps these private):**

- ❌ **The M9 SHIPMENTS-drawer UI** — M9-specific UX for the box closure. M1 should not consume this drawer; M1 has its own goods-receipt screen with different inputs (supplier-first, delivery-note-first, PO-matching, FIFO lot creation). The two are sequential, not the same screen.

- ❌ **`lab_jobs` state-machine logic** — M9-internal. M1 does not advance lab_jobs.status directly; it fires K3 event which M9 reads.

- ❌ **Compensation matrix logic** — M9-internal. M1 plays no role.

### 6.4 Schema deltas (additive only, no breaking changes)

The M1 Lens Brief's already-locked schema (handoff §3 — 18 tables) is complete for M1's own scope. Two additive columns are needed to wire the M1↔M9 contracts cleanly:

```sql
-- DELTA-1 — link M1 goods receipt back to M9 incoming box (when applicable)
ALTER TABLE purchase_receipt
  ADD COLUMN shipping_box_id UUID NULL REFERENCES shipping_boxes(id) ON DELETE SET NULL;
-- Nullable. Two reasons:
-- (a) M1 GR can be created stand-alone (a delivery arrives without a courier box
--     pre-created in M9 — e.g., walked in by hand);
-- (b) historical receipts (frames era, pre-M9) won't have a box reference.
-- Lookup index helpful but not required Phase 1.

-- DELTA-2 — record which M1 receipt fulfilled an M9 lab_job waiting on a lens
ALTER TABLE lab_jobs
  ADD COLUMN purchase_receipt_id UUID NULL REFERENCES purchase_receipt(id) ON DELETE SET NULL;
-- Nullable. Three reasons:
-- (a) lab_flow='in_stock' has no purchase_receipt (lens came from existing stock_lot);
-- (b) lab_flow='external' has no M1 purchase_receipt (external lab handles lens + frame);
-- (c) historical lab_jobs (pre-Lens-Extension) won't have a receipt reference.
-- Audit-only — drives no UI behavior in Phase 1, but enables the Reconciliation Agent.
```

**Additional clarifications (already implicit in M1 Brief, restating for SPEC clarity):**

- M1's `purchase_receipt` table is what the Brief stub-table refers to (handoff §3.7 — "Built in M7 Phase 1"). The live DB today has `goods_receipts` (plural, T.RECEIPTS) for the frames era. The M1 SPEC must decide between (a) reusing + extending `goods_receipts` and renaming references, (b) introducing new `purchase_receipt` and migrating, or (c) accepting divergence (`goods_receipts` for frames, `purchase_receipt` for lenses). Option (a) preserves Iron Rule 21 (no duplication). **Internal M1 decision; raise in M1 SPEC, not in this report.**

- The `shipping_boxes.courier_company_id` FK (M9 Brief §3.6) and the `lab_couriers` table (M9 §3.9) versus the legacy `courier_companies` table — **M9 SPEC must reconcile.** Not M1 concern.

### 6.5 Mockup adjustments

Only one mockup needs adjustment. The other six are correct as-is for M1's scope.

#### 6.5.1 LENS_GOODS_RECEIPT_MOCKUP.html — two corrections

**A. Top step-meta — add an optional "M9 incoming box" linkage field**

Current state (mockup line 220–248 — the `.step-meta` div has 4 fields: ספק / מספר תעודת משלוח / תאריך / סורק):

| Field today | Status |
|---|---|
| ספק | ✅ keep, primary |
| מספר תעודת משלוח / חשבונית | ✅ keep, mandatory |
| תאריך הקבלה | ✅ keep, mandatory |
| סורק / העלאת מסמך | ✅ keep, optional |

**Proposed addition (one new field — fifth column or wrapping below):**

```
┌──────────────────────────────────────────┐
│ קופסה נכנסת מ-M9  (אופציונלי)          │
│ ┌──────────────────────────────────────┐ │
│ │ Box #1247 · LUX-9912 · כץ ↗          │ │
│ └──────────────────────────────────────┘ │
│ 💡 אם הסחורה הגיעה דרך קופסה ב-M9 →    │
│    קישור יעתיק את מספרי התעודות אוטומטית │
└──────────────────────────────────────────┘
```

- If the M1 GR screen was launched from M9 (link from the M9 shipments page → "import to inventory"), this field is pre-filled with the box ID + supplier_barcode + courier_company. Read-only.
- If the M1 GR screen was opened stand-alone, the field is a searchable dropdown over open `shipping_boxes` with `box_type='stock_inbound'` and `status IN ('received', 'handled')` for the selected supplier. Optional.
- When a box is linked, `delivery_doc_numbers[0]` from the box auto-fills the "מספר תעודת משלוח" field (still editable). All other doc numbers from the box are available via a small chevron expander.

Rationale: M9 Brief Engine 4.5 explicitly defines this hand-off ("the import links back to this box"). M9_SHIPMENTS_SKETCHES drawer help-text confirms ("הסחורה עצמה נכנסת למלאי במסך-קליטת-סחורה M1 — שם תוכל לקשר בחזרה לקופסה זו"). The mockup currently elides this linkage. Adding it makes the boundary explicit in the UI.

**B. Side panel "עדשות ללקוחות" — re-word the M7 ready hint**

Current text (mockup line 564–567):

```
✅ דניאל לויטין · OS#3142 · Multifocal
   → M7 יסומן: "מוכן ללב"
```

Replace with:

```
✅ דניאל לויטין · OS#3142 · Multifocal
   → M9 lab_job יתקדם: "עדשה הגיעה — מוכן למיסגור"
   (לקוח יראה "מוכן" בכרטיס שלו ב-M7 — נגזר מ-M9)
```

Rationale: `lab_jobs.status` is M9-owned per M9 Brief §3.1. M7 customer card reads from M9 (per M9 D6, D18). The current wording suggests M1 GR directly writes M7 — that's incorrect; it writes M1 → fires K3 event → M9 advances → M7 reads from M9.

#### 6.5.2 LENS_PURCHASE_ORDER_MOCKUP.html — no change

PO mockup is fully M1-owned. The custom-per-customer lines carry `purchase_order_line.sale_order_id` (D-M1-10) — that's M1↔M7 linkage, not M1↔M9. The PO line is the M1-side record of "this customer ordered this lens, I'm ordering it from the supplier"; M9 has no role in PO creation. The mockup is correct as-is.

#### 6.5.3 Other mockups (1, 2, 3, 5, 6) — no change

- Mockup 1 (Lens Inventory Management) — pure M1 scope (inventory + stock matrix).
- Mockup 2 (Active Designs Selection) — pure M1 scope (catalog curation).
- Mockup 3 (Catalog & Pricing) — pure M1 scope (pricing overlays).
- Mockup 5 (Platform Catalog Admin) — pure Optic Up platform scope; M9 doesn't touch.
- Mockup 6 (Active Purchase Orders List) — pure M1 scope (PO lifecycle).

None of these mockups reference any M9 entity or contract. They are clean.

### 6.6 Summary table of recommended changes

| Change | Location | Owner | Phase |
|---|---|---|---|
| Add `purchase_receipt.shipping_box_id` FK column (nullable) | M1 schema | M1 SPEC | Phase 1 |
| Add `lab_jobs.purchase_receipt_id` FK column (nullable) | M9 schema | M9 SPEC | Phase 1 |
| Declare RPC `m1_create_receipt_from_box(...)` | M1 SPEC | M1 | Phase 1 |
| Declare event `m9_lens_received_for_sale_order(...)` (Postgres trigger on stock_movement insert) | M1 or M9 SPEC (whichever lands first) | shared | Phase 1 |
| Declare RPC `m1_record_lens_loss(...)` | M9 SPEC | M9 | Phase 1 |
| Declare View `v_suppliers_for_m9` | M1 SPEC | M1 | Phase 1 |
| Mockup: `LENS_GOODS_RECEIPT_MOCKUP.html` — add M9-box linkage field in step-meta | M1 architecture-brief/mockups/ | next Cowork/Architect session | Before SPEC lock |
| Mockup: `LENS_GOODS_RECEIPT_MOCKUP.html` — re-word side-panel "M7 ready" hint | M1 architecture-brief/mockups/ | next Cowork/Architect session | Before SPEC lock |
| Reconcile `courier_companies` (legacy, M1.5/M1) vs `lab_couriers` (new, M9 Brief) | M9 Brief / M9 SPEC | M9 | Before M9 SPEC lock |
| Deprecate legacy `shipments` / `shipment_items` / `modules/shipments/*` / `shipments.html` | M9 SPEC | M9 | M9 implementation phase |

---

## 7. Verdict Summary (per Brief §9 success criteria)

- **Genuine overlaps found:** 0
- **Clean hand-offs:** 5 (C1, C2, C3, C4, C5)
- **Clean hand-offs with mockup-wording correction:** 1 (C6)
- **Escalations to Daniel:** 0
- **Recommended verdict: PROCEED-WITH-M1-AS-IS** (with the 3 small refinements in §6 — one mockup tweak + two schema columns + five RPC/event/View declarations)

---

## Appendix A — Evidence Index

All paths relative to `C:\Users\User\opticup\` unless noted.

### M9 sources

- `modules/Module 9 - Lab/architecture-brief/M9_LAB_BRIEF.md` — full read (Brief sealed 2026-05-10):
  - §1 Purpose: lines 15–24 (McDonalds framing)
  - §2.1 Scope: lines 32–35 (3 flows on sub-order, `lab_flow` field)
  - §2.4 Shipments: lines 67–82 (3 box-types incoming, 6 outgoing, m:n out↔in mapping)
  - §3.1 `lab_jobs`: lines 119–134 (entity definition, status enum)
  - §3.6 `shipping_boxes`: lines 173–187 (entity definition, box_types, polymorphic FK noted)
  - §3.9 `lab_couriers`: lines 209–212 (entity definition — flag for §5.3 collision)
  - §4.5 Inventory Receipt Engine: lines 269–276 (M9-side of M1 contract)
  - §5 Contracts table: lines 281–291 (M1 row line 283 — explicit M1 ↔ M9 contract)
- `.claude/skills/opticup-architect/references/decisions/M9.md` — 25 decisions:
  - D1: McDonalds scope (line 29)
  - D2: overturn old "extends shipments" (line 30)
  - D3: M1 legacy shipments deprecated (line 31)
  - D6: customer "ready" sent manually from M7 (line 34)
  - D18: order's shipment history in M7 customer card (line 46)
  - D24: compensation = M13 credit, not M8 payment (line 53)
- `modules/Module 9 - Lab/architecture-brief/M9_SHIPMENTS_SKETCHES.html` — drawer help-text:
  - Stock-receipt drawer rationale lines 136–138 (explicit M9→M1 hand-off statement)
  - Return-from-lab drawer rationale lines 209–211
- `modules/Module 9 - Lab/architecture-brief/M9_SETTINGS_SKETCHES.html`:
  - Line 233 — "ספקים נעולים — מסונכרנים אוטומטית מ-M1" (M9 reads M1 suppliers, locked-for-edit)

### M1 sources

- `.claude/skills/opticup-architect/references/decisions/M1.md` — 11 decisions:
  - D-M1-07 PO source-split incl. custom-per-customer with sale_order_id (lines 56–62)
  - D-M1-09 Goods Receipt anchor on frames pattern (lines 68–76)
  - D-M1-10 Reconciliation-Agent schema readiness — full mandatory field list (lines 78–88)
  - D-M1-11 Debt at receipt-time correction (lines 90–95)
- `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_SESSION_HANDOFF.md`:
  - §"Lens Inventory Schema — SEALED" — 18-table table (lines 52–73)
  - §"Critical RPCs" — `record_stock_movement`, `record_transfer`, `record_adjustment_found` (lines 87–92)
  - §"Cost-basis method LOCKED: FIFO" (lines 122–132)
  - §"v2 features — Forward Compatibility Promise" (lines 146–157)
  - §"2026-05-14 — Mockup Review Session" — schema deltas (lines 244–278)
- `outputs/m1-mockups/LENS_GOODS_RECEIPT_MOCKUP.html` (Cowork session outputs):
  - Step-meta with 4 fields lines 220–249
  - "🧍 עדשות ללקוחות" side panel lines 554–570 (the "M7 יסומן" wording at line 564)
  - "💰 חוב שייווצר" side panel lines 572–595 (debt creation at receipt time — D-M1-11)
- `outputs/m1-mockups/LENS_PURCHASE_ORDER_MOCKUP.html` (Cowork session outputs) — full read; pure M1 scope; no change needed.

### Shared infra

- `js/shared.js` — `T` constants:
  - `T.RECEIPTS = 'goods_receipts'` line 10 (legacy frames receipts)
  - `T.SHIPMENTS = 'shipments'`, `T.SHIP_ITEMS = 'shipment_items'` lines 36–37 (legacy, M9-deprecated)
  - `T.COURIERS = 'courier_companies'` line 35 (legacy; M9 introduces `lab_couriers`)
  - `T.SUPPLIERS = 'suppliers'` line 9 (M1 source-of-truth, M9 reads)
- `modules/goods-receipts/*.js` — existing M1.5 frames goods-receipt component (18 files):
  - `goods-receipt.js` (entry — `loadPOsForSupplier`, `onReceiptPoSelected`)
  - `receipt-confirm.js`, `receipt-form.js`, `receipt-doc-numbers.js`, `receipt-debt.js`, `receipt-actions.js`, `receipt-po-compare.js`, etc.
  - Reused by D-M1-09 ("anchor on existing frames receiving pattern")
- `modules/shipments/*.js` — legacy M1 shipments module (9 files, all M9-deprecated):
  - `shipments-create.js` (lines 9–58 — 3-step new-box wizard, references `shipment_type` ENUM)
  - `shipments-list.js:113` — `filters.shipment_type` (live filter)
  - Mention in `docs/GLOBAL_SCHEMA.sql` line 97–98 — listed as M1 Phase 5.9 tables
- `shipments.html` (root) — legacy ERP page, listed in GLOBAL_MAP §5.3 as "Module 1 — Shipments"

### Cross-cutting docs

- `docs/GLOBAL_MAP.md`:
  - §3 Modules at a Glance — M1 status ✅ Complete (line 66)
  - §5.1 RPC functions — `increment_shipment_counters` (legacy, line 180); `next_box_number` (line 179, sequential RPC pattern Iron Rule 11)
- `docs/GLOBAL_SCHEMA.sql`:
  - Lines 73–98 — Module 1 36 tables summary, including "Shipments (Phase 5.9): courier_companies, shipments, shipment_items"
- `MASTER_ROADMAP.md`:
  - §2.5 Architecture Briefs Status — line 64 "M9 (Lab/KDS) ✅ v1 (closed 2026-05-10)"
  - Line 71 — "M1-extension SPEC (3 inventory tables) must be written first before M7/M9"

---

## Appendix B — Items deliberately NOT covered

Per the brief's out-of-scope section (§8):

- ❌ No code changes proposed (read-only investigation).
- ❌ No edits to `M9_LAB_BRIEF.md` despite the `lab_couriers` vs `courier_companies` Brief gap — flagged in §5.3 for M9 SPEC to resolve.
- ❌ No SPECs written.
- ❌ No edits to mockups — only proposed changes documented in §6.5.
- ❌ No edits to `DECISIONS_LOG.md` index or `decisions/CROSS.md` — Architect's next-session work.
- ❌ No promotion of findings into Master Plan — left for Architect's strategic decision after reading this report.

---

*End of M1 ↔ M9 Overlap Investigation Report. Author: Claude Code investigation executor. Date: 2026-05-14.*
