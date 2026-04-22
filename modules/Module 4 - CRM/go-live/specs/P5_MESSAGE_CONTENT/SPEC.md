# SPEC — P5_MESSAGE_CONTENT

> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_MESSAGE_CONTENT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** P5 (Go-Live)
> **Author signature:** Cowork session brave-jolly-ride

---

## 1. Goal

Populate the CRM messaging pipeline (built in P3c+P4) with all real message
content: SMS text templates and professional HTML email templates for every
trigger point in the SuperSale campaign flow, and fix the template management
UI so it uses the correct `%variable%` format and is fully wired to CRUD on
`crm_message_templates`.

---

## 2. Background & Motivation

**P3c+P4 CLOSED (2026-04-22):** The messaging pipeline is operational — Edge
Function `send-message` handles template fetch, variable substitution, log
write, and Make webhook dispatch. Make is a send-only pipe (4 modules). But
only 4 demo templates exist (`lead_intake_new` and `lead_intake_duplicate` in
SMS + Email variants). The full SuperSale flow documented in
`campaigns/supersale/FLOW.md` has **13 event statuses** with distinct message
content for each.

**Why now:** P5 is the content layer. Without it, only lead-intake triggers
send messages. Event-related triggers (registration open, reminders, event day,
etc.) have no templates to send. P6 (full cycle test) cannot run until P5
provides the content.

**Depends on:**
- P3c+P4 ✅ — `send-message` Edge Function deployed, Make scenario operational
- P2b ✅ — Event management (event statuses exist in CRM)
- `campaigns/supersale/FLOW.md` — complete content map (source of truth for all message text)
- `campaigns/supersale/messages/*.html` — 10 HTML email templates (source)

**Key constraint — variable format:** The Edge Function uses `%variable%`
placeholders. The existing HTML email templates in `campaigns/supersale/messages/`
use Make's `{{module.field}}` format. The CRM template editor UI
(`crm-messaging-templates.js`) also uses `{{variable}}`. Both must be converted
to `%variable%` in this SPEC.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Demo tenant template count | ≥20 active templates | `SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true` → ≥20 |
| 3 | SMS templates exist for all triggers | 8 distinct base slugs × `sms` channel | `SELECT slug FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND channel = 'sms' AND is_active = true ORDER BY slug` — must include: `lead_intake_new`, `lead_intake_duplicate`, `event_will_open_tomorrow`, `event_registration_open`, `event_invite_new`, `event_closed`, `event_waiting_list`, `event_2_3d_before`, `event_day`, `event_invite_waiting_list` |
| 4 | Email templates exist for all triggers | Same 10 base slugs × `email` channel | Same query with `channel = 'email'` |
| 5 | Email bodies are valid HTML | Every email template body starts with `<!DOCTYPE html>` or `<html` | `SELECT slug FROM crm_message_templates WHERE channel = 'email' AND tenant_id = '8d8cfa7e-...' AND body NOT LIKE '<!DOCTYPE%' AND body NOT LIKE '<html%'` → 0 rows |
| 6 | No Make variables remain | Zero `{{` occurrences in any template body | `SELECT slug, channel FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND body LIKE '%{{%'` → 0 rows |
| 7 | All templates use `%var%` format | Spot-check: `lead_intake_new_sms_he` body contains `%name%` | `SELECT body FROM crm_message_templates WHERE slug = 'lead_intake_new_sms_he' AND tenant_id = '8d8cfa7e-...'` → contains `%name%` |
| 8 | UI variables list uses `%var%` | `crm-messaging-templates.js` VARIABLES array uses `%name%` not `{{name}}` | `grep '%name%' modules/crm/crm-messaging-templates.js` → match |
| 9 | UI substitute() uses `%var%` | Preview substitution uses `%var%` regex | `grep '/%name%/g' modules/crm/crm-messaging-templates.js` → match (or equivalent `%` pattern) |
| 10 | UI has all 10 variables | VARIABLES array has 10 entries matching the Edge Function's variable list | Manual count in code |
| 11 | Email variable added | `%email%` is in VARIABLES array (was missing in B5 UI) | `grep '%email%' modules/crm/crm-messaging-templates.js` → match |
| 12 | Existing 4 demo templates updated | `lead_intake_new` and `lead_intake_duplicate` SMS+Email bodies updated to final content from FLOW.md | Spot-check body content |
| 13 | File size ≤350 lines | `crm-messaging-templates.js` | `wc -l modules/crm/crm-messaging-templates.js` → ≤350 |
| 14 | Zero console errors | CRM Messaging Hub → Templates sub-tab loads without errors | Browser test on demo tenant |
| 15 | Docs updated | SESSION_CONTEXT, CHANGELOG reflect P5 CLOSED | Files reviewed |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run read-only SQL (Level 1)
- INSERT / UPDATE / DELETE rows in `crm_message_templates` on **demo tenant only** (Level 2 — approved)
- Edit `modules/crm/crm-messaging-templates.js` (UI variable fix)
- Create, edit JS files listed in §8
- Commit and push to `develop`
- Convert HTML email content from Make `{{}}` format to `%var%` format
- Update existing 4 demo templates to match FLOW.md content

