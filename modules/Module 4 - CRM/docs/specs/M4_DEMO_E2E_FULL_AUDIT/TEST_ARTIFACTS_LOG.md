# Test Artifacts Log — M4_DEMO_E2E_FULL_AUDIT Pipeline

**Run window:** 2026-05-11 19:46-19:55 UTC
**Demo tenant:** `8d8cfa7e-ef58-49af-9702-a862d459cccb`

This log lists every row INSERTED or UPDATEd by this Pipeline as a test artifact. Cleanup at end of run is mandatory per Brief §2.

---

## Events created by this Pipeline

| id | event_number | name | created_at | final_state |
|---|---|---|---|---|
| `39148c4d-5213-42bb-a0fe-6e818ee5ff12` | 24 | M4_DEMO_E2E_AUDIT — FIX VERIFICATION (test artifact) | 2026-05-11 19:51:28 UTC | **soft-deleted** (is_deleted=true) at 19:55:23 UTC |

## Leads created by this Pipeline

**None.** Pipeline used the existing whitelisted lead `152e6188-2af6-413e-86b1-a44f15e71e66` (דניאל טסט) for fix verification — that lead was not created or modified by this run.

## Attendees created by this Pipeline

**None.** Bug §3 fix means evaluate-mode runs do NOT create attendee rows. Verified post-run: `SELECT count(*) FROM crm_event_attendees WHERE event_id='39148c4d…'` → 0.

## Other UPDATEs by this Pipeline (non-test, intentional fix)

| Table | Row id | Operation | Reason |
|---|---|---|---|
| `crm_automation_rules` | `a06be5d8-4dd6-43fa-bb53-b0e3be07a548` | UPDATE action_config | Bug §3 fix (Brief §3, SPEC §3 criterion 2) |
| `crm_automation_rules` | `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` | UPDATE action_config | Bug §3 fix (Brief §3, SPEC §3 criterion 3) |

Rollback SQL in `PRE_FIX_RULE_SNAPSHOT.json`.

## Side-effects to other tables — confirmed NONE

- `activity_log` — 0 new entries from this Pipeline's writes (the rule UPDATEs are admin-level, not logged via the trigger paths)
- `crm_automation_runs` — 1 entry created: `41c5528d-5c53-4880-a798-bdbbcb7f69f2` from the evaluate-mode test call (no actual message dispatched; status will be 'evaluated' or similar)
- `crm_event_attendees` — 0 new rows created on the test event (Bug §3.2 fix verified)
- `crm_leads` — 0 inserts, 0 updates
- `crm_message_templates` — untouched

## Pre-existing rows NOT touched (per Brief §2)

| id | Reason |
|---|---|
| `278114b7-0632-4bfa-bef8-df0cf6bccd15` (attendee on event 95ff8ba7) | Pre-existing phantom from Daniel's own pre-fix manual test. Brief §2 forbids deleting pre-test demo data. Daniel may soft-delete in morning. |
| `81d7142a-981d-465c-a8ff-795b437e7ad7` (attendee on event 95ff8ba7) | Daniel's real test registration. Untouched. |
| Event `95ff8ba7` (אירוע טסט 5) | Daniel's screenshot reference event. Untouched. |
| All other pre-existing demo leads, events, rules, templates, allowlists | Untouched. |
