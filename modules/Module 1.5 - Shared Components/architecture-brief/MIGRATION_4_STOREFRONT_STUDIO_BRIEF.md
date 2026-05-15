# Production Migration #4 — Storefront Studio → Hybrid+Navy

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 1.5
**Target files:** `storefront-studio.html` + related `storefront-*.html` pages + their CSS

---

## 1. Purpose

Fourth and final of the production-page migration batch. Storefront Studio is the ERP-side admin interface for managing the public storefront (pages, blocks, media library, translations, campaigns).

After this SPEC, all 4 production pages (Suppliers Debt, Settings+Permissions, CRM, Storefront Studio) are on Hybrid+Navy on `develop`. Daniel then approves merge to `main` as ONE batch.

## 2. Scope — In

### Files in scope

Pre-flight enumerates the exact list. Likely candidates from previous repo inspection:
- `storefront-studio.html` (main page)
- `storefront-content.html`
- `storefront-products.html`
- `storefront-settings.html`
- `storefront-landing-content.html`
- `storefront-blog.html`
- `storefront-glossary.html`
- Plus their dedicated CSS files (`css/storefront-*.css` if they exist as separate files)

Total: ~7 HTML files + associated CSS. The Pipeline determines exact scope during pre-flight.

### Transformation type

Same as Migration #1 (Suppliers Debt) — full re-skin from legacy palette to Hybrid+Navy. The token swap map is identical to the prior migrations.

If a file already uses Slate 900 (like CRM did), the migration treats it as CRM-style: add Navy accent only, keep Slate primary.

If a file uses the legacy purple-deep palette: full token replacement (purple → Navy, purple-deep → Navy or Slate, etc.).

Pipeline pre-flight detects which case applies per file.

### What changes per file
1. Inline `<style>` blocks — token swap
2. Inline `style="..."` literal colors — token swap
3. CSS rule bodies in dedicated `storefront-*.css` files — token swap
4. Navy tokens added to `shared/css/variables.css` (idempotent — already done in #1/#2/#3)

### What does NOT change
- DOM structure
- JS files — zero touches
- All event handlers, IDs, data attributes
- Supabase RPC calls, RLS, tenant_id flow
- Text content (Hebrew labels, headings)
- Hebrew RTL
- CMS data structure
- Image proxy paths
- Storefront preview iframe URLs

## 3. Token Swap Map

Same map as Migration #1 + #2 + #3. Identical.

| Legacy | Hybrid+Navy |
|---|---|
| `#534AB7` purple | `#1e3a8a` Navy |
| `#EEEDFE` purple-soft | `#e6f1fb` accent-soft |
| `#26215C` purple-deep (text) | `#0f172a` text-primary |
| `#26215C` purple-deep (bg) | `#1e3a8a` with white text |
| `#7F77DD` purple-mid | `#1e40af` accent-hover |
| `linear-gradient(...)` | Solid Hybrid token |
| `#1F1F1E` text | `#0f172a` |
| `#5F5E5A` text-2 | `#475569` |
| Slate-already-modern files (CRM-style) | Add Navy accent only — preserve Slate primary |
| Decorative multi-color (non-semantic) | Unify to neutral or accent-soft |
| Semantic (success/warning/danger/info) | KEEP |

## 4. Functional Preservation

Per file, the Executor MUST:
1. Catalog interactive behaviors BEFORE the change to `PRE_MIGRATION_BEHAVIOR.md`
2. Re-verify after the CSS changes
3. Localhost-Tester smoke on demo tenant for the MAIN storefront-studio page + 2 sub-pages (Executor picks which)

Per page localhost checks:
- Page loads, 0 console errors
- CMS list/grid renders with demo data
- Edit a page → editor opens with current content
- Click "+" to create new → form opens
- Click an image in media library → it displays correctly
- Each storefront-* page navigates to and from each other
- Right-side preview iframe loads the actual demo storefront (`opticup-storefront-demo.vercel.app`) — verify the integration still works

If ANY behavior breaks → `git revert HEAD~1` → STOP → escalate.

## 5. Scope — Out

- M1 Inventory pages — Daniel directive
- CRM, Settings, Permissions, Suppliers Debt — already migrated
- The public storefront itself (separate Vercel project) — out of scope; only its ERP admin side
- New features — no
- DB changes — no
- JS file changes — no
- Storefront content/data restructuring — no

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Re-skin only, zero functional change | Architect 2026-05-11 |
| 2 | Same token map as prior migrations | Architect 2026-05-11 |
| 3 | All storefront-*.html files in scope (Pipeline enumerates exactly) | Architect 2026-05-11 |
| 4 | Develop only, NO merge to main in this SPEC | Daniel 2026-05-11 (batch policy still active) |
| 5 | Pre-commit git tags per file `pre-migration-storefront-{filename}` | Architect — per-file revert capability |
| 6 | Localhost-Tester mandatory on main + 2 sub-pages | Architect 2026-05-11 |
| 7 | Continuous-Run Mandate | Daniel 2026-05-11 |

## 7. Quality Bar — Acceptance Criteria

1. All storefront-*.html files in pre-flight list are re-skinned per token map
2. `grep -i "26215c\|534ab7" storefront-*.html css/storefront-*.css` returns 0 matches
3. `grep "1e3a8a" storefront-*.html css/storefront-*.css` returns ≥1 match per file that needed accent
4. All `<script>` and `<link rel="stylesheet">` tags preserved verbatim per file
5. DOM tag count within ±2% of original per file
6. Pre-commit git tags exist per file
7. Per-file commits (one per file) + 1 retrospective commit
8. `npm run verify:integrity` exit 0
9. `npm run smoke` 7/7 PASS
10. Localhost render verified on main + 2 sub-pages on demo tenant
11. Working tree clean
12. Pushed to `origin/develop` (NOT main)

## 8. Destructive Operations

Declared:
- In-place file overwrites for each storefront-*.html in scope (with per-file git tags for rollback)
- Rule-body token updates in storefront-*.css files (no rule deletions, no selector renames)
- Additions only to `shared/css/variables.css` (idempotent — already added)

NO file deletes. NO renames. NO schema. NO JS changes. NO DOM changes. NO force-push. NO merge to main.

## 9. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- A page no longer renders or throws console error
- Preview iframe integration with `opticup-storefront-demo.vercel.app` breaks
- Behavior from `PRE_MIGRATION_BEHAVIOR.md` is now broken

## 10. Anti-Patterns

- DO NOT touch JS files
- DO NOT delete legacy tokens from variables.css (other modules may still depend until M1 Inventory migration eventually)
- DO NOT change DOM structure
- DO NOT change CSS selectors or class names
- DO NOT touch M1 Inventory or other migrated pages (CRM, Settings, Permissions, Suppliers Debt)
- DO NOT change the public storefront (it's a separate Vercel project, separate repo)
- DO NOT merge to main
- DO NOT skip the preview iframe verification — that's the integration risk

## 11. References

- LIVE files: `storefront-*.html` at repo root + `css/storefront-*.css` (Pipeline enumerates)
- Visual target: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/storefront-studio.html`
- Pattern references: Migration #1, #2, #3 SPECs
- Demo storefront preview: `https://opticup-storefront-demo.vercel.app` (the iframe should still load this after migration)

---

*End of brief.*
