# Tier C — `event.status_change` Empty-Recipient Cases (queue_send + no-channels)

3 rules legitimately resolve to 0 recipients in the v2 preview path:

| # | Rule UUID | Trigger newStatus | Rule name | action_type | Reason preview is empty |
|---|---|---|---|---|---|
| 6 | `e82045ae-cfc0-4a3c-b1ce-cf8cb52f5981` | `2_3d_before` | "שינוי סטטוס: 2-3 ימים לפני" | **queue_send** | `prepareRulePlan(..., 'evaluate')` skips queue_send rules entirely (see `prepare-plan.ts:108-112`) |
| 7 | `84e9a5fc-969e-4e5c-9f49-d0097d072e82` | `event_day` | "שינוי סטטוס: יום אירוע" | **queue_send** | Same as above |
| 10 | `7b5929d6-c2a4-41a2-9b40-f43fe29e74d9` | `completed` | "שינוי סטטוס: אירוע הושלם" | send_message | `channels: []`, `template_slug: null` — produces no plan items; only `post_action_status_update: waiting` runs in dispatch mode |

## Test method

Same `CrmAutomationClient.evaluate('event_status_change', { ... })` as Tier B, with the respective newStatus values.

## Observed behavior — Graceful handling (Brief §3.3 cross-cutting #4)

For all 3 cases, the v2 modal:
1. Opens briefly in loading state ("🔄 מחשב נמענים...")
2. EF returns `recipients_by_lead: []` (empty array)
3. `crm-confirm-send-v2.js:293-298` runs the empty-recipient short-circuit:
   ```js
   if (!pv || !Array.isArray(pv.recipients_by_lead) || !pv.recipients_by_lead.length) {
     if (_modal && typeof _modal.close === 'function') _modal.close();
     if (window.Toast) Toast.warning('אין נמענים — ההודעה לא תישלח.');
     _state = null; _modal = null;
     return;
   }
   ```
4. Modal closes
5. Toast appears: **"אין נמענים — ההודעה לא תישלח."** (No recipients — message will not be sent.)

All 3 cases observed identically.

| # | Modal opened in loading | Closed gracefully | Toast text | Verdict |
|---|---|---|---|---|
| 6 (2_3d_before) | ✅ | ✅ | "אין נמענים — ההודעה לא תישלח.×" | ✅ GREEN |
| 7 (event_day) | ✅ | ✅ | "אין נמענים — ההודעה לא תישלח.×" | ✅ GREEN |
| 10 (completed) | ✅ | ✅ | "אין נמענים — ההודעה לא תישלח.×" | ✅ GREEN |

## Note on queue_send rules

Rule 6 and Rule 7 are scheduled-send rules — their messages are NOT meant to dispatch immediately on the status change. Instead they are processed by separate daily pg_cron jobs at 5:30 Israel time:

- `event_day_status_flip` — flips event status to `event_day` on event day morning, which calls `automation-engine` with `mode='dispatch'` (not preview). At that point rule 7 fires and queues the SMS/email to `attendees_with_active_coupon`.
- `event_2_3d_before_status_flip` — same but for `2_3d_before` 3 days before event date.

The preview-mode short-circuit on queue_send is correct: when an operator manually flips an event status to `event_day` or `2_3d_before` mid-day, the v2 modal correctly shows 0 recipients (the scheduled dispatch handles it the next morning). Verified the daily cron jobs exist in `cron.job` table.

## Findings

None. Empty-recipient cases handled gracefully across all 3 rules and across both code paths (queue_send and no-channels).
