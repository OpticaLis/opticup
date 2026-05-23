# Module 7 — Orders · Module Map

> **Status:** Build phase opened 2026-05-23 — Schema Phase A+B sealed 🟢.
> Pre-build artifacts in `architecture-brief/`. Production schema details below.

---

## Tables (M7-owned, sealed 2026-05-23)

| Table | RLS | Pattern |
|---|---|---|
| `orders` | canonical 2-policy | head; FK customer_id→M5, branch_id→tenant_location |
| `sub_orders` | canonical 2-policy | Pattern §5.1 multi-state via flags; letter immutability via count-incl-soft-deleted |
| `sub_order_items` | canonical 2-policy | ON DELETE CASCADE from sub_orders; FK inventory_id→M1 |
| `order_general_discounts` | canonical 2-policy | FK order_id→orders |

## Enums (9)

State-machines: `order_status`, `sub_order_state`, `sub_order_kind`, `sub_order_location`, `task_status`.
Property sets: `item_type`, `repair_mode`, `repair_origin`, `discount_type`.

## Functions (6 RPCs + 1 trigger fn)

| Name | Signature | Purpose |
|---|---|---|
| `create_order` | `(tenant, customer_id, branch_id, language, created_by) → jsonb` | Atomic; allocates order_number via M5 helper |
| `add_sub_order` | `(tenant, order_id, kind, state, prescription_glasses_id, prescription_contacts_id, created_by) → uuid` | Letter immutability + 8-cap |
| `add_sub_order_item` | `(tenant, sub_order_id, payload) → uuid` | Auto-decrement if state='active' AND decrements_inventory=true |
| `transition_sub_order_state` | `(tenant, sub_order_id, new_state) → void` | Decrement on →active; increment on active→cancelled |
| `cancel_sub_order` | `(tenant, sub_order_id, reason) → void` | Iterate items + increment_inventory + soft-delete (letter retained) |
| `apply_general_discount` | `(tenant, order_id, payload) → uuid` | INSERT + recompute orders.general_discount_amount |
| `recompute_order_status_fn` | trigger fn | AFTER INSERT/UPDATE OF state, is_deleted ON sub_orders → orders.status (Pattern P21) |

All SECURITY DEFINER + Block A + REVOKE anon + GRANT auth/service_role.

## Re-used existing infra

- M5 `allocate_tenant_number(p_tenant_id, 'order')` — atomic per-tenant sequence
- M1 `decrement_inventory(uuid, integer)` / `increment_inventory(uuid, integer)` — called direct

## Views (7)

| View | Consumer |
|---|---|
| `v_order_customer_summary` | M7 editor (Phase D) + M8 receipt build |
| `v_order_full` | M7 editor — order + sub-orders + items joined |
| `v_lab_queue` | M9 future |
| `v_open_reservations`, `v_open_tasks`, `v_open_repairs`, `v_ready_for_pickup` | Helper screens (Phase F) |

All `security_invoker=on`.

## Triggers (1 attached)

- `trg_recompute_order_status` — AFTER INSERT/UPDATE OF state, is_deleted ON sub_orders → fires `recompute_order_status_fn`.

## T-constants added to js/shared.js

```js
ORDERS, SUB_ORDERS, SUB_ORDER_ITEMS, ORDER_GENERAL_DISCOUNTS
```

---

## DB tables (pre-build)

(historical placeholder — superseded by tables above)

## Architecture-brief artifacts (pre-build)

| Artifact | Purpose |
|---|---|
| `architecture-brief/M7_ORDERS_BRIEF.md` | Original module brief (with Canonical Sketch header referencing V7) |
| `architecture-brief/M7_ORDERS_HANDOFF.md` | Architect → Module Strategist handoff |
| `architecture-brief/M7_ORDERS_FEATURE_INVENTORY.md` | Feature inventory |
| `architecture-brief/M7_ORDERS_PRINT_FORMS.md` | Print-forms spec |
| `architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html` | **Canonical sketch (locked 2026-05-11)** — Variant A: two-pane work surface + sticky tools strip |
| `architecture-brief/M7_FORM_*_MOCKUP.html` | 4 print-form mockups (reservation, inspection, repair, task) |
| `architecture-brief/M7_CENTER_REDESIGN_BRIEF.md` | Brief for the 3-variant redesign (2026-05-11) |
| `architecture-brief/M7_CLOSURE_BRIEF.md` | Brief that authorized V7 closure (2026-05-11) |

### Archived predecessors (under `_archive/m7-sketches-v6-prior/`)

| Artifact | Why archived |
|---|---|
| `M7_ORDERS_FULL_MOCKUP_V6.html` | v6 baseline (3-column, 9 stacked regions) — superseded by V7 layout. |
| `M7_CENTER_REDESIGN_V7_VARIANTS.html` | 3-variant comparison file (A/B/C in one HTML). Variant A extracted as V7 canonical; B + C archived for decision history. |
| `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` | Earlier (rejected) "Tabs / Scan-first / Staged" center-column attempt. |

See `_archive/m7-sketches-v6-prior/README.md` for the archive index.

## SPECs

| SPEC | Status | Folder |
|---|---|---|
| `M7_CENTER_REDESIGN_V7_VARIANTS` | 🟢 CLOSED 2026-05-11 (artifact deliverable) | `docs/specs/M7_CENTER_REDESIGN_V7_VARIANTS/` |
| `M7_CLOSURE_V7_VARIANT_A` | 🟢 CLOSED 2026-05-11 (doc-only closure; V7 = Variant A locked) | `docs/specs/M7_CLOSURE_V7_VARIANT_A/` |
