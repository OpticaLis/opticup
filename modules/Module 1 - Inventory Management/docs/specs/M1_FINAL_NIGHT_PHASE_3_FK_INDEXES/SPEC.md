# SPEC — M1 Final Night Phase 3: FK Indexes Verification + Cleanup

**Slug:** `M1_FINAL_NIGHT_PHASE_3_FK_INDEXES`
**Phase of:** M1 Final Completion Continuation
**Author + Executor:** opticup-executor (Claude Code, Cowork)
**Date:** 2026-05-17
**Estimated:** 1-2h per Continuation Brief §4. **Actual: ~10min** (M1 lens scope was already fully indexed by prior SPECs)

---

## 1. Goal

Per Continuation Brief §4. Apply remaining partial FK indexes flagged in advisor probe `0001_unindexed_foreign_keys` within M1 scope. Re-run probe expecting 0 unindexed FKs in M1 lens-adjacent tables.

## 2. Pre-flight finding

Detailed `pg_constraint` query against M1 inventory tables (17 tables: lens_brand/_design/_variant, contact_lens_variant, accessory_variant, supplier_catalog_offering, pricing_overlay, tenant_active_offerings, tenant_lens_stock, tenant_contact_stock, tenant_accessory_stock, purchase_order, purchase_order_line, purchase_receipt, purchase_receipt_line, stock_lot, stock_movement) returned **0 unindexed FKs**.

Full advisor probe (DB-wide) returned 115 total unindexed FK findings, but only 1 in M1-adjacent scope: `purchase_order_items_inventory_id_fkey` on the legacy `purchase_order_items` table (older frames-inventory flow, 151 demo rows still active).

**Why M1 lens scope is clean:** the 3 prior SPECs already added all relevant indexes:
- `M1_CONTACT_LENSES_ACCESSORIES` added 8 partial FK indexes (per its SESSION_CONTEXT)
- `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED` added 3 partial indexes for `cloned_from_id`
- Plus the lens-receipt + variant_display_seq indexes added during M1 Phase 1B

The "21+" expectation in the original Brief was based on a pre-2026-05-15 state; subsequent SPECs already addressed the bulk.

## 4. Destructive Operations

Iron Rule 32 — REQUIRED DECLARATION:

1. **CREATE INDEX × 1** — `idx_purchase_order_items_inventory_id ON purchase_order_items(inventory_id) WHERE inventory_id IS NOT NULL`. Partial, additive, no risk.

**Explicitly NOT authorized:** any DROP, any data write, any RLS change, any RPC change.

## 7. Acceptance Criteria

- Advisor probe `0001_unindexed_foreign_keys` returns 0 findings in M1 lens-adjacent scope (already true; this SPEC also closes the 1 frames-legacy match)
- Iron Rule 31 + 32 gates exit 0

## 12. Execution Markers

- **C-1 ✅** — 2026-05-17 — Migration `m1_phase3_add_purchase_order_items_inventory_id_index` applied. Partial index created. Closes the 1 M1-adjacent unindexed-FK advisor finding (the legacy frames `purchase_order_items.inventory_id`). M1 lens scope was already index-clean before this SPEC.
