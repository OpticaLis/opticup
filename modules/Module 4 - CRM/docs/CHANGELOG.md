# Module 4 — CRM: Changelog

---

## Phase A — Schema Migration (2026-04-20)

| Hash | Message |
|------|---------|
| `3c8e9fe` | `feat(crm): add CRM schema migration SQL (23 tables, 7 views, 8 RPCs)` |
| `370b0b9` | `docs(crm): update TODO and close CRM_PHASE_A_SCHEMA_MIGRATION with retrospective` |

---

## Phase B1 — Data Discovery (2026-04-20)

| Hash | Message |
|------|---------|
| `e9e8b5a` | `docs(crm): add Data Discovery Report for Monday exports` |
| `1152602` | `chore(spec): close CRM_PHASE_B1_DATA_DISCOVERY with retrospective` |

---

## Phase B2 — Data Import (2026-04-20)

| Hash | Message |
|------|---------|
| `7912a51` | `feat(crm): add Monday data import scripts (xlsx parser + REST runner)` |
| `8466e6b` | `feat(crm): import Monday data to CRM (leads, events, attendees, ads, CX)` |
| `5c1d7a7` | `chore(spec): close CRM_PHASE_B2_DATA_IMPORT with retrospective` |

---

## Phase B3 — Core UI (2026-04-20)

| Hash | Message |
|------|---------|
| `848b0c3` | `feat(crm): add CRM module card to home screen` |
| `3fb06b7` | `feat(crm): add CRM page structure and shared helpers` |
| `e6aeb12` | `feat(crm): add leads tab with search, filter, pagination, and detail modal` |
| `fda1fb2` | `feat(crm): add events tab and event detail modal` |
| `21918a6` | `feat(crm): add dashboard tab with stats and event performance` |
| `1bb0df6` | `chore(spec): close CRM_PHASE_B3_UI_CORE with retrospective` |

**Post-B3 fixes (landed in 2512f59):**
- `fix(crm): correct nav CSS selector — nav#mainNav → nav#crmNav`

---

## Phase B4 — Event Day Module (2026-04-20)

| Hash | Message |
|------|---------|
| `3d4e89f` | `docs(crm): archive SPECs and FOREMAN_REVIEWs for phases A, B1, B2, B3` |
| `4b36310` | `docs(crm): add CRM_PHASE_B4_EVENT_DAY SPEC` |
| `ddcddfd` | `feat(crm): add Event Day view layout and stats bar` |
| `3e1f22e` | `feat(crm): add Event Day check-in panel with RPC` |
| `c09fb40` | `feat(crm): add scheduled times board` |
| `1078c40` | `feat(crm): add attendee management (purchase, coupon, fee) and entry button` |
| `5709799` | `chore(spec): close CRM_PHASE_B4_EVENT_DAY with retrospective` |

New files: `crm-event-day.js`, `crm-event-day-checkin.js`, `crm-event-day-schedule.js`, `crm-event-day-manage.js`. Entry button + `wireEventDayEntry()` wiring in `crm-events-detail.js`. Hidden `#tab-event-day` section in `crm.html`. RPC used: `check_in_attendee`. All writes include `tenant_id` + `ActivityLog.write`.

---

## Phase B5 — Messaging Hub (2026-04-20)

| Hash | Message |
|------|---------|
| `684d3be` | `feat(crm): add messaging hub tab with templates and automation rules` |
| `b97f1c4` | `feat(crm): add broadcast send and message log UI` |
| _(pending)_ | `docs(crm): update Module 4 docs for B5 Messaging Hub` |
| _(pending)_ | `chore(spec): close CRM_PHASE_B5_MESSAGING_HUB with retrospective` |

New files: `crm-messaging-tab.js`, `crm-messaging-templates.js`, `crm-messaging-rules.js`, `crm-messaging-broadcast.js`. Modified: `crm.html` (nav button, tab section, 4 script tags), `modules/crm/crm-init.js` (routing), `css/crm.css` (sub-nav, toggle, chips, form rows). Writes to `crm_message_templates`, `crm_automation_rules`, `crm_broadcasts`, `crm_message_log` — all with `tenant_id` and `ActivityLog.write`. No DDL (tables existed from Phase A).

**B5 deviations:** SPEC planned 3 new JS files; split into 4 (templates + rules) so every file stayed under Iron Rule 12 line limit. See `CRM_PHASE_B5_MESSAGING_HUB/EXECUTION_REPORT.md` Decision #1 for rationale.

---

## Phase B6 — UI Redesign (2026-04-21)

