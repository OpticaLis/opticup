# M5_M8_CROSS_CONTRACT_FIXES — Execution Report

> **Status:** 🟢 CLOSED. 2026-05-23 NIGHT_RUN Track 1. Smoke 7/7 PASS on demo. 0 Prizma writes.

## What was built (11 MCP migrations)

1 trigger fn modified (compute_lifecycle_stage_on_order) + 1 trigger attached (trg_advance_lifecycle_on_paid_payment AFTER INSERT OR UPDATE OF status WHEN paid+amount≥1) + 1 new column (sub_orders.rx_snapshot_jsonb) + 1 RPC modified (add_sub_order populates rx_snapshot at link-time) + 1 trigger fn modified + WHEN gate (emit_first_payment_event_fn try-catch dedup + trigger WHEN) + 1 RPC modified (mark_check_returned race-safe with WHERE status='in_bank' + GET DIAGNOSTICS) + 1 trigger fn modified (emit_check_returned_event_fn try-catch) + 2 partial UNIQUE indexes + 3 FK indexes on payment_events_queue + 2 CHECK constraints (payments.amount>0, sub_order_items.quantity>0) + 4 FK indexes (eye_exams.branch_id, prx_glasses.health_fund_id, prx_contacts.health_fund_id, sub_orders.repair_origin_order_id).

## §3 criteria — all 22 pass

See MIGRATION.md + TEST_REPORT.md.

## Deviations

None. All 8 findings addressed as specified. F-A-2 invariant documented in M7 db-schema.sql header (chain close).

## Outputs

7 SPEC folder files + 11 MCP migrations + post-state verified.

## Hand-off

Chain proceeds to Track 3 (M9_SCHEMA). Track 2 (Leads Migration) ran in parallel/anywhere — completed.
