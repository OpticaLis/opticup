---
spec_id: M1_LENS_CATALOG_ADMIN_REBUILD
title: 1:1 mockup-fidelity rebuild of lens-catalog-admin with dark theme + 4-column layout
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md
mockup: modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html
phase: Group C — Catalog Admin (1 of 2)
---

# SPEC — M1_LENS_CATALOG_ADMIN_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-catalog-admin/` (7 .js + 1 .html, 785 lines) | ✅ | Current implementation to be replaced |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (671 lines) | ✅ | The spec (Pattern P-AR-16) — **dark theme** confirmed in mockup CSS (`background: #1e293b`, `color: #f1f5f9`, `border: 1px solid #334155`) |
| `shared/js/chip-filter-row.js` (global `window.ChipFilter` per P-EXEC-2026-05-18-B) | ✅ | If mockup uses chip-filter row |
| `shared/js/table-builder.js` + `table-builder-extensions.js` | ✅ | For the 4-column data grid |
| `shared/js/side-detail-panel.js` (global `window.SideDetailPanel` — to be verified per P-EXEC-2026-05-18-B before mount) | ✅ | For variant detail panel |
| `modules/inventory/inventory-shell-lens.js` lines 115-122 — `catalog-admin` tab manifest | ✅ | `perm: '__platform_admin__'`, separate Supabase Auth (Google OAuth) per pre-existing comment |
| Pre-existing P-STRAT-2026-05-18-A check — components USED IN MOCKUP, not just available | n/a | Mockup is 671 lines; will be confirmed per-component when Executor reads it |

### Step 1.7 — Consumer grep on lens-catalog-admin assets

```
modules/lens-catalog-admin/*                 — owns this rewrite
modules/inventory/inventory-shell-lens.js    — manifest entry (lines 115-122) + platform-admin runtime gate (lines 287-310) — preserved
modules/contact-lens-catalog-admin/*         — SIBLING module (NOT touched here) — pattern reference only
modules/accessory-catalog-admin/*            — SIBLING module (NOT touched here) — pattern reference only
shared/js/catalog-private-admin.js           — DIFFERENT component (used by SPEC 10), not by this SPEC
```

**Zero unexpected external cross-module callers** of lens-catalog-admin specifically. The sibling contact-lens + accessory catalog admins are separate modules that have already been built; this SPEC rebuilds lens-catalog-admin only. Sibling modules are pattern references, not consumers.

### DB pre-flight

| Object | Notes |
|---|---|
| `lens_catalog_admin` runtime auth | Uses a separate Google OAuth flow (per `catalog-auth.js`); JWT context differs from the normal PIN-auth tenant flow. **Out of scope to refactor** — just preserve the existing auth wrapper. |
| `lens_brand`, `lens_design`, `lens_variant` tables | Already used by current implementation. Read-only consumers in this rebuild. |
| `supplier_catalog_offering` (the toggle target) | Read-only here; mutation is the toggle screen's job (SPEC 4/12). |

### Baselines

| Symbol | Value |
|---|---|
| `BASE_MOCKUP_LINES` | 671 |
| `BASE_JS_TOTAL_LINES` | 676 (7 .js files) |
| `BASE_PARTIAL_LINES` | 109 |
| `EXPECTED_TARGET_JS_LINES` | 900-1300 across 7-9 files (each ≤ 300 per Iron Rule 12) |
| `EXPECTED_LAYOUT` | 4-column grid (220px brands / 220px designs / 240px variants / 1fr detail-pane), all dark-themed |

### Lessons applied from today's harvest (P-STRAT-2026-05-18-A through E + P-EXEC-A through E)

- **P-STRAT-A** — listed shared deps will be cross-checked against mockup citations at Executor §0 of execution (not duplicated here pre-emptively; the mockup is 671 lines and the relevant components depend on which Executor encounters in the actual mockup body).
- **P-STRAT-B** — global-name probes deferred to Executor §0 (filename → global verification).
- **P-EXEC-B** — Executor MUST `head -30 shared/js/<component>.js` before each shared-component mount call.
- **P-EXEC-A** — Tier C polls must wait on STATE-COMPLETE conditions if a flow has multi-step async.
- **P-EXEC-C** — DB mutate+restore in adjacent tool calls (no unrelated navigation between).

