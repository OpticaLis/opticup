# MODULE_MAP — Module 1.5: Shared Components Refactor

> Single reference document for all files, functions, and globals in the shared/ directory.
> Updated every commit that adds/changes code in shared/.
> Last updated: 2026-03-17 (Phase 2, Step 7)

---

## 1. File Index — shared/css/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | variables.css | shared/css/variables.css | 157 | Design tokens: colors (primary, semantic + dark text, neutral, background), typography (family, sizes, weights, line-heights), spacing (6-step scale), border-radius, shadows, z-index, transitions. Single source of truth for all visual values. |
| 2 | components.css | shared/css/components.css | 254 | UI components part 1: buttons (primary/secondary/danger/ghost × sm/md/lg), inputs, selects, textareas, badges (success/error/warning/info/neutral), cards (header/body/footer). All values via CSS variables. |
| 3 | components-extra.css | shared/css/components-extra.css | 214 | UI components part 2: table base (header/row/cell/sortable), slide-in panel (RTL, overlay), skeleton loaders (text/circle/rect/row + pulse animation), accordion (CSS-only open/close). |
| 4 | layout.css | shared/css/layout.css | 201 | Page structure (container/header/content), sticky header, flex helpers (flex/col/wrap, items, justify, gap), grid helpers (2/3/4 col), RTL utilities (logical properties), visibility (hidden/visible/sr-only), print styles (no-print, header hidden). |
| 5 | forms.css | shared/css/forms.css | 146 | Form layout: form-group (label+input wrapper), form-label, form-required (red asterisk), form-error/form-help text, form-row (multi-column flex), form-col-2 (2-col grid), form-actions (button container), form-inline (label+input same line), mobile responsive. |
| 6 | modal.css | shared/css/modal.css | 233 | Modal system: overlay (fixed, z-modal), container (flex column, 90vh max), header/body/footer, close button. 5 sizes (sm 340px, md 500px, lg 700px, xl 900px, fullscreen 95vw). 5 types (default, confirm, alert, danger with red header, wizard with progress bar). Wizard step indicators (num/active/done). Animations (entering/leaving with scale+fade). Stack support (dimmed, pointer-events:none). Responsive (640px breakpoint). |
| 7 | toast.css | shared/css/toast.css | 155 | Toast notifications: container (fixed, z-toast, top-start, flex column), toast item (border-inline-start colored by type, shadow, flex row), icon/content/close/progress bar. 4 types (success/error/warning/info). 3 keyframe animations (toast-enter slide+fade in, toast-leave slide+fade out, toast-progress countdown). CSS custom property --toast-duration for JS control. Responsive (480px breakpoint). Zero hardcoded colors. |

---

## 2. File Index — shared/js/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | theme-loader.js | shared/js/theme-loader.js | 42 | Per-tenant CSS variable override. `loadTenantTheme(tenantRow)` reads `ui_config` JSONB, injects `--` prefixed keys as `:root` CSS overrides via `setProperty()`. Zero DB calls, standalone, no innerHTML. |
| 2 | modal-builder.js | shared/js/modal-builder.js | 261 | Modal system core. Global `Modal` object: `show(config)→{el,close}`, `confirm(config)`, `alert(config)`, `danger(config)` (typed word to enable), `form(config)→{el,close}`, `close()`, `closeAll()`. Stack management (_stack[]), focus trap, body scroll lock, Escape key, open/close animations. Private `_escapeHtml()` for plain text. Zero JS dependencies. |
| 3 | modal-wizard.js | shared/js/modal-wizard.js | 144 | Wizard extension for Modal. Attaches `Modal.wizard(config)→{el,close}`. Multi-step progress bar (wizard-step-active/done), back/next/finish buttons, step validate/onEnter/onLeave callbacks. Depends on modal-builder.js (must load after). |
| 4 | toast.js | shared/js/toast.js | 131 | Toast notification system. Global `Toast` object: `success(msg,opts)`, `error(msg,opts)`, `warning(msg,opts)`, `info(msg,opts)`, `dismiss(id)`, `clear()`. Max 5 visible, duplicate prevention via id, auto-dismiss with CSS progress bar (--toast-duration), XSS-safe via _escapeHtml(). Zero dependencies. |

---

## 3. File Index — shared/tests/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | ui-test.html | shared/tests/ui-test.html | 252 | Visual test page: all 14 component sections (colors, typography, buttons, inputs, selects, textareas, badges, cards, tables, slide panel, skeleton, accordion, forms). 3-palette theme switcher using loadTenantTheme(). RTL, Hebrew, self-contained. |
| 2 | modal-test.html | shared/tests/modal-test.html | 251 | Modal system test page: 5 sections — sizes (sm/md/lg/xl/fullscreen), types (confirm/alert/danger/form/wizard), stack (3-layer), keyboard (escape/no-escape/no-backdrop), XSS test. Log area for event output. RTL, Hebrew, self-contained. |
| 3 | toast-test.html | shared/tests/toast-test.html | 155 | Toast system test page: 6 sections — types (success/error/warning/info), duration (1s/5s/persistent/dismiss), stack (5 toasts + 6th overflow), duplicate prevention (loading→done replace), XSS test, no-close-button. Log area for event output. RTL, Hebrew, self-contained. |

---

## 4. CSS Variables Registry

All variables defined in `shared/css/variables.css`:

### Colors — Primary (4 vars)
`--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-dark`

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

**Total: 69 CSS variables**

---

## 5. DB Changes

| Phase | Table | Change | Description |
|-------|-------|--------|-------------|
| 1 | tenants | ADD COLUMN `ui_config JSONB DEFAULT '{}'` | Per-tenant CSS variable overrides for theming |
