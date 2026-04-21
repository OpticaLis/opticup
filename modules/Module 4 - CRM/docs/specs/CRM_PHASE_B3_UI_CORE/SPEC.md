# SPEC — CRM_PHASE_B3_UI_CORE

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B3_UI_CORE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-20
> **Module:** 4 — CRM
> **Phase:** B3 (Core UI — Leads, Events, Dashboard)
> **Author signature:** Cowork strategic session, Daniel present
> **Execution target:** Claude Code on Windows desktop (NOT Cowork)

---

## 1. Goal

Build the CRM module UI in the ERP — a new `crm.html` page with three tabs:
**Leads Management**, **Events Management**, and **Dashboard**. The UI reads
from the 7 Views + 8 RPCs created in Phase A and the data imported in Phase B2.
After this SPEC, Daniel can manage leads and events visually without Monday.com.

---

## 2. Background & Motivation

Phase A created the schema (23 tables, 7 Views, 8 RPCs).
Phase B2 imported all data (893 leads, 11 events, 149 attendees, 695 notes, 88
ad spend rows). The data is live in Supabase but has no UI — Daniel still needs
Monday.com to see or edit anything.

This SPEC builds the first usable CRM interface. Scope is deliberately limited
to the three core screens. Future phases will add:
- **B4:** Messaging Hub + Event Day Module (entrance scan, CX flow)
- **B5:** Make integration (webhooks replacing Monday scenarios)
- **B6:** Monday → CRM switch (parallel run + cutover)

**Key references:**
- Schema: `campaigns/supersale/CRM_SCHEMA_DESIGN.md`
- Data report: `campaigns/supersale/DATA_DISCOVERY_REPORT.md`
- ERP conventions: `docs/CONVENTIONS.md`
- Prizma tenant UUID: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | `crm.html` exists at repo root | File present | `ls crm.html` |
| 2 | `css/crm.css` exists | File present | `ls css/crm.css` |
| 3 | JS files in `modules/crm/` | 6–10 files (see §8) | `ls modules/crm/*.js \| wc -l` |
| 4 | Each JS file ≤ 350 lines | Max 350 per file | `wc -l modules/crm/*.js` |
| 5 | `crm.html` ≤ 350 lines | Max 350 | `wc -l crm.html` |
| 6 | Module card on `index.html` | CRM card visible, links to `crm.html` | Visual check / grep |
| 7 | Tab: Leads loads data | Table shows 893 rows (paginated) | Browser console: no errors |
| 8 | Tab: Events loads data | Table shows 11 events | Browser console: no errors |
| 9 | Tab: Dashboard loads data | 3 stat cards + event chart | Browser console: no errors |
| 10 | Lead detail modal opens | Click row → modal with lead info + notes + event history | Visual check |
| 11 | Event detail modal opens | Click row → modal with event info + attendee list | Visual check |
| 12 | RTL layout correct | All text right-aligned, tables RTL | Visual check |
| 13 | `index.html` CRM card links correctly | `href="crm.html"` | `grep crm.html index.html` |
| 14 | Zero console errors on page load | 0 errors | Browser DevTools |
| 15 | `FIELD_MAP` entries added in `shared.js` | All new CRM field names mapped | `grep crm_ js/shared.js` |
| 16 | Branch clean after final commit | `develop`, clean | `git status` |
| 17 | Commits produced | 3–5 commits | `git log --oneline` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Create new files: `crm.html`, `css/crm.css`, `modules/crm/*.js`
- Modify `index.html` to add CRM module card (single card addition)
- Modify `js/shared.js` to add FIELD_MAP entries for `crm_*` fields
- Run read-only SQL via MCP to verify data/Views
- Install no npm packages (Vanilla JS only — no build step)
- Use existing shared components: `modal-builder.js`, `table-builder.js`,
  `toast.js`, `activity-logger.js`, `pin-modal.js`, `search-select.js`
- Use existing shared CSS: all `shared/css/*.css` files
- Follow all existing UI conventions (see §13)

### What REQUIRES stopping and reporting

