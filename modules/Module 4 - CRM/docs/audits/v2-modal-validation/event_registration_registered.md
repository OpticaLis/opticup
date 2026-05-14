# Per-Rule Validation — `event_registration` (status='registered') — "הרשמה: אישור הרשמה"

**Rule ID:** `bd64a2ec-c6a4-4ddf-9cbc-0a1497909242` | **Tier:** A | **Status:** ✅ GREEN

**Trigger:** attendee.created with status='registered' | **Template:** `event_registration_confirmation` | **Channels:** SMS+Email
**Run ID:** `e3c05875-7c18-4609-9629-0dc6e55927b2`
**Test method:** Direct `CrmAutomationClient.evaluate('event_registration', { leadId, eventId, outcome: 'registered' })` — same code path the operator UI takes via `crm-event-register.js:110`.

## Results

| Check | Observed |
|---|---|
| Modal opens (v2) | ✅ Header "אישור פעולה", rule "הרשמה: אישור הרשמה", channels SMS+Email |
| Recipient count | 1 (VALIDATION lead — whitelisted phone +972537889878 + whitelisted email daniel@prizma-optic.co.il) |
| Approve dispatch | ✅ Modal closed, EF dispatch returned run_id |
| crm_message_queue | 2 rows (sms+email), status='sent' after cron drain |
| crm_message_log | 2 rows, status='sent', content fully composed |
| crm_automation_runs | status='completed', total_recipients=2, trigger_type=event_registration |
| Allowlist enforced | ✅ Only whitelisted recipient on dispatch |

See `lead_intake.md` for canonical Tier-A modal-interaction walkthrough; identical v2 mechanics apply.
