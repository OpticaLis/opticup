# KB — Messaging (Templates + Automations + Placeholder Contract + IR35)

> **Synthesized snapshot, 2026-05-21.** Authority surface: `crm_message_templates` + `crm_automation_rules` (live DB), `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`, `docs/CRM_RULE_CHAINING.md`.
> **Read when:** task is in `CAMPAIGN_KB_MAP.md` row "Draft/refine a message" or "Check Iron Rule 35 boundary."

---

## 1. Iron Rule 35 — the authority boundary

| You MAY (Campaign Overseer) | You MUST NOT (Architect SPEC required) |
|---|---|
| Edit template `body` / `subject` using **only** placeholders in §3 below | Add new `%var_name%` placeholders |
| Adjust `trigger_condition` on **existing** trigger types | Add new `trigger_type` slugs / registry rows |
| Change `recipient_type` between supported values (§5) | Add new `action_type` values |
| Edit broadcast `scheduled_at` / `filter_criteria` | Modify EF code (`automation-engine`, `send-message`, `dispatch-queue`, `fb-capi-dispatch`, etc.) |
| Toggle template/rule `is_active` | Modify DB triggers, migrations, RLS policies |

Bypass requires Daniel's explicit in-chat authorization. The Campaign Lead writes a SPEC request brief to the Architect when the line is crossed.

## 2. Template catalog (active, 2026-05-21)

16 base slugs × 2 tenants (demo + prizma), all `language='he'`. SMS + Email variants for most slugs; check-in is SMS-only.

| Base slug | SMS | Email | Trigger context |
|---|---|---|---|
| `check_in_attendee` | ✓ | — | Attendee status change |
| `check_in_event` | ✓ (demo only) | ✓ (demo only) | Event-level check-in (legacy) |
| `event_2_3d_before` | ✓ | ✓ | pg_cron daily flip |
| `event_attendee_moved_paid` | ✓ | ✓ | `attendee:moved` (paid path) |
| `event_attendee_moved_unpaid` | ✓ | ✓ | `attendee:moved` (unpaid path) |
| `event_coupon_delivery` | ✓ | ✓ | Coupon dispatch (broadcast) |
| `event_day` | ✓ | ✓ | pg_cron daily flip → event_day |
| `event_invite_new` | ✓ | ✓ | event:status_change → tier2_excl_registered |
| `event_invite_waiting_list` | ✓ | ✓ | event:status_change → leads_by_status (waitlist) |
| `event_registration_confirmation` | ✓ | ✓ | attendee:created (registered) |
| `event_registration_open` | ✓ | ✓ | event:status_change → tier2 |
| `event_waiting_list_confirmation` | ✓ | ✓ | attendee:created (waiting_list) |
| `event_waiting_list` | ✓ | ✓ | (legacy waiting-list flow) |
| `event_will_open_tomorrow` | ✓ | ✓ | event:status_change → tier2_excl_registered |
| `lead_intake_duplicate` | ✓ | ✓ | `lead-intake` duplicate detection |
| `lead_intake_new` | ✓ | ✓ | lead:created (fresh lead) |
| `payment_received` | ✓ | ✓ | Manual purchase-amount entry |

