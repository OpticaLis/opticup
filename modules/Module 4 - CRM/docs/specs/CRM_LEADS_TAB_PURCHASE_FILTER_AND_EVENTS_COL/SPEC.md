# SPEC — CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-03
> **Module:** 4 — CRM
> **Phase (if applicable):** Cutover-parallel UI hot-fix (sourced from Daniel directive 2026-05-03 + Campaign Overseer REC-011)
> **Author signature:** Claude Code Windows desktop session, 2026-05-03 (post-CRM_PHONE_SEARCH_NORMALIZATION + post-BROADCAST_1000_CAP_FIX, same chat)

---

## 1. Goal

Add a "סטטוס רכישה" (purchase-status) filter to the Advanced Filters bar on the CRM "רשומים" leads tab, plus a new "אירועים" column on the leads table showing `total_events_attended` per lead. Both surfaces hydrate from the existing `v_crm_lead_event_history` view via a per-page client-side merge (Rule 13 — view-only-for-external-reads honored). New filter exposes 3 options: כל הלידים / קנו לפחות פעם / אף פעם לא קנו, mapped to `is_returning_customer = null/true/false`.

---

## 2. Background & Motivation

Daniel directive 2026-05-03: *"אני רוצה פילטר ברור שמסך 'רשומים' בין לידים שכבר קנו לפחות פעם אחת לכאלה שאף פעם לא קנו... אני רוצה שבמסך 'רשומים' תוסיף עמודה עם מספר האירועים שהליד היה בהם."* The dashboard already shows "לידים חוזרים" (currently 81 on prizma) using `is_returning_customer = true` from `v_crm_lead_event_history`. The leads tab itself has had no equivalent filter or events-count column. This SPEC closes that gap.

