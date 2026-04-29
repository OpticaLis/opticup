# ⚠️ Pre-Cutover Requirements — V2 Email Templates

> **Critical:** the V2 email templates require system-side wiring before M4 P7 cutover (2026-05-03). This document is the master checklist.
>
> **Audience:** the Foreman / SPEC author who will translate this into executable SPECs.
>
> **Status:** authored 2026-04-28 by Campaign Overseer during the V2 email rebuild. All decisions came from Daniel during that session.
>
> **What's NOT here:** the email content itself (in `MESSAGES_V2/*.html`) and the design canon (in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md`).

---

## Section 1 — CRM substitution variables to wire

These variables appear as `%X%` placeholders in V2 templates. The CRM substitution engine must resolve them at send-time, otherwise the customer sees literal text.

### 1.1 Variables that already work (verify, don't rebuild)

These were used in legacy templates and likely already resolved by the existing pipeline. **Verify, don't rebuild.**

| Variable | Source | Used in V2 templates |
|---|---|---|
| `%name%` | `crm_leads.name` | All 9 |
| `%phone%` | `crm_leads.phone` | T1, T2 |
| `%email%` | `crm_leads.email` | T1, T2 |
| `%event_name%` | `crm_events.name` | T3, T4, T5, T6, T7, T8 |
| `%event_date%` | `crm_events.event_date` (formatted DD/MM/YYYY) | T4, T5, T6, T7, T8, T9 |
| `%event_time%` | `crm_events.event_time` or computed range | T4, T5, T7, T8, T9 |
| `%registration_url%` | EF-generated per lead+event token | T4, T5, T7 |
| `%unsubscribe_url%` | EF-generated per recipient | All 9 |

**Verification step:** send a test email rendering each variable against demo tenant + demo event. No literal `%X%` in output.

### 1.2 Variables that need to be added (NEW work)

| Variable | What it holds | Source | Priority |
|---|---|---|---|
| `%event_max_attendees%` | numeric cap on attendance for this event | **ALIAS** of existing `crm_events.max_capacity` (no DDL needed — Foreman finding 2026-04-28) | HIGH |
| `%event_deposit_amount%` | deposit amount in NIS for this event | **ALIAS** of existing `crm_events.booking_fee` (no DDL needed — Foreman finding 2026-04-28) | HIGH |
| `%event_day_of_week%` | Hebrew day-of-week computed from `event_date` | computed in EF (NOT stored) | HIGH |
| `%payment_url_50%` (and `_75`, `_100`...) | tenant-level payment URL keyed by booking fee | **NEW JSONB column** `tenants.payment_links` (`{"50": "https://...", "75": "..."}`); EF builds variable name dynamically from `event.booking_fee`. **MISSING-VALUE BEHAVIOR: send MUST fail with alert** (Daniel directive 2026-04-28) — no fallback URL, no degraded send. | HIGH (added 2026-04-28 for `event_attendee_moved_unpaid_*` templates) |

**`%event_day_of_week%` mapping:**

| weekday() | Hebrew |
|---|---|
| 0 | יום ראשון |
| 1 | יום שני |
| 2 | יום שלישי |
| 3 | יום רביעי |
| 4 | יום חמישי |
| 5 | יום שישי |
| 6 | שבת |

**Daniel directives:**
- Day-of-week: "תהפוך את היום לשדה דינמי וברגע שממלאים תאריך בפתיחת אירוע היום יתעדכן אוטומטית (גם חייב לזכור לעדכן במערכת!)"
- Deposit amount: "דמי רישום יכולים להשתנות. צריך משתנה. חייב לוודא שהמשתנה מוגדר לא לשכוח! נצטרך להגדיר אותו!"

---

## Section 2 — Automation rules to configure

Configured in `crm_automation_rules` table (or equivalent). Each rule fires a specific template based on a system event.

### 2.1 Rule: New lead registers → check for active event

**Trigger:** `crm_leads` insert (new lead).

**Logic:**
- Search `crm_events` for any row with `tenant_id` = lead's tenant AND `status` IN (`open_for_registration`, `waitlist`), sorted by `event_date` ASC.
- If a matching event exists → fire **Template 5** (`event_invite_new_email_he`) with that event's data.
- If no matching event → fire **Template 1** (`lead_intake_new_email_he`) — standard welcome.

**Why both `open` and `waitlist` count:** Daniel directive — leads in either state can still register. The 4-step process in T5's body handles both cases (gets a slot OR goes to waitlist).

### 2.2 Rule: Template 5 sent → status update

**Trigger:** Template 5 successfully sent to a lead.

**Action:** update lead's status in `crm_event_attendees` for the referenced event to `הוזמן` (invited).

**Why:** prevents re-sending; tracks lifecycle. Daniel directive: "ברגע שהוא מקבל את ההודעה הסטטוס שלו משתנה ל'הוזמן'".

