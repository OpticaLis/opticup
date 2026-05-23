# M4 CRM — Full Audit Brief

> **Synthesized 2026-05-21 from the user's audit dispatch prompt.** The brief file
> was requested at this canonical path but wasn't on disk at audit start; this
> document captures the scope + acceptance bar so the findings doc has a
> matching input artifact in the SPEC folder convention.

## Goal (the bar)
The most professional CRM possible — never freezes at **100,000 leads, dozens of
events, 1,000 registrants per event, tens of thousands of messages at once**.

Today's visible symptom: **screens freeze when switching between them.**
Characterize that, but audit broader.

## Mode
**DIAGNOSE-ONLY.** The deliverable is a findings report, NOT code changes. Every
fix becomes its own focused SPEC afterward, triaged with Daniel.

## Three parts, all read/measure-only

### Part A — Architecture & cleanliness review
Across all `modules/crm/*.js` (~73 files) + `crm.html` + the 10 M4 Edge Functions.

Check against the Iron Rules:
- **R21** duplication / orphans
- **R7** raw `sb.from(` bypassing the `DB.*` wrapper
- **R14/15/22** tenant-isolation / RLS / defense-in-depth
- **R12** file-size + single-responsibility
- **R9** hardcoded business values
- **N+1 / eager-load-everything patterns** — siblings of the dispatch-preview
  hang — across EVERY screen (not just dispatch). This is the headline architecture
  finding category.

### Part B — 100K-lead performance audit
Inject ~100,000 synthetic leads + dozens of events + ~1,000 attendees on one
event into **DEMO ONLY** (scale the existing inject script):
- Phones allowlist-disjoint (`05000NNNNNN` range).
- Emails `@demo.opticalis.test`.
- Sentinel `utm_campaign='M4_FULL_AUDIT_LOAD_TEST_2026_05_21'`.
- Dispatch frozen (rules disabled / cron paused) — zero real sends.

Then measure load + tab-switch latency on EVERY screen via Chrome MCP on
localhost demo. Flag anything that freezes or exceeds ~1–2s. **Tab-switching
latency is the headline metric.**

### Part C — Flow coverage walk on demo
Exercise every message type, every automation type (full SCE → consumer → engine
→ queue → dispatch chain + chaining), and every operational flow:
register / waitlist / capacity / checkin / move (paid/unpaid) / cancel /
delete+restore event / broadcast / coupon / short-link / FB CAPI.

Mark each: works / broken / degraded.

## Deliverable
Write `modules/Module 4 - CRM/architecture-brief/M4_FULL_AUDIT_FINDINGS_2026_05_21.md`
containing:
1. Executive summary.
2. Top-5 risks to the 100K goal.
3. Part A / B / C findings tables. Severity (CRIT/HIGH/MED/LOW/INFO) AND
   **real-world-impact classification** — be honest about what's theoretical vs
   measurable.
4. Proposed backlog of small, focused, sequenced fix-SPECs for Daniel to triage.

## Rails (non-negotiable)
- **Diagnose only.** No code changes, no migrations, no EF redeploys, no fixes
  during this run. (Future SPECs handle the fixes.)
- **Prizma is READ-ONLY.** Measure only, zero writes.
- **All load injection on demo only.** Sentinel-marked. Tear down at end.
- **IR32:** declare the demo inject + teardown destructive ops upfront.
- **IR31:** integrity gate exit 0 throughout.
- Confirm demo restored to baseline before report close.
- Report back in plain Hebrew: overall verdict, top risks, proposed
  fix-SPEC backlog.

## Baseline pinned at audit start (2026-05-21)

| Metric | Demo | Prizma |
|---|---|---|
| `crm_leads` | 28 | 1,343 |
| `crm_events` (non-deleted) | 25 | 5 |
| `crm_event_attendees` (non-deleted) | 9 | 250 |
| `crm_message_queue` | 133 | 18,204 |
| `crm_message_log` | 509 | 8,395 |
| `crm_status_change_events` | 234 | (not measured) |
| `crm_automation_rules` (is_active=true) | 2 | (not measured) |
| `crm_lead_touchpoints` | 40 | (not measured) |
| `short_links` | 826 | (not measured) |

These are the restore targets at audit close.

## Destructive Operations (declared upfront per IR32)

1. DML mass-INSERT on `crm_leads` for demo (~100,000 rows; sentinel-bound).
2. DML mass-INSERT on `crm_events` for demo (dozens; sentinel-bound on `name` LIKE 'AUDIT_LOAD_TEST_%').
3. DML mass-INSERT on `crm_event_attendees` for demo (~1,000 on one of the audit events).
4. DML mass-DELETE on the same demo rows at teardown (tenant-scoped + sentinel-bound).
5. UPDATE on `crm_automation_rules.is_active` to flip 2 demo rules off if they're on at audit start; pre/post net zero.

NONE of: DROP / TRUNCATE / `--no-verify` / mass-delete without tenant scope / any
Prizma writes / any merge to main / any EF redeploy.
