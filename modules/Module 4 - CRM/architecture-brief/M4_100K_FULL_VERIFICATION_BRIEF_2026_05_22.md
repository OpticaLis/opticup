# M4 100K Full Verification Brief

> **Synthesized 2026-05-22 from Daniel's dispatch prompt.** Authored to canonical path; brief was not on disk at session start.

## Goal
The GATE before re-enabling automation rules on Prizma. Nothing gets re-enabled until this 100K verification pass is 🟢.

## Mode
**VERIFY-AND-MEASURE.** Fix inline ONLY a clear regression in already-shipped Sprint 1/2/3 work. Anything new → log as finding/SPEC, don't build now.

## Setup (demo only, zero real sends)
- **Daniel's 10K test leads** (`utm_campaign='M4_DANIEL_MANUAL_TEST_2026_05_21'`, phones `0500001000-0500010999`) — **DO NOT touch.**
- Inject ~90,000 MORE under SEPARATE sentinel `M4_100K_VERIFY_2026_05_22`. Phones `0500011000+`, emails `@demo.opticalis.test`. Total → 100K.
- Seed dozens of events + ~1,000 attendees on one event.
- Freeze dispatch: disable all active automation rules. Zero real sends throughout.

## Three matrices to verify

### A. Every screen + tab-switch
- Load time + freeze? + numbers CORRECT vs server-side SQL cross-check (the 1000-row-cap bug class).
- Dashboard counts, leads board + bulk-approve, events + the 1,000-attendee event-day screens.
- Messaging (log/queue/broadcast/performance with correct counts + dates).
- Campaigns (CPL correct).
- Short-links create/edit/delete.
- Tab-switching latency between every pair (Daniel's original symptom).

### B. Every message type composes correctly + resolver returns right audience at scale without hanging.

### C. Every automation type + operational flow end-to-end
- SCE → consumer → engine → queue → dispatch chain + chaining.
- Register / waitlist / capacity / checkin / move / cancel / delete-restore / broadcast / coupon / short-link / FB-CAPI.
- Re-verify the status-change → window flow at 100K: opens **<10s**, exact-count enqueue, zero duplicates.

## Deliverable
`modules/Module 4 - CRM/architecture-brief/M4_100K_VERIFICATION_REPORT_2026_05_22.md` with:
- Exec summary: overall PASS/FAIL + explicit answer "is it safe to open everything on Prizma?"
- 3 matrix tables (with SQL cross-checks).
- Any failures + root cause + regression-or-new classification.
- Chrome MCP screenshots of heaviest screens at 100K.

## Destructive Operations (declared upfront per IR32)
1. UPDATE on `crm_automation_rules.is_active`: flip 2 demo rules from true → false at session start; flip back at session close (net zero).
2. DML mass-INSERT on `crm_leads` for demo (~90,000 rows; sentinel `M4_100K_VERIFY_2026_05_22`; phones `0500011000-0500100999`).
3. DML mass-INSERT on `crm_events` for demo (~30 sentinel-named rows for matrix A's "dozens of events" target).
4. DML mass-INSERT on `crm_event_attendees` for demo (~1,000 on one sentinel event for the headliner test).
5. DML mass-DELETE at teardown (only after Daniel confirms) — tenant + sentinel scoped to `M4_100K_VERIFY_2026_05_22` only. **Daniel's 10K (`M4_DANIEL_MANUAL_TEST_2026_05_21`) NEVER touched.**

NONE of: Prizma writes / merge to main / EF redeploy / migration on schema / `--no-verify` / unscoped DELETE.