- ANY DB modification (INSERT, UPDATE, DELETE, DDL) — this is a UI-only SPEC
- ANY modification to files outside scope (no touching inventory, debt, etc.)
- ANY modification to `shared.js` beyond adding FIELD_MAP entries
- ANY modification to `shared/js/*.js` or `shared/css/*.css`
- If any existing global function name collides with a new CRM function

---

## 5. Stop-on-Deviation Triggers

- If `crm.html` exceeds 350 lines → split before continuing
- If any JS file exceeds 350 lines → split before continuing
- If the module card on `index.html` breaks existing cards → STOP
- If any View query returns an error → STOP
- If `shared.js` FIELD_MAP edit breaks existing code → STOP

---

## 6. Rollback Plan

All changes are new files + 2 surgical edits to existing files:
- `index.html` — one card addition (revert with `git checkout index.html`)
- `js/shared.js` — FIELD_MAP entries (revert with `git checkout js/shared.js`)

All new files can be deleted. No DB changes to roll back.

---

## 7. Out of Scope

- **Messaging Hub** — no message templates, no send buttons (Phase B4)
- **Event Day Module** — no entrance scan, no QR (Phase B4)
- **CX Survey UI** — no survey management screen (Phase B4)
- **Make integration** — no webhooks (Phase B5)
- **DB writes** — this SPEC is READ-ONLY for the DB. Lead/event editing
  will be enabled in a follow-up SPEC after the read-only UI is validated.
  Exception: the activity_logger may write to `activity_log` on page load
  (this is standard ERP behavior — acceptable).
- **Storefront repo** — no changes
- **Monday sync** — no `crm_monday_column_map` UI
- **Ad spend / Unit economics UI** — dashboard shows summary stats from Views,
  but no dedicated ad spend management screen
- **Campaign pages (public campaigner view)** — Phase B4+
- **Demo tenant data import** — QA seeding is a separate task

---

## 8. File Plan

### New files

```
crm.html                          — Main CRM page (tabs + layout)
css/crm.css                       — CRM-specific styles
modules/crm/crm-init.js           — Tab init, data loading orchestration
modules/crm/crm-leads-tab.js      — Leads table, filters, search
modules/crm/crm-leads-detail.js   — Lead detail modal (info + notes + events)
modules/crm/crm-events-tab.js     — Events table, status badges
modules/crm/crm-events-detail.js  — Event detail modal (info + attendees list)
modules/crm/crm-dashboard.js      — Dashboard: stat cards, charts, top-level metrics
modules/crm/crm-helpers.js        — Shared CRM utilities (phone format, status badges, Hebrew maps)
```

Total: 1 HTML + 1 CSS + 7 JS = 9 files.

### Modified files

```
index.html                        — Add CRM module card to grid
js/shared.js                      — Add FIELD_MAP entries for crm_ fields
```

---

## 9. UI Specification

### 9.1 Page Structure (`crm.html`)

