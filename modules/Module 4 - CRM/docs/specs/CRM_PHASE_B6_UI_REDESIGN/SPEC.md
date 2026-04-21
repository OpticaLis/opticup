# SPEC — CRM_PHASE_B6_UI_REDESIGN

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B6_UI_REDESIGN/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** B6 (UI Redesign)
> **Author signature:** Cowork strategic session (charming-dreamy-lamport)

---

## 1. Goal

Rewrite `crm.html` and `css/crm.css` so the CRM visually matches the 5 FINAL
mockup files that Daniel approved (dashboard B, leads C, events A, messaging A,
event-day C). Adapt all 15 existing JS modules to work with the new HTML
structure. **No new Supabase queries, no schema changes, no new features** — this
is a pure visual/structural alignment pass.

---

## 2. Background & Motivation

Daniel reviewed the CRM on localhost after Phase B5 closed and said "it looks
terrible." Over 2 Cowork sessions (2026-04-20/21) we built 20 HTML mockups, he
selected his favorites, and we created 5 FINAL mockup files with 3 new
requirements (role toggle, barcode scanner, purchase entry). A partial rewrite
of `crm.html` and `css/crm.css` was attempted in Cowork but only the shell
(sidebar + tab containers) landed. The JS modules still target the old HTML
structure, the tab selector had a `.tab` vs `.crm-tab` bug (fixed 2026-04-21),
and ~70 CSS classes from the mockups are missing.

**Prior SPECs:** B3 (UI Core), B4 (Event Day), B5 (Messaging Hub) all built
working JS logic. This SPEC preserves that logic and wraps it in the new design.

---

## 3. Success Criteria (Measurable)

| # | Type | Criterion | Expected value | Verify command |
|---|------|-----------|---------------|----------------|
| 1 | S | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | S | crm.html line count | ≤ 350 lines | `wc -l crm.html` |
| 3 | S | css/crm.css line count | ≤ 350 lines (split if needed) | `wc -l css/crm*.css` → each file ≤ 350 |
| 4 | S | Every JS file ≤ 300 lines | All 15 files under limit | `wc -l modules/crm/*.js` → max ≤ 300 |
| 5 | S | Tab switching works | `showCrmTab()` uses `.crm-tab` selector | `grep 'crm-tab' modules/crm/crm-init.js` → match |
| 6 | S | Sidebar nav present in HTML | `<aside class="crm-sidebar">` with 5 nav buttons | `grep -c 'crm-nav-item' crm.html` → 5 |
| 7 | S | Role toggle present | `toggleCrmRole` function exists | `grep 'toggleCrmRole' crm.html` → match |
| 8 | S | CSS design tokens match mockups | Sidebar=#1e293b or darker, accent=indigo family | `grep '\-\-crm-sidebar' css/crm.css` → match |
| 9 | S | Dashboard tab has KPI card containers | IDs for stat cards present | `grep 'crm-kpi' crm.html` → ≥ 4 matches |
| 10 | S | Leads tab has 3 view-mode structure | Table + kanban + cards containers | `grep 'leads-view-' crm.html` → ≥ 3 matches |
| 11 | S | Events tab has capacity-bar container | Capacity bar element present | `grep 'capacity-bar' crm.html` → match |
| 12 | S | Messaging tab has template list + editor areas | Editor and list containers | `grep 'messaging-editor\|template-list' crm.html` → ≥ 2 |
| 13 | S | Event-day tab has 3-column layout | Three column containers | `grep 'eventday-col-' crm.html` → 3 matches |
| 14 | S | Barcode scanner input on event-day | Input with auto-focus attribute | `grep 'barcode.*input\|scanner.*input' crm.html` → match |
| 15 | S | All script tags load without 404 | 15 JS files referenced | `grep -c 'modules/crm/' crm.html` → 15 |
| 16 | S | Zero orphaned CSS classes | No class in HTML without corresponding CSS rule | Spot-check 10 classes → all found in CSS |
| 17 | S | No Tailwind CDN in production HTML | No tailwindcss.com reference | `grep -c 'tailwind' crm.html` → 0 |
| 18 | B | CRM page loads without console errors | Zero errors on dashboard tab | Manual: open crm.html?t=prizma → F12 → 0 errors |
| 19 | B | Tab switching shows correct panel | Click each of 5 nav buttons → panel visible | Manual QA |
| 20 | B | Role toggle hides revenue in team mode | Click toggle → ₪ values disappear | Manual QA |
| 21 | S | Commits follow convention | `type(crm): description` format | `git log --oneline -N` → all match |

