# SPEC — M4_EVENT_24_LEAD_FUNNEL_DIAGNOSTIC

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_EVENT_24_LEAD_FUNNEL_DIAGNOSTIC/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Repo:** `opticup` (read-only diagnostic; no code change)
> **Mode:** PURE DIAGNOSTIC — NO FIXES. NO WRITES. NO DEPLOYS.

---

## 1. Goal

Produce a thorough, evidence-based diagnostic report explaining why event #24 (אירוע המותגים — מאי 2026, ID `a7c9f174-a099-48b7-88bb-e4d0fa6236e2`) received only ~12 registered attendees despite 189 new leads entering the system between 2026-05-03 and 2026-05-14. 154 of those leads are in `crm_leads.status='invited'` but have no `crm_event_attendees` row — that's the funnel gap to explain.

Output: a single Markdown report at `modules/Module 4 - CRM/docs/specs/M4_EVENT_24_LEAD_FUNNEL_DIAGNOSTIC/DIAGNOSTIC_REPORT.md` with measured facts + ranked hypotheses + a recommended fix plan (recommended, NOT executed in this SPEC).

---

## 2. Background & Motivation

Daniel observed 2026-05-14 that event #24 closed with only 12 attendees vs. baseline 56-90 for events 20/22/23. He has already closed the event (`status='closed'`) intentionally — the goal is NOT to reopen registration but to understand WHY the funnel dropped 4-7x so it doesn't repeat for the rescheduled event.

Pre-flight queries (2026-05-14, Foreman):
- `crm_leads` (prizma, created_at >= 2026-05-03): 189 leads total. 154 `invited` | 18 `new` | 8 `unsubscribed` | 4 `confirmed` | 4 `waiting` | 1 `pending_terms`.
- `crm_event_attendees` for event 24: 12 total (0 demo). 10 `registered` + 3 `invited`, all `registration_method='form'`.
- Comparison: events 20/22/23 had 56/90/73 attendees respectively.

**The funnel gap:** 154 leads marked `invited` in `crm_leads`, but only 13 rows in `crm_event_attendees` for event 24 created after 2026-05-03 (and 3 of those are status `invited`, 10 are `registered`). The numbers don't reconcile.

**Two competing explanations:**
- (a) The 154 `invited` leads were marked invited but the EF failed to create attendees (RPC/code bug).
- (b) The 154 leads were `invited` to a different event (maybe a `draft` or `closed` event), or to an event from another source (Make scenario, manual import, etc.).

