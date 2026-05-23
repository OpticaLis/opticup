# M7_SCHEMA — Functional Smoke Report

> **Status: 9/9 PASS ✅** on demo tenant `8d8cfa7e-...`. 2026-05-23.

## Smoke matrix

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| S1 | create_order happy | order_id + order_number=1, status='quote' | confirmed | ✅ |
| S2 | order_number atomic 3-call | contiguous N, N+1, N+2; counter advances | contiguous; counter=N+2 | ✅ |
| S3 | add_sub_order letter assignment | A, B, C | matched | ✅ |
| S4 | item w/ state=quote: no decrement | inventory unchanged | qty unchanged | ✅ |
| S5 | transition quote→active: decrement | inventory.quantity drops by 1 | dropped 1 | ✅ |
| S6 | cancel_sub_order restores inventory + letter retained | qty restored; is_deleted=true; new sub-order gets letter 'D' (not recycled 'A') | confirmed | ✅ |
| S7 | apply_general_discount sums correctly | discount_amount = 50 then 75 (after 2 calls) | matched | ✅ |
| S8 | cross-tenant guard | demo JWT calling prizma tenant → 42501 | caught | ✅ |
| S9 | anon reject 6 RPCs | 6/6 raise 42501 | 6/6 caught | ✅ |

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic RPCs | ✅ — create_order, transition, cancel all single-transaction |
| 11 sequential allocation | ✅ — re-uses M5's allocate_tenant_number |
| 14 tenant_id NOT NULL | ✅ — all 4 tables |
| 15 canonical RLS | ✅ — 2-policy on all 4 |
| 16 contracts | ✅ — M7 ← M5/M6/M1 via FK + RPC calls; M8 will FK to M7.orders |
| 18 UNIQUE tenant-scoped | ✅ — (order_number, tenant_id) WHERE not NULL; (order_id, letter) per parent |
| 19 enum vs config | ✅ — bounded state-machines = enums; order_sequences merged into shared tenant_number_counters |
| 22 defense-in-depth | ✅ — all RPCs verify tenant_id = p_tenant_id |
| 32 Destructive Ops "None." | ✅ — verified |

## Demo state after smoke

- 6 orders, 5 sub-orders, 2 items, order_counter=6.
- Inventory: qty decremented + restored cleanly during S4-S6.
- Prizma: 0 rows on all M7 tables ✅.

## Advisors

- 0 NEW HIGH/ERROR.
- 7 WARN `authenticated_security_definer_function_executable` (project pattern — same as M5+M6+next_box_number).
