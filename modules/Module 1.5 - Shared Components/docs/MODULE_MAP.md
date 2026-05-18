# MODULE_MAP — Module 1.5: Shared Components Refactor

> Single reference document for all files, functions, and globals in the shared/ directory.
> Updated every commit that adds/changes code in shared/.
> Last updated: 2026-05-17 (M1_5_SHARED_COMPONENTS_PHASE_0 — 8 shared components for M1 Lens rebuild + tokens.css)

## 0b. M1 Lens rebuild Phase 0 — Shared Components (2026-05-17, M1_5_SHARED_COMPONENTS_PHASE_0)

Closed 🟢 2026-05-17. 8 new shared components (per Brief §SPEC 2) + 1 tokens file + extensions to table-builder.js for the data-table feature:

| Brief # | Component | JS file | CSS file | Verdict | Globals |
|---|---|---|---|---|---|
| 1 | Chip filter row | `shared/js/chip-filter-row.js` (115 lines) | `shared/css/chip-filter.css` (117) | NEW | `ChipFilter.init(container, { chips, activeIds, multiSelect, label, variant, onSelect }) → { setActive, getActive, destroy }` |
| 2 | Stat-card row | `shared/js/stat-card-row.js` (139) | `shared/css/stat-card.css` (111) | NEW | `StatCardRow.init(container, { cards, activeId, columns, onCardClick }) → { setActive, getActive, updateCard, destroy }` |
| 3 | Side detail panel | `shared/js/side-detail-panel.js` (166) | `shared/css/side-detail.css` (124) | NEW | `SideDetailPanel.init(container, { title, headerVariant, sections }) → { addSection, removeSection, updateSection, setTitle, destroy }` |
| 4 | Wizard step indicator (page-level) | `shared/js/wizard-step-indicator.js` (131) | `shared/css/wizard-step-indicator.css` (121) | NEW (distinct from modal-wizard.js) | `WizardSteps.init(container, { steps, activeIndex, onStepClick, allowJumpToCompletedOnly }) → { setActiveIndex, getActiveIndex, destroy }` |
| 5 | Group-header row | `shared/js/group-header-row.js` (104) | (extension to `shared/css/table.css`) | NEW | `GroupHeaderRow.render({ sourceType, label, count, colSpan, icon }) → HTMLTableRowElement`; also `GroupHeaderRow.toHtml(config) → string` |
| 6 | Data table | (EXTENSION to existing `shared/js/table-builder.js`, 298→349) + NEW `shared/js/table-builder-extensions.js` (86) | (extension to `shared/css/table.css`) | EXTEND | `TableBuilder.create()` honors NEW config keys: `pagination` `{pageSize, currentPage, onPageChange}` + `columns[].permission` + `data[]._groupHeader:true` rows. New instance methods: `setPage(n)`, `getPage()`. `window.TableBuilderExtensions.renderPagination(wrapper, state)` is the extension helper. |
| 7 | Quick Receipt drawer | `shared/js/quick-receipt-drawer.js` (275) | `shared/css/quick-receipt.css` (220) | NEW | `QuickReceiptDrawer.init(container, { suppliers, allowNoInvoice, onSubmit, onCancel }) → { open, close, isOpen, stageItem, removeItem, clearStaged, setSuppliers, getMeta, setMeta, destroy }` |
| 8 | Lens Details drawer | `shared/js/lens-details-drawer.js` (278) | `shared/css/lens-details.css` (210) | NEW | `LensDetailsDrawer.init(container, { variantId, mode, fetchLogs, fetchNotes, onAddNote, onEditNote, onDeleteNote }) → { open, close, isOpen, setMode, setVariant, reload, destroy }` |
| — | Feature tokens | (none) | `shared/css/tokens.css` (149) | NEW file | CSS custom properties: `--gold-active/-dark/-tint/-line`, `--mockup-*`, `--src-purple/-blue/-amber-*`, `--chip-{draft,sent,partial,received,overdue,cancelled,complete,discrepancy}-bg/-fg`, `--progress-*`, `--dark-*`, `--gradient-header`, `--toggle-*`, `--drawer-width-md/-lg/-z/-shadow`, `--wstep-*` |

Iron Rule 21 honored — 0 replace+migrate verdicts, 0 deletes of existing `shared/` files. SPEC §7 Destructive Operations stayed `None.` end-to-end.

