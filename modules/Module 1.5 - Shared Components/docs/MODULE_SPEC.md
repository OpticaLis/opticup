# Module 1.5 — Shared Components Refactor — MODULE_SPEC

## Current State

### DB Changes
- tenants.ui_config (JSONB, default '{}') — per-tenant CSS variable overrides

### shared/css/
- variables.css — 66 CSS design tokens extracted from styles.css (colors, typography, spacing, radius, shadows, z-index, transitions)

### shared/js/
- (none yet — Phase 2+)

### shared/tests/
- (none yet — Phase 1 Step 7)

### Contracts (Public API so far)
- CSS Variables: --color-*, --font-*, --space-*, --radius-*, --shadow-*, --z-*, --transition-*
