---
spec_id: M1_LENS_PRIVATE_CATALOG_REBUILD
title: Mockup-fidelity polish of shared CatalogPrivateAdmin — light theme + tenant-scoped reads
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md
phase: Group C — Private Catalog (2 of 2)
depends_on: M1_LENS_CATALOG_ADMIN_REBUILD (SPEC 9, for the 4-column visual DNA)
---

# SPEC — M1_LENS_PRIVATE_CATALOG_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| `shared/js/catalog-private-admin.js` (339 lines) | ✅ | The shared component — to be polished, NOT rebuilt from scratch |
| `shared/css/` (no `catalog-private*.css` exists) | ⚠️ | Visuals come from inline styles + global tokens; new CSS file `shared/css/catalog-private-admin.css` may be added |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/` — **no `LENS_PRIVATE_CATALOG_MOCKUP.html`** | ⚠️ | Confirmed: only `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` exists. Private catalog derives the LIGHT theme variant of that same 4-column layout. |
| `modules/inventory/inventory-shell-lens.js` lines 123-131 (`private-catalog` manifest) | ✅ | Uses `partialUrl: null` + `scripts: ['shared/js/catalog-private-admin.js']` |
| `modules/inventory/inventory-shell-contact.js` (calls `CatalogPrivateAdmin.init({productType: 'contact_lens'})`) | ✅ | Cross-category consumer #1 |
| `modules/inventory/inventory-shell-accessory.js` (calls `CatalogPrivateAdmin.init({productType: 'accessory'})`) | ✅ | Cross-category consumer #2 |

### Step 1.7 — Consumer grep on `CatalogPrivateAdmin`

```
modules/inventory/inventory-shell-lens.js:140      window.CatalogPrivateAdmin.init({ productType: 'glasses', ... })
modules/inventory/inventory-shell-contact.js:91    window.CatalogPrivateAdmin.init({ productType: 'contact_lens', ... })
modules/inventory/inventory-shell-accessory.js:77  window.CatalogPrivateAdmin.init({ productType: 'accessory', ... })
```

**3 cross-category consumers.** Component changes affect ALL 3 product types. Regression check in §8 covers all 3.

### DB pre-flight

| Object | Notes |
|---|---|
| `lens_brand`, `lens_design`, `lens_variant` | Already filtered by `tenant_id` (current implementation handles this correctly) |
| `accessory_brand`, `accessory_design`, `accessory_variant` | Same pattern; product_type='accessory' branch |
| `contact_brand`, `contact_design`, `contact_variant` (or equivalent contact_lens_*) | Same; product_type='contact_lens' branch |
| Permission keys | `lens.catalog.private.manage` + `lens.catalog.global.view` (and `accessory.*`, `contact_lens.*` siblings) — already wired in current component |

### Baselines

| Symbol | Value |
|---|---|
| `BASE_SHARED_JS_LINES` | 339 |
| `BASE_LAYOUT` | 4-column grid (220px / 220px / 240px / 1fr) — already in code |
| `EXPECTED_TARGET_LINES` | 339 ± 80 (mostly polish; not a full rebuild) |
| `EXPECTED_NEW_CSS` | `shared/css/catalog-private-admin.css` (optional, ~100-150 lines if added) |
| `BASE_CROSS_CATEGORY_CONSUMERS` | 3 (lens / contact_lens / accessory) |

### Lessons applied from today's harvest

- **P-EXEC-B** — `head -30 shared/js/catalog-private-admin.js` already confirmed the API contract: `window.CatalogPrivateAdmin.init({ mountEl, productType, sb, getTenantId, hasPermission })`. Three required opts: `mountEl`, `productType`, `sb`, `getTenantId`. No callback API; mount and forget.
- **P-EXEC-C** — Tier C will mutate one brand row (rename it back to original after verifying the edit flow). Pair mutate + restore in adjacent tool calls.
- **P-STRAT-A** — No dedicated mockup; SPEC 9's mockup is the visual reference for the 4-column layout (light theme variant). Documented in §0.

---

## 1. Goal

Polish the existing shared `shared/js/catalog-private-admin.js` to align 1:1 with the LIGHT-theme variant of the SPEC 9 4-column layout. Preserve the cross-category contract (3 product types served by one component). Light theme = default tokens (`shared/css/tokens.css`); dark theme is exclusive to SPEC 9's catalog-admin screen.

## 2. Background

The private catalog is the store's per-tenant view of their owned brands/designs/variants (vs the platform-admin's global view in SPEC 9). The shared component was sealed by `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED` and is consumed by all 3 inventory category tabs. Mockup discipline (Pattern P-AR-16) applies in spirit — visual alignment with SPEC 9's layout in light theme, but without a dedicated mockup file.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 3 |
| S3 | 4-column grid renders (220/220/240/1fr) | DOM grid-template-columns matches | yes |
| S4 | Light theme applied | page header background uses light token (not `#1e293b` dark) | yes |
| S5 | Component file ≤ 350 lines (Iron Rule 12 hard cap) | `wc -l shared/js/catalog-private-admin.js` | ≤ 350 |
| S6 | All 3 productType branches render correctly (glasses, contact_lens, accessory) | Chrome MCP: navigate each category's private-catalog tab | yes |
| S7 | Global tab + Private tab both work; sub-tab switching | Click each sub-tab; verify column data switches | yes |
| S8 | Tenant-scoped reads | Brand/design/variant tables show only `tenant_id = getTenantId()` rows | yes |
| S9 | Permission gating: private-tab CRUD requires `<mod>.catalog.private.manage`; global-tab is read-only | `data-permission` attributes present on Add buttons | yes |
| S10 | No DDL applied | `git diff {start}..HEAD -- supabase/migrations/` | empty |
| S11 | Tier C: pick a tenant-owned brand → designs populate; pick design → variants populate; pick variant → detail pane | Chrome MCP click sequence | yes |
| S12 | Tier C cross-category regression: navigate contact-lens private-catalog tab → component loads; navigate accessory private-catalog tab → component loads | snapshot per tab | both yes |
| S13 | Zero console errors during Tier C | filter type=error | 0 (pre-existing GoTrueClient OK) |
| S14 | Iron Rule 31 (integrity gate) | every commit | exit 0 |
| S15 | Iron Rule 32 (destructive ops declared) | pre-commit | 0 violations (§4 None.) |
| S16 | EXECUTION_REPORT + FINDINGS + ≥ 3 screenshots (lens private cat, contact private cat, accessory private cat) | `ls` | files exist |
| S17 | Group A + B + SPEC 9 regression check | tabs load cleanly | confirmed |
| S18 | ROADMAP + CHANGELOG + SESSION_CONTEXT updated | grep | entries appended |

