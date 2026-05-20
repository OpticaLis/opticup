# DB Baseline — M4 Overnight Audit 2026-05-19

**Captured:** 2026-05-19 (audit start)
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Source:** live Supabase via MCP

## Row counts (pre-audit)

| Table | Total | Active (`is_deleted=FALSE`) |
|---|---|---|
| crm_automation_rules | 23 | 23 |
| crm_broadcasts | 10 | 10 |
| crm_capi_dispatch_queue | 3 | 3 |
| crm_event_attendees | 58 | 58 |
| crm_events | 31 | 31 |
| crm_leads | 25 | 4 |
| crm_message_log | 497 | 497 |
| crm_message_queue | 117 | 117 |
| crm_message_templates | 40 | 40 |
| crm_unsubscribes | 0 | 0 |

## Status taxonomy (actual demo tenant — for scenario reference)

### Lead statuses (12 active slugs)
`new` (default), `invalid_phone`, `too_far`, `no_answer`, `callback`, `pending_terms`, `waiting`, `invited`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`, `waitlist`.

**Brief vs reality drift:** Brief §3.3 ¶3 lists path `waiting → invited → confirmed → confirmed_verified → warmed → cancelled`. Statuses `warmed` and `cancelled` do **NOT** exist in the lead taxonomy. Will use closest analogs (`waiting → invited → confirmed → confirmed_verified → not_interested`) and flag as 🟡 PARTIAL.

### Event statuses (10 slugs)
`planning`, `will_open_tomorrow`, `registration_open`, `invite_new`, `closed`, `waiting_list`, `2_3d_before`, `event_day`, `invite_waiting_list`, `completed` (terminal).

**Brief vs reality drift:** Brief §3.3 ¶4 lists 7 statuses (`planning → registration_open → registration_closed → in_progress → completed → cancelled → archived`). Reality has 10 statuses with different slugs. Walking all 10 in audit scenario 4.

### Attendee statuses (11 slugs)
`registered`, `waiting_list`, `duplicate`, `quick_registration`, `event_closed`, `manual_registration`, `cancelled`, `confirmed`, `attended`, `no_show`, `invited`.

## Existing whitelist-phone leads at start

Two active (`is_deleted=FALSE`) leads on whitelist phones:
- `cb6b343e-e4cc-42b0-990a-91999111a03c` — "Localhost Tester E2E" / +972503348349 / `waiting` / source `supersale_localhost_tester_e2e` (2026-05-15)
- `01269ab9-59c2-40d7-b987-48041210f26d` — "Test E2E FB CAPI" / +972537889878 / `waiting` / source `supersale_e2e_test` (2026-05-15)

These will be soft-deleted at audit start to give a clean slate.
