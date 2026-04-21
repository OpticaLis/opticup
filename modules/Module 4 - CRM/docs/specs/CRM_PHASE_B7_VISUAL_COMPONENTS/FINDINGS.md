# FINDINGS — CRM_PHASE_B7_VISUAL_COMPONENTS

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B7_VISUAL_COMPONENTS/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Dashboard activity feed uses derived data, not a real activity log

- **Code:** `M4-DATA-04`
- **Severity:** LOW
- **Discovered during:** §4.1.E — dashboard activity feed implementation
- **Location:** `modules/crm/crm-dashboard.js:198-215` (`buildActivityItems`)
- **Description:** SPEC §4.1.E describes an activity feed with 5 recent items, and §9 states the data source is "static/placeholder data (real activity log = future SPEC)". The B7 implementation builds items from `data.eventStats` + `data.leadStatusCounts`. That works visually but doesn't reflect real-time activity — a check-in or purchase done 2 minutes ago won't show up unless it also moves the dashboard aggregate counters. A real feed needs to read from `activity_log` (or a new dedicated `crm_activity_log` view).
- **Reproduction:** Check in an attendee in Event Day. Go back to the dashboard. The "activity feed" shows the same 5 derived items as before — no entry for the check-in.
- **Expected vs Actual:**
  - Expected (long-term): last 5 real actions (check-ins, lead status changes, broadcast sends, purchases) sorted by recency.
  - Actual (B7): 5 items synthesized from aggregate counts.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Needs a Supabase view or a direct `activity_log` query. That's a data-layer change which this SPEC was explicitly scoped to exclude. Should be paired with the B5 `rule-21-orphans` hook improvement (unrelated) under a single "CRM activity data layer" SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — KPI sparkline trailing values are synthesized from current totals

- **Code:** `M4-DATA-05`
- **Severity:** LOW
- **Discovered during:** §4.1.A + §4.4.C — sparkline rendering
- **Location:** `modules/crm/crm-dashboard.js:121-131` (`trailingSparkValues`), `modules/crm/crm-events-detail-charts.js:40-56` (`renderEventDetailKpiSparklines`)
- **Description:** The KPI sparklines on both the Dashboard and the Event Detail modal render a 5-bar history. The Dashboard variant takes the trailing 5 rows of `data.eventStats` for a real-ish trend; the Event Detail variant synthesizes 5 values as `[total * 0.6, total * 0.75, total * 0.85, total * 0.95, total]` because per-event historical snapshots don't exist. Visually compelling but not factual.
- **Reproduction:** Open any event detail modal. Sparkline shapes for all KPIs are identical in proportion (monotonic rise ending at the total). Real per-event progress would show registration/attendance curves that diverge.
- **Expected vs Actual:**
  - Expected (long-term): real time-series from daily snapshots of `v_crm_event_stats`.
  - Actual (B7): synthesized monotonic curves.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Fix requires storing daily snapshots — infrastructure work that belongs in its own SPEC. Meanwhile the visual still communicates "accumulating toward current total" which is directionally correct. Track as debt, don't block.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Messaging Hub split-layout is rendered inside the sub-tab, not at the orchestrator level