---

## 1. Goal

1:1 rebuild of `modules/lens-catalog-admin/` per the 671-line mockup. Dark theme throughout. 4-column main layout (brands / designs / variants / detail-pane). Preserves existing platform-admin Google OAuth flow (out-of-scope to refactor). Reuses Phase 0 shared components per mockup citation.

## 2. Background

The lens catalog admin is the platform-admin-only screen for managing the global lens catalog (brands → designs → variants). Pre-mockup implementation is 7 imperative files totaling 676 JS lines. The mockup defines a dark-themed 4-column workflow that the rebuild matches 1:1. The Google OAuth auth wrapper remains unchanged (separate domain).

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 3-5 |
| S3 | 4-column grid renders | DOM has 4 elements in the main grid with widths 220/220/240/1fr | yes |
| S4 | Dark theme applied | computed style of page header `background-color` = `rgb(30, 41, 59)` or matches mockup CSS palette | yes |
| S5 | Each JS file ≤ 300 lines (Iron Rule 12) | `wc -l modules/lens-catalog-admin/*.js \| awk '$1>300'` | empty |
| S6 | No DDL applied | `git diff {start}..HEAD -- supabase/migrations/` | empty |
| S7 | Platform-admin gate preserved | `inventory-shell-lens.js` lines 287-310 unchanged | yes |
| S8 | Google OAuth wrapper preserved (`catalog-auth.js` retained) | grep | file exists |
| S9 | Tier C: navigate to catalog-admin tab on demo as a platform-admin (or with the auth gate disabled in test) — 4 columns render with dark theme | Chrome MCP snapshot | yes |
| S10 | Tier C: pick a brand → designs populate; pick a design → variants populate; pick a variant → detail pane populates | per-column data loads | yes |
| S11 | Tier C: zero console errors during the brand → design → variant drill | Chrome MCP `list_console_messages` filter type=error | 0 (pre-existing GoTrueClient warns OK) |
| S12 | Iron Rule 31 (integrity gate) | every commit | exit 0 |
| S13 | Iron Rule 32 (destructive ops declared) | pre-commit | 0 violations (§4 declares None.) |
| S14 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |
| S15 | ≥ 3 screenshots | `ls screenshots/` | ≥ 3 .png |
| S16 | Module ROADMAP + CHANGELOG + SESSION_CONTEXT updated | grep | entries appended |
| S17 | Group A + B regression check | tabs load, no console errors | confirmed |

## 4. Destructive Operations

**None.** Zero DDL. Old JS files rewritten in place (same filenames preserved). Iron Rule 9 backup before rewrite. No file removals, no signature changes. The platform-admin Google OAuth flow is preserved verbatim (do NOT refactor).

