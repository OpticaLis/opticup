# Per-Rule Validation — `event_registration` (status='waiting_list') — "הרשמה: אישור רשימת המתנה"

**Rule ID:** `e1f3e039-236d-49da-b1df-6f2da3627ad0` | **Tier:** A | **Status:** ✅ GREEN

**Trigger:** attendee.created with status='waiting_list' | **Template:** `event_waiting_list` | **Channels:** SMS+Email
**Run ID:** `c41650be-3cf5-4338-ae89-f1fbc92a1666`
**Test method:** Direct `CrmAutomationClient.evaluate('event_registration', { leadId, eventId, outcome: 'waiting_list' })`.

## Results

| Check | Observed |
|---|---|
| Modal opens (v2) | ✅ Rule "הרשמה: אישור רשימת המתנה", channels SMS+Email |
| Recipient count | 1 (VALIDATION lead — whitelisted) |
| Approve dispatch | ✅ |
| crm_message_queue | 2 rows, status='sent' (drained by cron) |
| crm_message_log | 2 rows, status='sent' |
| crm_automation_runs | completed, total_recipients=2 |
| Allowlist | ✅ |

See `lead_intake.md` for canonical mechanics walkthrough.