Sourced from Campaign Overseer REC-011 (`__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC start | On `develop`, pulled, **globally clean** (Daniel directive 2026-05-03) | `git status --porcelain` → empty |
| 2 | Files modified — exact list | 3 source files | `git diff --name-only origin/develop...HEAD` (excluding the SPEC folder) → `js/` empty; `modules/crm/crm-helpers.js`, `modules/crm/crm-lead-filters.js`, `modules/crm/crm-leads-tab.js` (3 lines) |
| 3 | `crm-helpers.js` line count | 213 → ≤ 230 | `wc -l modules/crm/crm-helpers.js` ≤ 230 |
| 4 | `crm-lead-filters.js` line count | 221 → ≤ 235 | `wc -l modules/crm/crm-lead-filters.js` ≤ 235 |
| 5 | `crm-leads-tab.js` line count (Iron Rule 12 critical) | **349 (unchanged)** — net 0 line add | `wc -l modules/crm/crm-leads-tab.js` → 349 |
| 6 | `mergeLeadHistory` helper exists in CrmHelpers export | 1 hit | `grep -n "mergeLeadHistory:" modules/crm/crm-helpers.js` → 1 hit |
| 7 | `mergeLeadHistory` declared as function | 1 hit | `grep -n "function mergeLeadHistory" modules/crm/crm-helpers.js` → 1 hit |
| 8 | `crm-leads-tab.js` calls helper | 1 hit | `grep -n "CrmHelpers.mergeLeadHistory" modules/crm/crm-leads-tab.js` → 1 hit |
| 9 | `purchase_status` in `_empty()` state | 1 hit | `grep -n "purchase_status: ''" modules/crm/crm-lead-filters.js` → 1 hit |
| 10 | `purchase_status` in `applyFilters` logic | 1 hit | `grep -n "state.purchase_status" modules/crm/crm-lead-filters.js` → ≥ 2 hits (one in `applyFilters`, one in `renderChips`, possibly more in `activeCount` / `renderAdvancedBar`) |
| 11 | New `data-filter-purchase` select rendered | 1 hit each | `grep -c "data-filter-purchase" modules/crm/crm-lead-filters.js` → 2 (renderAdvancedBar + wireFilterBarEvents) |
| 12 | New `<th>` "אירועים" in leads table | 1 hit | `grep -n "אירועים</th>" modules/crm/crm-leads-tab.js` → 1 hit |
| 13 | colspan changed from 5 to 6 | 1 hit | `grep -n 'colspan="6"' modules/crm/crm-leads-tab.js` → 1 hit AND `grep -c 'colspan="5"' modules/crm/crm-leads-tab.js` → 0 |
| 14 | Iron Rule 12 (file-size, hard cap 350) | every modified file ≤ 350 | covered by criteria #3, #4, #5 |
| 15 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 16 | Single commit | exactly 1 ahead of origin (before push) | `git rev-list --count origin/develop..HEAD` → 1 |
| 17 | Pushed to origin | local HEAD == origin/develop | `git fetch && git rev-parse HEAD` == `git rev-parse origin/develop` |
| 18 | Working tree clean (globally — Daniel directive) | empty | `git status --porcelain` → empty |
| 19 | Stash restored at session end | the pre-SPEC stash is `git stash pop`-ed and the original 112 entries reappear in `git status` | (executor restores; clean-tree check at #18 happens BEFORE stash restore — see §10 ordering) |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo.
- Apply the surgical edits in §8 verbatim.
- Stage only the 3 source files in scope + the SPEC retrospective files (this SPEC + EXECUTION_REPORT + FINDINGS).
- Commit and push to `develop` per §9 (Commit Plan).
- Run `npm run verify:integrity`.
- Restore the pre-session stash at session end via `git stash pop` AFTER the in-scope clean-tree gate passes (see §10).

### What REQUIRES stopping and reporting
- `crm-leads-tab.js` line count after edit is NOT exactly **349**. Iron Rule 12 hard cap is 350; brief is stricter ("under 350"); SPEC §3 #5 demands 349 (net 0 line add). If the executor ends up at 350 or 351, STOP and ask Foreman for a re-shape — do NOT push at the boundary.
- Any 4th source file in `git diff --name-only` beyond the 3 named in §8 — STOP, scope creep.
- Integrity gate exit 1 (null-byte ERROR).
- Any merge-to-main attempt by any caller — REFUSE.
- `v_crm_lead_event_history` query returns an unexpected error (e.g., column missing) — STOP, escalate to Foreman, do NOT skip the merge silently.
- The pre-session stash cannot be popped without conflict at session end — STOP, report to Daniel.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **`crm-leads-tab.js` line count != 349 after edit.** This is the binding constraint. The §8 edits are designed to NET 0 lines; any drift means the executor's edit shape differs from the SPEC's intent.
- **`v_crm_lead_event_history` column shape changed.** The Foreman survey (2026-05-03) verified columns: `lead_id`, `tenant_id`, `full_name`, `phone`, `total_events_attended`, `total_purchases`, `is_returning_customer`, `last_attended_date`, `event_history`. If the executor's pre-flight `select` query errors with "column X does not exist", STOP.
- **Pre-session stash conflict on pop.** At session end, after pushing the SPEC commit, `git stash pop` MUST succeed cleanly. If it conflicts (e.g., one of Daniel's untracked files now collides with a tracked file produced by the SPEC), STOP and report — Daniel decides whether to keep the stash or resolve.

---

## 6. Rollback Plan

Single commit, JS-only client-side change, no DB / migration / EF / view modifications:
- `git revert <commit_hash> && git push origin develop` reverts the SPEC entirely.
- No schema state to restore.
- No EF redeploy needed.
- No view modifications (Rule 13 honored — `v_crm_lead_event_history` is read-only consumer).

---

## 7. Out of Scope (explicit)

- Modifying any view (`v_crm_lead_event_history`, `v_crm_leads_with_tags`, etc.). **Rule 13** binding.
- Schema / RLS / RPC / EF / migration changes.
- Touching the "לידים נכנסים" tab (`crm-incoming-tab.js`). The Daniel directive was for רשומים specifically.
- Changing the dashboard "לידים חוזרים" tile (already correct).
- Server-side pagination redesign — the existing `SERVER_PAGE = 200` + "Load more" UX stays. Filter operates on the loaded slice as today.
- Any fix for partial-page filtering UX (e.g., "filter says 81 returning customers but only 200 leads loaded") — that's a separate redesign SPEC.
- Adding tests / Vitest infra.

### Foreman scope-widening note (1 file beyond the brief's 2)

The activation brief at §"Stop triggers" listed only `modules/crm/crm-leads-tab.js` and `modules/crm/crm-lead-filters.js`. The Foreman widens scope to a 3rd file: **`modules/crm/crm-helpers.js`**. Justification (logged here so the executor doesn't trip the stop trigger):
1. **Iron Rule 12 cannot be satisfied otherwise.** `crm-leads-tab.js` is at 349 lines (1 under the 350 hard cap; brief explicitly said "stay under 350"). Inlining the merge query would push it to 350 or above. The only way to keep the file ≤ 349 is to put the helper in a sibling file with available budget. `crm-helpers.js` has 213 lines and is the canonical place for cross-CRM helpers (already exports `formatPhone`, `normalizePhone`, `formatDate`, `loadStatusCache`, `getStatusInfo`, etc.).
2. **Rule 21 (No Orphans, No Duplicates) — single source.** Putting `mergeLeadHistory` in `CrmHelpers` makes it reusable; future leads-related views (e.g., a kanban variant, a card variant) can call the same helper instead of inlining their own merge. A standalone-inline implementation would be the start of a Rule 21 violation.
3. **Lower blast radius.** Adding +12 lines to `crm-helpers.js` (213 → 225) is contained, single-function, with one new export entry. Far safer than a 480-char one-liner inside `loadLeads`.
4. **No design implications.** The helper has the exact same query shape Daniel would write inline; no new abstraction, no new naming conventions, no new module loading order.

The brief's "halt + escalate" trigger was correctly scoped to *unforeseen* runtime scope creep. Foreman scope-widening at design time WITH justification is the documented escape hatch (CLAUDE.md §9 "Authority Matrix" — SPEC author owns the scope envelope before dispatch).

---

## 8. Expected Final State

### New files (in SPEC folder, written by executor at end)
- `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/FINDINGS.md`

### Modified files (3)

#### A. `modules/crm/crm-helpers.js` (213 → ~225 lines)

**Edit A1 — Insert new helper `mergeLeadHistory` immediately after `hebrewDayOfWeek` and before the `window.CrmHelpers = {...}` export:**

Find the existing line (currently `crm-helpers.js:191` — the closing `}` of `hebrewDayOfWeek` followed by a blank line and `window.CrmHelpers = {`):

```javascript
    return _HE_DOW[d.getUTCDay()] || '';
  }

  window.CrmHelpers = {
```

Replace with:

```javascript
    return _HE_DOW[d.getUTCDay()] || '';
  }

  // --- Lead history merge (Rule 21: single helper, used by crm-leads-tab.js) ---
  // Hydrates `total_events_attended` + `is_returning_customer` from
  // v_crm_lead_event_history onto each row. Mutates rows in place. Per-page
  // (caller passes a slice of up to SERVER_PAGE leads); .in('lead_id', ids)
  // stays well under the PostgREST 1000-row cap.
  async function mergeLeadHistory(rows, tenantId) {
    if (!rows || !rows.length || !tenantId) return;
    var ids = rows.map(function (r) { return r.id; });
    var hRes = await sb.from('v_crm_lead_event_history')
      .select('lead_id, total_events_attended, is_returning_customer')
      .eq('tenant_id', tenantId).in('lead_id', ids);
    if (hRes.error) return;
    var byId = {};
    (hRes.data || []).forEach(function (h) { byId[h.lead_id] = h; });
    rows.forEach(function (r) {
      var h = byId[r.id];
      r.total_events_attended = (h && h.total_events_attended) || 0;
      r.is_returning_customer = !!(h && h.is_returning_customer);
    });
  }

  window.CrmHelpers = {
```

**Edit A2 — Add `mergeLeadHistory` to the `window.CrmHelpers` export:**

Find:
```javascript
    hebrewDayOfWeek: hebrewDayOfWeek
  };
