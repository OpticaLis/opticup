# SPEC — P9_CRM_HARDENING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P9_CRM_HARDENING/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** Go-Live P9
> **Author signature:** Cowork session happy-elegant-edison

---

## 1. Goal

End-to-end hardening of the CRM before Prizma cutover (P7). Three tracks in
one SPEC: (A) fix every known bug Daniel found during QA, (B) improve UX to
match the quality Daniel expects — timestamps with exact hours/minutes
everywhere, advanced multi-select filtering, working lead edit, email required
on lead creation, (C) full flow test proving the entire pipeline works from
lead intake through message dispatch. The executor must find and fix additional
issues beyond the explicit list — this SPEC grants broad autonomy for
improvements within the CRM module.

---

## 2. Background & Motivation

Daniel performed hands-on QA after P8 and found multiple issues that block
production readiness:

1. **Timestamps missing hours/minutes** — Daniel needs exact times (HH:MM) on
   every date display: when a lead was created, when a message was sent, when
   a note was added. Current code uses `formatDate` (date only) in several
   places instead of `formatDateTime` (date + HH:MM).

2. **Message history not showing** — log history tab and per-lead "הודעות" tab
   may show empty if no log rows exist on demo post-cleanup. The executor must
   verify both display correctly with real dispatched messages.

3. **Lead creation allows missing email** — the create-lead form requires only
   name + phone. Daniel says email is mandatory for every lead. Validation
   must enforce all three: full name, phone, AND email.

4. **SMS button opens system SMS app** — clicking "SMS" in the lead detail
   modal uses `sms:` protocol which opens the phone's native SMS. This should
   instead open a CRM send-message dialog (or at minimum be disabled with a
   tooltip explaining the correct flow).

5. **Edit lead button says "בקרוב"** — the edit button in lead detail shows a
   toast "עריכה — בקרוב" instead of opening an edit form. Lead editing must
   work: name, phone, email, city, language, notes.

6. **Filtering is too basic** — only single-status filter exists. Daniel wants:
   multi-status select (checkboxes), date range filter (created_at), "no
   response in 48h" filter, source filter. Both leads tabs (incoming + registered).

7. **Full flow verification** — the complete flow must be tested end-to-end:
   lead enters via `lead-intake` EF → appears in Tier 1 → status changes →
   transfers to Tier 2 → event registration → message dispatch via rules →
   message appears in log AND in per-lead history. Every step verified with
   exact timestamps.

---

## 3. Success Criteria (Measurable)

### Track A — Bug Fixes

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Lead creation form requires email | Submitting without email shows validation error | Browser QA: leave email empty, click save → error toast |
| 2 | Lead creation form validation message | Toast says "שם, טלפון ואימייל חובה" | Browser QA |
| 3 | SMS button in lead detail does NOT open native SMS app | Button either opens a CRM send dialog OR is replaced with a meaningful action | Browser QA: click SMS → no `sms:` navigation |
| 4 | Edit button in lead detail opens edit form | Click "ערוך" → modal/form with pre-filled lead data | Browser QA |
| 5 | Edit form allows changing: name, phone, email, city, language | All 5 fields editable and save updates the DB row | Browser QA + SQL verify |
| 6 | Edit saves correctly | After edit, lead detail refreshes and shows updated values | Browser QA |

### Track B — Timestamp & Display Improvements

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 7 | Lead detail "נוצר" row shows date + HH:MM | Format: `DD/MM/YYYY HH:MM` | Browser QA: lead detail → פרטים tab → "נוצר" row |
| 8 | Lead detail "עודכן" row shows date + HH:MM | Same format | Browser QA |
| 9 | Message log "תאריך" column shows HH:MM | Already uses `formatDateTime` — verify it works | Browser QA: Messaging Hub → היסטוריה |
| 10 | Per-lead messages tab shows HH:MM | Already uses `formatDateTime` — verify | Browser QA: lead detail → הודעות tab |
| 11 | Notes in lead detail show HH:MM | Already uses `formatDateTime` — verify | Browser QA: lead detail → הערות tab |
| 12 | Timeline entries show HH:MM (not just date) | Change `formatDate` → `formatDateTime` in timeline | Browser QA: lead detail → ציר זמן tab |
| 13 | Incoming leads table shows created_at with HH:MM | Date column includes time | Browser QA: לידים נכנסים tab |
| 14 | Registered leads table shows created_at with HH:MM | Date column includes time | Browser QA: רשומים tab |

