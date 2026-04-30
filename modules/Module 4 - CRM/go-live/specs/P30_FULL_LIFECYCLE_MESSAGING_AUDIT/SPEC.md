# P30 — Full Lifecycle Messaging Audit on Prizma Production

> **Status:** authored 2026-04-30 by opticup-executor under Daniel's overnight dispatch
> **Type:** verification-only (no code changes except inline label/empty-details fixes)
> **Mode:** autonomous overnight; Daniel asleep
> **Origin:** Daniel wants every CRM template fired to his real contacts so he can cross-check what arrived (SMS to 0537889878, Email to daniel@prizma-optic.co.il) against the DB record. Closes the lingering "received only 2 of 4" question (P28-003) at the **scenario coverage** level — does every documented template path produce a DB row?

---

## 1. Goal

Trigger 13 testable templates end-to-end on Prizma production. Each must produce:
- **`crm_message_log`** row with `status='sent'`, recipient match, `run_id` linked
- **`activity_log`** row with non-empty `details`, `level='info'`, plural `entity_type='crm_event_attendees'`
- **`crm_automation_runs`** row that completes (NOT stuck `running` — P29 verification)

Results live in MESSAGE_VERIFICATION.md as a per-scenario table, with HISTORY_AUDIT.md doing the cross-table coherence audit.

## 2. Hard Constraints (from dispatch — non-negotiable)

- **Recipient:** ONLY phone `0537889878` + email `daniel@prizma-optic.co.il`
- **Both channels every dispatch:** SMS to phone + Email to email
- **No data deletion**
- **No code changes** except inline fixes for label typos or empty `activity_log` details
- **Stop only on real blockers**

## 3. 13 Scenarios

| # | Template family | Trigger |
|---|---|---|
| 1 | `lead_intake_new_*` | Manual lead create |
| 2 | `lead_intake_duplicate_*` | Storefront-form simulated POST for an existing lead |
| 3 | `event_will_open_tomorrow_*` | Event status change to `2_3d_before` |
| 4 | `event_registration_open_*` | Event status change to `registration_open` |
| 5 | `event_invite_new_*` | T5 status change |
| 6 | `event_invite_waiting_list_*` | T7 status change |
| 7 | `event_registration_confirmation_*` | Register attendee to under-capacity event |
| 8 | `event_waiting_list_confirmation_*` | Register attendee to over-capacity event |
| 9 | `event_waiting_list_*` | Verify which trigger (may be redundant with #8) |
| 10 | `event_coupon_delivery_*` | Click "שלח" on attendee in event-day-manage |
| 11 | `event_attendee_moved_unpaid_*` | Move attendee + toggle ON, payment_status NOT paid |
| 12 | `event_attendee_moved_paid_*` | Move attendee + toggle ON, payment_status paid |
| 13 | `payment_received_*` | Legacy "סמן שולם" with confirm checkbox |

## 4. Out of Scope (per dispatch)

- 2 time-based templates (e.g., daily digest, scheduled reminders) — not testable without time travel
- Any template not in the 13 above
- Any tenant other than Prizma
- Any code change beyond inline label/empty-details fixes

## 5. Success Criteria

For each of the 13 scenarios:

| # | Check | Expected |
|---|---|---|
| 1 | `crm_message_log.status='sent'` | per dispatch (SMS + Email rows both) |
| 2 | `crm_message_log.run_id IS NOT NULL` (where applicable) | rule-driven sends carry run_id |
| 3 | `crm_message_log.error_message IS NULL` | clean dispatch |
| 4 | `activity_log.details` non-empty + `level='info'` + plural `entity_type` | P26 fix verification |
| 5 | `crm_automation_runs.status='completed'` | P29 verification — no stuck `running` |
| 6 | `crm_automation_runs.finished_at IS NOT NULL` | run terminated |
| 7 | Daniel's phone receives the SMS, mailbox receives the email | manual cross-reference in AM |

## 6. Stop Triggers

| Trigger | Action |
|---|---|
| Recipient phone or email leaks beyond 0537889878 + daniel@prizma-optic.co.il | STOP immediately, document |
| `crm_message_log.status='failed'` | STOP, document as blocker (real production bug) |
| `activity_log.details={}` for a scenario logged AFTER P26 deploy | STOP, document |
| `crm_automation_runs.status='running'` after click "אשר ושלח" + 5+ minutes | STOP, document |
| Browser automation fails irrecoverably | STOP, document, surface to Daniel for AM |
| Pre-flight reveals deploy state blocks verification | STOP, surface, ask Daniel |

## 7. Pre-Flight Gates

Before any dispatch:

1. Confirm `app.opticalis.co.il` serves the P29 commits (or document deploy gap)
2. Confirm Chrome DevTools MCP is reachable (or document blocker)
3. Find or create the test lead with phone `0537889878` + email `daniel@prizma-optic.co.il`
4. Verify Edge Function `dispatch-queue` was deployed by Daniel (P29 commit 5)
5. Confirm phone `0537889878` is in the EF allowlist (already known: yes)

## 8. Outputs

- **SPEC.md** (this file)
- **EXECUTION_REPORT.md** — timeline, decisions
- **MESSAGE_VERIFICATION.md** — per-scenario table + final summary line for Daniel
- **HISTORY_AUDIT.md** — per-scenario cross-table coherence
- **TEST_DATA_INVENTORY.md** — every Prizma row touched + restore SQL
- **screenshots/** — at least 1 per modal click

## 9. Final Summary Format (for AM)

```
P30 complete. {N}/13 scenarios green. {F} blocker findings. 
Daniel expects {X} SMS to 0537889878 + {X} Email to daniel@prizma-optic.co.il. 
Cross-reference table in MESSAGE_VERIFICATION.md.
```

---

*End of SPEC.md*
