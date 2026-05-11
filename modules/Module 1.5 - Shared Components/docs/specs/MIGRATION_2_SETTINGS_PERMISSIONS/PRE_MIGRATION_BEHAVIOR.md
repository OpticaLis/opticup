# PRE_MIGRATION_BEHAVIOR.md — MIGRATION_2_SETTINGS_PERMISSIONS

**Captured:** 2026-05-11 by opticup-executor (Full-Auto Pipeline)
**Purpose:** Catalog every interactive behavior on `settings.html` + `employees.html` BEFORE the visual re-skin so post-migration verification can confirm zero functional regression.

---

## A. settings.html — Interactive Behaviors (PRE-MIGRATION)

### A1. Page lifecycle
1. `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/.../supabase.min.js">` loads in `<head>` (line 24).
2. Body fires `DOMContentLoaded` → bootstrap script (lines 200–205):
   - `loadSession()` — if no session, redirect to `/`.
   - `hasPermission('settings.view')` — if false, redirect to `/`.
   - `loadSettings()` — populates the 4 settings sections from DB.

### A2. Module-specific behavior (driven by `modules/settings/settings-page.js`, line 198)
- **Section 1 — Business** (`<div class="settings-section">`, lines 33–72): renders 6 fields (`set-business-name`, `set-business-id`, `set-business-phone`, `set-business-email`, `set-business-address`, logo upload area).
- **Section 2 — Financial** (lines 75–100): 4 numeric/select fields (`set-vat-rate`, `set-withholding-tax`, `set-payment-terms`, `set-currency`).
- **Section 3 — Display** (lines 103–131): 3 select fields (`set-rows-per-page`, `set-date-format`, `set-theme` — disabled).
- **Section 4 — AI Learning** (lines 134–153): 3 numeric fields (`set-ai-suggest-after`, `set-ai-auto-after`, `set-ai-min-accuracy`).
- **Save button** (line 156): `<button class="btn-p" id="save-settings" onclick="saveSettings()">` — persists all 4 sections to Supabase.

### A3. Logo flow (lines 56–70)
- File picker `#logo-file-input` (`accept="image/jpeg,image/png"`, hidden, max 2MB per `<small>` hint).
- Preview wrapper `#logo-preview-wrap` filled by `renderLogoPreview()` from `settings-page.js`.
- Delete button `#logo-delete` calls `handleLogoDelete()` (defined in `settings-page.js`).

### A4. Modals + overlays (lines 161–177)
- Toast container `#toast-c`.
- Loading overlay `#loading` with `.spinner` and `#loading-text`.
- Confirm dialog `#confirm-modal` (used by `confirmDialog()` in shared.js).

### A5. Permission gate
Per line 203, anyone without `settings.view` permission is redirected to `/`. RBAC matrix is the same as production today (no change). Owner/Manager roles see full UI; cashier/lab roles redirected.

### A6. Visible color sources (PRE — for post-migration comparison)
- Header bar `.app-header` background — currently `var(--primary)` = `var(--color-primary)` = `#0f172a` (slate near-black, from `shared/css/variables.css` line 20).
- `.settings-title` color — `var(--primary)` = `#0f172a`.
- `.settings-section-title` color — `var(--primary)` = `#0f172a`.
- `.btn-p` background — `var(--accent)` = `#3b82f6` (blue).
- `.btn-p:hover` background — `#2563eb` (literal in css/settings.css line 30).
- Focus rings on inputs — `var(--accent)` = `#3b82f6`.

### A7. POST-migration expected visual (after page-scope `body { --primary: #1e3a8a; ... }` override)
- Header bar background — Navy `#1e3a8a`.
- Settings titles — Navy `#1e3a8a`.
- `.btn-p` background — Navy hover variant `#1e40af`.
- Hover states + focus rings — Navy palette.
- Semantic colors (success/warning/danger/info) — UNCHANGED.

---

## B. employees.html — Interactive Behaviors (PRE-MIGRATION)

