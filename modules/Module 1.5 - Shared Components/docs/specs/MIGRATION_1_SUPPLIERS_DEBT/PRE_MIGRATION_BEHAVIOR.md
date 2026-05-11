# Pre-Migration Behavior — suppliers-debt.html

**Date captured:** 2026-05-11
**By:** opticup-executor (Full-Auto Pipeline, Migration #1)
**Source revision (HEAD before re-skin):** see git tag `pre-migration-suppliers-debt`

This file catalogs every interactive flow, DOM contract, and JS dependency the page exposes BEFORE the Hybrid+Navy re-skin. After the re-skin, every entry below must still behave identically. Any deviation = STOP and rollback.

## 1. Page Load Sequence

1. Stylesheets load in this order:
   - `shared/css/modal.css`
   - `css/styles.css`
   - `css/header.css`
   - Heebo Google Font
2. 55 `<script>` tags load (Supabase UMD CDN + project JS in fixed order). All preserved verbatim.
3. `DOMContentLoaded` handler runs (inline at lines 258-266 of original):
   - `await loadSession()` — if null → redirect to `/`
   - `hasPermission('debt.view')` — if false → redirect to `/`
   - `await loadDebtSummary()` — populates the 4 stat cards + aging buckets
   - `await loadSuppliersTab()` — populates the default active "ספקים" tab

## 2. Stat Cards (4 KPI Tiles, top of page)

| ID | Label | Value element ID | Class state |
|---|---|---|---|
| `card-total-debt` | יתרה סופית | `val-total-debt` | base |
| `card-due-week` | לתשלום השבוע | `val-due-week` | base |
| `card-overdue` | באיחור | `val-overdue` | toggles `.overdue` when > 0 (red border) |
| `card-paid-month` | שולם החודש | `val-paid-month` | base |

Class `.debt-card.overdue` exists for the danger state — must continue to render red border + red amount color.

## 3. Aging Report

- Container: `<div class="aging-section">` with title "גיול חובות"
- Inner: `#aging-buckets` — populated by JS with 4-5 buckets (0-30, 31-60, 61-90, 90+, future) showing bar + amount
- Bar styling depends on `.aging-bucket` / `.ab-label` / `.ab-amount` / `.ab-bar` / `.ab-bar-fill` classes

## 4. Tab System (7 Tabs)

Tab buttons declared in DOM:
1. `data-tab="suppliers"` — ספקים (active by default)
2. `data-tab="documents"` — מסמכים
3. `data-tab="payments"` — תשלומים
4. `data-tab="prepaid"` — עסקאות מראש
5. `data-tab="weekly"` — דוח שבועי
6. `data-tab="returns"` — זיכויים
7. `data-tab="ai-learning"` — למידת AI

Inline JS `switchDebtTab(tabName)` (lines 238-253):
- Toggles `.active` class on `.debt-tab-btn` for matching `data-tab`
- Toggles `.active` class on `.debt-tab-content` for matching id `dtab-{tabName}`
- Dispatches to: `loadSuppliersTab` / `loadDocumentsTab` / `loadPaymentsTab` / `loadPrepaidTab` / `initWeeklyReport` / `initDebtReturnsTab` / `loadAILearningTab`

## 5. Tab Content Panels (all 7)

Each panel has `id="dtab-{name}"` class `debt-tab-content`. The CSS contract:
- `.debt-tab-content` → `display: none` by default
- `.debt-tab-content.active` → `display: block`

## 6. Action Buttons

Two `onclick` handler attributes that must continue to work:
- Line 127: `<button ... onclick="toggleExpenseFolders()">` — opens/closes `#expense-folders-container`
- Line 137: `<button id="gen-inv-toggle" ... onclick="toggleGeneralInvoicesView()">` — toggles general-invoices view in documents tab

## 7. Detail Panel + Overlays

- `<div id="supplier-detail-panel" style="display:none">` — populated and shown by `debt-supplier-detail.js`
- `<div id="toast-c">` — toast container (z-index 10000)
- `<div id="loading" class="loading-overlay">` — global spinner overlay (uses `.loading-overlay` `.loading-box` `.spinner` from `css/styles.css`)
- `<div id="confirm-modal" class="modal-overlay">` — confirmation dialog with `#confirm-title`, `#confirm-text`, `#confirm-yes`, `#confirm-no` (classes `.btn .btn-s` and `.btn .btn-g` from styles.css)

## 8. Status Badge Classes (Visual Contract)

These class names must continue to exist with sane backgrounds:

- Documents tab states: `.dst-open`, `.dst-partial`, `.dst-paid`, `.dst-linked`, `.dst-cancel`, `.dst-draft`, `.dst-review`
- Row state: `.row-draft`
- Buttons in tables: `.btn-sm`, `.btn-lnk`
- Payment row: `.pst-red`
- Returns states: `.rst-pending`, `.rst-ready`, `.rst-shipped`, `.rst-agent`, `.rst-received`, `.rst-credited`
- New-doc form field: `.nd-field`
- Info-help button: `.info-help-btn`

The re-skin may swap color values but must NOT remove or rename these class selectors.

## 9. Globals Used (must keep resolvable)

JS globals referenced from inline `<script>`:
- `loadSession()` — `js/auth-service.js`
- `hasPermission(perm)` — `js/auth-service.js`
- `loadDebtSummary()` — `modules/debt/debt-dashboard.js`
- `loadSuppliersTab()` — `modules/debt/debt-supplier-filters.js`
- `loadDocumentsTab()` — `modules/debt/debt-documents.js`
- `loadPaymentsTab()` — `modules/debt/debt-payments.js`
- `loadPrepaidTab()` — `modules/debt/debt-prepaid.js`
- `initWeeklyReport()` — `modules/debt/ai/ai-weekly-report.js`
- `initDebtReturnsTab()` — `modules/debt/debt-returns-tab.js`
- `loadAILearningTab()` — `modules/debt/ai/ai-learning-dashboard.js`
- `switchDebtTab(name)` — defined inline (must remain inline + unchanged)
- `toggleExpenseFolders()` — `modules/debt/debt-expense-folders.js`
- `toggleGeneralInvoicesView()` — `modules/debt/debt-general-invoices.js`

## 10. Localhost-Tester Verification List (post-migration)

After CSS changes, these must pass on `http://localhost:3000/suppliers-debt.html` on demo tenant:

1. Page loads, zero console errors.
2. Login flow reaches the page (or session restored from prior tab).
3. 4 stat cards render with numeric values (₪ symbol present, real demo data).
4. Aging report bar buckets render.
5. Tabs: clicking each tab toggles `.active` on the button + shows the matching panel. Default tab is "ספקים".
6. Supplier list table populates with rows from demo tenant `supplier_debt_summary` view (real data).
7. Clicking a supplier row opens detail drawer/modal (existing `debt-supplier-detail.js` behavior).
8. `toggleExpenseFolders()` button toggles the folder pane visibility.
9. No layout breaks at 1080p viewport (1920×1080 desktop).
10. Header/nav bar at top renders (legacy Indigo on this page acceptable per Brief — header.css untouched).

## 11. Baseline Metrics (for ±tolerance checks)

| Metric | Value | Tolerance | Source |
|---|---|---|---|
| Total lines | 269 | ±15% (228 ≤ N ≤ 309) | `cat -n` Read |
| Raw line count (including trailing newline) | 270 | ±15% | PowerShell `[IO.File]::ReadAllText` |
| File size in bytes | 14,506 | informational | PowerShell |
| `<script` opening tags | 55 | exact | Select-String |
| `<link rel="stylesheet"` tags | 3 | exact (modal.css, styles.css, header.css) | Select-String |
| Open HTML tags total | 125 | ±2% (122 ≤ N ≤ 128) | Select-String `<[a-zA-Z]` |
| Legacy purple hex (`26215c\|534ab7`) | 0 | exact | grep -i |
| Navy hex (`1e3a8a`) | 0 | will be ≥ 1 after | grep |
