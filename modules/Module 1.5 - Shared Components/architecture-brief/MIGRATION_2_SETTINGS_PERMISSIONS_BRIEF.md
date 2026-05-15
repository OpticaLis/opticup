# Production Migration #2 — Settings + Permissions → Hybrid+Navy

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 1.5 (cross-module visual migration)
**Target files:** `settings.html` + `employees.html` (production ERP pages)

---

## 1. Purpose

Second of 4 production-page migrations to Hybrid+Navy. Two production files in scope:
- `settings.html` (208 lines) — business settings (financial / display / AI / etc.)
- `employees.html` (87 lines) — title: "ניהול הרשאות", contains the permissions matrix + users

**Decision locked 2026-05-11:** these stay as TWO separate pages in this migration. The Hybrid mockup `permissions.html` showed them merged as a tab inside Settings — that consolidation is a structural change (routing, event handlers, permission checks, link migration across the codebase) and gets a separate SPEC AFTER all 4 visual migrations are complete.

Goal: re-skin both pages to Hybrid+Navy. Zero functional change. Zero structural merge.

## 2. Strategy: Visual Re-Skin Only

Same playbook as Migration #1 (Suppliers Debt), applied to 2 files instead of 1.

### What changes
- Inline `<style>` blocks (where present) — token swap
- Inline `style="..."` attributes with literal colors — token swap
- CSS rule bodies in shared CSS files (`shared/css/variables.css` / `css/styles.css` / `css/header.css` / module-specific CSS) — ONLY rule-body color values; no rule deletions, no selector renames
- New Navy tokens ADDED to `shared/css/variables.css` (no deletions of legacy tokens — they're still consumed by un-migrated pages)

### What does NOT change
- HTML structure (DOM tree)
- JS files — zero touches
- All event handlers, IDs, data attributes
- Supabase RPC calls, RLS context, tenant_id flow
- The relationship between `settings.html` and `employees.html` — they stay 2 separate pages with their own URLs
- Text content (Hebrew labels, headings, button labels)
- The permission-matrix data structure
- The users-list data flow

### Visual reference
- `settings.html` → `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/settings.html`
- `employees.html` → `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/permissions.html`

The mockups inform color/spacing/treatment. The LIVE files' STRUCTURE (which DB tables, which JS handlers) is the contract — the mockup informs visuals only.

## 3. Token Swap Map

Same as Migration #1. Identical map.

| Legacy | Hybrid+Navy |
|---|---|
| `#534AB7` / purple | `#1e3a8a` |
| `#EEEDFE` / purple-soft | `#e6f1fb` |
| `#26215C` / purple-deep (text) | `#0f172a` |
| `#26215C` / purple-deep (bg) | `#1e3a8a` with white text |
| `#7F77DD` / purple-mid | `#1e40af` |
| Any gradient | Solid Hybrid token |
| `#1F1F1E` / text | `#0f172a` |
| `#5F5E5A` / text-2 | `#475569` |
| Decorative multi-color | `--text-secondary` or `--accent-soft` |
| Semantic (success/warning/danger/info) | KEEP |

## 4. Functional Preservation — The Hard Rule

For EACH page (settings + employees), the Executor MUST:

1. **Catalog interactive behaviors BEFORE the change** — list every button, every form, every Supabase call, every event handler. Save to `PRE_MIGRATION_BEHAVIOR.md` in SPEC folder.
2. **Re-verify after CSS changes** — every cataloged behavior still works.
3. **Localhost-Tester smoke (MANDATORY)** — actual page render on localhost:3000 demo tenant.

### Localhost verification — Settings
- Page loads, no console errors
- Each settings section renders (business / financial / display / AI)
- At least one settings value is editable + saves to Supabase
- Permission checks: a non-owner role sees the appropriate restricted view (if applicable today)

### Localhost verification — Employees (Permissions)
- Page loads, no console errors
- Users table renders with real demo data
- Roles list / permission matrix renders
- Can click a user → role-edit UI opens (the existing flow)
- Permission updates persist (don't actually save during test — just verify the form opens)

If ANY behavior breaks for ANY page → STOP, rollback via `git revert`, escalate.

## 5. Scope — Out

- **M1 Inventory pages** — Daniel directive, no touch
- **`admin.html`** (Platform Admin) — separate module (M2), not part of this migration
- **Other 2 migration targets** (CRM, Storefront Studio) — separate Pipelines
- **JS files** — zero changes
- **Settings/Permissions merge to tabs** — separate SPEC, after all 4 migrations land
- **Database changes** — no
- **New features** — no

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Re-skin only, zero functional change | Architect 2026-05-11 |
| 2 | settings.html + employees.html stay 2 separate pages | Daniel 2026-05-11 |
| 3 | Tab consolidation deferred to separate SPEC | Daniel 2026-05-11 |
| 4 | Migration to `develop` only, NO merge to `main` | Daniel 2026-05-11 (batch policy) |
| 5 | Pre-commit git tags: `pre-migration-settings`, `pre-migration-employees` | Architect 2026-05-11 |
| 6 | Localhost-Tester mandatory for BOTH pages | Architect 2026-05-11 |
| 7 | New Navy tokens ADDED to variables.css, no deletions | Architect 2026-05-11 |
| 8 | Continuous-Run Mandate | Daniel 2026-05-11 |

## 7. Quality Bar — Acceptance Criteria

1. `settings.html` line count within ±15% of 208 lines.
2. `employees.html` line count within ±15% of 87 lines.
3. `grep -i "26215c\|534ab7" settings.html employees.html` returns 0 matches.
4. `grep "1e3a8a" settings.html employees.html` returns ≥1 match each.
5. All `<script>` tags preserved verbatim in both files.
6. All `<link rel="stylesheet">` tags preserved verbatim in both files.
7. DOM tag count within ±2% of original per file.
8. `npm run verify:integrity` exit 0.
9. `npm run smoke` 7/7 PASS.
10. Localhost render verified for BOTH pages on demo tenant, documented in TEST_REPORT.md.
11. Pre-commit git tags `pre-migration-settings` + `pre-migration-employees` exist.
12. 2 main commits (one per page) + 1 retrospective.
13. Working tree clean at end.
14. Pushed to `origin/develop` (NOT `main`).

## 8. Destructive Operations

Declared:
- **2 in-place file overwrites**: `settings.html`, `employees.html` (with pre-commit git tags)
- **Additions only** to `shared/css/variables.css`
- **Rule-body token updates** in shared CSS files (no rule deletions, no selector renames)

NO file deletes. NO renames. NO schema. NO JS changes. NO DOM-structure changes. NO force-push. NO merge to main. NO consolidation of the 2 pages.

## 9. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- A page no longer renders or throws console error post-migration
- A cataloged behavior is now broken
- A success criterion that cannot be met

## 10. Anti-Patterns

- DO NOT touch JS files
- DO NOT merge the 2 pages into tabs (deferred to separate SPEC)
- DO NOT delete legacy tokens from variables.css
- DO NOT change DOM structure
- DO NOT change CSS selectors or class names
- DO NOT touch admin.html (Platform Admin — separate module)
- DO NOT touch any of the other 3 migration targets (CRM, Storefront Studio, Suppliers Debt)
- DO NOT merge to main
- DO NOT skip the localhost check for either page

## 11. References

- LIVE files: `settings.html` + `employees.html` at repo root
- Visual targets:
  - Settings: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/settings.html`
  - Permissions: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/permissions.html`
- Token source: `hybrid-final/_tokens.css`
- Pattern reference: Migration #1 SPEC at `modules/Module 1.5 - Shared Components/docs/specs/M1_5_MIGRATION_1_SUPPLIERS_DEBT/`

---

*End of brief.*
