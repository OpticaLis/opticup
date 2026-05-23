# M9_SCHEMA — Reviewer Pass

> **Role:** opticup-reviewer. 2026-05-23.

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | All 9 RPCs single-tx ✅ |
| 2 audit | activity_log is M1.5-owned; v_m9_status_log surfaces lab_job/shipping_box subset ✅ |
| 11 sequential | uuid PKs; lab_job_number deferred — no race ✅ |
| 14 tenant_id NOT NULL | all 10 new tables ✅ |
| 15 RLS canonical 2-policy | all 10 (verified pg_policy count = 20) ✅ |
| 18 UNIQUE tenant-scoped | (slug, tenant_id) on lab_categories/lab_damage_reasons; (name, tenant_id) on lab_couriers; (lab_category_id, tier_order) on lab_compensation_tiers; UNIQUE(sub_order_id) on lab_jobs ✅ |
| 19 enum vs config | 8 enums for state-machines + bounded property sets; 5 config tables ✅ |
| 21 no orphans | reuses Pattern P22 + Track 1 dedup idiom; activity_log not duplicated ✅ |
| 22 defense-in-depth | all RPCs Block A + tenant_id verify ✅ |
| 23 no secrets | none ✅ |
| 31 Integrity Gate | clean at commit ✅ |
| 32 Destructive Ops | declared "None.", verified ✅ |

## Pattern P22 idempotency (audit)

Three partial-unique idempotency indexes ship with `lab_events_queue` from migration 5. Direct INSERT duplicate raises 23505 (verified T3-X2). Trigger fns (when M9 grows them in future) inherit the exception-trap pattern from Track 1. Inheritance discipline verified.

## RPC discipline

All 9 RPCs:
- LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' ✅
- Block A header verbatim ✅
- REVOKE EXECUTE FROM anon, PUBLIC + GRANT EXECUTE TO authenticated, service_role ✅
- Tenant_id verified per RPC body ✅
- compute_lab_clock_color_fn is service_role-only (cron caller) ✅

## Cross-contract

- `lab_jobs.sub_order_id → sub_orders.id` FK works on Track 1's stable spine ✅
- `v_lab_queue_full` joins M7 sub_orders + orders + M5 customers + M9 lab_categories — verified live ✅
- `lab_events_queue` will be consumed by M12 (future); foundation built ✅

## Smoke

10/10 PASS (8 functional + 2 cross-contract).

## Advisors

0 new HIGH/ERROR.

## Verdict

**🟢 PASS.** Recommend 🟢 CLOSED.
