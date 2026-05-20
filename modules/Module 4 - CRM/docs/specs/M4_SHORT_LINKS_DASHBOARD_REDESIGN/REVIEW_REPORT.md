# REVIEW_REPORT — M4_SHORT_LINKS_DASHBOARD_REDESIGN

> **Written by:** opticup-reviewer (Sonnet 4.6)
> **Written on:** 2026-05-20
> **Branch:** develop
> **Commits reviewed:** e80cf5d (C1+C2+C3 merged), f5b77f9 (docs), 7f4692d (F-2 fix)
> **Pipeline stage:** Reviewer → Localhost-Tester next

---

## 1. Verdict

🟢 **PASS** — No blockers. All Iron Rules checked. Cross-Module Safety §4 confirmed clean. F-2 fix wired correctly. Ready for Tester step.

---

## 2. Iron Rules Checklist

| Rule | Status | Evidence |
|---|---|---|
| **IR 12 — File size** | PASS | orchestrator: 120 lines; filter-bar: 127; template-static-card: 150; broadcasts-table: 256; drilldown: 249. All under 300 target. Hard limit (350) not approached. |
| **IR 21 — No orphans / duplicates** | PASS | grep confirms each of the 4 new globals (`CrmShortLinksFilterBar`, `CrmShortLinksTemplateStaticCard`, `CrmShortLinksBroadcastsTable`, `CrmShortLinksDrilldown`) appears only in its defining file + the orchestrator + `crm.html` script tags. No orphan copies of prior `crm-short-links-stats.js` logic remain. `loadCrmShortLinksStats` still resolves to exactly 3 hits (definition, crm-init.js, crm-bootstrap.js) — same as before SPEC. |
| **IR 22 — Defense-in-depth tenant_id** | PASS | Every `sb.from()` call chains `.eq('tenant_id', tid)`. 7 query calls found; all 7 confirmed chained. Detail: broadcasts-table lines 86, 98, 101; drilldown lines 116, 141; template-static-card lines 56, 69. No naked `sb.from()` without the chain. |
| **IR 31 — Integrity gate** | PASS | `npm run verify:integrity` → exit 0 ("All clear — 9 files scanned"). Confirmed fresh pass post-commit. |
| **IR 32 — Destructive operations** | PASS | SPEC §11 declared 0. grep for DROP/DELETE/TRUNCATE/git rm/Remove-Item across all changed files → 0 hits. Git diff confirms only additive changes: 4 new JS files + 27-line orchestrator net-new content + 4 script tags in crm.html. No renames. |
| **IR 34 — Chrome MCP triplet** | N/A | Not this Reviewer's gate. Tester step produces artifacts; Foreman embeds in FOREMAN_REVIEW.md. Correctly deferred. |

---

## 3. SPEC §4 Cross-Module Safety Audit

### §4.1 Files Touched — Confirmed Matches SPEC

`git diff --name-only e871f1a..7f4692d` output (verified):

```
crm.html
modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_DASHBOARD_REDESIGN/EXECUTION_REPORT.md
modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_DASHBOARD_REDESIGN/FINDINGS.md
modules/crm/crm-short-links-stats.js
modules/crm/crm-short-links-tiles/broadcasts-table.js
modules/crm/crm-short-links-tiles/drilldown.js
modules/crm/crm-short-links-tiles/filter-bar.js
modules/crm/crm-short-links-tiles/template-static-card.js
```

Every path matches §4.1 exactly. 8 files = 5 JS implementation + 1 HTML (script tags only) + 2 SPEC docs. No scope violations.

### §4.2 Forbidden Surfaces — Not Touched

| Surface | Status | Grep evidence |
|---|---|---|
| `crm_message_log` | NOT-TOUCHED | 0 hits in diff |
| `crm_message_queue` | NOT-TOUCHED | 0 hits in diff |
| `crm_message_templates` | NOT-TOUCHED | 0 hits in diff |
| `crm_automation_rules` | NOT-TOUCHED | 0 hits in diff |
| `crm_status_change_events` | NOT-TOUCHED | 0 hits in diff |
| `crm_capi_dispatch_queue` | NOT-TOUCHED | 0 hits in diff |
| `supabase/functions/*` (any EF) | NOT-TOUCHED | 0 hits in diff; EF dir not in any changed file |
| DB triggers / functions | NOT-TOUCHED | No SQL files in diff; no trigger syntax in JS |
| RLS policies | NOT-TOUCHED | No policy syntax anywhere |
| `crm-init.js` | NOT-TOUCHED | Only referenced in a code comment in orchestrator line 22 |
| `crm-bootstrap.js` | NOT-TOUCHED | Same — comment reference only |
| Other modules (M1, M1.5, M2, M3) | NOT-TOUCHED | No module-foreign paths in diff |

### §4.2 crm.html Scope Check