```

Replace with:
```javascript
    hebrewDayOfWeek: hebrewDayOfWeek,
    mergeLeadHistory: mergeLeadHistory
  };
```

#### B. `modules/crm/crm-lead-filters.js` (221 → ~228 lines)

**Edit B1 — Extend `_empty()` return to include `purchase_status: ''`:**

Find:
```javascript
    return { statuses: [], fromDate: '', toDate: '', noResp48: false, source: '', language: '' };
```

Replace with:
```javascript
    return { statuses: [], fromDate: '', toDate: '', noResp48: false, source: '', language: '', purchase_status: '' };
```

**Edit B2 — Add `if (st.purchase_status) n++;` to `activeCount()`:**

Find:
```javascript
    if (st.language) n++;
    return n;
  }
```

Replace with:
```javascript
    if (st.language) n++;
    if (st.purchase_status) n++;
    return n;
  }
```

**Edit B3 — Add purchase_status filter to `applyFilters()`. Insert before the closing `return true;` of the inner filter callback:**

Find:
```javascript
      if (state.noResp48) {
        var last = notesByLead && notesByLead[r.id];
        if (last && new Date(last).getTime() >= cutoff48) return false;
      }
      return true;
    });
```

Replace with:
```javascript
      if (state.noResp48) {
        var last = notesByLead && notesByLead[r.id];
        if (last && new Date(last).getTime() >= cutoff48) return false;
      }
      if (state.purchase_status && (state.purchase_status === 'purchased') !== !!r.is_returning_customer) return false;
      return true;
    });