```
┌─────────────────────────────────────────────────────┐
│ Header (sticky — same pattern as inventory.html)     │
│ 👤 {employee_name}  |  🏢 {tenant_name}  |  🔙 חזרה │
├─────────────────────────────────────────────────────┤
│ Nav Tabs:  📊 דשבורד  |  👥 לידים  |  📅 אירועים    │
├─────────────────────────────────────────────────────┤
│                                                       │
│                  [Tab Content Area]                    │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Tab order:** Dashboard (default) → Leads → Events.
Dashboard is the landing tab because it gives Daniel the overview first.

### 9.2 Tab 1 — Dashboard (דשבורד)

**Data sources:**
- `v_crm_event_stats` (11 rows) — event-level metrics
- `v_crm_lead_event_history` — lead-level aggregates
- `crm_leads` count — total leads
- `crm_ad_spend` aggregates — total spend

**Layout:**

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ 893      │  │ 11       │  │ ₪39,460  │  │ 55       │
│ לידים    │  │ אירועים  │  │ הכנסות   │  │ חוזרים   │
│ סה"כ     │  │ סה"כ     │  │ אחרון    │  │ לידים    │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

┌─────────────────────────────────────────────────────┐
│  📊 ביצועי אירועים                                   │
│                                                       │
│  Event  │ Registered │ Attended │ Purchased │ Revenue │
│  #23    │     --     │    --    │     --    │   --    │
│  #22    │    84      │    33   │    31     │ ₪39,460 │
│  #21    │    40      │    18   │    17     │ ₪19,350 │
│  ...    │    ...     │   ...   │    ...    │   ...   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📊 התפלגות סטטוס לידים                              │
│                                                       │
│  [Horizontal bar chart or simple table]               │
│  ממתין לאירוע: 450  ████████████████                  │
│  חדש: 200            ████████                          │
│  הוזמן לאירוע: 120   █████                             │
│  לא מעוניין: 80       ███                               │
│  ביטל: 43            ██                                │
└─────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Stat cards: simple `<div>` cards with count + label. No external chart library.
- Event performance table: read from `v_crm_event_stats`, sorted by `event_number DESC`.
- Status distribution: `SELECT status, count(*) FROM crm_leads WHERE tenant_id = ... AND is_deleted = false GROUP BY status`.
- Use CSS-only bar charts (percentage-width colored divs) — no Chart.js or D3.
- All numbers fetched fresh on tab switch (no caching).

### 9.3 Tab 2 — Leads (לידים)

**Data source:** `v_crm_leads_with_tags` (893 rows)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  🔍 חיפוש: [__________]   סטטוס: [▼ כל הסטטוסים]   │
│  שפה: [▼ הכל]             מיון: [▼ שם / טלפון / תאריך] │
├─────────────────────────────────────────────────────┤
│  שם מלא     │ טלפון         │ סטטוס    │ שפה │ אירועים │
│─────────────┼───────────────┼──────────┼─────┼─────────│
│ ישראל כהן  │ +972507775675 │ 🟡 ממתין │ he  │ 2       │
│ אלנה ברקי  │ +972542210500 │ 🟢 הוזמן │ ru  │ 1       │
│ ...         │ ...           │ ...      │ ... │ ...     │
├─────────────────────────────────────────────────────┤
│  עמוד 1 מתוך 18   ◀ 1 2 3 ... 18 ▶   │ 50 לכל עמוד │
└─────────────────────────────────────────────────────┘
```

**Features:**
- **Search:** filters by name OR phone (client-side on loaded page data)
- **Status filter:** dropdown populated from distinct statuses in data
- **Language filter:** dropdown (he/ru/en)
- **Sort:** by name (default), phone, created_at, status
- **Pagination:** 50 rows per page, client-side pagination
- **Row click → Lead Detail modal** (see §9.5)
- **Status badge colors:** `new`=blue, `waiting`=yellow, `invited`=green,
  `not_interested`=gray, `unsubscribed`=red. Map in `crm-helpers.js`.

**Data loading strategy:**
- Load ALL leads on tab activation (893 rows is small enough for client-side).
- Filter/sort/paginate in JS — no server round-trips for filtering.
- Use `v_crm_leads_with_tags` which includes tag arrays.

### 9.4 Tab 3 — Events (אירועים)

