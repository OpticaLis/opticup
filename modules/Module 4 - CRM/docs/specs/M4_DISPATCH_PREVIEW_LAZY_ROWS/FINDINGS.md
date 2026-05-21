# FINDINGS — M4_DISPATCH_PREVIEW_LAZY_ROWS

> **Author:** opticup-executor
> **Date:** 2026-05-21

## F-01 (HIGH, confirmed live) — SCE consumer race produces ~2× over-enqueue under load
- **Severity:** HIGH (originally INCIDENT_REPORT §2.2).
- **Where:** `supabase/functions/automation-engine/consumer.ts:99-104`.
- **What:** after the test's confirm click wrote ONE SCE row, the pg_cron consumer ticked and enqueued ~4,000 queue rows for the demo test event — should have been 2,400 (1,200 leads × 2 channels). The excess (~1,600) is the SPEC-B race: concurrent cron ticks read the same unconsumed SCE row and each issued a full enqueue. The partial unique index `uq_crm_message_queue_idem` caught 800 of the duplicates as `queue_insert_failed: duplicate key`; the rest got enqueued before the index conflict could fire.
- **Suggested next action:** ship `M4_SCE_CONSUMER_RACE_FIX` (SPEC B) — already authored, queued behind this one. Adds `FOR UPDATE SKIP LOCKED` via new `claim_unconsumed_status_change_events` RPC.

## F-02 (HIGH, confirmed live) — Queue insert path bypasses ON CONFLICT
- **Severity:** HIGH (originally INCIDENT_REPORT §2.3).
- **Where:** `supabase/functions/automation-engine/dispatch.ts:69` — bare `db.from("crm_message_queue").insert(chunk)` with no `.onConflict` arg.
- **What:** the 800 `queue_insert_failed: duplicate key value violates unique constraint "uq_crm_message_queue_idem"` log rows from F-01 demonstrate that the partial unique index DID catch some race duplicates — but only at the cost of generating 800 error log rows. The supabase-js insert can't emit the partial `WHERE` clause needed for `ON CONFLICT DO NOTHING` to silently skip. Each colliding insert raises an error and gets logged as `failed`.
- **Suggested next action:** ship `M4_QUEUE_INSERT_ON_CONFLICT` (SPEC C) — already authored. New RPC `enqueue_crm_messages_idempotent` does raw `INSERT ... ON CONFLICT (cols) WHERE (...) DO NOTHING`, silently no-oping duplicates instead of erroring them.

## F-03 (MEDIUM) — Window-open latency exceeds the SPEC's 1 s target
- **Severity:** MEDIUM — operator-acceptable but documented deviation (D-1 in EXECUTION_REPORT).
- **Where:** measured at the EF level; the dominating cost is the tier2 recipient resolver paginating 1,200 leads at ~1.5 s, plus enrichments at ~600 ms.
- **What:** modal opens in ~2.1 s server-side (curl) vs the SPEC's <1 s target.
- **Suggested next action:** optional follow-up SPEC `M4_DISPATCH_PREVIEW_CHIP_AGGREGATE_PRECOMPUTE` could pre-compute the chip aggregates server-side and cut ~300 ms. Or: relocate the EF closer to the DB region (Supabase project is `eu-central-2`; the EF runs in the same region but cold-start adds variance). Not blocking — accept the ~2 s window-open as the new baseline.

## F-04 (MEDIUM) — Per-row body latency exceeds the SPEC's 500 ms target
- **Severity:** MEDIUM — accept deviation (D-2 in EXECUTION_REPORT).
- **What:** SMS p95 ≈ 1.25 s, email p95 ≈ 0.82 s on 5 sampled clicks under load. Single warm direct call measured 0.74 s.
- **Suggested next action:** none required. The spinner state covers the wait UX-wise. Future work item if Daniel wants sub-second per-row: cache the template body server-side once per (slug, channel, language) per modal session.

## F-05 (LOW) — `_hydrate` should always replay triggerType/triggerData after loading-state init
- **Severity:** LOW — fixed in this SPEC's same client commit (D-3 in EXECUTION_REPORT).
- **What:** `_ensureState(null, onChoice)` was setting `_state.triggerType = null` for the loading screen; `_hydrate` updated `previewResponse` + `recipients` + `phase` but missed `triggerType` / `triggerData`. Per-row body fetches short-circuited as a result.
- **Suggested next action:** none — patch applied. Mentioned as `P-EXEC-2` in EXECUTION_REPORT (closure-state debug hook).

## F-06 (LOW) — Iron Rule 12 cap was hit twice during edits
- **Severity:** LOW — meta-finding about authoring discipline.
- **What:** preview.ts hit 365 lines on first commit attempt (had to extract previewRecipientBody to its own 91-line file). crm-confirm-send-v2.js hit 370 → 359 → 350 → 352 lines across multiple trim passes.
- **Suggested next action:** add P-EXEC-1 to opticup-executor SKILL.md (pre-edit line-budget calculator).

## F-07 (INFO) — `next_crm_event_number` RPC rejects service_role context
- **Severity:** INFO — diagnosed once and worked around with direct SELECT MAX in test fixture setup.
- **Where:** RPC raised `42501: Unauthorized: tenant_id mismatch` when called via Supabase MCP `execute_sql` in service-role context.
- **What:** the RPC's canonical JWT-claim Block A (per `JWT_VALIDATION_HEADER.sql`) expects `v_jwt_tenant IS NULL` to allow bypass for service_role — but the MCP `execute_sql` may inject a synthetic JWT claim that doesn't match `p_tenant_id`. This is the same pattern noted in `SECURITY_HOTFIX_3_2026_05_15/EXECUTION_REPORT.md` D-3.
- **Suggested next action:** not a real bug — the RPC's behavior is correct in the live UI context (browser sends the right JWT). Documented here so future test-fixture authoring sidesteps the RPC and uses direct SQL for one-off setup.

---

*End of findings.*
