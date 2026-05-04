# FINDINGS — RESTORE_DELETED_EVENT_UI

> **Location:** `modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Pre-v2 audit rows can only restore the event, not its attendees

- **Code:** `M4-INFO-RESTORE-01`
- **Severity:** INFO
- **Discovered during:** SPEC §3.6 backward-compatibility branch authoring + SPEC §3.24 verification
- **Location:** `restore_event_from_log` body (`supabase/migrations/20260505_add_restore_event_from_log_rpc.sql`), the `IF v_attendee_ids IS NULL OR jsonb_array_length(...) = 0` branch
- **Description:** Any `crm.event.delete` activity-log row that pre-dates commit `7f8117a` (i.e., was written by v1 of `soft_delete_event_if_empty`) does **not** carry `details->'attendee_ids'`. The new restore RPC handles this gracefully by restoring the event alone and tagging the response with `note: 'pre_v2_log_event_only'`. But the original attendees of those pre-v2 deletes will **not** be re-activated — their `is_deleted=true` rows will remain orphaned (no event link from a UI standpoint, since the event is back but its attendees are still deleted). Documented in SPEC §3.6 and §12 backward-compat test, so this is by design. Logging here so it is not forgotten.
- **Reproduction:**
  ```sql
  -- Pick a pre-v2 delete-log row
  SELECT id, details FROM activity_log
   WHERE tenant_id='8d8cfa7e-...'
     AND action='crm.event.delete'
     AND created_at < '2026-05-04 22:00:00'  -- before commit 7f8117a deployed
   ORDER BY created_at DESC LIMIT 1;
  -- Call the restore RPC with that log_id -> attendee_ids missing -> event-only restore
  ```
- **Expected vs Actual:** Both as designed.
- **Suggested next action:** DISMISS (already documented in SPEC §3.6, §3.24, §12, and §13).
- **Rationale for action:** SPEC explicitly documents this limitation; data-recovery for pre-v2 logs is out of scope for this SPEC. Daniel's call. If a future product decision requires reviving a pre-v2 deleted event's attendees, that becomes a one-off SQL fix per case — there is no general pattern that recovers attendee→event mapping after the fact.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `restore_event_from_log` returns `event_not_found` when log row's tenant matches but the event row was hard-deleted later

- **Code:** `M4-INFO-RESTORE-02`
- **Severity:** INFO
- **Discovered during:** authoring the `event_not_found` branch in step 2 of `restore_event_from_log`
- **Location:** `restore_event_from_log` body, the `IF v_event_tenant IS NULL` branch
- **Description:** SPEC §3.2 expects `error:'invalid_log_id'` for a log row that fails any of its 4 validity checks (existence + tenant + action + entity_type). SPEC §3.5 expects `error:'event_not_found'` for the case where the **event row itself** is missing — e.g., if a delete log row was written legitimately, but later someone (admin via SQL) hard-deleted the `crm_events` row, the log row's `entity_id` is now a dangling reference. The RPC correctly returns `event_not_found` in that case, and the JS handler shows the toast `'האירוע נמחק לצמיתות ואינו ניתן לשחזור'`. This is structurally fine but worth noting: in production, no admin SQL has hard-deleted any event row, so this path is currently unreachable on demo or prizma. It exists only as a future-proof safety net.
- **Reproduction:** N/A in normal use. Could be triggered with `DELETE FROM crm_events WHERE id='<some-event-with-existing-delete-log>'` (admin SQL only — never via the UI).
- **Expected vs Actual:** Matches SPEC §3.5.
- **Suggested next action:** DISMISS.
- **Rationale for action:** SPEC explicitly handled this case. No action required; included for completeness of audit trail.
- **Foreman override (filled by Foreman in review):** { }

---
