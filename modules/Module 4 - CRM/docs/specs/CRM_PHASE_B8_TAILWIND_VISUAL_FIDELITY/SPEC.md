# SPEC — CRM_PHASE_B8_TAILWIND_VISUAL_FIDELITY

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B8_TAILWIND_VISUAL_FIDELITY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** B8
> **Author signature:** Cowork strategic session (charming-dreamy-lamport)

---

## 1. Goal

Add Tailwind CSS CDN to `crm.html` and rewrite every CRM JavaScript render
function to produce HTML with Tailwind utility classes that visually match the
5 FINAL mockup files Daniel approved — so the CRM screens look like the mockups,
not like basic HTML tables with CSS variable borders.

---

## 2. Background & Motivation

B7 (`CRM_PHASE_B7_VISUAL_COMPONENTS`) added all structural components (sparklines,
filter chips, kanban, capacity bars, funnel, etc.) but rendered them with basic
CSS-variable styling. Daniel compared the mockups to the output side-by-side and
said: "זה לא נראה אותו הדבר. רוב העמודים לא נראים אותו הדבר כמו המוקאפים שאישרתי."

The root cause: the FINAL mockup files were built with Tailwind CDN utility classes
(gradients, shadows, rounded corners, spacing, typography). B6+B7 used only custom
CSS properties and basic class rules. No amount of CSS tweaking will close this gap
efficiently — the mockups use Tailwind, so the code should too.

Daniel approved the Tailwind CDN approach on 2026-04-21 and asked for speed and
stability optimizations.

**Dependencies:** B7 closed (8 commits on develop). B7 FINDINGS logged 5 items,
none blocking B8. Cowork null-byte truncation affected 9+ files — must be restored
from git before any edits.

---

## 3. Success Criteria (Measurable)

| # | Type | Criterion | Expected value | Verify command |
|---|------|-----------|---------------|----------------|
| 1 | S | Branch state before start | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | S | Tailwind CDN script in crm.html `<head>` | 1 `<script>` tag with `cdn.tailwindcss.com` | `grep -c 'cdn.tailwindcss.com' crm.html` → `1` |
| 3 | S | Tailwind config block in crm.html | 1 `tailwind.config` block with RTL + Heebo + custom colors | `grep -c 'tailwind.config' crm.html` → `1` |
| 4 | S | All CRM JS files under 350 lines | 0 files over 350 | `wc -l modules/crm/*.js \| awk '$1>350{print}' \| grep -v total` → empty |
| 5 | S | crm.html under 350 lines | ≤350 | `wc -l crm.html` → ≤350 |
| 6 | S | No console errors on page load | 0 errors | Browser console check on localhost (or `node --check` on all JS files) |
| 7 | S | All 18 CRM JS files pass syntax check | 0 errors | `for f in modules/crm/*.js; do node --check "$f"; done` → all exit 0 |
| 8 | S | Tailwind classes present in dashboard render | ≥10 distinct Tailwind utility classes | `grep -oP 'class="[^"]*"' modules/crm/crm-dashboard.js \| grep -oP '(bg-|text-|rounded-|shadow-|p-|m-|flex|grid|gap-)' \| sort -u \| wc -l` → ≥10 |
| 9 | S | Tailwind classes present in leads-tab render | ≥10 distinct Tailwind utility classes | Same pattern as #8 on `crm-leads-tab.js` |
| 10 | S | Tailwind classes present in events-detail render | ≥10 distinct Tailwind utility classes | Same pattern on `crm-events-detail.js` + `crm-events-detail-charts.js` |
| 11 | S | Tailwind classes present in messaging render | ≥10 distinct Tailwind utility classes | Same pattern on `crm-messaging-templates.js` |
| 12 | S | Tailwind classes present in event-day render | ≥10 distinct Tailwind utility classes | Same pattern on `crm-event-day*.js` |
| 13 | S | escapeHtml used on all user-data innerHTML | 0 raw user-data in innerHTML | `grep -n 'innerHTML' modules/crm/*.js` → every instance uses escapeHtml() for user data (Iron Rule 8) |
| 14 | S | tenant_id on every DB query | 0 queries missing tenant_id | `grep -n 'sb.from\|\.select\|\.insert\|\.update' modules/crm/*.js` → each has tenant_id (Iron Rule 22) |
| 15 | S | Total commits produced | ≤8 commits | `git log --oneline` count |
| 16 | S | CSS files: crm-visual.css can be significantly reduced | crm-visual.css ≤200 lines (from 347) | `wc -l css/crm-visual.css` → ≤200 |
| 17 | S | Zero Tailwind usage outside CRM | 0 hits in non-CRM files | `grep -rn 'cdn.tailwindcss.com' --include='*.html' . \| grep -v crm.html` → empty |
| 18 | B | Dashboard renders KPI cards with gradient backgrounds | Cards have `bg-gradient-to-*` classes | Visual check on localhost |
| 19 | B | Leads table has proper spacing, rounded rows, status badges | Matches FINAL-02 layout | Visual check on localhost |
| 20 | B | Event detail modal has gradient header + capacity bar | Matches FINAL-03 layout | Visual check on localhost |
| 21 | B | Messaging split-layout has sidebar with category tabs | Matches FINAL-04 layout | Visual check on localhost |
| 22 | B | Event Day has 3-column grid with counter bar | Matches FINAL-05 layout | Visual check on localhost |
| 23 | S | Docs updated: SESSION_CONTEXT.md | Contains B8 status | `grep 'B8' "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` |
| 24 | S | Docs updated: CHANGELOG.md | Contains B8 section | `grep 'B8' "modules/Module 4 - CRM/docs/CHANGELOG.md"` |
| 25 | S | Docs updated: MODULE_MAP.md | Reflects current file set | Verify file list matches actual `ls modules/crm/*.js` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Read all 5 FINAL mockup files to extract Tailwind patterns
- Add the Tailwind CDN `<script>` tag to `crm.html <head>`
- Add a `<script>` block with `tailwind.config` customization
- Rewrite HTML-generating functions in ALL `modules/crm/*.js` files to use Tailwind utility classes
- Remove CSS rules from `css/crm-visual.css` that are now handled by Tailwind utilities
- Remove CSS rules from `css/crm-components.css` and `css/crm-screens.css` that are superseded
- Split any JS file that exceeds 300 lines (Rule 12) — create ≤2 additional files without asking
- Commit and push to `develop`
- Run `node --check` on all modified JS files
- Update MODULE_MAP.md, SESSION_CONTEXT.md, CHANGELOG.md
- Restore any truncated files from git (`git show HEAD:<path> > <path>`) before editing