**Full SMS slug:** `<base>_<channel>_<language>` — e.g. `event_invite_new_sms_he`. The base slug is what `crm_message_queue.template_slug` carries (channel + language derived from queue row's `channel` + `language` columns at send time).

**SMS char counts (post-substitution worst case, 2026-05-21):** all active SMS templates 98–352 chars (typical 250–320 = 2 SMS segments). Email bodies range 122–21,884 chars.

## 3. Placeholder contract — canonical list (re-read `M4_INFRASTRUCTURE_CONTRACT.md` §1 every session)

### 3.1 Lead-level (always available)

| Placeholder | Source | Format |
|---|---|---|
| `%name%` | `crm_leads.full_name` | string (empty if unset) |
| `%phone%` | `crm_leads.phone` | E.164 or local IL |
| `%email%` | `crm_leads.email` | lowercase |
| `%lead_id%` | `crm_leads.id` | uuid |
| `%unsubscribe_url%` | derived | URL (server-side at send time) |

### 3.2 Event-level (when `triggerData.eventId` present)

| Placeholder | Source | Format |
|---|---|---|
| `%event_name%` | `crm_events.name` | string |
| `%event_date%` | `crm_events.event_date` | `DD.MM.YYYY` |
| `%event_time%` | `crm_events.start_time` | `HH:MM:SS` |
| `%event_location%` | `crm_events.location_address` | string |
| `%event_day_of_week%` | derived | Hebrew weekday (e.g. "ראשון") |
| `%event_deposit_amount%` | `crm_events.booking_fee` | integer (no symbol) |
| `%event_max_attendees%` | `crm_events.max_capacity` | integer |
| `%registration_url%` | `crm_events.registration_form_url` (or derived) | URL |

### 3.3 NOT placeholders (escalate to Architect SPEC if needed)

Customer purchase history; cross-event registration count; coupon code (auto-resolved); branch/store metadata; tenant-config values (currency / VAT / brand name — resolved implicitly via tenant_config, not as `%var%`).

## 4. Active automation rules (14 per tenant, 2026-05-21)

Per tenant (demo + prizma), rule set is byte-identical after `DEMO_PARITY_REPLICATION` (2026-05-11) + `PRIZMA_CRM_BUGFIX_BACKPORT` (2026-05-12).

| Rule name (HE) | Trigger | Action | Recipients | Template |
|---|---|---|---|---|
| העברת משתתף ידנית - לא שילם | attendee:moved | send_message | trigger_lead | event_attendee_moved_unpaid |
| העברת משתתף ידנית - שילם | attendee:moved | send_message | trigger_lead | event_attendee_moved_paid |
| הרשמה: אישור הרשמה | attendee:created | send_message | trigger_lead | event_registration_confirmation |
| הרשמה: אישור רשימת המתנה | attendee:created | send_message | trigger_lead | event_waiting_list |
| צ׳ק אין לאירוע | attendee:status_change | send_message | trigger_lead | check_in_attendee |
| אירוע פתח להרשמה - הזמנת רשימת המתנה | event:status_change | send_message | leads_by_status (waitlist) | event_invite_waiting_list |
| שינוי סטטוס: 2-3 ימים לפני | event:status_change | queue_send | attendees | event_2_3d_before |
| שינוי סטטוס: אירוע הושלם | event:status_change | send_message | attendees_all_statuses | (no template — engine action only) |
| שינוי סטטוס: הזמנה חדשה | event:status_change | send_message | tier2_excl_registered | event_invite_new |
| שינוי סטטוס: הזמנה ממתינים | event:status_change | send_message | leads_by_status | event_invite_waiting_list |
| שינוי סטטוס: יום אירוע | event:status_change | queue_send | attendees_with_active_coupon | event_day |
| שינוי סטטוס: ייפתח מחר | event:status_change | send_message | tier2_excl_registered | event_will_open_tomorrow |
| שינוי סטטוס: נפתחה הרשמה | event:status_change | send_message | tier2 | event_registration_open |
| ליד חדש: ברוך הבא | lead:created | send_message | trigger_lead | lead_intake_new |

## 5. Recipient-type values (Iron Rule 35 — these exist; do not invent)

`trigger_lead` (single lead from trigger context) · `tier2` · `tier2_excl_registered` · `leads_by_status` (REQUIRES `recipient_status_filter` array in action_config) · `attendees` · `attendees_waiting` · `attendees_all_statuses` · `attendees_with_active_coupon` · `cross_event_active_waitlist`. New value → Architect SPEC.

## 6. Trigger types (in `crm_trigger_type_registry`)

| entity | event | producer |
|---|---|---|
| event | status_change | `trg_event_status_change_event` on `crm_events` |
| lead | status_change | `trg_lead_status_change_event` on `crm_leads` |
| attendee | status_change | `trg_attendee_status_change_event` on `crm_event_attendees` |
| attendee | created | Browser direct (no DB trigger) |
| attendee | moved | Browser direct + `move_attendee_between_events` RPC |
| lead | created | Browser direct + `lead-intake` EF |

New trigger combination → Architect SPEC (register row + producer + EF consumer handling).

## 7. Post-action chaining (Layer 3 self-loop guard)

`crm_automation_rules.action_config.post_action_status_update` flips the recipient lead's `status` AFTER the primary action. The flip writes a new SCE row carrying `originated_by_rule_id` (set via `update_lead_status_with_origin` RPC, transaction-local `m4.originated_by_rule_id`). The consumer drops the originating rule from candidates → no infinite loop.

`auto_promote_lead_status` is the explicit opt-in for "promote `waiting` → `<value>` after send" via `trg_promote_lead_on_message_sent`. Legacy `skip_auto_promote: true` still honored.

Canonical reference: `docs/CRM_RULE_CHAINING.md`.

## 8. Channel rules

**SMS (Make webhook):** 160-char soft limit per segment. Hard cap effectively 320 chars (multi-segment cost). 1-second throttle in `dispatch-queue` (~60/min). Templates use placeholders to fit; avoid bare URLs (gateway bots fire ~95% of clicks within 6 min — `feedback_clicks_are_not_actions`). **Above 320 chars (post-substitution worst-case) → switch the message to Email or WhatsApp.** SMS cost scales per segment and some gateways 404 on >5-part Hebrew messages (lesson from P5_V2 cutover 2026-04-29). For length-vs-channel decision tree see [`PLAYBOOK_MESSAGING`](PLAYBOOK_MESSAGING.md) §2.

**Email (Make webhook → SMTP):** separate `subject` + `body`. HTML supported. No length cap. 0.5-second throttle.

**WhatsApp (Green-API):** conversational tone, ≤500 chars recommended. Currently used for Quick-Register QR (`Make scenario 8464122`) — see `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` Rung-3 closure note.

## 9. Resend mechanism (W1.1 — 2026-05-20)

Operator-facing in two surfaces:
- **Messaging log** (`crm-messaging-log.js`): per-failed-row "שלח שוב" button + header bulk button.
- **Live queue** (`crm-queue-live.js`): per-failed-row "↻ שלח שוב" in פעולה column + header bulk button.

Shared logic in `crm-messaging-resend.js`: `CrmResend.classifyResend(errorMessage)` → `resendable` / `template_error` / `recipient_blocked` / `rejected_other` / `unknown`. Only `resendable` enables the button; others render disabled with reason.

Every resend INSERTs new `crm_message_queue` row with `run_id=NULL` (avoids `uq_crm_message_queue_idem` clash) + writes `crm_audit_log` entry (`action='crm.message.resend'`). NEVER updates the original log row.

## 10. Validation gates

- **Pre-enqueue** (`prepareRulePlan` in `automation-engine`): `validateTemplateOutput(composedBody)`. Failures → `crm_message_log status='rejected'` + `crm_automation_rules.last_error` populated. Queue row NEVER inserted.
- **At dispatch** (`send-message`): `validateTemplateOutput` again (defense-in-depth). Failures → `crm_message_log status='failed'` with error class.
- **Phone allowlist** (layer 2, `dispatch-queue`): defense-in-depth check against `tenants.test_mode_sms_allowlist`. Per memory `feedback_test_data_phones` — only Daniel's two personal phones (0537889878, 0503348349) for tests on demo.

## 11. Anti-patterns — do not

- Do NOT invent `%var_name%` not in §3. Architect SPEC required (extends `prepare-plan.ts buildVariables()` + send-message resolver).
- Do NOT change `template_slug` / `channel` / `language` on existing templates (structural — Architect SPEC).
- Do NOT modify rules on Prizma directly; demo-first via `scripts/promote-config-to-prizma.mjs` (Iron Rule 33).
- Do NOT include raw URLs in SMS bodies (use `%registration_url%` / `%unsubscribe_url%` to defeat preview bots).
- Do NOT hardcode prices, addresses, phones (Iron Rule 9 — use config or escalate).

---

*KB_MESSAGING v1, 2026-05-21. Refresh trigger: every M4 SPEC close affecting templates/rules/contracts; every Campaign Overseer change to template body wording per the IR33 promote flow.*
