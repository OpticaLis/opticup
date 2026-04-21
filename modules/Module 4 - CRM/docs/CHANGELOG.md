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