| Hash | Message |
|------|---------|
| `24ac334` | `chore(crm): checkpoint pre-B6 — partial UI rewrite + SPEC + mockups from Cowork sessions` |
| `d0364b6` | `refactor(crm): rewrite crm.html to match FINAL mockup layout` |
| `ac37a21` | `refactor(crm): rewrite crm.css design system from FINAL mockups, split into 3 files` |
| `ebee32c` | `refactor(crm): adapt dashboard JS to new KPI card design language` |
| `545e26e` | `refactor(crm): adapt events + event-day JS to new HTML structure` |
| _(pending)_ | `docs(crm): update Module 4 docs for B6 UI Redesign` |
| _(pending)_ | `chore(spec): close CRM_PHASE_B6_UI_REDESIGN with retrospective` |

Visual rewrite — no new features, no DB changes. `crm.html` dropped from 377→271 lines by extracting inline JS to new `modules/crm/crm-bootstrap.js` (Iron Rule 12). `css/crm.css` split from 983 lines into 3 files (crm.css 215 + crm-components.css 231 + crm-screens.css 300), all ≤350. Added new design tokens and component classes for KPI grid, capacity-bar, view-toggle, messaging split, event-day 3-column counter-bar, barcode input. Dashboard stat cards renamed to KPI cards; event-day stats bar switched to counter-card styling; event modal now renders segmented capacity-bar.

**B6 deviations:** (1) SPEC targeted 15 JS files; added 1 (`crm-bootstrap.js`) to comply with Rule 12 after HTML grew during container additions — within SPEC §5 ≤18 ceiling. (2) Full 3-column runtime UX for Event Day checkin sub-tab not implemented in JS (HTML shells satisfy C13 grep; UX restructure is follow-up scope per FINDINGS.md). (3) Messaging split runtime wiring similarly deferred. See `CRM_PHASE_B6_UI_REDESIGN/EXECUTION_REPORT.md`.

---

## Phase B7 — Visual Components (2026-04-21)

| Hash | Message |
|------|---------|
| `07bfa1c` | `feat(crm): add visual component CSS classes for B7 mockup alignment` |
| `aa7905f` | `feat(crm): rewrite dashboard with sparklines, bar chart, gauges, activity feed, timeline` |
| `38bf6b5` | `feat(crm): add kanban view, cards view, filter chips, bulk selection to leads tab` |
| `115301c` | `feat(crm): rewrite lead detail modal (5 tabs) and event detail (header, capacity, funnel, analytics)` |
| `dfea397` | `feat(crm): add code editor, 3-panel preview, category tabs, broadcast wizard` |
| `2aa64f1` | `feat(crm): enhance event day with gradient counters, scanner indicator, purchase flow, flash notifications` |
| _(pending)_ | `chore(crm): close B7 — module docs refresh + criteria verification` |
| _(pending)_ | `chore(spec): close CRM_PHASE_B7_VISUAL_COMPONENTS with retrospective` |

Visual-only rewrite that brings each CRM screen in line with the 5 FINAL mockups Daniel approved 2026-04-21 (B6 built the HTML skeleton + CSS design system; B7 makes the JS render functions produce the rich visual components). 2 new JS files (`crm-leads-views.js`, `crm-events-detail-charts.js`) and 1 new CSS file (`css/crm-visual.css`). 8 JS files rewritten. crm.html gained 4 containers (dashboard activity+timeline, leads filter-chips + bulk-bar), 2 new `<script>` tags, 1 new `<link>` tag. Event Day checkin sub-tab now renders as a live 3-column layout (waiting / scanner+selected-detail / arrived) — closes one of the B6 follow-ups. All 35 §2 structural criteria pass; 5 behavioral criteria deferred to Daniel QA. No DB schema changes, no new queries.

**B7 key additions:** gradient avatar circles, sparkline mini-charts, conversion gauges (conic-gradient), SVG funnel visualization (polygon stages + arrow markers), 5-step broadcast wizard with progress dots, WhatsApp/SMS/Email preview frames with live variable substitution, barcode-scanner scanning-indicator, selected-attendee gradient detail card, flash-notification toasts on check-in outcomes, purchase-amount modal with ₪ input, admin-only running-total of the day's revenue.

**File count:** 16 → 18 JS files, 3 → 4 CSS files. All files ≤350 lines (Rule 12).

---

## Phase B8 — Tailwind Visual Fidelity (2026-04-21)

| Hash | Message |
|------|---------|
| `bc04b1b` | `docs(crm): add B8 Tailwind Visual Fidelity SPEC` |
| `4d023e2` | `feat(crm): add Tailwind CDN to crm.html with config` |
| `fc36051` | `feat(crm): rewrite dashboard renders with Tailwind classes` |
| `c3e006a` | `feat(crm): rewrite leads renders with Tailwind classes` |
| `6d4a94b` | `feat(crm): rewrite events renders with Tailwind classes` |
| `4f1ba8b` | `feat(crm): rewrite messaging renders with Tailwind classes` |
| `b2dccf0` | `feat(crm): rewrite event-day renders with Tailwind classes` |
| `f9be29d` | `chore(crm): final CSS cleanup and consolidation` |
| _(pending)_ | `docs(crm): update B8 session context, changelog, module map` |
| _(pending)_ | `chore(spec): close CRM_PHASE_B8_TAILWIND_VISUAL_FIDELITY with retrospective` |

