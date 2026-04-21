# FINDINGS — CRM_PHASE_B6_UI_REDESIGN

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B6_UI_REDESIGN/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Event Day 3-column runtime layout not wired into JS

- **Code:** `M4-B6-01`
- **Severity:** MEDIUM
- **Discovered during:** §8 implementation of `modules/crm/crm-event-day.js`
- **Location:** `modules/crm/crm-event-day.js:107` (`renderLayout()`) + `modules/crm/crm-event-day-checkin.js:12` (`renderEventDayCheckin()`)
- **Description:** The new HTML in `crm.html` includes a 3-column shell inside `#tab-event-day` (`#eventday-col-waiting`, `#eventday-col-checkin`, `#eventday-col-arrived`) — these satisfy SPEC §3 C13 grep. However, when the user enters Event Day mode, `loadCrmEventDay()` calls `renderLayout(panel)` which does `panel.innerHTML = '...'` and replaces the entire 3-column structure with a single-column body. The 3-column UX from FINAL-05 mockup (waiting list left, scanner+selected attendee center, arrived list right) is NOT visible at runtime. Only the structural shells exist in HTML source.
- **Reproduction:**
  ```bash
  # In a browser on crm.html, navigate to an event → click "מצב יום אירוע":
  # Observed: single-column attendee table.
  # Expected (per FINAL-05): 3-column waiting/scanner/arrived layout with barcode-input centered.
  ```
- **Expected vs Actual:**
  - Expected: 3-column layout with waiting attendees on left, barcode scanner + selected attendee in center, arrived attendees on right.
  - Actual: counter-bar at top (✅ done in B6), then sub-tabs, then single-column body where check-in renders a search-bar + attendee table.
- **Suggested next action:** NEW_SPEC — `CRM_PHASE_B7_EVENT_DAY_3COL` (or fold into the planned Make-cutover SPEC).
- **Rationale for action:** Restructuring requires (a) splitting `_state.attendees` into 2 derived lists by check-in status, (b) rewriting `renderEventDayCheckin()` to render into a specific column rather than a full-host, (c) adding a new "selected attendee detail card" component for the center column, (d) potentially removing the schedule/manage sub-tabs in favor of a unified day-of view. This is a meaningful UX restructure that the current SPEC's "no new features" envelope (per §1, §7) does not cover.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Messaging Hub split-layout runtime wiring deferred

- **Code:** `M4-B6-02`
- **Severity:** MEDIUM
- **Discovered during:** §8 implementation of `modules/crm/crm-messaging-tab.js`
- **Location:** `modules/crm/crm-messaging-tab.js:51` (`renderLayout()`) + 4 sibling files (templates / rules / broadcast / log)
- **Description:** The new HTML in `crm.html` includes a split structure for `#tab-messaging` with `#template-list` (sidebar) and `#messaging-editor` (main pane) — satisfies SPEC §3 C12 grep. However, `loadCrmMessagingTab()` calls `renderLayout(panel)` which does `panel.innerHTML = '<subtabs>...<single body id="crm-messaging-body">'`, overwriting the split. The 4 sibling JS files (`crm-messaging-templates.js`, `crm-messaging-rules.js`, `crm-messaging-broadcast.js` rendering log+broadcast) all target `#crm-messaging-body` as their host. To wire the split runtime UX, `messaging-tab.js` would need to NOT overwrite the panel and route its 4 sub-tab renderers into `#messaging-editor` instead — a 4-file change.
- **Reproduction:**
  ```bash
  # In a browser, navigate to crm.html → click "מרכז הודעות":
  # Observed: full-width subtab layout with single body.
  # Expected (per FINAL-04): template list sidebar (left) + editor main area (right).
  ```
- **Expected vs Actual:**
  - Expected: Split layout with 320px template-list sidebar + 1fr editor main pane.
  - Actual: subtab bar across full width, then full-width body.
- **Suggested next action:** NEW_SPEC — `CRM_MESSAGING_HUB_SPLIT_LAYOUT` (small-scope, 1 day).
- **Rationale for action:** Same scope-tension as M4-B6-01: structural HTML containers exist (criterion satisfied), but runtime wiring requires touching 4 sibling JS files to retarget rendering host from `#crm-messaging-body` to `#messaging-editor`. The change is small per file but cross-cutting, and qualifies as "feature work" under SPEC §1's "no new features" envelope. Could be done in a future small SPEC after the rest of B6 is QA'd.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Mockup palettes (dark theme + violet) deliberately not adopted; SPEC §10 explicit "preserve indigo"

