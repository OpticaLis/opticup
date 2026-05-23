# M9_SCHEMA — Applied Migrations Log

> Project `tsxrrxzmdxaenlvocyit`. Applied 2026-05-23 NIGHT_RUN chain Track 3.

| # | Name | Summary | Status |
|---|---|---|---|
| 1 | `M9_T3_01_enums` | 8 enums (lab_job_status, lab_flow, shipping_box_direction, shipping_box_type, shipping_box_status, quality_status, compensation_status, lab_event_kind) | success |
| 2 | `M9_T3_02_config_tables` | 5 config tables (lab_categories, lab_damage_reasons, lab_couriers, lab_supplier_thresholds, lab_compensation_tiers) + canonical 2-policy RLS + indexes | success |
| 3 | `M9_T3_03_lab_jobs` | CREATE lab_jobs (35 cols, state-machine, FK customer/order/sub_order/category/branch, UNIQUE sub_order_id) + RLS + 7 indexes | success |
| 4 | `M9_T3_04_notes_boxes` | CREATE lab_notes + shipping_boxes (12 cols, unified direction outgoing/incoming + 9 box_types) + shipping_box_items (with damage_reason FK + linked_outgoing/_incoming polymorphic refs) + RLS + indexes | success |
| 5 | `M9_T3_05_lab_events_queue` | CREATE lab_events_queue (Pattern P22) + 3 partial-unique idempotency indexes (compensation_threshold per lab_job, compensation_approved per lab_job, box_overdue per shipping_box) + 3 FK indexes + partial unconsumed_idx — INHERITS Track 1 lesson from day 1 | success |
| 6 | `M9_T3_06_seeds` | Seed 14 lab_categories (7 per tenant × 2 tenants) + 10 lab_damage_reasons (5 × 2) + 2 lab_couriers (Katz/כץ × 2). ON CONFLICT DO NOTHING throughout. | success |
| 7 | `M9_T3_07_create_lab_job_rpc` | RPC create_lab_job — derives lab_flow from sub_order.kind if not passed | success |
| 8 | `M9_T3_08_advance_freeze_rpcs` | 3 RPCs: advance_lab_status (records flow-timestamp + re_do_count++ on re_do), freeze_lab_clock, unfreeze_lab_clock (accumulates paused-minutes) | success |
| 9 | `M9_T3_09_compensation_rpcs` | 2 RPCs: propose_compensation + approve_compensation (with cap check vs tier+500₪ default; both emit idempotent events) | success |
| 10 | `M9_T3_10_shipping_box_rpcs` | 3 RPCs: create_shipping_box, add_to_shipping_box (auto-advances lab_job→sent_for_framing on outgoing), receive_shipping_box (iterates items, marks ok→returned or damaged→re_do) | success |
| 11 | `M9_T3_11_clock_color_fn` | compute_lab_clock_color_fn — sets status_color (yellow/red/compensation) per category thresholds, accounts for paused-minutes. service_role-only. Production go-live wires via pg_cron. | success |
| 12 | `M9_T3_12_views` | 2 views: v_m9_status_log (over activity_log per Iron Rule 21) + v_lab_queue_full (M9-owned KDS surface joining lab_jobs+orders+sub_orders+customers+lab_categories) | success |
| 13 | `M9_T3_15_lab_jobs_unique_tenant_scoped` | Rule 18 mechanical alignment: DROP UNIQUE(sub_order_id) → ADD UNIQUE(sub_order_id, tenant_id). Functionally identical (sub_orders.id is PK → globally unique already) but matches the mechanical Rule 18 verify-gate check. lab_jobs was empty → no data risk. | success |

**Total:** 13 MCP migrations + 1 reversible structural drop+add (no data) + 0 destructive ops. All additive. Re-runnable.

**OUT-OF-SCOPE (deferred):** pg_cron schedule (production go-live), notification side-effects (M12), M13 loyalty_grant_credit_compensation call (M13 SPEC), M1 lens-specific FKs (separate SPEC), M7 sub_orders.lab_flow column (separate M7 amendment SPEC).