**Forbidden:**
- Any change to `catalog-auth.js` beyond what's necessary to wire it to the new UI
- Any change to the platform-admin gate in `inventory-shell-lens.js` lines 287-310
- Any change to `lens_brand` / `lens_design` / `lens_variant` table reads (they're contracts)
- Any change to the sibling modules (contact-lens-catalog-admin, accessory-catalog-admin)
- Any DB write (this screen is read-only at the catalog-admin module level; writes belong to import or sync flows out-of-scope)

## 5. Autonomy Envelope

**Can do without asking:**
- Read mockup in full (671 lines) + current `modules/lens-catalog-admin/*` files
- Read SPEC 6 + 7 + 8 deliverables as reference for Phase 0 shared-component patterns
- Backup old files per Iron Rule 9 (> 5 files affected)
- Rewrite each JS file
- Update `inventory-shell-lens.js` manifest if file count changes (currently the manifest uses `moduleScript: 'modules/lens-catalog-admin/lens-catalog-admin.js'` — if file decomposition changes, update accordingly)
- Add new CSS file `css/lens-catalog-admin-page.css` (dark-themed page frame)
- 3-5 commits per §10
- Tier C smoke navigates the catalog-admin tab; reads only (no DB writes)

**MUST stop and report:**
- Mockup body reveals a NEW major dependency not in §0 (e.g., a custom dark-theme variant of a Phase 0 component) — escalate
- Platform-admin gate breaks in any modification
- Iron Rule 12 hard cap (350 lines) fires
- Any file outside §11 `files_owned_globs` shows changes

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- If mockup requires a new shared component not in Phase 0 → STOP (this SPEC consumes only existing shared components)
- If reading the mockup reveals it expects DB writes from this screen → STOP (catalog mutations are import/sync's job)
- If `catalog-auth.js` cannot remain unchanged (e.g., the new UI requires a different OAuth scope) → STOP

## 7. Out of Scope (explicit)

- Google OAuth refactor (preserve `catalog-auth.js`)
- Sibling modules (contact-lens / accessory catalog admin)
- Private catalog (SPEC 10)
- Designs toggle semantics (SPEC 12)
- Any DB migration
- Any new RPC
- Any change to lens_brand / lens_design / lens_variant table SCHEMAS

## 8. QA / Tier C Verification Plan

1. Start local servers if not running.
2. Chrome MCP navigate → `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=catalog-admin`.
3. If platform-admin gate hides the section: temporarily bypass via `sessionStorage.setItem('platformAdminBypass','1')` or equivalent (verify via inventory-shell-lens.js line 287-310 pattern); restore after Tier C.
4. Verify 4-column dark-themed grid renders.
5. Pick a brand → click brand row → designs column populates.
6. Pick a design → variants column populates.
7. Pick a variant → detail pane shows variant metadata.
8. Verify 0 console errors (pre-existing GoTrueClient OK).
9. Restore any bypass set in step 3.
10. Regression: navigate POs List + GR tabs; verify they still load.
11. Take screenshots: page overview (dark, 4 cols empty), brand-picked (designs populated), variant-picked (detail pane populated).

## 9. Expected Final State

### Repo
- `modules/lens-catalog-admin/` — 7-9 JS files + 1 partial, mockup-aligned
- NEW `css/lens-catalog-admin-page.css` (dark-themed page-frame, scoped to `[data-tab="catalog-admin"]`)
- `modules/inventory/inventory-shell-lens.js` — manifest updated if file set changes
- `inventory.html` — +1 CSS link to the new file
- `modules/Module 1 - Inventory Management/backups/M1_LENS_CATALOG_ADMIN_REBUILD_2026-05-18/` — Iron Rule 9 backup
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT + FINDINGS + ≥ 3 screenshots

### Docs
- Module ROADMAP — SPEC 9 marked ✅
- Module CHANGELOG — entry under "Group C"
- Module SESSION_CONTEXT — updated post-close

### DB
- 0 schema changes
- 0 persistent rows added (Tier C is read-only)

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_CATALOG_ADMIN_REBUILD SPEC` (Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(lens-catalog-admin): 1:1 mockup rebuild — dark theme + 4-column layout` | rewritten JS + new CSS + manifest + inventory.html + backup |
| 3 | (optional) `fix(lens-catalog-admin): {hotfix subject}` | mid-Tier-C hotfix only |
| 4 | `chore(spec): close M1_LENS_CATALOG_ADMIN_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + ROADMAP + CHANGELOG + SESSION_CONTEXT |

Expected total: 3-4 commits.

## 11. Pipeline Coordination

`files_owned_globs`:
```
modules/lens-catalog-admin/**
css/lens-catalog-admin-page.css
modules/inventory/inventory-shell-lens.js
inventory.html
modules/Module 1 - Inventory Management/backups/M1_LENS_CATALOG_ADMIN_REBUILD_2026-05-18/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_ADMIN_REBUILD/**
```

Branch: `develop`. No worktree. Path X sequential.

## 12. Rollback Plan

If Tier C reveals a fundamental design issue:
- Restore old files from backup folder
- Revert manifest + inventory.html + new CSS file
- Two commits: `revert: revert M1_LENS_CATALOG_ADMIN_REBUILD` + `chore(spec): reopen M1_LENS_CATALOG_ADMIN_REBUILD`

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean after closure
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] ≥ 3 Tier C screenshots
- [ ] Platform-admin gate preserved
- [ ] Module ROADMAP + CHANGELOG + SESSION_CONTEXT updated

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Pre-seal Step 1.6 (paths clean) + Step 1.7 (zero external consumers) verified. Dark-theme rebuild with Iron Rule 12 discipline applied._
