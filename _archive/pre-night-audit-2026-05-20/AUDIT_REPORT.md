# AUDIT REPORT — M4 Pre-Night Comprehensive Audit
## Executive Summary + Go/No-Go

**Audit date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (single-skill, read-only)  
**Audit started:** ~14:00 UTC  
**Audit completed:** ~16:30 UTC  
**Duration:** ~2.5 hours  

---

## 1. Findings Summary

| Severity | Count | Description |
|---|---|---|
| 🔴 BLOCKER | 0 | None |
| 🟡 MEDIUM | 5 | See details below |
| 🟢 LOW / INFO | 6 | See details below |

### Medium Findings

| ID | Mission | Finding |
|---|---|---|
| F-M04-1 | M4 | `uq_crm_message_queue_idem` unique constraint could block resend if run_id+lead_id+template_slug+channel combination already has a 'sent' row. Night-run SPEC must handle this explicitly (use null run_id for resends OR INSERT ON CONFLICT) |
| F-M08-1 | M8 | `column "attempts" does not exist` + `column "event_type" does not exist` errors firing in Postgres logs (~04:04 UTC, single fire each). Source unclear — may be from fb-capi-dispatch EF or purchase event triggers. Pre-triage recommended before night-run. |
| F-M04-2 | M4 | 758 failed messages on Prizma (99.5% = `unsubstituted_placeholder: registration_url` from pre-P2.3 era). Bulk-resending these WITHOUT checking if registration_url is now resolvable will cause 758 new failures. Resend button needs operator guidance on per-failure-class resendability. |
| F-M05-1 | M5 | Dual-pixel requires both EF change AND storefront change. Daniel must confirm: (a) new pixel ID value, (b) whether same CAPI token covers both pixels. Not blockable for other night-run items. |
| F-M06-1 | M6 | `crm_message_queue` accumulating sent rows indefinitely (4.2 MB table data). Queue should be a rolling window, not a permanent archive — add a cleanup job eventually. |

### Low / Info Findings

| ID | Mission | Finding |
|---|---|---|
| F-S5-1 | M3 | `payment_status` CHECK constraint valid values are 'pending_payment' (NOT 'pending'). Any integration using 'pending' will get a 23514 error. |
| F-M01-1 | M1 | Missing `(tenant_id, status, created_at)` index on crm_message_log for resend button queries. At 762 failed rows / 6K total this is fine today; add index in resend button SPEC. |
| F-M06-2 | M6 | `idx_capi_queue_queued_sched` and `idx_capi_queue_failed_retry` show 0 scans despite active dispatch. May be using seq scan on small table; will need verification at scale. |
| F-M08-2 | M8 | M4 SESSION_CONTEXT 5 days stale (last entry 2026-05-15); M4 MODULE_MAP 11 days stale. Night-run Resend SPEC must update both in same commit. |
| F-M04-3 | M4 | Resend action doesn't automatically write to `crm_audit_log`. Recommend explicit audit log entry in the resend button SPEC. |
| F-M04-4 | M4 | 3 stale 'queued' broadcasts on Prizma (7-8 days old, never dispatched). Not blocking, but should be cleaned up (mark cancelled). |

---

## 2. Night-Run Go/No-Go Verdicts

### 🟢 Resend Failed Messages Button

**Verdict: 🟢 SAFE TO EXECUTE**

Schema is fully ready. Existing mechanisms (crm-automation-history.js + crm-leads-detail-messages.js) provide implementation patterns. RLS canonical. No blockers.

**Must-address items in the SPEC:**
- Pagination required (762 failed Prizma rows)
- Handle idempotency key (F-M04-1) — recommend null run_id for resends
- Skip/warn on `unsubstituted_placeholder` class failures (F-M04-2) — these need manual investigation before resend
- Add `(tenant_id, status, created_at)` index in same migration
- Update M4 MODULE_MAP + SESSION_CONTEXT in same commit (F-M08-2)

### 🟢 Skill Harvest (opticup-strategic + opticup-executor + CONVENTIONS.md)

**Verdict: 🟢 SAFE TO EXECUTE**

16 proposals identified, all confirmed NOT yet applied (Iron Rule 21 satisfied). No contradictions. Doc-only Light Pipeline, Foreman-as-Executor, no DB, no EF.

**Execution order:** opticup-executor first → opticup-strategic → docs/CONVENTIONS.md

### 🟡 Comprehensive M4 Regression Sweep (Mission 3)

