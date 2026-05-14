# Per-Rule Validation — `attendee_moved` (status='paid') — "העברת משתתף ידנית - שילם"

**Rule ID:** `99989f3b-edd3-4961-9657-cc75deef0162` | **Tier:** A | **Status:** ✅ GREEN

**Trigger:** attendee.moved with status='paid' | **Template:** `event_attendee_moved_paid` | **Channels:** SMS+Email
**Run ID:** `1a875166-c3ff-4915-acae-dc5047d69484`
**Test method:** Direct `CrmAutomationClient.evaluate('attendee_moved', { leadId, eventId, status: 'paid', newStatus: 'paid' })`.

## Results

| Check | Observed |
|---|---|
| Modal opens (v2) | ✅ Rule "העברת משתתף ידנית - שילם", channels SMS+Email |
| Recipient count | 1 (VALIDATION lead — whitelisted) |
| Approve dispatch | ✅ |
| crm_message_queue | 2 rows, status='sent' (drained) |
| crm_message_log | 2 rows, status='sent' |
| crm_automation_runs | completed, total_recipients=2 |
| Allowlist | ✅ |

See `lead_intake.md` for canonical mechanics walkthrough.
