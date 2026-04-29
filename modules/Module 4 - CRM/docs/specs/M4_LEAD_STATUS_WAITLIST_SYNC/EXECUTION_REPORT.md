# EXECUTION_REPORT — M4_LEAD_STATUS_WAITLIST_SYNC

> **Status:** 🟢 CLOSED. Pure-DB micro-SPEC; no EF dependency.
> **Executed by:** opticup-executor 2026-04-28.

## 1. Pre-state baseline

- 11 lead statuses in crm_statuses (no 'waitlist').
- TIER2_STATUSES in crm-helpers.js: 6 entries (no 'waitlist').
- No sync_lead_status_from_attendee RPC.
- register_lead_to_event RPC has 4 hardcoded `crm_leads SET status='confirmed'` blocks.
- 10 attendee statuses in crm_statuses (no 'invited' slug).
- demo lead status breakdown: 6 leads — 1 pending_terms, 5 in various Tier-2 states.

## 2. Summary

Added `waitlist` lead status, created the sync RPC mapping attendee.status → lead.status, refactored `register_lead_to_event` to call sync at every existing lead-state-write site, wired the sync into Rung 2's `attendeeUpsert` post-action, and ran a backfill on demo. Discovered mid-execution that the attendee status enum is English slugs (not Hebrew), forcing a Rung 2 correction that landed in this same commit: 4 rule action_configs flipped from `'הוזמן'` → `'invited'`, and the `'invited'` slug was added to `crm_statuses.attendee`. `crm_event_attendees` has no `updated_at` column — removed from 2 upsert payloads.

## 3. What was done

| Commit | Hash | Files |
|--------|------|-------|
| 1. Apply | (this single commit) | DB SQL + crm-helpers.js + crm-automation-post-actions.js + crm-automation-recipient-resolvers.js + lead-intake/dispatch.ts + seed-automation-rules-demo.sql + applied.sql + register_lead_to_event-pre.sql |
| 2. Retro | (next commit) | EXECUTION_REPORT.md + FINDINGS.md |

Criteria 1-13 + #14 commit count: ALL PASS. Criterion #10 snapshot saved.

## 4. Deviations

### D1 — `crm_event_attendees.updated_at` does NOT exist

Trying to `ORDER BY a.updated_at DESC` in the sync RPC errored on first run. crm_event_attendees has state-specific timestamps (registered_at, confirmed_at, checked_in_at, purchased_at, paid_at, ...) but no general `updated_at`. Replaced ORDER BY with `COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC` — picks whichever transition timestamp is set. Also removed `updated_at` from 2 upsert sites (Rung 2 attendee_upsert + lead-intake/dispatch.ts) — those would have failed at runtime.

### D2 — Attendee status enum is English not Hebrew

Mid-execution discovery: `crm_event_attendees.status` uses English slugs (registered, waiting_list, confirmed, attended, ...) per `crm_statuses.attendee`. My Rung 2 rule action_configs used `'הוזמן'` (the Hebrew display name from name_he, not the slug). Fixed all 4 affected rules in this commit + added the 'invited' slug to crm_statuses.attendee on demo. This rolled into the micro-SPEC as Rung 2 carry-over rather than a separate commit since it was discovered while writing the sync RPC.

### D3 — Backfill mostly no-op on current demo state

5/6 leads landed at `waiting` (default), 1 at `pending_terms` (terminal-ish). The "default = waiting" branch in the sync RPC handles leads with no active attendee row — which is exactly the demo state today (no live event registrations). Real value of the sync RPC will surface as Rung 3 + Rung 1+2 EF-deploy-driven flows produce attendee rows.

## 5. Iron-Rule Self-Audit

Rule 12 (file size) ✅ all touched files ≤350. Rule 21 ✅ no name collisions; sync_lead_status_from_attendee unique. Rule 22 ✅ all queries scope by tenant_id. Rule 31 ✅ integrity gate clean. Other rules N/A.

## 6. Self-assessment

- Adherence to SPEC: 9/10 — followed §3 criteria + §10 snapshot + §11 lessons; D2 was an unexpected scope-add that made sense to land here.
- Adherence to Iron Rules: 10/10 — all applicable rules audited.
- Commit hygiene: 8/10 — bundled the Rung 2 correction with the micro-SPEC's primary commit since they shared the attendee-enum discovery; defensible but not tightest possible.
- Documentation currency: 8/10 — register_lead_to_event-pre.sql snapshot saved, applied.sql replay artifact saved. db-schema.sql still drifts (same axis as Rung 1 F2, Rung 2 F4).

## 7. Two proposals to improve opticup-executor

### Proposal 1 — Pre-flight column existence check before writing UPSERT payloads

**Where:** `.claude/skills/opticup-executor/SKILL.md` §Step 1.5 → add 1.5.9.

**Change:** "Before constructing any UPSERT/INSERT payload that includes a 'standard' column like `updated_at`, run `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1` once and verify the column exists. CRM tables are inconsistent: `crm_leads` has updated_at, `crm_event_attendees` doesn't. Assuming standard columns exist costs a transaction-rollback when the assumption is wrong."

### Proposal 2 — Hebrew vs English status convention check

**Where:** `.claude/skills/opticup-executor/SKILL.md` §Step 1.5 → add 1.5.10.

**Change:** "When a SPEC's success criteria reference status string values for a CRM table, before INSERT/UPDATE: `SELECT slug, name_he FROM crm_statuses WHERE entity_type=$1 AND tenant_id=$2`. The slug column holds the canonical (English) value used in DB writes; name_he is for UI display only. Mismatch produces silently-broken rules that pass linting but never fire."

---

*End of EXECUTION_REPORT — M4_LEAD_STATUS_WAITLIST_SYNC.*