```

**Edit B4 — Add `purchOpts` variable + new `<select data-filter-purchase>` to `renderAdvancedBar`. Find the existing language `langHtml` block and the `host.innerHTML = ...` template:**

Find:
```javascript
    var count = activeCount(st);
```

Replace with:
```javascript
    var purchOpts = '<option value=""' + (!st.purchase_status ? ' selected' : '') + '>סטטוס רכישה</option><option value="purchased"' + (st.purchase_status === 'purchased' ? ' selected' : '') + '>קנו לפחות פעם</option><option value="never_purchased"' + (st.purchase_status === 'never_purchased' ? ' selected' : '') + '>אף פעם לא קנו</option>';

    var count = activeCount(st);
```

Then find the existing `<select data-filter-source>` line in `host.innerHTML`:
```javascript
          '<select data-filter-source class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">' + sourceOpts + '</select>' +
```

Replace with:
```javascript
          '<select data-filter-source class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">' + sourceOpts + '</select>' +
          '<select data-filter-purchase class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">' + purchOpts + '</select>' +
```

**Edit B5 — Add wire event in `wireFilterBarEvents`. Find the existing `var lang = host.querySelector('[data-filter-lang]');` block:**

Find:
```javascript
    var lang = host.querySelector('[data-filter-lang]');
    if (lang) lang.addEventListener('change', function () { st.language = lang.value || ''; fire(); });
```

Replace with:
```javascript
    var lang = host.querySelector('[data-filter-lang]');
    if (lang) lang.addEventListener('change', function () { st.language = lang.value || ''; fire(); });
    var purch = host.querySelector('[data-filter-purchase]');
    if (purch) purch.addEventListener('change', function () { st.purchase_status = purch.value || ''; fire(); });
```

**Edit B6 — Add chip render in `renderChips`. Find the existing language chip line:**

Find:
```javascript
    if (state.language) chips.push({ k: 'lang', label: 'שפה: ' + CrmHelpers.formatLanguage(state.language) });
    return chips;
