# Module 9 — Lab — Module Map

## Tables (10, M9-owned)

| Table | Purpose | RLS |
|---|---|---|
| `lab_jobs` | central state-machine, 1:1 with sub_order | canonical 2-policy |
| `lab_categories` | per-tenant config (P19), threshold ms | canonical 2-policy |
| `lab_compensation_tiers` | per-(category × tier) ladder | canonical 2-policy |
| `lab_notes` | per-job comment thread | canonical 2-policy |
| `shipping_boxes` | unified outbound/inbound (9 box_types) | canonical 2-policy |
| `shipping_box_items` | items in a box + linked_outgoing/_incoming polymorphic | canonical 2-policy |
| `lab_damage_reasons` | per-tenant config (P19) | canonical 2-policy |
| `lab_couriers` | per-tenant config (P19) | canonical 2-policy |
| `lab_supplier_thresholds` | per-supplier expected_return_days | canonical 2-policy |
| `lab_events_queue` | Pattern P22 with day-1 idempotency | canonical 2-policy |

## Enums (8)

`lab_job_status`, `lab_flow`, `shipping_box_direction`, `shipping_box_type`, `shipping_box_status`, `quality_status`, `compensation_status`, `lab_event_kind`.

## RPCs (9 + 1 trigger fn)

| Name | Signature | Purpose |
|---|---|---|
| `create_lab_job` | `(tenant, sub_order_id, category_id, lab_flow?) → uuid` | atomic; derives order_id + customer_id; status='new' |
| `advance_lab_status` | `(tenant, lab_job_id, new_status text) → void` | state-machine + flow-timestamp + re_do_count++ |
| `freeze_lab_clock` | `(tenant, lab_job_id, reason) → void` | paused_at + reason |
| `unfreeze_lab_clock` | `(tenant, lab_job_id) → void` | accumulate paused-minutes |
| `propose_compensation` | `(tenant, lab_job_id, amount, type, reason) → void` | status='proposed' + threshold event (idempotent) |
| `approve_compensation` | `(tenant, lab_job_id, amount, approved_by) → void` | cap-check vs tier+max_addition; status='approved' + approved event (idempotent) |
| `create_shipping_box` | `(tenant, direction, box_type, courier_id, barcode) → uuid` | INSERT draft |
| `add_to_shipping_box` | `(tenant, box_id, lab_job_id) → uuid` | INSERT item; if outgoing, auto-advance lab_job to sent_for_framing |
| `receive_shipping_box` | `(tenant, box_id, items_jsonb) → void` | iterate items: ok→returned_from_framing; damaged→re_do |
| `compute_lab_clock_color_fn` | `() → integer` | service_role-only; sets status_color per category thresholds |

All RPCs: SECURITY DEFINER + Block A + REVOKE anon + GRANT authenticated+service_role.

## Views (2)

| View | Purpose |
|---|---|
| `v_m9_status_log` | over `activity_log` (Iron Rule 21 — not a separate table) |
| `v_lab_queue_full` | M9-owned KDS surface joining lab_jobs + orders + sub_orders + customers + lab_categories |

## Cross-module dependencies

| Resource | Owner | Direction |
|---|---|---|
| `sub_orders.id` | M7 | M9 FK → |
| `orders.id` | M7 | M9 FK → |
| `customers.id` | M5 | M9 FK → |
| `tenant_location.id` | M1.5 | M9 FK → |
| `allocate_tenant_number` | M5 | (available, not yet used by M9) |
| `activity_log` | M1.5 | M9 reads via view |
