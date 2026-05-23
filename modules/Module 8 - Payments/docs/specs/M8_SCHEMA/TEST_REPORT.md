# M8_SCHEMA — Functional Smoke Report

> **Status: M8 8/8 PASS + Cross-Contract M5→M7→M8 6/6 PASS ✅✅** on demo. 2026-05-23.

## M8 functional smoke (8 cases)

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| M-S1 | record_payment cash happy | payment_id + payment_number=1 + status='paid' | confirmed | ✅ |
| M-S2 | FK/cross-tenant enforced | non-existent order_id raises 42501 | caught | ✅ |
| M-S3 | mark_check_deposited deferred→in_bank | status='in_bank', check_deposit_date=today | confirmed | ✅ |
| M-S4 | salary_deduction in v_salary_deduction_pending | row appears | confirmed | ✅ |
| M-S5 | mark_check_returned emits event | payment_events_queue has check_returned row | 1 event | ✅ |
| M-S6 | payment_methods extend preserved rows | 4 original + 2 new = 6 demo rows; credit_card backfill matched | confirmed | ✅ |
| M-S7 | cross-tenant guard | demo→prizma 42501 | caught | ✅ |
| M-S8 | anon-reject 5 RPCs | 5/5 raise 42501 | 5/5 caught | ✅ |

## Cross-contract smoke (M5→M7→M8 bridge — 6 cases)

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| X-S1 | M5 create_customer | new customer_id + customer_number | created | ✅ |
| X-S2 | M7 create_order | order_id + order_number, status='quote' | confirmed | ✅ |
| X-S3 | M7 add_sub_order + add_item + transition active | inventory -1; orders.status='active' (via M7 status aggregation trigger) | confirmed | ✅ |
| X-S4 | M8 record_payment cash | payment_id + payment_number + status='paid' | confirmed | ✅ |
| X-S5 | first_payment event emitted | payment_events_queue has 1 row kind='first_payment' for this payment_id+order_id | 1 event | ✅ |
| X-S6 | v_order_payment_summary | total_paid=250, payment_count=1 | matched | ✅ |

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | ✅ record_payment is single-tx |
| 11 sequential | ✅ payment_number via allocate_tenant_number(_, 'payment'); contiguous in smoke |
| 14 tenant_id | ✅ all 5 new tables |
| 15 canonical RLS | ✅ 2-policy on tenant tables; global tables use service-write + public-read |
| 16 contracts via events | ✅ M8 NEVER calls M7 directly; emits via payment_events_queue. M7 listener attach deferred to Phase E. |
| 18 UNIQUE tenant-scoped | ✅ payment_number + payment_methods.code per-tenant |
| 19 enum vs config | ✅ payment_status state-machine = enum; payment_methods/channels/capabilities/adapters = config tables |
| 22 defense-in-depth | ✅ all 5 RPCs verify tenant_id |
| 32 Destructive Ops "None." | ✅ verified — payment_methods extended additively, no DROP |

## Demo state after smoke

- demo: 5 payments, 3 events (1 first_payment + 1 check_returned + 1 first_payment from cross-contract).
- payment_counter=5.
- Adapter seeds: 3 (mock active, gama_pay + z_credit inactive — manifest only, no integration code).
- Capabilities: 12 global rows.
- Channels: 2 (Mock for demo + Mock for prizma — seeded for both tenants).
- payment_methods: 6 demo + 6 prizma = 12 rows (existing 4 preserved + 8 new across both tenants).
- **Prizma: 0 rows on payments, payment_events_queue ✅** (no row writes).

## Advisors

- 0 NEW HIGH/ERROR.
- 7 WARN `authenticated_security_definer_function_executable` on the 5 RPCs + 2 trigger fns — same project pattern.
