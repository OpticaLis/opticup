# FINDINGS — M4_BROADCAST_ID_PROPAGATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-14

This file lists items discovered during execution that are NOT in the SPEC's scope but are real observations worth recording. Each entry has severity, location, description, and suggested next action.

---

## FIND-1 — Historical broadcasts (2026-05-12 → 2026-05-14) remain unattributed (INFO, by-design)

**Severity:** INFO
**Location:** `crm_broadcasts` rows on Prizma tenant `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` with `created_at` between 2026-05-12 (BROADCAST_QUEUE_INTEGRATION) and 2026-05-14 (this SPEC).
**Description:** Per the Foreman's D3 decision baked into the Brief and SPEC §7, NO backfill of historical broadcasts. Pre-2026-05-14 broadcasts will keep `total_sent=0` forever and their `crm_message_log` rows have `broadcast_id=NULL`. Any UI or report reading `crm_broadcasts` for a historical broadcast in this window will continue showing zero — but for broadcasts created 2026-05-14 onward, the data is accurate.
**Suggested next action:**
- **NO new SPEC.** This is the documented Option-X tradeoff: measurement, not heuristic.
- **Documentation pointer:** Phase 2.5 Funnel Health Dashboard SPEC (when authored) should filter charts to "broadcasts after 2026-05-14" for clean visualization. Reference KNOWLEDGE_MAP Layer 5 Gap #1 RESOLVED note.

---

## FIND-2 — `register_lead_to_event` 14th param is set up but no caller passes it yet (INFO, design-intent)

**Severity:** INFO
**Location:** `event-register` EF, `quick-register` EF, `crm-event-register.js` — all three live callers of `register_lead_to_event`.
**Description:** This SPEC added the 14th param `p_broadcast_id uuid DEFAULT NULL` to the RPC and threaded it into `_record_touchpoint` calls. But none of the 3 live callers currently know the broadcast_id at the point they invoke the RPC. For the X1-chain to extend into `event_register` touchpoints, the caller surface would need a way to obtain broadcast_id (e.g., resolve-link could append `?b=<id>` to the redirect target_url, and the storefront could forward it in form submissions). This is deliberately out-of-scope per SPEC §7 — keeping the cross-repo touch on storefront out of P1.2 — and the RPC slot is reserved for a future SPEC.
**Suggested next action:**
- **NEW SPEC stub:** `M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT` (~2 hrs) — wire broadcast_id through the storefront form submission flow:
  1. `resolve-link` EF appends `?b=<broadcast_id>` to the redirect Location when `short_links.broadcast_id IS NOT NULL`.
  2. Storefront `/event-register` page reads `b` from URL params, includes in POST body to `event-register` EF.
  3. `event-register` EF reads `body.broadcast_id`, passes as 14th positional to `register_lead_to_event`.
  4. Same for `quick-register` (QR flow — unlikely to carry broadcast_id since QR is staff-printed; mark NULL by default).
  5. ERP `crm-event-register.js` rarely runs in a broadcast-context (staff manually registering at the desk); mark NULL by default.
- **Defer until:** after P1.3 (`M3_SHORTGY_TO_INTERNAL_REDIRECT`) lands, since that SPEC touches the same storefront `/r/` redirect surface.

---

## FIND-3 — pg_cron job_run_details has 3 `UPDATE 0` runs before the first `UPDATE 1` (INFO, observability)

