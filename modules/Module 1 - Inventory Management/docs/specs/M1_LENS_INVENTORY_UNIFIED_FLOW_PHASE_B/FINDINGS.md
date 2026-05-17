# FINDINGS — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B

**Generated:** 2026-05-18 evening
**Executor:** opticup-executor (Claude Code)

Findings discovered during execution that are NOT in the SPEC and warrant follow-up action.

---

## F-1 (INFO) — `modules/settings/settings-page.js` exceeds 300-line soft target (339 lines, under 350 max)

**Location:** `modules/settings/settings-page.js` (339 lines post-Phase-B)

**Description:** Pre-commit hook fires a `[file-size]` warning that the file exceeds the 300-line soft target. The file is still under the 350-line hard cap. Phase B added +42 lines (1 SETTINGS_FIELDS entry, `gateInventorySection()`, `loadSupplierOptions()`, 2 call sites from `loadSettings`). Per CLAUDE.md §6 Rule 12 ("Target 300 lines per file, max 350. Split only at logical boundaries — never arbitrarily"), this file is one cohesive responsibility (settings page lifecycle: load → render → save → save AI sub-config → new inventory section gate/load). Splitting just to hit 300 would be arbitrary.

**Suggested next action:** Two paths:

1. **Defer until natural splitting boundary emerges** (recommended) — when the next settings concern is added (e.g., shipping config, tax config) that would push the file over 350, the right split becomes obvious: extract `settings-ai-config.js` (lines 237-296) as a sibling file with its own load/save. That's a clean logical boundary, not an arbitrary one.
2. **Split now** — extract `settings-inventory-section.js` (the 42 lines added in Phase B) as a sibling. Marginal benefit; the gating function references DOM elements in settings.html so the coupling is real.

**Severity INFO** because: hook warning only, no hard failure. File remains functional. Will be revisited at Phase D's unified-log work or whenever the file legitimately needs to grow past 350.

---

*FINDINGS closed. 1 INFO entry logged. 0 LOW/MEDIUM/HIGH/CRITICAL.*
