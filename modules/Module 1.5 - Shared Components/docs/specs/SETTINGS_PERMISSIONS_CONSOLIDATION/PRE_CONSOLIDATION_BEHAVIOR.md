# PRE_CONSOLIDATION_BEHAVIOR — Settings + Permissions

> **Author:** opticup-executor (Pre-flight catalog)
> **Date:** 2026-05-12
> **Purpose:** Catalog every interactive behavior present on `settings.html` and `employees.html` BEFORE the consolidation, so post-consolidation verification can confirm bit-identical preservation. Per Brief §4 (Functional Preservation — The Hard Rule).

---

## 1. Page entry & permissions (BEFORE)

| Page | Path | Permission gate | Redirect on fail |
|---|---|---|---|
| Settings | `settings.html` | `settings.view` (CEO/Manager) | `window.location.href = '/'` |
| Permissions | `employees.html` | `employees.view` | `window.location.href = '/'` |

Both pages also call `loadSession()` first; if no session → redirect home.

After consolidation: page entry MUST be allowed if `settings.view` OR `employees.view` is held. Tab-level visibility uses `data-tab-permission` (existing PermissionUI gating).

## 2. Module tile entry point

| File | Line | Today | After |
|---|---|---|---|
| `index.html` | 156 | `url: 'employees.html'` | `url: 'settings.html#permissions'` |
| `index.html` | 157 | `url: 'settings.html'` | unchanged |

The URL builder at `index.html:173` (`a.href = TENANT_SLUG ? m.url + '?t=' + ... : m.url;`) appends `?t=<slug>` to `m.url`. If `m.url` contains `#`, `?t=...` ends up INSIDE the hash. Must be made hash-aware.

## 3. Scripts loaded (BEFORE)

### `settings.html` — 20 `<script>` tags
Shared (9): `theme-loader`, `modal-builder`, `modal-wizard`, `toast`, `pin-modal`, `table-builder`, `permission-ui`, `supabase-client`, `activity-logger`.
Core (8): `shared-field-map`, `shared`, `shared-ui`, `auth-service`, `supabase-ops`, `supabase-alerts-ocr`, `header`, `alerts-badge`.
Module (1): `modules/settings/settings-page.js`.
Bootstrap (1): inline DOMContentLoaded → `loadSession` + `loadSettings`.
External CDN (1): supabase-js UMD.

### `employees.html` — 24 `<script>` tags
Shared (10): all 9 above + `table-resize`.
Core (9): all 8 above + `data-loading`.
Plus `shared/js/plan-helpers.js` (between `shared.js` and `shared-ui.js`).
Module (2): `modules/permissions/employee-list.js` + `modules/permissions/permission-matrix.js`.
Bootstrap (1): inline DOMContentLoaded → `loadSession` + `loadData` + `loadEmployeesTab`.
External CDN (1): supabase-js UMD.

**Δ = 5 scripts** that employees.html has and settings.html does not:
1. `shared/js/table-resize.js`
2. `shared/js/plan-helpers.js`
3. `js/data-loading.js`
4. `modules/permissions/employee-list.js`
5. `modules/permissions/permission-matrix.js`

After consolidation: `settings.html` must load all 5 of these (in addition to its current 20).

## 4. Stylesheets (BEFORE)

| Page | `<link rel="stylesheet">` count | Module CSS file |
|---|---|---|
| settings.html | 10 | `css/header.css` + `css/settings.css` |
| employees.html | 10 | `css/header.css` + `css/employees.css` |

`css/settings.css` and `css/employees.css` are byte-identical (md5 `c318c26079c5009995492cad11024484`) — finding F1 from MIGRATION_2. After consolidation: load BOTH (defense-in-depth) until the deduplication SPEC `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` runs.

## 5. Settings page — interactive behaviors (BEFORE)

