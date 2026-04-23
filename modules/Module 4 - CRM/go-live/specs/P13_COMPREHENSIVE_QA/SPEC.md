# SPEC — P13_COMPREHENSIVE_QA

> **Location:** `modules/Module 4 - CRM/go-live/specs/P13_COMPREHENSIVE_QA/SPEC.md`
> **Author:** opticup-strategic (Foreman) / Cowork session happy-elegant-edison
> **Date:** 2026-04-23
> **Module:** Module 4 — CRM
> **Priority:** P0 (blocker for P7 Prizma cutover)
> **Executor:** Claude Code local (Windows desktop) — requires localhost:3000 + chrome-devtools MCP
> **Previous SPEC harvest:** P10, P11, P12 FOREMAN_REVIEW proposals

---

## 1. Classification

**Type:** QA + Hotfix (test-and-fix-in-place)

**Why this SPEC:** Daniel tested P12 and discovered that activity log entries from
a message he just sent don't appear in the Activity Log tab. Beyond that, no
comprehensive end-to-end QA has ever been run that walks the ENTIRE CRM lifecycle
in one continuous session while verifying that every step (1) works visually, (2)
creates the expected DB records, (3) fires the correct automation rules, (4) sends
messages via the Edge Function, (5) writes activity log entries, and (6) shows those
entries in all the places they should appear (messaging log, lead detail messages
tab, activity log tab). P6 tested the messaging pipeline but pre-dated P8 (automation
engine), P9 (advanced filtering, edit, send dialog), P10 (phone normalization,
unsubscribe), P11 (broadcast upgrade), and P12 (activity log + board radio). This
SPEC tests everything together.

**This SPEC also authorizes hotfixes.** If a step fails, the executor should diagnose
the root cause and fix it in place (subject to the Iron Rules and scope guardrails
below). Each fix is a separate commit with its own rationale. If a fix would require
schema changes, Edge Function changes, or touching >3 files — STOP and log it as a
Finding instead.

---

## 2. Daniel's Exact Request (Hebrew)

> שיעשה QA מקיף שיבדוק את כל הפלואו מהתחלה ועד הסוף ויוודא שהכל עובד כמו שצריך
> כולל הלוגים. שיראה שליד נכנס הוא מקבל את המייל שצריך עם ההודעה. מעבר ידני של
> הליד לרשומים. הודעה כלשהי לבורד הרשומים סטטוס מסויים. פתיחת אירוע ושליחת הודעה.
> רישום לאירוע. ממש עד הסוף עד עידכון סכום הקניה ולבדוק שזה מתעדכן באירוע
> והסגירה של האירוע. שיבדוק את כל הוריאציות של הפלואו, יתן המלצות לתיקונים
> ושיפורים. אם יש מה לתקן שיתקן על הדרך. חייב לעשות את זה לפני המעבר לפריזמה.
> כמו כן, שיוודא שהוא יכול ליצור לבד את כל ההודעות המתוזמנות שקיימות במערכת
> שעברו מהמערכת הקודמת.

---

## 3. Goals

1. **Full lifecycle QA** — walk every CRM flow from lead intake to event closure,
   verifying each step visually (screenshot) + in the DB + in activity logs.
2. **Activity Log verification** — confirm that EVERY action creates an activity
   log entry and that those entries appear in the Activity Log tab.
3. **Automation rules recreation** — create each of the 10 automation rules from
   scratch using the Rules UI, proving Daniel can self-serve them.
4. **Hotfix on the fly** — fix any bugs found during QA without stopping the run
   (within scope guardrails).
5. **Produce a QA report** — a clear pass/fail checklist Daniel can review.

---

## 4. Autonomy Level

**MAXIMUM AUTONOMY — with fix-in-place authorization.**

### Stop triggers (ONLY these):
1. Activity log table does not exist in Supabase → STOP (schema problem)
2. localhost:3000 does not serve crm.html → STOP (server problem)
3. A fix would require schema DDL, Edge Function changes, or touching >3 files → STOP and log as Finding

### Do NOT stop for:
- Bugs found during QA → fix them (within guardrails), commit, continue
- Missing/wrong activity log entries → diagnose, fix the code, commit, continue
- UI rendering issues → fix if <3 files, log as Finding if larger
- Automation rules not firing → diagnose, fix, commit, continue

---

