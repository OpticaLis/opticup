# Module 1.5 — Shared Components Refactor — MODULE_SPEC

## Current State (Phase 1 complete)

### DB Changes
- `tenants.ui_config` (JSONB, default '{}') — per-tenant CSS variable overrides. Keys must start with `--` to be injected.

### shared/css/ (5 files, 972 lines)

| File | Lines | Description |
|------|-------|-------------|
| variables.css | 157 | 70 CSS custom properties: colors (primary 4, semantic 16, neutral 12, background 3), typography (family 1, sizes 6, weights 4, line-heights 3), spacing (6-step scale), border-radius (4), shadows (3), z-index (5), transitions (3) |
| components.css | 254 | Buttons (primary/secondary/danger/ghost × sm/md/lg), inputs, selects, textareas, badges (success/error/warning/info/neutral), cards (header/body/footer) |
| components-extra.css | 214 | Table base (header/row/cell/sortable), slide-in panel (RTL, overlay), skeleton loaders (text/circle/rect/row + pulse), accordion (CSS-only open/close) |
| layout.css | 201 | Page structure (container/header/content), sticky header, flex helpers, grid helpers (2/3/4 col), RTL utilities (logical properties), visibility, print styles |
| forms.css | 146 | Form layout: form-group, form-label, form-required, form-error/form-help, form-row, form-col-2, form-actions, form-inline, mobile responsive |

### shared/js/ (1 file, 42 lines)

| File | Lines | Description |
|------|-------|-------------|
| theme-loader.js | 42 | `loadTenantTheme(tenantRow)` — reads ui_config JSONB, injects `--` prefixed keys as `:root` CSS overrides via setProperty(). Zero DB calls, standalone, no innerHTML. |

### shared/tests/ (1 file, 252 lines)

| File | Lines | Description |
|------|-------|-------------|
| ui-test.html | 252 | Visual test page: 13 component sections (colors, typography, buttons, inputs, selects, textareas, badges, cards, tables, slide panel, skeleton, accordion, forms). 3-palette theme switcher using loadTenantTheme(). RTL, Hebrew, self-contained. |

### Contracts (Public API)

**CSS Variables (70 tokens):**
- `--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-dark`
- `--color-success[-light/-hover/-dark]`, `--color-error[-light/-hover/-dark]`, `--color-warning[-light/-hover/-dark]`, `--color-info[-light/-hover/-dark]`
- `--color-white`, `--color-gray-50` through `--color-gray-900`, `--color-black`
- `--color-bg-page`, `--color-bg-card`, `--color-bg-input`
- `--font-family`, `--font-size-xs` through `--font-size-2xl`, `--font-weight-normal/medium/semibold/bold`
- `--line-height-tight/normal/relaxed`
- `--space-xs/sm/md/lg/xl/2xl`
- `--radius-sm/md/lg/full`
- `--shadow-sm/md/lg`
- `--z-dropdown/sticky/overlay/modal/toast`
- `--transition-fast/normal/slow`

**CSS Classes:**
- Buttons: `.btn`, `.btn-primary/secondary/danger/ghost`, `.btn-sm/md/lg`
- Inputs: `.input`, `.input-error`, `.input-disabled`
- Selects: `.select`, `.select-error`
- Textareas: `.textarea`, `.textarea-error`
- Badges: `.badge`, `.badge-success/error/warning/info/neutral`
- Cards: `.card`, `.card-header`, `.card-body`, `.card-footer`
- Tables: `.table`, `.table-header`, `.table-row`, `.table-cell`, `.table-sortable`, `.table-sort-active`
- Panels: `.slide-panel`, `.slide-panel-open`, `.slide-panel-overlay`, `.slide-panel-header`, `.slide-panel-body`
- Skeleton: `.skeleton-text`, `.skeleton-circle`, `.skeleton-rect`, `.skeleton-row`
- Accordion: `.accordion`, `.accordion-open`, `.accordion-header`, `.accordion-content`
- Layout: `.page-container`, `.page-header`, `.page-content`, `.flex`, `.flex-col`, `.flex-wrap`, `.items-center`, `.justify-between`, `.gap-*`, `.grid-2/3/4`
- Forms: `.form-group`, `.form-label`, `.form-required`, `.form-error`, `.form-help`, `.form-row`, `.form-col-2`, `.form-actions`, `.form-inline`
- Utilities: `.hidden`, `.visible`, `.sr-only`, `.no-print`, `.text-center/right/left`

**JS Functions:**
- `window.loadTenantTheme(tenantRow)` — per-tenant CSS override injection

### What Doesn't Exist Yet (Phase 2+)
- Modal system (modal-builder.js)
- Toast system (toast.js)
- Table builder (table-builder.js)
- Supabase wrapper (supabase-client.js)
- Activity logger (activity-logger.js)
- Permission UI helpers (permission-ui.js)