### Track C — Advanced Filtering

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 15 | Status filter supports multi-select (checkboxes) | Can select 2+ statuses simultaneously, table shows union | Browser QA: registered tab → open filter → check 2 statuses |
| 16 | Date range filter exists (from–to) | Two date inputs, table filters by `created_at` range | Browser QA |
| 17 | "No response in 48h" filter exists | Toggle/checkbox, shows leads with no `crm_lead_notes` in last 48 hours | Browser QA |
| 18 | Source filter exists | Dropdown with sources from data (e.g., `supersale_form`, `manual`) | Browser QA |
| 19 | Filter chips update for all active filters | Each active filter shows a removable chip | Browser QA |
| 20 | Filters work on incoming tab too | Incoming tab has same filter controls (adapted to Tier 1 statuses) | Browser QA |
| 21 | Clear all filters button | Single click removes all active filters | Browser QA |
| 22 | Filter state persists during tab switches | Switch to events tab and back → filters still applied | Browser QA |

### Track D — Full Flow End-to-End Test

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 23 | `lead-intake` EF creates lead on demo | curl POST → 200/201, lead appears in DB | curl + SQL |
| 24 | New lead appears in Tier 1 (incoming tab) | Refresh → lead visible with correct name/phone/email | Browser QA |
| 25 | Lead created_at shows exact time (HH:MM) | Timestamp visible in table and detail | Browser QA |
| 26 | Manual lead creation works | "+ הוסף ליד" with all 3 required fields → lead created | Browser QA |
| 27 | Lead edit works on new lead | Edit name → save → name updated in table | Browser QA |
| 28 | Status change works | Change status via detail modal → note auto-created | Browser QA + SQL |
| 29 | Tier 1→2 transfer works | Click "אשר ✓" → lead moves to registered tab | Browser QA |
| 30 | Event registration works | Register transferred lead to a test event | Browser QA |
| 31 | Event status change triggers rule dispatch | Change event status → `CrmAutomation.evaluate` fires → messages logged | SQL: check `crm_message_log` |
| 32 | Dispatched messages appear in Messaging Hub log | Log tab shows the messages with lead name, phone, template, HH:MM | Browser QA |
| 33 | Dispatched messages appear in per-lead history | Lead detail → הודעות → shows the messages | Browser QA |
| 34 | Registration confirmation dispatched | Register lead → confirmation rule fires → log row | SQL |

### Track E — Executor Initiative (Broad Autonomy)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 35 | Executor documents all additional issues found | FINDINGS.md lists every issue discovered beyond the explicit list above | File exists with ≥0 findings |
| 36 | Executor fixes all fixable issues within scope | Issues that can be fixed without DDL or EF changes are fixed in the same run | EXECUTION_REPORT §"Additional Fixes" |
| 37 | Executor provides improvement proposals | EXECUTION_REPORT §"Improvement Proposals" has ≥3 concrete suggestions for further CRM improvements | File review |
| 38 | All CRM JS files ≤ 350 lines after changes | Rule 12 | `wc -l modules/crm/*.js` — all ≤350 |
| 39 | CRM page loads with 0 new console errors | Pre-existing only (favicon, Tailwind, GoTrueClient) | Browser QA |
| 40 | All test data cleaned at end | Demo restored to baseline | SQL verification |

---

## 4. Autonomy Envelope

### MAXIMUM AUTONOMY — This SPEC is designed for an overnight unattended run.

The executor has pre-authorization for ALL of the following without stopping:

- Read any file in the repo
- Modify any file under `modules/crm/` (all JS, the CSS files, `crm.html`)
- Run read-only SQL (Level 1) on demo tenant
- Run write SQL on demo tenant for test data (Level 2) — approved phones only
- Create new JS files under `modules/crm/` if needed for Rule 12 splits
- Add `<script>` tags to `crm.html` for new files
- Split any file that approaches 350 lines — pick natural boundaries
- Fix any bug discovered during testing — within CRM module scope
- Improve any UX element within CRM that is clearly substandard
- Refactor code for clarity when touching a function for a bug fix
- curl to the `lead-intake` Edge Function on demo tenant for flow testing
- Commit and push to `develop` freely
- Update `SESSION_CONTEXT.md` and `go-live/ROADMAP.md`

