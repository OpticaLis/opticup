# FINDINGS — POST_WAITING_LIST_FIXES

---

## F1 — `event_waiting_list_confirmation_sms_he` content is minimal — INFO

**Severity:** INFO
**Location:** `crm_message_templates WHERE slug=
'event_waiting_list_confirmation_sms_he'`.
**Description:** The SMS counterpart body (146 chars rendered during
live QA): `"שלום P55 Daniel Secondary, נרשמת לרשימת ההמתנה לאירוע
POST_WL_FIXES_QA. נעדכן אותך ברגע שיתפנה מקום! לביטול: [קישור הסרה —
יצורף אוטומטית]"`. Functional but a bit brief compared to the richer
email. Since SMS has 160-char limits per segment, verbosity here is
a trade-off. Keeping as-is.
**Suggested next action:** Re-review copy if SMS delivery reports
show high bounce/complaint rate. Otherwise leave.

---

## F2 — `crm_events_detail.js` now at exact 350-line cap — LOW

**Severity:** LOW (at cap, not over)
**Location:** `modules/crm/crm-events-detail.js` (350 lines).
**Description:** FIX 3's Modal.confirm refactor expanded
`wireInviteWaitingList` from ~22 lines to ~28 lines. File is now at
exactly the hard cap (350). Any future edit must plan for
extraction.
**Suggested next action:** Next SPEC touching this file should begin
with a split plan. Natural seams: `wireInviteWaitingList` could
move into its own `crm-event-invite-waiting.js` helper (would free
~28 lines). Not worth doing proactively.

---

## F3 — Test events accumulating on demo — LOW

**Severity:** LOW
**Location:** `crm_events` on demo tenant: WAITING_LIST_QA (#6),
TEST222 (#5), TEST333 (#4), TESTTT1323 (#7), TEST543 (#8),
POST_WL_FIXES_QA (#9) all created during recent SPEC QA runs.
**Description:** Demo tenant event list is filling up with QA
artifacts. Each has real attendees (Dana, sometimes Daniel
Secondary) who now show as having attended past events.
**Suggested next action:** Simple cleanup script:
`UPDATE crm_events SET is_deleted=true WHERE tenant_id=
'8d8cfa7e-...' AND name LIKE '%QA%' OR name LIKE '%TEST%';`
plus the attendees. Not worth a SPEC — can be a one-liner when
Daniel feels the demo UI is cluttered.

---

## F4 — Event #9 ended at waiting_list status — INFO

**Severity:** INFO (state residue from QA)
**Location:** `crm_events id=c5bccd95-...` (POST_WL_FIXES_QA).
**Description:** Event ended the QA session at status=waiting_list
with 2 attendees: Dana (attendee.status=registered) + Daniel
Secondary (attendee.status=waiting_list). Lead statuses both restored
to `invited` for cleanliness. No cleanup needed unless Daniel wants
the event removed.
