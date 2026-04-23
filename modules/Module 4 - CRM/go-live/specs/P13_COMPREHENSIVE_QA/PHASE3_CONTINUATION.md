# Claude Code — Continue P13 Comprehensive QA (Phases 3–7)

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context — What Already Happened

Phases 1+2 (Steps 1–11) completed in the prior session. Two fixes shipped:

| Hash | Fix | Severity |
|------|-----|----------|
| `2598383` | Add missing tab titles for incoming + activity-log | cosmetic |
| `d17ff96` | Promote `ActivityLog` onto `window` so guards resolve truthy | **CRITICAL** — root cause of Daniel's bug report. All `ActivityLog.write` calls were silently skipped because `window.ActivityLog` was always falsy. One-line shim in `crm-helpers.js`. |

**Results summary:** 11 steps, 9 PASS, 2 FIXED. All lead management + filtering + broadcast flows work. Activity logging now fires correctly.

**5 Findings logged (to include in FINDINGS.md at Phase 7):**
1. (LOW) `crm.lead.update` details.fields_changed lists all form fields, not only actually-changed ones
2. (MEDIUM) Broadcast log rows have `broadcast_id=null` — breaks audit join
3. (INFO) Message dispatch doesn't write client-side `activity_log` entry
4. (INFO) Source dropdown shows raw slug `p5_5_seed` — no Hebrew translation
5. (PRE-EXISTING) One 404 on page load

**Demo state mutations still live (restore in Phase 7):**
- P55 Daniel Secondary (`efc0bd54`): `confirmed → pending_terms → waiting`. Original: `confirmed`.
- P55 ןהכ הנד (`f49d4d8e`): `waiting → confirmed`. Original: `waiting`.
- P55 ןהכ הנד: city `null → "P13 Test City (fixed)"`.
- P55 Daniel Secondary: `terms_approved` flipped false→true. Original: `true`.
- 1 broadcast row + 1 extra log row.
- 1 new note + 1 status-change auto-note + various `activity_log` entries.

---

## What To Do Now

**Continue P13 from Phase 3 through Phase 7.** Same SPEC: `modules/Module 4 - CRM/go-live/specs/P13_COMPREHENSIVE_QA/SPEC.md`

### Pre-flight for this session

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. `localhost:3000` running, CRM loads at `crm.html?t=demo`
3. **Verify the ActivityLog shim is live:**
   ```
   grep -n "window.ActivityLog" modules/crm/crm-helpers.js
   ```
   Should show the promotion line from commit `d17ff96`.
4. **Record current baseline** (same query as SPEC §5 step 4) — counts will include
   Phase 1+2 mutations. Note these so you can restore in Phase 7.
5. **Only approved phones:** `+972537889878`, `+972503348349`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Phase 3 — Events Lifecycle (Steps 12–17)

This is the heaviest phase. Now that the ActivityLog shim is live, `crm.event.create`
and `crm.event.status_change` entries should fire for the first time ever.

- **Step 12:** Create event "P13 QA Event" (campaign supersale, future date, capacity)
  → verify DB + `crm.event.create` activity log entry
- **Step 13:** Status → `registration_open` → automation rule #2 fires → SMS+Email to Tier 2
  → verify `crm_message_log` rows + `crm.event.status_change` activity log
- **Step 14:** Register a lead to event → `register_lead_to_event` RPC → rule #9 fires
  → confirmation SMS+Email → verify attendee row + log rows
- **Step 15:** Status → `invite_new` → rule #3 fires → messages to Tier 2 excl registered
  → verify log rows + activity log
- **Step 16:** Status → `event_day` → navigate to Event Day view → check-in an attendee
  → record purchase amount → verify `checked_in_at` + `purchase_amount` in DB
  → verify event stats update
- **Step 17:** Status → `closed` → rule #4 fires → messages to attendees → verify final
  event stats → activity log entry

**Fix any bugs found.** Each fix = separate commit, ≤3 files.

### Phase 4 — Activity Log Tab (Steps 18–19)