| # | Section | Element / form | Action |
|---|---|---|---|
| S1 | Business | `set-business-name` (input, required) | edit → `saveSettings()` PATCH on `tenants` |
| S2 | Business | `set-business-id` (input) | edit → save |
| S3 | Business | `set-business-phone` (input) | edit → save |
| S4 | Business | `set-business-email` (input) | edit → save |
| S5 | Business | `set-business-address` (textarea) | edit → save |
| S6 | Business | `logo-file-input` (file) | onchange → `handleLogoUpload(file)` → Supabase Storage `tenant-logos` bucket + `tenants.logo_url` UPDATE |
| S7 | Business | `logo-delete` (button, hidden if no logo) | onclick → `handleLogoDelete()` → confirmDialog → storage `.remove()` + `tenants.logo_url = null` |
| S8 | Financial | `set-vat-rate` (number) | edit → save |
| S9 | Financial | `set-withholding-tax` (number) | edit → save |
| S10 | Financial | `set-payment-terms` (number) | edit → save |
| S11 | Financial | `set-currency` (select: ILS / USD / EUR / GBP) | edit → save |
| S12 | Display | `set-rows-per-page` (select: 25/50/100/200) | edit → save |
| S13 | Display | `set-date-format` (select: DD/MM/YYYY / MM/DD/YYYY / YYYY-MM-DD) | edit → save |
| S14 | Display | `set-theme` (select, **disabled**) | placeholder for future dark mode |
| S15 | AI Learning | `set-ai-suggest-after` (number 1–20) | edit → `saveAIConfig()` upsert on `ai_agent_config` |
| S16 | AI Learning | `set-ai-auto-after` (number 3–50) | edit → `saveAIConfig()` |
| S17 | AI Learning | `set-ai-min-accuracy` (number 50–100) | edit → `saveAIConfig()` |
| S18 | Actions | `save-settings` (button) | onclick → `saveSettings()` (validates business_name + writes both `tenants` + `ai_agent_config`) |

All Supabase writes guarded by `hasPermission('settings.edit')` inside `saveSettings()`.

### Settings — Supabase touchpoints (BEFORE)

- READ: `tenants` (select * by id)
- READ: `ai_agent_config` (select 3 columns by tenant_id)
- WRITE: `tenants` UPDATE (13 columns + `name` + `updated_at`)
- WRITE: `ai_agent_config` UPSERT
- STORAGE: `tenant-logos` bucket upload / remove / getPublicUrl
- SIDE-EFFECT: `sessionStorage.tenant_config` mirror for VAT etc.

## 6. Permissions page — interactive behaviors (BEFORE)

### 6.1 Employee list (`loadEmployeesTab()` in `employee-list.js`)

| # | Element | Action |
|---|---|---|
| P1 | `emp-table-wrap` table row | renders all active employees with role badge, branch, last login |
| P2 | "+ הוסף עובד" button (visible if `employees.create`) | `openAddEmployee()` → modal `emp-modal` |
| P3 | "✏️ עריכה" per-row button (visible if `employees.edit` AND target's role is below user's) | `openEditEmployee(id)` → modal `emp-modal` |
| P4 | "🚫 השבתה" per-row button (visible if `employees.delete` AND target's role is below user's) | `confirmDeactivateEmployee(id, name)` → confirmDialog → `T.EMPLOYEES.is_active=false` + `AT.SESSIONS.is_active=false` |
| P5 | Modal `emp-modal` — `emp-modal-name` input | required, `saveEmployee()` validates non-empty |
| P6 | Modal `emp-modal-pin` input | numeric, 5-digit, `saveEmployee()` validates `/^\d{5}$/` |
| P7 | Modal `emp-modal-role` select | populated from `ROLE_BADGES` filtered by hierarchy (cannot assign same/higher role) |
| P8 | Modal `emp-modal-branch` input | 2-char, default `00` |
| P9 | Modal "✓ שמור" button | `saveEmployee()` → INSERT or UPDATE on `T.EMPLOYEES` + `AT.EMP_ROLES` + `writeLog` |
| P10 | Modal "ביטול" button | `closeModal('emp-modal')` |

### 6.2 Permission matrix (`renderPermissionMatrix('perm-matrix-wrap')` in `permission-matrix.js`)

Visible only if `hasPermission('settings.view')` (rendered at the bottom of the same employees-container).

| # | Element | Action |
|---|---|---|
| M1 | Module header rows (15 modules) | onclick `togglePermModule(this)` — collapses / expands the module's permission rows |
| M2 | Per-permission row | shows ✓/✗ checkboxes per role |
| M3 | Edit checkbox (visible if `settings.edit`) | onclick → toggle `AT.ROLE_PERMS.granted` for the (role, permission) pair |
| M4 | "פעולות" column (if canEdit) | per-row action buttons |

### Permissions — Supabase touchpoints (BEFORE)

