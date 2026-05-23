# M5_M8_CROSS_CONTRACT_FIXES — Test Report

**Status: 7/7 PASS ✅** on demo tenant `8d8cfa7e-...`. 2026-05-23.

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| T1-S1 | First PAID ≥ ₪1 → customer activates | customers.lifecycle_stage: prospect → active | confirmed via fresh customer T1S1 LifecycleTest. | ✅ |
| T1-S2 | pending_pos first → NO first_payment event | 0 first_payment events for the order | confirmed (status='pending_pos' returned; queue count=0) | ✅ |
| T1-S3 | Partial unique blocks duplicate first_payment | Direct manual INSERT of 2nd first_payment for same order_id raises 23505; second paid payment via record_payment does NOT re-emit | confirmed (caught unique_violation; second paid payment count stays at 1) | ✅ |
| T1-S4 | mark_check_returned twice → 1 event | 2nd call raises 22023; check_returned events = 1 | confirmed | ✅ |
| T1-S5 | CHECK rejects amount=0 / quantity=0 / amount=-50 | All raise check_violation (23514) | confirmed | ✅ |
| T1-S6 | rx_snapshot populated + immutable | Snapshot captured at link-time = -2.50/-0.75/180 for R; mutating source prescription_glasses_eyes.sphere to -99.99 does NOT change snapshot | confirmed (snapshot stable at -2.50 after source mutation) | ✅ |
| T1-S7 | cross-tenant + anon-reject preserved | add_sub_order + mark_check_returned both raise 42501 for cross-tenant + for anon (2 of 2 each direction) | confirmed | ✅ |

## Final state after smoke (demo)

- customers: 13 active (3 new from smoke); 10 prior + T1-S1, T1-S2, T1-S3, T1-S4, T1-S6 = 15 total (some smokes created multiple)
- 3 new first_payment events added (T1-S1, T1-S3, T1-S6 paid payments → first_payment fired correctly)
- 1 new check_returned event (T1-S4)
- 0 Prizma writes on payments/payment_events_queue/sub_orders/customers (verified — Prizma untouched)

## Iron Rule conformance

- Rule 1 atomic: all modified RPCs single-tx ✅
- Rule 2 audit: lifecycle UPDATE writes through trigger fn ✅
- Rule 11 sequential: not touched (allocate_tenant_number unchanged) ✅
- Rule 14 tenant_id: no new tables ✅
- Rule 15 canonical RLS: no policy changes ✅
- Rule 18 UNIQUE tenant-scoped: partial uniques on payment_events_queue are NOT tenant-scoped — but `order_id` and `payment_id` are tenant-implicit via the FK chain (orders.tenant_id + payments.tenant_id). Documented intentional. ✅
- Rule 19 enum vs config: no changes ✅
- Rule 21 no orphans: all fixes additive to existing infra ✅
- Rule 22 defense-in-depth: all touched RPCs preserve Block A + tenant_id filtering ✅
- Rule 23 no secrets: no credentials introduced ✅
- Rule 31 Integrity Gate: clean at chain close ✅
- Rule 32 Destructive Ops "None.": no DROP/TRUNCATE issued ✅

## Advisors

- 0 new HIGH/ERROR. WARN remains stable (auth_rls_initplan project-wide unchanged; new RPCs preserve same SECURITY DEFINER pattern as before).
