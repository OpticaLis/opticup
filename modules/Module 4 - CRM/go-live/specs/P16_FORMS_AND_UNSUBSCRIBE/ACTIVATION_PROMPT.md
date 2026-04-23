# Claude Code — Execute P16 Forms & Unsubscribe SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P16 makes three customer-facing links in CRM messages actually work:
1. Unsubscribe link — fix EF to also set `status='unsubscribed'` + branded HTML
2. Event registration form — build the form matching Daniel's Monday form
3. Registered tab — default-hide unsubscribed leads

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P16_FORMS_AND_UNSUBSCRIBE/SPEC.md`

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully
3. **Schema check for attendee columns:**
   ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'crm_event_attendees'
   ORDER BY ordinal_position;
   ```
   Look for: `eye_exam`, `preferred_arrival_time`, `notes`, `metadata`, or any
   JSON column that can store form data. If none exist → store in a `notes`
   text column or report as stop-trigger.
4. **Verify GitHub Pages serves static files from modules/crm/public/:**
   Check if the path resolves. If not → use Edge Function approach instead.
5. **Verify logo URL:**
   ```
   curl -sI https://www.prizma-optic.co.il/images/logo.png | head -5
   ```
   If 404 → find correct logo URL or use inline.
6. Start `localhost:3000`, verify CRM loads
7. **Only approved phones:** `+972537889878`, `+972503348349`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Track A — Unsubscribe Flow Fix (1 commit)

1. Edit `supabase/functions/unsubscribe/index.ts`:
   - Add `status: 'unsubscribed'` to the UPDATE call (line ~154)
   - Improve `htmlPage` — add logo, ✅ icon, brand colors
2. Deploy: `supabase functions deploy unsubscribe --project-ref tsxrrxzmdxaenlvocyit`
3. Test with curl:
   - Generate a valid token (or use the send-message EF to send a test
     message to an approved phone, then extract the unsubscribe URL)
   - Verify DB: both `unsubscribed_at` AND `status='unsubscribed'` set
4. Restore test lead status after testing
5. Commit: `fix(crm): unsubscribe EF sets status + branded HTML`

**Checkpoint 1:** Report results.

### Track B — Registered Tab Filter (1 commit)

1. Edit `modules/crm/crm-leads-tab.js`:
   - In the default filter path (when no status checkboxes are selected),
     exclude `status === 'unsubscribed'` leads
2. Verify on localhost:
   - Default view: no unsubscribed leads
   - Select "unsubscribed" in status filter: they appear
3. Commit: `feat(crm): default-exclude unsubscribed from registered tab`

**Checkpoint 2:** Report results.

### Track C — Event Registration Form (1 commit)

1. Create `modules/crm/public/event-register.html` (standalone HTML):
   - Match the design from Daniel's screenshot (see SPEC §C1)
   - Fields: arrival time dropdown, eye exam dropdown, notes textarea
   - Pre-filled from URL params: `?event_id=X&lead_id=Y`
   - Submit calls `register_lead_to_event` RPC via Supabase JS
   - Success popup: "ההרשמה בוצעה בהצלחה!"
   - Store form field values (eye_exam, arrival_time, notes) in attendee
     record — use whatever column exists (notes/metadata/dedicated)
2. Wire `%registration_url%` in `crm-automation-engine.js` `buildVariables`:
   - Add `registration_form_url` to the event SELECT
   - Build URL: `app.opticalis.co.il/modules/crm/public/event-register.html?event_id=X&lead_id=Y`
3. Test: create a test event, register a lead via the form, verify popup
   and DB row
4. Clean test data
5. Commit: `feat(crm): event registration form + wire %registration_url%`

**Checkpoint 3:** Report results.

---

## Key Rules

- **Only approved phones:** `+972537889878`, `+972503348349`
- **Demo tenant only** for testing
- **Rule 12:** all files ≤ 350 lines
- **Clean ALL test data** at end
- **3 separate commits** — one per track

---

*End of ACTIVATION_PROMPT — P16_FORMS_AND_UNSUBSCRIBE*
