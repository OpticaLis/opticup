# MODULE_MAP — Module 1.5: Shared Components Refactor

> Single reference document for all files, functions, and globals in the shared/ directory.
> Updated every commit that adds/changes code in shared/.
> Last updated: 2026-03-16 (Phase 1, Step 2)

---

## 1. File Index — shared/css/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | variables.css | shared/css/variables.css | 136 | Design tokens: colors (primary, semantic, neutral, background), typography (family, sizes, weights, line-heights), spacing (6-step scale), border-radius, shadows, z-index, transitions. Single source of truth for all visual values. |

---

## 2. File Index — shared/js/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| — | *(empty — Phase 1 Step 6 adds theme-loader.js)* | | | |

---

## 3. File Index — shared/tests/

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| — | *(empty — Phase 1 Step 7 adds ui-test.html)* | | | |

---

## 4. CSS Variables Registry

All variables defined in `shared/css/variables.css`:

### Colors — Primary (4 vars)
`--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-dark`

### Colors — Semantic (12 vars)
`--color-success`, `--color-success-light`, `--color-success-hover`
`--color-error`, `--color-error-light`, `--color-error-hover`
`--color-warning`, `--color-warning-light`, `--color-warning-hover`
`--color-info`, `--color-info-light`, `--color-info-hover`

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

**Total: 65 CSS variables**

---

## 5. DB Changes

| Phase | Table | Change | Description |
|-------|-------|--------|-------------|
| 1 | tenants | ADD COLUMN `ui_config JSONB DEFAULT '{}'` | Per-tenant CSS variable overrides for theming |