## 5. Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read this SPEC fully
3. Start `localhost:3000`, verify CRM loads at `crm.html?t=demo`
4. **Verify demo baseline:**
   ```sql
   SELECT 'leads' as entity, count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted = false
   UNION ALL SELECT 'events', count(*) FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   UNION ALL SELECT 'attendees', count(*) FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   UNION ALL SELECT 'log_rows', count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   UNION ALL SELECT 'activity_log', count(*) FROM activity_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   UNION ALL SELECT 'rules', count(*) FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true
   UNION ALL SELECT 'templates', count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true
   UNION ALL SELECT 'broadcasts', count(*) FROM crm_broadcasts WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
   Record baseline numbers. These will be used to verify cleanup at end.
5. **Record activity_log baseline count** — may have entries from prior sessions.
   Note the count; all new entries created during QA will be verified above this baseline.
6. **Only approved test phones:** `+972537889878`, `+972503348349`. No exceptions.

**If pre-flight passes → GO. Do not stop again (except for the 3 stop triggers).**

---

## 6. QA Flow — Step by Step

Every step must verify THREE things:
- **Visual:** Screenshot or DOM check confirming the UI shows the expected state
- **DB:** SQL query confirming the database record was created/updated correctly
- **ActivityLog:** SQL query confirming `activity_log` has a new entry with the correct
  `action`, `entity_type`, `entity_id`, and `details`

### Phase 1 — Lead Intake & Management

#### Step 1: Lead intake via Edge Function
- POST to `lead-intake` EF with phone `+972503348349`, name "P13 QA Lead",
  email "p13test@example.com", tenant_slug "demo"
- **Expect:** HTTP 200 or 409. If 409 (duplicate), the lead already exists — skip creation.
  If 200 — new lead in `crm_leads` with `status='new'`, `source='supersale_form'`.
- **Expect:** 2 message log rows dispatched (`lead_intake_new` or `lead_intake_duplicate`,
  SMS + Email). Verify in `crm_message_log`.
- **ActivityLog:** Lead intake happens server-side (Edge Function), so no client-side
  activity log entry is expected here. Note this gap as INFO (not a bug).

#### Step 2: View the lead in CRM UI
- Navigate to `crm.html?t=demo`
- Click "לידים נכנסים" tab
- **Expect:** The new lead appears in the table with the correct phone, status, date (HH:MM)
- Screenshot the tab

#### Step 3: Manual lead creation
- Click "+ הוסף ליד" button
- Fill: name "P13 Manual Lead", phone "0537889878", email "manual@example.com"
- **Expect:** Phone normalized to `+972537889878`. If duplicate detected → toast "ליד עם
  מספר טלפון זה כבר קיים". If not → lead created with `status='pending_terms'`,
  `source='manual'`.
- **ActivityLog:** Check for `crm.lead.create` entry with correct `entity_id` and
  `details.phone`.

#### Step 4: Edit a lead
- Click on a lead row → detail modal opens
- Click "ערוך" → edit modal opens
- Change city to "P13 Test City", save
- **Expect:** `crm_leads.city = 'P13 Test City'`, `updated_at` refreshed
- **ActivityLog:** Check for `crm.lead.update` entry with `details` showing changed fields

#### Step 5: Add a note
- In lead detail modal → "הערות" tab
- Type "P13 QA note test" and submit
- **Expect:** New row in `crm_lead_notes` with the text
- **ActivityLog:** Check for `crm.lead.note_add` entry

#### Step 6: Change lead status
- In lead detail header → click status badge → dropdown opens
- Change status (e.g., `new` → `contacted`)
- **Expect:** `crm_leads.status` updated, note inserted "סטטוס שונה מ-X ל-Y"
- **ActivityLog:** Check for `crm.lead.status_change` with `details.from` and `details.to`

#### Step 7: Transfer lead to Tier 2
- On incoming tab → click "אשר ✓" button on a lead
- **Expect:** If `terms_approved=false` → blocked with toast. Set terms_approved=true
  via SQL first, then retry. Lead moves to registered tab with `status='waiting'`.
- **ActivityLog:** Check for `crm.lead.move_to_registered` entry

#### Step 8: Send a message via quick-send dialog
- On lead detail → click the SMS/message button
- Select channel (SMS), type a short message, send
- **Expect:** `crm_message_log` row with `status='sent'`, correct lead_id
- **ActivityLog:** Messaging dispatch is Edge Function side — check if any client-side
  activity log entry exists for message sends. If not, note as recommendation.

### Phase 2 — Advanced Filtering & Broadcast

#### Step 9: Test advanced filters on registered tab
- Click "רשומים" tab → open "סינון מתקדם"
- Test: multi-status filter, date range, source filter
- **Expect:** Table rows filter correctly. Filter chips appear. "נקה הכל" clears.
- Screenshot the filtered state

#### Step 10: Broadcast wizard — single board (radio)
- Open Messaging Hub → "שליחה ידנית" tab → start wizard
- **Expect:** Step 1 shows RADIO buttons (not checkboxes) for board selection
- Select "רשומים" → verify status checkboxes show only Tier 2 statuses
- Select a status → verify recipient count updates
- Click recipient count → preview popup opens with correct leads
- Continue to step 3 → verify variable panel shows with copy-to-clipboard
- Complete broadcast (template or raw mode)
- **Expect:** `crm_broadcasts` row with `status='completed'`, correct `total_sent`
- **Expect:** `crm_message_log` rows for each recipient
- Screenshot the completed wizard

#### Step 11: Broadcast wizard — by event
- Start new broadcast → select "לפי אירוע" radio
- **Expect:** Event multi-select appears, status checkboxes hidden
- Select an event → verify recipient count
- Complete or cancel (if no event exists yet, defer to after Phase 3)

### Phase 3 — Events Lifecycle

#### Step 12: Create an event
- Events tab → "יצירת אירוע +" button
- Fill: campaign (supersale), name "P13 QA Event", date (future), location, capacity
- **Expect:** Event created with auto-number, `status='planning'`
- **ActivityLog:** Check for `crm.event.create` entry

#### Step 13: Change event status — registration_open
- Event detail → "שנה סטטוס" → `registration_open`
- **Expect:** Status badge updates
- **Expect:** Automation rule #2 fires → messages sent to Tier 2 leads (SMS+Email)
- **Expect:** `crm_message_log` rows with template `event_registration_open`
- **ActivityLog:** Check for `crm.event.status_change` with `details.to='registration_open'`

#### Step 14: Register a lead to the event
- Event detail → attendees tab → "רשום משתתף +"
- Search for a lead → click to register
- **Expect:** `register_lead_to_event` RPC returns `registered` or `waiting_list`
- **Expect:** Automation rule #9 or #10 fires → confirmation SMS+Email
- **Expect:** `crm_message_log` rows with template `event_registration_confirmation`
- Screenshot the attendee in the list

#### Step 15: Change event status — invite_new
- Change event status to `invite_new`
- **Expect:** Automation rule #3 fires → messages to Tier 2 (excl registered)
- **Expect:** `crm_message_log` rows with template `event_invite_new`
- **ActivityLog:** Check for `crm.event.status_change` with `details.to='invite_new'`

#### Step 16: Event Day operations
- Change event status to `event_day`
- Navigate to Event Day view
- **Expect:** 5 counter cards, 3-column layout, barcode scanner area
- Check in an attendee (if UI supports it)
- Record a purchase amount (if UI supports it)
- **Expect:** `crm_event_attendees.checked_in_at` set, `purchase_amount` updated
- **Expect:** Event revenue/stats update in event detail KPI cards
- Screenshot the Event Day view

#### Step 17: Close the event
- Change event status to `closed`
- **Expect:** Automation rule #4 fires → messages to attendees
- **Expect:** Event detail shows final stats (total attendees, revenue, etc.)
- **ActivityLog:** Check for `crm.event.status_change` with `details.to='closed'`

### Phase 4 — Activity Log Tab Verification

#### Step 18: Verify Activity Log tab
- Click "לוג פעילות" tab
- **Expect:** All activity log entries from Steps 3-17 appear in the table
- Test filters: filter by "לידים" → only lead actions shown
- Filter by "אירועים" → only event actions shown
- Filter by date range → correct subset
- Clear filters → all entries visible
- Click a row → expanded details JSON shown
- **Expect:** Employee names shown (not UUIDs) where applicable
- Screenshot the activity log tab with entries

#### Step 19: Cross-check counts
- Count activity log entries in the tab vs DB:
  ```sql
  SELECT action, count(*) FROM activity_log
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND created_at > '[baseline_timestamp]'
  GROUP BY action ORDER BY action;
  ```
- Every action performed in Steps 3-17 that has an `ActivityLog.write` call
  should have a corresponding row. List any gaps.

### Phase 5 — Automation Rules Self-Service

#### Step 20: Delete all existing automation rules (UI)
- Messaging Hub → "כללי אוטומציה" tab
- For each rule: edit → delete (or disable)
- **Expect:** 0 active rules after deletion
- Verify: `SELECT count(*) FROM crm_automation_rules WHERE tenant_id = '...' AND is_active = true` → 0

#### Step 21: Recreate all 10 rules from the UI
- Using the Rules UI, recreate each of the 10 rules from `seed-automation-rules-demo.sql`:
  1. שינוי סטטוס: ייפתח מחר → `event_will_open_tomorrow`, SMS+Email, tier2_excl_registered
  2. שינוי סטטוס: נפתחה הרשמה → `event_registration_open`, SMS+Email, tier2
  3. שינוי סטטוס: הזמנה חדשה → `event_invite_new`, SMS+Email, tier2_excl_registered
  4. שינוי סטטוס: אירוע נסגר → `event_closed`, SMS+Email, attendees
  5. שינוי סטטוס: רשימת המתנה → `event_waiting_list`, SMS+Email, attendees_waiting
  6. שינוי סטטוס: 2-3 ימים לפני → `event_2_3d_before`, SMS+Email, attendees
  7. שינוי סטטוס: יום אירוע → `event_day`, SMS+Email, attendees
  8. שינוי סטטוס: הזמנה ממתינים → `event_invite_waiting_list`, SMS+Email, attendees_waiting
  9. הרשמה: אישור הרשמה → `event_registration_confirmation`, SMS+Email, trigger_lead
  10. הרשמה: אישור רשימת המתנה → `event_waiting_list_confirmation`, SMS+Email, trigger_lead
- For each rule: fill trigger type dropdown, condition, recipient type, template slug, channels
- **Expect:** 10 active rules after recreation
- Verify: `SELECT name, trigger_entity, trigger_event, is_active FROM crm_automation_rules WHERE tenant_id = '...' ORDER BY sort_order` → 10 rows matching the seed

#### Step 22: Test a recreated rule fires correctly
- Change an event status (e.g., `planning` → `registration_open`) using the same
  event from Phase 3
- **Expect:** The UI-created rule fires just like the seeded version
- **Expect:** Message log rows appear with correct template + status=sent

### Phase 6 — Messaging Hub Verification

#### Step 23: Message log completeness
- Messaging Hub → "היסטוריה" tab
- **Expect:** All messages sent during this QA session appear with:
  - Lead name + phone
  - Channel (SMS/Email)
  - Template name
  - Status (sent/failed)
  - Click-to-expand shows full content
- Screenshot the log

#### Step 24: Lead detail messages tab
- Open a lead that received messages → detail modal → "הודעות" tab
- **Expect:** Per-lead message history with HH:MM timestamps, channel, status

#### Step 25: Template variable verification
- Templates tab → click a template → preview
- **Expect:** 3-panel preview (SMS/Email) with variables substituted
- Click "משתנים ▾" → collapsible panel shows all 10 variables
- Click a variable → copied to clipboard (toast "הועתק: %var%")

### Phase 7 — Cleanup & Report

#### Step 26: Clean ALL test data
- Delete all test data created during this QA session:
  ```sql
  -- Delete in correct order (foreign keys)
  DELETE FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND created_at > '[session_start]';
  DELETE FROM crm_broadcasts WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND created_at > '[session_start]';
  DELETE FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND created_at > '[session_start]';
  DELETE FROM activity_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND created_at > '[session_start]';
  DELETE FROM crm_lead_notes WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND created_at > '[session_start]';
  -- Restore leads to pre-QA state (revert status changes, remove test leads)
  -- Restore events to pre-QA state
  -- Restore automation rules to seeded state (re-run seed SQL if needed)
  ```
- Verify baseline matches pre-flight numbers from Step 5.5.
- **Only approved phones used throughout:** `+972537889878`, `+972503348349`

#### Step 27: Final verification
- Reload `crm.html?t=demo` → 0 console errors
- All 7 tabs load correctly
- `git status` → clean (all fixes committed)
- `wc -l modules/crm/*.js` → all files ≤ 350

---

## 7. Scope Guardrails

### In scope:
- All CRM JS files under `modules/crm/`
- `crm.html` (nav, sections, script tags)
- Hotfixes to any CRM file that fix bugs found during QA
- Activity log wiring additions if any actions are missing `ActivityLog.write`

### Out of scope (DO NOT TOUCH):
- `shared/js/activity-logger.js` (Module 1.5 owned)
- `supabase/functions/` (Edge Functions — log as Finding if EF-side issue)
- Make scenarios
- Schema DDL (no `CREATE TABLE`, no `ALTER TABLE`)
- `docs/MODULE_MAP.md`, `docs/GLOBAL_MAP.md` (Integration Ceremony)
- Files outside `modules/crm/` (except `crm.html`)
- `shared/js/shared.js`

### Fix authorization:
- **1-2 files touched, <20 lines changed:** Fix immediately, commit, continue
- **3 files touched:** Fix only if clearly correct, commit with detailed message
- **>3 files or architectural change:** Log as Finding, do NOT fix

---

## 8. File-Size Awareness

Current file sizes at risk:

| File | Lines | Headroom |
|------|-------|----------|
| `crm-leads-detail.js` | 335 | 15 lines — DO NOT add >15 lines |
| `crm-lead-modals.js` | ~336 | 14 lines |
| `crm-messaging-broadcast.js` | 316 | 34 lines |
| `crm-messaging-rules.js` | 311 | 39 lines |

If a fix pushes a file past 350 → split is needed → that's >3 files → log as Finding.

---

## 9. Commit Plan

| # | Phase | Message template |
|---|-------|-----------------|
| 1+ | Hotfixes found during QA | `fix(crm): [description of specific fix]` |
| N-1 | QA cleanup (if any test data SQL artifacts) | `chore(crm): P13 QA test data cleanup` |
| N | Documentation | `docs(crm): P13 comprehensive QA — update SESSION_CONTEXT + ROADMAP` |
| N+1 | Retrospective | `chore(spec): close P13_COMPREHENSIVE_QA with retrospective` |

Number of fix commits is unknown — depends on what QA finds. Each fix is its own commit.

---

## 10. Expected Deliverables

1. `EXECUTION_REPORT.md` — full QA results table (step × pass/fail × evidence)
2. `FINDINGS.md` — any issues that couldn't be fixed in-place
3. Recommendations list — UX improvements, missing features, polish items
4. Updated `SESSION_CONTEXT.md` and `ROADMAP.md`

---

## 11. Success Criteria Summary

| # | What to verify | Expected |
|---|---------------|----------|
| 1 | Lead intake EF dispatches messages | ≥2 log rows per intake |
| 2 | Manual lead creation with phone normalization | E.164 in DB, duplicate blocked |
| 3 | Lead edit saves to DB | `updated_at` refreshed |
| 4 | Note add creates `crm_lead_notes` row | Row exists |
| 5 | Status change updates DB + inserts note | Both verified |
| 6 | Tier 1→2 transfer works (with terms check) | Lead moves to registered |
| 7 | Quick-send dialog dispatches message | Log row with status=sent |
| 8 | Advanced filters work on registered tab | Correct filtering |
| 9 | Broadcast wizard uses radio for board | Radio inputs visible |
| 10 | Broadcast wizard sends to filtered recipients | Broadcasts + log rows created |
| 11 | Event creation with auto-number | Event in DB with number |
| 12 | Event status change fires automation rules | Message log rows created |
| 13 | Lead registration to event | Attendee + confirmation messages |
| 14 | Event Day: check-in + purchase | `checked_in_at` + `purchase_amount` set |
| 15 | Event close fires automation rules | Messages to attendees |
| 16 | Activity Log tab shows all entries | All actions visible + filterable |
| 17 | Activity log count matches DB count | Tab entries = DB rows |
| 18 | All 10 automation rules recreatable from UI | 10 rules created + functional |
| 19 | Message log shows all sent messages | Complete log with details |
| 20 | Lead detail messages tab works | Per-lead history visible |
| 21 | Template variables copy-to-clipboard | Toast + clipboard |
| 22 | Cleanup restores demo baseline | Counts match pre-flight |
| 23 | All CRM files ≤ 350 lines | `wc -l` confirms |
| 24 | 0 new console errors | DevTools clean |
| 25 | Only approved phones used | `+972537889878`, `+972503348349` |

---

## 12. Key Rules Reminder

- **Rule 12:** No file >350 lines
- **Rule 21:** No orphans/duplicates — check before adding any new function
- **Rule 22:** Defense-in-depth — every query includes `.eq('tenant_id', tid)`
- **Rule 8:** `escapeHtml()` on all user data in innerHTML
- **ONLY approved phones:** `+972537889878`, `+972503348349`
- **Demo tenant only:** `8d8cfa7e-ef58-49af-9702-a862d459cccb`

---

*End of SPEC — P13_COMPREHENSIVE_QA*