Type: S = structural (verify by command), B = behavioral (manual QA by Daniel)

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Read the 5 FINAL mockup files for visual reference
- Rewrite `crm.html` — new HTML structure matching FINAL mockups
- Rewrite `css/crm.css` — may split into multiple CSS files if > 350 lines
  (e.g., `css/crm-base.css` + `css/crm-screens.css`)
- Edit all 15 `modules/crm/*.js` files — update DOM selectors, element IDs,
  class names, and `innerHTML` templates to match the new HTML structure
- Edit `crm-init.js` tab switching to match new HTML
- Add new CSS files if splitting is needed (≤ 3 total CRM CSS files)
- Use `sb.from()` consistently with existing CRM code (per M4-DEBT-02 deferral)
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- Any change to files outside `crm.html`, `css/crm*.css`, `modules/crm/*.js`
- Any new Supabase query or RPC call not already in the existing JS
- Any change to the DB schema (DDL)
- Any change to `js/shared.js`, `js/shared-ui.js`, or any `shared/` file
- Any merge to `main`
- Any single file exceeding 300 lines after edit (must split first)
- Removing any existing function from `window.*` globals (may break callers)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If any existing `window.*` global function is removed or renamed → STOP
- If `crm.html` exceeds 350 lines after rewrite → STOP (split needed)
- If total JS file count in `modules/crm/` exceeds 18 (currently 15) → STOP
  (scope creep signal). Exception: splitting an oversized file into 2 does
  not count toward this limit.
- If the executor discovers a FINAL mockup references a Supabase table/view
  that doesn't exist → STOP (SPEC scope does not include DB changes)

---

## 6. Rollback Plan

All changes are to existing files (rewrite) or new CSS files. No DB changes.
- `git reset --hard {START_COMMIT}` — where START_COMMIT = commit hash before
  first change
- No DB rollback needed
- Notify Foreman; SPEC is marked REOPEN

---

## 7. Out of Scope (explicit)

- **New features:** Kanban drag-and-drop, chart libraries (Chart.js, D3), map
  visualizations, broadcast sending logic, automation scheduler. These appear
  in the FINAL mockups as future placeholders — render empty/static containers
  with "coming soon" Hebrew labels where needed.
- **Database changes:** No new tables, columns, views, RPCs, or RLS policies
- **External dependencies:** No new npm packages, no CDN additions except Lucide
  icons (already loaded in current crm.html)
- **shared.js / shared-ui.js / shared/ folder:** Do not touch
- **Messaging dispatch:** Messages still write `status='sent'` (M4-B5-01 fix
  is a separate commit, not part of this SPEC)
- **Demo tenant seeding:** M4-DATA-03 remains deferred
- **Integration Ceremony:** M4-DOC-06/07/08 (GLOBAL_MAP, GLOBAL_SCHEMA,
  FILE_STRUCTURE updates) are deferred to module close, not this phase

---

## 8. Expected Final State

### Modified files

**`crm.html`** — full rewrite:
- `<html lang="he" dir="rtl">` (preserved)
- Shared CSS links (variables.css, components.css, etc. — preserved)
- CRM CSS link(s) — `css/crm.css` (and `css/crm-screens.css` if split)
- Sidebar nav with 5 buttons matching FINAL mockups (dark bg, icons, Hebrew labels)
- Role toggle in sidebar footer (מנהל ראשי / צוות)
- Main content area (`#crm-main`) with 5 `<section class="crm-tab">` panels
- Each panel has the **static HTML skeleton** from its FINAL mockup:
  - Dashboard: KPI card grid, events table container, status bars container
  - Leads: filter bar, view toggle (table/kanban/cards), table container,
    lead detail modal skeleton
  - Events: events list container, event detail modal with capacity bar,
    funnel container, attendees container
  - Messaging: template list sidebar, editor area, preview panels, broadcast
    button area
  - Event-day: counter bar, 3-column layout (waiting/scanner/arrived),
    barcode input, purchase modal skeleton
- 15 `<script>` tags for `modules/crm/*.js`
- Inline `<script>` for role toggle logic (preserved from current)
- Lucide icons initialization

