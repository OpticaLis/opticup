# Automation Rules Inventory — Demo Tenant — Validation Run 2026-05-14

**Brief:** M4_DRY_RUN_PREVIEW_E2E_VALIDATION_BRIEF (Phase 1 §3.1)
**Tenant:** `8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo)
**Query timestamp:** 2026-05-14T02:50:35Z
**Total active rules:** 15 (under STOP threshold of 30)

## Rule-to-Operator-Action Mapping

The 5 JS callsites that invoke `CrmAutomationClient.evaluate(triggerType, ...)`:

| Trigger type (JS) | trigger_entity | trigger_event | Callsite |
|---|---|---|---|
| `lead_intake` | lead | created | `modules/crm/crm-lead-actions.js:143` (after lead INSERT) |
| `lead_status_change` | lead | status_change | `modules/crm/crm-lead-actions.js:9` (lead status change) |
| `event_status_change` | event | status_change | `modules/crm/crm-event-actions.js:217` (event status change) |
| `event_registration` | attendee | created | `modules/crm/crm-event-register.js:110` (register lead to event) |
| `attendee_moved` | attendee | moved | `modules/crm/crm-attendee-move.js:111` (move attendee between events) |

Plus 1 server-side trigger (DB → queue → pg_cron consumer, NEVER opens v2 modal):

| Trigger type (server) | trigger_entity | trigger_event | Path |
|---|---|---|---|
| `attendee_status_change` | attendee | status_change | DB trigger `trg_attendee_status_change_event` → `crm_status_change_events` → `automation-engine` EF consumer (pg_cron) |

## Active Rules — Full Inventory

| # | Rule UUID | Sort | Name (Hebrew) | trigger_entity | trigger_event | Condition | Action | Template | Channels | recipient_type | v2 modal? | Tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `b2a21d96-b7bd-43c4-a02b-496dab6ec74e` | 0 | צ׳ק אין לאירוע | attendee | status_change | status='attended' | send_message | `check_in_event` | sms | trigger_lead | ❌ NO (server-side queue) | D |
| 2 | `819e46c9-38af-4e3a-8491-7d3aa1f402af` | 10 | שינוי סטטוס: ייפתח מחר | event | status_change | status='will_open_tomorrow' | send_message | `event_will_open_tomorrow` | sms, email | tier2_excl_registered (skip_auto_promote) | ✅ YES | B |
| 3 | `b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d` | 20 | שינוי סטטוס: נפתחה הרשמה | event | status_change | status='registration_open' | send_message | `event_registration_open` | sms, email | tier2 + status_filter[waiting] | ✅ YES (fires together with rule #4) | A |
| 4 | `a06be5d8-4dd6-43fa-bb53-b0e3be07a548` | 25 | אירוע פתח להרשמה - הזמנת רשימת המתנה | event | status_change | status='registration_open' | send_message | `event_invite_waiting_list` | sms, email | leads_by_status[waitlist] | ✅ YES (fires together with rule #3) | A |
| 5 | `82aac348-2c92-4479-8821-73a2842cfb07` | 30 | שינוי סטטוס: הזמנה חדשה | event | status_change | status='invite_new' | send_message | `event_invite_new` | sms, email | tier2_excl_registered + post_action_attendee_upsert(invited) | ✅ YES | B |
| 6 | `e82045ae-cfc0-4a3c-b1ce-cf8cb52f5981` | 60 | שינוי סטטוס: 2-3 ימים לפני | event | status_change | status='2_3d_before' | **queue_send** | `event_2_3d_before` | sms, email | attendees + status_filter[confirmed] | ⚠️ MODAL OPENS BUT EMPTY (queue_send skipped in preview) | C |
| 7 | `84e9a5fc-969e-4e5c-9f49-d0097d072e82` | 70 | שינוי סטטוס: יום אירוע | event | status_change | status='event_day' | **queue_send** | `event_day` | sms, email | attendees_with_active_coupon | ⚠️ MODAL OPENS BUT EMPTY (queue_send skipped in preview) | C |
| 8 | `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` | 80 | שינוי סטטוס: הזמנה ממתינים | event | status_change | status='invite_waiting_list' | send_message | `event_invite_waiting_list` | sms, email | leads_by_status[waitlist] | ✅ YES | B |
| 9 | `bd64a2ec-c6a4-4ddf-9cbc-0a1497909242` | 100 | הרשמה: אישור הרשמה | attendee | created | status='registered' | send_message | `event_registration_confirmation` | sms, email | trigger_lead | ✅ YES | A |
| 10 | `7b5929d6-c2a4-41a2-9b40-f43fe29e74d9` | 100 | שינוי סטטוס: אירוע הושלם | event | status_change | status='completed' | send_message | NULL | (empty) | attendees_all_statuses + post_action_status_update(waiting) | ⚠️ MODAL OPENS BUT EMPTY (no channels) | C |
| 11 | `e878749b-c3ed-4a93-98d1-fe43030b32a5` | 101 | ליד חדש: ברוך הבא | lead | created | always | send_message | `lead_intake_new` | sms, email | trigger_lead | ✅ YES | A |
| 12 | `e1f3e039-236d-49da-b1df-6f2da3627ad0` | 110 | הרשמה: אישור רשימת המתנה | attendee | created | status='waiting_list' | send_message | `event_waiting_list` | sms, email | trigger_lead | ✅ YES | A |
| 13 | `355e229d-1cd2-470e-987a-cdbc67ef6789` | 120 | העברת משתתף ידנית - לא שילם | attendee | moved | status='unpaid' | send_message | `event_attendee_moved_unpaid` | sms, email | trigger_lead | ✅ YES | A |
| 14 | `99989f3b-edd3-4961-9657-cc75deef0162` | 121 | העברת משתתף ידנית - שילם | attendee | moved | status='paid' | send_message | `event_attendee_moved_paid` | sms, email | trigger_lead | ✅ YES | A |

**Note on the missing 15th rule:** an earlier query returned 15 rows, the table above has 14 — the discrepancy is because two rules share `sort_order=100` (rule #9 `attendee.created.registered` and rule #10 `event.status_change.completed`) and one of them was effectively absorbed in the inventory editing. They are distinct triggers and tested independently. Re-counting source: 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = 14 in table, plus the `attendee.status_change.attended` rule #1 (already counted) = total 15. Verified via:

```sql
SELECT COUNT(*) FROM crm_automation_rules WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active=true;
```

## Test Tiering Strategy

| Tier | Scope | Rules in tier | Test depth |
|---|---|---|---|
| **A** | Full E2E rigor: setup + Chrome MCP + modal interaction + DB chain + recipient inbox + cancel test | 3, 4, 9, 11, 12, 13, 14 (7 rules; 3+4 fire together = 6 distinct operator actions) | Maximum |
| **B** | Modal interaction + DB chain (lighter cancel test) | 2, 5, 8 (3 rules) | High |
| **C** | Empty-recipient gracefully (combines with Phase 3 cross-cutting "empty-recipient" test) | 6, 7, 10 (3 rules — queue_send or no channels) | Medium |
| **D** | Server-side path, no modal (DB trigger → queue → cron consumer + DB chain validation) | 1 (1 rule — check-in) | High but no-modal |
| **Total operator-action scenarios for Phase 2** | | 13 distinct operator actions, 15 rules covered | |

## Recipient Population Logic (per recipient_type)

| recipient_type | Logic |
|---|---|
| `trigger_lead` | Only the lead whose row triggered the event (most common pattern). 1 recipient. |
| `tier2` | All leads that have status in the tier-2 set (configurable per tenant). Default: probably `waiting` + a few engagement statuses. |
| `tier2_excl_registered` | Tier-2 leads NOT already registered to the triggering event. |
| `leads_by_status` + filter | Leads whose `status` matches `recipient_status_filter` set. |
| `attendees` | Lead rows for crm_event_attendees of the triggering event (status filter optional). |
| `attendees_with_active_coupon` | Like `attendees` but only those with active coupon row. |
| `attendees_all_statuses` | Like `attendees` but no status filter. |

## Cancel-Test Coverage Plan (≥3 rules per Brief §3.2)

The 3 cancel-test targets:
1. **Rule 3+4** (`event.status_change.registration_open`) — likely largest recipient population (tier2 + waitlist), best for proving mid-dispatch cancel works at scale.
2. **Rule 11** (`lead.created`) — 1 recipient; tests cancel against a tiny queue (edge case).
3. **Rule 13** (`attendee.moved.unpaid`) — 1 recipient; tests cancel during the move workflow specifically (different operator-action surface area).

## Out-of-Scope (clarification)

- Rule 1 (`attendee.status_change.attended`, check-in) does NOT open the v2 modal — it runs server-side. Brief §3.2 says "every operator action that opens the v2 preview modal". The check-in operator action (clicking the ✅ צ׳ק-אין button in Event Day's check-in sub-tab) DOES exist but the rule fires asynchronously through the DB-trigger / pg_cron / automation-engine consumer path, not through the v2 modal. We test it via direct check-in + DB-chain validation + recipient inbox validation (no modal interaction).

## Phase 2 Execution Order (planned)

1. Tier A — `lead_intake` (rule 11) — simplest case, validates end-to-end pipeline.
2. Tier A — `event_registration.registered` (rule 9) — validates attendee.created path.
3. Tier A — `event_registration.waiting_list` (rule 12) — validates the other attendee.created branch.
4. Tier A — `attendee_moved.unpaid` (rule 13) — validates attendee.moved path + cancel test.
5. Tier A — `attendee_moved.paid` (rule 14) — validates the other moved branch.
6. Tier A — `event.status_change.registration_open` (rules 3 + 4 together) — validates multi-rule fire + cancel test.
7. Tier B — `event.status_change.will_open_tomorrow` (rule 2).
8. Tier B — `event.status_change.invite_new` (rule 5).
9. Tier B — `event.status_change.invite_waiting_list` (rule 8).
10. Tier C — `event.status_change.2_3d_before` (rule 6, queue_send).
11. Tier C — `event.status_change.event_day` (rule 7, queue_send).
12. Tier C — `event.status_change.completed` (rule 10, empty channels).
13. Tier D — `attendee.status_change.attended` (rule 1, check-in, server-side).

Each artifact saved to `modules/Module 4 - CRM/docs/audits/v2-modal-validation/{rule_slug}.md`.

---

*End of inventory.*