- **Code:** `M4-UX-03`
- **Severity:** MEDIUM
- **Discovered during:** §4.5 — messaging templates split layout
- **Location:** `modules/crm/crm-messaging-tab.js:51-60` (orchestrator) and `modules/crm/crm-messaging-templates.js:57-74` (sub-tab)
- **Description:** `crm-messaging-tab.js` renders a single-body `<div id="crm-messaging-body">` and delegates to each sub-tab's renderer. `renderMessagingTemplates` then rebuilds the split-layout (sidebar + editor) inside that single body. Visually it works, but the split is conceptually wrong-owned: Rules, Broadcast, Log all ignore the split. This also means the `id="template-list"` + `id="messaging-editor"` shells in `crm.html` (left over from B6) are dead HTML — they get overwritten on every tab activation.
- **Reproduction:** `grep -n 'template-list\|messaging-editor' crm.html` shows the two IDs on lines 209–210. After `loadCrmMessagingTab()` runs, they're gone from the DOM — replaced by the orchestrator's single `<div id="crm-messaging-body">`.
- **Expected vs Actual:**
  - Expected (target architecture): the orchestrator owns the split (keeps `#template-list` + `#messaging-editor`), and each sub-tab renders into either side as appropriate.
  - Actual: each sub-tab redefines the layout independently.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** The fix is small but touches `crm-messaging-tab.js` + all 4 sub-tab renderers to agree on where they render. Belongs in a focused "Messaging Hub orchestrator lift" SPEC, not scope-creep inside B7.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `rule-21-orphans` hook still reports false positives on IIFE-local helpers

- **Code:** `M4-TOOL-01` (existing, re-observed)
- **Severity:** INFO
- **Discovered during:** commits 4, 5, 6
- **Location:** `scripts/verify.mjs` (rule-21 detector)
- **Description:** The pre-commit hook flagged duplicate `renderDetail` (commit 4, leads-detail.js + events-detail.js), duplicate `toast` + `logWrite` (commit 5, messaging files), and duplicate `updateLocal` + `logActivity` (commit 6, event-day files). All five are IIFE-local functions scoped inside `(function(){…})()` — they do not collide at runtime. This is the exact same detector issue noted in SESSION_CONTEXT under M4-TOOL-01 / B3 TOOL-DEBT-01 / B5 commit-1 false-positives. Hook is informational (doesn't block) but the noise erodes signal.
- **Reproduction:** Commit any pair of CRM files that both define an IIFE-local `toast` helper. Hook fires with `function "toast" defined in 2 files`.
- **Expected vs Actual:**
  - Expected: detector should understand IIFE scope and ignore functions declared inside `(function () { … })()` blocks.
  - Actual: detector does a top-level function-name scan and fires.
- **Suggested next action:** TECH_DEBT (existing)
- **Rationale for action:** Already tracked; re-observing to keep the signal fresh. A fix belongs in a `scripts/verify.mjs` hardening SPEC alongside other Phase 1 autonomy improvements.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — Unrelated `feat(settings)` commit interleaved with B7 feature commits

- **Code:** `M2-ENV-01`
- **Severity:** INFO
- **Discovered during:** §7 verification (`git log --oneline -10`)
- **Location:** commit `4e6aa83 feat(settings): add pixel events UI in analytics admin panel`
- **Description:** Between my commits 5 (`dfea397`) and 6 (`2aa64f1`), a parallel process (parallel Claude Code session, sync-watcher, or direct manual commit) landed `4e6aa83` on `develop`. It touches `modules/storefront/storefront-settings.js` and `storefront-settings.html` — completely orthogonal to CRM. My reflog shows it as `HEAD@{2}` so it did land locally, not just on origin. No conflict; B7 work unaffected.
- **Reproduction:**
  ```
  git log --format='%h %an %ar %s' 4e6aa83 -n 1
  git reflog -15
  ```
- **Expected vs Actual:**
  - Expected (ideal): the SPEC execution session should run against a quiescent `develop` — or at least be warned before an interleave.
  - Actual: commit appeared silently, discovered only when I ran `git log` during verification.
- **Suggested next action:** NEW_SPEC (low urgency)
- **Rationale for action:** If multiple Claude sessions / watchers can commit to the same `develop` without coordination, a future long-running SPEC could race or see its `git status` diverge unexpectedly. A short SPEC could define a "SPEC-run lock" (e.g., `.claude/.spec-running` sentinel or an advisory git note) and teach the executor to check it at First Action. Not urgent — B7 was fine — but worth a note before a larger SPEC hits this for real.
- **Foreman override (filled by Foreman in review):** { }
