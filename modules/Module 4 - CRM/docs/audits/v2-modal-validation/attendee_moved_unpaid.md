# Per-Rule Validation — `attendee_moved` (status='unpaid') — "העברת משתתף ידנית - לא שילם"

**Rule ID:** `355e229d-1cd2-470e-987a-cdbc67ef6789` | **Tier:** A | **Status:** ✅ GREEN

**Trigger:** attendee.moved with status='unpaid' | **Template:** `event_attendee_moved_unpaid` | **Channels:** SMS+Email
**Run ID:** `57f607d1-585f-416d-9f9d-2199522f1855`
**Test method:** Direct `CrmAutomationClient.evaluate('attendee_moved', { leadId, eventId, status: 'unpaid', newStatus: 'unpaid' })` — same code path the operator UI takes via `crm-attendee-move.js:111`.

## Results

| Check | Observed |
|---|---|
| Modal opens (v2) | ✅ Rule "העברת משתתף ידנית - לא שילם", channels SMS+Email |
| Recipient count | 1 (VALIDATION lead — whitelisted) |
| Approve dispatch | ✅ |
| crm_message_queue | 2 rows, status='sent' (drained) |
| crm_message_log | 2 rows, status='sent' |
| crm_automation_runs | completed, total_recipients=2, trigger_type=attendee_moved |
| Allowlist | ✅ |

See `lead_intake.md` for canonical mechanics walkthrough.