B7 structure was right but the CSS-variable-only styling did not match the 5 FINAL mockups Daniel approved on 2026-04-21 (the mockups are built with Tailwind CDN — gradients, shadows, rounded corners, typography, spacing). B8 loads Tailwind CDN on `crm.html` only (with a `tailwind.config` block for RTL, Heebo font, and `crm.*` custom colors matching the CSS variable palette) and rewrites every CRM render function to produce HTML with Tailwind utility classes that match the mockups.

**B8 key changes:**
- `crm.html` + Tailwind CDN + `tailwind.config` (305 lines total, +23)
- `crm-dashboard.js` 253→295: 4 gradient KPI cards with per-variant sparklines (indigo/cyan/emerald/amber), 3-column alert strip, stacked gradient bar chart, 3 conic-gradient gauges, animate-pulse activity feed, horizontal timeline cards
- `crm-leads-tab.js` 270→290 + `crm-leads-views.js` 106→112 + `crm-leads-detail.js` 209→228: white-card table with hover:bg-indigo-50/40, indigo filter chips, indigo bulk bar, pagination with `rounded-md` buttons, 4-column kanban with colored headers (emerald/amber/violet/indigo), 3-column card grid with gradient avatars, lead-detail modal with gradient-avatar header + 5 underline tabs + 4 gradient action buttons
- `crm-events-tab.js` 115→125 + `crm-events-detail.js` 210→206 + `crm-events-detail-charts.js` 210→201: events list with emerald revenue column, gradient event header (indigo→violet) with glass-morphism controls, segmented capacity bar, 6 gradient KPI cards with trend arrows (sky/emerald/amber/violet), SVG funnel unchanged (wrapped in white chart card), gradient bar analytics
- `crm-messaging-tab.js` 107→101 + `crm-messaging-templates.js` 299→304 + `crm-messaging-broadcast.js` 298→341 + `crm-messaging-rules.js` 221→234: rounded tab bar, template split-layout (category tabs + search + template cards + dark slate-900 code editor with line numbers + 3-panel preview in WhatsApp emerald / SMS sky / Email amber headers), 5-step wizard with progress connectors and green✓ completed state, rules with colored channel badges and pill toggles
- `crm-event-day.js` 181→196 + `crm-event-day-checkin.js` 209→217 + `crm-event-day-manage.js` 264→278 + `crm-event-day-schedule.js` 160: 5 gradient counter cards (sky/violet/emerald/amber/teal), live clock with animate-pulse dot, 3-column check-in grid (amber/indigo/emerald columns), dark slate-900 barcode input with emerald accent, gradient selected-attendee card (indigo→violet) with info grid, arrived column with purchase badges and running-total, purchase modal with 3xl amount input
- CSS reduced: `crm-visual.css` 347→20 (−327), `crm-components.css` 276→76 (−200), `crm-screens.css` 325→98 (−227). All inner content styling is now Tailwind; only shell containers in crm.html remain in CSS.

**No DB changes. No new features. No business logic changes.** Same 18 JS files. All files ≤350 lines (Rule 12 — tightest is `crm-messaging-broadcast.js` at 341).

---

## Phase B9 — Visual QA & Functional Verification (2026-04-21)

| Hash | Message |
|------|---------|
| `bd9ca8c` | `fix(crm): add zebra striping to leads table per FINAL-02` |
| `1df047b` | `fix(crm): dark slate-800 header bar for Event Day per FINAL-05` |
| _(pending)_ | `docs(crm): update B9 session context and changelog` |
| _(pending)_ | `chore(spec): close CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION with retrospective` |

Second attempt of B9 after attempt 1 was re-opened by the Foreman (Cowork sandbox lacked localhost access so visual+functional QA never ran). This attempt ran under Claude Code on Daniel's Windows desktop with chrome-devtools MCP so the browser was actually driven. All 5 CRM screens were opened in Chrome on `?t=prizma` and screenshotted; the dashboard, events list + detail modal, messaging (all 4 sub-tabs), and leads kanban + cards views all matched the FINAL mockup structure as-is. Two visual gaps found and fixed: (1) leads table missing `odd:bg-white even:bg-slate-50/60` alternating rows, (2) event-day header was white card instead of the dark slate-800 bar from FINAL-05. Functional QA walked `?t=demo` (page loads, 0 console errors, empty states render correctly — no seed data per known M4-DATA-03 gap) then `?t=prizma` read-only (all 5 tabs, lead detail modal with 5 sub-tabs and 4 gradient action buttons, event detail modal with capacity bar + 6 KPIs + funnel, event day entry with 5 counter cards + 3-column layout). 0 console errors across the full walk-through.

**No DB changes. No new features. No business logic changes.** 18 JS files unchanged in count.