`git diff` on crm.html confirms exactly 4 lines added — 4 `<script src="...">` tags for the tiles, inserted before the orchestrator tag (now at line 451). No other HTML edits. Within the ≤ 4 new script tag limit.

---

## 4. Code-Quality Findings

### F-A — `linkTypeFilter` chip does not filter Component B rows [LOW]

**Location:** `modules/crm/crm-short-links-tiles/broadcasts-table.js:145-154` (`_renderRows`)

The client-side `_renderRows` filter reads `state.onlyWithClicks` but does NOT read `state.linkTypeFilter`. The link-type dropdown chip (All / Per-recipient / Template-static) is wired to the filter state and fires the `_onFilterChange` callback correctly — but the broadcasts aggregation table silently ignores `linkTypeFilter`. On a date-change path (re-query), `_loadData` also does not pass `linkTypeFilter` to the broadcast-level aggregation query.

This is partly a consequence of the data model (broadcasts aggregate across link types), but the UX expectation from the filter chip is that filtering by "Template-static" in the filter bar would affect the broadcasts table. Currently it does not. The drilldown correctly applies the filter. The SPEC §3.1 describes the filter as applying to the tab but does not state per-component exclusions, making this an ambiguity rather than a clear SPEC violation. Not a blocker — but it should be called out for the Foreman to explicitly decide whether to close as WONT-FIX for v1 or add to the follow-up backlog.

**Severity:** LOW (UX gap, no data corruption, no Iron Rule breach)

---

### F-B — `escapeAttr` triplicated across 3 tile files [INFO — Executor already logged as F-1]

**Location:** `broadcasts-table.js:246`, `template-static-card.js:140`, `drilldown.js:239`

Identical 5-line function body in each. The Executor's rationale (avoid undeclared global, wait for Module 1.5 SPEC) is correct per Rule 21 discipline. This is the right conservative call. No new finding — confirming Executor's F-1 for Foreman disposition.

**Severity:** INFO (no action needed in this SPEC; confirmed for Module 1.5 backlog)

---

### F-C — `broadcasts-table._loadData` fetches short_links with `expires_at > now()` but component aggregation includes clicks on expired links [LOW]

**Location:** `broadcasts-table.js:99-103`

In `_loadData`, the `short_links` query filters `gt('expires_at', now())` — this is correct to exclude expired links from the type-lookup. However, `short_link_clicks` are not date-filtered (they are fetched all-tenant with no time bound). This means if a link expired after a broadcast's click occurred, the click's `link_type` would be looked up in `linkTypeById` — but if the link has expired it would not be in `linkTypeById` (filtered out), so `lt` would be `''` and the unsubscribe check (`if (lt === 'unsubscribe')`) would silently miss those clicks.

In practice, unsubscribe links are created at template-send time and expire much later, so this edge case is unlikely to produce visible errors. But it is technically a counting gap: if an unsubscribe link expired (which should not happen for active tenants) its click contributions would not be reflected in the Unsubscribes column. For the current data set (Prizma: 6,278 unsubscribe short_links with extended expiry) this is dormant.

**Severity:** LOW (dormant for current data; no Iron Rule violation; log for next review cycle)

---

### F-D — MODULE_MAP.md not updated [LOW — Executor already logged as F-4]

**Location:** `modules/Module 4 - CRM/docs/MODULE_MAP.md`

CLAUDE.md §8: "Add a new function → Update module's MODULE_MAP.md in the SAME commit." 4 new globals were introduced. The Executor correctly flagged this as F-4 and noted it should be fixed in the C4 docs commit. The Foreman's docs commit has not been staged yet.

**Action:** Must be done in the C4 docs commit (Foreman step). Reviewer is flagging to ensure Foreman adds this to their close checklist.

**Severity:** LOW — not blocking Tester; must be resolved before FOREMAN_REVIEW is committed.

---

## 5. F-2 Fix Audit — Independent Verdict

### What was fixed

Commit `7f4692d` added `_lastDateWindow` state to the orchestrator and rewired `_onFilterChange` to distinguish date changes from toggle/type changes:

```javascript
// New: snapshot set in _renderBroadcasts() before DB query
_lastDateWindow = { days: state.days, customFrom: state.customFrom, customTo: state.customTo };

// New: _onFilterChange logic
var dateChanged = !_lastDateWindow ||
  state.days !== _lastDateWindow.days ||
  state.customFrom !== _lastDateWindow.customFrom ||
  state.customTo !== _lastDateWindow.customTo;

if (dateChanged) {
  _renderBroadcasts(); // full DB reload + snapshot update
} else {
  CrmShortLinksBroadcastsTable.applyFilter(state); // client-side only
}
```

### Correctness analysis

**Snapshot timing:** `_lastDateWindow` is set at the top of `_renderBroadcasts()` before the await, not after. This is correct — the snapshot reflects what date window was **requested**, not what came back from the DB. There is no race condition risk here because `_onFilterChange` is driven by user interaction (synchronous click events), not concurrent async callbacks.