Tier C VFV deferred to opticup-localhost-tester per SPEC 1 A-2 precedent. Component-isolation harness shipped at `shared/tests/M1_5_SPEC2_components-test.html`.

## 0. Design System initiative — Hybrid Final (2026-05-11, locked-in platform language)

---

## 0. Design System initiative — Hybrid Final (2026-05-11, locked-in platform language)

`M1_5_DESIGN_SYSTEM_HYBRID_FINAL` SPEC closed. **7 files** under `architecture-brief/design-system-mockups/hybrid-final/`:

| # | File | Purpose |
|---|------|---------|
| 1 | `_tokens.css` | Hybrid design tokens — Navy `#1e3a8a` accent, `#e6f1fb` soft tint, Inter+Heebo sans-only, 14px base, 36px row height, 240px sidebar. Sans-only (no `--font-serif`). |
| 2 | `INDEX.html` | Landing hub with cross-language switch (links to v2 A/B/C historical references) + iframe preview of the 5 module screens. |
| 3 | `storefront-studio.html` | Studio mockup. Sidebar (Content/Commerce/Publish), hero + 4 metric-cards + pages table + recent-blocks list + media grid. |
| 4 | `permissions.html` | Permissions mockup. Sidebar (Admin/Billing/Settings), hero + 4 metric-cards + 4 role-tiles (B pattern) + permission matrix with mono `inventory.view`-style permission codes. |
| 5 | `shipments.html` | Shipments + Boxes mockup. Sidebar (Overview/Shipments/Inventory), hero + 4 metric-cards + active-shipments table + per-shipment box detail + timeline of operations. |
| 6 | `settings.html` | Settings mockup. Sidebar (Store/Payment/Technical), hero + 4 metric-cards + tabs + 3 form sections (store details, tax/currency, barcode). |
| 7 | `suppliers-debt.html` | Suppliers Debt mockup. Sidebar (Overview/Suppliers/Finance), hero + 4 metric-cards + age-chart (semantic colors, NOT Navy) + 6-row supplier table with all real names + payment history. |

Pattern: Stripe-B structural foundation (hero + metrics + content cards + pills + role tiles) wearing Linear-A sidebar navigation (240px, RTL-right via `border-inline-start`, tight 36px rows). Navy palette only — zero violet, zero serif typography, zero topbar. Every HTML ≤350 lines (well under Rule 12 cap). Integrity gate clean. Smoke 7/7 PASS.

The 3 prior language folders (`language-{a,b,c}-*/`) — untouched, retained as historical reference per SPEC §2. Per-module migration of production HTML to Hybrid is a future SPEC chain.

## 0a. Design System initiative — Phase 3 v2 (2026-05-11, supersedes v1)