### What REQUIRES stopping and reporting
- Any schema change (DDL) — not authorized in this SPEC
- Modifying any file outside `crm.html`, `css/crm*.css`, `modules/crm/*.js`, and Module 4 docs
- Adding Tailwind CDN to ANY page other than `crm.html`
- Changing business logic (filter behavior, sort order, DB queries, pagination logic)
- Any Iron Rule violation detected during self-audit
- Any file exceeding 350 lines after edits that cannot be split cleanly

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `node --check` fails on any JS file after editing → STOP, fix syntax, re-check
- If crm.html exceeds 350 lines after Tailwind additions → STOP, find what to extract
- If any render function's behavior changes (different data displayed, different sort, different filter logic) → STOP — this SPEC is visual-only
- If Tailwind CDN `<script>` fails to load (test by checking `typeof tailwind` in console) → STOP, report network/CDN issue
- If any CSS file grows beyond 350 lines → STOP, split or remove redundant rules

---

## 6. Rollback Plan

- `git reset --hard {START_COMMIT}` — START_COMMIT = the commit hash before any B8 work
- No DB changes in this SPEC — DB rollback not needed
- CSS files can be restored from git independently if needed
- Tailwind CDN removal = delete the single `<script>` tag from crm.html

---

## 7. Out of Scope (explicit)

- **No new features** — no new buttons, tabs, modals, or behaviors
- **No DB changes** — no migrations, no new columns, no new views/RPCs
- **No business logic changes** — filter/sort/pagination/bulk-actions must work identically
- **No changes to shared/ directory** — shared JS/CSS is ERP-wide, not CRM-specific
- **No changes to non-CRM pages** — index.html, other module pages untouched
- **No removal of existing CSS custom properties** — keep `--crm-sidebar`, `--crm-accent` etc. for theme switching; Tailwind layers ON TOP
- **crm-helpers.js** — pure utility functions, no render output, skip
- **crm-init.js** — tab switching + page header logic, no visual render output, skip
- **crm-bootstrap.js** — role toggle + status cache + theme wiring, no visual render output, skip
- **The `is_auto`, `send_count`, `last_sent_at` columns** — known missing from crm_message_templates; do NOT add queries for them