### 2.3 Rule: Lead registers for event over capacity → Template 6 (waitlist confirmation)

**Trigger:** lead submits the event registration form for an event whose `max_attendees` is already filled.

**System logic at registration time:**
1. Lead's record in `crm_event_attendees` is created with status = `המתנה` (waitlist).
2. Standard registration confirmation email is **NOT** sent.
3. Instead, **Template 6** (`event_waiting_list_email_he`) fires as the registration response.

**Why:** Daniel directive — "ברגע שמישהו נרשם לאירוע מעל למקסימום רשומים שנקבע הוא צריך לקבל הודעה שהוא נכנס לרשימת המתנה."

### 2.4 Rule: Parallel event opens → Template 7 to ACTIVE waitlist

**Trigger:** new event created with `status = open_for_registration`, AND there is at least one OTHER event currently in `open_for_registration` (or `waitlist_full`) with leads on its waitlist.

**Recipients:** leads with `crm_event_attendees` rows in the **CURRENTLY ACTIVE** event (not closed/past) where status = `המתנה` (waitlist) OR `הוזמן` (invited).

**CRITICAL filter:** ONLY pull from the active/current event. NEVER pull from past/closed events. Daniel: "נשלח רק למי שברשימת המתנה באירוע פעיל. לא מאירועים קודמים שכבר נגמרו."

**Action:** send **Template 7** (`event_invite_waiting_list_email_he`) referencing the NEW event.

**Status update post-send:** update the lead's status in `crm_event_attendees` for the NEW event to `הוזמן` (invited).

### 2.5 Rule: 3 days before event → Template 8 (reminder)

**Trigger:** scheduled — fires 3 days before `crm_events.event_date` at a configurable time.

**Recipients:** all leads in `crm_event_attendees` for the event with status = `מאושר` (confirmed) — paid deposit + slot reserved. NOT sent to waitlist or cancelled.

**Configurable parameters per event/tenant:**
- `days_before_event`: integer (default 3)
- `send_time`: time-of-day (default e.g. `10:00`)

**Implementation requirements:**
- Scheduled job (cron / pg_cron / EF + scheduler) runs at configured `send_time` daily.
- Admin UI: event-creation/edit form allows setting `send_time` (or tenant default).
- Idempotency: track in `crm_message_logs` to avoid re-send.

**Daniel directive:** "צריך לוודא שההודעה הזאת נשלחת אוטומטית 3 ימים לפני תאריך האירוע עם אפשרות להגדיר שעה ספציפית לאוטומציה הזאת."

### 2.6 Rule: Event day morning → Template 9

**Trigger:** scheduled — fires on event day morning at a configurable time (default e.g. 08:00).

**Recipients:** all confirmed attendees (`מאושר`) for the event happening today.

**Same configurability + idempotency requirements as 2.5.**

---

## Section 3 — Product features needed (CRM admin UI / RPC layer)

These are NOT message templates or automations — they are CRM features that the templates' flows depend on.

### 3.1 Confirmed-attendance migration to a new event

**Use case:** Template 7 sends a lead to register for a parallel event. When they confirm:
1. Status in `crm_event_attendees` for NEW event → `מאושר` (confirmed).
2. They are REMOVED from the original event's waitlist (or marked `מבוטל-עבר` with audit trail) — no double-counting.
3. Deposit is collected against the NEW event's deposit ledger, not the original.

**Verify:** does `register_lead_to_event` RPC handle the case where a lead is already on a waitlist for a different event? If not — build the cross-event move logic.

### 3.2 Manual move of attendees between events

**Use case:** customer calls "I can't make event A but can make event B" → staff moves them in CRM admin UI with one click. Also fires when staff invites a waitlisted lead to a parallel event verbally.

**Implementation requirements:**
- Admin UI: attendees screen has a "Move to event…" action per attendee (or bulk).
- Source event row → mark `מבוטל-עבר` or DELETE with audit trail.
- Target event row → INSERT with status preserved (or `מאושר` if target was at capacity).
- Deposit handling: transfer between event ledgers; don't double-charge or double-refund.
- **Notification toggle (RESOLVED 2026-04-28):** "Send customer notification" checkbox in the move dialog, default **OFF** (silent). When ticked, system fires email + SMS pair based on payment status:
  - **UNPAID branch** (no booking fee paid for source event) → fires `event_attendee_moved_unpaid_email_he` + `event_attendee_moved_unpaid_sms_he`. Includes payment CTA via `%payment_url_50%` (or matching fee-tier variable).
  - **PAID branch** (booking fee paid for source event, transferring to target) → fires `event_attendee_moved_paid_email_he` + `event_attendee_moved_paid_sms_he`. Confirms carry-over, no payment CTA.

**Daniel directive:** "צריך להוסיף אפשרות להעביר משתתפים בין האירועים באופן ידני." + "אפשרות גם להעברה שקטה וגם להודעה" (2026-04-28).