- **Code:** `M4-B6-03`
- **Severity:** INFO
- **Discovered during:** §10 review during pre-flight + reading FINAL-01 mockup
- **Location:** `css/crm.css` `:root` block + FINAL-01 / FINAL-02 / FINAL-03 / FINAL-04 / FINAL-05 mockup files
- **Description:** The 5 FINAL mockups visualize a dark-theme color palette — body backgrounds in slate-900 / gray-900 / dark-purple ranges, accent in violet (#8b5cf6) or purple (#7c3aed). The current production CSS uses light content area (#f8fafc), dark sidebar (#1e293b — slate-800), and indigo accent (#4f46e5). SPEC §10 contains an explicit instruction: "These [indigo tokens] are already in the current `css/crm.css` `:root` block — preserve them." This SPEC interpretation kept the production palette and adopted only the LAYOUT (KPI grid, alert strip, capacity-bar, view-toggle, etc.) from the mockups. The visual mismatch between the live UI and the mockup imagery may surprise Daniel during QA.
- **Reproduction:**
  ```bash
  # Compare campaigns/supersale/mockups/FINAL-01-dashboard.html (dark + violet)
  # to crm.html?t=prizma rendered in browser (light + indigo).
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §1 "visually matches"): dark theme + violet/purple accent.
  - Actual (per SPEC §10 "preserve indigo palette"): light content area + dark sidebar + indigo accent.
- **Suggested next action:** DISMISS — confirm with Daniel that §10's "preserve indigo" was the intended directive over §1's "visually matches" goal. If Daniel actually wanted dark-theme mockup palette, NEW_SPEC `CRM_DARK_THEME` to introduce a dark-mode token set as a `[data-crm-theme="dark"]` palette.
- **Rationale for action:** SPEC author may have intended one or the other; the explicit-vs-general tension was resolved by trusting the more specific instruction (§10). If Daniel disagrees in QA, the resolution is straightforward: add a new theme palette block in `css/crm.css` (the file already supports multiple `[data-crm-theme="..."]` selectors per existing teal/ocean placeholders).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `_origShowCrmTab` capture in old inline JS was dead code; bootstrap.js refactor cleaned it up

- **Code:** `M4-B6-04`
- **Severity:** LOW
- **Discovered during:** Extracting inline JS from crm.html to `modules/crm/crm-bootstrap.js`
- **Location:** former `crm.html:284` (now removed) + `modules/crm/crm-init.js:24` (still defines `window.showCrmTab`)
- **Description:** The original inline JS in `crm.html` had `var _origShowCrmTab = window.showCrmTab;` capturing the showCrmTab from `crm-init.js`, then immediately overwriting `window.showCrmTab` with a wrapper version. The wrapper never called `_origShowCrmTab` — the capture was dead code. Both versions did similar work (toggle classes, call sub-tab loaders). During the refactor to `crm-bootstrap.js`, I removed the unused `_origShowCrmTab` line and consolidated to a single replacement. `crm-init.js` still exports its own `window.showCrmTab` (gets overwritten when `crm-bootstrap.js` loads later) — that's effectively dead too but kept for safety in case `crm-bootstrap.js` fails to load.
- **Reproduction:**
  ```bash
  grep -n 'window.showCrmTab' modules/crm/*.js
  # crm-init.js:24 defines it, crm-bootstrap.js:19 redefines it.
  ```
- **Expected vs Actual:**
  - Expected: one canonical showCrmTab definition.
  - Actual: defined twice — second wins. Both functionally equivalent.
- **Suggested next action:** TECH_DEBT — small follow-up: remove `window.showCrmTab` from `crm-init.js` once `crm-bootstrap.js` is confirmed stable across all 3 dev machines. Minor cleanup, not blocking.
- **Rationale for action:** Removing prematurely could break the page if `crm-bootstrap.js` fails to load (e.g., 404 in production after merge). Keeping both is harmless — second definition wins and is the one that gets called.
- **Foreman override (filled by Foreman in review):** { }

---

## Notes for Foreman

- **Findings 1 + 2 are tightly scoped follow-ups.** They're flagged as MEDIUM because the structural HTML containers exist (criteria pass) but the runtime UX doesn't fully match FINAL-05 / FINAL-04 mockups. Daniel may want to see them in the next SPEC if QA reveals the gap.
- **Finding 3 is the biggest unknown.** If Daniel sees the live CRM and says "this isn't dark like the mockups", we have an immediate design escalation — SPEC §10 said preserve indigo so I trusted that. Recommend confirming with Daniel before the next SPEC is authored.
- **Finding 4 is purely housekeeping.** No urgency, no risk. Folder it into the next file-touching SPEC.
