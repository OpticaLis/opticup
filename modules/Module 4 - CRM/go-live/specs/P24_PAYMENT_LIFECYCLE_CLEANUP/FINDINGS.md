# FINDINGS — P24_PAYMENT_LIFECYCLE_CLEANUP

> **Location:** `modules/Module 4 - CRM/go-live/specs/P24_PAYMENT_LIFECYCLE_CLEANUP/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Credit linkage lost during attendee move (Prizma row 3d031fe7)

- **Code:** `M4-DATA-P24-01`
- **Severity:** MEDIUM (data-integrity gap; affected the very row that triggered P24)
- **Discovered during:** Pre-flight DB scan (`SELECT … WHERE credit_used_for_attendee_id IS NOT NULL`) returned 0 rows project-wide, despite SPEC §2.5 documenting that attendee `3d031fe7-…` (T5 Canary on event #68376 V4 Edge concurrent B) had its `payment_status='paid'` set via `transfer_credit_to_new_attendee`. The credit-pointer chain that should link that row to its source `credit_pending` attendee does NOT exist in the live DB.
- **Location:** `crm_event_attendees.credit_used_for_attendee_id` — every row in the table is NULL despite the historical existence of credit transfers.
- **Description:** `transfer_credit_to_new_attendee` writes `credit_used_for_attendee_id = p_new_attendee_id` on the OLD (credit_pending) row. Some downstream process is clearing those pointers. The likely suspect is `move_attendee_between_events`, which copies `payment_status` + `paid_at` + `credit_expires_at` to a new row but does NOT carry `credit_used_for_attendee_id` forward (per current RPC body inspected pre-flight). When an attendee is moved to a different event after their credit_pending state was created, the new row is fresh and the old row may have been soft-cancelled — but the pointer would still be valid. So the cause is more subtle than a simple move; investigation needed.
- **Impact:** Daniel's screenshotted row would not have been backfilled by P24's pointer-based UPDATE. Per Daniel's directive (B-B option), the row was hand-flagged in the migration via an explicit UPDATE on the specific UUID. The P24 forward-compatible code (RPC update) ensures FUTURE credit transfers don't lose the link.
- **Reproduction:**
  ```sql
  -- 0 rows project-wide despite known historical credit transfers:
  SELECT id, payment_status, credit_used_for_attendee_id
    FROM crm_event_attendees
   WHERE credit_used_for_attendee_id IS NOT NULL;

  -- The row Daniel observed: paid, but no pointer chain:
  SELECT id, payment_status, paid_at, credit_used_for_attendee_id
    FROM crm_event_attendees
   WHERE id = '3d031fe7-ba88-487e-836d-39d9636631be';
  -- → paid, paid_at='2026-04-29 17:10:43.766+00', credit_used_for_attendee_id=null
  ```
- **Suggested next action:** **NEW_SPEC** — small investigation SPEC. Steps:
  1. Read `move_attendee_between_events` body and trace whether soft-cancellation of the old row (status='cancelled' + cancelled_at=now()) clears the pointer column directly OR via a trigger.
  2. Check `crm_event_attendees` triggers for any UPDATE on `status` that resets ancillary pointer columns.
  3. If the cause is identified: either (a) preserve `credit_used_for_attendee_id` through the move, or (b) accept the limitation and document that the boolean (paid_via_credit) is now the canonical "this row came from credit" signal, with the pointer being a historical artifact.
  4. Decide whether to backfill any other historically-affected rows once the bug is understood.
- **Rationale for action:** Real data-integrity issue. P24's hand-flag on `3d031fe7` is a one-off; understanding the cause prevents future credit transfers from losing the link the moment they're moved.

---

### Finding 2 — `data-event-day-subtab` selector inconsistency

- **Code:** `M4-UI-P24-01`
- **Severity:** LOW (test-tooling friction; no user impact)
- **Discovered during:** Sweep navigation step — initial selector `[data-event-day-subtab="manage"]` in test scripts didn't match because the actual attribute is `[data-subtab="manage"]` in some templates. Used a fallback selector pattern (`[data-event-day-subtab="manage"], [data-subtab="manage"]`) to handle both. The two attribute names exist across different render paths.
- **Location:** `crm-event-day.js` and `crm-event-day-checkin.js` — sub-tab buttons use mixed attribute names.
- **Suggested next action:** **TECH_DEBT** — pick one attribute name (`data-event-day-subtab` is more descriptive) and standardize. Trivial 1-line edits.
- **Rationale for action:** Cosmetic. Made my evaluate_script calls slightly more verbose; production behavior unchanged.

---

### Finding 3 — Chip count refresh requires full Event Day reload after programmatic cancel

- **Code:** `M4-UI-P24-02`
- **Severity:** INFO (implementation detail, not a user-visible bug)
- **Discovered during:** Scenario 12 — when I called `CrmAttendeeCancel.openCancelDialog(id)` directly without `onAfterCancel` callback, the DB updated correctly but the chip count "ביטל (n)" did NOT refresh until I forced a full `loadCrmEventDay()` reload.
- **Location:** `crm-attendee-cancel.js` `_openSimpleConfirmDialog` and `_openPaidChoiceDialog` — `onAfterCancel(id)` is called only when `opts.onAfterCancel` is provided by the caller.
- **Description:** In production, the row-button delegate at `crm-event-day-manage.js:wireRowActions` always passes `onAfterCancel: refreshAttendeeRow` which mutates state.attendees and re-renders both table + chips. The bug only manifests in synthetic test paths that bypass the delegate.
- **Suggested next action:** **DISMISS** (production paths are correct). Could optionally add an internal default `onAfterCancel` that does a no-op + emits a custom event, so test scripts can listen — but that's tooling polish, not user value.
- **Rationale for action:** Not a user-facing bug. Documented for future test-scripting clarity.

---
