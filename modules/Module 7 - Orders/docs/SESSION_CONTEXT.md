# Module 7 — Orders — Session Context

**Last updated:** 2026-05-23 overnight chain close.
**Status:** 🟢 Phase A+B (Schema + RPCs + Views + status aggregation trigger) CLOSED. Phases C-G deferred.

## Current state

- **4 tables deployed:** orders (17 cols), sub_orders (45 cols multi-state flags), sub_order_items (14 cols), order_general_discounts (12 cols). All RLS canonical 2-policy.
- **9 enums** for state-machines + bounded property sets.
- **6 RPCs + 1 trigger fn:** create_order, add_sub_order, add_sub_order_item, transition_sub_order_state, cancel_sub_order, apply_general_discount + recompute_order_status_fn.
- **1 trigger attached:** trg_recompute_order_status — orders.status auto-aggregates from sub-order states (Pattern P21).
- **7 views:** v_order_customer_summary, v_order_full, v_lab_queue, v_open_reservations, v_open_tasks, v_open_repairs, v_ready_for_pickup.
- **Smoke:** 9/9 PASS on demo. **0 Prizma writes** ✅.
- **Re-used existing infra:** M5 `allocate_tenant_number(_, 'order')` + M1 `decrement_inventory`/`increment_inventory` (called directly per Brief §4.3).

## Cross-contract surfaces

| Surface | Type | Owner | Consumer | State |
|---|---|---|---|---|
| `orders.id` PK | FK target | M7 | M8 ✅, M9 future, M11 future | live |
| `sub_orders.id` PK | FK target | M7 | M9 future | live |
| `orders.customer_id` | FK | M7→M5 | — | live |
| `sub_orders.prescription_glasses_id` / `_contacts_id` | FK | M7→M6 | — | live |
| `sub_order_items.inventory_id` | FK | M7→M1 | — | live |
| `v_order_customer_summary` | View | M7 | M7 editor (Phase D), M8 | live |
| `v_lab_queue` | View | M7 | M9 future | live |
| Pattern P21 (parent-status aggregation trigger) | trigger | M7 | M8/M11 may inherit | live |

## What's next

- **M9 (Lab)** — FK to sub_orders.id ready. Separate overnight SPEC chain.
- M7 Phase D — Order screen UI (Variant A locked 2026-05-11 in `architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`). Chrome MCP.
- M7 Phase E — 5 print forms.
- M7 Phase F — Helper screens.
- M7 Phase G — Cross-module wiring (M5 lifecycle trigger attach, M9 lab queue, M13 loyalty trigger).
- M7 Phase C — OpticPlus migration (9,805 orders).

## Predecessor architecture-brief snapshot

V7 canonical sketch locked 2026-05-11 (`architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html`). Authorizing UI SPEC: `docs/specs/M7_CLOSURE_V7_VARIANT_A/` (UI-only, no schema). Pre-V7 sketches in `_archive/m7-sketches-v6-prior/`.
