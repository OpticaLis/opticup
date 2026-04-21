# SPEC — CRM_PHASE_B7_VISUAL_COMPONENTS

> **Module:** 4 — CRM
> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B7_VISUAL_COMPONENTS/SPEC.md`
> **Author:** opticup-strategic (Cowork session, 2026-04-21)
> **Depends on:** B6 UI Redesign (CLOSED), B4 Event Day (CLOSED), B5 Messaging Hub (CLOSED)
> **Type:** Visual-only — no DB schema changes, no new tables, no RPC changes.

---

## 1. Goal

**Build all visual components from the 5 FINAL mockup files so each CRM screen matches the approved design.**

B6 built the HTML skeleton + CSS design system + JS selector migration. But the JS render functions still produce basic text/tables instead of the rich visual components Daniel approved in the FINAL mockups. This SPEC closes that gap: every screen must render the same component structure as its corresponding FINAL mockup.

**Scope:** Pure JS render-function rewrites + CSS additions. Structure and layout must match the mockups. Colors/theme may differ (using the existing `--crm-*` CSS variables).

**Files at risk:** 8 JS files (render rewrites), 2 CSS files (new component styles). All new code uses existing CSS variables — no new palette.

**Estimated commits:** 7 (one per screen + CSS + cleanup).

---

## 2. Success Criteria

| # | Criterion | Type | Expected | Verify |
|---|-----------|------|----------|--------|
| 1 | Dashboard: 4 KPI cards with sparkline mini-charts (5 bars each) | Structural | `grep -c 'sparkline' modules/crm/crm-dashboard.js` ≥ 1 | grep |
| 2 | Dashboard: Alert strip renders colored alert boxes | Structural | `grep -c 'alert' modules/crm/crm-dashboard.js` ≥ 1 | grep |
| 3 | Dashboard: Events comparison rendered as stacked bar chart (CSS bars, not `<table>`) | Structural | No `<table>` in event performance render | grep |
| 4 | Dashboard: Status distribution uses conversion gauge circles (conic-gradient) | Structural | `grep -c 'conic-gradient' css/crm-screens.css` ≥ 1 | grep |
| 5 | Dashboard: Activity feed with pulse-dot animation and timestamps | Structural | `grep -c 'activity-feed' modules/crm/crm-dashboard.js` ≥ 1 | grep |
| 6 | Dashboard: Events timeline as horizontal scrollable cards with progress bars | Structural | `grep -c 'timeline' modules/crm/crm-dashboard.js` ≥ 1 | grep |
| 7 | Leads: Kanban view renders 4 status columns with colored left-border cards | Structural | `grep -c 'kanban' modules/crm/crm-leads-tab.js` ≥ 1 | grep |
| 8 | Leads: Cards view renders 3-column grid with gradient avatar circles + tag pills | Structural | `grep -c 'card-grid\|lead-card' modules/crm/crm-leads-tab.js` ≥ 1 | grep |
| 9 | Leads: Filter chips with × close buttons appear when filters are active | Structural | `grep -c 'filter-chip' modules/crm/crm-leads-tab.js` ≥ 1 | grep |
| 10 | Leads: Bulk selection bar (checkboxes per row, purple bar with action buttons) | Structural | `grep -c 'bulk\|checkbox' modules/crm/crm-leads-tab.js` ≥ 2 | grep |
| 11 | Leads: Table has summary row at bottom | Structural | `grep -c 'summary-row\|tfoot' modules/crm/crm-leads-tab.js` ≥ 1 | grep |
| 12 | Leads detail modal: Gradient avatar circle + 5 tabs (events/messages/notes/timeline/details) | Structural | `grep -c 'detail-tab\|avatar-gradient' modules/crm/crm-leads-detail.js` ≥ 1 | grep |
| 13 | Leads detail modal: Footer with 4 action buttons (WhatsApp, SMS, edit, event-day) | Structural | `grep -c 'modal-footer\|action-btn' modules/crm/crm-leads-detail.js` ≥ 1 | grep |
| 14 | Events detail: Gradient header with event title, breadcrumb, header controls, info grid | Structural | `grep -c 'event-header\|gradient' modules/crm/crm-events-detail.js` ≥ 1 | grep |
| 15 | Events detail: Segmented capacity bar (registered/confirmed/waited) with legend | Structural | `grep -c 'capacity-segment\|capacity-bar' modules/crm/crm-events-detail.js` ≥ 1 | grep |
| 16 | Events detail: KPI cards with sparkline bars and trend indicators (↑ ↓ →) | Structural | `grep -c 'sparkline\|trend' modules/crm/crm-events-detail.js` ≥ 1 | grep |
| 17 | Events detail: SVG funnel visualization (4 stages with arrows) | Structural | `grep -c 'funnel\|svg\|polygon' modules/crm/crm-events-detail.js` ≥ 1 | grep |
| 18 | Events detail: 3 sub-tabs (attendees/messages/analytics) with grouped attendee list | Structural | `grep -c 'group-header\|sub-tab\|switchTab' modules/crm/crm-events-detail.js` ≥ 1 | grep |
| 19 | Events detail: Analytics tab with chart cards (conversion rates, hourly attendance, revenue breakdown, source) | Structural | `grep -c 'chart-card\|analytics' modules/crm/crm-events-detail.js` ≥ 1 | grep |
| 20 | Messaging: Template list sidebar with category tabs (all/auto/manual/drafts) and search | Structural | `grep -c 'category-tab\|filterTemplates' modules/crm/crm-messaging-templates.js` ≥ 1 | grep |
| 21 | Messaging: Code editor with line numbers and toolbar (bold/italic/underline/emoji/variables) | Structural | `grep -c 'line-numbers\|toolbar\|editor' modules/crm/crm-messaging-templates.js` ≥ 1 | grep |
| 22 | Messaging: Variable dropdown menu with {{name}}, {{event_name}}, etc. | Structural | `grep -c 'variable-menu\|insertVariable' modules/crm/crm-messaging-templates.js` ≥ 1 | grep |
| 23 | Messaging: 3-panel preview (WhatsApp/SMS/Email) with styled frames | Structural | `grep -c 'preview-panel\|whatsapp-frame\|sms-frame\|email-frame' modules/crm/crm-messaging-templates.js` ≥ 1 | grep |
| 24 | Messaging: Broadcast wizard modal with 5 steps + progress dots | Structural | `grep -c 'wizard-step\|wizard-dot\|wizard-progress' modules/crm/crm-messaging-broadcast.js` ≥ 1 | grep |
| 25 | Messaging: Message log sidebar table with status chips (sent/delivered/read/failed) | Structural | `grep -c 'status-chip\|message-log' modules/crm/crm-messaging-broadcast.js` ≥ 1 | grep |
| 26 | Event Day: Top counter bar with 5 gradient counter cards (registered/confirmed/arrived/purchased/revenue) | Structural | `grep -c 'counter-card\|counter-bar' modules/crm/crm-event-day.js` ≥ 1 | grep |
| 27 | Event Day: Center column has barcode scanner section with scanning-indicator animation | Structural | `grep -c 'scanning-indicator\|scanning-dot\|barcode' modules/crm/crm-event-day-checkin.js` ≥ 1 | grep |
| 28 | Event Day: Selected attendee card with gradient background, status/time/notes detail rows | Structural | `grep -c 'selected-card\|attendee-detail' modules/crm/crm-event-day-checkin.js` ≥ 1 | grep |
| 29 | Event Day: Right column split into "waiting to purchase" + "purchased" sections with amount display | Structural | `grep -c 'arrived-card\|purchase-badge\|amount-display' modules/crm/crm-event-day-manage.js` ≥ 1 | grep |
| 30 | Event Day: Purchase amount modal with ₪ input and save/cancel buttons | Structural | `grep -c 'purchase-modal\|purchase-amount' modules/crm/crm-event-day-manage.js` ≥ 1 | grep |
| 31 | Event Day: Flash notification animation on check-in/purchase | Structural | `grep -c 'flash-notification\|showNotification' modules/crm/crm-event-day-checkin.js` ≥ 1 | grep |
| 32 | Event Day: Running total at bottom of arrived column (admin-only) | Structural | `grep -c 'running-total\|data-admin-only' modules/crm/crm-event-day-manage.js` ≥ 1 | grep |
| 33 | All files under 350 lines | Structural | `wc -l modules/crm/*.js` — no file > 350 | wc |
| 34 | Zero JS syntax errors | Structural | `node --check modules/crm/*.js` exits 0 | node |
| 35 | CSS files under 350 lines each | Structural | `wc -l css/crm*.css` — no file > 350 | wc |
| 36 | All `data-admin-only` elements hidden in team role | Behavioral | Manual QA by Daniel | manual |
| 37 | Dashboard loads with data from live Supabase | Behavioral | Manual QA by Daniel | manual |
| 38 | Event Day barcode scanner auto-focuses on tab switch | Behavioral | Manual QA by Daniel | manual |
| 39 | All CRM tabs switch correctly | Behavioral | Manual QA by Daniel | manual |
| 40 | No console errors on page load | Behavioral | Manual QA by Daniel | manual |

**35 structural (verifiable in this session) + 5 behavioral (Daniel QA).**

---

## 3. Autonomy Envelope

### CAN do (no stopping required):

- Rewrite `innerHTML` render functions in any of the 8 JS files listed in §10
- Add new CSS classes to `css/crm-components.css` and `css/crm-screens.css`
- Add new CSS classes to `css/crm.css` if the other two are near the 350-line limit
- Create a NEW CSS file `css/crm-visual.css` if any CSS file would exceed 350 lines (add `<link>` to `crm.html`)
- Add new `<div>` containers to `crm.html` tab sections if needed for JS targets
- Split a JS file into two if it would exceed 350 lines (add `<script>` to `crm.html`)
- Use `escapeHtml()` and `CrmHelpers.*` for all user data rendering (Rule 8)
- Use `data-admin-only` attribute for revenue/financial fields (existing role-visibility pattern)
- Add `window.*` exports for new render functions (IIFE pattern, consistent with existing files)

### REQUIRES stopping:

- Any DB query not already present in the codebase (all data fetching code exists — this SPEC only changes rendering)
- Modifying `js/shared.js`, `js/shared-ui.js`, `js/auth-service.js`, or `js/supabase-ops.js`
- Modifying any file outside `modules/crm/`, `css/crm*.css`, or `crm.html`
- Adding new Supabase queries or RPC calls
- Any change to the sidebar HTML structure or navigation wiring
- File exceeding 350 lines with no obvious split point

---

## 4. Screen-by-Screen Component Specification

### 4.1 DASHBOARD (crm-dashboard.js → rewrite `renderStatCards`, `renderEventPerformance`, `renderStatusDistribution`, add new renderers)

**Reference:** `campaigns/supersale/mockups/FINAL-01-dashboard.html`

**Current state:** 4 plain text KPI cards, a plain HTML table for events, CSS bar rows for status.

**Target state — 6 visual sections:**

#### A. KPI Cards with Sparklines
Each card gets:
- Gradient background using `--crm-accent` / `--crm-info` / `--crm-success` / `--crm-warning` variables
- SVG icon (16×16) in top-right
- Value (large), label (small), trend text ("+12% מהאירוע הקודם")
- 5-bar sparkline at bottom: `div.crm-sparkline` containing 5 `div.crm-spark-bar` with varying heights
- Data source: existing `fetchDashboardData()` return values — no new queries

#### B. Alert Strip
- 3 colored alert boxes below KPI cards
- Each box: left-border gradient, icon, title, description
- Content: hardcoded CRM alerts (e.g., "3 לידים חדשים ממתינים", "אירוע #23 בעוד 5 ימים")
- Data source: derived from existing `data.eventStats` and `data.leadStatusCounts`

#### C. Events Comparison Bar Chart (replaces the current `<table>`)
- Stacked horizontal bar chart: each event = one row with 4 color segments (registered, confirmed, attended, purchased)
- Event name on the right, numbers inside/beside bars
- CSS-only bars using `width: X%` — same pattern as the existing `renderStatusDistribution`
- Data source: existing `data.eventStats` array (already fetched)

#### D. Conversion Gauges
- 3 circular gauges using `conic-gradient` CSS
- Show: registered→confirmed %, confirmed→attended %, attended→purchased %
- Each gauge: 120×120px circle, percentage text in center, label below
- Data source: computed from `data.eventStats` totals

#### E. Activity Feed
- Vertical list of 5 recent activity items (static/placeholder until B8 wires real activity log)
- Each item: pulse dot (green), timestamp, description text
- CSS animation: `.crm-pulse-dot` keyframe

#### F. Events Timeline
- Horizontal scrollable container with event cards
- Each card: event name, date, mini progress bar (attended/registered ratio), stats row
- `overflow-x: auto` with `scroll-snap-type: x mandatory`
- Data source: existing `data.eventStats` (last 5 events)

**File budget:** Current 163 lines → target ~300 lines. If exceeding 350, split: extract `crm-dashboard-charts.js` with gauge + bar-chart renderers.

---

### 4.2 LEADS (crm-leads-tab.js → rewrite table render, add kanban + cards views + filter chips + bulk selection)

**Reference:** `campaigns/supersale/mockups/FINAL-02-leads.html`

**Current state:** Single paginated table view. Kanban and Cards say "בקרוב".

**Target state — 5 new components:**

#### A. Enhanced Table with Checkboxes + Summary Row
- Header checkbox (select all) + per-row checkboxes
- When any checkbox is checked, show purple bulk-selection bar above table with action buttons (WhatsApp, SMS, change status, delete)
- Summary row at bottom (`<tfoot>`): total leads count, total revenue (admin-only)
- Status badges as colored pills (reuse `CrmHelpers.statusBadgeHtml`)
- Tag pills next to lead name (small colored spans)

#### B. Filter Chips
- When a filter dropdown changes value, add a chip below the filter bar
- Each chip: label text + × close button
- Clicking × resets that filter and removes the chip
- CSS: `.crm-filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; background: var(--crm-accent-light); color: var(--crm-accent); font-size: 0.8rem; }`

#### C. Kanban View
- 4 columns: חדש (new), ממתין (waiting), הוזמן (ordered), אישר (confirmed)
- Each column: colored header bar, card count badge, scrollable card area
- Each card: lead name, phone, status, right-border color matching status
- Cards are read-only (no drag-and-drop in this phase)
- Data source: existing `loadedLeads` array, grouped by `status`

#### D. Cards View
- 3-column CSS grid (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`)
- Each card: gradient avatar circle (initials), name, phone, city, status badge, tags
- Click opens lead detail modal

#### E. View Switching
- Already wired (`switchCrmLeadsView` exists) — just need to populate kanban/cards containers with actual HTML instead of "בקרוב"

**File budget:** Current 222 lines → will exceed 350. **MUST SPLIT:** Extract `crm-leads-views.js` for kanban + cards renderers (≤250 lines). Keep table + filters + bulk in `crm-leads-tab.js` (≤300 lines). Add `<script src="modules/crm/crm-leads-views.js">` to `crm.html` before `crm-leads-tab.js`.

---

### 4.3 LEADS DETAIL MODAL (crm-leads-detail.js → rewrite `renderLeadDetail`)

**Reference:** `campaigns/supersale/mockups/FINAL-02-leads.html` (modal section)

**Current state:** Basic info display in modal.

**Target state:**

#### A. Modal Header
- Gradient avatar circle (large, 80px) with lead initials
- Lead name (h2), phone, city, source below
- Status badge pill

#### B. 5 Sub-tabs
- Tab bar: אירועים | הודעות | הערות | ציר זמן | פרטים
- Each tab renders into a container below
- אירועים: list of events the lead attended (from `v_crm_lead_event_history`)
- הודעות: placeholder "היסטוריית הודעות — בקרוב"
- הערות: list of notes from `crm_lead_notes` (already fetched in current code)
- ציר זמן: chronological timeline of events + status changes (combine events + notes by date)
- פרטים: full lead fields (email, language, address, tags, created_at)

#### C. Modal Footer
- 4 action buttons: WhatsApp (green), SMS (blue), ערוך (accent), מצב יום אירוע (orange)
- WhatsApp and SMS open `tel:` / WhatsApp deep links
- ערוך and מצב יום אירוע are placeholders (alert "בקרוב") until edit functionality is built

**File budget:** Current 163 lines → target ~280 lines. Should fit.

---

### 4.4 EVENTS DETAIL MODAL (crm-events-detail.js → major rewrite)

**Reference:** `campaigns/supersale/mockups/FINAL-03-events.html`

**Current state:** Basic event info + simple attendee table in modal.

**Target state — this is the most complex screen:**

#### A. Event Header (gradient)
- Full-width gradient header with event name (large), subtitle, breadcrumb
- 3 header action buttons: שלח הודעה, שנה סטטוס, ייצוא Excel
- Status dropdown
- Event info grid (3 cols): date/time, location (Waze link), description

#### B. Segmented Capacity Bar
- Horizontal bar with 3 colored segments (registered=blue, confirmed=green, waited=amber)
- Numbers inside each segment
- Legend below with colored dots + labels
- Data: from event stats

#### C. KPI Cards with Sparklines (event-specific)
- 6 cards: registered, confirmed, attended, purchased, revenue (admin-only), registration fees (admin-only)
- Each card: value, sublabel, trend arrow (↑↓→), sparkline bars
- Admin-only cards use `data-admin-only`

#### D. SVG Funnel Visualization (admin-only)
- 4 trapezoid stages: registered → confirmed → attended → purchased
- Arrows between stages
- Pure SVG, inlined in JS — `<svg viewBox="0 0 1000 300">`
- Numbers inside each stage, percentages below

#### E. 3 Sub-tabs: משתתפים | הודעות | סטטיסטיקות
- **משתתפים:** Grouped attendee list (by status), each group collapsible with group-header + count badge. Each attendee row: avatar, name, phone, status chip, purchase amount (admin-only), action buttons (WhatsApp, change status)
- **הודעות:** Timeline of sent messages with stats (sent/read/failed counts)
- **סטטיסטיקות:** Chart cards grid — conversion rates table, hourly attendance bars, revenue breakdown (admin-only), source breakdown bars

**File budget:** Current 184 lines → will exceed 350. **MUST SPLIT:** Extract `crm-events-detail-charts.js` for funnel + KPI cards + analytics renderers (≤300 lines). Keep header + capacity bar + attendees in `crm-events-detail.js` (≤300 lines). Add `<script>` to `crm.html`.

---

### 4.5 MESSAGING HUB (crm-messaging-templates.js → rewrite template editor, crm-messaging-broadcast.js → add wizard + log)

**Reference:** `campaigns/supersale/mockups/FINAL-04-messaging.html`

**Current state:** Template list renders, editor renders basic textarea, broadcast has basic form.

**Target state:**

#### A. Template List Sidebar (crm-messaging-templates.js)
- Category tabs at top: הכל (purple) | אוטומטי (green) | ידני (blue) | טיוטות (gray)
- Search input below tabs
- Template cards with: name, type badge, active/inactive status dot, last-sent date, send count, channel icons
- Active card: right-border accent color + background highlight

#### B. Code Editor (crm-messaging-templates.js)
- Toolbar: Bold, Italic, Underline | Emoji | Variables dropdown
- Dark-themed code editor with line numbers (monospace font, dark background)
- Variable dropdown: list of `{{name}}`, `{{event_name}}`, `{{event_date}}`, etc. with descriptions
- Below editor: template name input + type select + channel selection (WhatsApp/SMS/Email buttons with stats)
- Language selector + email subject field (shows when email channel selected)

#### C. 3-Panel Preview (crm-messaging-templates.js)
- Grid of 3 preview panels side by side
- WhatsApp: green header, chat-bubble style messages on beige background
- SMS: blue bubbles on gray background
- Email: amber header, white content area with formatted text
- Live preview updates as editor content changes (use the editor textarea value with variable substitution for sample data)

#### D. Action Buttons Row
- Save + activate, Save as draft, Duplicate, Delete (red), Send to self (green)

#### E. Broadcast Wizard (crm-messaging-broadcast.js)
- 5-step wizard modal: Recipients → Channel → Template → Timing → Confirmation
- Progress dots at top (active = accent color, completed = green)
- Step 1: filter selects (status, tags) + matching count display
- Step 2: channel selection buttons (WhatsApp/SMS/Email)
- Step 3: template selection (radio buttons)
- Step 4: timing (now / scheduled)
- Step 5: summary + send button

#### F. Message Log Sidebar (crm-messaging-broadcast.js or crm-messaging-templates.js)
- Toggleable sidebar with message history table
- Columns: time, recipient, channel icon, status chip
- Filter dropdowns: channel, status

**File budget:** `crm-messaging-templates.js` current 238 lines → will be tight. If exceeding, split editor into `crm-messaging-editor.js`. `crm-messaging-broadcast.js` current 297 lines → keep wizard within budget.

---

### 4.6 EVENT DAY (crm-event-day.js, crm-event-day-checkin.js, crm-event-day-manage.js)

**Reference:** `campaigns/supersale/mockups/FINAL-05-event-day.html`

**Current state:** Basic 3-column layout exists, counter bar exists, checkin/manage work.

**Target state — enhanced visuals:**

#### A. Top Counter Bar (crm-event-day.js)
- 5 gradient counter cards (blue/violet/green/gold/emerald)
- Each card: large number, label below
- Revenue card (emerald) is admin-only
- Pulse animation on "arrived" counter when it updates
- Live clock display + green pulse dot (live indicator)
- Role toggle button in header bar

#### B. Left Column — Waiting (crm-event-day-checkin.js)
- Column header: amber with icon + count
- Attendee cards with: name, phone, scheduled time, tags
- Overdue cards: orange left-border + amber background
- Selected card: blue left-border + blue background
- Hover: slight translateX shift

#### C. Center Column — Check-in (crm-event-day-checkin.js)
- Barcode scanner section: large input with scanning-indicator (green dot + "מוכן לסריקה")
- Secondary search input
- Quick-register button
- Notification area (flash animations)
- Selected attendee detail card: gradient background, name (large), phone, status/time/notes detail rows
- 2 action buttons: צ'ק-אין (green) + רשום רכישה (amber), 56px height

#### D. Right Column — Arrived (crm-event-day-manage.js)
- Column header: green with icon + count + history button
- Two sections: "ממתינים לקנייה" (waiting cards, green left-border) + "קנו" (purchased cards, amber left-border with amount)
- Purchase badge on cards awaiting amount entry
- Amount display (admin-only) on purchased cards
- Running total bar at bottom (admin-only, green background, amber amount)

#### E. Purchase Modal (crm-event-day-manage.js)
- Modal: name display, ₪ amount input (number, centered), save (green) + cancel buttons
- Purchase history modal: list of pending-amount attendees with "הזן סכום" action

**File budget:** Existing files (183 + 152 + 232 + 160) all have room. Focus on enriching the render HTML within each.

---

## 5. CSS Additions Required

New CSS classes needed (add to `css/crm-components.css` or `css/crm-screens.css` — stay under 350 per file, create `css/crm-visual.css` if needed):

### Dashboard Components
```
.crm-sparkline, .crm-spark-bar — mini bar chart (5 bars in KPI cards)
.crm-alert-box — colored alert with left-border gradient
.crm-stacked-bar, .crm-bar-segment — horizontal stacked bar chart rows
.crm-gauge, .crm-gauge-circle — conic-gradient circular gauge
.crm-gauge-label, .crm-gauge-value — text inside/below gauge
.crm-activity-item, .crm-pulse-dot — activity feed items
.crm-timeline-scroll, .crm-timeline-card — horizontal scrollable event cards
```

### Leads Components
```
.crm-filter-chip, .crm-filter-chip-close — removable filter chips
.crm-bulk-bar — purple bulk-selection bar
.crm-kanban-grid, .crm-kanban-col, .crm-kanban-card — kanban view
.crm-card-grid, .crm-lead-card — cards view grid
.crm-avatar-gradient — gradient circle avatar (shared across leads + events)
.crm-tag-pill — small tag badge
.crm-summary-row — table footer summary
```

### Events Detail Components
```
.crm-event-header — gradient header
.crm-capacity-bar, .crm-capacity-segment, .crm-capacity-legend — segmented capacity
.crm-funnel-svg — SVG funnel container
.crm-group-header, .crm-group-content — collapsible attendee groups
.crm-attendee-row, .crm-attendee-avatar — rich attendee list items
.crm-chart-card, .crm-chart-bar, .crm-chart-row — analytics chart cards
.crm-message-item, .crm-message-stats — message timeline items
```

### Messaging Components
```
.crm-category-tab — colored category tabs (all/auto/manual/drafts)
.crm-code-editor, .crm-line-numbers, .crm-editor-input — dark code editor
.crm-editor-toolbar, .crm-toolbar-btn — toolbar buttons
.crm-variable-menu, .crm-variable-item — variable dropdown
.crm-preview-container, .crm-preview-panel — 3-panel preview grid
.crm-whatsapp-frame, .crm-sms-frame, .crm-email-frame — channel previews
.crm-wizard-progress, .crm-wizard-dot, .crm-wizard-step — broadcast wizard
.crm-status-chip — status badges (sent/delivered/read/failed)
```

### Event Day Components
```
.crm-counter-card — gradient counter cards (5 color variants)
.crm-counter-number, .crm-counter-label — counter text
.crm-scanning-indicator, .crm-scanning-dot — barcode scanner indicator
.crm-attendee-card — left-border cards (overdue/selected/waiting/purchased variants)
.crm-arrived-card — arrived column cards
.crm-purchase-badge, .crm-amount-display — purchase indicators
.crm-flash-notification — slide-in notification animation
.crm-selected-detail — gradient detail card for selected attendee
.crm-running-total — bottom total bar
```

---

## 6. File Plan (new + modified)

| File | Action | Budget |
|------|--------|--------|
| `modules/crm/crm-dashboard.js` | REWRITE render functions | ≤340 lines |
| `modules/crm/crm-leads-tab.js` | REWRITE table + add filter chips + bulk selection | ≤300 lines |
| `modules/crm/crm-leads-views.js` | **NEW** — kanban + cards renderers | ≤250 lines |
| `modules/crm/crm-leads-detail.js` | REWRITE modal render | ≤300 lines |
| `modules/crm/crm-events-detail.js` | REWRITE — header, capacity bar, attendees | ≤300 lines |
| `modules/crm/crm-events-detail-charts.js` | **NEW** — KPI cards, funnel SVG, analytics tab | ≤300 lines |
| `modules/crm/crm-messaging-templates.js` | REWRITE — category tabs, code editor, 3-panel preview | ≤340 lines |
| `modules/crm/crm-messaging-broadcast.js` | ADD — wizard modal, message log | ≤340 lines |
| `modules/crm/crm-event-day.js` | ENHANCE — gradient counter bar, live clock, role toggle | ≤300 lines |
| `modules/crm/crm-event-day-checkin.js` | ENHANCE — scanner indicator, selected card, flash notifications | ≤280 lines |
| `modules/crm/crm-event-day-manage.js` | ENHANCE — arrived sections, purchase badge, running total | ≤300 lines |
| `css/crm-screens.css` | ADD dashboard + events visual classes | ≤350 lines |
| `css/crm-components.css` | ADD leads + messaging + event-day visual classes | ≤350 lines |
| `css/crm-visual.css` | **NEW** (only if crm-screens/components hit limit) | ≤300 lines |
| `crm.html` | ADD `<script>` tags for new JS files + optional CSS link | minimal |

**Total new files:** 2–3 JS + 0–1 CSS
**Total modified files:** 8–9 JS + 2–3 CSS + 1 HTML

---

## 7. Commit Plan

| # | Scope | Files | Message |
|---|-------|-------|---------|
| 1 | CSS foundation | `css/crm-screens.css`, `css/crm-components.css`, optionally `css/crm-visual.css` | `feat(crm): add visual component CSS classes for B7 mockup alignment` |
| 2 | Dashboard visuals | `crm-dashboard.js` | `feat(crm): rewrite dashboard with sparklines, bar chart, gauges, activity feed, timeline` |
| 3 | Leads tab + views | `crm-leads-tab.js`, `crm-leads-views.js` (new), `crm.html` | `feat(crm): add kanban view, cards view, filter chips, bulk selection to leads tab` |
| 4 | Leads + Events detail | `crm-leads-detail.js`, `crm-events-detail.js`, `crm-events-detail-charts.js` (new), `crm.html` | `feat(crm): rewrite lead detail modal (5 tabs) and event detail (header, capacity, funnel, analytics)` |
| 5 | Messaging hub | `crm-messaging-templates.js`, `crm-messaging-broadcast.js` | `feat(crm): add code editor, 3-panel preview, category tabs, broadcast wizard` |
| 6 | Event Day polish | `crm-event-day.js`, `crm-event-day-checkin.js`, `crm-event-day-manage.js` | `feat(crm): enhance event day with gradient counters, scanner indicator, purchase flow, flash notifications` |
| 7 | Cleanup + verify | All — null-byte cleanup, final lint | `chore(crm): clean null bytes from crm.html and crm.css, verify all B7 criteria` |

---

## 8. Technical Patterns

### Sparkline mini-chart (used in Dashboard + Events KPI cards)
```javascript
function renderSparkline(values, color) {
  // values = array of 5-8 numbers (0-100 representing % height)
  var bars = '';
  values.forEach(function(v, i) {
    bars += '<div class="crm-spark-bar" style="height:' + v + '%;background:' + escapeHtml(color) + '"></div>';
  });
  return '<div class="crm-sparkline">' + bars + '</div>';
}
```

### Conic-gradient gauge (Dashboard conversion)
```css
.crm-gauge-circle {
  width: 120px; height: 120px; border-radius: 50%;
  background: conic-gradient(var(--crm-accent) 0% var(--gauge-pct), var(--crm-border) var(--gauge-pct) 100%);
  display: flex; align-items: center; justify-content: center;
}
.crm-gauge-circle::after {
  content: ''; width: 90px; height: 90px; border-radius: 50%;
  background: var(--crm-card);
}
```

### SVG Funnel (Events detail)
```javascript
// Inline SVG with 4 trapezoid stages + arrow markers
// Each stage width proportional to its count / max count
// viewBox="0 0 1000 300", preserveAspectRatio="xMidYMid meet"
```

### escapeHtml() usage (Rule 8 — mandatory)
Every user-data string MUST pass through `escapeHtml()` before insertion into HTML strings. The only exceptions are numeric values computed by JS (counts, percentages) and CSS property values.

### ActivityLog.write() for writes (Rule 2)
This SPEC has NO writes — all render functions are read-only. No ActivityLog calls needed.

### tenant_id (Rule 22)
All data fetching already includes `tenant_id` filtering — this SPEC does not modify any fetch functions.

---

## 9. Data Sources (NO new queries)

Every visual component in this SPEC renders data that is ALREADY fetched by existing functions:

| Component | Data Source | Fetched In |
|-----------|------------|------------|
| Dashboard KPI | `fetchDashboardData()` → eventStats, totalLeads, etc. | crm-dashboard.js |
| Dashboard events chart | `data.eventStats` array | crm-dashboard.js |
| Dashboard gauges | computed from `data.eventStats` totals | crm-dashboard.js |
| Dashboard activity feed | static placeholder data (real activity log = future SPEC) | N/A |
| Leads table/kanban/cards | `loadedLeads` array from existing fetch | crm-leads-tab.js |
| Lead detail | existing `fetchLeadDetail()` | crm-leads-detail.js |
| Event detail + charts | existing `fetchDetail()` + `getCrmEventStatsById()` | crm-events-detail.js |
| Event attendees grouped | existing attendees array | crm-events-detail.js |
| Messaging templates | existing template fetch | crm-messaging-templates.js |
| Event Day counters/cards | existing event-day fetch functions | crm-event-day*.js |

---

## 10. Stop Triggers

Stop and report if ANY of these occur:

1. A JS file would exceed 350 lines after edits AND there is no clear split point
2. A CSS file would exceed 350 lines AND creating `crm-visual.css` doesn't resolve it
3. An existing fetch function returns data in a different shape than expected by the render code
4. `escapeHtml()` or `CrmHelpers` functions are not available at runtime
5. Any file outside the scope list (§6) needs modification
6. `node --check` fails on any modified file
7. `crm.html` would exceed 300 lines after adding new `<script>` tags

---

## 11. Rollback Plan

All changes are additive (new CSS classes, new render HTML, new JS files). Rollback:

1. **New files:** delete `crm-leads-views.js`, `crm-events-detail-charts.js`, optionally `css/crm-visual.css`
2. **Modified JS files:** `git checkout develop -- modules/crm/crm-dashboard.js modules/crm/crm-leads-tab.js modules/crm/crm-leads-detail.js modules/crm/crm-events-detail.js modules/crm/crm-messaging-templates.js modules/crm/crm-messaging-broadcast.js modules/crm/crm-event-day.js modules/crm/crm-event-day-checkin.js modules/crm/crm-event-day-manage.js`
3. **Modified CSS:** `git checkout develop -- css/crm-screens.css css/crm-components.css`
4. **crm.html:** `git checkout develop -- crm.html`
5. Remove new `<script>` tags from `crm.html` if not rolled back via git

---

## 12. Preconditions

1. Branch: `develop` (verify with `git branch`)
2. Clean working tree (if dirty, handle per CLAUDE.md §1 step 4)
3. All B6 commits are on `develop` (verify: `git log --oneline -3` should show B6 commits)
4. Verify current file existence: `ls modules/crm/crm-dashboard.js modules/crm/crm-leads-tab.js modules/crm/crm-leads-detail.js modules/crm/crm-events-detail.js modules/crm/crm-messaging-templates.js modules/crm/crm-messaging-broadcast.js modules/crm/crm-event-day.js modules/crm/crm-event-day-checkin.js modules/crm/crm-event-day-manage.js`
5. Verify CSS files: `ls css/crm.css css/crm-components.css css/crm-screens.css`

---

## 13. Dependencies / Preconditions Check

- **Chrome DevTools:** NOT required — all criteria are structural (grep/wc/node-check) except 5 behavioral ones deferred to Daniel QA
- **Supabase connection:** NOT required during build — no new queries
- **Node.js:** Required for `node --check` syntax validation

---

## 14. Post-Execution

After all 7 commits:
1. Run `node --check modules/crm/*.js` — must exit 0
2. Run `wc -l modules/crm/*.js css/crm*.css` — no file > 350
3. Verify all 35 structural criteria from §2
4. Write `EXECUTION_REPORT.md` + `FINDINGS.md` per folder-per-SPEC protocol
5. **Null-byte cleanup:** Run `truncate --no-create -s $(stat -c%s crm.html | xargs -I{} expr {} - $(tail -c 1 crm.html | xxd -p | grep -c '00'))` or equivalent to strip trailing null bytes from `crm.html` and `css/crm.css` (Cowork truncation bug)

---

*End of SPEC. This document specifies visual-only changes that make each CRM screen match the FINAL mockup structure. Colors use existing CSS variables — structure must match exactly.*
