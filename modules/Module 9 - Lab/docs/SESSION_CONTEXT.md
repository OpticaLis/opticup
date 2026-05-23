# Module 9 — Lab — Session Context

**Last updated:** 2026-05-23 NIGHT_RUN chain close.
**Status:** 🟢 Phase A+B (Schema + RPCs + Engines DB-side) CLOSED.

## Current state

- **10 new tables:** lab_jobs (35 cols, state-machine), lab_categories (config P19), lab_compensation_tiers (per-category × tier), lab_notes, shipping_boxes (unified outbound/inbound + 9 box_types), shipping_box_items, lab_damage_reasons (config P19), lab_couriers (config P19), lab_supplier_thresholds, lab_events_queue (Pattern P22 with day-1 idempotency).
- **8 enums:** lab_job_status, lab_flow, shipping_box_direction, shipping_box_type, shipping_box_status, quality_status, compensation_status, lab_event_kind.
- **9 RPCs + 1 helper fn:** create_lab_job, advance_lab_status, freeze_lab_clock, unfreeze_lab_clock, propose_compensation, approve_compensation, create_shipping_box, add_to_shipping_box, receive_shipping_box, compute_lab_clock_color_fn.
- **2 views:** v_m9_status_log (over activity_log per Iron Rule 21), v_lab_queue_full (M9-owned KDS surface).
- **3 partial-unique idempotency indexes on lab_events_queue** (inherits Track 1 / Pattern P22).
- **Smoke:** 10/10 PASS on demo (8 functional + 2 cross-contract).
- **0 Prizma row writes** on lab_jobs/lab_events_queue/shipping_boxes ✅; config seeds applied to both tenants.

## Cross-contract

| Surface | Type | Owner | Consumer |
|---|---|---|---|
| `lab_jobs.id` PK | FK target | M9 | M11 future |
| `lab_jobs.sub_order_id` FK | FK | M9→M7 | — |
| `lab_jobs.order_id` FK | FK | M9→M7 | — |
| `lab_jobs.customer_id` FK | FK | M9→M5 | — |
| `v_lab_queue_full` | View | M9 | M9 KDS UI (Phase C), M11 future |
| `lab_events_queue` | event channel | M9 emits | M12 future (drains for templates), M11 future (reports) |

## What's next

- M9 Phase C — KDS UI (sketch ג v2) — Chrome MCP
- M9 Phase D — Shipping UI drawer — Chrome MCP
- M9 Phase E — Manager Dashboard (built in M11, not M9)
- M12 templates (6) — separate SPECs
- M13 `loyalty_grant_credit_compensation` RPC — separate SPEC; then M9 approve_compensation extension to call it
- M1 inventory-extension (3 lens/CL/accessory stock tables) — separate SPEC
- M7 amendment for `sub_orders.lab_flow` column — separate SPEC (M9 derives from kind today)
- Production pg_cron schedule for Clock Engine — production go-live SPEC

## Brief reference

`architecture-brief/M9_LAB_BRIEF.md` v1 (sealed 2026-05-10). 25 decisions locked. 4 sketch files in same folder.