**`css/crm.css`** — full rewrite (may split into 2 files if > 350 lines):
- Section 0: CSS custom properties (theme palette from FINAL mockups)
- Section 1: App shell (sidebar, main content, responsive breakpoints)
- Section 2: Shared components (cards, badges, stat cards, buttons, tables,
  modals, pagination, filter bars, status dots)
- Section 3: Screen-specific styles (dashboard KPIs, leads filters/views,
  events capacity bar/funnel, messaging editor/preview, event-day columns)
- Section 4: Role-based visibility (`.crm-role-team [data-admin-only]`)
- Section 5: Animations and transitions
- All colors via CSS custom properties (no hardcoded hex outside `:root`)
- RTL-first: `padding-inline-start`, `margin-inline-end`, logical properties

**`modules/crm/crm-init.js`** — update selectors:
- Confirm `.crm-tab` selector (already fixed)
- Update any other selectors that reference old HTML structure

**`modules/crm/crm-dashboard.js`** — update render targets:
- Update `innerHTML` templates to use new CSS classes from crm.css
- Target new container IDs from rewritten crm.html
- Render KPI cards into the new grid structure

**`modules/crm/crm-leads-tab.js`** — update render targets:
- Update table rendering to use new CSS classes
- Update filter bar to match new HTML structure
- Add view-toggle handler (table active by default, kanban/cards show
  placeholder containers)

**`modules/crm/crm-leads-detail.js`** — update modal structure:
- Render lead detail into the new modal skeleton
- Use new CSS classes for info grid, notes, events, tags

**`modules/crm/crm-events-tab.js`** — update render targets:
- Render events list into new container
- Update styling classes

**`modules/crm/crm-events-detail.js`** — update modal structure:
- Render event detail into new modal with capacity bar, stats, attendees
- Use new CSS classes

**`modules/crm/crm-event-day.js`** — update layout:
- Render into 3-column layout structure
- Update stats bar to use counter-bar styling
- Route sub-tab content into correct columns

**`modules/crm/crm-event-day-checkin.js`** — update render:
- Render into center column
- Add barcode scanner input with auto-focus
- Use new attendee-card CSS classes

**`modules/crm/crm-event-day-schedule.js`** — update render:
- Render into new layout structure
- Use new CSS classes for time-slot chips

**`modules/crm/crm-event-day-manage.js`** — update render:
- Render purchase/coupon/fee controls with new CSS
- Use new card styling

**`modules/crm/crm-messaging-tab.js`** — update layout:
- Route sub-tabs into new messaging layout (list + editor)

**`modules/crm/crm-messaging-templates.js`** — update render:
- Render template list into sidebar structure
- Render editor into main area with new CSS

**`modules/crm/crm-messaging-rules.js`** — update render:
- Use new CSS classes for rules list and modal

**`modules/crm/crm-messaging-broadcast.js`** — update render:
- Use new CSS for broadcast form, recipient preview, log table

### New files (only if CSS split is needed)
- `css/crm-screens.css` — screen-specific styles (if crm.css > 350 lines)

### Deleted files
- None

### DB state
- No changes

### Docs updated (MUST include)
- Module 4 `SESSION_CONTEXT.md` — update status to B6
- Module 4 `CHANGELOG.md` — add B6 commits
- Module 4 `MODULE_MAP.md` — update line counts, add any new files

---

## 9. Commit Plan

- **Commit 1:** `refactor(crm): rewrite crm.html to match FINAL mockup layout`
  — crm.html full rewrite
- **Commit 2:** `refactor(crm): rewrite crm.css design system from FINAL mockups`
  — css/crm.css (and crm-screens.css if split)
- **Commit 3:** `refactor(crm): adapt dashboard + leads JS to new HTML structure`
  — crm-init.js, crm-dashboard.js, crm-leads-tab.js, crm-leads-detail.js
- **Commit 4:** `refactor(crm): adapt events + event-day JS to new HTML structure`
  — crm-events-tab.js, crm-events-detail.js, crm-event-day.js,
  crm-event-day-checkin.js, crm-event-day-schedule.js, crm-event-day-manage.js
- **Commit 5:** `refactor(crm): adapt messaging JS to new HTML structure`
  — crm-messaging-tab.js, crm-messaging-templates.js, crm-messaging-rules.js,
  crm-messaging-broadcast.js
- **Commit 6:** `docs(crm): update MODULE_MAP, SESSION_CONTEXT, CHANGELOG for B6`
- **Commit 7:** `chore(spec): close CRM_PHASE_B6_UI_REDESIGN with retrospective`
  — EXECUTION_REPORT.md + FINDINGS.md