### What REQUIRES stopping and reporting
- Any schema change (DDL) — new tables, columns, views, RPCs
- Any modification to Prizma tenant data
- Any merge to `main`
- Any change to the `send-message` Edge Function logic
- Any change to the `lead-intake` Edge Function
- Changes to `shared.js` or any shared component
- Any step where actual output diverges from §3 expected values
- If any HTML email template exceeds 15KB (indicates bloated inline CSS — investigate)

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- If an HTML email template fails to render in the CRM preview panel → STOP
- If `crm_message_templates` INSERT fails with duplicate key violation → STOP (slug collision means template already exists under a different naming)
- If `crm-messaging-templates.js` exceeds 350 lines after edits → STOP (Rule 12)
- If any existing CRM functionality breaks (tab loading, template list, editor) → STOP
- If converting a Make email template to `%var%` format breaks the HTML structure → STOP

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}` for repo changes
- **DB:** `DELETE FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > '{SPEC_START_TIMESTAMP}'` removes new templates. Original 4 demo templates restored by re-running the original seed if they were modified.
- No schema changes in this SPEC — rollback is clean.

---

## 7. Out of Scope (explicit)

- **WhatsApp channel** — deferred until Daniel switches from Green API to Meta official API. No WhatsApp template variants created.
- **Event/attendee/reminder trigger wiring** — P5 creates the templates; wiring CRM event status changes to call `send-message` is a separate SPEC (needs event status → bulk send logic + scheduler for time-based sends).
- **Broadcast Wizard "send" button wiring** — the B5 UI exists but connecting it to `CrmMessaging.sendMessage({body})` is a separate SPEC.
- **Variable chips UI** (clickable buttons that insert variables) — the current dropdown menu is sufficient. Enhancement deferred.
- **Prizma tenant templates** — all work on demo tenant. Prizma gets templates in P7 (cutover).
- **Unsubscribe Edge Function** — the `%unsubscribe_url%` variable exists in templates but the actual unsubscribe endpoint is a separate SPEC.
- **CX survey template** — post-event flow (FLOW.md stage 6) is not yet fully documented; defer to a future SPEC.
- **Russian language variants** — FLOW.md mentions a Russian path in Scenario 6; deferred. Only Hebrew (`he`) templates in P5.
- **Template editor visual enhancements** — dark theme code editor, line numbers already work from B7/B8. No visual changes.
- **`send-message` Edge Function changes** — the function is complete and tested. P5 only adds content to the DB, not code to the function.
- **DOC_FIX_PROMPT execution** — a separate Claude Code task (see `P3C_P4_MESSAGING_PIPELINE/DOC_FIX_PROMPT.md`). Can run in parallel but is NOT part of this SPEC.

---

## 8. Expected Final State

### New files
- None (all content goes into DB rows, not files)

### Modified files
- `modules/crm/crm-messaging-templates.js` (~304→~304 lines, ±10) — VARIABLES array converted from `{{var}}` to `%var%` format, `substitute()` function updated to use `%var%` regex, `%email%` variable added (was missing). Description and key names updated to match Edge Function's 10 variables exactly.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P5 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P5 ✅

### Deleted files
- None

### DB state (demo tenant only)
- `crm_message_templates`: ≥20 active templates (10 base slugs × 2 channels SMS+Email). Each template row has:
  - `tenant_id`: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
  - `slug`: full slug format `{base_slug}_{channel}_{language}` (e.g., `lead_intake_new_sms_he`)
  - `name`: Hebrew display name (e.g., `ליד חדש — SMS`)
  - `channel`: `sms` or `email`
  - `language`: `he`
  - `subject`: email subject line (null for SMS)
  - `body`: SMS plain text or full HTML email
  - `is_active`: true

### Docs updated (MUST include)
- Module 4 `SESSION_CONTEXT.md` — P5 CLOSED, template count, next phase
- Module 4 `CHANGELOG.md` (under `go-live/`) — P5 section with commits

---

## 9. Commit Plan

Budget: 3–4 commits + 1 retrospective. Buffer: ±1 fix commit.

- **Commit 1:** `fix(crm): convert template editor variables from {{}} to %var% format` — `crm-messaging-templates.js` VARIABLES array + `substitute()` + add `%email%`
- **Commit 2:** `feat(crm): seed all SuperSale message templates on demo tenant` — SQL INSERT statements for all ≥20 templates (SMS + Email × 10 triggers). Includes updating the existing 4 demo templates to final FLOW.md content.
- **Commit 3:** `docs(crm): update P5 session context and changelog` — SESSION_CONTEXT, CHANGELOG, ROADMAP
- **Commit 4:** `chore(spec): close P5_MESSAGE_CONTENT with retrospective` — EXECUTION_REPORT.md + FINDINGS.md

---

## 10. Dependencies / Preconditions

- P3c+P4 CLOSED ✅ (commit `e8dad2c`, Foreman Review `43567bb`)
- Architecture v3 operational ✅ — `send-message` Edge Function deployed
- Make scenario 9104395 active ✅ (4-module send-only pipe)
- Demo tenant exists: slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- 4 existing demo templates in `crm_message_templates` (from P3b seed)
- `campaigns/supersale/FLOW.md` — complete source of all message content
- `campaigns/supersale/messages/*.html` — 10 HTML email templates (source files)
- DOC_FIX_PROMPT (P3c+P4 follow-up) should ideally run before or in parallel — but is NOT a blocker for P5

---

## 11. Lessons Already Incorporated

- FROM `P3C_P4 FOREMAN_REVIEW` §6 Proposal 1 → "Expected final state must reflect architecture changes to file roles" → APPLIED: §8 describes `crm-messaging-templates.js` changes precisely (variable format conversion, not new features), with ±10 line estimate since the change is a find-replace, not structural.
- FROM `P3C_P4 FOREMAN_REVIEW` §6 Proposal 2 → "Success criteria must be tested against the new architecture before dispatch" → APPLIED: All §3 criteria reference `%var%` format (the v3 standard), not `{{}}`. Criterion 6 explicitly checks that zero `{{` remain.
- FROM `P3A FOREMAN_REVIEW` §6 Proposal 1 → "± files buffer in Expected Final State" → APPLIED: §8 shows ±10 lines, no new files.
- FROM `P3A FOREMAN_REVIEW` §6 Proposal 2 → "Exact array positions for status insertions" → N/A (no status array changes in this SPEC).
- FROM `P3A FOREMAN_REVIEW` §7 Proposal 2 → "UI wiring smoke test before feature work" → APPLIED: Criterion 14 requires browser test confirming Templates sub-tab loads without errors.
- FROM `P3C_P4 FOREMAN_REVIEW` §7 Proposal 2 → "Master-doc update checklist as mandatory execution step" → APPLIED: §8 explicitly lists SESSION_CONTEXT + CHANGELOG as MUST-update docs. MASTER_ROADMAP is NOT updated in P5 (not a phase boundary for the master roadmap — P5 is a sub-phase within Go-Live).
- Cross-Reference Check completed 2026-04-22 against GLOBAL_MAP + GLOBAL_SCHEMA: 0 collisions. No new DB objects. Only INSERTs to existing `crm_message_templates` table and edits to existing `crm-messaging-templates.js`.

---

## 12. Technical Design

### Template Naming Convention

Each template is stored as a row in `crm_message_templates`. The `slug` field
uses the pattern `{base_slug}_{channel}_{language}`:

| Base Slug | Trigger | SMS | Email |
|-----------|---------|-----|-------|
| `lead_intake_new` | New lead registered | `lead_intake_new_sms_he` | `lead_intake_new_email_he` |
| `lead_intake_duplicate` | Duplicate lead attempt | `lead_intake_duplicate_sms_he` | `lead_intake_duplicate_email_he` |
| `event_will_open_tomorrow` | Event status → "Will open tomorrow" | `event_will_open_tomorrow_sms_he` | `event_will_open_tomorrow_email_he` |
| `event_registration_open` | Event status → "Registration Open" | `event_registration_open_sms_he` | `event_registration_open_email_he` |
| `event_invite_new` | Event status → "Invite New ppl" | `event_invite_new_sms_he` | `event_invite_new_email_he` |
| `event_closed` | Event status → "Closed" | `event_closed_sms_he` | `event_closed_email_he` |
| `event_waiting_list` | Event status → "Waiting list" | `event_waiting_list_sms_he` | `event_waiting_list_email_he` |
| `event_2_3d_before` | Event status → "2-3d Before" | `event_2_3d_before_sms_he` | `event_2_3d_before_email_he` |
| `event_day` | Event status → "Event Day" | `event_day_sms_he` | `event_day_email_he` |
| `event_invite_waiting_list` | Event status → "Invite Waiting list" | `event_invite_waiting_list_sms_he` | `event_invite_waiting_list_email_he` |

Total: **20 templates** (10 base slugs × 2 channels).

**Note on slug composition:** The `send-message` Edge Function composes the
full slug as `{template_slug}_{channel}_{language}`. So the caller passes
`template_slug='event_registration_open'`, `channel='sms'`, `language='he'`
and the function looks up `event_registration_open_sms_he`. The SPEC stores
templates with the FULL slug to match this lookup.

### SMS Content Source

All SMS text comes directly from `campaigns/supersale/FLOW.md`. The executor
copies the text verbatim, replacing Make variables with `%var%` equivalents:

| Make variable | Optic Up variable |
|--------------|-------------------|
| `{{name}}` / `{{1.fields.name.raw_value}}` / `{{3.name}}` / etc. | `%name%` |
| `{{shortURL}}` / `{{shortURL_unsubscribe}}` | `%unsubscribe_url%` |
| `{{shortURL_registration}}` / `{{33.shortURL}}` | `%registration_url%` |
| `{{event_name}}` / `{{2.name}}` | `%event_name%` |
| `{{event_date}}` / `{{2.mappable_column_values.date_...}}` | `%event_date%` |
| `{{event_hours}}` / `{{2.mappable_column_values.text_...}}` | `%event_time%` |
| `{{coupon}}` / `{{coupon_code}}` | `%coupon_code%` |

### HTML Email Content Source

All HTML emails come from `campaigns/supersale/messages/*.html`. The executor:

1. Reads each HTML file
2. Replaces all Make-format variables (`{{1.fields.name.raw_value}}`,
   `{{3.name}}`, `{{137.name}}`, etc.) with the corresponding `%var%`
3. Removes Make-specific comments (the `<!-- Variables: ... -->` header)
4. Stores the full HTML as the `body` field in `crm_message_templates`
5. Extracts the `Subject:` line from the HTML comment header and stores it
   in the `subject` field

**Hardcoded business values in HTML:** The existing HTML emails contain
hardcoded Prizma-specific content (address, phone, WhatsApp, links). These
are **kept as-is for now** — they are campaign-specific content, not
configurable SaaS values. A future SaaS-ification SPEC will templatize them
with additional variables. For P5, the emails work correctly for Prizma's
SuperSale campaign.

### HTML-to-Slug Mapping

| HTML file | Base slug | Email subject |
|-----------|-----------|---------------|
| `email-welcome.html` | `lead_intake_new` | `%name%, ההרשמה למערכת אירועי המכירות נקלטה בהצלחה,הנה מה שקורה הלאה ✔️` |
| `email-already-registered.html` | `lead_intake_duplicate` | `היי %name%, נרשמת למערכת האירועים בעבר!` |
| `email-will-open-tomorrow.html` | `event_will_open_tomorrow` | `פתיחת הרשמה לאירוע המכירות - עדכון` |
| `email-registration-open.html` | `event_registration_open` | `ההרשמה נפתחה: %event_name% - כל הפרטים 👇` |
| `email-invite-new.html` | `event_invite_new` | `ההרשמה פתוחה: %event_name% - נא אשרו הגעה` |
| `email-closed.html` | `event_closed` | `אירוע המכירות - ההרשמה נסגרה` |
| `email-waiting-list.html` | `event_waiting_list` | `עדכון סטטוס רישום: אירוע המותגים %event_name% הגיע למכסה הראשונית` |
| `email-2-3d-before.html` | `event_2_3d_before` | `%name%, האירוע מתקרב - הכל מוכן 💛` |
| `email-event-day.html` | `event_day` | `%name%, היום זה קורה: מחכים לך באופטיקה פריזמה.` |
| `email-invite-waiting-list.html` | `event_invite_waiting_list` | `עדכון חשוב: נפתח מועד נוסף לאירוע המותגים של אופטיקה פריזמה` |

### UI Variable Fix (`crm-messaging-templates.js`)

The VARIABLES array (line ~11–21) currently uses `{{var}}` format. Change to:

```javascript
var VARIABLES = [
  { key: '%name%',              desc: 'שם הלקוח' },
  { key: '%phone%',             desc: 'טלפון' },
  { key: '%email%',             desc: 'אימייל' },
  { key: '%event_name%',        desc: 'שם האירוע' },
  { key: '%event_date%',        desc: 'תאריך האירוע' },
  { key: '%event_time%',        desc: 'שעות האירוע' },
  { key: '%event_location%',    desc: 'מיקום האירוע' },
  { key: '%coupon_code%',       desc: 'קוד קופון' },
  { key: '%registration_url%',  desc: 'קישור הרשמה' },
  { key: '%unsubscribe_url%',   desc: 'קישור הסרה' }
];
```

And update `substitute()` (line ~253–264) to use `%var%` regex:

```javascript
function substitute(text) {
  return String(text || '')
    .replace(/%name%/g, 'דנה כהן')
    .replace(/%event_name%/g, 'סופר-סייל אוקטובר')
    .replace(/%event_date%/g, '01.11.2026')
    .replace(/%event_time%/g, '09:00 - 14:00')
    .replace(/%event_location%/g, 'הרצל 32, אשקלון')
    .replace(/%coupon_code%/g, 'SuperSale24')
    .replace(/%phone%/g, '050-717-5675')
    .replace(/%email%/g, 'dana@example.com')
    .replace(/%registration_url%/g, 'prizma-optic.co.il/r/...')
    .replace(/%unsubscribe_url%/g, 'prizma-optic.co.il/u/...');
}
```

---

## 13. Execution Sequence

### Step 1: UI Variable Format Fix (Commit 1)

1. Read `modules/crm/crm-messaging-templates.js`
2. Replace VARIABLES array with `%var%` format (see §12)
3. Replace `substitute()` function with `%var%` regex (see §12)
4. Add `%email%` to VARIABLES array (position 3, after `%phone%`)
5. Verify file ≤350 lines
6. Commit: `fix(crm): convert template editor variables from {{}} to %var% format`

### Step 2: Seed All Templates (Commit 2)

For each of the 10 base slugs in §12:

**SMS templates:**
1. Read the SMS text from `campaigns/supersale/FLOW.md` for the corresponding trigger
2. Replace all Make variables with `%var%` equivalents per the mapping table in §12
3. INSERT into `crm_message_templates` with full slug, channel='sms', language='he'

**Email templates:**
1. Read the HTML file from `campaigns/supersale/messages/`
2. Replace all Make-format variables with `%var%` equivalents
3. Extract the subject line from the HTML comment header
4. Replace Make variables in the subject line too
5. INSERT into `crm_message_templates` with full slug, channel='email', language='he', subject, body=HTML

**For the 4 existing templates** (`lead_intake_new` + `lead_intake_duplicate` × SMS + Email):
- UPDATE their body and subject to match the final FLOW.md content (they may have placeholder content from P3b)

**Verification after seed:**
- Run criterion 2 (count ≥20)
- Run criterion 6 (zero `{{` in bodies)
- Spot-check criterion 7 (body contains `%name%`)

Commit: `feat(crm): seed all SuperSale message templates on demo tenant`

**Important:** The SQL INSERT statements should be saved as a reference file at
`modules/Module 4 - CRM/go-live/seed-templates-demo.sql` so the seed can be
re-run if needed (e.g., after a demo tenant cleanup). This file is committed
alongside the seed execution.

### Step 3: Browser QA (no commit)

1. Open CRM on demo tenant
2. Navigate to Messaging Hub → Templates sub-tab
3. Verify: template list loads with ≥20 templates
4. Click a template → verify editor opens with correct content
5. Verify: variable dropdown shows `%var%` format
6. Verify: 3-panel preview substitutes variables correctly
7. Zero console errors

**Note:** If running on Cowork (no localhost access), this step must document
what needs manual verification and defer actual browser testing to Claude Code
or Daniel. Do not claim browser QA passed if you couldn't access the browser.

### Step 4: Documentation (Commit 3)

1. Update `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P5 CLOSED
2. Update `modules/Module 4 - CRM/go-live/ROADMAP.md` — P5 ✅

Commit: `docs(crm): update P5 session context and changelog`

### Step 5: Retrospective (Commit 4)

Write `EXECUTION_REPORT.md` + `FINDINGS.md` in this SPEC folder.

Commit: `chore(spec): close P5_MESSAGE_CONTENT with retrospective`