---

## Section 4 — Pre-cutover checklist

Run through this before flipping the switch on M4 P7 (2026-05-03):

### Database
- [x] ~~Verify `crm_events.max_attendees` column exists. If not — add it.~~ **RESOLVED 2026-04-28:** existing column is `crm_events.max_capacity` (default 50). Foreman aliases the variable in EF — NO DDL needed.
- [x] ~~Add `crm_events.deposit_amount` column (numeric, default 50). NEW~~ **RESOLVED 2026-04-28:** existing column is `crm_events.booking_fee` (numeric(10,2) default 50.00). Foreman aliases the variable in EF — NO DDL needed.
- [ ] Add `tenants.payment_links` JSONB column. Format: `{"50": "https://prizmaoptic.short.gy/gmapy", "75": "...", ...}`. **NEW** (added 2026-04-28 for `event_attendee_moved_unpaid_*` templates).
- [ ] Verify `crm_event_attendees` status enum includes: `מאושר`, `המתנה`, `הוזמן`, `מבוטל-עבר`. Adjust as needed.
- [ ] Verify `crm_message_logs` table tracks per-template send history (for idempotency on scheduled rules).

### Substitution engine
- [ ] Implement `%event_day_of_week%` substitution logic (Hebrew weekday names from `event_date`). **NEW**
- [ ] Implement `%event_max_attendees%` alias → reads `crm_events.max_capacity` (alias only, no DDL).
- [ ] Implement `%event_deposit_amount%` alias → reads `crm_events.booking_fee` (alias only, no DDL).
- [ ] Implement dynamic `%payment_url_<fee>%` variable. EF reads `event.booking_fee`, builds the variable name (e.g., `payment_url_50`), looks up `tenants.payment_links[fee]`. If missing → send fails + alerts CRM dashboard. **NEW** (added 2026-04-28).
- [ ] Verify all variables in §1.1 still resolve under the new pipeline.
- [ ] Test render of all 11 V2 templates against a demo event with all variables populated (9 lifecycle + 2 manual-move). No literal `%X%` in output.

### Automation rules
- [ ] Configure rule 2.1 (new lead → T5 or T1 fallback).
- [ ] Configure rule 2.2 (T5 send → status `הוזמן`).
- [ ] Configure rule 2.3 (over-capacity registration → T6).
- [ ] Configure rule 2.4 (parallel event opens → T7 to active waitlist).
- [ ] Configure rule 2.5 (3 days before event → T8 with configurable time).
- [ ] Configure rule 2.6 (event day morning → T9 with configurable time).
- [ ] Verify scheduling infrastructure (pg_cron OR EF + external scheduler).

### Product features
- [ ] Implement §3.1 — cross-event registration move logic in `register_lead_to_event` RPC.
- [ ] Implement §3.2 — manual attendee move in CRM admin UI.
- [ ] Daniel decision needed on §3.2 notification (auto-email or silent).

### Templates
- [ ] Migrate all 9 lifecycle V2 email templates + 2 NEW manual-move emails (UNPAID + PAID) from `MESSAGES_V2/*.html` into `crm_message_templates` (replace existing rows + INSERT 2 new rows for the manual-move pair).
- [ ] Migrate all 9 lifecycle V2 SMS templates + 2 NEW manual-move SMS (UNPAID + PAID) from `MESSAGES_V2/*.txt` into `crm_message_templates`.
- [ ] Total: **22 V2 message rows** (11 emails + 11 SMS). T10 (event_closed_*_he) NOT migrated.
- [ ] Document the variables in CRM admin UI tooltips so admins know what to fill in when creating an event + when configuring tenant `payment_links`.

### Validation
- [ ] End-to-end smoke test on demo tenant: create event → lead registers → receives T1/T5 → fills capacity → next lead receives T6 → 3 days before → T8 → event day → T9.

---

## Section 5 — Templates the legacy system has but V2 does NOT use

| Legacy slug | V2 status | Reason |
|---|---|---|
| `event_closed_email_he` | ❌ NOT migrated | Daniel directive 2026-04-28 — "אני רוצה שימשיכו להירשם לרשימת המתנה. זה לא חכם להשתמש בה." Remove from active flows; lead will register over-capacity → get Template 6 instead. |
| `event_closed_sms_he` | ❌ NOT migrated | same reason as above. |

**Action at cutover:** these two templates can stay in the seed file (for future revival if needed) but must NOT be wired to any automation rule.

---

## Where to track implementation

When the SPEC for this work ships, update each `[ ]` item in §4 with:
- `Implemented: YYYY-MM-DD`
- `By: {who}`
- `Verified rendering in: {test event ID}`

---

*Created 2026-04-28 by Campaign Overseer during V2 email rebuild.*
*Restructured 2026-04-28 after all 9 V2 emails were locked.*