### What REQUIRES stopping (ONLY these — nothing else)

- Any schema change (DDL) — ALTER TABLE, CREATE TABLE, new columns
- Modifying any Edge Function (`supabase/functions/*/`)
- Modifying any file OUTSIDE `modules/crm/`, `crm.html`, `css/crm*.css`, `modules/Module 4 - CRM/`
- Any merge to `main`
- Any test data using phones NOT in `['+972537889878', '+972503348349']`
- Deleting a file (soft-deletes and renames are fine)

### Critical: DO NOT STOP for anything not listed above

This SPEC is designed for an overnight run. The executor MUST NOT stop to ask
questions except at the very beginning (pre-flight) if there is a genuine
critical blocker (e.g., demo tenant unreachable, localhost won't start). Once
past pre-flight, execute continuously until all 40 criteria are met. If an
individual criterion cannot be met without DDL or EF changes, skip it, log
it in FINDINGS.md with the reason, and continue to the next criterion.

---

## 5. Stop-on-Deviation Triggers

Only 4 hard stops (in addition to CLAUDE.md §9 globals):

1. If any test data uses a phone NOT in the approved list → STOP IMMEDIATELY
2. If any file exceeds 350 lines and cannot be split at a natural boundary → STOP
3. If `crm.html` fails to load entirely (blank page) → STOP
4. If the executor discovers a security vulnerability (exposed secrets, broken RLS) → STOP

Everything else: fix it, log it, keep going.

---

## 6. Rollback Plan

- **Code:** `git revert` P9 commits in reverse order.
- **Test data:** DELETE by `created_at` range or known phone numbers.
- **No DDL changes** — nothing to roll back in the schema.

---

## 7. Out of Scope (explicit)

- Schema changes (DDL) — no ALTER TABLE, no new tables
- Edge Function modifications (`lead-intake`, `send-message`)
- `shared.js` split (M5-DEBT-01 — separate SPEC)
- MODULE_MAP / GLOBAL_MAP updates (M4-DOC-06 — Integration Ceremony)
- WhatsApp channel support
- Unsubscribe endpoint
- Prizma tenant data operations (P7 scope)
- Scheduled reminders / timed rules (Level 2 automation)
- Lead-intake EF rule integration (M4-DEBT-P8-01)
- Storefront repo changes
- Anything outside the CRM module files

---

## 8. Expected Final State

### Modified files (estimated — executor may touch more within CRM scope)

- `modules/crm/crm-lead-modals.js` — email required in create form, edit modal added
- `modules/crm/crm-leads-detail.js` — SMS button fixed, edit button wired,
  `formatDate` → `formatDateTime` where needed
- `modules/crm/crm-lead-actions.js` — `updateLead` function added for edit saves
- `modules/crm/crm-leads-tab.js` — advanced filtering (multi-status, date range,
  48h filter, source filter, clear all)
- `modules/crm/crm-incoming-tab.js` — same filtering improvements
- `modules/crm/crm-helpers.js` — any shared helpers needed for filtering
- `crm.html` — filter UI elements in the filter bar area, script tags if new files
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P9 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P9 ✅

### New files (possible)
- `modules/crm/crm-lead-filters.js` — if filter logic needs extraction for Rule 12
- Any other Rule 12 splits the executor deems necessary

### Deleted files
None.

### DB state (demo tenant)
- 0 test data remaining at end (all cleaned)
- No schema changes

---

## 9. Commit Plan

Suggested grouping — executor may adjust for natural boundaries:

- **Commit 1:** `fix(crm): require email in lead creation, validate all 3 fields`
- **Commit 2:** `feat(crm): implement lead edit modal with 5-field form`
- **Commit 3:** `fix(crm): replace SMS native link with CRM action, fix timestamps to HH:MM everywhere`
- **Commit 4:** `feat(crm): advanced filtering — multi-status, date range, 48h no-response, source`
- **Commit 5:** `feat(crm): advanced filtering on incoming tab`
- **Commit 6:** `fix(crm): additional issues found during QA sweep` (executor initiative)
- **Commit 7:** `test(crm): full flow verification — lead intake through dispatch`
  (test data seeded, verified, cleaned — no code changes, just the test run
  documented in EXECUTION_REPORT)
- **Commit 8:** `docs(crm): mark P9 CLOSED — hardening + flow QA`
- **Commit 9:** `chore(spec): close P9_CRM_HARDENING with retrospective`

Budget: 9 commits ± 3 fix = max 12. Executor may merge or split commits as
natural boundaries dictate. Commit count criterion: 7–12 commits (per §9).

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|-----------|--------|-------------|
| P8 (Automation Engine) CLOSED | ✅ VERIFIED | FOREMAN_REVIEW.md 🟡 CLOSED WITH FOLLOW-UPS |
| 10 automation rules active on demo | ⚠️ UNVERIFIED | `SELECT count(*) FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → 10 |
| Demo tenant has ≥2 leads with approved phones | ⚠️ UNVERIFIED | Executor verifies at pre-flight |
| `localhost:3000` serves CRM | ASSUMED | Executor must start server |
| Chrome DevTools MCP available | ASSUMED | Required for browser QA |
| `lead-intake` EF deployed and reachable | ⚠️ UNVERIFIED | Executor verifies with a test curl |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| P8 FR §6 Proposal 1 — §3/§9 commit count consistency | §3 #40 range matches §9 | ✅ APPLIED — "7–12 commits" in §3 matches §9 range |
| P8 FR §7 Proposal 2 — split pre-authorized | §4 explicitly pre-authorizes splits | ✅ APPLIED |
| P6 FR §7 Proposal 1 — baseline measurement | File sizes marked ⚠️ UNVERIFIED | ✅ APPLIED |
| P6 FR §7 Proposal 2 — column verification | No seed SQL in this SPEC | N/A |
| P5.5 FR — approved phone check | Stop trigger #1 | ✅ APPLIED |

**Cross-Reference Check completed 2026-04-22: 0 new DB objects. Possible new
file `crm-lead-filters.js` — grepped, no collision. Possible new function
`openEditLeadModal` — grepped, no collision. `updateLead` — grepped, no collision.**

---

## 12. Technical Design

### 12.1 Bug Fix: Email Required on Lead Creation

**File:** `crm-lead-modals.js`

**Current (line 141):** email input has no `required` attribute.
**Current (line 188):** validation checks only `!nameVal || !phoneVal`.

**Fix:**
1. Add `required` to email input HTML.
2. Change validation to `!nameVal || !phoneVal || !emailVal`.
3. Change error toast to "שם, טלפון ואימייל חובה".
4. Trim email value before validation.

### 12.2 Bug Fix: SMS Button Opens Native App

**File:** `crm-leads-detail.js` (line 311-312)

**Current:** `window.location.href = 'sms:' + lead.phone` — opens native SMS.

**Fix options (executor picks best UX):**
- **Option A:** Replace with "שלח הודעה" that opens a mini send-message dialog
  using `CrmMessaging.sendMessage` (template or raw body). This is the full
  solution but adds ~30-50 lines.
- **Option B:** Replace with WhatsApp web link (`https://wa.me/972...`) for
  quick contact, alongside a "שלח מהמערכת" button. Simpler.
- **Option C:** Remove the SMS button entirely, keep only "שלח מהמערכת" that
  opens a channel picker (SMS/Email) and calls the send pipeline.

Executor chooses based on what integrates cleanly. Preference: Option A or C
(keep everything inside the CRM, don't route through external apps).

### 12.3 Feature: Lead Edit Modal

**File:** `crm-lead-modals.js` (add `openEditLeadModal`) +
`crm-lead-actions.js` (add `updateLead`)

**Design:**
- Reuse the create-lead modal structure but pre-fill with existing values.
- Fields: full_name, phone, email, city, language (dropdown), client_notes (textarea).
- Save calls `sb.from('crm_leads').update({...}).eq('id', leadId).eq('tenant_id', getTenantId())`.
- On success: Toast, close modal, refresh lead detail + table.
- Wire the "ערוך" button (line 313-314) to call `openEditLeadModal(lead)`.

**Rule 12 watch:** `crm-lead-modals.js` is 219 lines. Edit modal adds ~60-80
lines → ~280-300. Within ceiling.

### 12.4 Feature: Timestamps with HH:MM Everywhere

**Files:** `crm-leads-detail.js`, `crm-leads-tab.js`, `crm-incoming-tab.js`

**Audit needed:** the executor must grep all CRM files for `formatDate(` calls
(NOT `formatDateTime`) and assess each one:
- If it shows a timestamp the user needs to see exact time → change to `formatDateTime`
- If it shows a date-only field (e.g., event_date) → keep as `formatDate`

**Known instances to fix (from Cowork review):**
- `crm-leads-detail.js` line 232-233: `formatDate(lead.created_at)` and
  `formatDate(lead.updated_at)` → `formatDateTime`
- `crm-leads-detail.js` line 217: timeline `formatDate(it.date)` → `formatDateTime`
- Leads table and incoming table date columns — executor must check if they
  use `formatDate` and upgrade to `formatDateTime`

### 12.5 Feature: Advanced Filtering

**Files:** `crm-leads-tab.js` + `crm-incoming-tab.js` (+ optional new file)

**Current state:** single status dropdown + language dropdown + search + sort.

**Target state:**

1. **Multi-status select:** Replace the single `<select>` with a dropdown that
   has checkboxes. When multiple statuses are checked, filter shows the UNION.
   Implementation: custom dropdown div with checkboxes, not native `<select multiple>`.
   
2. **Date range filter:** Two `<input type="date">` fields ("מתאריך" / "עד תאריך").
   Filter by `created_at >= from && created_at <= to`.

3. **"No response in 48h" toggle:** Checkbox "ללא תגובה 48 שעות". Filters to
   leads where the latest `crm_lead_notes.created_at` is older than 48 hours
   OR the lead has zero notes. This requires loading notes count/latest-date
   alongside the leads query — executor decides implementation (JOIN, subquery,
   or client-side filter after loading notes).

4. **Source filter:** Dropdown populated from distinct `source` values in the
   loaded data.

5. **Clear all:** Button "נקה הכל" that resets all filters.

6. **Filter persistence:** Store active filters in a module-scoped variable
   (NOT localStorage). When switching tabs and coming back, filters restore.

**HTML changes to `crm.html`:** The filter bar area in the leads/incoming
sections needs the new inputs. Executor adds them inline (Tailwind classes,
RTL-aware). Keep it compact — a collapsible "סינון מתקדם" section is fine.

**Rule 12 watch:**
- `crm-leads-tab.js` is 312 lines. Advanced filtering adds ~60-100 lines →
  ~370-410. **Will likely need a split.** Pre-authorized: extract filtering
  logic to `crm-lead-filters.js` if needed.
- `crm-incoming-tab.js` is 215 lines. Same filter code but simpler (Tier 1
  statuses only). Should stay under 350 even with additions.

### 12.6 Full Flow End-to-End Test Protocol

After all code changes are committed, run this test sequence:

1. **Baseline snapshot:**
   ```sql
   SELECT count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-...';
   SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...';
   SELECT count(*) FROM crm_lead_notes WHERE tenant_id = '8d8cfa7e-...';
   ```

2. **Test 1 — Lead intake via EF:**
   ```bash
   curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake' \
     -H 'Content-Type: application/json' \
     -d '{"tenant_slug":"demo","name":"P9 Test Lead","phone":"0537889878","email":"p9test@test.com"}'
   ```
   Verify: HTTP 200/201 or 409 (duplicate). Check `crm_leads` for the row.

3. **Test 2 — Lead visible in incoming tab:**
   Browser: refresh `crm.html?t=demo` → לידים נכנסים → search "P9 Test" → visible.
   Verify: `created_at` shows date + HH:MM.

4. **Test 3 — Lead edit:**
   Click lead → detail → ערוך → change name to "P9 Test Lead Edited" → save.
   Verify: name updated in table and detail.

5. **Test 4 — Status change:**
   Change status from `new` to `pending_terms`. Verify note auto-created.

6. **Test 5 — Tier transfer:**
   Approve terms (if the flow supports it) or directly set `terms_approved=true`
   via SQL, then click "אשר ✓". Verify: lead moves to registered tab.

7. **Test 6 — Advanced filters:**
   Apply multi-status filter on registered tab. Apply date filter. Apply source
   filter. Verify each filters correctly. Clear all.

8. **Test 7 — Event registration:**
   Register the transferred lead to an existing event (or create one if needed).
   Verify: registration rule fires, confirmation message logged.

9. **Test 8 — Event status change dispatch:**
   Change event status (e.g., to `invite_new`). Verify: automation rules fire,
   messages appear in log with lead name + phone + HH:MM timestamp.

10. **Test 9 — Per-lead message history:**
    Open the test lead's detail → הודעות tab. Verify: dispatched messages
    visible with HH:MM.

11. **Cleanup:**
    Delete all test data created during P9:
    ```sql
    -- Delete in dependency order
    DELETE FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND content LIKE '%P9%';
    DELETE FROM crm_lead_notes WHERE tenant_id = '8d8cfa7e-...' AND lead_id IN (SELECT id FROM crm_leads WHERE full_name LIKE '%P9 Test%');
    DELETE FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-...' AND lead_id IN (SELECT id FROM crm_leads WHERE full_name LIKE '%P9 Test%');
    DELETE FROM crm_leads WHERE tenant_id = '8d8cfa7e-...' AND full_name LIKE '%P9 Test%';
    ```
    ⚠️ **UNVERIFIED COLUMNS — executor must verify column names via
    `information_schema.columns` before running cleanup SQL.**
    
    Verify baseline counts match pre-test snapshot.

### 12.7 Browser QA Protocol

After each commit group, verify on `localhost:3000/crm.html?t=demo`:

1. **After Commits 1-2 (bug fixes):** Create lead with email required → works.
   Edit lead → works. SMS button → no native app.
2. **After Commit 3 (timestamps):** All dates show HH:MM everywhere.
3. **After Commits 4-5 (filtering):** Multi-status, date range, 48h, source
   all work on both tabs. Filter chips show. Clear all works.
4. **After Commit 6 (additional fixes):** Whatever the executor found + fixed.
5. **After Commit 7 (flow test):** Full sequence documented in EXECUTION_REPORT.

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `crm-leads-tab.js` exceeds 350 after filter additions | HIGH | LOW | Pre-authorized split to `crm-lead-filters.js`. Natural boundary: filter logic vs table rendering. |
| "48h no response" filter requires loading notes per lead — slow on large datasets | MEDIUM | LOW | Prizma has ~900 leads. Client-side filter after loading notes counts is acceptable. Or use a single aggregate query. |
| Edit modal + validation changes push `crm-lead-modals.js` over 350 | LOW | LOW | Currently 219. Even +100 lines = 319. Unlikely to breach. |
| Lead-intake EF returns unexpected error during flow test | LOW | MEDIUM | Not a P9 bug — log in FINDINGS, continue testing other paths. |
| SMS button replacement (§12.2) design choice — multiple valid options | LOW | LOW | Executor picks, documents choice in EXECUTION_REPORT. |
| Filter UI takes too much horizontal space in RTL layout | MEDIUM | LOW | Use collapsible "סינון מתקדם" accordion. |

---

## 14. Executor Initiative Guidelines

This SPEC deliberately leaves room for the executor to find and fix issues
beyond the explicit list. Guidelines for what's in scope:

**FIX without asking:**
- Console errors/warnings in CRM code
- Missing `escapeHtml` calls (Rule 8)
- Broken UI elements (buttons that don't work, modals that don't close)
- Missing `tenant_id` on queries (Rule 22)
- Duplicate code that can be consolidated (Rule 21)
- Accessibility issues (missing labels, broken tab order)
- Toast messages that are unclear or missing
- CSS issues visible on the CRM page

**LOG in FINDINGS but do NOT fix:**
- Issues in Edge Functions or `shared.js`
- Schema issues requiring DDL
- Issues in other modules
- Performance issues requiring DB indexes

**PROPOSE in EXECUTION_REPORT:**
- At least 3 concrete improvement ideas for the CRM that would make it
  production-ready at a higher level. Think: what would a senior product
  manager want before showing this to a client? These go into §"Improvement
  Proposals" of the EXECUTION_REPORT.
