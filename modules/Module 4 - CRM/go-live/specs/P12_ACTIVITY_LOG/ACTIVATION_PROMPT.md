# Claude Code — Execute P12 Activity Log + Board Fix SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P12 has two tracks plus two quick fixes:

1. **Board radio fix** — broadcast wizard board selection changed from
   checkboxes (both boards selectable) to radio (incoming OR registered OR
   by-event). Daniel says sending to both boards simultaneously causes
   confusion and potential duplicates.

2. **Source dropdown fix** — P11 Finding M4-DATA-P11-01: dropdown had `site`
   but Prizma uses `supersale_form`. Rename to match actual data.

3. **ActivityLog wiring** — 6 CRM files (lead-actions, event-actions,
   leads-detail, incoming-tab, leads-tab, lead-modals) have ZERO
   `ActivityLog.write` calls. Wire logging into all create/update/delete/
   status-change actions.

4. **Activity Log tab** — new top-level CRM tab ("לוג פעילות") showing a
   filterable, paginated table of all `activity_log` entries for CRM entity
   types. Mirrors Monday.com's activity log.

**This SPEC is designed for an overnight unattended run.** Maximum autonomy.
Do NOT stop once past pre-flight.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P12_ACTIVITY_LOG/SPEC.md`

---

## Pre-Flight (ONLY place you may stop)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully — especially §12 Technical Design
3. Read all files you'll modify — verify line counts:
   - `crm-broadcast-filters.js` — ~279 lines
   - `crm-lead-actions.js` — ~251 lines
   - `crm-event-actions.js` — check current size
   - `crm-leads-detail.js` — ~344 lines (NEAR 350 CEILING)
   - `crm-incoming-tab.js` — check current size
   - `crm-leads-tab.js` — check current size
   - `crm-init.js` — check how `showCrmTab` dispatches
4. Start `localhost:3000`, verify CRM loads
5. **Verify `activity_log` table exists:**
   ```sql
   SELECT count(*) FROM activity_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
   Should return a number (possibly 0). If table doesn't exist → STOP.
6. **Check existing ActivityLog calls:**
   ```
   grep -rn "ActivityLog" modules/crm/ | wc -l
   ```
   Expected: ~15-20 hits across 7 files (pre-P12 state).
7. **Check crm.html nav structure:**
   ```
   grep "data-tab" crm.html
   ```
   Should show 6 existing tabs. Note the pattern for adding the 7th.
8. **Grep for potential global name collisions:**
   ```
   grep -rn "CrmActivityLog\|renderActivityLog\|crm-activity-log" modules/crm/
   ```
   Should be 0 hits.
9. **Approved-phone check:** ONLY `+972537889878` and `+972503348349`

**If pre-flight passes → GO. Do not stop again.**

---

## Execution Sequence

**Phase 1 — Board radio fix + source dropdown** (Commits 1-2, may merge)
  Change board checkboxes to radio in `crm-broadcast-filters.js`. Three
  options: incoming / registered / by-event. Update `state.boards` (array)
  → `state.board` (string). Fix source dropdown: remove `site`, add
  `supersale_form` with label "טופס אתר".
  QA (code review): radio inputs rendered, buildLeadIds uses single board,
  source options match Prizma data.

**Phase 2 — Wire ActivityLog into missing CRM actions** (Commit 3)
  Add `ActivityLog.write` calls directly (no IIFE wrapper) into:
  `crm-lead-actions.js`, `crm-event-actions.js`, `crm-leads-detail.js`
  (⚠️ near 350 ceiling — if >350 defer note_add log),
  `crm-incoming-tab.js`, `crm-leads-tab.js`.
  QA: grep ActivityLog in each file → hits.

**Phase 3 — Activity Log tab** (Commit 4)
  Create `modules/crm/crm-activity-log.js` (~200-280L). Add nav item +
  section + script tag to `crm.html`. Add dispatch case in `crm-init.js`.
  Table: filters (action type, entity type, date range) + paginated rows +
  expandable details + employee name lookup.
  QA: file exists, ≤350L, crm.html has all 3 additions.

**Phase 4 — Verification** (Commit 5, no-op eligible)
  End-to-end code review: create a lead via code → ActivityLog.write fires →
  activity-log tab query would show it. All files ≤ 350.

**Phase 5 — Documentation** (Commits 6-7)

---

## Key Rules

- **ONLY approved phones for any test data:** `+972537889878`, `+972503348349`.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- **No EF changes.** No schema changes. No DDL.
- **Do NOT modify `shared/js/activity-logger.js`** (M1.5 owned).
- **Rule 12:** `crm-leads-detail.js` is at 344L. If adding 3 lines pushes
  past 350 → defer the note_add log to next SPEC. DO NOT split detail.js
  in this SPEC (pre-planned for a dedicated split SPEC per P9 Finding 6).
- **Rule 21:** Use `ActivityLog.write` directly. Do NOT create `logWrite`
  wrapper functions — they trigger rule-21 false positives (P11 Finding 2).
- **DO NOT STOP once past pre-flight.**
- **Clean ALL test data** at end. Verify baseline.
