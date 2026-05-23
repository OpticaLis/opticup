# M7_SCHEMA — MCP Applied Migrations Log

> Project `tsxrrxzmdxaenlvocyit`. Apply time: 2026-05-23 overnight chain Half 1.

| # | Name | Summary | Status |
|---|---|---|---|
| 1 | `M7_01_enums` | 9 enums (order_status, sub_order_state, sub_order_kind, sub_order_location, item_type, repair_mode, repair_origin, task_status, discount_type) | success |
| 2 | `M7_02_orders` | CREATE orders (17 cols) + RLS 2-policy + 5 indexes + UNIQUE(order_number, tenant_id) WHERE not NULL | success |
| 3 | `M7_03_sub_orders` | CREATE sub_orders (45 cols — Pattern §5.1 multi-state flags) + RLS + 10 indexes + UNIQUE(order_id, letter) including soft-deleted | success |
| 4 | `M7_04_sub_order_items` | CREATE sub_order_items (14 cols) + RLS + 3 indexes + ON DELETE CASCADE from sub_orders | success |
| 5 | `M7_05_order_general_discounts` | CREATE order_general_discounts (12 cols) + RLS + 2 indexes | success |
| 6 | `M7_06_create_order_rpc` | RPC create_order — Block A + tenant guard + allocate_tenant_number('order') + INSERT | success |
| 7 | `M7_06_add_sub_order_rpc` | RPC add_sub_order — Block A + letter immutability (count INCLUDING soft-deleted to assign next) + 8-cap | success |
| 8 | `M7_06_add_sub_order_item_rpc` | RPC add_sub_order_item — Block A + auto decrement_inventory if state='active' AND decrements_inventory | success |
| 9 | `M7_06_transition_sub_order_state_rpc` | RPC transition_sub_order_state — Block A + atomic inventory decrement on →'active' + increment on 'active'→'cancelled' | success |
| 10 | `M7_06_cancel_sub_order_rpc` | RPC cancel_sub_order — Block A + increment_inventory for all items + soft-delete (letter retained) | success |
| 11 | `M7_06_apply_general_discount_rpc` | RPC apply_general_discount — Block A + INSERT + recompute orders.general_discount_amount | success |
| 12 | `M7_07_status_aggregation_trigger` | recompute_order_status_fn + trg_recompute_order_status AFTER INSERT/UPDATE ON sub_orders | success |
| 13 | `M7_08_views` | 7 views (v_order_customer_summary, v_order_full, v_lab_queue, v_open_reservations, v_open_tasks, v_open_repairs, v_ready_for_pickup) all security_invoker=on | success |

**Total:** 13 MCP `apply_migration` calls, all successful. Re-uses M5 `allocate_tenant_number` + M1 `decrement_inventory`/`increment_inventory` directly (no thin wrappers).
