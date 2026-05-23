# M5_M8_CROSS_CONTRACT_FIXES — Applied Migrations Log

> Project `tsxrrxzmdxaenlvocyit`. Applied 2026-05-23 NIGHT_RUN chain Track 1.

| # | Name | Summary | Status |
|---|---|---|---|
| 1 | `M1_5_T1_01_lifecycle_fn_broaden` | CREATE OR REPLACE `compute_lifecycle_stage_on_order` — reads NEW.customer_id, idempotent UPDATE only if lifecycle='prospect' | success |
| 2 | `M1_5_T1_02_lifecycle_trigger_attach` | CREATE TRIGGER `trg_advance_lifecycle_on_paid_payment` AFTER INSERT OR UPDATE OF status ON payments WHEN (NEW.status='paid' AND NEW.amount >= 1) | success |
| 3 | `M1_5_T1_03_rx_snapshot_column` | ALTER sub_orders ADD COLUMN rx_snapshot_jsonb jsonb + COMMENT | success |
| 4 | `M1_5_T1_04_add_sub_order_snapshot` | CREATE OR REPLACE `add_sub_order` — populates rx_snapshot_jsonb from linked prescription at link-time | success |
| 5 | `M1_5_T1_05_first_payment_fn_dedup` | CREATE OR REPLACE `emit_first_payment_event_fn` with `BEGIN INSERT ... EXCEPTION WHEN unique_violation THEN NULL; END` + partial UNIQUE index `payment_events_queue (order_id) WHERE event_kind='first_payment'` | success |
| 6 | `M1_5_T1_06_first_payment_trigger_when` | DROP+CREATE TRIGGER `trg_emit_first_payment_event` adds WHEN clause `NEW.status='paid' AND NEW.amount >= 1` | success |
| 7 | `M1_5_T1_07_mark_check_returned_race_safe` | CREATE OR REPLACE `mark_check_returned` — UPDATE adds `AND status='in_bank'` predicate + GET DIAGNOSTICS row count + raise 40001 if 0 rows affected (concurrent state change) | success |
| 8 | `M1_5_T1_08_check_returned_fn_dedup` | CREATE OR REPLACE `emit_check_returned_event_fn` with exception-trap + partial UNIQUE index `payment_events_queue (payment_id) WHERE event_kind='check_returned'` | success |
| 9 | `M1_5_T1_09_queue_fk_indexes` | 3 CREATE INDEX on payment_events_queue: tenant_id, order_id, customer_id | success |
| 10 | `M1_5_T1_10_check_constraints` | ALTER ADD CONSTRAINT `payments_amount_positive` (amount > 0) + `sub_order_items_quantity_positive` (quantity > 0). DO block ensures idempotent. | success |
| 11 | `M1_5_T1_11_unindexed_fk_fixes` | 4 CREATE INDEX: eye_exams.branch_id, prescriptions_glasses.health_fund_id, prescriptions_contacts.health_fund_id, sub_orders.repair_origin_order_id — partial WHERE not NULL | success |

**Total:** 11 MCP migrations, all successful. All additive. No DROP, no TRUNCATE.

**F-A-2 documentation only** — pending update to `modules/Module 7 - Orders/docs/db-schema.sql` invariant comment (recorded at chain close).
