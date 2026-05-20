# FINDINGS — M4_SHORT_LINKS_DASHBOARD_REDESIGN

> **Written by:** opticup-executor (Sonnet 4.6)
> **Written on:** 2026-05-20
> **Status:** 4 findings. None block the Reviewer or Tester step.

---

## F-1 — `escapeAttr()` duplicated in 3 tile files (no global)

| Field | Value |
|---|---|
| **Severity** | INFO |
| **Location** | `modules/crm/crm-short-links-tiles/template-static-card.js`, `broadcasts-table.js`, `drilldown.js` |
| **Description** | The 8-line `escapeAttr()` function (sanitizes HTML attribute strings) is duplicated across 3 tile files. `escapeHtml()` is already a global in `js/shared.js` but `escapeAttr()` is not. Creating a new global without Rule 21 pre-flight was avoided — duplication was the safe path for this SPEC. |
| **Suggested action** | Future Module 1.5 SPEC: promote `escapeAttr()` to `js/shared.js` alongside `escapeHtml()`, then remove the local copies in the 3 tile files. |

---

## F-2 — Date-range chip does not trigger DB re-query (UX gap)

| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | `modules/crm/crm-short-links-stats.js:_onFilterChange()` + `modules/crm/crm-short-links-tiles/broadcasts-table.js:applyFilter()` |
| **Description** | When a user clicks a date-range chip (7/30/90 days), the filter bar re-renders correctly but broadcasts-table only re-applies the client-side toggle/link-type filter — it does NOT re-query the DB with the new date window. The SPEC said "Date range — preset chips 7/30/90" but did not explicitly say whether date change triggers a DB re-query or client-side re-render. Executor defaulted to client-side (cheaper), which is wrong for date changes. |
| **Suggested action** | Foreman-directed amendment: add `reload(filterState)` method to broadcasts-table that clears `_allRows` and re-calls `_loadData()`; orchestrator calls `reload()` on date change vs `applyFilter()` on toggle/type change. ~15 lines. Alternatively: Foreman closes as WONT-FIX if 30d default is sufficient for v1. |

---

## F-3 — Component A and Component B both fetch all-tenant `short_link_clicks` (duplicate round-trip)

| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `template-static-card.js:_loadData()` + `broadcasts-table.js:_loadData()` |
| **Description** | Both tiles independently query all tenant clicks. On demo (15 rows) negligible; on Prizma (473 rows) adds ~100ms of extra DB read on tab open. They run in parallel so wall-clock is OK — purely a DB load concern. |
| **Suggested action** | Future optimization: orchestrator fetches clicks once and passes as parameter to both tiles. Not blocking. |

---

## F-4 — MODULE_MAP.md not updated with 4 new globals

| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `modules/Module 4 - CRM/docs/MODULE_MAP.md` |
| **Description** | CLAUDE.md §8: "Add a new function → Update module's MODULE_MAP.md in the SAME commit." The 4 new globals (CrmShortLinksFilterBar, CrmShortLinksTemplateStaticCard, CrmShortLinksBroadcastsTable, CrmShortLinksDrilldown) were not registered. Missed in this SPEC's implementation commit. |
| **Suggested action** | Fix in C4 docs commit (Foreman/Reviewer step). |

---

*End of FINDINGS. F-2 (HIGH) is the most important for Foreman to resolve. F-4 (LOW) should be fixed in the C4 docs commit.*