- READ: `AT.ROLES` (id, name_he)
- READ: `T.EMPLOYEES` (id, name, branch_id, last_login, is_active, role)
- READ: `AT.EMP_ROLES` (employee_id, role_id)
- READ: `AT.PERMISSIONS` (id, module, name_he)
- READ: `AT.ROLE_PERMS` (role_id, permission_id, granted)
- WRITE: `T.EMPLOYEES` INSERT (new employee) / UPDATE (edit / deactivate)
- WRITE: `AT.EMP_ROLES` DELETE+INSERT (re-assign role)
- WRITE: `AT.SESSIONS` UPDATE (deactivate sessions on employee deactivate)
- WRITE: `AT.ROLE_PERMS` upsert (matrix toggles)
- WRITE: `writeLog()` for `employee_create`, `employee_edit`, `employee_deactivate`, role-perm changes

## 7. Shared DOM elements (both pages have these)

| Element | Purpose |
|---|---|
| `<div id="toast-c">` | Toast notification container |
| `<div id="loading">` | Loading overlay |
| `<div id="confirm-modal">` | Confirm dialog modal |
| `<div id="emp-modal">` (employees only, dynamic) | Employee add/edit modal — created by `showEmployeeModal()` via `insertAdjacentHTML` |

## 8. Initialization sequence (BEFORE)

### settings.html DOMContentLoaded
1. `loadSession()` — fetches session from sessionStorage / Supabase
2. If no session → redirect `/`
3. If `!hasPermission('settings.view')` → redirect `/`
4. `loadSettings()` — fetch tenant row, populate fields, bind logo file input

### employees.html DOMContentLoaded
1. `loadSession()`
2. If no session → redirect `/`
3. If `!hasPermission('employees.view')` → redirect `/`
4. `loadData()` — preload cached data (low-stock alerts etc.)
5. `loadEmployeesTab()` — fetch roles, employees, render table + matrix

### Side-effect: `auth-service.js:309` calls `PermissionUI.apply()` automatically after `loadSession()` resolves — scans `[data-tab-permission]` and `[data-permission]` attributes in DOM and hides/disables.

## 9. Initialization sequence (AFTER consolidation — design)

settings.html DOMContentLoaded:
1. `loadSession()`
2. If no session → redirect `/`
3. If `!hasPermission('settings.view') && !hasPermission('employees.view')` → redirect `/` (entry widened)
4. `loadSettings()` — always (general tab is default, fast)
5. Determine initial tab from `window.location.hash`:
   - `#permissions` AND `hasPermission('employees.view')` → `goSettingsTab('permissions')` (which lazily calls `loadData()` then `loadEmployeesTab()` once)
   - else → `goSettingsTab('general')`
6. `hashchange` listener triggers `goSettingsTab(name)` on browser back/forward
7. `PermissionUI.apply()` (auto via auth-service.js) hides whichever tab the user lacks `data-tab-permission` for

## 10. Verification matrix (post-consolidation)

Each row below MUST be re-verified after consolidation by Localhost-Tester. Brief §4.3 mandate.

| ID | Behavior | Verification |
|---|---|---|
| V1 | Page loads with no console errors on demo tenant | DevTools console check |
| V2 | "כללי" tab shows 4 sections (Business, Financial, Display, AI Learning) | Visual + DOM presence |
| V3 | "הרשאות" tab shows employee list + (if settings.view) permission matrix | Visual + Supabase READ check |
| V4 | URL `settings.html#permissions` → permissions tab is active on load | Open URL, inspect `.tab.active` |
| V5 | URL `settings.html#general` → general tab is active on load | Open URL |
| V6 | URL `settings.html` (no hash) → general tab is active | Open URL |
| V7 | Browser refresh on permissions tab → still permissions tab | F5 |
| V8 | Tab click updates URL hash | DevTools Network/Address bar |
| V9 | S1–S18 (settings forms) — at least Save button writes to `tenants` | Click Save with no edits, verify success toast + Supabase row UPDATE |
| V10 | P1 (employee list) — table renders with demo employees | Visual count |
| V11 | P2–P9 (employee CRUD) — at least "+ הוסף עובד" opens modal | Click button |
| V12 | M1–M3 (permission matrix) — modules expand on click | Click first module header |
| V13 | Permission gate — if user has only `settings.view` (NOT `employees.view`), permissions tab button hidden | Manual role check on demo (advanced — may defer) |
| V14 | Permission gate — if user has only `employees.view`, general tab button hidden | Manual role check (advanced) |
| V15 | Logo upload (S6) still works | Upload a small JPG, verify preview |
| V16 | No regression on other ERP pages (e.g., inventory.html still loads) | Smoke test 7/7 |

V13 + V14 are "best-effort" checks — full multi-role testing is out of scope for this SPEC's localhost smoke (would require seeding new demo employees with restricted roles). They're listed for completeness; FOREMAN_REVIEW will note any deferral.

---

*End of catalog.*