## 4. Destructive Operations

**None.** Pure visual + light-polish. No DDL, no file deletions, no signature changes. The shared component's public API stays identical (`window.CatalogPrivateAdmin.init({ mountEl, productType, sb, getTenantId, hasPermission })`).

**Forbidden:**
- Any breaking change to the component's `.init()` API signature
- Any change to the 3 inventory-shell-*.js consumer files (other than CSS-link addition if needed)
- Any DB write / schema change
- Any RPC call addition
- Migrating sibling catalog admins (contact-lens-catalog-admin / accessory-catalog-admin) — out of scope; those are platform-admin equivalents to SPEC 9

## 5. Autonomy Envelope

**Can do without asking:**
- Read `shared/js/catalog-private-admin.js` in full (339 lines)
- Read SPEC 9's mockup (671 lines, dark theme) — derive the LIGHT theme variant
- Iron Rule 9 backup before rewrite (single file > 100 lines refactored OR > 5 files affected)
- Polish the JS file in place
- Optionally add `shared/css/catalog-private-admin.css` with light-themed page-frame
- Update `inventory.html` to load the new CSS (if added)
- 3 commits per §10
- Tier C: read-only across 3 product types

**MUST stop and report:**
- Component file approaches 350 lines (Iron Rule 12 hard cap) — split into a helper file if needed
- API signature change required → STOP (would break 3 sibling consumers)
- Iron Rule 32 fires
- Any of the 3 product types fails to load in Tier C

