# Module 7 — Orders — Module Spec

## Purpose

Central operational module — every sale, repair, frame-reservation, quote. Customer→order→sub-orders→items + discounts. FK target for M8 payments, M9 lab, M11 reports, M12 communications, M13 loyalty.

## Architecture decisions (sealed M7_ORDERS_BRIEF.md §8)

1. **4 sub-order kinds only** (frame/lenses/contacts/accessories) — bounded enum.
2. **Multi-state via flags (Pattern §5.1)** — state + is_repair + has_open_task NOT separate tables.
3. **Letter immutability** — A/B/... assigned by count INCLUDING soft-deleted (no recycling).
4. **8 sub-orders cap per order** — hard limit enforced in `add_sub_order` RPC.
5. **order_number sequential per-tenant** via atomic RPC re-using M5 `allocate_tenant_number`.
6. **Prescription snapshot-ID** — changing M6 prescription doesn't alter existing order.
7. **Inventory decrement on state→active**, restore on cancel; `decrements_inventory=true` for frame/contacts/accessory, false for free_text + special-order lens.
8. **2 discount layers:** category percentages on sub_order + general discounts on order.
9. **Pattern P21 status aggregation:** orders.status auto = AND of sub-orders states.

## State machines

### order_status
```
quote ──→ active ──→ (closed when delivered)
   │
   └──→ cancelled (all sub-orders cancelled)
```
Computed by `recompute_order_status_fn` trigger from child sub_orders.

### sub_order_state
```
quote ──→ active ──→ delivered
   │            │
   │            └──→ cancelled (M7 cancel_sub_order RPC; inventory restored)
   │
   └──→ reservation ──→ active (Convert to Order RPC, deferred to UI Phase)
              │
              └──→ expired (cron, deferred to production)
```

## Cross-module contracts

- **M5 customers** — `orders.customer_id` FK. M7 reads `v_customer_for_exam/_for_order`.
- **M6 prescriptions** — `sub_orders.prescription_glasses_id/_contacts_id` FK. Snapshot.
- **M1 inventory** — `sub_order_items.inventory_id` FK. M7 calls `decrement_inventory`/`increment_inventory` direct.
- **M8 payments** — M8 emits first_payment event; M7 listens (Phase D wiring). orders.thanks_message_sent_at fires on first payment AND state=active.
- **M9 lab** — M9 will FK to `sub_orders.id`; M9 reads `v_lab_queue`.
- **M11 reports** — M11 reads orders/sub_orders/items via views.
- **M12 communications** — M7 calls `send-message` Edge Function (deferred); M7 updates `ready_at` only after successful message send.
- **M13 loyalty** — coupons via `order_general_discounts.discount_type='loyalty'`.
- **M4 CRM** — M7 calls promote-lead-to-customer RPC on first payment (deferred).

## Out of scope (deferred phases)

- All UI (Phases D-F) — Variant A locked, Chrome MCP work pending.
- 5 print forms (Phase E).
- Helper screens (Phase F).
- OpticPlus migration (Phase C — 9,805 orders).
- Reservation expiry cron.
- M5 lifecycle_stage trigger attach (function exists; waiting production decision).
- M13 loyalty point accrual trigger.
