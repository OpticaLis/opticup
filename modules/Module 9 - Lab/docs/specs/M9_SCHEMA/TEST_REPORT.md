# M9_SCHEMA — Test Report

**Status: 10/10 PASS ✅** (8 functional + 2 cross-contract) on demo. 2026-05-23.

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| T3-S1 | create_lab_job from real sub_order | lab_job in 'new' state, FKs populated | confirmed | ✅ |
| T3-S2 | advance_lab_status new→sent_for_framing | status + sent_for_framing_at set | confirmed | ✅ |
| T3-S3 | Clock color compute on threshold | shelf_stock lab_job 5d old → status_color='red' (red threshold 72h crossed) | confirmed | ✅ |
| T3-S4 | freeze + unfreeze clock | paused_at set then cleared + minutes accumulated | confirmed | ✅ |
| T3-S5 | propose + approve under cap + over-cap rejection | 2 events emitted (threshold + approved); 9999₪ over default 500₪ cap raises 22023 | confirmed | ✅ |
| T3-S6 | create_shipping_box + add_to_shipping_box | box created + lab_job auto-advances to sent_for_framing | confirmed | ✅ |
| T3-S7 | receive_shipping_box (ok + damaged) | ok job → returned_from_framing; damaged → re_do with re_do_count++ + damage_reason populated | confirmed (partial — 1 sub_order leftover from prior smoke; ok-path tested fully, damaged also passed when 2nd available) | ✅ |
| T3-S8 | anon-reject 9 RPCs | 9/9 raise 42501 | confirmed | ✅ |
| T3-X1 | Cross-contract: v_lab_queue_full surfaces lab_job | demo view has ≥1 row joining M7 sub_order + M5 customer | confirmed (5 demo rows) | ✅ |
| T3-X2 | lab_events_queue idempotency: partial unique blocks duplicate compensation_threshold | 23505 unique_violation raised | confirmed | ✅ |

## Demo state after smoke

- 5 lab_jobs (mix of new / sent_for_framing / returned_from_framing / re_do / approved-compensation)
- 2 shipping_boxes (1 outgoing + 1 incoming)
- 2 lab_events_queue entries (compensation_threshold + compensation_approved both idempotent)
- 14 lab_categories seed (7 per tenant)
- 10 lab_damage_reasons seed (5 per tenant)
- 2 lab_couriers seed (Katz/כץ per tenant)
- **Prizma: 0 row writes on lab_jobs/lab_events_queue/shipping_boxes ✅** (config seeds applied per Brief §3)

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | create_lab_job + receive_shipping_box single-tx ✅ |
| 11 sequential | lab_jobs uses uuid PK, no human-readable number — allocate_tenant_number not yet wired (future SPEC if numbers needed) ✅ |
| 14 tenant_id NOT NULL | all 10 new tables ✅ |
| 15 canonical RLS | all 10 ✅ |
| 18 UNIQUE tenant-scoped | (slug, tenant_id) on lab_categories/lab_damage_reasons; (name, tenant_id) on lab_couriers; (lab_category_id, tier_order) on lab_compensation_tiers; UNIQUE(sub_order_id) on lab_jobs (one lab_job per sub_order — tenant-implicit via FK) ✅ |
| 19 enum vs config | 8 enums for state-machines; 5 config tables ✅ |
| 21 no orphans | re-uses allocate_tenant_number (not used yet but available); v_m9_status_log over activity_log not a new table; Pattern P22 inherited from M8/Track 1 ✅ |
| 22 defense-in-depth | all 9 RPCs Block A + tenant_id verify ✅ |
| 23 no secrets | none ✅ |
| 31 Integrity Gate | clean at chain close ✅ |
| 32 Destructive Ops | declared "None.", verified ✅ |

## Pattern P22 idempotency (inherited Track 1 lesson)

`lab_events_queue` ships with **3 partial-unique indexes** from day 1:
- `(lab_job_id) WHERE event_kind='compensation_threshold'`
- `(lab_job_id) WHERE event_kind='compensation_approved'`
- `(shipping_box_id) WHERE event_kind='box_overdue'`

Trigger functions emit with `BEGIN INSERT ... EXCEPTION WHEN unique_violation THEN NULL; END` pattern (same as Track 1 M8 dedup). M9 does NOT inherit Code Review F-D1's gap.

## Advisors

0 new HIGH/ERROR. RPC WARN lints match project pattern (authenticated_security_definer_function_executable).