This SPEC will determine which.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify method |
|---|-----------|---------------|---------------|
| 1 | Read-only mode confirmed | 0 writes to any table; 0 commits; 0 deploys; 1 commit at end with just the report doc | `git log` |
| 2 | Lead-to-attendee reconciliation | For each `invited` lead in window: report whether the lead has a matching `crm_event_attendees` row (any event, any status). Counts: leads_with_attendee / leads_without_attendee | SQL query |
| 3 | Per-event attendee count for the window | List ALL `crm_events` (active or not) for prizma + how many `crm_event_attendees` rows were created in each between 2026-05-03 and 2026-05-14 | SQL |
| 4 | Timeline of event-24 status changes | When did event 24 transition `draft → published → closed`? Find via `audit_log` (if exists) or `updated_at` timestamps | SQL |
| 5 | "Active event" logic check | Read `dispatchFreshLead()` in `supabase/functions/lead-intake/dispatch.ts`. Quote VERBATIM the predicate that picks the "active event" for a new lead. Identify edge cases where it would return no event or the wrong event. | Code read |
| 6 | RPC trace | If there's a function like `register_lead_to_event` or `assign_lead_to_active_event`, read its definition. Quote the predicate. | DB query on `pg_proc` + code |
| 7 | Make scenario hypothesis | Are there any Make webhook callbacks that ALSO create attendee rows? Check by grepping `crm_event_attendees` INSERT operations in any code path. | Code grep + EF inventory |
| 8 | Sample 5 specific cases | Pick 5 `invited` leads with NO matching attendee. Report for each: phone, created_at, source (utm_source), lead.status, lead.tenant_id. Look up the corresponding entry in `crm_automation_runs` and `crm_message_log`. Did a message even get sent? | SQL joins |
| 9 | Ranked hypothesis list | At least 3 hypotheses ranked by likelihood, each with: prediction (what we'd see if true), confirming evidence, disconfirming evidence | Report |
| 10 | Recommended fix plan | For the TOP hypothesis: what SPEC would fix it, what's the rollback risk, how to verify the fix on a single demo lead before production rollout | Report |
| 11 | Output report | `DIAGNOSTIC_REPORT.md` exists in the SPEC folder | `ls` |
| 12 | Single commit | 1 ERP commit with the report file only | `git log` |

---

## 4. Autonomy Envelope

### Can do without asking
- Read any file in `opticup` and `opticup-storefront`
- Run any Level 1 (read-only) SQL via Supabase MCP `execute_sql`
- Read deployed Edge Function code via Supabase MCP `get_edge_function`
- Run `grep` / `git log` for code archaeology
- Read `crm_automation_runs`, `crm_message_log`, `audit_log`, `pg_proc` definitions
- Write the diagnostic report to the SPEC folder
- Commit + push the report to ERP `develop`

### Requires stopping and reporting
- ANY write to ANY database table — NEVER. This is diagnostic only.
- ANY change to ANY Edge Function code — out of scope.
- ANY change outside the SPEC folder (no HANDOFF updates yet; those happen in the follow-up fix SPEC)
- ANY merge to `main` — Daniel-only

---

## 5. Stop-on-Deviation Triggers

- If the reconciliation in Criterion 2 finds <50% of `invited` leads have an attendee row → confirm by SAMPLING 10 random leads BEFORE writing the report (avoid wrong-population artifacts)
- If `audit_log` doesn't exist for tracking event-24 status changes → use `crm_events.updated_at` and the message log as a proxy, document the limitation
- If `dispatchFreshLead()` doesn't exist at the cited path → STOP and report (the EF may have been refactored)
- If finding 5 specific cases produces messages that DID send (and the lead is `invited` correctly) → the bug shifted: it's about attendee row creation, not about message dispatch. Pivot the report accordingly.

---

## 6. Rollback Plan

Not applicable — read-only diagnostic. To "undo" this SPEC: `git revert {COMMIT_HASH}` to remove the report file. Zero state-change anywhere else.

---

## 7. Destructive Operations

**None.** This SPEC is pure read-only diagnostic.

Executor MUST NOT perform any UPDATE, INSERT, DELETE, DDL, deploy, force-push, or main-branch modification. If ANY hypothesis evaluation tempts the executor to "just try a fix" — STOP and escalate. The fix lives in a follow-up SPEC after this report is read by Daniel + Foreman.

---

## 8. Out of Scope

- Fixing the bug — out. Diagnostic only.
- Re-opening event 24 — Daniel intentionally closed it.
- Bulk-creating missing attendee rows — out.
- Sending "you missed it" messages to the 140+ orphan leads — out.
- The full Module 3 / Site Overseer audit Daniel mentioned (4-layer pixel/funnel maturity work) — separate SPEC, after this diagnostic closes.
- The Facebook pixel/ads side of the funnel — out for this diagnostic; the question here is purely "lead in DB → attendee row created".

---

## 9. Expected Final State

### New files in this SPEC folder
- `DIAGNOSTIC_REPORT.md` — the main deliverable
- `EXECUTION_REPORT.md` — standard executor retrospective
- `FINDINGS.md` — standard, if any meta-findings emerge

### DB state
**Unchanged.** Zero writes.

### Docs updated (ERP repo)
- Only files inside this SPEC folder. NO HANDOFF / DECISIONS_LOG / GLOBAL_MAP changes — those happen when the follow-up fix SPEC closes.

---

## 10. Commit Plan

**Single ERP commit:**
- Files: `DIAGNOSTIC_REPORT.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` (if any)
- Message:
  ```
  docs(crm): diagnostic report for event 24 attendee shortfall

  Read-only investigation: 154 leads marked invited but only ~13
  attendee rows created. Report enumerates hypotheses, ranks by
  evidence, and recommends a single follow-up fix SPEC.

  Refs: SPEC M4_EVENT_24_LEAD_FUNNEL_DIAGNOSTIC
  ```
- Push to `origin develop`. No PR to main (diagnostic doc only).

---

## 11. Dependencies / Preconditions

- ERP repo on `develop`, scope-clean
- Supabase MCP access (Level 1 read-only)
- `gh` pre-flight checked but not strictly required (no PR for this SPEC)

---

## 12. Lessons Already Incorporated

- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Author Proposal 1 — explicit Destructive Operations. APPLIED in §7.
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Author Proposal 2 — Protocol artifacts split. APPLIED in §9.
- L-PROJECT-002 — N/A (no writes).
- L-SITE-002 — N/A (CRM not site).
- Read-only-first principle (every diagnostic SPEC since M3_SITE_COMPREHENSIVE_REVIEW) — APPLIED throughout.

**Cross-Reference Check (Rule 21):** No new symbols. Sweep N/A.

---

*End of SPEC.*
