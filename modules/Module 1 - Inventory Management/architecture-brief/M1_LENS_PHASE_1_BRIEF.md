# Module Brief — M1 Lens Inventory Phase 1

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic` skill) → Executor (`opticup-executor`)

---

## 1. Purpose

M1 today handles only frames inventory. This Phase extends M1 with **prescription lenses** (עדשות-ראייה) — the largest, most schema-heavy of the three planned categories (lenses, contact-lenses, accessories). The Phase ships catalog, pricing, inventory, purchase orders, and goods receipt for lenses across all 4 Israeli suppliers Prizma works with today.

This is a **launch-blocker** for M7 (Orders) and M9 (Lab/KDS) — both depend on the M1 lens schema existing before they can be built.

---

## 2. Scope — In

The Phase ships 7 screens + the underlying schema + the platform-admin tooling.

**7 Screens:**

1. **Lens Inventory Management** (יומיומי, צוות חנות) — SPH×CYL grid, view stock + add to refill empties. Primary filter: stock/custom.
2. **Active Designs Selection** (הקמה, מנהל סניף) — pick which lens series the optic carries. Primary filter: stock/custom.
3. **Catalog & Pricing** (תמחור, מנהל) — 3 columns (catalog / discount% / final), inline edit, bulk operations, tiered default-and-exception structure, primary filter stock/custom.
4. **Purchase Order** (per supplier) — auto-fills shortages + custom-per-customer lines, manual export PDF/Excel, mark-as-sent (no auto-send Phase 1), source-split grouping.
5. **Platform Catalog Admin** (Optic Up team only) — hierarchical CRUD on supplier → brand → series → variants. Bulk brand-catalog import via agent.
6. **Active POs List** (manager) — display-only list across all suppliers and time, status pipeline, cancel-order action via row menu.
7. **Goods Receipt** (receiving employee) — anchored on existing frames `goods-receipts/` UX, mandatory delivery-note number, optional doc scan/upload, supplier-first filtering, manual additions allowed, optional M9-box linkage field.

**Schema (18-table sealed):**

Three-layer architecture: GLOBAL CATALOG (`lens_brand`, `lens_design`, `lens_variant`) → COMMERCIAL LAYER (`supplier_catalog_offering`, `pricing_overlay`) → RETAILER LAYER (`tenant_active_offerings`, `tenant_lens_stock`) → OPERATIONS LAYER (`stock_lot` FIFO, `stock_movement` ledger, `stock_transfer` for inter-branch).

Plus governance: `change_approval_log`, `supplier_permissions`, `currencies`, `vat_rates`.

**Full schema documented in:** `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_SESSION_HANDOFF.md` §"Final 18-table schema"

**Mockups (sealed 2026-05-14, in repo):** `modules/Module 1 - Inventory Management/architecture-brief/mockups/` (7 files).

## 3. Scope — Out (anti-creep)

Explicitly **NOT** in Phase 1:

- **Contact lenses + accessories** (separate future M1 phases per Daniel's stated order)
- **Supplier portal** — supplier-direct write access to catalog. Deferred to Phase 2+. Today's flow: Optic Up admin seeds catalogs; optic curates discounts.
- **Auto-send PO to supplier** (email/WhatsApp/API). Manual PDF/Excel export only in Phase 1. Tenant config flag exists, defaults OFF.
- **Reconciliation Agent** itself — only its **schema readiness** ships Phase 1 (timestamps, delivery_note_number, FK links). The agent code is Phase 2+.
- **Bundle pricing, supplier rebates, consignment stock, drop-ship** — all v2 forward-compatibility (additive, no migration). Documented in handoff §"v2 features".
- **Promotional discount engine** — Phase 1 has manual `pricing_overlay` editing. Time-window promotional logic = future.
- **Phone-scan OCR of delivery notes** — UI field exists, OCR pipeline is Phase 2+.

## 4. Locked Decisions

15 decisions locked across two sessions (12.5 + 14.5). Module Strategist must not relitigate without Architect consultation.

| # | Decision | Source |
|---|---|---|
| 1 | 3 separate inventory tables (lenses, contact-lenses, accessories) — NOT one unified table with category enum | handoff 12.5 |
| 2 | Build order: lenses first | handoff 12.5 |
| 3 | FIFO cost basis (over weighted-avg / specific-identification) | handoff 12.5, D-M1 |
| 4 | 1:1 brand-supplier today, 1:N future-ready via `tenant_supplier_preference` | handoff 12.5 |
| 5 | AXIS belongs to prescription (M6), not lens inventory | handoff 12.5 |
| 6 | Stock/Custom flag on `supplier_catalog_offering` (commercial offer), not on `lens_variant` (physical SKU) | D-M1-01 |
| 7 | Stock/Custom is **primary filter** on every M1 screen + M7/M9 future | D-M1-01 |
| 8 | 3 price columns (catalog / discount% / final) with inline edit + bulk — NO separate edit screen | D-M1-04 |
| 9 | Tiered discount: `pricing_overlay` default-layer (design or supplier level) + variant-level exceptions | D-M1-05 |
| 10 | PO is manually sent in Phase 1 (PDF/Excel export); auto-send is Phase 2+ tenant config | D-M1-07 |
| 11 | Goods Receipt anchors on existing frames `modules/goods-receipts/` UX; generic component in Module 1.5 | D-M1-09 |
| 12 | Debt creation happens at goods-receipt time (from delivery note/invoice), NOT at PO creation | D-M1-11 |
| 13 | Reconciliation-agent schema readiness mandatory Phase 1 — 7 schema fields | D-M1-10 |
| 14 | Two additive FK columns to wire M1↔M9 contracts: `purchase_receipt.shipping_box_id` (M1 side), `lab_jobs.purchase_receipt_id` (M9 side) | D-M1-12 |
| 15 | Five M1↔M9 contract functions K1-K5 declared in respective SPECs | D-M1-13 |

Full decisions in: `.claude/skills/opticup-architect/references/decisions/M1.md`

## 5. Dependencies

### Upstream (must exist before this Phase starts)

- **Module 1.5 (Shared Components)** — ✅ DONE. The generic goods-receipt component lives here; M1 Lens extends it (Iron Rule 21).
- **Module 2 (Platform Admin)** — ✅ DONE. The "Platform Catalog Admin" screen (#5) uses Module 2 permission infrastructure to gate access to Optic Up team only.
- **`auth-service.js`, PIN flow, Modal, Toast, TableBuilder** — ✅ all in 1.5.
- **`activity_log`, `change_approval_log`** — `activity_log` ✅ exists in 1.5. `change_approval_log` is NEW in this Phase.

### Downstream (waiting on this Phase)

- **M7 (Orders)** — sealed Brief. Cannot build until M1 Lens schema exists (custom-per-customer PO lines link via `sale_order_id`).
- **M9 (Lab/KDS)** — sealed Brief. Depends on M1 supplier identity (read-only) + the K1-K5 contracts.
- **Future M1 extensions** — contact lenses, accessories — will reuse the receiving component pattern established here.

## 6. Cross-Module Contracts

The Phase establishes **two contract surfaces** with M9.

### Stock-inbound box hand-off (M9 → M1)

M9 closes a `shipping_box(box_type='stock_inbound')` with `delivery_doc_numbers JSONB`. Goods Receipt screen (M1) optionally links to that box; `delivery_doc_numbers[0]` auto-fills M1's mandatory `delivery_note_number` (still editable). M1 GR creates the `purchase_receipt`, the FIFO `stock_lot` rows, the `stock_movement` ledger entries, and the `supplier_debt` entry.

**Schema delta:** `purchase_receipt.shipping_box_id UUID NULL REFERENCES shipping_boxes(id) ON DELETE SET NULL`.

### Goods-received → lab-job-advancement event (M1 → M9)

When M1 GR confirms a `stock_movement` insert with `sale_order_id IS NOT NULL` AND `purchase_receipt_id IS NOT NULL`, M1 emits an event (Postgres AFTER INSERT trigger) that advances M9 `lab_jobs.status` from `waiting_lens` to the next state per `lab_flow`. Event stamps `lab_jobs.purchase_receipt_id` for audit.

**Schema delta (M9 side):** `lab_jobs.purchase_receipt_id UUID NULL REFERENCES purchase_receipt(id) ON DELETE SET NULL`.

### Five named contract functions

K1, K2, K3, K4, K5 — full table in `decisions/M1.md` D-M1-13. M1 Phase 1 SPEC declares K2, K3-firing-side, K5. M9 SPEC declares K1, K3-consuming-side, K4.

### Supplier identity

`suppliers` (today) / `supplier` row schema — M1 source of truth, M9 reads via View `v_suppliers_for_m9(tenant_id)`. M9 cannot edit; can add lab-only suppliers via its own settings page.

## 7. Open Questions for the Module Strategist

These are decisions the Architect could not make without deeper code-level knowledge. Module Strategist resolves with Daniel.

1. **`goods_receipts` vs `purchase_receipt` table naming.** Live DB has `goods_receipts` (plural) for the frames era. Phase 1 introduces `purchase_receipt` (singular) per the sealed schema. Three options: (a) reuse and extend `goods_receipts` + rename column references, (b) introduce new `purchase_receipt` and migrate frames data, (c) accept divergence — frames keep `goods_receipts`, lenses use `purchase_receipt`. Iron Rule 21 (No Duplicates) favors option (a). Module Strategist's call after auditing existing code.

2. **Variant ID coding scheme.** Mockup 5 shows `V-001847`-style IDs. Module Strategist decides between UUID-only (Iron Rule fits but ugly for humans) versus a human-readable secondary `display_id` column. Both M1 and M9 staff will reference these in conversations.

3. **Phasing of the 7 screens within Phase 1.** All 7 ship at LIVE-day. Module Strategist decides whether to ship them as one SPEC or split into sub-phases (e.g., schema + Platform Admin first, then customer-facing screens, then PO/GR loop). Architect recommendation: 2 sub-phases — (1) schema + Platform Catalog Admin (so the catalog can be seeded), (2) all 6 customer-facing screens together.

4. **Bulk-import agent for catalogs.** Mockup 5 shows "📥 ייבוא קטלוג מותג שלם" button. The agent itself reads a PDF/Excel and creates lens_design + lens_variant rows. Module Strategist decides: Edge Function with prompted LLM, fully manual structured upload, or hybrid. Architect recommendation: structured Excel upload Phase 1 (rules-based); LLM agent Phase 2+.

## 8. Anti-Patterns (Things to Avoid)

Harvested from previous module lessons and from the M1↔M9 overlap report findings:

- **AXIS confusion** — AXIS is a prescription field (M6), NOT a stock characteristic. Do not put it on lens_variant. (D-M1, also recorded as Architect lesson 2026-05-12.)
- **Conflating Brand and Supplier** — Hoya is a brand. Lapidot is a supplier. They're different entities with 1:1 (today) or 1:N (future) relationships. Never merge them.
- **Direct M9 table writes from M1 code** — M1 writes only its own tables; M1↔M9 cross talk happens via K1-K5 contracts (RPCs, View, AFTER-INSERT trigger). No direct UPDATE on `lab_jobs` from M1 paths.
- **Editing legacy `shipments` / `shipment_items` tables** — those are deprecated by M9 absorption. Don't touch them from M1 Lens Phase 1.
- **Per-screen permission scattering** — Iron Rule 21 favors centralizing permission checks. Reuse existing `PermissionUI` from 1.5.
- **Pre-stage financial records on intent events** — debt creation is at goods-receipt-time, not at PO-creation-time (D-M1-11). Do not create supplier_debt rows from the PO flow.
- **Building bulk operations "later"** — bulk pricing was almost deferred; Daniel correctly insisted it ships Phase 1 (D-M1-04). For other multi-row UIs in this Phase, default to "bulk-by-default" instead of "single-row-by-default."

## 9. Iron Rules in Sharp Focus

Out of the 31 Iron Rules, these are the ones most likely to be tested:

- **Rule 1 (Atomic qty changes via RPC with FOR UPDATE)** — every `record_stock_movement`, `record_transfer`, `record_adjustment_found` must be atomic.
- **Rule 11 (Sequential numbers via RPC)** — `next_lot_number`, `next_transfer_number`, `next_receipt_number`, `next_po_number` all must use atomic RPC with FOR UPDATE.
- **Rule 14 (tenant_id everywhere)** — `currencies` is the documented exception. `lens_brand/lens_design/lens_variant` use `owner_tenant_id`. All others have `tenant_id NOT NULL`.
- **Rule 15 (RLS canonical pattern)** — two-permissive-policy for platform-owned tables (owner_view + public_view). Standard `tenant_id = jwt_tenant_id()` + service_bypass for tenant tables.
- **Rule 16 (Contracts between modules)** — M9 cross-talk through K1-K5 only.
- **Rule 18 (UNIQUE includes tenant_id)** — every UNIQUE constraint tenant-scoped except platform-catalog UNIQUEs which are `owner_tenant_id`-scoped.
- **Rule 19 (Configurable values as tables)** — currencies, vat_rates are tables. movement_type / status as ENUMs (accounting-bounded, not tenant-configurable).
- **Rule 21 (No Orphans / No Duplicates)** — extend `modules/goods-receipts/*` rather than build a parallel `modules/lens-receipts/*`. Most-likely-violated rule in this Phase.
- **Rule 22 (Defense-in-depth on writes)** — every `.insert()` / `.upsert()` includes `tenant_id: getTenantId()`. Every `.select()` filters `.eq('tenant_id', getTenantId())`.

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_SESSION_HANDOFF.md` | Full 18-table schema + adversarial-review summary + v2 forward-compat |
| `modules/Module 1 - Inventory Management/architecture-brief/M1_M9_OVERLAP_REPORT.md` | M9 boundary + K1-K5 contracts + schema deltas |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/` | All 7 mockups (4 retrofitted, 3 new) |
| `modules/Module 1 - Inventory Management/docs/goods-receipts/` | The existing frames receiving pattern to extend |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | All 15 D-M1 decisions |
| `docs/GLOBAL_MAP.md` | Existing functions to reuse |
| `docs/GLOBAL_SCHEMA.sql` | Existing schema baseline |
| `CLAUDE.md` §4-§6 | Iron Rules |

## 11. Hand-off Note

Daniel pastes the sibling Activation Prompt into a fresh Claude Code chat. Claude Code activates `opticup-strategic` (Module Strategist skill), reads this Brief end-to-end, then:

1. Lists all SPECs under `modules/Module 1 - Inventory Management/docs/specs/` to harvest lessons from prior reviews
2. Reads handoff + decisions/M1.md + overlap report + all 7 mockups + existing goods-receipts code
3. Writes `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1/SPEC.md` per the SPEC template
4. Optionally writes a phased ROADMAP if it splits into sub-phases (see open question #3)
5. Hands off to Executor via the Full Auto Pipeline

Architect stays out unless: cross-module decision surfaces, scope change requested, strategic blocker.

---

*End of Brief. Module Strategist owns from here.*