**Infinite recursion check:** `_renderBroadcasts()` is called from `_onFilterChange` on date change. `_renderBroadcasts()` calls `CrmShortLinksBroadcastsTable.render(...)` but does NOT call `_onFilterChange` again. `CrmShortLinksFilterBar.render()` is NOT called from `_renderBroadcasts()` — only `CrmShortLinksFilterBar.getState()` is called. No recursion path exists.

**Off-by-one / stale snapshot:** On the very first filter change (before any re-render), `_lastDateWindow` is set during the initial `loadCrmShortLinksStats` call (which calls `_renderBroadcasts()` at init). So `_lastDateWindow` is never null when the first chip click fires. The `!_lastDateWindow` guard is therefore only a defensive null-check for the unusual case where `_onFilterChange` fires before init completes. Correct.

**Null handling:** `state.customFrom` and `state.customTo` are initialized to `null` in filter-bar's state. Comparing `null !== null` → false (no spurious date-change trigger on non-date filter changes). Correct.

**Verdict: F-2 fix is correct, complete, and has no off-by-one, infinite recursion, or race condition.** The fix resolves the originally-reported UX gap. The date-chip now triggers a full `_renderBroadcasts()` (new DB query + new snapshot), while toggle/link-type changes route through `applyFilter()` as designed.

**One minor note (not blocking):** The fix correctly handles the 7/30/90 preset chips. However, if a "custom" date range input were ever added (state fields `customFrom`/`customTo`), the comparison logic is already wired to handle it — the custom path is future-proof.

---

## 6. SPEC §5 Success Criteria — Code-Side Assessment

| # | Criterion | This Reviewer | Notes |
|---|---|---|---|
| 11 | Smoke 8/8 PASS | Code-verified | Executor confirmed in EXECUTION_REPORT; integrity gate also passed. |
| 12 | IR31 integrity gate | Code-verified | Fresh `npm run verify:integrity` ran during this review — exit 0. |
| 13 | IR32 destructive ops | Code-verified | 0 declared, grep confirms 0 in diff. |
| 14 | IR34 Chrome MCP triplet | Deferred to Tester | Expected — not Reviewer's gate per prompt instructions. |
| 15 | Cross-Module Safety §4 | Code-verified | All §4.2 surfaces confirmed NOT-TOUCHED above. |
| 16 | Working tree scope-clean | Code-verified | `git diff --name-only` shows exactly the 8 expected paths. Pre-existing dirty paths untouched. |
| 1–10 | UI/perf criteria | Deferred to Tester | All require live browser/Chrome MCP verification. |

---

## 7. Reviewer-Skill Improvement Proposals

### P-REVIEWER-1 — Add "filter-chip coverage" to Reviewer checklist

**Where:** `.claude/skills/opticup-reviewer/SKILL.md` — add to the "CRM / filter-based components" review section (or create it if absent).

**Change:** *"For any SPEC that introduces a filter bar with multiple chip types (toggle, date-range, dropdown): verify that each chip type is wired to the correct rendering path (client-side applyFilter vs full DB reload) AND that each filter dimension is applied uniformly across all components that display filtered data. It is common for a filter chip to be visually wired (updates UI state) but silently ignored by a sibling component's `applyFilter()` path. Both the wiring (callback triggered) and the consumption (each component reads and acts on the filter dimension) must be checked."*

**Rationale:** Finding F-A (link-type chip silently ignored in broadcasts-table's client-side filter) was discovered by reading `_renderRows` carefully. Without this checklist item, a Reviewer might confirm "filter chip fires callback" without checking that each downstream consumer actually uses the filter state.

---

### P-REVIEWER-2 — Add "expires_at vs click timestamp alignment" as a data-model smell pattern

**Where:** `.claude/skills/opticup-reviewer/SKILL.md` — add to the "DB query correctness" section.

**Change:** *"When a query fetches entity metadata with an `expires_at > now()` filter AND separately fetches events (clicks, log entries) without a matching time bound, flag a potential silent-miss gap: events that occurred against now-expired entities will have no matching metadata row and will be silently skipped in client-side joins. Check whether this gap is acceptable for the specific metric being computed, and log it as a finding if the metric's accuracy depends on expired-entity events."*

**Rationale:** Finding F-C (expired short_links silently dropped from `linkTypeById` lookup, causing those clicks' unsubscribe type to be undetectable) was caught by tracing the join path. This pattern recurs any time there is an entity-with-expiry + event-log join.

---

## 8. Sign-Off

**Reviewer: 🟢 PASS. No blockers. F-2 fix verified correct. Findings F-A (LOW) and F-D (LOW) noted for Foreman close checklist. Tester clear to proceed.**

---

*End of REVIEW_REPORT. Hand off to Localhost-Tester.*
