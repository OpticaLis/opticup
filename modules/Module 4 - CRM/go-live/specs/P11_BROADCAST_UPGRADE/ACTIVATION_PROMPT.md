# Claude Code — Execute P11 Broadcast Upgrade SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P11 upgrades the broadcast wizard ("שליחה ידנית") with three improvements
Daniel requested during QA:

1. **Variable copy-to-clipboard** — clicking a variable in the broadcast wizard
   or quick-send dialog copies it to clipboard instead of scrolling the page.
   Template editor keeps insert-at-cursor behavior.

2. **Advanced recipient filtering** — multi-status checkboxes, board selection
   (incoming/registered), multi-event selection, open-events-only toggle,
   source filter. Replaces the current single-status + single-event dropdowns.

3. **Recipients preview popup** — "נמצאו X נמענים" becomes clickable, opens
   a modal showing the matched leads (name, phone, status, source) in a
   scrollable table.

**This SPEC is designed for an overnight unattended run.** Maximum autonomy.
Do NOT stop once past pre-flight.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P11_BROADCAST_UPGRADE/SPEC.md`

---

## Pre-Flight (ONLY place you may stop)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully — especially §12 Technical Design
3. Read all files you'll modify — verify line counts match:
   - `crm-messaging-broadcast.js` — 251 lines
   - `crm-send-dialog.js` — 119 lines
   - `crm-messaging-templates.js` — 306 lines
   - `crm-lead-filters.js` — 221 lines (reference for patterns)
4. Start `localhost:3000`, verify CRM loads
5. **Check CRM_STATUSES structure:**
   ```javascript
   console.log(JSON.stringify(CRM_STATUSES.lead, null, 2));
   ```
   Identify which statuses belong to incoming vs registered boards.
6. **Check `navigator.clipboard` availability:**
   Open browser console on `localhost:3000`, run `!!navigator.clipboard.writeText`.
   Should be `true` (HTTPS or localhost).
7. **Grep for VARIABLES array:**
   ```
   grep -n "VARIABLES" modules/crm/crm-messaging-templates.js
   ```
   Confirm it's at lines 11-22. This is the list to expose globally.
8. **Approved-phone check:** ONLY `+972537889878` and `+972503348349`

**If pre-flight passes → GO. Do not stop again.**

---

## Execution Sequence

**Phase 1 — Variable copy-to-clipboard** (Commit 1)
  Expose `CRM_TEMPLATE_VARIABLES` globally from templates file. Add variable
  reference panel to broadcast wizard step 3 (copy-to-clipboard). Add same
  panel to quick-send dialog. Fix scroll issue in template editor if needed.
  QA: click variable in wizard → toast "הועתק", click in editor → inserted.

**Phase 2 — Advanced recipient filtering** (Commits 2-3)
  Rewrite wizard step 1: board checkboxes, multi-status checkboxes, multi-event
  checkboxes with open-only toggle, source dropdown. Rewrite `buildLeadIds`
  for array-based filtering. If `crm-messaging-broadcast.js` exceeds 350
  lines → split filter logic into `crm-broadcast-filters.js`.
  QA: toggle boards/statuses/events → count updates live.

**Phase 3 — Recipients preview popup** (Commit 4)
  Make count div clickable. Fetch full lead data (not just IDs). Show modal
  with scrollable table (name, phone, status, source).
  QA: click count → modal → correct leads listed.

**Phase 4 — Full flow test + cleanup** (Commit 5, no-op eligible)
  End-to-end: set filters → preview recipients → select channel → compose
  with variable → confirm → send to approved phones only. Verify message
  appears in log. Clean test data.

**Phase 5 — Documentation** (Commits 6-7)

---

## Key Rules

- **ONLY approved phones:** `+972537889878`, `+972503348349`. STOP on violation.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- **No EF changes.** No schema changes. No DDL.
- **Rule 12:** Split if >350. Pre-authorized for `crm-broadcast-filters.js`.
- **DO NOT STOP once past pre-flight.**
- **Clean ALL test data** at end. Verify baseline.
