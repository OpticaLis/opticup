# Module 7 — Orders — Roadmap

> **Authored by:** opticup-strategic (Foreman) — 2026-05-23 overnight chain Half 1
> **Source briefs:** `architecture-brief/M7_ORDERS_BRIEF.md` (v1, sealed 2026-05-07) + `architecture-brief/M7_M8_SCHEMA_OVERNIGHT_BRIEF.md` (v1).
> **Predecessor modules:** M5 Customers (sealed 2026-05-22 🟢) + M6 Prescriptions (sealed 2026-05-22 🟢). M7 FKs to both.

## Phases

| Phase | Name | Status | SPEC folder | Notes |
|---|---|---|---|---|
| **A** | Schema + RLS + Views | ⬜ in progress (2026-05-23 overnight) | `docs/specs/M7_SCHEMA/` | Combined Phase A+B per overnight Brief recommendation |
| **B** | RPCs + state machine + Iron Rule 32 | ⬜ in progress | `docs/specs/M7_SCHEMA/` | Same SPEC as Phase A |
| C | OpticPlus migration (9,805 orders + 146 cols → orders + sub_orders + items) | ⬜ deferred | `docs/specs/M7_MIGRATION/` | Daniel-in-loop, separate SPEC |
| D | UI — Order screen (Variant A: 2 panels horizontal + sticky toolbar) | ⬜ deferred | `docs/specs/M7_UI_ORDER_SCREEN/` | Variant A locked 2026-05-11 (`M7_ORDERS_FULL_MOCKUP_V7.html`). Chrome MCP. |
| E | UI — 5 print forms (Order Inspection, Task, Outside Framing, Frame Reservation, Repair) | ⬜ deferred | `docs/specs/M7_UI_FORMS/` | Per Brief §8 #10 |
| F | UI — Helper screens (active reservations, open tasks, repairs, ready-to-pickup) | ⬜ deferred | `docs/specs/M7_UI_HELPERS/` | Brief §7.1 |
| G | Cross-module contracts wiring (M5 lifecycle trigger attach, M9 lab queue, M13 loyalty trigger) | ⬜ deferred | `docs/specs/M7_CONTRACTS_WIRING/` | Built after M9 ships |

## Phase A+B — Scope (this overnight SPEC)

**Tables built:**
- `orders` — order head (FK customer_id→M5, order_number atomic per-tenant)
- `sub_orders` — sub-order with multi-state via flags (Pattern §5.1 — state + is_repair + has_open_task NOT separate tables)
- `sub_order_items` — line items (FK inventory_id→M1)
- `order_general_discounts` — order-level discounts
- `order_sequences` — per-tenant numbering config (Pattern P19)

**Re-uses existing infrastructure:**
- M5 `allocate_tenant_number(p_tenant_id, 'order')` + `tenant_number_counters` — same shared infra used by M5 customers + M6 prescriptions
- M1 `decrement_inventory(inv_id, delta)` + `increment_inventory(inv_id, delta)` — called directly per Brief §4.3 path 1 (RPCs already exist, simple uuid+integer signature)

**Views (Brief §4 contract layer):**
- `v_order_customer_summary` — M7 reads customer data (M5 surface for M7)
- `v_order_full` — order + sub-orders + items joined for editor UI
- `v_lab_queue` — surface for M9 (when M9 ships)
- `v_open_reservations`, `v_open_tasks`, `v_open_repairs`, `v_ready_for_pickup` — helper screens

**RPCs (≥6):**
- `create_order(p_tenant_id, p_customer_id, p_branch_id, p_language) → uuid` — atomic; allocates order_number
- `add_sub_order(p_tenant_id, p_order_id, p_kind, p_state) → uuid` — assigns letter A/B/...
- `add_sub_order_item(p_tenant_id, p_sub_order_id, p_item_payload jsonb) → uuid` — atomic; decrements_inventory branch
- `transition_sub_order_state(p_tenant_id, p_sub_order_id, p_new_state) → void` — fires inventory decrement on state→active
- `cancel_sub_order(p_tenant_id, p_sub_order_id, p_reason) → void` — fires increment_inventory + soft-delete
- `apply_general_discount(p_tenant_id, p_order_id, p_payload jsonb) → uuid`

**Smoke (≥8 on demo, mandatory):**
1. create_order happy path → order_id + order_number=1
2. order_number atomic allocation (3 sequential, contiguous)
3. add_sub_order — letter A, state='quote', kind='frame'
4. add_sub_order_item + decrement_inventory atomic (inventory.quantity drops by line.quantity)
5. transition_sub_order_state quote→active
6. cancel_sub_order → increment_inventory restores quantity, soft-delete (letter retained)
7. apply_general_discount (loyalty, coupon, manual)
8. Cross-tenant guard (demo session creating prizma order → 42501)
9. Anon-reject on all 6 RPCs

## Out of Scope (this overnight SPEC)

- No UI (Phases D, E, F).
- No OpticPlus migration (Phase C).
- No M9 lab queue trigger (V_lab_queue View is built — M9 SPEC consumes when M9 ships).
- No M5 lifecycle_stage trigger wiring (function exists from M5_SCHEMA — wires when first order ships on Prizma).
- No M13 loyalty trigger wiring.
- No cron jobs (reservation_expired sweep deferred).
- No Prizma row writes — DDL applied to both tenants, smoke data on demo only.
- No merge to main (Daniel-only after QA).

## Decision history (pinned)

The 17 sealed M7 decisions are in `architecture-brief/M7_ORDERS_BRIEF.md` §8. Most load-bearing for this overnight schema:
- 4 sub-order kinds only (frame/lenses/contacts/accessories) — bounded enum.
- Multi-state via flags (Pattern §5.1) — NOT separate tables for repair/reservation.
- Sub-order letter A/B/... immutable lifetime (no recycling after soft-delete).
- order_number sequential per-tenant via atomic RPC (Iron Rule 11) — re-uses M5's `allocate_tenant_number`.
- Prescription snapshot-ID — changing M6 prescription doesn't alter existing order (Pattern §5.6).
- Inventory decrement on state→active (lens decrements only if `decrements_inventory=true`, Brief §4.3).
- Up to 8 sub-orders per order — hard cap.
- Per-sub-order discounts (4 category percentages) + per-order general discounts.

---

*End of MODULE_7_ROADMAP.md. Updated at phase close.*