**Data source:** `v_crm_event_stats` (11 rows)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  קמפיין: [▼ הכל]   סטטוס: [▼ הכל]                   │
├─────────────────────────────────────────────────────┤
│  # │ שם אירוע          │ תאריך     │ סטטוס   │ נרשמו │ הגיעו │ רכשו │ הכנסות   │
│───┼────────────────────┼───────────┼─────────┼───────┼───────┼──────┼──────────│
│ 23│ SuperSale אפריל 26 │ 2026-04-25│ 🟢 פתוח │  --   │  --   │  --  │    --    │
│ 22│ SuperSale מרץ 26   │ 2026-03-27│ ✅ הושלם │  84   │  33   │  31  │ ₪39,460  │
│ 21│ SuperSale פברואר 26│ 2026-02-21│ ✅ הושלם │  40   │  18   │  17  │ ₪19,350  │
│...│ ...                │ ...       │ ...     │ ...   │ ...   │ ...  │ ...      │
└─────────────────────────────────────────────────────┘
```

**Features:**
- **Campaign filter:** SuperSale / MultiSale / All
- **Status filter:** completed / closed / registration_open / All
- **Row click → Event Detail modal** (see §9.6)
- **Status badge colors:** `completed`=green, `closed`=gray, `registration_open`=blue
- Only 11 rows — no pagination needed.

### 9.5 Lead Detail Modal

**Data sources:**
- `crm_leads` (single row by ID)
- `crm_lead_notes` (notes for this lead, ordered by `created_at DESC`)
- `v_crm_lead_event_history` (this lead's event history)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  👤 ישראל כהן                              [✕ סגור] │
├─────────────────────────────────────────────────────┤
│  פרטים                                               │
│  טלפון: +972507775675    שפה: עברית                   │
│  אימייל: —               עיר: —                       │
│  סטטוס: 🟡 ממתין לאירוע  מקור: facebook               │
│  תנאים: ✅ אושרו (2026-03-20)                         │
│  שיווק: ✅ מאושר                                       │
│  נוצר: 2026-01-15       עודכן: 2026-03-20             │
├─────────────────────────────────────────────────────┤
│  📝 הערות (1)                                         │
│  ─── היסטוריה ממאנדיי (ייבוא 2026-04-20) ───         │
│  [note content...]                                    │
├─────────────────────────────────────────────────────┤
│  📅 היסטוריית אירועים                                 │
│  #22 SuperSale מרץ 26  │ הגיע  │ רכש ₪1,200          │
│  #20 SuperSale פבר 26  │ הגיע  │ רכש ₪850            │
├─────────────────────────────────────────────────────┤
│  🏷️ תגים: SuperSale, VIP                             │
└─────────────────────────────────────────────────────┘
```

**Implementation:** Use `shared/js/modal-builder.js` to construct the modal
programmatically. The modal is read-only in this SPEC (editing = future SPEC).

### 9.6 Event Detail Modal

