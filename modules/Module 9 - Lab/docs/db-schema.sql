-- ============================================================
-- Module 9 — Lab/KDS — DDL snapshot
-- Sealed: 2026-05-23 Phase A+B closed 🟢 (NIGHT_RUN chain Track 3)
-- Source of truth: live DB on Supabase project tsxrrxzmdxaenlvocyit.
-- Detailed DDL: docs/specs/M9_SCHEMA/SPEC.md §9 + docs/specs/M9_SCHEMA/MIGRATION.md
-- ============================================================

-- Enums (8): lab_job_status, lab_flow, shipping_box_direction, shipping_box_type,
--   shipping_box_status, quality_status, compensation_status, lab_event_kind

-- 10 new tables — all RLS canonical 2-policy:
--   lab_jobs (35 cols; UNIQUE(sub_order_id); FK customer/order/sub_order/category/branch)
--   lab_categories (per-tenant config P19; thresholds in minutes; default_lab_flow)
--   lab_compensation_tiers (per-(category × tier); cap derives from manager_max_addition)
--   lab_notes (per-job comments)
--   shipping_boxes (unified direction + 9 box_types; FK courier; polymorphic target_or_source_id)
--   shipping_box_items (FK lab_job + damage_reason; linked_outgoing/_incoming polymorphic refs)
--   lab_damage_reasons (per-tenant config P19; seed: scratch, prescription_mismatch, broken,
--     missing_part, poor_quality)
--   lab_couriers (per-tenant config P19; seed: כץ)
--   lab_supplier_thresholds (per-supplier expected_return_days)
--   lab_events_queue (Pattern P22 with 3 day-1 partial-unique idempotency indexes:
--     compensation_threshold per lab_job, compensation_approved per lab_job, box_overdue per box)

-- 9 RPCs + 1 trigger fn (all SECURITY DEFINER + Block A + REVOKE anon + GRANT auth+service_role
-- except compute_lab_clock_color_fn which is service_role-only):
--   create_lab_job, advance_lab_status, freeze_lab_clock, unfreeze_lab_clock,
--   propose_compensation, approve_compensation (cap-checked vs tier+manager_max),
--   create_shipping_box, add_to_shipping_box (outgoing auto-advances lab_job→sent_for_framing),
--   receive_shipping_box (ok→returned_from_framing; damaged→re_do + re_do_count++),
--   compute_lab_clock_color_fn (scans active jobs, sets status_color per category thresholds).

-- 2 views (security_invoker=on):
--   v_m9_status_log (over activity_log — Iron Rule 21, not a new table)
--   v_lab_queue_full (joins lab_jobs+orders+sub_orders+customers+lab_categories)

-- Pattern P22 idempotency from day-1 (inherited from Track 1 lesson):
-- ALL CREATE OR REPLACE FUNCTIONs that INSERT into lab_events_queue wrap in
-- BEGIN INSERT ... EXCEPTION WHEN unique_violation THEN NULL; END for at-least-once → exactly-once.

-- Seed config: 14 lab_categories (7 per tenant × 2), 10 lab_damage_reasons (5 × 2),
-- 2 lab_couriers (Katz/כץ × 2). ON CONFLICT DO NOTHING (idempotent).

-- OUT-OF-SCOPE (deferred to future SPECs):
-- - lab_jobs.lens_variant_id FK (M1 inventory-extension SPEC)
-- - sub_orders.lab_flow column (M7 amendment SPEC)
-- - loyalty_grant_credit_compensation call in approve_compensation (M13 SPEC)
-- - WhatsApp/sound notifications (M12 owns delivery via lab_events_queue drain)
-- - pg_cron schedule for compute_lab_clock_color_fn (production go-live SPEC)
-- - tenants.manager_compensation_max_addition_ils config (Settings SPEC; defaults to 500₪ today)