---

## 8. Expected Final State

### Modified files (ALL — this is a visual rewrite of every render function)

**crm.html** — Modified:
- `<head>`: add Tailwind CDN `<script>` with `?plugins=forms` for form styling
- `<head>`: add `<script>` block with `tailwind.config = { ... }` for RTL support, Heebo font, and CRM color palette mapping
- Body structure: unchanged (same sidebar, same tabs, same containers)
- Target: ≤350 lines

**css/crm-visual.css** — Significantly reduced:
- Remove all rules that Tailwind now handles (gradients, shadows, spacing, rounded corners, typography)
- Keep: CSS custom properties (`:root { --crm-sidebar: ... }`), any animation keyframes, any complex selectors Tailwind can't replace
- Target: ≤200 lines (from 347)

**css/crm-components.css** — Reduced:
- Remove component rules superseded by Tailwind (card shadows, badge colors, pill styling)
- Keep: complex multi-state components, print styles, accessibility
- Target: ≤200 lines (from 276)

**css/crm-screens.css** — Reduced:
- Remove screen-specific layout rules now handled by Tailwind grid/flex
- Keep: complex responsive breakpoints, RTL-specific overrides
- Target: ≤250 lines (from 325)

**css/crm.css** — Minor changes:
- Ensure base styles don't conflict with Tailwind reset
- Target: ≤215 lines (same or smaller)

**modules/crm/crm-dashboard.js** (253 lines) — Rewrite render functions:
- `renderKpiCards()`: gradient card backgrounds, sparkline bars, icon containers → match FINAL-01 KPI section
- `renderAlertStrip()`: colored alert boxes with icons → match FINAL-01 alerts
- `renderEventPerformance()`: stacked bar chart rows → match FINAL-01 bar chart
- `renderConversionGauges()`: conic-gradient gauges → match FINAL-01 conversion section
- `renderActivityFeed()`: timeline with avatars and timestamps → match FINAL-01 feed
- `renderTimeline()`: horizontal scroll with event cards → match FINAL-01 timeline
- Reference: `campaigns/supersale/mockups/FINAL-01-dashboard.html`

**modules/crm/crm-leads-tab.js** (270 lines) — Rewrite render functions:
- `renderLeadsTable()`: table rows with checkboxes, status badges, tag pills → match FINAL-02 table
- `renderFilterChips()`: removable chip pills → match FINAL-02 chips
- `renderBulkBar()`: floating selection bar → match FINAL-02 bulk bar
- `renderPagination()`: page buttons → match FINAL-02 pagination
- Reference: `campaigns/supersale/mockups/FINAL-02-leads.html`

**modules/crm/crm-leads-views.js** (106 lines) — Rewrite:
- `renderCrmLeadsKanban()`: 4-column kanban board → match FINAL-02 kanban
- `renderCrmLeadsCards()`: 3-column card grid → match FINAL-02 cards
- Reference: `campaigns/supersale/mockups/FINAL-02-leads.html`

**modules/crm/crm-leads-detail.js** (209 lines) — Rewrite:
- `openCrmLeadDetail()`: modal with 5 tabs + 4 action buttons → match FINAL-02 detail modal
- Reference: `campaigns/supersale/mockups/FINAL-02-leads.html`

**modules/crm/crm-events-tab.js** (115 lines) — Rewrite:
- Event list table styling → consistent with leads table Tailwind patterns

**modules/crm/crm-events-detail.js** (210 lines) — Rewrite:
- `openEventDetail()`: gradient header, capacity bar, KPI cards → match FINAL-03
- Sub-tab rendering → match FINAL-03 attendees/messages/analytics sub-tabs
- Reference: `campaigns/supersale/mockups/FINAL-03-events.html`

