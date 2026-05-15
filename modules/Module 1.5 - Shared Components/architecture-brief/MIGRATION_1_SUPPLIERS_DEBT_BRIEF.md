# Production Migration #1 — Suppliers Debt → Hybrid+Navy

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 1.5 (cross-module visual migration)
**Target file:** `suppliers-debt.html` (production ERP page)

---

## 1. Purpose

The first of 4 production-page migrations to the Hybrid+Navy design system. Suppliers Debt was chosen as Migration #1 because:
- Smallest of the 4 (269 lines HTML + 66 lines inline style)
- Self-contained (does not share JS state with other modules)
- Already has an approved Hybrid mockup at `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/suppliers-debt.html`
- Daniel-approved policy: all 4 migrations land on `develop`; merge to `main` as ONE batch after all 4 are QA-clean

Goal: re-skin the LIVE `suppliers-debt.html` (root of the ERP repo) to use the Hybrid+Navy palette and patterns, **without breaking ANY functional behavior**. Every Supabase call, every event handler, every JS function continues to work exactly as before.

## 2. Strategy: Visual Re-Skin, Zero Logic Change

This is NOT a refactor. NOT an architecture change. NOT a CSS rewrite. It is a token-driven re-skin of an existing production page.

### What changes
1. **Inline `<style>` block** in `suppliers-debt.html` (66 lines) — token swap per the map in §3.
2. **Page-level CSS class references** — if classes target deprecated `--purple-deep` or other legacy tokens, those classes get their CSS bodies updated in their owning CSS file. The HTML class names themselves stay unchanged.
3. **Where the page uses inline `style="..."` attributes with literal colors** — these are swapped per the same map.
4. **`shared/css/variables.css`** — if it doesn't yet have Navy tokens, ADD them as new variables alongside the existing ones. Do NOT delete existing variables (other production pages depend on them — migrations #2/#3/#4 will replace usage).

### What does NOT change
- HTML structure (DOM tree)
- All JS files (`js/shared.js`, `js/data-loading.js`, etc) — zero touches
- All event handlers, IDs, data attributes, hidden form fields
- Supabase RPC calls, RLS context, tenant_id flow
- The 3 CSS files referenced (`modal.css`, `styles.css`, `header.css`) — only relevant rules INSIDE them get token updates, not their structure
- Text content (Hebrew labels, table headers, button labels)
- Functional behavior — every flow that worked before MUST work after

### Reference for the target look
`modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/suppliers-debt.html` is the visual target. But the LIVE file's STRUCTURE (which Supabase tables, which RPCs, which JS handlers) is the contract — the mockup informs colors/spacing/treatment, not data model or interaction.

## 3. Token Swap Map

Same map as the sketch re-skins, applied to production CSS:

| Legacy | Hybrid+Navy |
|---|---|
| `#534AB7` / purple primary | `#1e3a8a` / Navy accent |
| `#EEEDFE` / purple soft bg | `#e6f1fb` / accent soft |
| `#26215C` / purple-deep (text) | `#0f172a` / text-primary |
| `#26215C` / purple-deep (bg, with white text) | `#1e3a8a` / Navy bg with white text |
| `#7F77DD` / purple-mid | `#1e40af` / accent-hover |
| Any `linear-gradient(...purple/gold...)` | Solid Hybrid token |
| `--bg` `#FAFAF7` | unchanged hex, but rename `--bg-page` if introducing new tokens |
| `--surface` `#FFFFFF` | unchanged hex |
| `--text` `#1F1F1E` | swap to `#0f172a` |
| `--text-2` `#5F5E5A` | swap to `#475569` |
| Multi-color decorative accents (NOT semantic) | unify to neutral or accent-soft |
| Semantic (success/warning/danger/info) | KEEP, map to Hybrid semantic tokens |

## 4. Functional Preservation — The Hard Rule

The Executor must verify these BEFORE writing any CSS:

1. **Catalog the page's behaviors** — list every interactive element, every Supabase call, every event handler in the page. Save to `PRE_MIGRATION_BEHAVIOR.md` in the SPEC folder.
2. **After CSS changes**, re-verify each item still works.
3. **Localhost-Tester smoke** — run `npm run smoke` AND open `suppliers-debt.html` on `localhost:3000` on demo tenant, verify:
   - Page loads, no console errors
   - Supplier list renders (real Supabase data from demo)
   - Click a row → debt drawer/modal opens (whatever the existing flow is)
   - Filter/search works if present
   - Pagination works if present
   - The 3 stat cards / KPI tiles render with real data
   - No layout breaks at 1080p viewport

If ANY behavior breaks → STOP, rollback the commit via `git revert`, escalate.

## 5. Scope — Out

- M1 Inventory pages — Daniel directive, no touch
- The other 3 migration targets (Settings+Permissions, CRM, Storefront Studio) — separate Pipelines
- `shared/css/variables.css` — only ADD new tokens, do NOT delete or rename existing
- JS files — zero changes
- New features — not in this migration
- Database changes — not in this migration

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Re-skin only, zero functional change | Architect 2026-05-11 |
| 2 | Migration to `develop` only, NO merge to `main` in this SPEC | Daniel 2026-05-11 (batch-to-main policy) |
| 3 | Pre-commit git tag `pre-migration-suppliers-debt` | Architect 2026-05-11 |
| 4 | Mockup at `hybrid-final/suppliers-debt.html` is visual reference, not structural contract | Architect 2026-05-11 |
| 5 | `shared/css/variables.css` gets NEW Navy tokens added, no deletions yet | Architect 2026-05-11 (variables stay until all 4 migrations done) |
| 6 | Continuous-Run Mandate — single chat | Daniel 2026-05-11 |
| 7 | Localhost-Tester required — actual page render on localhost:3000 + demo tenant | Architect 2026-05-11 |

## 7. Quality Bar — Acceptance Criteria

1. `suppliers-debt.html` line count within ±15% of original 269 lines (no major bloat or shrink).
2. `grep -i "26215c\|534ab7" suppliers-debt.html` returns 0 matches (in the inline style block).
3. `grep "1e3a8a" suppliers-debt.html` returns ≥1 match (Navy is present).
4. All JS file references unchanged (10 `<script>` lines preserved verbatim).
5. All 3 CSS file references unchanged.
6. DOM tag count within ±2% of original.
7. `npm run verify:integrity` exit 0.
8. `npm run smoke` 7/7 PASS.
9. Manual Localhost-Tester check: page renders on demo tenant, supplier list populates with real data, no console errors. Logged in TEST_REPORT.md.
10. Pre-commit git tag `pre-migration-suppliers-debt` created.
11. Single commit (re-skin) + 1 retrospective commit.
12. Working tree clean at end.
13. Pushed to `origin/develop` (NOT `main`).

## 8. Destructive Operations

Declared:
- **1 in-place file overwrite** of `suppliers-debt.html` with pre-commit git tag
- **Possible additions** to `shared/css/variables.css` (additions only, no removals)
- **Possible CSS updates** in `css/styles.css` / `css/header.css` (rule body updates, no rule deletions, no selector renames)

NO deletes. NO renames. NO schema. NO JS changes. NO force-push. NO merge to main.

## 9. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- Page no longer renders or throws console error post-migration
- A success criterion that cannot be met
- A behavior from PRE_MIGRATION_BEHAVIOR.md is now broken

## 10. Anti-Patterns

- DO NOT touch JS files. Zero exceptions.
- DO NOT delete from `shared/css/variables.css` (other pages still depend on the legacy variables until migrations #2/#3/#4 complete)
- DO NOT change DOM structure
- DO NOT rename CSS classes
- DO NOT change Supabase queries
- DO NOT merge to main
- DO NOT skip the localhost check — this is the FIRST production migration; the gate is mandatory

## 11. References

- LIVE file: `suppliers-debt.html` at repo root
- Visual target: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/suppliers-debt.html`
- Token source: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/_tokens.css`
- Shared CSS: `shared/css/variables.css`, `css/styles.css`, `css/header.css`

---

*End of brief.*