**Data sources:**
- `crm_events` (single row by ID)
- `v_crm_event_attendees_full` (attendees for this event)
- `v_crm_event_stats` (this event's stats)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  📅 אירוע #22 — SuperSale מרץ 2026          [✕ סגור]│
├─────────────────────────────────────────────────────┤
│  פרטים                                               │
│  תאריך: 27.03.2026      שעות: 09:00–14:00            │
│  מיקום: הרצל 32, אשקלון  סטטוס: ✅ הושלם              │
│  קופון: SuperSale0326    קמפיין: SuperSale            │
├─────────────────────────────────────────────────────┤
│  📊 סיכום                                            │
│  נרשמו: 84  │  הגיעו: 33  │  רכשו: 31  │  ₪39,460   │
│  שיעור הגעה: 39%  │  שיעור רכישה: 94%                 │
├─────────────────────────────────────────────────────┤
│  👥 משתתפים (33)                         🔍 [חיפוש]  │
│  שם          │ טלפון         │ סטטוס  │ רכישה        │
│  ישראל כהן  │ +972507775675 │ 🟢 הגיע│ ₪1,200       │
│  אלנה ברקי  │ +972542210500 │ 🟢 הגיע│ ₪850         │
│  ...         │ ...           │ ...    │ ...          │
│  [Show all 84 registered / filter by status]         │
└─────────────────────────────────────────────────────┘
```

**Attendee status filter:** All / Attended / Registered / No-show / Cancelled.

---

## 10. Technical Patterns

### 10.1 Data Loading

All data comes from Supabase via `shared.js` helpers:
```js
// Example — load leads with tags
const leads = await fetchAll('v_crm_leads_with_tags', {
  filters: { tenant_id: getTenantId(), is_deleted: false },
  orderBy: 'full_name'
});
```

**Defense in depth (Rule 22):** every query includes `.eq('tenant_id', getTenantId())`
even though RLS enforces it.

### 10.2 Status Badge Helper

In `crm-helpers.js`:
```js
function getCrmStatusBadge(status, entityType) {
  const colors = {
    lead: { new: '#3498db', waiting: '#f39c12', invited: '#2ecc71', not_interested: '#95a5a6', unsubscribed: '#e74c3c' },
    attendee: { registered: '#3498db', confirmed: '#2ecc71', attended: '#27ae60', no_show: '#e74c3c', cancelled: '#95a5a6' },
    event: { registration_open: '#3498db', completed: '#2ecc71', closed: '#95a5a6' }
  };
  // returns { color, hebrewLabel }
}
```

The Hebrew label map MUST use `crm_statuses` seed data from Phase A (31 rows).
Query once on page load and cache in-memory.

### 10.3 Phone Formatting

Display phones as `050-717-5675` (Israeli format) while storing as `+972507175675`.
Format helper in `crm-helpers.js`.

### 10.4 Currency Formatting

Use `₪` prefix with `toLocaleString('he-IL')`. Example: `₪39,460`.

### 10.5 Tab System

Follow the exact same `showTab()` pattern as `inventory.html`:
```html
<nav id="mainNav">
  <button data-tab="dashboard" class="active" onclick="showTab('dashboard')">📊 דשבורד</button>
  <button data-tab="leads" onclick="showTab('leads')">👥 לידים</button>
  <button data-tab="events" onclick="showTab('events')">📅 אירועים</button>
</nav>
```

### 10.6 Pagination

Client-side pagination for Leads (50 per page):
```js
let currentPage = 1;
const PAGE_SIZE = 50;
function renderLeadsPage(filteredLeads) {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filteredLeads.slice(start, start + PAGE_SIZE);
  // render page rows + pagination controls
}
```

---

## 11. Module Card on `index.html`

Add a CRM card to the existing modules grid. Follow the exact pattern of
existing cards:

```html
<a href="crm.html" class="module-card locked-overlay" data-permission="crm.view">
  <span class="card-icon">📋</span>
  <span class="card-label">CRM — ניהול לידים</span>
</a>
```

**Position:** After the existing cards (last in grid). The `locked-overlay`
class is removed after PIN login (same as other cards). The
`data-permission="crm.view"` gate can use any permission — the Prizma
tenant has a flat permission model where all logged-in users see everything.

---

## 12. Commit Plan

- **Commit 1:** `feat(crm): add CRM module card to home screen`
  Files: `index.html` (card addition)

- **Commit 2:** `feat(crm): add CRM page structure and shared helpers`
  Files: `crm.html`, `css/crm.css`, `modules/crm/crm-init.js`,
  `modules/crm/crm-helpers.js`, `js/shared.js` (FIELD_MAP entries)

- **Commit 3:** `feat(crm): add leads tab with search, filter, pagination, and detail modal`
  Files: `modules/crm/crm-leads-tab.js`, `modules/crm/crm-leads-detail.js`

- **Commit 4:** `feat(crm): add events tab and event detail modal`
  Files: `modules/crm/crm-events-tab.js`, `modules/crm/crm-events-detail.js`

- **Commit 5:** `feat(crm): add dashboard tab with stats and event performance`
  Files: `modules/crm/crm-dashboard.js`

---

## 13. Dependencies / Preconditions

- **Node.js** on the machine (v24.14.0) — only for git/verify, not for the app
- **No build step** — Vanilla JS, inline `<script>` tags, no bundler
- **Supabase MCP** connected (read-only queries for verification)
- Branch: `develop`
- Machine: Windows desktop
- **Pre-verified:** all 7 CRM Views return data (confirmed in B2 FOREMAN_REVIEW §5)
- **Existing shared components available:**
  - `shared/js/modal-builder.js` — programmatic modal construction
  - `shared/js/table-builder.js` — programmatic table construction
  - `shared/js/toast.js` — toast notifications
  - `shared/js/activity-logger.js` — activity log writes
  - `shared/js/supabase-client.js` — tenant-aware Supabase wrapper
  - `js/search-select.js` — searchable dropdown component
  - `js/shared.js` — Supabase init, constants, FIELD_MAP, utilities
  - `js/shared-ui.js` — `showTab()`, info modal
  - `js/auth-service.js` — PIN login, session management

---

## 14. Lessons Already Incorporated

- FROM `CRM_PHASE_A/FOREMAN_REVIEW.md` Proposal 1 → "Verify tenant UUIDs
  against live DB" — APPLIED: UUID `6ad0781b-...` verified in Phase B2.
- FROM `CRM_PHASE_B1/FOREMAN_REVIEW.md` Proposal 1 → "Verify execution-
  environment preconditions on target machine" — APPLIED: Node.js confirmed
  (v24.14.0). No Python needed. No npm packages needed (Vanilla JS).
- FROM `CRM_PHASE_B2/FOREMAN_REVIEW.md` Proposal 1 → "Add bulk-DML transport
  guidance" — NOT APPLICABLE (no DB writes in this SPEC).
- FROM `CRM_PHASE_B2/FOREMAN_REVIEW.md` Proposal 2 → "Require cross-file
  phone overlap in discovery reports" — NOT APPLICABLE (UI-only SPEC).
- FROM `CRM_PHASE_B2/FINDINGS` M4-DATA-01 → "DATA_DISCOVERY_REPORT col mapping
  wrong" — NOT APPLICABLE (UI reads from Views, not from Monday exports).
- Cross-Reference Check completed 2026-04-20 against GLOBAL_MAP.md + GLOBAL_SCHEMA.sql + FILE_STRUCTURE.md: **0 collisions**. `crm.html` does not exist. `modules/crm/` does not exist. `css/crm.css` does not exist. No `crm-` prefixed functions in GLOBAL_MAP. All names are new.

---

## 15. Execution Notes

### RTL Layout

The ERP is Hebrew-first, RTL. All new CSS must use:
- `direction: rtl` (inherited from `<html dir="rtl">`)
- Logical properties where available (`padding-inline-start`, not `padding-left`)
- Tables: text-align right by default

### Responsive

Desktop-first is fine for the ERP (staff use desktops). Mobile should not break
but doesn't need to be pixel-perfect.

### No External Dependencies

Do NOT add Chart.js, D3, or any charting library. Dashboard charts are CSS-only
(percentage-width colored bars). The ERP has zero external JS dependencies
beyond Supabase SDK and SheetJS (inventory-specific).

### Existing HTML/CSS Pattern

Follow `inventory.html` and `shipments.html` as the reference for:
- `<head>` structure (shared CSS links, module CSS link, script order)
- Header with back button
- Tab navigation
- Main content area
- Script loading at bottom of `<body>`

### Script Load Order in `crm.html`

```html
<!-- Bottom of <body> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="js/shared.js"></script>
<script src="js/shared-ui.js"></script>
<script src="js/supabase-ops.js"></script>
<script src="js/auth-service.js"></script>
<script src="shared/js/modal-builder.js"></script>
<script src="shared/js/table-builder.js"></script>
<script src="shared/js/toast.js"></script>
<script src="shared/js/activity-logger.js"></script>
<script src="modules/crm/crm-helpers.js"></script>
<script src="modules/crm/crm-init.js"></script>
<script src="modules/crm/crm-dashboard.js"></script>
<script src="modules/crm/crm-leads-tab.js"></script>
<script src="modules/crm/crm-leads-detail.js"></script>
<script src="modules/crm/crm-events-tab.js"></script>
<script src="modules/crm/crm-events-detail.js"></script>
```

### FIELD_MAP Entries

Add these to `js/shared.js` FIELD_MAP:
```js
crm_full_name: 'שם מלא',
crm_phone: 'טלפון',
crm_email: 'אימייל',
crm_city: 'עיר',
crm_language: 'שפה',
crm_status: 'סטטוס',
crm_source: 'מקור',
crm_terms_approved: 'תנאים מאושרים',
crm_marketing_consent: 'הסכמה שיווקית',
crm_event_number: 'מספר אירוע',
crm_event_name: 'שם אירוע',
crm_event_date: 'תאריך אירוע',
crm_event_status: 'סטטוס אירוע',
crm_purchase_amount: 'סכום רכישה',
crm_registered_at: 'תאריך רישום',
crm_checked_in_at: 'שעת כניסה'
```

### Status Hebrew Map

Load from `crm_statuses` table on page init (31 seed rows from Phase A).
Cache in `window.CRM_STATUSES` map: `slug → { name_he, name_en, color }`.
Do NOT hardcode Hebrew status names — they come from the DB (Rule 9).