**modules/crm/crm-events-detail-charts.js** (210 lines) — Rewrite:
- Sparklines, funnel SVG, analytics charts → match FINAL-03 visual elements
- Reference: `campaigns/supersale/mockups/FINAL-03-events.html`

**modules/crm/crm-messaging-tab.js** (107 lines) — Rewrite:
- Sub-tab bar styling → match FINAL-04 tab navigation
- Reference: `campaigns/supersale/mockups/FINAL-04-messaging.html`

**modules/crm/crm-messaging-templates.js** (299 lines) — Rewrite:
- Template sidebar with category tabs, template cards, editor area → match FINAL-04
- Reference: `campaigns/supersale/mockups/FINAL-04-messaging.html`

**modules/crm/crm-messaging-broadcast.js** (298 lines) — Rewrite:
- Broadcast wizard steps, preview panels → match FINAL-04 wizard
- Reference: `campaigns/supersale/mockups/FINAL-04-messaging.html`

**modules/crm/crm-messaging-rules.js** (221 lines) — Rewrite:
- Rules list cards → match FINAL-04 styling patterns

**modules/crm/crm-event-day.js** (181 lines) — Rewrite:
- Counter bar (5 gradient cards), 3-column grid shell → match FINAL-05
- Reference: `campaigns/supersale/mockups/FINAL-05-event-day.html`

**modules/crm/crm-event-day-checkin.js** (209 lines) — Rewrite:
- Check-in column with barcode scanner, selected attendee card → match FINAL-05
- Reference: `campaigns/supersale/mockups/FINAL-05-event-day.html`

**modules/crm/crm-event-day-manage.js** (264 lines) — Rewrite:
- Attendee management, purchase modal → match FINAL-05
- Reference: `campaigns/supersale/mockups/FINAL-05-event-day.html`

**modules/crm/crm-event-day-schedule.js** (160 lines) — Rewrite:
- Scheduled times list → match FINAL-05 styling patterns

### New files
- None expected. If a file exceeds 300 lines after Tailwind class additions, the executor may split (see §4 autonomy).

### Deleted files
- None

### DB state
- No changes

### Docs updated (MUST include)
- Module 4 `SESSION_CONTEXT.md` — update to reflect B8 completion
- Module 4 `CHANGELOG.md` — add B8 section with commit hashes
- Module 4 `MODULE_MAP.md` — update if any files were split

---

## 9. Commit Plan

Commits grouped by screen (allows partial rollback if one screen has issues):

- **Commit 0:** `chore(crm): restore truncated files from git` — run `git checkout HEAD -- <file>` on any files with null bytes or truncation. Only if needed.
- **Commit 1:** `feat(crm): add Tailwind CDN to crm.html with config` — crm.html only. After this commit the page loads with Tailwind available but no visual changes yet.
- **Commit 2:** `feat(crm): rewrite dashboard renders with Tailwind classes` — crm-dashboard.js + CSS reductions for dashboard components
- **Commit 3:** `feat(crm): rewrite leads renders with Tailwind classes` — crm-leads-tab.js, crm-leads-views.js, crm-leads-detail.js + CSS reductions
- **Commit 4:** `feat(crm): rewrite events renders with Tailwind classes` — crm-events-tab.js, crm-events-detail.js, crm-events-detail-charts.js + CSS reductions
- **Commit 5:** `feat(crm): rewrite messaging renders with Tailwind classes` — crm-messaging-*.js + CSS reductions
- **Commit 6:** `feat(crm): rewrite event-day renders with Tailwind classes` — crm-event-day*.js + CSS reductions
- **Commit 7:** `chore(crm): final CSS cleanup and consolidation` — remove all dead CSS rules across crm-visual/components/screens.css
- **Commit 8:** `docs(crm): update B8 session context, changelog, module map` — docs only

Each commit MUST pass `node --check` on all modified JS files before committing.

---

## 10. Technical Patterns & Reference

### 10.1 Tailwind CDN Setup

Add to `crm.html <head>`, AFTER the Supabase script tag, BEFORE the CSS links:

```html
<!-- Tailwind CSS (CDN — CRM only, not loaded on other ERP pages) -->
<script src="https://cdn.tailwindcss.com?plugins=forms"></script>
<script>
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { heebo: ['Heebo', 'sans-serif'] },
      colors: {
        crm: {
          sidebar: '#1e1b4b',
          accent: '#6366f1',
          surface: '#f8fafc',
          card: '#ffffff',
          text: '#1e293b',
          muted: '#64748b',
        }
      }
    }
  }
}
</script>
```

