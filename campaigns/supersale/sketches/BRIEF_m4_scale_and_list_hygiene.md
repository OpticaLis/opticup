# BRIEF (Architect) — M4 Scale Readiness + List Hygiene (path to 10K leads)

**Author:** Events-Operations (Cowork) · **For:** opticup-architect (Tier-2 strategic; this is cross-cutting M4 infrastructure, NOT a single config SPEC) · 2026-05-24
**Companion:** ACTIVATION_PROMPT_m4_scale_and_list_hygiene.md
**Trigger:** Daniel plans **~10,000 leads within the coming months** and wants the messaging system ready BEFORE the load arrives — not firefighting under live pressure (which already happened today: see "Incident" below).

---

## Why now (the incident that proves it)

Today (2026-05-24) Wave 1 of the SuperSale launch went out to **1,137 Prizma leads × 2 channels = 2,274 queued messages**. During the send, **two live ERP screens (תור הודעות + קישורים קצרים) hit `canceling statement due to statement timeout`** and were unusable for the operator while the broadcast ran. Root cause: `crm_message_queue` had grown to ~20,600 rows and the screen query did a **Seq Scan (2,156 ms)** with no `(tenant_id, created_at)` index. I added `idx_crm_message_queue_tenant_created` CONCURRENTLY as a live hotfix → query dropped to **50 ms**. That patched today, but it is a point fix. **At 10K leads the same class of failure recurs in several places.** This brief asks the Architect to design the real scale plan.

## Measured reality (live data, 2026-05-24 — use these, don't estimate)

- Dispatch throughput: **~55 messages/minute** sustained (cron `dispatch-queue`, batch 15/tick, 1s SMS throttle).
- `crm_message_queue`: **20,637 rows / 23 MB** after essentially ONE campaign cycle. `sent` rows accumulate in the same hot table (no archival).
- `crm_message_log`: **10,762 rows / 35 MB**.
- Prizma active leads today: **1,298**.

## Projection to 10K leads (why it breaks)

- One campaign to 10K × 2 channels = **20,000 queue rows per send**. At 55/min that's **~6 hours of continuous sending** for a single campaign — and the cron path is the only sender.
- After a handful of campaigns the queue + log tables reach **hundreds of thousands of rows**. The screen seq-scans return even with the new index (the index helps the LIMIT-100 recent-view, but any aggregate/count/full-history view still scans). Operator screens time out again under load.
- Vendor ceilings: Green API (SMS) and the email path have daily caps. A 10K blast will hit them and silently fail/halt (we already saw Global SMS 404 on >5-part messages halt a batch historically).
- Email deliverability: 10K emails from one domain in a short window = spam-flagging. No warm-up / dedicated-IP strategy today.

## Scope the Architect should plan (priority order — my recommendation)

1. **Queue table lifecycle (highest priority).** Archive `sent`/`failed` rows out of the hot `crm_message_queue` into a history table (or date-partition the table) on a schedule, so the operational table stays small and screens stay fast regardless of total campaign volume. Today's index is a stopgap; this is the real fix.
2. **Throughput + vendor-aware rate limiting.** Make `dispatch-queue` batch size + parallelism configurable and vendor-ceiling-aware (per-tenant daily caps, back-off on vendor 4xx/5xx, spread a large blast across hours/days automatically). A 10K send must not require a human babysitting it for 6 hours.
3. **Screen queries at scale.** Audit every M4 screen query (queue, short-links stats, dashboard, activity log) for seq-scans; add covering indexes and/or pre-aggregated materialized views refreshed on a schedule, so history/stats screens don't compute on-the-fly over huge tables.
4. **Email deliverability for volume.** Evaluate a volume-grade email path (SES/SendGrid) with SPF/DKIM/DMARC + warm-up, vs. the current path, before 10K sends become routine.
5. **List Hygiene / "suspicious leads" (paired with scale — cleaner list = less load + better deliverability).** Build a mechanism to flag leads that: (a) repeatedly fail (`unsubstituted_placeholder`, bounced email, undeliverable SMS), (b) have fictitious-looking details, (c) never engage. Surface them in a review list where the operator decides keep vs. delete. Today's Wave 1 produced **13 `unsubstituted_placeholder` failures across 7 leads** — exactly the seed of this list. Removing dead/fake leads directly shrinks every future blast.

## Constraints / context the Architect needs

- Multi-tenant SaaS: whatever is built must scale per-tenant and survive a 2nd/3rd tenant (Iron Rule 20 litmus). 10K may be one big tenant or several.
- Iron Rules 14/15 (tenant_id + RLS) on any new table (e.g. queue-archive, suspicious-leads). Iron Rule 19 (configurable values = tables, e.g. per-tenant daily send caps).
- Migration-git-drift: today's index was applied via MCP and is NOT yet in git migrations — the scale SPEC(s) must capture it + establish the migration-in-git discipline (there's an existing tech-debt item on this).
- This is multi-SPEC, cross-module work → Architect decomposes into a Master-Plan slice + sequenced SPECs for the Foreman/Executor pipeline. NOT a single Cowork action.

## Open question for Daniel (Architect to surface)

- Timeline confirmation: 10K "within coming months" → recommend starting the queue-lifecycle + rate-limiting SPECs now (they're the load-bearing two), deferring the email-vendor migration until volume justifies it. Architect to propose the sequencing + which slices are pre-10K-blocking vs. nice-to-have.

## Deliverable expected from the Architect

A Master-Plan entry + a sequenced list of SPECs (with the queue-lifecycle + vendor-aware rate-limiting first), each with success criteria, for the Foreman to author and the Executor to build. Plus a recommendation on timing (what must land before the first 10K campaign).