### B1. Page lifecycle
1. Supabase JS CDN loads in `<head>` (line 24).
2. Body fires `DOMContentLoaded` → bootstrap script (lines 78–84):
   - `loadSession()` — redirect to `/` if no session.
   - `hasPermission('employees.view')` — redirect if false.
   - `loadData()` — primes shared caches (defined in `js/data-loading.js`).
   - `loadEmployeesTab()` — defined in `modules/permissions/employee-list.js`; renders the employees table + role-edit UI inside `#employees-container`.

### B2. JS-rendered content (the entire body is rendered by JS)
- The HTML body has only `<div id="employees-container">טוען...</div>` (lines 30–32). Everything else is rendered by:
  - `modules/permissions/employee-list.js` (line 73) — employees table.
  - `modules/permissions/permission-matrix.js` (line 74) — roles + permission grid.
- Expected rendered components after `loadEmployeesTab()`:
  - Employees list (rows of users with name, role, branch, last-login).
  - Click a user row → role-edit form opens (modal or inline panel — verify on localhost).
  - Permissions matrix (grid of role × permission checkboxes).
  - Add-employee button.

### B3. Modals + overlays (lines 36–51)
- Toast container `#toast-c` (positioned top-center via inline style).
- Loading overlay `#loading`.
- Confirm dialog `#confirm-modal`.

### B4. Permission gate
Per line 81, only users with `employees.view` see the page (typically owner/manager). Cashier/lab redirected.

### B5. Visible color sources (PRE)
- Header bar — same as settings (`var(--primary)` = `#0f172a`).
- Permissions matrix headers, role badges, action buttons, focus rings — driven by JS using `var(--primary)` and `var(--accent)` references inside `css/employees.css` (the byte-identical-to-settings.css duplicate).
- Save buttons inside role-edit form — `.btn-p` = `var(--accent)` = `#3b82f6`.

### B6. POST-migration expected visual
- Header bar — Navy `#1e3a8a`.
- All `var(--primary)` consumers in JS-rendered content → Navy.
- All `var(--accent)` consumers → Navy hover `#1e40af`.
- Semantic / status colors — UNCHANGED.

---

## C. Cross-page invariants (apply to BOTH pages)

1. **No DOM structure change** — element count, class names, IDs all preserved post-migration.
2. **All 20 `<script>` tags on settings.html + 24 on employees.html preserved verbatim** — no reorder, no removal, no addition.
3. **All 10 `<link rel="stylesheet">` tags on each page preserved verbatim**.
4. **Hebrew text content unchanged** — labels, headings, button text, placeholders.
5. **Permission gate logic unchanged** — same `hasPermission(...)` calls, same redirect target.
6. **Supabase contract unchanged** — no RPC name changed, no new field used, no new query.
7. **Page-scope override** — adding `body { --primary: ...; ... }` ONLY affects descendants of `<body>` on this page; other ERP pages keep their existing palette.

---

## D. Verification checklist (used by Localhost-Tester for TEST_REPORT.md)

### settings.html on `http://localhost:3000/settings.html` (demo tenant, PIN 12345):
- [ ] Page loads, no console errors, no 4xx/5xx.
- [ ] Header bar visually Navy (not slate-near-black).
- [ ] All 4 sections render (Business, Financial, Display, AI Learning).
- [ ] At least one input is editable (e.g., focus the `set-business-phone` field).
- [ ] Save button (`#save-settings`) is visible and clickable; visually Navy.
- [ ] Logo upload area renders (do NOT actually upload).

### employees.html on `http://localhost:3000/employees.html` (demo tenant, PIN 12345):
- [ ] Page loads, no console errors.
- [ ] `#employees-container` populates (no longer "טוען...").
- [ ] Employees table renders with demo users.
- [ ] Permission matrix / roles UI renders.
- [ ] Click a user → role-edit UI opens (verify form opens; do NOT save).
- [ ] Visual treatment is Navy (header + accents).

If any checkbox fails → STOP, escalate per SPEC §6/§7.

---

*End of PRE_MIGRATION_BEHAVIOR.md.*
