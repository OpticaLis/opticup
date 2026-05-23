# M7_SCHEMA — Findings

## F-M7-1 — `order_sequences` table superseded by `tenant_number_counters`

Brief §2.5 envisaged a per-tenant `order_sequences` table. The M5_SCHEMA chain built generic `tenant_number_counters` (PK: tenant_id + entity_kind) which serves the role per-entity. M7 uses `entity_kind='order'`. Avoiding a parallel table follows Iron Rule 21.

**Decision:** dismiss; design intentional. Document in MODULE_MAP.md.

## F-M7-2 — Letter immutability achieved via `count(*) INCLUDING soft-deleted`

In `add_sub_order`, the next letter is computed from `count(*)` of all sub_orders for that order_id INCLUDING `is_deleted=true`. This guarantees a soft-deleted 'A' is never reassigned. Verified in smoke S6 (cancel + new add → 'D' not 'A'). Alternative would be a running counter column.

**Decision:** dismiss; simpler design, no extra column needed.

## F-M7-3 — M5 lifecycle_stage trigger NOT attached on first order

The function `compute_lifecycle_stage_on_order()` exists from M5_SCHEMA but is not wired to AFTER INSERT on orders. Brief OOS — waits for production go-live decision. Deferred trigger attach is recorded in MODULE_MAP.md.

**Decision:** dismiss; intentional defer.

## F-M7-4 — Inventory `quantity` field type vs decrement_inventory signature

M1 `decrement_inventory(uuid, integer)` expects integer delta. `sub_order_items.quantity` is integer NOT NULL DEFAULT 1. Match confirmed.

**Decision:** dismiss; no action.

## F-M7-5 — `closed_at` / `closed_by` on orders unused at day-1

Brief §2.1 fields included. No RPC currently sets them — left for future closure flow (M11 daily-close or M7 cancel_order RPC, neither in scope).

**Decision:** dismiss; columns ready for future use.

## F-M7-6 — `repair_origin_order_id` self-FK risk

`sub_orders.repair_origin_order_id` FKs to `orders(id)` — self-FK across sub_order→order. No cycle risk (orders don't FK to sub_orders). Indexed via `sub_orders_order_id_idx` adequately.

**Decision:** dismiss; design fine.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-M7-1 | None | Intentional |
| F-M7-2 | None | Intentional |
| F-M7-3 | None | Deferred per Brief |
| F-M7-4 | None | No action |
| F-M7-5 | None | Future use |
| F-M7-6 | None | Design fine |

No reopener-class issues. Verdict candidate: 🟢 CLOSED.