`M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES` SPEC closed. Three authentic design languages × five operational screens = **21 HTML files + 3 `_tokens.css`** under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/`:

| Folder | Identity | Token count | DOM pattern |
|---|---|---|---|
| `language-a-linear/` | Linear/Vercel — pure white + indigo #6366f1 + Inter 14px + borders > shadows + 6-12px radii | 54 active CSS custom props | Sidebar nav + top breadcrumb |
| `language-b-stripe/` | Stripe Dashboard — warm off-white + deep violet #635bff + Source Serif headings + layered shadows + 12px radii | 68 active CSS custom props | Top-bar + hero + metric tiles |
| `language-c-notion/` | Notion/Airy — cool off-white + pastel accents (lavender/teal/coral/amber) + Inter 16px + near-zero shadows + 10-20px radii | 65 active CSS custom props | Minimalist left rail + emoji glyphs |

Per language: `INDEX.html` (hub: top bar w/ 3-language switch + left rail w/ 5 screen links + iframe preview), `_tokens.css`, and 5 module HTMLs: `storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html`. All Hebrew RTL, light-background, self-contained (Google Fonts only external dep). Every module HTML ≤ 250 lines (well under Rule 12 cap). Zero hex literals in module `style=` attrs (var(--token) throughout). Integrity gate clean. Smoke suite 7/7 PASS.

## 0a. Design System initiative — Phase 3 v1 (ARCHIVED — see `_archive/design-system-mockups-v1-staticized/`)

v1 (3a/3b/3c + CONSOLIDATION, all closed 2026-05-11) produced 45 HTML files but failed the design-language distinctness goal: staticized production HTML + near-empty `_tokens.css` (3a: 0 active overrides; 3b/3c: 6-7 tokens each). Result was three near-identical directions. v2 (above) replaces it with authentic per-language authoring. Mockup folders moved (via `git mv`) to `_archive/design-system-mockups-v1-staticized/direction-{1-conservative,2-modern-clean,3-bold-dense-pro-tool}/`. v1 SPEC folders remain in `docs/specs/` as historical retrospective; only the v1 mockup directories were archived.

## 1. File Index — shared/css/

> **Phase 2 design-system audit pass (2026-05-11):** All 8 component CSS files now consume bare `var(--token)` references — zero hex fallback literals (15 sites cleaned: 12 in modal.css digit-suffixed vars + 3 stale `--g{100,300,400}` refs in table.css fixed to `--color-gray-*`). `:focus-visible` baseline added across components.css / forms.css / modal.css / table.css / toast.css per WCAG 2.4.7. New tokens in variables.css: `--color-focus-ring`, `--shadow-focus`. JS component APIs UNCHANGED (Brief Contract B).

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | variables.css | shared/css/variables.css | 161 | Design tokens: colors (primary Indigo #4f46e5, semantic + dark text, neutral Slate scale, background), typography (family, sizes, weights, line-heights), spacing (6-step scale), border-radius, shadows, z-index, transitions, legacy --primary alias. Single source of truth for all visual values. |
| 2 | components.css | shared/css/components.css | 254 | UI components part 1: buttons (primary/secondary/danger/ghost × sm/md/lg), inputs, selects, textareas, badges (success/error/warning/info/neutral), cards (header/body/footer). All values via CSS variables. |
| 3 | components-extra.css | shared/css/components-extra.css | 214 | UI components part 2: table base (header/row/cell/sortable), slide-in panel (RTL, overlay), skeleton loaders (text/circle/rect/row + pulse animation), accordion (CSS-only open/close). |
| 4 | layout.css | shared/css/layout.css | 201 | Page structure (container/header/content), sticky header, flex helpers (flex/col/wrap, items, justify, gap), grid helpers (2/3/4 col), RTL utilities (logical properties), visibility (hidden/visible/sr-only), print styles (no-print, header hidden). |
| 5 | forms.css | shared/css/forms.css | 146 | Form layout: form-group (label+input wrapper), form-label, form-required (red asterisk), form-error/form-help text, form-row (multi-column flex), form-col-2 (2-col grid), form-actions (button container), form-inline (label+input same line), mobile responsive. |
| 6 | modal.css | shared/css/modal.css | 233 | Modal system: overlay (fixed, z-modal), container (flex column, 90vh max), header/body/footer, close button. 5 sizes (sm 340px, md 500px, lg 700px, xl 900px, fullscreen 95vw). 5 types (default, confirm, alert, danger with red header, wizard with progress bar). Wizard step indicators (num/active/done). Animations (entering/leaving with scale+fade). Stack support (dimmed, pointer-events:none). Responsive (640px breakpoint). |
| 7 | toast.css | shared/css/toast.css | 155 | Toast notifications: container (fixed, z-toast, top-start, flex column), toast item (border-inline-start colored by type, shadow, flex row), icon/content/close/progress bar. 4 types (success/error/warning/info). 3 keyframe animations (toast-enter slide+fade in, toast-leave slide+fade out, toast-progress countdown). CSS custom property --toast-duration for JS control. Responsive (480px breakpoint). Zero hardcoded colors. |
| 8 | table.css | shared/css/table.css | 150 | Table builder styles. .tb-wrapper (overflow-x, border, radius), .tb-table (collapse, font), .tb-header (gray-50 bg), .tb-th (sticky opt-in via .tb-wrapper-sticky), .tb-th-sortable (cursor, hover, ::after arrow ↕/▲/▼ via data-sort-dir), .tb-th-sort-active (primary highlight), .tb-row (border, hover, zebra :nth-child), .tb-row-clickable, .tb-td/.tb-td-end/.tb-td-actions (flex), .tb-empty (icon/text/CTA), .tb-loading/.tb-loading-row (pulse animation). Responsive @640px. All via CSS variables. |

---

## 2. File Index — shared/js/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | theme-loader.js | shared/js/theme-loader.js | 42 | Per-tenant CSS variable override. `loadTenantTheme(tenantRow)` reads `ui_config` JSONB, injects `--` prefixed keys as `:root` CSS overrides via `setProperty()`. Zero DB calls, standalone, no innerHTML. |
| 2 | modal-builder.js | shared/js/modal-builder.js | 261 | Modal system core. Global `Modal` object: `show(config)→{el,close}`, `confirm(config)`, `alert(config)`, `danger(config)` (typed word to enable), `form(config)→{el,close}`, `close()`, `closeAll()`. Stack management (_stack[]), focus trap, body scroll lock, Escape key, open/close animations. Private `_escapeHtml()` for plain text. Zero JS dependencies. |
| 3 | modal-wizard.js | shared/js/modal-wizard.js | 145 | Wizard extension for Modal. Attaches `Modal.wizard(config)→{el,close}`. Multi-step progress bar (wizard-step-active/done), back/next/finish buttons, step validate/onEnter/onLeave callbacks. Depends on modal-builder.js (must load after). |
| 4 | toast.js | shared/js/toast.js | 147 | Toast notification system. Global `Toast` object: `success(msg,opts)`, `error(msg,opts)`, `warning(msg,opts)`, `info(msg,opts)`, `dismiss(id)`, `clear()`. Max 5 visible, duplicate prevention via id, auto-dismiss with CSS progress bar (--toast-duration), XSS-safe via _escapeHtml(). Zero dependencies. |
| 5 | pin-modal.js | shared/js/pin-modal.js | 127 | PIN prompt modal — migration of js/pin-modal.js. Global `promptPin(title, callback)` — identical external API. Internally uses `Modal.show()` for overlay/backdrop/close. 5-digit split input with auto-advance, backspace, paste, auto-submit. Calls `verifyPinOnly()` from auth-service.js. PIN-specific styles injected once via `<style>` block. Depends on modal-builder.js. |
| 6 | supabase-client.js | shared/js/supabase-client.js | 263 | Supabase wrapper. Global `DB` object: `select(table,filters?,opts?)`, `insert(table,data,opts?)`, `update(table,id,changes,opts?)`, `batchUpdate(table,records,opts?)`, `softDelete(table,id,opts?)`, `hardDelete(table,id,opts?)`, `rpc(fn,params?,opts?)`. CSS-only spinner (200ms debounce, counter for parallel calls). Error classification (RLS 42501, network, unique 23505, not-found). Auto tenant_id on insert/select. Toast optional dependency. Depends on sb + getTenantId(). |
| 7 | activity-logger.js | shared/js/activity-logger.js | 90 | Activity log helper. Global `ActivityLog` object: `write(config)`, `warning(config)`, `error(config)`, `critical(config)`. Fire-and-forget (async, non-blocking). Auto-inject tenant_id from getTenantId(), user_id/branch_id from getCurrentEmployee(). Uses DB.insert if available, sb.from() fallback. Skips non-UUID branch_id. Zero CSS dependencies. |
| 8 | table-builder.js | shared/js/table-builder.js | 296 | Table builder. Global `TableBuilder` object: `create(config)→TableInstance`. Instance methods: `setData(rows)`, `setLoading(bool)`, `updateRow(id,data)`, `removeRow(id)`, `getData()→array`, `destroy()`. Config: containerId, columns (key/label/type/sortable/render/width/cssClass), emptyState (icon/text/cta), onSort(key,dir), onRowClick(row,el), rowId, stickyHeader, skeletonRows. 7 column types: text (textContent safe), number (he-IL locale), currency (₪), date (DD/MM/YYYY), badge/actions/custom (render function). Sort is external — visual state only + onSort callback. Soft dep on escapeHtml(). Zero deps on DB/Modal/Toast. |
| 9 | permission-ui.js | shared/js/permission-ui.js | 70 | Permission-aware UI. Global `PermissionUI` object: `apply()` (scan document), `applyTo(container)` (scan container), `check(permission)→boolean`. Reads `[data-permission]` attributes, supports OR via pipe `perm1|perm2`. Hide mode (default: display:none) or disable mode (`data-permission-mode="disable"`: disabled+opacity 0.5+title). Wraps `hasPermission()` from auth-service.js. Safe fallback: if hasPermission unavailable → console.warn + hide all guarded elements. Zero deps on CSS/DB/Modal/Toast/Table. |
| 10 | table-resize.js | shared/js/table-resize.js | 103 | Reusable column resizing with sticky scrollbar. `initResizableColumns(tableEl)` adds resize handles to headers, `initStickyScrollbar(tableEl)` adds viewport-bottom scrollbar. Extracted from debt module, generalized for all tables. Zero deps. |
| 11 | sort-utils.js | shared/js/sort-utils.js | 43 | Client-side column sorting utility. Global `SortUtils` object: `sortArray(arr, key, dir)` (Hebrew locale, numbers, nulls), `toggle(tableId, key)→{key,dir}`, `updateHeaders(thead, key, dir)` (CSS classes), `getState(tableId)→{key,dir}|null`. Zero deps. |

---

## 3. File Index — shared/tests/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | ui-test.html | shared/tests/ui-test.html | 252 | Visual test page: all 14 component sections (colors, typography, buttons, inputs, selects, textareas, badges, cards, tables, slide panel, skeleton, accordion, forms). 3-palette theme switcher using loadTenantTheme(). RTL, Hebrew, self-contained. |
| 2 | modal-test.html | shared/tests/modal-test.html | 251 | Modal system test page: 5 sections — sizes (sm/md/lg/xl/fullscreen), types (confirm/alert/danger/form/wizard), stack (3-layer), keyboard (escape/no-escape/no-backdrop), XSS test. Log area for event output. RTL, Hebrew, self-contained. |
| 3 | toast-test.html | shared/tests/toast-test.html | 174 | Toast system test page: 6 sections — types (success/error/warning/info), duration (1s/5s/persistent/dismiss), stack (5 toasts + 6th overflow), duplicate prevention (loading→done replace), XSS test, no-close-button. Log area for event output. RTL, Hebrew, self-contained. |
| 4 | db-test.html | shared/tests/db-test.html | 325 | DB wrapper test page: 9 sections — select (all/filter/order/single/count/rawFilters), insert (single/array), update, batchUpdate, softDelete/hardDelete, RPC, spinner (parallel/silent), error handling (missing field/silent), cleanup. Requires JWT session. |
| 5 | activity-log-test.html | shared/tests/activity-log-test.html | 251 | Activity log test page: 8 sections — write (info), warning, error, critical, changeset format, fire-and-forget, validation (missing fields), cleanup. Uses waitAndFind polling. Requires JWT session. |
| 6 | table-test.html | shared/tests/table-test.html | 235 | Table builder test page: 9 sections — basic table (all 7 column types, 20 rows, null/zero edge cases), sort (toggle asc/desc, single active column), empty state (icon/text/CTA toggle), loading (skeleton, auto 2s), row ops (updateRow/removeRow/getData), sticky header (100 rows, 400px scroll), row click (onRowClick + action button exclusion), XSS (script/img tags escaped), destroy/recreate. Mock data inline, RTL, Hebrew. |
| 7 | permission-test.html | shared/tests/permission-test.html | 190 | Permission UI test page: 7 sections — hide mode (4 buttons, checkbox toggles, re-apply), disable mode (opacity + tooltip), OR logic (pipe separator), applyTo (dynamic content injection), manual check (input + result), no-hasPermission (remove/restore + console.warn), full reset (all off / CEO mode). Mock hasPermission inline, RTL, Hebrew. |

---

## 4. File Index — Page-Specific CSS (Phase 5, updated Phase 6)

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | inventory.css | css/inventory.css | 396 | Inventory page styles: nav tabs, cards, item cards, table (#inv-table), bulk bar, search-select, PO list, receipts, stock count, OCR, weekly report, AI config, help banners. :root --primary/--primary-light/--primary-dark reference var(--color-primary*) from variables.css (Phase 6). |
| 2 | employees.css | css/employees.css | 396 | Employees page styles. :root primary vars reference var(--color-primary*) (Phase 6). |
| 3 | settings.css | css/settings.css | 396 | Settings page styles: .settings-container, settings-section, settings-grid, settings-field, logo-preview. :root primary vars reference var(--color-primary*) (Phase 6). |
| 4 | shipments.css | css/shipments.css | 396 | Shipments page styles. :root primary vars reference var(--color-primary*) (Phase 6). Shipment-specific styles in inline <style>. |

---

## 4. CSS Variables Registry

All variables defined in `shared/css/variables.css`:

### Colors — Primary (4 vars + 1 legacy alias)
`--color-primary` (#0f172a — Daniel finalized as Slate 900 near-black on 2026-05-10, overriding the brief-era Slate 700 — neutral platform default; SPEC criterion #13 references the original Slate 700 wording for traceability), `--color-primary-hover` (#1e293b Slate 800), `--color-primary-light` (#f1f5f9 Slate 100), `--color-primary-dark` (#000000 pure black). Prizma overrides these via `tenants.ui_config` to Indigo (#4f46e5/#4338ca/#eef2ff/#3730a3) — see M1_5_DESIGN_TOKENS_FOUNDATION SPEC.
`--primary: var(--color-primary)` — legacy alias for header.css, index.html, page CSS consumers

### Colors — Semantic (16 vars)
`--color-success`, `--color-success-light`, `--color-success-hover`, `--color-success-dark`
`--color-error`, `--color-error-light`, `--color-error-hover`, `--color-error-dark`
`--color-warning`, `--color-warning-light`, `--color-warning-hover`, `--color-warning-dark`
`--color-info`, `--color-info-light`, `--color-info-hover`, `--color-info-dark`

### Colors — Neutral (12 vars)
`--color-white`, `--color-gray-50` through `--color-gray-900`, `--color-black`

### Colors — Background (3 vars)
`--color-bg-page`, `--color-bg-card`, `--color-bg-input`

### Typography (13 vars)
`--font-family`
`--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`
`--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`
`--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`

### Spacing (6 vars)
`--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`, `--space-2xl`

### Border Radius (4 vars)
`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`

### Shadows (3 vars)
`--shadow-sm`, `--shadow-md`, `--shadow-lg`

### Z-Index (5 vars)
`--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`

### Transitions (3 vars)
`--transition-fast`, `--transition-normal`, `--transition-slow`

**Total: 69 CSS variables + 1 legacy alias (70 declarations)**

---

## 5. Integration Points — Redirect Files

| # | File | Path | Lines | Purpose |
|---|------|------|-------|---------|
| 1 | pin-modal.js (redirect) | js/pin-modal.js | 5 | Backward-compat redirect to shared/js/pin-modal.js via `document.write()`. Will be removed in Phase 5. |

**Pages modified for PIN modal dependencies:**

| Page | Added CSS | Added JS |
|------|-----------|----------|
| inventory.html | `shared/css/modal.css` in `<head>` | `shared/js/modal-builder.js` before pin-modal.js |
| suppliers-debt.html | `shared/css/modal.css` in `<head>` | `shared/js/modal-builder.js` before pin-modal.js |

---

## 6. DB Changes

| Phase | Table | Change | Description |
|-------|-------|--------|-------------|
| 1 | tenants | ADD COLUMN `ui_config JSONB DEFAULT '{}'` | Per-tenant CSS variable overrides for theming |
| 3 | activity_log | CREATE TABLE | System-level event log: level (info/warning/error/critical), action, entity_type, entity_id, details JSONB. RLS + 5 indexes. |
| 3 | — | CREATE FUNCTION `increment_paid_amount(p_doc_id, p_delta)` | Atomic paid_amount increment + status update on supplier_documents |
| 3 | — | CREATE FUNCTION `increment_prepaid_used(p_deal_id, p_delta)` | Atomic total_used/total_remaining update on prepaid_deals |
| 3 | — | CREATE FUNCTION `increment_shipment_counters(p_shipment_id, p_items_delta, p_value_delta)` | Atomic items_count/total_value update on shipments |
| 4 | — | (none) | No DB changes in Phase 4 (JS + CSS only) |
| QA | roles | ALTER PK `(id)` → `(id, tenant_id)` | Multi-tenant: same role name per tenant |
| QA | permissions | ALTER PK `(id)` → `(id, tenant_id)` | Multi-tenant: same permission ID per tenant |
| QA | role_permissions | ALTER PK `(role_id, permission_id)` → `(role_id, permission_id, tenant_id)` | Multi-tenant: per-tenant role→permission mappings |
| QA | role_permissions | ALTER FKs to composite | role_permissions → roles(id, tenant_id), permissions(id, tenant_id) |
| QA | employee_roles | ALTER FK to composite | employee_roles → roles(id, tenant_id) |

---

## 7. QA Scripts

| # | File | Path | Lines | Purpose |
|---|------|------|-------|---------|
| 1 | clone-tenant.sql | scripts/clone-tenant.sql | 1119 | Clone prizma → demo tenant: 39 tables, FK mapping, barcode D prefix, verification |
| 2 | cleanup-tenant.sql | scripts/cleanup-tenant.sql | 316 | Delete demo tenant data in reverse FK order |
| 3 | fix-permissions-schema.sql | scripts/fix-permissions-schema.sql | 146 | Alter PKs to include tenant_id, insert demo tenant permission rows |
