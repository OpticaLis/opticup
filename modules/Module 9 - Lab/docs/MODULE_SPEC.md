# Module 9 — Lab/KDS — Module Spec

## Purpose

Operational lab/KDS layer + unified shipping box management. Source-of-truth for lab_job status, processing clock, compensation, outgoing/incoming boxes. Successor to the legacy M1 shipments mini-module.

## Architecture decisions (sealed M9_LAB_BRIEF.md §11 — 25 decisions)

- D1-D3: Full McDonald's-screen sytem, M1 shipments retired, unified into M9.
- D4: Two clocks (processing + pickup), per-category thresholds.
- D5: Sketch ג v2 (priority + sub-row).
- D6: Ready-notification manual from M7 (not auto).
- D7: Categories from M7; `lab_flow` field on sub_order (M7 amendment SPEC).
- D9: Compensation matrix per-(category × tier), manager-discretion under cap.
- D10: Branches infra-ready, Prizma=single-branch.
- D12: 3 processing thresholds (yellow/red/compensation) + 2 pickup (yellow/red).
- D13: Sound + WhatsApp (M12) on compensation event only.
- D14: Outgoing/incoming boxes M:N (not 1:1).
- D16: Supplier barcode "sticks" to all orders in box.
- D18-D19: Incoming box drawer (return / stock_inbound / inter_branch).
- D24: Compensation = M13 basic membership (auto-created on first compensation).
- D25: Dashboard built in M11, not M9.

## State machine — lab_job_status

```
new ──→ sent_for_framing ──→ at_lab ──→ returned_from_framing ──→ ready ──→ delivered
                                  │
                                  └→ re_do (count++) ──→ sent_for_framing (re-loop)

new ──→ waiting_lens (for lens_order_internal flow)
new ──→ waiting_client (manual hold)
new ──→ cancelled (manual)
```

## State machine — shipping_box_status

```
draft ──→ sent ──→ received ──→ handled ──→ closed
```

## Cross-module contracts

- M5 (read): customer info from `v_customer_for_exam` etc.
- M7 (read): sub_orders + orders for FK targets; M7's `v_lab_queue` exists; M9 builds its own `v_lab_queue_full`.
- M8 (none — direct): compensation = credit via M13 (not payment in M8).
- M11 (consume): M9 emits views `v_lab_queue_full` + future delay/optician/processing-time views.
- M12 (future): drains lab_events_queue → templates.
- M13 (future): `loyalty_grant_credit_compensation` called from M9 approve_compensation.
- M1 (read): suppliers + courier_companies (existing). M1-extension blocker for lens/CL/accessory stock.

## Pattern P22 inheritance

`lab_events_queue` ships with 3 partial-unique idempotency indexes from day-1, inherited from Track 1 lesson (M8 Q2):
- `(lab_job_id) WHERE event_kind='compensation_threshold'`
- `(lab_job_id) WHERE event_kind='compensation_approved'`
- `(shipping_box_id) WHERE event_kind='box_overdue'`

Other event kinds (status_advance, clock_color_change) may emit multiple times per source — by design.

## Out of scope

- All UI (Phases C-D)
- M11 dashboard (M11's responsibility)
- M12 templates (M12's responsibility)
- M13 loyalty integration RPC
- M1 inventory-extension blocker (3 lens/CL/accessory stock tables)
- Production pg_cron schedule for Clock Engine
- Notification side-effects (WhatsApp, sound)
- M7 amendment for sub_orders.lab_flow column