```

Replace with:
```javascript
    if (state.language) chips.push({ k: 'lang', label: 'שפה: ' + CrmHelpers.formatLanguage(state.language) });
    if (state.purchase_status) chips.push({ k: 'purchase', label: 'רכישה: ' + (state.purchase_status === 'purchased' ? 'קנו' : 'לא קנו') });
    return chips;
```

#### C. `modules/crm/crm-leads-tab.js` (349 → **349 — net 0 line add, Iron Rule 12 critical**)

**Edit C1 — Combine merge call with existing `_svrOffset += rows.length;` line (line 76):**

Find:
```javascript
    var rows = res.data || [];
    _svrOffset += rows.length;
    if (rows.length < SERVER_PAGE) _svrHasMore = false;
    return rows;
```

Replace with:
```javascript
    var rows = res.data || [];
    _svrOffset += rows.length; if (rows.length && tid) await CrmHelpers.mergeLeadHistory(rows, tid);
    if (rows.length < SERVER_PAGE) _svrHasMore = false;
    return rows;
```

Net line change: **0** (replaced one line with one line; the second statement after `;` is on the same physical line).

**Edit C2 — Combine new `<th>אירועים</th>` with the existing סטטוס `<th>` line (line 269):**

Find:
```javascript
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">אימייל</th>' +
```

Replace with:
```javascript
      '<th class="' + CLS_TH + '">סטטוס</th><th class="' + CLS_TH + ' text-end">אירועים</th>' +
      '<th class="' + CLS_TH + '">אימייל</th>' +
```

Net line change: **0**.

**Edit C3 — Combine new events `<td>` with the existing סטטוס `<td>` line (line 285):**

Find:
```javascript
        '<td class="' + CLS_TD + '">' + CrmHelpers.statusBadgeHtml('lead', r.status) + ((r.status === 'waitlist' || r.status === 'invited') ? ' <button type="button" data-move-lead="' + escapeHtml(r.id) + '" title="העבר לאירוע אחר" class="text-slate-400 hover:text-indigo-600 text-sm">↔</button>' : '') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(r.email || '—') + '</td>' +
```

Replace with:
```javascript
        '<td class="' + CLS_TD + '">' + CrmHelpers.statusBadgeHtml('lead', r.status) + ((r.status === 'waitlist' || r.status === 'invited') ? ' <button type="button" data-move-lead="' + escapeHtml(r.id) + '" title="העבר לאירוע אחר" class="text-slate-400 hover:text-indigo-600 text-sm">↔</button>' : '') + '</td><td class="' + CLS_TD + ' text-end text-slate-600 tabular-nums">' + (r.total_events_attended || 0) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(r.email || '—') + '</td>' +
```

Net line change: **0**.

**Edit C4 — Update `colspan="5"` to `colspan="6"` in tfoot (line ~291):**

Find:
```javascript
      '<td class="' + CLS_TD + '" colspan="5">סה״כ</td>' +
```

Replace with:
```javascript
      '<td class="' + CLS_TD + '" colspan="6">סה״כ</td>' +
```

Net line change: **0**.

**Edit C5 — Combine onClearChip purchase case with the existing language case (line ~184):**

Find:
```javascript
          else if (k === 'lang') s.language = '';
          renderAdvancedFilterBar();
```

Replace with:
```javascript
          else if (k === 'lang') s.language = ''; else if (k === 'purchase') s.purchase_status = '';
          renderAdvancedFilterBar();
