# Claude Code — Execute P15 UI Polish SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P15 is a UI polish SPEC requested by Daniel. Five changes to the CRM leads
table and detail modal — no DB changes, no Edge Function changes, 2 files only.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P15_UI_POLISH/SPEC.md`

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully
3. **CRITICAL CHECK:** verify `crm-leads-detail.js` line count:
   ```
   wc -l modules/crm/crm-leads-detail.js
   ```
   If ≥346 → STOP (not enough headroom for UTM panel). Report to Daniel.
4. Start `localhost:3000`, verify CRM loads at `crm.html?t=demo`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Track A — Registered Leads Table (`crm-leads-tab.js`)

1. Update the SELECT on line ~34 — add `utm_medium, utm_content, utm_term, utm_campaign_id`
2. Remove `שפה` and `תגיות` column headers (lines ~214-215)
3. Remove the language and tags data cells (lines ~226-227)
4. Add `אימייל` column header and data cell in their place
5. Verify: reload → registered tab shows email column, no language, no tags

### Track B — Lead Detail Modal (`crm-leads-detail.js`)

1. In `renderFullDetails` (line ~222):
   - Remove `row('שפה', ...)` line
   - Add eye_exam extraction from `client_notes` (try JSON parse, look for `eye_exam` key)
   - Add collapsible UTM panel using `<details>`+`<summary>`, all 6 fields
   - Keep tags and client_notes sections as-is
2. Verify: reload → click a lead → "פרטים" tab shows no language, shows UTM panel

### Verification

1. `wc -l modules/crm/crm-leads-tab.js` → ≤310
2. `wc -l modules/crm/crm-leads-detail.js` → ≤350
3. Reload `crm.html?t=demo` — 0 console errors
4. Reload `crm.html?t=prizma` — 0 console errors, lead detail shows UTM data
5. Incoming tab unchanged — spot check
6. Commit + push

---

## Key Rules

- **2 files only.** Nothing else.
- **No DB changes. No EF changes. No DDL.**
- **Rule 12:** both files must stay ≤350 lines.

---

*End of ACTIVATION_PROMPT — P15_UI_POLISH*
