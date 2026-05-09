# FINDINGS — PERMISSIONS_PHASE3_CSS_GATING_2026_04_27

> **Written by:** opticup-executor (during SPEC execution)

---

## Findings

### Finding 1 — `.admin-col` CSS class is dead (no HTML/JS uses it)

- **Code:** `M1-DEAD-01`
- **Severity:** LOW (cleanup opportunity)
- **Discovered during:** Phase A audit grep
- **Location:** `css/employees.css:47`, `css/inventory.css:47`, `css/settings.css:47`, `css/shipments.css:47`, `css/styles.css:47` — all 5 files have `.admin-col{display:none}.admin-mode .admin-col{display:table-cell}`. No `.html` or `.js` file in active source references the class.
- **Description:** Dead CSS class. Iron Rule 21 (No Orphans) candidate for removal. Kept in this SPEC (out-of-scope per §7); flagged for a future cleanup SPEC.
- **Reproduction:** `grep -rn "admin-col" --include="*.html" --include="*.js" --exclude-dir=".claude" --exclude-dir=node_modules . | grep -v backups | grep -v .css` → empty.
- **Suggested next action:** TECH_DEBT (remove from all 5 stylesheets in a CSS-cleanup SPEC).
- **Foreman override:** { }

---

### Finding 2 — `.cost-field` partial visibility for manager (4 in DOM, 2 visible)

- **Code:** `M1-OBSERVATION-01`
- **Severity:** LOW (observation; not a bug — out of scope for this SPEC)
- **Discovered during:** Phase A live evidence capture
- **Location:** `inventory.html:214-215` (bulk-bar cost-field inputs); `modules/inventory/inventory-entry.js:38-39` (entry-form per-row cost inputs)
- **Description:** Manager sees `.cost-field` count of 4 in DOM, 2 visible. The hidden 2 are likely the bulk-bar inputs (which sit inside `.admin-mode`-gated parent containers); the visible 2 are likely entry-form fields whose parent containers are NOT `.admin-mode`-gated. This SPEC's scope is `.qty-btns` only; not investigating further.
- **Reproduction:** Sign in as Demo manager (PIN 090004), navigate to inventory.html, count `.cost-field` elements + check getComputedStyle(el).display for each.
- **Suggested next action:** TECH_DEBT — investigate cost-field rendering paths to confirm cost data is genuinely hidden from manager. If 2 visible cost fields ARE leaking cost data to manager, that's a real bug (separate SPEC).
- **Foreman override:** { }

---

### Finding 3 — 5 duplicate stylesheets with identical content (employees.css, inventory.css, settings.css, shipments.css, styles.css)

- **Code:** `M1-DEBT-01` (recurrence — also flagged in Phase 2 EXECUTION_REPORT)
- **Severity:** MEDIUM (maintenance burden; every CSS change requires 5 edits)
- **Discovered during:** Phase B implementation
- **Location:** `css/*.css`
- **Description:** Each of these 5 files contains the same admin-mode CSS rules verbatim. This SPEC explicitly refused to consolidate them (per §7) because:
  1. Each HTML page loads a different one (which I haven't fully mapped — would need a full audit).
  2. Consolidation could cause subtle UI changes if any file has a unique rule I missed.
  3. SPEC author wanted a surgical fix, not a refactor.
- **Suggested next action:** TECH_DEBT — separate CSS-consolidation SPEC. Probably collapses 5 files to 1 base + per-page deltas.
- **Foreman override:** { }

---

### Finding 4 — Phase 2 missed enumerating which `.admin-mode` CSS rules needed remapping

- **Code:** `M1-PROCESS-01`
- **Severity:** MEDIUM (the same finding spawned this SPEC)
- **Discovered during:** Reflecting on Phase 2 close
- **Location:** Phase 2 EXECUTION_REPORT §5 deviation 4 noted CSS coupling but didn't enumerate per-class remap decisions.
- **Description:** Phase 2 fix moved the `.admin-mode` body-class toggle from `admin.js` to `applyUIPermissions` (preserving CSS UX). It noted the coupling but didn't per-class audit which rules should stay vs migrate. As a result, the manager-can't-see-qty-btns bug shipped to production and Daniel had to file a follow-up. This Phase 3 SPEC IS that follow-up.
- **Suggested next action:** TECH_DEBT (executor SKILL — when a fix preserves a coupling for back-compat, mandate a per-element audit before commit; don't ship coupling without classifying every consumer).
- **Foreman override:** { }

---

### Finding 5 — `Module 1 - Inventory` vs `Module 1 - Inventory Management` folder duplication (recurrence)

- **Code:** `M3-RECUR-01`
- **Severity:** LOW (recurrence — already TECH_DEBT in 5 prior FOREMAN_REVIEWs)
- **Description:** Same folder-shorthand issue. This SPEC's folder lives under `Module 1 - Inventory/`; SESSION_CONTEXT lives under `Module 1 - Inventory Management/`.
- **Suggested next action:** DISMISS (already TECH_DEBT)
- **Foreman override:** { }

---

*End of FINDINGS.md.*