**Why CDN and not self-hosted:** CRM is an internal ERP tool used by Prizma staff
on known networks. CDN latency is negligible for internal tools. Self-hosting would
require a build step (against project architecture: "no build step"). The CDN
version includes the JIT compiler that generates only used classes.

**Performance note:** The Tailwind CDN script is ~15KB gzipped. It runs a JIT
compiler in the browser that generates CSS on-the-fly. For an internal ERP tool
this is fine. If Daniel ever wants faster loads, we can extract the generated CSS
to a static file in a future SPEC.

### 10.2 Pattern: Extracting Tailwind Classes from Mockups

For each render function, the executor MUST:
1. Open the corresponding FINAL mockup file
2. Find the HTML section that matches the component being rendered
3. Copy the Tailwind class strings from the mockup into the JS render function
4. Adapt dynamic parts (data interpolation, conditional classes)
5. Preserve `escapeHtml()` on all user data (Iron Rule 8)

Example transformation (from crm-leads-tab.js `renderLeadsTable`):

**Before (B7):**
```javascript
html += '<tr data-lead-id="' + escapeHtml(r.id) + '">' +
  '<td><input type="checkbox" ...></td>' +
  '<td>' + escapeHtml(r.full_name || '') + '</td>';
```

**After (B8 — classes from FINAL-02):**
```javascript
html += '<tr class="hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors" data-lead-id="' + escapeHtml(r.id) + '">' +
  '<td class="px-4 py-3"><input type="checkbox" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" ...></td>' +
  '<td class="px-4 py-3 font-medium text-gray-900">' + escapeHtml(r.full_name || '') + '</td>';
```

### 10.3 Pattern: CSS Custom Properties + Tailwind Coexistence

Keep the `:root` custom properties in `css/crm.css` for theme switching. Tailwind
handles layout, spacing, typography, shadows. Custom properties handle the color
scheme that changes when the user clicks a theme dot.

For themed colors, use Tailwind's arbitrary value syntax:
```javascript
'bg-[var(--crm-accent)]'
```

Or define them in `tailwind.config.theme.extend.colors` (preferred — see §10.1).

### 10.4 Mockup File Locations

| Screen | Mockup file | Primary JS files |
|--------|-------------|-----------------|
| Dashboard | `campaigns/supersale/mockups/FINAL-01-dashboard.html` | crm-dashboard.js |
| Leads | `campaigns/supersale/mockups/FINAL-02-leads.html` | crm-leads-tab.js, crm-leads-views.js, crm-leads-detail.js |
| Events | `campaigns/supersale/mockups/FINAL-03-events.html` | crm-events-tab.js, crm-events-detail.js, crm-events-detail-charts.js |
| Messaging | `campaigns/supersale/mockups/FINAL-04-messaging.html` | crm-messaging-tab.js, crm-messaging-templates.js, crm-messaging-broadcast.js, crm-messaging-rules.js |
| Event Day | `campaigns/supersale/mockups/FINAL-05-event-day.html` | crm-event-day.js, crm-event-day-checkin.js, crm-event-day-manage.js, crm-event-day-schedule.js |

### 10.5 RTL Considerations

Tailwind's default `space-x`, `pl-*`, `pr-*` use physical directions. Since
`crm.html` has `dir="rtl"`, use logical properties:
- `ps-4` / `pe-4` (padding-inline-start/end) instead of `pl-4` / `pr-4`
- `ms-4` / `me-4` (margin-inline-start/end) instead of `ml-4` / `mr-4`
- `text-start` / `text-end` instead of `text-left` / `text-right`

If the CDN version doesn't support logical properties natively, use the physical
equivalents but FLIPPED for RTL (i.e., `pr-4` in RTL = left padding). The mockups
already handle this — copy their classes.

### 10.6 File Size Management

Adding Tailwind class strings to innerHTML will increase line lengths. Strategies:
- Break long class strings across multiple lines using string concatenation
- Extract repeated class patterns into local `var` constants at the top of each IIFE:
  ```javascript
  var CLS_ROW = 'hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors';
  var CLS_CELL = 'px-4 py-3';
  var CLS_BADGE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  ```