---

## 10. Technical Patterns

### Design system extraction from FINAL mockups

The FINAL mockups use Tailwind utility classes for prototyping speed. The
production CSS must use vanilla CSS with custom properties. The executor should:

1. Read each FINAL mockup's inline `<style>` block and Tailwind classes
2. Extract the visual intent (colors, spacing, layout, typography)
3. Express that intent using CSS custom properties in `css/crm.css`
4. Never copy Tailwind CDN or utility classes into production

### Sidebar palette (from FINAL-01-dashboard.html)

```css
--crm-sidebar: #1e293b;      /* dark slate */
--crm-sidebar-dark: #0f172a;  /* header bg */
--crm-sidebar-hover: #334155;
--crm-sidebar-active: #475569;
--crm-accent: #4f46e5;        /* indigo */
```

These are already in the current `css/crm.css` `:root` block — preserve them.

### Role-based visibility pattern

Already implemented in current `css/crm.css`:
```css
.crm-role-team [data-admin-only] { display: none; }
```

Executor should:
- Add `data-admin-only` attribute to all revenue/money elements in HTML
- Ensure the `toggleCrmRole()` function in crm.html toggles class correctly
- This is already partially working — verify and extend to all 5 screens

### HTML skeleton vs JS rendering

The pattern for this SPEC: **HTML provides the skeleton (containers, headers,
filter bars), JS fills the data.** This is the same pattern as B3–B5, extended
to match the FINAL mockup layouts.

Example — Dashboard KPI cards:
```html
<!-- crm.html provides the container -->
<div id="crm-dashboard-kpis" class="crm-kpi-grid"></div>
```
```javascript
// crm-dashboard.js fills it
var grid = document.getElementById('crm-dashboard-kpis');
grid.innerHTML = data.map(kpi => `<div class="crm-kpi-card">...</div>`).join('');
```

### JS selector update checklist

For each JS file, the executor must:
1. `grep 'getElementById\|querySelector\|querySelectorAll\|className\|classList'`
   in the file
2. Cross-reference each selector against the new crm.html
3. Update any that don't match

### ActivityLog.write reference

Existing pattern (see `crm-init.js:65`):
```javascript
ActivityLog.write({
  action: 'crm.page.open',
  entity_type: 'crm',
  severity: 'info'
});
```

No new ActivityLog calls needed in this SPEC — it's a visual rewrite, not a
feature addition.

---

## 11. Lessons Already Incorporated

- **FROM `B3/FOREMAN_REVIEW.md` Proposal 1** → "Mandatory file-inspection step
  before writing SPEC code blocks" → APPLIED: §10 references actual current
  CSS variable names from `css/crm.css` `:root`, verified by reading the file.
  HTML container pattern examples verified against `crm.html` line 133.
- **FROM `B4/FOREMAN_REVIEW.md` Proposal 2** → "Include ActivityLog.write call
  reference" → APPLIED: §10 references `crm-init.js:65` (verified).
- **FROM `B5/FOREMAN_REVIEW.md` Proposal 1** → "Column-level schema verification"
  → NOT APPLICABLE: no DB queries in this SPEC.
- **FROM `B5/FOREMAN_REVIEW.md` Proposal 2** → "Replace exact file counts with
  maximum" → APPLIED: §5 says "≤ 18 JS files" not "= 15", and CSS may split.
- **FROM `B3/FOREMAN_REVIEW.md` Proposal 2** → "Chrome DevTools precondition for
  behavioral criteria" → APPLIED: §3 separates S (structural) from B
  (behavioral, manual QA by Daniel).
- **Cross-Reference Check completed 2026-04-21 against current codebase: 0
  collisions.** No new DB objects, functions, or files that conflict with
  existing names. The only new file possible is `css/crm-screens.css` — verified
  no file by that name exists.

---

## 12. Dependencies / Preconditions

- Phase B5 CLOSED (confirmed — see SESSION_CONTEXT.md)
- The `.tab` vs `.crm-tab` bug fix in `crm-init.js` already committed
  (2026-04-21 Cowork session)
- 5 FINAL mockup files exist at `campaigns/supersale/mockups/FINAL-0{1-5}*.html`
- No Chrome DevTools required — behavioral criteria (18–20) deferred to
  Daniel's manual QA on localhost
- Machine: 🖥️ Windows desktop (`C:\Users\User\opticup`)
