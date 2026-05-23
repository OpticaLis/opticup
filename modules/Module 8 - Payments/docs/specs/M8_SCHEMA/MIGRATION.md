# M8_SCHEMA — MCP Applied Migrations Log

> Project `tsxrrxzmdxaenlvocyit`. Apply time: 2026-05-23 overnight chain Half 2.

| # | Name | Summary | Status |
|---|---|---|---|
| 1 | `M8_01_enums` | 4 enums (payment_status, check_bounce_reason, payment_channel_status, payment_event_kind) | success |
| 2 | `M8_02_payment_methods_extend` | EXTEND payment_methods (+7 cols additive: name_ru, requires_pos, requires_external_receipt, icon, sort_order, tenant_default, updated_at). Backfilled 4 existing demo rows. Seeded 2 new (bit, salary_deduction) on demo + 6 fresh on prizma | success |
| 3 | `M8_03_payment_capabilities` | CREATE payment_capabilities (global pool, service-write/public-read) + 12 seed rows | success |
| 4 | `M8_04_payment_adapters_manifest` | CREATE payment_adapters (global manifest) + 3 seed rows (mock, gama_pay, z_credit) — SKELETON ONLY, no integration code | success |
| 5 | `M8_05_payment_channels` | CREATE payment_channels (per-tenant) + 2 seed rows (Mock for demo, Mock for prizma) | success |
| 6 | `M8_06_payments` | CREATE payments (28 cols incl. check-specific) + RLS 2-policy + 7 indexes + UNIQUE(payment_number, tenant_id) WHERE not NULL | success |
| 7 | `M8_07_payment_events_queue` | CREATE payment_events_queue + RLS + 2 indexes | success |
| 8 | `M8_08_record_payment_rpc` | RPC record_payment — Block A + tenant guard + status determination (method.requires_pos + check_due_date + external_receipt) + allocate_tenant_number('payment') + INSERT | success |
| 9 | `M8_08_check_state_rpcs` | 4 state-transition RPCs: mark_check_deposited, mark_check_cleared, mark_check_returned, mark_salary_deduction_processed — all Block A + state-machine guards | success |
| 10 | `M8_09_event_triggers` | emit_first_payment_event_fn (AFTER INSERT) + emit_check_returned_event_fn (AFTER UPDATE OF status) + 2 attached triggers | success |
| 11 | `M8_10_views` | 5 views: v_order_payment_summary, v_customer_payments_history, v_payments_for_reports, v_salary_deduction_pending, v_returned_checks_pending | success |

**Total:** 11 MCP migrations, all successful. Re-uses M5 `allocate_tenant_number` + M7 `orders.id` FK + M5 `customers.id` FK.