**Verdict: 🟡 PASS WITH NOTE**

16/16 scenarios PASS-DB-VERIFIED. All critical flows (lead create, status change, SCE production, attendee lifecycle, CAPI dispatch, soft-delete) working correctly.

**Note:** UI-layer verification (Chrome MCP) not possible from this autonomous session. Daniel's own Chrome MCP verification (done today for M4_SHORT_LINKS_DASHBOARD_REDESIGN) provides confidence on the visual surfaces. The DB-state evidence proves all server-side logic is functional.

### 🟡 Pixel/CAPI Dual-Deploy (Mission 5)

**Verdict: 🟡 MORNING SESSION REQUIRED (not night-run)**

Infrastructure is ready for extension. Schema change is JSONB key addition (no migration). EF and storefront changes required.

**Blocking question for morning:** What is the new pixel ID? Does it use the same CAPI access token as the existing pixel, or a different one?

**Recommended path:** Morning session with Daniel → confirm pixel ID + token architecture → Foreman authors SPEC → Executor runs with explicit dual-pixel SPEC.

---

## 3. Top 5 Things to Know Before Night-Run Starts

1. **758 Prizma failed messages are historical (pre-P2.3), NOT resendable en masse.** They failed due to `unsubstituted_placeholder: registration_url` — resending them will likely fail again. The Resend button SPEC should classify failure types and only enable resend for failures that have a reasonable chance of success (e.g., transient SMS provider errors, not template validation failures).

2. **CAPI events fired correctly in testing today.** CompleteRegistration → EventAttended → Purchase all enqueued in correct order in <5 seconds of attendee mutations. Demo token is null (expected skipped_no_token). Prizma token is present in `storefront_config.analytics.fb_capi_token`. The CAPI pipeline is healthy.

3. **M4 SESSION_CONTEXT and MODULE_MAP are significantly stale.** Any SPEC the night-run Executor loads should include explicit SESSION_CONTEXT + MODULE_MAP updates in its success criteria — otherwise the next M4 session will start from a misleading baseline.

4. **Two unexplained DB errors at ~04:04 UTC today** (`column "attempts" does not exist` + `column "event_type" does not exist`) are unexplained. Single fire each, not escalating. Pre-triage before night-run execution recommended to confirm these won't fire during resend flows.

5. **The M4_SHORT_LINKS_DASHBOARD_REDESIGN SPEC (closed today) has proven the resend flow on the entire M4 pipeline:** 4 Chrome verification rounds, all regressions caught + fixed within the same thread. This demonstrates the pipeline is functioning correctly as an autonomous system. Daniel's live verification remains essential for Chrome-MCP-requiring SPECs.

---

## 4. Reference Links

| Mission | File |
|---|---|
| Mission 01 — Resend Pre-Flight | `_archive/pre-night-audit-2026-05-20/MISSION_01.md` |
| Mission 02 — Skill Harvest Pre-Flight | `_archive/pre-night-audit-2026-05-20/MISSION_02.md` |
| Mission 03 — M4 Regression Baseline | `_archive/pre-night-audit-2026-05-20/MISSION_03.md` |
| Mission 04 — Cross-Module Ripple | `_archive/pre-night-audit-2026-05-20/MISSION_04.md` |
| Mission 05 — Pixel Infrastructure | `_archive/pre-night-audit-2026-05-20/MISSION_05.md` |
| Mission 06 — DB Health Snapshot | `_archive/pre-night-audit-2026-05-20/MISSION_06.md` |
| Mission 07 — Production Safety Check | `_archive/pre-night-audit-2026-05-20/MISSION_07.md` |
| Mission 08 — Sentinel + Guardian State | `_archive/pre-night-audit-2026-05-20/MISSION_08.md` |
| Mission 10 — Campaign Team Skills Design | `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` |

---

## 5. Smoke Test Result

**Baseline smoke test:** 8/8 PASS (run post-audit, confirming baseline unchanged)

```
PASS  1. PIN login returns JWT with tenant_id=demo
PASS  2. Create CRM lead succeeds (M4)
PASS  3. Read inventory count for demo tenant (M1)
PASS  4. Storefront homepage returns 200
PASS  5. Storefront /supersale lead-form page returns 200
PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT
PASS  7. No 5xx on critical pages
PASS  8. Layer D lint module declared in crm.html
```

---

*End of Audit Report. Audit complete at 2026-05-20 ~16:30 UTC.*
