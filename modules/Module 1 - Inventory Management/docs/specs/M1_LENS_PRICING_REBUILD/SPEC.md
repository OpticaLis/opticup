---
spec_id: M1_LENS_PRICING_REBUILD
title: Lens Pricing screen — 1:1 mockup rebuild + F-5 sell-price resolver
author: opticup-strategic (Foreman)
authored: 2026-05-17 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/GROUP_A_SCREENS_4_5_BRIEF.md
phase: Lens UI Rebuild — Group A, SPEC 5 of 6 (LARGEST)
---

# SPEC — M1_LENS_PRICING_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — ALL PATHS VERIFIED 2026-05-17 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-pricing/lens-pricing-main.js` | ✅ | 60 lines |
| `modules/lens-pricing/lens-pricing-partial.html` | ✅ | 28 lines (skeleton) |
| `modules/lens-pricing/lens-pricing-bulk.js` | ✅ | 93 lines |
| `modules/lens-pricing/lens-pricing-filters.js` | ✅ | 130 lines |
| `modules/lens-pricing/lens-pricing-grid.js` | ✅ | 133 lines |
| `modules/lens-pricing/lens-pricing-inline-edit.js` | ✅ | 42 lines |
| `modules/inventory/inventory-shell-lens.js` | ✅ | tab perm `lens.pricing.manage` (line 57) |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` | ✅ | 1211 lines (target) |
| `modules/lens-inventory/lens-inventory-lot-pane.js` | ✅ | F-5 consumer — currently shows `מחיר מכירה = "—"` placeholder |
| `shared/js/chip-filter-row.js` | ✅ | SPEC 2 |
| `shared/js/stat-card-row.js` | ✅ | SPEC 2 |
| `shared/js/wizard-step-indicator.js` | ✅ | SPEC 2 (for bulk-update wizard if used) |
| `shared/js/lens-details-drawer.js` | ✅ | SPEC 2 |
| `shared/js/table-builder.js` + `shared/js/table-builder-extensions.js` | ✅ | SPEC 2 EXTENDED (correct path; NOT `data-table.js` per same Brief defect as SPEC 4) |
| `shared/css/{lens-details,table,chip-filter,stat-card}.css` + `tokens.css` | ✅ | SPEC 2 |
| ~~`shared/js/data-table.js`~~ | ❌ | **BRIEF DEFECT** (same as SPEC 4 §0). Resolved by citing `table-builder.js` + extensions. |

### Consumer-grep pre-flight (Step 1.7 — N/A; no "only N consumers" assertions in §5)

No consumer-grep mandate. SPEC 5 introduces a new resolver consumed by both lens-pricing + lens-inventory; consumer count is enumerated explicitly in §9, not asserted as "only N".

### DB pre-flight (live 2026-05-17 IDT)

**`lens_variant_notes` table state (SPEC 3 closed; pre-flight 2026-05-17):**
- `rowsecurity=TRUE` ✅
- 2 policies: `service_bypass` (service_role, USING true) + `tenant_isolation` (public, JWT-claim USING) — canonical Iron Rule 15 pattern ✅
- Table privileges: full CRUD granted to `anon` + `authenticated` (gated by tenant_isolation RLS via JWT) ✅
- **Foreman decision:** SPEC 5's notes CRUD uses **direct PostgREST writes** (`sb.from('lens_variant_notes').insert/update/delete()`) — no new RPCs needed. Iron Rule 7 "specialized" allowance applies (single-table CRUD with RLS enforcement). Defense-in-depth: every `.insert/.select/.update/.delete` includes `.eq('tenant_id', getTenantId())` per Iron Rule 22.

**Permission keys verified live:**
- `lens.pricing.manage` exists ×2 tenants (screen access) ✅
- `lens_pricing.edit` exists ×2 tenants (SPEC 3 seed — granted to ceo + manager) ✅
- `inventory.view_cost_price` exists ×2 tenants (SPEC 3 seed — gates cost column) ✅
- ~~`lens.pricing.view`~~ — does NOT exist (Brief implied a view-only key; same defect class as SPEC 4's `lens.designs.view`). **Foreman decision:** screen access gated by `lens.pricing.manage` (per `inventory-shell-lens.js:57`); edit-mode toggle gated by `lens_pricing.edit`. No view-only fallback needed. Logged in §13.

**`effective_price(p_offering_id, p_tenant_id, p_as_of_ts) RETURNS NUMERIC` RPC** (per `docs/GLOBAL_MAP.md`):
- ✅ Live. SECURITY DEFINER + JWT-tenant guard. Returns price after overlay resolution + VAT.
- F-5 resolver wraps this RPC. The new `shared/js/lens-price-resolver.js` is a thin JS helper, NOT a new RPC.

### Baselines

| Symbol | Source | Value (captured 2026-05-17 IDT) |
|---|---|---|
| `BASE_PARTIAL_LINES` | `lens-pricing-partial.html` | 28 |
| `BASE_MAIN_LINES` | `lens-pricing-main.js` | 60 |
| `BASE_BULK_LINES` | `lens-pricing-bulk.js` | 93 |
| `BASE_FILTERS_LINES` | `lens-pricing-filters.js` | 130 |
| `BASE_GRID_LINES` | `lens-pricing-grid.js` | 133 |
| `BASE_INLINE_EDIT_LINES` | `lens-pricing-inline-edit.js` | 42 |
| `BASE_MODULE_TOTAL_LINES` | sum of above | 486 |
| `BASE_MOCKUP_LINES` | mockup | 1211 |
| `BASE_LENS_VARIANT_NOTES_ROWS_DEMO` | live DB | 0 (executor verifies; if >0, smoke needs care) |

### Pricing CRUD plan (Foreman decision: direct PostgREST, no new RPCs)

Per pre-flight RLS findings:
- **READ:** `sb.from('lens_variant_notes').select('id,variant_id,body,author_id,created_at,updated_at').eq('variant_id', vid).eq('tenant_id', tid).order('created_at', { ascending: false })`
- **CREATE:** `sb.from('lens_variant_notes').insert({ variant_id, tenant_id, author_id, body })` — tenant_id + author_id set client-side (RLS enforces server-side)
- **UPDATE:** `sb.from('lens_variant_notes').update({ body, updated_at: now }).eq('id', id).eq('tenant_id', tid)` — only by author_id == current employee (UI gates; RLS additionally enforces tenant)
- **DELETE:** `sb.from('lens_variant_notes').delete().eq('id', id).eq('tenant_id', tid)` — soft delete pattern NOT applicable (notes table has no `is_deleted` column per SPEC 3 design; hard-delete is acceptable for note text per Iron Rule 3 exemption documented in SPEC 3)

UI permission gating: write actions visible only when `hasPermission('lens_pricing.edit')` returns true. RLS is the final gate; UI is the UX.

### Sell-price resolver scope decision (F-5 resolution)

The Brief asks: extract `shared/js/lens-price-resolver.js` to Module 1.5 (so M11 / M9 consume too) OR keep it inside Module 1 (`js/lens-price-resolver.js`).

**Foreman decision: extract to `shared/js/lens-price-resolver.js`** — generic price resolution is module-agnostic infrastructure. Consumers in this SPEC: lens-pricing screen (table-wide), lens-inventory lot-pane (per-variant). Future consumers (likely): supplier portal (M11), lab/kds (M9). Aligns with Module 1.5's ownership of cross-module helpers.

The resolver is a thin wrapper:
- `LensPriceResolver.resolve(offeringId, tenantId, asOfTs)` → wraps `sb.rpc('effective_price', {...})` → returns Numeric price (VAT-inclusive per RPC contract)
- Batch variant: `LensPriceResolver.resolveMany(offeringIds, tenantId, asOfTs)` → N parallel RPC calls (or one RPC call returning array if Foreman + executor decide a `effective_price_batch` overload is warranted — that would be DDL, out of THIS SPEC's scope; flag as finding if needed)

**Scope decision: ship the JS wrapper only.** No new RPCs (Iron Rule 21 — extend existing). If batch performance shows N+1 issue during Tier C, log as MEDIUM finding for follow-up `effective_price_batch` RPC SPEC.

### Lessons applied from prior 3 FOREMAN_REVIEWs in this module

- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FOREMAN_REVIEW.md`** (F-1) — FIELD_MAP lives in `js/shared-field-map.js`. If new DB fields → that file. (SPEC 5 doesn't add DB fields → N/A.)
- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FOREMAN_REVIEW.md`** (partial line-count) — shared components supply their own DOM. Drawer mount points are tiny. Applied to §3 #3 line-count target.
- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FOREMAN_REVIEW.md`** (F-2 RPC param gap) — RESOLVED by `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17`. RPC consolidations are an investment; the resolver here is small enough not to need an overload yet.
- **From `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/FOREMAN_REVIEW.md`** (A-1 path-check + A-2 consumer-grep) — both ran for this SPEC. `data-table.js` defect caught + resolved.

### Scope warning — split possibility

This is the largest SPEC of the 6. Mockup is 1211 lines; touches 6 module files; introduces `shared/js/lens-price-resolver.js` (new); requires lens-inventory regression check; demands 2 distinct view modes (edit/readonly) with permission-driven defaults. Estimated 6–7h.

**Foreman pre-decision: do NOT pre-split this SPEC.** Reasoning:
- Inline-split during execution preserves contract integrity; pre-split fragments the F-5 consumer integration (which spans lens-pricing AND lens-inventory).
- If during execution the partial exceeds ~600 lines OR any single JS file approaches 350-line cap, the executor proposes a split via FINDINGS and Foreman approves (P-AR-16 + Iron Rule 12 pressure).
- The pre-existing 6 module files are already split (main + bulk + filters + grid + inline-edit + partial) — that's the structural split. Growth pressure on each file is bounded.

If execution hits >7h wall-clock with no end in sight, executor halts at clean commit boundary, Foreman re-authors as 5a + 5b. Not pre-decided here.

---

## 1. Goal

Rebuild the `modules/lens-pricing/` screen to 1:1 mockup fidelity per Pattern P-AR-16. Apply Round 1+2 mockup updates per Brief decision #12 (dual view modes — edit vs read-only). Wire Lens Details drawer with logs + notes tabs (notes CRUD on `lens_variant_notes` via direct PostgREST). Wire `inventory.view_cost_price`-gated cost column. **Resolve F-5** from SPEC 4a — extract `shared/js/lens-price-resolver.js` that wraps `effective_price` RPC; consume in both lens-pricing screen AND lens-inventory lot-pane (replaces `מחיר מכירה = "—"` placeholder).

---

## 2. Background

- Foundation Phase complete; F-5 explicitly DEFERRED to this SPEC per `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FINDINGS.md` F-5 + `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/SPEC.md §2`.
- Mockup audit gave current implementation ~6% fidelity match (skeleton partial + 5 thin JS files).
- Brief decision #12: dual view modes (edit vs read-only). Edit mode requires `lens_pricing.edit`; read-only is default for workers. Toggle pill switches between modes (admin can preview read-only).
- Brief decision #18: `lens_variant_notes` table (SPEC 3 closed) backs the Lens Details drawer's "הערות" tab.

---

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state | `git status` | clean post-push |
| S2 | Commits produced | `git log {start}..HEAD --oneline | wc -l` | 5–8 (author + 3–6 execution + close) |
| S3 | `lens-pricing-partial.html` line count | `wc -l` | 350–600 (mockup-fidelity rebuild; mockup is 1211 but shared components supply most DOM) |
| S4 | Every modified JS file under 350 lines (Iron Rule 12) | `wc -l modules/lens-pricing/*.js` | ≤350 each (split if pressure) |
| S5 | 4 top-tabs render (פעילים / ממתינים / מבצעים / היסטוריה) | DOM check: `.top-tab` count | 4 |
| S6 | View-mode toggle present | DOM check: `.view-mode-toggle button[data-view-mode]` count | 2 (edit + readonly) |
| S7 | View-mode default state driven by permission | Chrome MCP: load with `lens_pricing.edit` user → default `edit`; load without → default `readonly` | permission-driven |
| S8 | Lens Details drawer mount point present | DOM: `#lensDetailsDrawer` element exists | 1 |
| S9 | Lens Details drawer opens on row "פרטים נוספים" click | Chrome MCP click → `.lens-details-drawer.active` | open |
| S10 | Drawer has 2 tabs (לוגים / הערות) | DOM check: `.ldd-tab` count | 2 |
| S11 | Notes tab CRUD works in edit mode | Chrome MCP: with `lens_pricing.edit` user → click add note → write → save → row appears; click edit → modify → save; click delete → row gone | full CRUD on lens_variant_notes |
| S12 | Notes tab read-only in view mode | Chrome MCP: without `lens_pricing.edit` → notes visible but no Add/Edit/Delete buttons | read-only |
| S13 | Cost column gated by `inventory.view_cost_price` | DOM: `<th class="col-permission-gated" data-permission="inventory.view_cost_price">` + matching `<td>`s; user without key → cells hidden by PermissionUI | gated |
| S14 | `shared/js/lens-price-resolver.js` exists + exposes `LensPriceResolver.resolve` + `.resolveMany` | `ls shared/js/lens-price-resolver.js`; grep for `window.LensPriceResolver` | yes |
| S15 | **F-5 resolved on lens-inventory:** `מחיר מכירה` column in lots-table shows actual price (not `—`) | Chrome MCP navigate to inventory tab → select a variant with offerings → lots-table shows prices | resolved |
| S16 | All 5 shared components consumed (Iron Rule 21) | grep for `ChipFilterRow.init`, `StatCardRow.init`, `TableBuilder.create`, `LensDetailsDrawer.init`, `WizardStepIndicator.init` (latter optional if bulk uses it) | ≥4 (drawer + table + chip + stat-card mandatory; wizard if bulk needs) |
| S17 | Iron Rule 7 — RPC + direct sb.from('lens_variant_notes') CRUD with tenant_id defense-in-depth | grep on lens-pricing JS for `.eq('tenant_id', getTenantId())` on every `lens_variant_notes` op | ≥4 (all CRUD ops scoped) |
| S18 | Iron Rule 22 — every read AND write includes tenant_id filter | code review | satisfied |
| S19 | Iron Rule 31 (integrity gate) | `npm run verify:integrity` | exit 0 or 2 |
| S20 | Pre-commit hooks per commit | committed output | 0 violations, warnings only |
| S21 | RTL + mockup palette throughout | Chrome MCP screenshot side-by-side vs mockup | match |
| S22 | No console errors on page load (edit + readonly modes both) | Chrome MCP `list_console_messages` | 0 errors per mode |
| S23 | No regression on lens-inventory (drawer + price columns + permissions still work; sell-price column now resolved) | Chrome MCP cross-tab test | scope-clean + F-5 closed |
| S24 | Tier C VFV — ≥4 screenshots in SPEC folder `screenshots/` (edit mode, readonly mode, drawer-logs, drawer-notes; bonus: inventory F-5 resolved view) | `ls screenshots/` | ≥4 |
| S25 | EXECUTION_REPORT + FINDINGS written | files exist in SPEC folder | yes |

---

## 4. Destructive Operations

`None.`

This SPEC performs only additive + restructuring edits:
- Rewrite `lens-pricing-partial.html` (skeleton → mockup) — content replacement, file remains
- Rewrite + extend `lens-pricing-{main,bulk,filters,grid,inline-edit}.js` — content replacement, files remain
- Create `shared/js/lens-price-resolver.js` (NEW) — additive
- Modify `modules/lens-inventory/lens-inventory-lot-pane.js` `renderLots()` to consume the resolver (replaces `sellPrice = '—'` placeholder) — additive
- Modify `inventory.html` to load the new resolver script + `shared/css/lens-details.css` if not already loaded
- Optionally split a lens-pricing JS file if it exceeds 350 lines (file split is structural, not destructive)

PostgREST writes on `lens_variant_notes` (INSERT/UPDATE/DELETE) are DML, not destructive ops per Iron Rule 32 definition. RLS-tenant-scoped + author-scoped. Smoke-test rows hard-deleted by the smoke (notes table has no `is_deleted` flag per SPEC 3).

**Forbidden:**
- Any DDL (no new tables, no RPC overloads, no policy changes)
- Any change to `lens_variant_notes` schema
- Any change to other lens screens (designs, inventory beyond F-5 wiring, PO, GR, catalog-admin)
- Any change to `shared/js/{chip-filter-row,stat-card-row,wizard-step-indicator,lens-details-drawer,table-builder,table-builder-extensions,group-header-row,side-detail-panel}.js` (consume only — Iron Rule 21)
- Any Prizma data write (demo only)
- `git push --force`, `git reset --hard`, `git rebase` on shared branches
- Any change outside `modules/lens-pricing/`, `modules/lens-inventory/lens-inventory-lot-pane.js`, `shared/js/lens-price-resolver.js` (new), `inventory.html`, `modules/Module 1 - Inventory Management/docs/`

---

## 5. Autonomy Envelope

**Can do without asking:**
- Read all referenced files + mockup + Brief + SPEC 3/4a/4.5 retrospectives
- Read all SPEC 5-relevant tables: `lens_brand`, `lens_design`, `lens_variant`, `supplier_catalog_offering`, `pricing_overlay`, `lens_variant_notes`, `permissions`, `tenants`, `employees`, `tenant_active_offerings` (Level 1 SQL)
- Edit `modules/lens-pricing/*` files (full rewrite + new files if needed)
- Create `shared/js/lens-price-resolver.js`
- Modify `modules/lens-inventory/lens-inventory-lot-pane.js` to consume the resolver (the SPEC's only cross-module write)
- Edit `inventory.html` to add resolver + drawer CSS/JS loads
- Run `node scripts/verify.mjs --staged` between commits
- Insert/Update/Delete `lens_variant_notes` rows during Tier C smoke (tenant-scoped + cleanup after)
- 5–8 commits per §10
- Tier C VFV via Chrome MCP

**MUST stop and report:**
- Iron Rule 12 — if a lens-pricing JS file approaches 350 lines after the natural growth and no clean split is available → STOP, propose split structure to Foreman before continuing
- `LensDetailsDrawer.init()` API doesn't support 2-tab content + permission-gated actions → propose API extension in FINDINGS (do NOT modify shared component)
- N+1 query problem on lens-pricing table sell-price column (one RPC per row × hundreds of rows) → flag MEDIUM finding for `effective_price_batch` follow-up SPEC; ship per-row for this SPEC (or batch via `Promise.all` chunks if pragmatic)
- `lens_variant_notes` RLS denies expected writes during Tier C → STOP, verify JWT-tenant claim + RLS policy match
- F-5 lens-inventory regression: lots-table breaks after resolver wiring → STOP, do NOT close SPEC

---

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- View-mode default state doesn't switch based on `hasPermission('lens_pricing.edit')` → STOP, debug perm gate
- Edit-mode write action visible to user WITHOUT `lens_pricing.edit` (RLS would block, but UX leakage is bad) → STOP, fix UI gate
- Cost column visible to user WITHOUT `inventory.view_cost_price` after page load → STOP, verify PermissionUI scan ran on the rendered table (per SPEC 4a lesson)
- Drawer "הערות" tab CRUD shows other tenants' notes → STOP, **CRITICAL** (RLS leak)
- Resolver returns wrong price (off by VAT, or stale-overlay) → STOP, verify `effective_price` RPC params
- `effective_price` RPC raises 42501 (JWT tenant_id mismatch) → STOP, verify tenant_id passed to wrapper

---

## 7. Out of Scope (explicit)

- Any change to `lens_variant_notes` schema (SPEC 3 closed)
- Any change to `effective_price` RPC or any other RPC (Iron Rule 21 — extend existing)
- Any change to other lens screens beyond the F-5 wiring in `lens-inventory-lot-pane.js`
- `effective_price_batch` RPC (out of scope; log MEDIUM finding if per-row pricing shows perf issues)
- Loyalty / campaign / promotion price overrides (M13 territory, not Module 1)
- Currency conversion (resolver returns in tenant base currency; FX is M5+ territory)
- Pricing approval workflow beyond rendering the "ממתינים לאישור" tab (full approval flow is a future SPEC; this SPEC ships the tab UI + count badge but approval action stubs out to Toast or links to a placeholder)

---

## 8. QA / Verification Plan

1. After Commit 1 (partial + main rewrite): page loads in both modes (with + without `lens_pricing.edit`); no console errors; tab nav renders.
2. After Commit 2 (top-tabs + view-mode toggle): clicks switch tab content; toggle flips mode; default state matches permission.
3. After Commit 3 (table + cost-permission gating): table renders; user without `inventory.view_cost_price` doesn't see cost column.
4. After Commit 4 (Lens Details drawer + logs + notes CRUD): row click opens drawer; tabs switch; notes CRUD persists to `lens_variant_notes`; smoke-test note row visible across reload.
5. After Commit 5 (sell-price resolver + lens-inventory F-5 wiring):
   - `shared/js/lens-price-resolver.js` exists
   - Lens-pricing table sell-price column shows live prices
   - Navigate to lens-inventory tab → select variant → lots-table `מחיר מכירה` column shows live price (not `—`)
   - F-5 RESOLVED
6. After Commit 6 (optional split if growth pressure): file-size discipline preserved.
7. Tier C VFV mandatory:
   - Chrome MCP navigate to `localhost:3000/inventory.html?t=demo&cat=lenses&tab=pricing`
   - Side-by-side screenshot vs `LENS_PRICING_MOCKUP.html`
   - Click view-mode toggle → admin can preview readonly
   - Click row → drawer opens → switch tabs → write note → reload → note persists
   - Cross-tab: navigate to inventory tab → variant lots-table sell-prices resolved (F-5 verification)
   - 0 console errors throughout (both modes)
   - ≥4 screenshots in `screenshots/`
   - Soft-delete or hard-delete smoke notes (tenant-scoped + author-scoped)

---

## 9. Expected Final State

### Modified files

- `modules/lens-pricing/lens-pricing-partial.html` (28 → 350–600 lines)
- `modules/lens-pricing/lens-pricing-main.js` (60 → ~250–320 lines; bootstrap wires all shared components + view-mode toggle + tab nav)
- `modules/lens-pricing/lens-pricing-filters.js` (130 → ≤350 lines; chip-filter-row consumer + facet logic)
- `modules/lens-pricing/lens-pricing-grid.js` (133 → ≤350 lines; TableBuilder consumer + sell-price column wiring)
- `modules/lens-pricing/lens-pricing-bulk.js` (93 → ≤350 lines; wizard if needed)
- `modules/lens-pricing/lens-pricing-inline-edit.js` (42 → ≤350 lines; preserved or extended)
- `modules/lens-inventory/lens-inventory-lot-pane.js` (171 → ~190 lines; `renderLots()` updates to consume `LensPriceResolver.resolveMany`)
- `inventory.html` — add 2 script loads (resolver + drawer if missing) + 1 CSS load (lens-details if missing)

### New files

- `shared/js/lens-price-resolver.js` (~60–100 lines) — thin wrapper for `effective_price` RPC + batch variant
- Optionally: `modules/lens-pricing/lens-pricing-notes.js` and/or `modules/lens-pricing/lens-pricing-drawer.js` if extraction is cleaner than inline (Foreman delegates extraction decision to executor)

### NOT modified

- Any DB schema, any RPC, any seed data
- Any shared component (Iron Rule 21 — consume only)
- Any other lens screen module beyond the F-5 wiring in lot-pane

### Docs updated (same commit cluster)

- Module 1 SESSION_CONTEXT — entry for SPEC 5 closure
- Module 1 CHANGELOG — entry under "Lens UI Rebuild Phase 0 — Group A"
- MODULE_MAP — register `LensPriceResolver.*` + any extracted files
- `docs/GLOBAL_MAP.md` — register `LensPriceResolver` as a shared cross-module helper (M1 + future consumers M9/M11)

---

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_PRICING_REBUILD SPEC` (this commit, by Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(lens-pricing): partial + main bootstrap to mockup structure + view-mode toggle` | partial.html + main.js + (if needed) inventory.html shared-component loads |
| 3 | `feat(lens-pricing): 4 top-tabs + bulk toolbar + approval card per mockup` | partial.html + main.js + bulk.js |
| 4 | `feat(lens-pricing): table with cost-permission gating + chip-filter row` | grid.js + filters.js + (if needed) main.js |
| 5 | `feat(lens-pricing): Lens Details drawer with logs + notes CRUD on lens_variant_notes` | partial.html + main.js + (new) notes.js + drawer.js OR inline |
| 6 | `feat(shared): lens-price-resolver wraps effective_price RPC + wire lens-inventory lots-table (F-5)` | NEW `shared/js/lens-price-resolver.js` + `modules/lens-inventory/lens-inventory-lot-pane.js` + `inventory.html` script load |
| 7 | `feat(lens-pricing): wire sell-price column on lens-pricing table via resolver` | grid.js OR main.js |
| 8 | `chore(spec): close M1_LENS_PRICING_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG + MODULE_MAP + GLOBAL_MAP |

Total: 5–8 commits expected. Commits 6+7 may merge if executor finds the wiring naturally combines.

---

## 11. Pipeline Coordination

This SPEC's `files_owned_globs` for `pipeline-coordination.mjs claim`:

```
modules/lens-pricing/**
modules/lens-inventory/lens-inventory-lot-pane.js
shared/js/lens-price-resolver.js
inventory.html
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRICING_REBUILD/**
docs/GLOBAL_MAP.md
```

Branch: `develop` (per Daniel's pending Path X / Path Y decision — see parent Brief).

**Overlap with SPEC 4:** both SPECs claim `inventory.html` (for shared-component script-loads) — Path Y (parallel) requires the coordination tool to recognize that the two SPECs touch DIFFERENT line ranges (SPEC 4 adds chip+stat-card+side-panel+table-builder+extensions loads; SPEC 5 adds drawer + resolver + tokens.css if not already loaded). If running sequential (Path X), no overlap. **Path Y requires Foreman to author `M1_5_PIPELINE_COORDINATION_FILE_GLOB_AWARENESS` extension first.**

**Overlap with `modules/lens-inventory/`:** SPEC 5 writes to ONE file (`lens-inventory-lot-pane.js`) — must NOT conflict with any active lens-inventory rebuild (Foundation Phase closed it; no active claim).

---

## 12. Rollback Plan

- Pre-commit tag `pre-m1-lens-pricing-rebuild-2026-05-17` placed by executor at Commit 1.
- `git reset --hard <tag>` restores all module files + new resolver + inventory.html.
- DB rollback: smoke-test `lens_variant_notes` rows hard-deleted at Tier C close (no DDL to revert).

---

## 13. Lessons Already Incorporated + Brief defects logged for Architect

**Lessons applied:**
- Direct PostgREST CRUD for `lens_variant_notes` per pre-flight RLS confirmation (no new RPCs — Iron Rule 21)
- `effective_price` RPC reused for resolver (no new RPC — Iron Rule 21)
- `shared/js/lens-price-resolver.js` extracted to Module 1.5 ownership (cross-module helper future-proofs M9/M11 consumers)
- Path-check (Step 1.6) caught Brief's recurring `data-table.js` phantom path (same defect as SPEC 4)
- Permission key probe caught Brief's `lens.pricing.view` phantom key (same defect class as SPEC 4)
- Partial line-count estimate adjusted for shared-component DOM ownership (Foundation Phase F-1 lesson applied)
- Pre-flight RLS+privileges check confirmed direct PostgREST is safe (Iron Rule 7's "specialized case" allowance)

**Brief defects logged for Architect harvest:**

1. **`shared/js/data-table.js` is a phantom path** — same as SPEC 4 §13 (defect #1). Architect should fix the Group A Brief AND check whether subsequent Group B/C Briefs inherit the same stale reference.

2. **`lens.pricing.view` phantom key (same class as `lens.designs.view` in SPEC 4)** — Brief implied a view-only key separate from `lens.pricing.manage` and `lens_pricing.edit`. Live DB has only the 2 keys SPEC 3 + Phase 1B seeded. Foreman pattern: screen access = `lens.pricing.manage`; edit-mode = `lens_pricing.edit`; no view-only fallback. **Recommend Architect document this pattern in CLAUDE.md or the M1 ROADMAP** so future SPECs don't keep inventing view-only keys that don't exist.

3. **Brief left "sell-price resolver consumer pattern" + "lens_variant_notes CRUD vs RPC" decisions to the Foreman.** Both correctly decided here in §0 with rationale + DB evidence. Architect should consider whether future Briefs should pre-decide these patterns or continue to leave them to the Foreman (the latter is fine — Foreman has the DB visibility).

4. **Step 1.6 + 1.7 fired correctly on this Brief.** Both defects caught at SPEC-author time before sealing. The 2-strike harvest is working — same defects across 2 sibling SPECs in one Brief.

---

## 14. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT §2
- [ ] Integrity gate exit 0 or 2 at every commit
- [ ] `git status --short` returns scope-clean after closure commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written in SPEC folder
- [ ] ≥4 Tier C screenshots in `screenshots/` (edit, readonly, drawer-logs, drawer-notes; bonus: inventory F-5 view)
- [ ] **F-5 confirmed RESOLVED** on lens-inventory lots-table (cross-tab Tier C check; smoke note: `מחיר מכירה` displays actual numbers for a variant with offerings, no `—` placeholder for that variant)
- [ ] `LensPriceResolver` registered in `docs/GLOBAL_MAP.md` as shared cross-module helper
- [ ] All lens_variant_notes smoke rows cleaned up (hard-delete acceptable; soft-delete N/A per SPEC 3 design)
- [ ] No regression on lens-inventory drawer, price columns, or permission gating

---

**END SPEC**

_Authored 2026-05-17 IDT by opticup-strategic (Foreman). Sealed after Step 1.6 (path-check) + Step 1.7 (consumer-grep N/A) + DB pre-flight passed with 2 Brief defects caught + 2 Foreman decisions documented (PostgREST CRUD for notes; resolver extracted to shared/)._
