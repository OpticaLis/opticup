# Step 5 (§3.2) — Pre/Post-state Snapshot

**SPEC:** `M4_WAITLIST_SYNC_PRIORITY_FIX`
**Date:** 2026-05-14 (server time 2026-05-13 ~12:27 UTC)
**Action:** Per-lead call to `sync_lead_status_from_attendee` for every
Prizma lead carrying a `waiting_list` attendee row (regardless of event
status). Sync mechanism uses the §3.1-patched RPC body (waitlist precedence).
**Scope:** Prizma only — Brief §3.2 wording is explicitly Prizma-scoped.

## Pre-Sync state (8 leads)

Captured in the same CTE as the sync call so timing is atomic relative to
each row's RPC invocation.

| lead_id | tenant | pre_status | sync.updated | sync.new_status | post (re-read) |
|---------|--------|-----------|--------------|-----------------|----------------|
| 05143c0a-3f83-41e4-becd-25822f8d86e6 | prizma | invited | true  | waiting | waiting |
| 301c641c-6241-427b-800c-ec97f7daaaf0 | prizma | invited | true  | waiting | waiting |
| 6e65daed-a790-4f67-93b9-a02a909f007c | prizma | invited | true  | waiting | waiting |
| 71d7aa2b-fb52-4dff-93d0-087c6feda933 | prizma | invited | true  | waiting | waiting |
| 95a258a5-5642-411f-8146-ce4b0b2a1b58 | prizma | invited | true  | waiting | waiting |
| ad1a884b-f7b4-4b92-923a-0d17cf41362a | prizma | invited | true  | waiting | waiting |
| bf82a4b5-043e-47af-8574-0a0478e75890 | prizma | invited | true  | waiting | waiting |
| b46fb48a-3017-4750-8179-f14bc0b2548e | prizma | waiting | false | waiting | waiting |

**Total sync calls:** 8 (well under the SPEC §5 stop-trigger #3 cap of 30).
**Updates produced:** 7 (`invited` → `waiting`). 1 no-op (already `waiting`
from §3.4 — overlap lead).

## Why these 8 went to `waiting`, not `waitlist`

Per Brief §3.1 the new priority CASE applies only when the candidate
attendee row is on a non-`completed`/non-`cancelled` event. All 8 of these
leads' only `waiting_list` attendee row is on the completed March 2026
event ("אירוע המותגים מרץ 2026"), so it is excluded from the candidate
set inside the sync function — sync falls through to the `ELSE 'waiting'`
default. This matches Brief §3.2's acceptance criterion (mechanical
behavior; the 8 leads stop showing as `invited` on the stale March event
and instead show as ready for the next event).

## Demo lead documented but NOT synced this run

The pre-sync survey also surfaced one demo lead with a `waiting_list`
attendee row — `efc0bd54-c6ed-4430-9552-018935a7ebbc` (status pre-sync
= `confirmed_verified`). This is the "P55 Daniel Secondary" test row
flagged in the investigation §6 #6.

Brief §3.2 specifies Prizma scope, so this demo lead is NOT included in
this run. Calling sync on it would correctly flip it to `waitlist` under
the new priority logic (its waiting_list attendee is on a non-closed
event), which is the right outcome — Daniel can run the sync RPC on it
manually for QA confirmation if desired. See FINDINGS.md.

## Verification (Criterion #13)

```sql
SELECT
  (SELECT COUNT(*) FROM crm_leads WHERE tenant_id=PRIZMA AND is_deleted=false AND status='waitlist')        AS waitlist_leads,           -- 0
  (SELECT COUNT(DISTINCT a.lead_id) FROM crm_event_attendees a JOIN crm_events e ON e.id=a.event_id AND e.tenant_id=a.tenant_id
    WHERE a.tenant_id=PRIZMA AND a.is_deleted=false AND a.status='waiting_list'
      AND e.status NOT IN ('completed','cancelled') AND e.is_deleted=false)                                 AS active_waitlist_attendees,-- 0
  (waitlist_leads = active_waitlist_attendees)                                                              AS criterion_13_equal;       -- true
```

Result: `waitlist_leads=0, active_waitlist_attendees=0, equal=true` ✓
