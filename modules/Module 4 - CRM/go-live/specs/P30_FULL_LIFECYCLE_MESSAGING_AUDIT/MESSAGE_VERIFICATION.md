# MESSAGE_VERIFICATION — P30_FULL_LIFECYCLE_MESSAGING_AUDIT

> Per-scenario execution checklist. **No dispatches fired this session** — see EXECUTION_REPORT.md for the deploy-gap reason. This file is the runbook for the next run.

---

## Test contact (constant across all scenarios)

- **Lead:** `a262bc0e-26aa-4a2d-a401-16e4998f382e` (`T5 Canary Post-Shorten`)
- **Phone:** `+972537889878` (Daniel — allowlisted in both EFs)
- **Email:** `daniel@prizma-optic.co.il`
- **Tenant:** Prizma `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- **Manager PIN:** `12345`

## Server-side allowlist (defense in depth)

`dispatch-queue` and `send-message` Edge Functions both enforce:

```ts
const ALLOWED_PHONES = ["0537889878", "0503348349", "0507168471"];
```

Any rule that fans out to many T2 leads will produce `status='rejected'` rows for non-allowlisted phones. Only the test lead's phone reaches the carrier. **Do not approve a CrmConfirmSend modal that shows recipients other than Daniel's phone — server-side allowlist will catch it, but the modal is a second line of defense.**

## Scenario index

| # | Family | Trigger path | Rule? | Audience | Risk |
|---|---|---|---|---|---|
| 1 | `lead_intake_new` | Manual lead create | ✅ `b82a91d8` (lead.created, always) | `trigger_lead` | LOW (only the new lead) |
| 2 | `lead_intake_duplicate` | Storefront-form simulated POST for existing lead | ❌ no rule — fired by lead-intake EF directly | EF-internal | LOW |
| 3 | `event_will_open_tomorrow` | Event status → `will_open_tomorrow` | ✅ `27fc6bef` | `tier2_excl_registered` | MED — fans out across all T2 not registered to event; allowlist filters |
| 4 | `event_registration_open` | Event status → `registration_open` | ✅ `8b2edc76` (registration_open template) + ✅ `d2585fc4` (invite_waiting_list template, cross_event_waitlist) | `tier2` + `cross_event_active_waitlist` | HIGH — TWO templates fire on this transition; expect 2 SMS + 2 Email if test lead matches both audiences |
| 5 | `event_invite_new` | Event status → `invite_new` | ✅ `b95a46a1` | `tier2_excl_registered` | MED |
| 6 | `event_invite_waiting_list` | Event status → `invite_waiting_list` | ✅ `c25feaf7` | `cross_event_active_waitlist` | MED — test lead must be on a different event's waitlist for this to fire |
| 7 | `event_registration_confirmation` | Register attendee with status='registered' (under-capacity) | ✅ `b1f607fa` (attendee.created, status='registered') | `trigger_lead` | LOW |
| 8 | `event_waiting_list_confirmation` | Register attendee over-capacity → status='waiting_list' | ❌ no rule with this template_slug — investigate | likely EF-direct | UNKNOWN — verify path before firing |
| 9 | `event_waiting_list` | Same trigger as #8 | ✅ `f13d874a` (attendee.created, status='waiting_list') | `trigger_lead` | LOW — likely fires same time as #8; one scenario tests both |
| 10 | `event_coupon_delivery` | Click "שלח" on attendee row in event-day-manage | ❌ no rule — direct call | UI-button | LOW |
| 11 | `event_attendee_moved_unpaid` | Move attendee + toggle ON, payment_status NOT paid | ✅ `f7bd8231` (attendee.moved, status='unpaid') | `trigger_lead` | LOW |
| 12 | `event_attendee_moved_paid` | Move attendee + toggle ON, payment_status paid | ✅ `306e48a0` (attendee.moved, status='paid') | `trigger_lead` | LOW |
| 13 | `payment_received` | Legacy "סמן שולם" with confirm checkbox | ❌ no rule — direct call from `crm-payment-helpers.js` | UI-button | LOW |

---

## Per-scenario detailed steps

### Scenario 1 — `lead_intake_new`

**Pre-state:** test lead `a262bc0e` already exists (status `confirmed`). For lead.created trigger, need a NEW lead. Either:
- (a) Create a fresh `P30 Lead 1` with phone `0537889878` (would conflict — phone is unique-by-tenant). Use a 2nd-disambiguator phone? Allowlist won't permit.
- (b) Soft-delete the existing test lead first, then create with the same phone/email. **Forbidden by dispatch (no deletion).**
- (c) Disable the unique constraint? No — schema-level, not runtime.

**Plan:** instead of creating a new lead, **trigger the rule manually** by calling `CrmAutomation.evaluate('lead.created', {leadId: 'a262bc0e-...'})` from the Chrome devtools console. This reuses the test lead and fires the rule without touching the unique constraint. Verifies the rule's send path end-to-end.

**Expected DB rows:**
- `crm_automation_runs` (1 row): rule_id=`b82a91d8`, status='completed', total_recipients=1, sent_count=2 (SMS + Email)
- `crm_message_log` (2 rows): channel='sms' + 'email', status='sent', run_id=<above>, lead_id=`a262bc0e`
- `activity_log` row(s): action='crm.lead.create' or similar — depends on automation engine emit pattern

**Daniel sees:** 1 SMS + 1 Email at his contacts.

---

### Scenario 2 — `lead_intake_duplicate`

**Pre-state:** test lead exists with email `daniel@prizma-optic.co.il`.

**Trigger:** simulate a storefront-form POST for the same email. The lead-intake EF detects the duplicate and dispatches the `lead_intake_duplicate` template directly (no rule).

**Action:** find the lead-intake EF, POST a synthetic body with `{email: 'daniel@prizma-optic.co.il', ...}`. Or trigger via the storefront-form public endpoint.

**Caveat:** without seeing the lead-intake EF source, the exact POST shape is uncertain. Pre-flight: read `supabase/functions/lead-intake/index.ts` first.

**Expected DB rows:**
- `crm_message_log` (2 rows): status='sent', run_id IS NULL (no rule, no run)
- No `crm_automation_runs` row (EF-direct)
- `activity_log` row may or may not be emitted (verify in EF source)

**Daniel sees:** 1 SMS + 1 Email.

---

### Scenario 3 — `event_will_open_tomorrow`

**Pre-state:** create a fresh event `P30 Event Will-Open-Tomorrow` with status `draft`.

**Trigger:** change status `draft → will_open_tomorrow` via the event detail modal. Rule `27fc6bef` fires for `tier2_excl_registered` audience.

**CrmConfirmSend modal:** opens with all matching T2 leads. Verify modal lists Daniel's lead. Click "אשר ושלח".

**Expected DB rows:**
- `crm_automation_runs` (1): rule=`27fc6bef`, status='completed', total_recipients=N (many), sent_count=2 (Daniel only, others rejected by allowlist)
- `crm_message_log` (2 sent + N rejected): test-lead rows status='sent', non-Daniel rows status='rejected'
- `activity_log` row for the event status change

**Daniel sees:** 1 SMS + 1 Email.

**Risk:** if the test lead is NOT in T2 status, it won't match the audience. Verify `crm_leads.status='confirmed'` is in `TIER2_STATUSES` before firing. (Confirmed: yes — confirmed is T2.)

---

### Scenario 4 — `event_registration_open` (TWO TEMPLATES FIRE)

**Pre-state:** the event from #3 (or a fresh event) at status `draft` (or `will_open_tomorrow`).

**Trigger:** change status → `registration_open`. **Two rules fire simultaneously:**
- Rule `8b2edc76` → `event_registration_open_*` template, audience `tier2`
- Rule `d2585fc4` → `event_invite_waiting_list_*` template, audience `cross_event_active_waitlist`

**CrmConfirmSend modal:** shows recipients for BOTH templates. Click "אשר ושלח".

**Expected DB rows:** 2 `crm_automation_runs` rows + 4 `crm_message_log sent` rows for Daniel (2 templates × 2 channels) + N rejected rows.

**Daniel sees:** 2 SMS + 2 Email IF the test lead is on a waitlist for some other event. Otherwise 1 SMS + 1 Email (only `tier2` rule fires usefully).

**Pre-flight check:** is the test lead on any other event's waitlist? Query `crm_event_attendees WHERE lead_id=a262bc0e AND status='waiting_list'` — if 0 rows, scenario 4 only produces 1 SMS + 1 Email.

---

### Scenario 5 — `event_invite_new`

**Pre-state:** fresh event at status `registration_open` (from #4).

**Trigger:** status → `invite_new`. Rule `b95a46a1` fires, audience `tier2_excl_registered`.

**Expected:** 1 SMS + 1 Email to Daniel (via test lead).

---

### Scenario 6 — `event_invite_waiting_list` (cross-event)

**Pre-state:** test lead must be on the WAITLIST of some OTHER event (audience is `cross_event_active_waitlist`). Need to first: register the test lead to a separate over-capacity event so it's on its waitlist.

**Trigger:** change status of a NEW event (the one we're testing the rule on) → `invite_waiting_list`. Rule `c25feaf7` fires for cross-event waitlisted leads.

**Expected:** 1 SMS + 1 Email to Daniel.

**Setup overhead:** requires 2 events on Prizma + a waitlist registration before firing the trigger event's status change.

---

### Scenario 7 — `event_registration_confirmation`

**Pre-state:** an under-capacity event at status `registration_open`.

**Trigger:** register the test lead → `crm_event_attendees` row with `status='registered'` is created. Rule `b1f607fa` (attendee.created, status='registered') fires.

**Expected:** 1 SMS + 1 Email to Daniel.

---

### Scenario 8 — `event_waiting_list_confirmation` (NO RULE — INVESTIGATE)

**Action before firing:** grep the codebase + EFs for `event_waiting_list_confirmation` to find what triggers it.

```bash
grep -rn "event_waiting_list_confirmation" modules/ supabase/
```

If no caller is found, the template is orphan (no path fires it). Document as Finding.

If a caller exists, document the trigger path here.

---

### Scenario 9 — `event_waiting_list`

**Pre-state:** an over-capacity event at status `registration_open`.

**Trigger:** register the test lead → attendees row with `status='waiting_list'`. Rule `f13d874a` fires.

**Expected:** 1 SMS + 1 Email to Daniel.

**Note:** this likely fires alongside Scenario 8 if both rules+EFs co-trigger. One registration may produce sends for both templates; verify.

---

### Scenario 10 — `event_coupon_delivery`

**Pre-state:** test lead is registered as attendee on an event with status `event_day` (or status that allows coupon dispatch per `crm-event-day-coupon.js` lifecycle gate).

**Trigger:** open event-day-manage tab, find the test lead's attendee row, click "שלח" in the coupon column.

**Expected:** 1 SMS + 1 Email to Daniel. NO `crm_automation_runs` row (manual button — direct call to `CrmMessaging.sendMessage`). Activity_log row with action `crm.attendee.coupon_sent`.

---

### Scenario 11 — `event_attendee_moved_unpaid`

**Pre-state:** test lead is attendee on Event A with `payment_status != 'paid'`. A second event B exists.

**Trigger:** open the attendee detail (or move flow), select "העבר לאירוע אחר", choose Event B, **toggle "שלח הודעה" ON**. Rule `f7bd8231` (attendee.moved, status='unpaid') fires.

**Expected:** 1 SMS + 1 Email; `crm_automation_runs` row, status='completed'.

---

### Scenario 12 — `event_attendee_moved_paid`

Same as #11 but the attendee's `payment_status='paid'` before the move. Rule `306e48a0` fires.

---

### Scenario 13 — `payment_received`

**Pre-state:** test lead is attendee with `payment_status='pending_payment'`.

**Trigger:** open the attendee detail, click "סמן שולם", check the "שלח הודעה" checkbox in the confirmation, confirm.

**Expected:** 1 SMS + 1 Email. NO `crm_automation_runs` row (manual). Activity_log `crm.attendee.payment_marked_paid`.

---

## Verification table (to be filled per scenario)

| # | template family | dispatched_at | crm_message_log id (sms) | crm_message_log id (email) | activity_log id | crm_automation_runs id | history visible UI | status |
|---|---|---|---|---|---|---|---|---|
| 1 | lead_intake_new | — | — | — | — | — | — | not yet fired |
| 2 | lead_intake_duplicate | — | — | — | — | — | n/a (EF-direct) | not yet fired |
| 3 | event_will_open_tomorrow | — | — | — | — | — | — | not yet fired |
| 4a | event_registration_open | — | — | — | — | — | — | not yet fired |
| 4b | event_invite_waiting_list (rule d2585fc4) | — | — | — | — | — | — | not yet fired |
| 5 | event_invite_new | — | — | — | — | — | — | not yet fired |
| 6 | event_invite_waiting_list (rule c25feaf7) | — | — | — | — | — | — | not yet fired |
| 7 | event_registration_confirmation | — | — | — | — | — | — | not yet fired |
| 8 | event_waiting_list_confirmation | — | — | — | — | — | n/a (TBD) | not yet fired — investigate path |
| 9 | event_waiting_list | — | — | — | — | — | — | not yet fired |
| 10 | event_coupon_delivery | — | — | — | — | n/a (no rule) | n/a | not yet fired |
| 11 | event_attendee_moved_unpaid | — | — | — | — | — | — | not yet fired |
| 12 | event_attendee_moved_paid | — | — | — | — | — | — | not yet fired |
| 13 | payment_received | — | — | — | — | n/a (no rule) | n/a | not yet fired |

## Final summary line (to be written after live-fire)

```
Daniel should receive {N} SMS to 0537889878 and {N} Email to daniel@prizma-optic.co.il.
Cross-reference against the table above by template_slug.
```

When N is filled: expected upper bound is 13 SMS + 13 Email if every scenario fires once and each produces 1 dispatch per channel. With #4 firing two templates and #6 requiring waitlist setup, the actual count may be 13–15 of each.