## 6. Stop-on-Deviation Triggers

- If polish requires breaking the `.init()` contract → STOP
- If light theme requires changes to `shared/css/tokens.css` → STOP (tokens are project-wide; out of scope)
- If a Tier C cross-category check fails → STOP (regression vs M1_FINAL_NIGHT_PHASE_1 closure)

## 7. Out of Scope (explicit)

- Dark theme (that's SPEC 9)
- Sibling catalog-admin modules (contact-lens-catalog-admin, accessory-catalog-admin — platform-admin screens, not private)
- Any DB schema change
- Any permission key change
- The Designs Selection toggle work (SPEC 12)
- A separate per-product-type component split

## 8. QA / Tier C Verification Plan

1. Start local servers.
2. Chrome MCP navigate → `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=private-catalog`.
3. Verify 4-column LIGHT-themed grid renders.
4. Click "🌐 מותגים גלובליים" sub-tab → global brands populate read-only.
5. Click "📖 הקטלוג שלי" sub-tab → private brands populate (tenant-scoped).
6. Pick a tenant brand → designs populate.
7. Pick a design → variants populate.
8. Pick a variant → detail pane populates.
9. Cross-category regression: navigate to `?cat=contact_lenses&tab=private-catalog` → component loads with `productType='contact_lens'`.
10. Cross-category regression: navigate to `?cat=accessories&tab=private-catalog` → component loads with `productType='accessory'`.
11. Verify 0 console errors at each step.
12. Take 3 screenshots: lens private catalog, contact private catalog, accessory private catalog.

## 9. Expected Final State

### Repo
- `shared/js/catalog-private-admin.js` — polished, light-themed, ≤ 350 lines
- (Optional) NEW `shared/css/catalog-private-admin.css` — light page-frame
- `inventory.html` — +1 CSS link if the new CSS file was added
- `shared/tests/M1_PRIVATE_CATALOG_REBUILD_2026-05-18/` backup folder OR backups in module's standard backup path
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT + FINDINGS + ≥ 3 screenshots

### DB
- 0 schema changes
- 0 persistent rows added (Tier C is mostly read-only; if a CRUD smoke is added it must mutate+restore in adjacent calls per P-EXEC-C)

### Docs
- Module ROADMAP — SPEC 10 marked ✅
- Module CHANGELOG — entry under "Group C"
- Module SESSION_CONTEXT — updated post-close

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_PRIVATE_CATALOG_REBUILD SPEC` (Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(catalog-private-admin): light-theme polish + 4-column layout alignment` | shared JS + optional new CSS + inventory.html if needed + backup |
| 3 | `chore(spec): close M1_LENS_PRIVATE_CATALOG_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + ROADMAP + CHANGELOG + SESSION_CONTEXT |

Expected total: 3 commits.

## 11. Pipeline Coordination

`files_owned_globs`:
```
shared/js/catalog-private-admin.js
shared/css/catalog-private-admin.css
inventory.html
modules/Module 1 - Inventory Management/backups/M1_LENS_PRIVATE_CATALOG_REBUILD_2026-05-18/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRIVATE_CATALOG_REBUILD/**
```

Branch: `develop`. No worktree. Path X sequential (runs AFTER SPEC 9 closes 🟢).

## 12. Rollback Plan

If Tier C reveals a regression (any of the 3 product types breaks):
- Restore `shared/js/catalog-private-admin.js` from backup
- Revert CSS additions
- Two commits: `revert: revert M1_LENS_PRIVATE_CATALOG_REBUILD` + `chore(spec): reopen`

The cross-category nature means rollback must restore for all 3 consumers — Iron Rule 21 (no orphans).

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] ≥ 3 Tier C screenshots (lens + contact + accessory)
- [ ] Module ROADMAP + CHANGELOG + SESSION_CONTEXT updated
- [ ] API signature unchanged

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Cross-category shared-component polish. Light-theme rebuild derived from SPEC 9's mockup; no dedicated private catalog mockup exists._
