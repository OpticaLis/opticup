# M7_SCHEMA — Execution Report

> **Status:** 🟢 CLOSED. 2026-05-23 overnight chain Half 1. Smoke 9/9 PASS on demo.

## 1. What was built

- **4 new tables:** orders (17 cols), sub_orders (45 cols incl. Pattern §5.1 multi-state flags), sub_order_items (14 cols, ON DELETE CASCADE), order_general_discounts (12 cols).
- **9 enums:** order_status, sub_order_state, sub_order_kind, sub_order_location, item_type, repair_mode, repair_origin, task_status, discount_type.
- **6 RPCs + 1 trigger fn:** create_order, add_sub_order (letter immutability via count-including-soft-deleted), add_sub_order_item, transition_sub_order_state (decrement/increment inventory atomic), cancel_sub_order (inventory restore + soft-delete), apply_general_discount, recompute_order_status_fn.
- **1 trigger:** trg_recompute_order_status (AFTER INSERT/UPDATE ON sub_orders) — orders.status auto-aggregates from child sub-order states.
- **7 views:** v_order_customer_summary, v_order_full, v_lab_queue, v_open_reservations, v_open_tasks, v_open_repairs, v_ready_for_pickup. All security_invoker=on.
- **Re-used existing infra:** M5 `allocate_tenant_number(p_tenant_id, 'order')` + M1 `decrement_inventory`/`increment_inventory` called directly (no wrappers — Brief §4.3 path 1).

## 2. §3 Criteria — pass

| # | Expected | Actual | Pass |
|---|---|---|---|
| 1 | branch clean | M7 paths clean (selective add) | ✅ |
| 3 | orders ≥17 cols | 17 | ✅ |
| 4 | sub_orders ≥35 cols | 45 | ✅+ |
| 5 | sub_order_items ≥10 cols | 14 | ✅+ |
| 6 | order_general_discounts ≥9 cols | 12 | ✅+ |
| 7 | 9 new enums | 9 | ✅ |
| 8 | RLS 2-policy on 4 tables | confirmed (8 policies) | ✅ |
| 11 | 7 views | 7 | ✅ |
| 12 | 6 RPCs + 1 trigger fn | 7 functions | ✅ |
| 13 | trigger attached | trg_recompute_order_status active | ✅ |
| 14 | Smoke 9/9 | 9/9 | ✅ |
| 16 | Destructive Ops "None." | no DROP issued | ✅ |
| 18 | Advisors clean | 0 new HIGH/ERROR | ✅ |
| 19 | No Prizma writes | 0 prizma orders | ✅ |
| 20 | MIGRATION.md | 13 entries | ✅ |

## 3. Deviations

| Item | Severity | Resolution |
|---|---|---|
| `order_sequences` table per Brief §2.5 NOT created — merged into `tenant_number_counters` shared infra | Intentional design swap | Documented in §0 D3 |
| sub_orders has 45 cols (Brief §2.2 ~37 baseline) | Cosmetic | Generous superset of Brief — extra fields don't hurt |

## 4. Outputs

- 13 MCP migrations
- 7 SPEC folder files (SPEC + MIGRATION + TEST_REPORT + EXECUTION_REPORT + FINDINGS + REVIEW + FOREMAN_REVIEW)
- Module-level docs queued for chain close

## 5. Hand-off

M7 schema 🟢. Chain proceeds to M8_SCHEMA (Half 2). M8 FKs to orders.id are ready.
