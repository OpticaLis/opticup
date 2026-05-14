# Tier B — `event.status_change` (will_open_tomorrow, invite_new, invite_waiting_list)

These 3 rules share the same trigger entity/event and the same v2 modal mechanics; the validation differs only by trigger condition + template + recipient_type. Consolidated into one artifact per Brief efficiency.

**Test method:** Direct `CrmAutomationClient.evaluate('event_status_change', { eventId, newStatus: <X>, event: {...} })` — same code path the operator UI takes via `crm-event-actions.js:217`. Modal opened on each; clicked cancel to dismiss (no dispatch — avoids unnecessary SMS/email to whitelisted recipients).

| # | Rule UUID | Trigger newStatus | Rule name | Template | recipient_type | Modal opened | Recipient(s) shown | Status |
|---|---|---|---|---|---|---|---|---|
| 2 | `819e46c9-38af-4e3a-8491-7d3aa1f402af` | `will_open_tomorrow` | "שינוי סטטוס: ייפתח מחר" | `event_will_open_tomorrow` | tier2_excl_registered + skip_auto_promote | ✅ | 1: `a7f5e308-...` (איליה טסט, email=`alkimovich94@gmail.com` whitelisted ✅) | ✅ GREEN |
| 5 | `82aac348-2c92-4479-8821-73a2842cfb07` | `invite_new` | "שינוי סטטוס: הזמנה חדשה" | `event_invite_new` | tier2_excl_registered + post_action_attendee_upsert(invited) | ✅ | 1: `a7f5e308-...` (איליה טסט) | ✅ GREEN |
| 8 | `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` | `invite_waiting_list` | "שינוי סטטוס: הזמנה ממתינים" | `event_invite_waiting_list` | leads_by_status[waitlist] | ✅ | 1: `04011c6c-...` (VALIDATION lead, set to waitlist for the test) | ✅ GREEN |

## Per-test observations

Each modal opened with:
- Title "אישור פעולה"
- Loaded state (not stuck in loading)
- Correct rule name in header
- Correct channels chips (SMS + Email for all three)
- Search box, 4 chip filters (all rendered; "customers" appropriately disabled for these recipient populations)
- Count line "1 נמענים (1 נבחרו, 0 נשלחו טסט)"
- Footer buttons present and enabled (approve, test-send disabled at < 3, cancel)

No dispatches approved — modal cancellation does not trigger any DB writes (verified by checking crm_message_queue counts before/after).

## Recipient resolver correctness

- **Rule 2 / 5 (tier2_excl_registered):** correctly excluded P55 (status=lead_new at test time) — P55 is not in tier2 list. Selected איליה טסט (status=confirmed_verified which IS in the tier2 set as defined in `crm-automation-recipient-resolvers.js`).
- **Rule 8 (leads_by_status[waitlist]):** correctly selected VALIDATION lead (status=waitlist at test time); did NOT include other leads whose status was not waitlist.

## Findings

None. All 3 rules fire correctly with v2 modal and produce expected recipient populations.