- If a file exceeds 300 lines, split render functions into a separate file (e.g., `crm-dashboard-cards.js` + `crm-dashboard.js`)

---

## 11. Lessons Already Incorporated

- **FROM `B5/FOREMAN_REVIEW.md` Proposal 1** → "Column-level schema verification in SPEC code blocks"
  → APPLIED: §7 explicitly lists `is_auto`, `send_count`, `last_sent_at` as out-of-scope; §10.2 references only verified columns. No column references in this SPEC that weren't verified in the prior session.

- **FROM `B5/FOREMAN_REVIEW.md` Proposal 2** → "Replace exact file counts with maximum file counts"
  → APPLIED: §3 criterion #15 says "≤8 commits" not "exactly 8". §4 autonomy says "may split... create ≤2 additional files without asking."

- **FROM `B4/FOREMAN_REVIEW.md` Proposal 1** → "SPEC freshness check for pending commits"
  → APPLIED: §9 Commit 0 is conditional ("only if needed") and §10 doesn't reference any pending commits by hash — instead instructs the executor to detect and restore truncated files at runtime.

- **FROM `B4/FOREMAN_REVIEW.md` Proposal 2** → "ActivityLog.write reference in UI SPECs with writes"
  → NOT APPLICABLE: B8 has zero DB writes. Visual-only SPEC.

- **FROM B7 FINDINGS** → M4-DATA-04 (dashboard activity feed uses derived data)
  → ACKNOWLEDGED but NOT IN SCOPE: B8 rewrites the visual rendering of the activity feed, not its data source. The feed will look better but still show derived data. Separate SPEC needed.

- **FROM B7 FINDINGS** → M4-UX-03 (messaging split-layout ownership)
  → ACKNOWLEDGED but NOT IN SCOPE: B8 rewrites the visual classes inside the existing render functions without changing which function owns which DOM region. The layout ownership fix belongs in a separate SPEC.

- **Cross-Reference Check completed 2026-04-21:** No new DB objects, functions, files, or config keys introduced. B8 modifies existing files only. 0 collisions.

---

## 12. Preconditions

### 12.1 File Truncation Recovery (MANDATORY FIRST STEP)

Cowork null-byte bug truncated multiple CRM files on Daniel's Windows desktop.
Before editing ANY file, the executor MUST:

1. Run `git status` — if any files show as modified without intentional changes, they may be truncated
2. For EVERY `modules/crm/*.js` and `css/crm*.css` file, compare on-disk size to git:
   ```bash
   for f in modules/crm/*.js css/crm*.css; do
     disk=$(wc -l < "$f")
     git_lines=$(git show HEAD:"$f" | wc -l)
     if [ "$disk" -ne "$git_lines" ]; then
       echo "TRUNCATED: $f (disk=$disk, git=$git_lines)"
     fi
   done
   ```
3. Restore any truncated file: `git checkout HEAD -- <file>`
4. After restoration, `git status` should show clean (or only the intentional changes)

### 12.2 Verify B7 is on develop

```bash
git log --oneline -1 | grep -q 'crm' && echo "OK" || echo "CHECK BRANCH"
```

### 12.3 Verify mockup files exist

```bash
ls campaigns/supersale/mockups/FINAL-0{1,2,3,4,5}*.html | wc -l
```
Expected: 5

---

## 13. Activation Text for Claude Code

Copy-paste this into a Claude Code session on Daniel's Windows desktop:

---

**הפעלה ל-Claude Code:**

```
Read the SPEC at:
modules/Module 4 - CRM/docs/specs/CRM_PHASE_B8_TAILWIND_VISUAL_FIDELITY/SPEC.md

This is an approved SPEC under Bounded Autonomy. Execute it end-to-end.
Start with §12 preconditions (file truncation recovery), then proceed
through commits 0-8 as specified in §9.

For each screen (commits 2-6), open the corresponding FINAL mockup file
listed in §10.4, extract the Tailwind class patterns, and apply them to
the JS render functions. The goal is visual fidelity with the mockups.

Stop only on deviation from success criteria. Report progress at each
commit boundary.
```

---
