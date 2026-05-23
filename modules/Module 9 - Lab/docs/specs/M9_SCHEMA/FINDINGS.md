# M9_SCHEMA — Findings

## F-T3-1 — `lab_jobs.sub_order_id` UNIQUE constraint

Enforced 1:1 lab_job ↔ sub_order. If a sub_order is cancelled+re-created (Iron Rule 32 cancel_sub_order), a new lab_job is created cleanly. Verified safe by sub_orders.id being a uuid PK that never recycles.

**Decision:** dismiss; intentional.

## F-T3-2 — M9 does NOT yet allocate human-readable lab_job_number

Brief did not require one for M9 schema phase. Day-1 uses uuid PK. Future SPEC (M9 UI / KDS Phase C) may add `lab_job_number int` via `allocate_tenant_number('lab_job')` if needed for human-facing identifiers.

**Decision:** deferred to UI SPEC.

## F-T3-3 — `compute_lab_clock_color_fn` not scheduled

Per Brief §4.1: production-day cron job. Not in this SPEC's scope. Function manually invocable for smoke (T3-S3 verified).

**Decision:** deferred to production go-live SPEC.

## F-T3-4 — `approve_compensation` cap uses hardcoded 500₪ default

Brief §2.3 spec'd `tenants.<config>.manager_compensation_max_addition_ils`. Current implementation reads no tenant config (no such column yet). Default 500₪ hardcoded with comment for future tenant-config-driven retrieval.

**Decision:** TECH_DEBT — future Settings/tenant-config SPEC plumbs the per-tenant value.

## F-T3-5 — M13 RPC `loyalty_grant_credit_compensation` not called

Brief §4.2 said M9 approve_compensation should call M13's loyalty RPC. M13 RPC doesn't exist yet (separate SPEC). M9's approve_compensation completes the compensation status flow WITHOUT touching M13. When M13 ships its RPC, M9 SPEC adds the call.

**Decision:** deferred to M13 SPEC integration.

## F-T3-6 — `lab_jobs.lens_variant_id` column omitted (M1 extension blocker)

Brief §1 ToDo + §9: 3 M1 inventory-extension tables (lens/CL/accessory stock) are a separate SPEC's responsibility. M9 schema works without — lens-specific FKs documented-deferred. Future M1-extension SPEC adds the FK column.

**Decision:** TECH_DEBT — M1 extension SPEC.

## F-T3-7 — Notification side-effects deferred (M12 owns delivery)

M9 emits events to `lab_events_queue` but does NOT call M12 from RPC bodies. Per foundation-first principle (Pattern P17). M12 consumer (when wired) drains queue + sends templates.

**Decision:** dismiss; intentional foundation-first.

## F-T3-8 — `lab_events_queue` ships with Pattern P22 idempotency from day-1 ✅

Inherits Track 1 lesson. 3 partial uniques cover compensation_threshold (per lab_job), compensation_approved (per lab_job), box_overdue (per shipping_box). Other event kinds (status_advance, clock_color_change) may emit multiple times per lab_job — no partial unique because Brief design allows multiple status transitions per job.

**Decision:** dismiss; correct application of Pattern P22.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-T3-1 | None | Intentional |
| F-T3-2 | None | Deferred UI SPEC |
| F-T3-3 | None | Production go-live SPEC |
| F-T3-4 | Low | TECH_DEBT (tenant-config SPEC) |
| F-T3-5 | Low | TECH_DEBT (M13 SPEC) |
| F-T3-6 | Low | TECH_DEBT (M1-extension SPEC) |
| F-T3-7 | None | Foundation-first |
| F-T3-8 | None | Correct application |

No reopener-class. Verdict: 🟢 CLOSED.