- **Step 18:** Click "לוג פעילות" tab → verify ALL activity log entries from Phases 1–3
  appear in the table. Test filters: "לידים" only, "אירועים" only, date range.
  Click a row → expanded details. Employee names shown (not UUIDs).
  **Screenshot the tab.**
- **Step 19:** Cross-check: count entries in tab vs DB query. List any gaps.

### Phase 5 — Automation Rules Self-Service (Steps 20–22)

- **Step 20:** Delete or disable all 10 existing automation rules from the UI.
  Verify: 0 active rules in DB.
- **Step 21:** Recreate all 10 rules from scratch using the Rules UI. The 10 rules are:
  1. ייפתח מחר → `event_will_open_tomorrow`, SMS+Email, tier2_excl_registered
  2. נפתחה הרשמה → `event_registration_open`, SMS+Email, tier2
  3. הזמנה חדשה → `event_invite_new`, SMS+Email, tier2_excl_registered
  4. אירוע נסגר → `event_closed`, SMS+Email, attendees
  5. רשימת המתנה → `event_waiting_list`, SMS+Email, attendees_waiting
  6. 2-3 ימים לפני → `event_2_3d_before`, SMS+Email, attendees
  7. יום אירוע → `event_day`, SMS+Email, attendees
  8. הזמנה ממתינים → `event_invite_waiting_list`, SMS+Email, attendees_waiting
  9. אישור הרשמה → `event_registration_confirmation`, SMS+Email, trigger_lead
  10. אישור רשימת המתנה → `event_waiting_list_confirmation`, SMS+Email, trigger_lead
  Verify: 10 active rules in DB.
- **Step 22:** Test one recreated rule fires → change event status, verify messages dispatched.

### Phase 6 — Messaging Hub (Steps 23–25)

- **Step 23:** "היסטוריה" tab → all messages from this QA visible with name, phone,
  channel, template, status, click-to-expand. **Screenshot.**
- **Step 24:** Lead detail → "הודעות" tab → per-lead message history with HH:MM.
- **Step 25:** Templates tab → click template → 3-panel preview. "משתנים ▾" panel →
  click variable → clipboard toast.

### Phase 7 — Cleanup & Report (Steps 26–27)

- **Step 26:** Restore ALL demo data to pre-P13 state:
  - Delete all `crm_message_log` rows created during P13
  - Delete all `crm_broadcasts` rows created during P13
  - Delete all `crm_event_attendees` rows created during P13
  - Delete all `activity_log` rows created during P13
  - Delete all `crm_lead_notes` rows created during P13 (keep pre-existing ones)
  - Delete any events created during P13
  - Restore lead statuses to originals:
    - `efc0bd54`: status → `confirmed`, terms_approved → `true`
    - `f49d4d8e`: status → `waiting`, city → `null`
  - Restore automation rules: if you deleted them in Step 20, re-seed from
    `go-live/seed-automation-rules-demo.sql` or ensure Step 21 recreated them correctly
  - Verify baseline matches pre-P13 state (use the pre-flight count query)
- **Step 27:** Final checks:
  - Reload `crm.html?t=demo` → 0 new console errors
  - All 7 tabs load correctly
  - `git status` → clean
  - `wc -l modules/crm/*.js` → all ≤ 350
  - Write `EXECUTION_REPORT.md` (full QA results table for ALL 27 steps including
    Phase 1+2 results from above) + `FINDINGS.md`

---

## Key Rules

- **ONLY approved phones:** `+972537889878`, `+972503348349`
- **Demo tenant only:** `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- **No EF changes. No schema DDL. Do NOT modify `shared/js/activity-logger.js`.**
- **Fix-in-place authorized** for ≤3 files per fix. Each fix = separate commit.
- **Rule 12:** All files must stay ≤350 lines.
- **DO NOT STOP** except for the 3 stop triggers (no activity_log table, no localhost, fix needs >3 files).
- **Clean ALL test data** at end. Verify baseline.
- **Take screenshots** at key visual verification points.

---

*End of PHASE3_CONTINUATION — P13_COMPREHENSIVE_QA*