```

Net line change: **0**.

**Total `crm-leads-tab.js` line delta: 0. Final line count: 349 (matches criterion #5).**

### Deleted files
None.

### DB state
Unchanged. No DDL, no inserts, no migrations.

### Manual QA — Daniel runs after deployment (7 acceptance cases on prizma)

The executor MUST print this exact section to Daniel at hand-off:

1. Open `app.opticalis.co.il/crm/` → רשומים tab. Advanced Filters bar shows new `<select>` with options: "סטטוס רכישה" (default) / "קנו לפחות פעם" / "אף פעם לא קנו".
2. Default state ("סטטוס רכישה") → list shows all leads (~1128 after the 36 deletions earlier today). Click "Load more" repeatedly until exhausted to load the full slice; existing server-paged "Load more" UX is unchanged.
3. Select "קנו לפחות פעם" → list narrows to ~81 leads (matches the dashboard's "לידים חוזרים" tile).
4. Select "אף פעם לא קנו" → list narrows to ~1047 leads (1128 − 81).
5. New "אירועים" column visible **between סטטוס and אימייל**, populated for every row. Cold leads show `0`; warm leads show `1`+. Right-aligned, slate-600, tabular-nums for column alignment.
6. Regression: existing filters (status checkboxes, language, source, dates, no-response-48h) still work and combine with the new purchase-status filter (e.g., "active status + purchased").
7. Regression: existing search box (name/phone/email + the recent normalizePhone fix at commit 732aacf) still works.

If all 7 pass → trigger PR-merge to main yourself. **Executor does NOT merge.**
If any fails → `git revert <commit_hash> && git push origin develop` reverses the SPEC entirely.

---

## 9. Commit Plan

Exactly **1 commit**. All 3 source files + this `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` (written by executor at end) + `ACTIVATION_PROMPT.md` (newly tracked) — same single commit.

Commit message:
```
feat(crm): add purchase-status filter + events-count column to leads tab
```

Files in commit:
- `modules/crm/crm-helpers.js`
- `modules/crm/crm-lead-filters.js`
- `modules/crm/crm-leads-tab.js`
- `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/ACTIVATION_PROMPT.md` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/SPEC.md` (this file, newly tracked)
- `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/EXECUTION_REPORT.md` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/FINDINGS.md` (newly tracked)

Push to `origin/develop`. **Do NOT merge to main.** Daniel handles PR-merge himself per `feedback_main_merge_via_pr.md`.

---

## 10. Dependencies / Preconditions

- On `develop`, repo **globally clean** (per Daniel directive 2026-05-03 — non-negotiable for this SPEC). The executor MUST verify `git status --porcelain` returns 0 lines BEFORE starting any edit. The pre-session stash (`pre-CRM_LEADS_TAB overnight planning wip`) was created at session start by the dispatching session; do NOT pop it until after this SPEC's commit + push.
- `v_crm_lead_event_history` view exists and exposes columns: `lead_id`, `tenant_id`, `total_events_attended`, `is_returning_customer` (verified by Foreman survey of `campaigns/supersale/migrations/001_crm_schema.sql:617`).
- `CrmHelpers` namespace exists at `window.CrmHelpers` (verified by Foreman survey of `crm-helpers.js:192`).
- `paginateQuery` is NOT used in this SPEC (per-page merge with `.in('lead_id', [≤200 ids])` stays well under the 1000-row cap; the bulk fetch shape isn't needed here).
- BC-1000 commit `62dd6dd` (paginateQuery refactor) is on `develop` HEAD as of SPEC authoring; this SPEC builds on top.

### End-of-session ordering (executor MUST follow this exact sequence)

1. Apply edits + verify §3 #5 (crm-leads-tab.js exactly 349 lines).
2. Run `npm run verify:integrity` (criterion #15).
3. Stage 3 source files + 4 SPEC-folder files (criterion #2).
4. Commit + push (criteria #16, #17).
5. Verify `git status --porcelain` is empty for in-scope paths (criterion #18 partial).
6. **Pop the pre-session stash:** `git stash pop`. The original 112 entries reappear (criterion #19).
7. Verify pop succeeded without conflict; if it conflicts, STOP and report to Daniel.
8. End-of-session global clean-tree gate is now relaxed (the popped stash brings back Daniel's pre-existing planning files, which are intentional WIP — Daniel's directive was about THIS SPEC's run, not about the underlying pile of WIP). Document the post-pop state in `EXECUTION_REPORT §9 Final state`.

---

## 11. Lessons Already Incorporated

Cross-Reference Check (Step 1.5) completed 2026-05-03 against authoritative sources:
- `grep -rn "v_crm_lead_event_history" modules/ campaigns/` → 4 hits in code (`crm-leads-detail.js:78-79`, `crm-dashboard.js:81`, plus this SPEC) + 6 hits in migrations/design docs. View is well-known and stable.
- `grep -rn "is_returning_customer" modules/ campaigns/` → 2 code consumers + several doc references. Reusing existing column, no new field added. Rule 5 (FIELD_MAP) does not apply (no DB field added).
- `grep -rn "function mergeLeadHistory" modules/` → 0 hits (new helper, no collision).
- `grep -rn "purchase_status" modules/crm/` → 0 hits (new filter state field, no collision).
- `grep -rn "data-filter-purchase" modules/crm/` → 0 hits (new HTML hook, no collision).

FOREMAN_REVIEW proposals applied from the 3 most-recent M4 reviews (already harvested earlier in this session):
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` → SA proposal #2 ("don't invent parallel mechanism — extend existing infra, Iron Rule 21")** → APPLIED. The new `mergeLeadHistory` helper sits inside the existing `CrmHelpers` namespace; the merge query reuses the existing `v_crm_lead_event_history` view (no new view, no new RPC). Rule 21 single-source preserved.
- **FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` → Proposal B ("don't trust comment-described inventories — grep the code")** → APPLIED. Foreman re-verified `v_crm_lead_event_history` column shape by reading the migration SQL directly (not by trusting the brief or doc references), and re-verified the `crm-leads-tab.js` line count by `wc -l`. The 349 → 349 net-zero design was derived from this verification, not assumed.
- **FROM `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md` → SA-1 (tenant-scope verification)** → APPLIED. The merge query at `crm-helpers.js mergeLeadHistory` includes `.eq('tenant_id', tenantId)` explicitly even though RLS enforces it (Rule 22 defense-in-depth), and the manual-QA expected counts (~1128, ~81, ~1047) are tagged "on prizma" in §8 to anchor the test scope.

**Inherited from prior in-session SPECs (`CRM_PHONE_SEARCH_NORMALIZATION` 732aacf + `BROADCAST_1000_CAP_FIX` 62dd6dd):**
- Executor proposal X-1 ("batch all Edit calls when SPEC §8 specifies char-exact before/after"): the executor will batch all 11 Edits (2 in helpers + 6 in lead-filters + 5 in leads-tab — wait, more precisely: 2 + 6 + 5 = **13 Edits** but C2/C3/C4/C5 are surgical replace-the-line edits where each `old_string` is uniquely structured) where `old_string` is unique within file. Pre-condition: every `old_string` must appear exactly once per file (verified by Foreman in §8 — each before-block is multi-line and structurally unique).
- Executor proposal X-2 ("§0 in-scope paths in EXECUTION_REPORT"): executor MUST list the 3 source files + 4 SPEC-folder files at the top of EXECUTION_REPORT.md and verify cleanliness against THAT list.
- Executor proposal Y-1 (smoke-fetch-all script): N/A here — no `fetchAll` internals touched.
- Executor proposal Y-2 (COMMON_PATTERNS.md): pattern in this SPEC = "merge view-derived columns onto existing rows by id-list with .in() filter". Could be the seed of `PATTERN-MERGE-VIEW-COLUMNS-PER-PAGE` once Y-2 lands as a real reference file.

**Iron Rule 12 critical accommodation documented in §7 scope-widening note.**

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] **Iron Rule 12 critical:** `wc -l modules/crm/crm-leads-tab.js` returns exactly **349**. If 350+ → SPEC reopens, do not push.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] In-scope `git status --short` returns empty (clean tree for in-scope paths).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in the SPEC folder.
- [ ] 7 manual-QA acceptance cases printed to Daniel for his verification on the live app (against **prizma**).
- [ ] **NO merge to main** — that step belongs to Daniel via PR with branch protection.
- [ ] Pre-session stash popped cleanly at end (criterion #19); post-pop state documented in `EXECUTION_REPORT §9`.
