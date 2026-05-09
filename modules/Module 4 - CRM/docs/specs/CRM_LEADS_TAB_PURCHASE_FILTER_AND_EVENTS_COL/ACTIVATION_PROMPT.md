You are working in `C:\Users\User\opticup` (the ERP repo, `opticalis/opticup`). Follow CLAUDE.md and all 30 Iron Rules. The user is Daniel.

## Role for this session

Two-stage. First load `opticup-strategic` (Foreman) to author the SPEC. Then load `opticup-executor` to implement it. Both stages happen in this single Claude Code session.

## Clean-repo discipline (Daniel directive 2026-05-03 — non-negotiable)

- **At session start:** the executor's First Action Protocol (CLAUDE.md §1) MUST run end-to-end. Verify clean repo BEFORE any work — `git status` must show "working tree clean" or have all leftovers explicitly handled per §1 step 4. Run `npm run verify:integrity` (the integrity gate). DO NOT proceed if either step fails.
- **At session end:** `git status` MUST show "working tree clean" before closing. Delete any scratch/temp/debug files. Never leave untracked drift for the next session.

## Background (from Campaign Overseer REC-011)

**Daniel directive 2026-05-03:** "אני רוצה פילטר ברור שמסך 'רשומים' בין לידים שכבר קנו לפחות פעם אחת לכאלה שאף פעם לא קנו... אני רוצה שבמסך 'רשומים' תוסיף עמודה עם מספר האירועים שהליד היה בהם."

The dashboard already shows "לידים חוזרים" (currently 81) using the `is_returning_customer` flag in view `v_crm_lead_event_history`, defined as: at least one attendee row with `purchase_amount > 0`. The leads tab itself currently has no such filter and no events-count column.

## What needs to happen

### Change 1 — New filter "סטטוס רכישה" in Advanced Filters bar

In `modules/crm/crm-lead-filters.js`:
- Add `purchase_status: ''` to `_empty()` state.
- Add to `activeCount()`: `if (st.purchase_status) n++;`
- Add to `applyFilters()`: filter by `r.is_returning_customer` (true → matches `'purchased'`, false → matches `'never_purchased'`).
- Add a new `<select>` to `renderAdvancedBar()` with 3 options: `''` (כל הלידים) / `'purchased'` (קנו לפחות פעם) / `'never_purchased'` (אף פעם לא קנו).
- Add chip rendering in `renderChips()` so the active selection shows as a removable filter chip.

### Change 2 — Hydrate leads with `total_events_attended` + `is_returning_customer`

In `modules/crm/crm-leads-tab.js::loadLeads()`:
- Currently selects from `v_crm_leads_with_tags`. That view doesn't carry purchase history.
- Two options for the executor to choose between (Foreman to specify in SPEC):
  - **Option A (preferred — minimal change):** After loading leads from `v_crm_leads_with_tags`, fire a separate query to `v_crm_lead_event_history` for the same lead IDs and merge `total_events_attended` + `is_returning_customer` into each row client-side.
  - **Option B:** Modify `v_crm_leads_with_tags` to LEFT JOIN `v_crm_lead_event_history`. **Don't pick this** — modifying a view triggers View Modification Protocol (Iron Rule 13/29) and cascades to other consumers. Out of scope.

Foreman should specify Option A unless there's a strong reason otherwise.

### Change 3 — Add "אירועים" column to leads table

In `modules/crm/crm-leads-tab.js::renderLeadsTable()` (around line 264-289):
- Add `<th>` "אירועים" between "סטטוס" and "אימייל".
- Add `<td>` for each row showing `r.total_events_attended || 0`. Right-aligned, slate-600 muted color.
- Update the colspan in tfoot from `5` to `6`.

### Iron Rules to honor

- **Rule 7** (API abstraction — use existing `sb.from()` patterns; the merge query in Change 2 is allowed since it's the documented exception for "specialized joins impossible through helpers").
- **Rule 12** (file-size — verify both files stay under 350 lines after edit).
- **Rule 13** (Views-only for external reads — DO NOT modify any view; client-side merge is the right path).
- **Rule 21** (no orphan / no duplicate — `is_returning_customer` and `total_events_attended` already exist in `v_crm_lead_event_history`, used by `crm-dashboard.js` and `crm-leads-detail.js`. Reuse same view).
- **Rule 22** (defense-in-depth — the merge query must filter `tenant_id` explicitly even though RLS enforces it).
- **Rule 31** (integrity gate before every commit).
- **Rule 9 #7** (executor must NOT merge to main; PR + Daniel-only authorization).

### Acceptance criteria (manual QA on production after merge)

1. Open `app.opticalis.co.il/crm/` → רשומים tab → Advanced Filters bar shows new "סטטוס רכישה" dropdown with 3 options.
2. Default is "כל הלידים" → list shows all leads (~1128 after the 36 deletions earlier today).
3. Select "קנו לפחות פעם" → list narrows to ~81 leads (matches dashboard tile).
4. Select "אף פעם לא קנו" → list narrows to ~1047.
5. "אירועים" column visible between "סטטוס" and "אימייל"; populated for every row. Cold leads show `0`, warm leads show `1`+.
6. Regression: existing filters (status, language, source, dates, no-resp-48h) still work.
7. Regression: existing search (name/phone/email + the recent normalizePhone fix) still works.

### Out of scope

- Modifying any view.
- Schema changes / migrations.
- Touching the "לידים נכנסים" tab (different file, different filter scope; the directive was for רשומים specifically).
- Changing the dashboard "לידים חוזרים" tile (already correct).
- New helper functions (Rule 21 — reuse what exists).

### Stop triggers

- `v_crm_lead_event_history` no longer exists or its columns changed → halt + escalate.
- `crm-lead-filters.js` structure changed since Overseer surveyed it → halt + escalate.
- File-size gate fails after edit → halt.
- Any change required outside `modules/crm/crm-leads-tab.js` and `modules/crm/crm-lead-filters.js` → halt + escalate (scope creep).

## Stage 1 — Foreman (opticup-strategic) authors the SPEC

1. Switch to `opticup-strategic` skill.
2. Verify folder: SPEC folder at `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/` exists with this ACTIVATION_PROMPT.md. Foreman creates SPEC.md alongside.
3. Survey the 3 most recent FOREMAN_REVIEW.md files under `modules/Module 4 - CRM/docs/specs/*/` for proposals to apply (per opticup-strategic SPEC Authoring Protocol).
4. Author `SPEC.md` transposing the §What needs to happen above into the standard SPEC schema. Resolve Option A vs B in Change 2.
5. Hand off to executor.

## Stage 2 — Executor (opticup-executor) runs the SPEC

1. Switch to `opticup-executor` skill.
2. Run First Action Protocol (CLAUDE.md §1) — clean repo + integrity gate.
3. Read SPEC.md and execute exactly.
4. Single commit message: `feat(crm): add purchase-status filter + events-count column to leads tab`. Push to `origin/develop`.
5. Write `EXECUTION_REPORT.md` + `FINDINGS.md` per opticup-executor protocol.
6. End-of-session: `git status` clean. No untracked files. No leftover scratch.

## After completion

Daniel runs the 7 acceptance criteria on production after PR-merge to main (Daniel-only). Foreman writes `FOREMAN_REVIEW.md` post-merge.

## References

- Overseer recommendation: REC-011 in `roles/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
- Folder-per-SPEC protocol: `CLAUDE.md` §7
- Clean-repo discipline: `CLAUDE.md` §9 + Campaign Overseer SKILL §5.7