**Severity:** INFO
**Location:** `cron.job_run_details` for `crm_broadcast_total_sent_refresh`.
**Description:** The cron job ran 3 times before the first non-zero UPDATE: 15:48:00 (`UPDATE 0` — broadcast didn't exist yet), 15:49:00 (`UPDATE 0` — log row not yet created), 15:50:00 (`UPDATE 1` — first effective update). For a tenant with 0 active broadcasts at any given moment, the job will run every minute returning `UPDATE 0`. This is harmless idempotent behavior but it means `cron.job_run_details` accumulates noise for non-eventful runs. Postgres pg_cron retains run-details by default; over months this table can grow.
**Suggested next action:**
- **TECH_DEBT entry:** `INFRA-PG-CRON-RUN-DETAILS-RETENTION` — set `cron.job_run_details` retention policy (e.g., 7 days) via `cron.purge_run_history()` or a periodic cleanup job. Not urgent — at current 5 active jobs × 1440 mins/day = 7200 rows/day, the table grows ~50k rows/week before retention attention is warranted.
- **Optional optimization to this SPEC's cron body:** Add a pre-check `WHERE EXISTS (SELECT 1 FROM crm_broadcasts WHERE status IN ('queued','sending'))` so when no broadcast is active, the entire UPDATE is short-circuited and `UPDATE 0` returns instantly with no query work. This is a micro-optimization; the current direct-aggregate query is already <5ms per run.

---

## FIND-4 — `cron.job_run_details.jobname` column does NOT exist; JOIN to `cron.job` required (INFO, doc-gap)

**Severity:** INFO
**Location:** `cron.job_run_details` system table (pg_cron extension).
**Description:** First query attempt against `cron.job_run_details` selecting `jobname` failed with `column "jobname" does not exist`. The correct pattern requires JOIN to `cron.job` on `jobid`. Costing ~30 seconds during debugging. Documented in Executor Proposal #2 of the EXECUTION_REPORT for inclusion in the opticup-executor SKILL pattern reference.
**Suggested next action:**
- Already proposed for SKILL update — see EXECUTION_REPORT.md §9 Proposal 2.

---

## FIND-5 — `send-message/index.ts` at 333 lines (file-size warning, under hard cap) (INFO, scope-clean)

**Severity:** INFO
**Location:** `supabase/functions/send-message/index.ts`
**Description:** Pre-commit hook flagged the file at 333 lines (>300 soft target, <350 hard cap). The added `broadcast_id` field on 8 separate `crm_message_log` insert paths + payload extraction + threading to dispatch added ~12 lines. The file remains under the Iron Rule 12 hard cap (350). One responsibility (orchestration of send-message dispatch pipeline). No split warranted yet but the file is approaching the cap; next time a feature touches this file, consider extracting the early-exit log inserts into a small helper.
**Suggested next action:**
- **NO new SPEC.** Track informally. If a future SPEC adds another log-insert path, extract early-exit log inserts into `send-message/log-helpers.ts` (≤50 lines) and pull index.ts back down to ~290 lines.

---

## FIND-6 — Demo tenant has 9+1 = 10 broadcasts after this SPEC's test (INFO, demo data hygiene)

**Severity:** INFO
**Location:** `crm_broadcasts` on demo tenant.
**Description:** Pre-SPEC: 9 demo broadcasts. Post-SPEC: 10 (added `0a6cf29c-...` 'M4_BROADCAST_ID_PROPAGATION_demo_test' for Scenario C). The test broadcast + its queue + log + short_links + clicks + touchpoints are all traceable via `filter_criteria.source='M4_BROADCAST_ID_PROPAGATION_TEST'` tag for future cleanup.
**Suggested next action:**
- **NO new SPEC.** Demo tenant is not user-facing; 1 extra row is harmless.
- **Optional cleanup SQL** for the next M4 hygiene SPEC:
  ```sql
  DELETE FROM crm_lead_touchpoints WHERE broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';
  DELETE FROM short_link_clicks    WHERE broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';
  DELETE FROM short_links          WHERE broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';
  DELETE FROM crm_message_log      WHERE broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';
  DELETE FROM crm_message_queue    WHERE broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';
  DELETE FROM crm_broadcasts       WHERE id='0a6cf29c-ad44-4823-a551-119299e84d00';
  -- Also delete short_links M4P2DTST + its descendants (Scenario D test):
  DELETE FROM crm_lead_touchpoints WHERE short_link_code='M4P2DTST';
  DELETE FROM short_link_clicks    WHERE short_link_id='8b4e4b57-5e21-4b61-8911-438420489be1';
  DELETE FROM short_links          WHERE code='M4P2DTST';
  -- Also revoke the 2 demo attendees from Scenarios A + B:
  UPDATE crm_event_attendees SET is_deleted=true WHERE id IN ('cf2e0ded-2650-4c97-8895-bda4984161bf', '2fa23994-c043-45c3-9909-98e7c1b74d6a');
  ```

---

## Summary

| # | Severity | Description | Action |
|---|---|---|---|
| FIND-1 | INFO | Historical broadcast counter rot (by-design) | No new SPEC — Phase 2.5 dashboards filter |
| FIND-2 | INFO | 14th RPC param not yet wired from EF callers | New SPEC stub `M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT` (~2 hrs, defer post-P1.3) |
| FIND-3 | INFO | pg_cron job_run_details retention | TECH_DEBT entry `INFRA-PG-CRON-RUN-DETAILS-RETENTION` |
| FIND-4 | INFO | cron.job_run_details schema gotcha | Already in Executor Proposal #2 (apply to SKILL) |
| FIND-5 | INFO | send-message/index.ts approaching size cap | Track informally; extract helpers next time the file is touched |
| FIND-6 | INFO | Demo test data residue | Optional cleanup SQL in next M4 hygiene SPEC |

**Zero findings at MEDIUM/HIGH/CRITICAL severity.** All findings are forward-compat observations or platform-meta notes; none gate any consumer or block P1.3 / Phase 2.

---

*End of FINDINGS.md.*
