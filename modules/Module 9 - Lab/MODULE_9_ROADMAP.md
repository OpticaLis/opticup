# Module 9 — Lab — Roadmap

> **Authored by:** opticup-strategic (Foreman) — 2026-05-23 NIGHT_RUN chain Track 3
> **Source brief:** `architecture-brief/M9_LAB_BRIEF.md` v1 (sealed 2026-05-10)
> **Predecessor:** Track 1 closed 🟢 2026-05-23 — spine cross-contract gaps fixed.

## Phases

| Phase | Name | Status | SPEC folder | Notes |
|---|---|---|---|---|
| **A** | Schema + RLS + Views + RPCs + state-machine (DB-only — no notification side-effects) | ⬜ in progress (2026-05-23 overnight) | `docs/specs/M9_SCHEMA/` | Combined Phase A+B per NIGHT_RUN Brief Track 3 |
| **B** | Engines (Clock cron + Compensation + Shipping Box DB functions) | ⬜ in progress | `docs/specs/M9_SCHEMA/` | Same SPEC (no actual cron scheduling — built but not wired) |
| C | KDS UI (sketch ג v2) | ⬜ deferred | `docs/specs/M9_UI_KDS/` (not yet authored) | Chrome MCP |
| D | Shipping Box UI (drawer) | ⬜ deferred | `docs/specs/M9_UI_SHIPMENTS/` | Chrome MCP |
| E | Manager Dashboard UI (M11 builds — not M9) | ⬜ deferred | M11 SPECs | |
| F | M12 notification templates (6 templates, 3 languages × 3 channels) | ⬜ deferred | M12 SPECs | M9 fires events; M12 delivers |
| G | M13 loyalty integration — `loyalty_grant_credit_compensation` RPC | ⬜ deferred | M13 SPECs | M9 calls existing/future M13 RPC |
| H | M1 inventory-extension blocker (3 lens/CL/accessory tables) | ⬜ deferred | M1 SPECs | M9 builds without it; FK to inventory documented-deferred |

## Phase A+B — Scope (this overnight SPEC)

**Tables built (~10 + lab_status_log as View):**
- `lab_jobs` — main entity, state-machine, FK customer/order/sub_order
- `lab_categories` — config per-tenant (Pattern P19); per-category threshold ms
- `lab_compensation_tiers` — per-(category × tier)
- `lab_notes` — optometrist comment thread
- `shipping_boxes` — unified outbound/inbound boxes
- `shipping_box_items` — line items in a box
- `lab_damage_reasons` — config per-tenant (Pattern P19)
- `lab_couriers` — config per-tenant (Pattern P19)
- `lab_supplier_thresholds` — per-supplier expected_return_days
- `lab_events_queue` — Pattern P22 durable event queue (inherits Track 1 partial-unique idempotency idiom)
- `v_m9_status_log` — View over activity_log (NOT a table — Iron Rule 21)

**Enums:** lab_job_status, lab_flow, shipping_box_direction, shipping_box_type, shipping_box_status, quality_status, compensation_status, lab_event_kind

**RPCs (~8):** create_lab_job (auto-FK from M7 sub_orders.lab_flow), advance_lab_status (state-machine + clock-side-effects), freeze_lab_clock + unfreeze_lab_clock, propose_compensation, approve_compensation (with manager_max_addition cap), create_shipping_box, add_to_shipping_box, receive_shipping_box (mark ok/damaged).

**Views (~5):** v_lab_queue_full (M7 consumer-side already exists), v_lab_delays_by_supplier (M11 future), v_lab_processing_time (M11 future), v_lab_optician_kpi (M11 future), v_m9_status_log (over activity_log).

**Re-uses existing infra:**
- M5 `allocate_tenant_number(_, 'lab_job')` — atomic per-tenant lab_job numbering
- M5 `customers.id` FK target
- M7 `sub_orders.id` + `orders.id` FK targets — verified Track 1 + Track 2 closed
- M1 `inventory.id` FK target (deferred lens-specific FKs — Brief §9 acknowledges M1 extension blocker)
- Pattern P22 from M8 — `lab_events_queue` inherits partial-unique-on-source-id idiom from Track 1 (per NIGHT_RUN Brief §4 explicit)

**Cross-contract:**
- M7 → M9 read: sub_orders with `lab_flow` flag populate lab_jobs (deferred until M7 adds lab_flow column — Brief §9 ToDo)
- M9 → M11: `v_lab_*` views surface KPIs
- M9 → M12: emits to `lab_events_queue` → M12 reads templates (deferred listener)
- M9 → M13: calls `loyalty_grant_credit_compensation` (deferred — RPC not yet built in M13)

**Smoke (≥8 on demo + cross-contract):**
1. create_lab_job from sub_order → lab_job in 'new' state
2. advance_lab_status new→sent_for_framing → state changes + sent_for_framing_at recorded
3. Clock yellow threshold passes (manipulated created_at) → status_color='yellow' (no actual cron — manual SQL invocation of clock fn)
4. freeze_lab_clock with reason → paused_at recorded
5. propose_compensation (manager) + cap enforcement (request > tier_amount + manager_max_addition raises 22023)
6. approve_compensation under cap → status='approved'
7. create_shipping_box (outgoing) + add_to_shipping_box → lab_job.status='sent_for_framing'
8. receive_shipping_box (incoming) mark_ok + mark_damaged with reason → ok jobs flip to 'returned_from_framing', damaged jobs flip to 're_do'
9. Cross-tenant guard + anon-reject on all 8 RPCs
10. Cross-contract: real sub_order from M7 → lab_job → v_lab_queue surfaces it
11. lab_events_queue idempotency: partial unique blocks duplicate event_kind for same source_id

## Out of Scope (this overnight SPEC)

- Clock Engine pg_cron scheduling — function exists; cron NOT scheduled (cron belongs to M9 production go-live)
- Notification side-effects (WhatsApp, sound) — M12 owns delivery
- M13 loyalty integration RPC — separate SPEC
- M1 inventory-extension (3 lens/CL/accessory tables) — separate SPEC; M9 schema works without; lens-specific FKs documented-deferred
- KDS UI / Shipments UI / Dashboard UI — Phases C-E
- M7 sub_orders.lab_flow column — separate M7 amendment SPEC (M9 ships without; create_lab_job derives lab_flow from kind today, M7 amendment will add explicit column)

---

*End of MODULE_9_ROADMAP.md.*
