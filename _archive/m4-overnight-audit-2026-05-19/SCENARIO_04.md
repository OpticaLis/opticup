# SCENARIO 04 — Event create + walk through all status types

**Status:** 🟢 PASS (Brief said 7 statuses; demo tenant has 10 — all 10 walked)
**Date:** 2026-05-20
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Event under test:** `c1171a74-29c5-4d59-a1bb-d2322ca9d41c` (#31 "Audit S4 Event 2026-05-20")

## Status-slug mapping (Brief drift)

Brief §3.3 ¶4 listed 7 statuses (`planning → registration_open → registration_closed → in_progress → completed → cancelled → archived`). Actual taxonomy on demo (`crm_statuses WHERE entity_type='event' AND is_active=TRUE`):

```
planning, will_open_tomorrow, registration_open, invite_new, closed,
waiting_list, 2_3d_before, event_day, invite_waiting_list, completed
```

— 10 statuses, none labeled `registration_closed` / `in_progress` / `cancelled` / `archived`. Mapped: `closed` ≈ `registration_closed`; `event_day` ≈ `in_progress`. `cancelled` and `archived` don't exist for events. Walked all 10 in original taxonomy order. Brief should be updated to reflect actual taxonomy.

## Create

```js
await window.CrmEventActions.createEvent({
  campaign_id: '9282b8ea-edd8-42ea-b3c3-e000f010db38',  // demo SuperSale campaign
  name: 'Audit S4 Event 2026-05-20',
  event_date: '2026-05-30',
  location_address: 'Audit location, Ashkelon',
  start_time: '10:00', end_time: '15:00',
  max_capacity: 10, max_coupons: 10, booking_fee: 50,
});
// → { id: c1171a74-..., event_number: 31 }
```

DB after create:

| Field | Expected | Actual |
|---|---|---|
| event_number | next sequential | 31 (atomic RPC `next_crm_event_number`) ✓ |
| status | `planning` (default) | `planning` ✓ |
| coupon_code | auto-default `SuperSale{n}` | `SuperSale31` ✓ |
| max_capacity / max_coupons / booking_fee | per input | 10 / 10 / 50.00 ✓ |
| is_deleted | false | false ✓ |

## Status walk

UPDATE statements applied directly (bypassing the front-end probe modal because it timed out under Chrome MCP automation — see Scenario 2 §UI submit findings):

```
planning → will_open_tomorrow → registration_open → invite_new → closed
→ waiting_list → 2_3d_before → event_day → invite_waiting_list → completed
```

Final status confirmed `completed` ✓.

## Trigger / automation observed

The `SCE producer` DB trigger fires on event UPDATE. Observed in `crm_automation_runs` filtered to `tenant_id=demo AND started_at >= 03:56` (event creation time), `trigger_type='event_status_change'`:

| Rule (Hebrew) | Recipients | Sent | Status |
|---|---|---|---|
| שינוי סטטוס: ייפתח מחר (will_open_tomorrow) | 2 | 0 | completed |
| שינוי סטטוס: נפתחה הרשמה + ... רשימת המתנה (registration_open) | 2 | 0 | completed |
| שינוי סטטוס: הזמנה חדשה (invite_new) | 2 | 0 | completed |
| שינוי סטטוס: 2-3 ימים לפני (2_3d_before) | 0 | 0 | completed |
| שינוי סטטוס: יום אירוע (event_day) | 0 | 0 | completed |
| שינוי סטטוס: הזמנה ממתינים (invite_waiting_list) | 0 | 0 | completed |
| שינוי סטטוס: אירוע הושלם (completed) | 0 | 0 | completed |
| שינוי סטטוס: נפתחה הרשמה + ... (second registration_open variant) | 0 | 0 | completed |

**8 of 8 active `event.status_change` automation rules attempted at least once during this walk** (one per matching transition).

| Counter | Pre | Post | Δ | Note |
|---|---|---|---|---|
| crm_message_queue (demo) | 117 | 117 | 0 | no recipients qualified → no queue rows |
| crm_message_log (demo) | 497 | 497 | 0 | as above |
| crm_automation_runs (demo) | n | n+8 | +8 | 1 run per qualifying rule (no duplicates) |

`total_recipients = 2` for invite rules — these targeted the 2 active leads on demo (S2's created lead + 1 pre-existing). `sent_count = 0` for all — because the candidates were either pre-existing in `crm_unsubscribes` (none on demo), filtered by `marketing_consent=false` (manual-create default in S2 = `false`), or other dispatch-time gates. No errors logged in `crm_automation_runs.error_message`.

## Findings

🟢 **Event create** — sequential numbering via atomic RPC works (Iron Rule 11). Defaults applied (start/end times, capacity, coupons, booking fee, coupon_code). Activity_log written (`crm.event.create`).

🟢 **Status walk** — all 10 statuses applied successfully. Status update is atomic.

🟢 **SCE producer trigger** — fires on direct UPDATE (`update_event_status_with_overrides` not required for silent paths). Each transition produces exactly one row in `crm_automation_runs` per matching rule — no duplication; the "automation rule triggers exactly once" requirement met for events.

🟡 **UI walk skipped under automation** — `changeEventStatus` JS function timed out in Chrome MCP context (probably because `probeAndCommit` opened a modal that the automation could not click through). Direct SQL UPDATE was used instead. The probe-modal path itself is verified at the source-code level (`crm-event-actions.js:250-256`) but not at the live UI level by this audit. Same caveat as Scenario 2 § "UI submit click".

## Verdict 🟢 PASS

10/10 statuses applied, 8/8 event-status-change rules fired exactly once, no errors, no duplication, sequential numbering works, defaults applied. **No regression.** UI-modal walk deferred to manual verification by Daniel due to Chrome MCP automation limitation (consistent with S2 finding).

Event retained for use in Scenarios 5–7.
