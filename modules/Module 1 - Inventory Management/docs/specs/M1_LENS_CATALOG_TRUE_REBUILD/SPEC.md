---
spec_id: M1_LENS_CATALOG_TRUE_REBUILD
title: TRUE 1:1 mockup-fidelity rebuild for Catalog Admin (dark) + Private Catalog (light) — corrects SPEC 9 + SPEC 10 polish-by-validation failures
author: opticup-architect (Cowork-Architect, post-Daniel-review of SPEC 9 + 10 outputs)
authored: 2026-05-18 evening
revised: 2026-05-18 late evening — ARCHITECT_DECISION post-pre-flight escalation: Suppliers column confirmed IN scope after empirical Excel review; OAuth bypass spec'd as localhost-only dev-mode flag; S6 drill verification deferred until paired SPEC B (M1_LENS_CATALOG_SEED_FROM_EXCEL) seeds data
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md
paired_with: M1_LENS_CATALOG_SEED_FROM_EXCEL (Path X sequential, executes AFTER this SPEC closes Commits 1-4, drill VFV gates on SPEC B closure)
supersedes_partially: M1_LENS_CATALOG_ADMIN_REBUILD (d2a2246), M1_LENS_PRIVATE_CATALOG_REBUILD (96306a0)
---

# SPEC — M1 Lens Catalog TRUE Rebuild

## 1. Goal

Daniel reviewed the live output of SPECs 9 + 10 (Catalog Admin + Private Catalog) on demo and found:
1. **"הקטלוג שלי" (private catalog)** — **identical to pre-rebuild state**. SPEC 10's "polish-by-validation" decision violated Pattern P-AR-16 (Mockup Fidelity Mandate). The screen shows same 4-column layout from before today's work — no light-theme refresh per the mockup, no mockup-aligned structure.
2. **"קטלוג מערכת" (admin catalog)** — partially rebuilt with dark theme + 4-col layout, **BUT** intentionally skipped the Suppliers column from the mockup (called "scope creep" in SPEC 9 §5 deviation), only captured 1 of 3 mandated screenshots, and drill-flow (S10) was deferred without empirical verification because the OAuth gate blocked Tier C.

This SPEC undoes both half-measures and ships a TRUE 1:1 rebuild for both screens per the mockup at `architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (671 lines).

## 2. Background — what SPEC 9 + 10 actually shipped vs what was promised

### 2.1 SPEC 10 (Private Catalog) — "polish-by-validation" decision

**What promised** (per parent Brief decision #5 + Round-1 Q&A): "1:1 visual clone of admin catalog with light theme + scope=tenant. All tools identical." Path B (single shared component with theme prop + scope prop).

**What shipped:**
- `EXECUTION_REPORT.md` line: "**Decision: no code changes ship in this SPEC.**"
- 0 file changes
- Closure status 🟢 based on "existing `shared/js/catalog-private-admin.js` already implements what SPEC 10 §3 requires"
- Live state on demo (Daniel verified 2026-05-18 evening): screen looks **identical to pre-2026-05-18 state**. No light-theme palette refresh, no mockup-aligned structure.

**Defect class:** Executor + Foreman misread P-AR-16. P-AR-16 says mockup-fidelity is the bar; "existing functional implementation" is not the bar. Pre-existing `catalog-private-admin.js` (339 lines) was built to skeleton-structure prose long before the mockups were ratified 2026-05-14 — it cannot have been mockup-aligned at SPEC 10's start.

### 2.2 SPEC 9 (Catalog Admin) — partial rebuild with skipped column

**What promised** (per parent Brief decision #5 + mockup): full mockup structure — Suppliers column + Brands column + Designs column + Variants/Detail column, dark theme, all interactions per mockup.

**What shipped (commit `eda7f80` + closure `d2a2246`):**
- ✅ Dark theme CSS (`css/lens-catalog-admin-page.css`, 325 lines)
- ✅ 4-column grid layout structure
- ❌ Suppliers column **omitted** ("strategic decision: keep existing Brands→Designs→Variants→Detail per SPEC §3 S10")
- ❌ Only 1 screenshot captured (S15 required ≥ 3)
- ❌ S10 (drill flow) deferred without verification — OAuth gate blocked Tier C, executor bypassed gate visually but did not verify the brand→designs→variants→detail data load works

**Defect class:** Executor scoped down the mockup at SPEC time without escalating to Foreman/Daniel. SPEC §3 S10 said "Brand → designs → variants drill" but the mockup has 4 columns starting with Suppliers; the executor read the SPEC text instead of cross-checking the mockup.

### 2.3 Pattern across both SPECs

Same defect class:
- **Executor optimized for "ship the SPEC"** over "ship mockup-fidelity"
- **Foreman did not write FOREMAN_REVIEW** for either SPEC at the time
- **Tier C VFV was self-certified by executor** without side-by-side mockup comparison
- **Daniel's eventual visual review** caught both — but only after declaration of "M1 LENS 100% COMPLETE"

## 3. Success Criteria (measurable — and stricter than SPEC 9 / 10)

**Gate timing note (added 2026-05-18 late evening):** S6, S10, S11, S12 require live data populated in `lens_brand`, `lens_design`, `lens_variant`, `supplier_brand_distribution`, and `supplier_catalog_offering` for the demo tenant. Pre-flight (2026-05-18) confirmed these tables are empty on demo for the supplier→brand drill. Paired SPEC `M1_LENS_CATALOG_SEED_FROM_EXCEL` seeds this data from `tests/קטלוג-עדשות-18.5.26.xls` (Daniel's authoritative 9-supplier, 2904-row Prizma catalog). This SPEC's Commits 1-4 ship the code (Suppliers column + private rebuild + OAuth dev-mode bypass). Commit 5 (closure) gates on SPEC B completing first. Tier C VFV for S6/S10/S11/S12 runs AFTER SPEC B closes; S3/S4/S5/S7/S8/S9/S14/S15 verify after Commits 1-4 with empty data (DOM structure / theme / scope filter is data-independent).

| # | Criterion | Verification | Expected | Gate |
|---|---|---|---|---|
| S1 | Branch clean | `git status --porcelain` | empty | post-close |
| S2 | Commits in [4, 8] | `git log origin/develop..HEAD --oneline \| wc -l` | 4-8 | post-close |
| S3 | Admin catalog screen has 4 columns per mockup: Suppliers → Brands → Series → Detail+Variants | Chrome MCP DOM inspection: count of top-level columns in `.lens-cat-admin-grid` | 4, in this order | after Commit 1 |
| S4 | Suppliers column populates from `suppliers` table (NOT pre-existing Brands-first layout) | First column header text contains 'ספקים' or 'Supplier' | matches mockup | after Commit 1 |
| S5 | Dark theme applied across all 4 columns | `getComputedStyle(<col1>).backgroundColor` matches mockup slate palette | rgb(15, 23, 42) or rgb(30, 41, 59) family | after Commit 1 |
| S6 | Drill flow works END-TO-END: click supplier → brands populate → click brand → designs → click design → variants/detail | Tier C scripted click sequence with DOM assertion at each step | all 4 levels populate with real data | AFTER SPEC B closes (paired) |
| S7 | Private catalog screen rebuilt to MATCH admin layout (1:1) with light-theme palette + scope=tenant | Side-by-side Chrome MCP screenshot of admin (dark) + private (light) showing identical structural skeleton | structures match; only palettes differ | after Commit 3 |
| S8 | Private catalog respects `scope=tenant` (reads filtered by `owner_tenant_id = current tenant`) | Network tab capture of Supabase query during data load | query includes `owner_tenant_id eq <tenant_id>` | after Commit 3 |
| S9 | Permission gating: `lens.catalog.private.manage` for write actions on private catalog; admin gate (platform-admin) for admin catalog | Code grep for `hasPermission('lens.catalog.private.manage')` in private catalog JS | present | after Commit 3 |
| S10 | Tier C VFV captures ≥ 6 screenshots (3 admin + 3 private) at each drill level | `ls modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_TRUE_REBUILD/screenshots/*.png \| wc -l` | ≥ 6 | AFTER SPEC B closes |
| S11 | Mockup fidelity side-by-side check: Chrome MCP renders mockup HTML + live screen side-by-side; classify each visible element as INTENTIONAL / DRIFT; CRITICAL/HIGH drift = SPEC CANNOT close 🟢 | manual evaluation table in EXECUTION_REPORT.md §"Mockup Fidelity Check" with classification per element | 0 CRITICAL, 0 HIGH | AFTER SPEC B closes |
| S12 | Console errors during full drill on both screens | Chrome MCP console log capture | 0 errors | AFTER SPEC B closes |
| S13 | Pre-existing console error on Pricing screen (`TableBuilder: container #lens-ad-designs-table not found`) NOT caused by this SPEC — sub-scope check | Pricing screen smoke before + after this SPEC's changes | error unchanged (it's pre-existing, separate SPEC tracks fix) | after Commit 4 |
| S14 | Iron Rule 31 + 32 gates green at every commit | husky output exit 0 | 0 | every commit |
| S15 | Pushed to origin/develop | `git rev-parse HEAD == origin/develop` | true | post-close |
| S16 | EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW + ≥ 6 screenshots written to SPEC folder | folder listing | 4 docs + 6+ screenshots | post-close |
| S17 | Module 1 SESSION_CONTEXT + CHANGELOG + MODULE_MAP updated | git log of those files | each touched in closure commit | post-close |
| **S18** | **OAuth dev-mode bypass added to `catalog-auth.js`: when `location.hostname === 'localhost'` AND `URLSearchParams.get('dev') === '1'`, gate auto-passes + a mock platform-admin role is returned. Production hostnames (`app.opticalis.co.il`, GitHub Pages) NEVER trigger the bypass — `hostname === 'localhost'` is the only path.** | Grep `catalog-auth.js` for the conditional + manual test: load `http://localhost:3000/inventory.html?cat=lenses&dev=1` shows the screen WITHOUT Google OAuth round-trip; load `?cat=lenses` (no `dev=1`) still hits gate | dev=1 bypass works; default behavior unchanged | after Commit 1 |
| **S19** | **OAuth dev-mode bypass behaves SAFELY: production paths return false on the dev-mode check; bypass is logged to console with a warning so it can't sneak through silently.** | Manual: open `https://app.opticalis.co.il/inventory.html?cat=lenses&dev=1` (or simulate via setting `window.location` mocks); expect no bypass + Google OAuth flow runs as normal | bypass only on localhost | after Commit 1 |

## 4. Destructive Operations

(Iron Rule 32 enforcement.)

1. **Rewrite `modules/lens-catalog-admin/lens-catalog-admin-partial.html`** to add Suppliers as the first column. Reversible via git revert.
2. **Edit `modules/lens-catalog-admin/*.js`** (up to 7 files) + **NEW `modules/lens-catalog-admin/catalog-suppliers-col.js`** (~150 LOC, Iron Rule 12 safe) — add Suppliers column data load + click handler + brand-filter-by-supplier logic. Reversible.
3. **Rewrite or fully refactor `shared/js/catalog-private-admin.js`** — restructure to match new admin layout 1:1 with theme + scope props. Reversible.
4. **NEW `shared/css/catalog-private-admin.css`** OR extend existing — light-theme palette tokens matching mockup. Reversible.
5. **Edit `inventory.html`** — possibly add CSS link if new CSS file created. Reversible.
6. **NEW: Edit `modules/lens-catalog-admin/catalog-auth.js`** to add localhost-only dev-mode bypass (gated by `location.hostname === 'localhost' && URLSearchParams.get('dev') === '1'`). ~15-20 lines, reversible. Per architect decision (2026-05-18 late evening): the SPEC's earlier §4 Forbidden listed "no change to OAuth gate logic"; this item now AUTHORIZED specifically for the localhost dev-mode escape hatch. Production hostnames NEVER trigger the bypass — `hostname === 'localhost'` is the only path. A console.warn fires every time the bypass is used so it cannot pass silently. See §3 S18 + S19 for verification.

7. **NEW (architect amend 2026-05-18 late evening): Delete `modules/lens-catalog-admin/catalog-variants-col.js`** (orphan after Commit 1 — `wireVariantsCol` no longer imported by the orchestrator since variants moved into the inline detail-pane table per mockup §COL 4). Rule 21 (No Orphans) requires deletion in the same SPEC that orphaned the file. Reversible via git revert. Authorized in this amendment specifically — declaring per Iron Rule 32. Ships in Commit 2.

**Forbidden:**
- Any DB schema changes (no DDL — schema is fine; data seed handled by paired SPEC `M1_LENS_CATALOG_SEED_FROM_EXCEL`)
- Any change to permissions table (gating is already correct per SPEC 3)
- Any change to OAuth gate logic for admin catalog **OTHER THAN** the localhost-only dev-mode bypass per §4 item 6 above (Google OAuth Platform Super Admin flow preserved verbatim for production hostnames)
- Any RPC changes
- Any change outside `modules/lens-catalog-admin/`, `shared/js/catalog-private-admin.js`, `shared/css/`, `css/lens-catalog-*`, `inventory.html`, this SPEC folder
- Any direct INSERT/UPDATE on `lens_brand`, `lens_design`, `lens_variant`, `suppliers`, `supplier_brand_distribution`, `supplier_catalog_offering` — all data seeding lives in paired SPEC `M1_LENS_CATALOG_SEED_FROM_EXCEL`

## 5. Autonomy Envelope

**Can do:**
- Edit JS + HTML + CSS files within §4 forbidden allowlist
- Tier C VFV via Chrome MCP (REQUIRED — see §6)
- Commit batches per §9 commit plan
- Self-certify NO success criterion via "we already have something close enough" — this SPEC explicitly forbids polish-by-validation closure. Either ship the rebuild or stop and escalate.

**Must stop and escalate if:**
- OAuth gate cannot be bypassed for Tier C even after demo-tenant impersonation attempt
- Suppliers data on demo is missing/incomplete (then Suppliers column can't populate)
- Existing JS module structure makes Suppliers column architecturally impossible without rewriting the data layer (escalate to discuss reshape)
- Light-theme palette tokens conflict with shared/css/tokens.css
- Mockup-vs-live side-by-side reveals CRITICAL/HIGH drift that cannot be closed by available shared components

## 6. Tier C VFV Protocol (MANDATORY — addresses SPEC 9 + 10's verification gap)

This SPEC's Tier C VFV is NON-NEGOTIABLE and stricter than the standard. **Tier C runs in TWO PASSES:**

- **Pass 1 — Structural (after Commits 1-4, BEFORE SPEC B seeds data):** Verify DOM layout, theme, column structure, OAuth bypass. Empty-data behavior is acceptable in this pass (columns render with "no data" placeholders, click handlers wire up). Captures `01_admin_4col_layout_empty.png`, `02_admin_oauth_bypass_works.png`, `05_private_overview_light_empty.png`.
- **Pass 2 — Data-driven drill (AFTER SPEC B closes):** Re-runs after `M1_LENS_CATALOG_SEED_FROM_EXCEL` has seeded demo with 9 suppliers / ~11 brands / 2904 variants / 2904 offerings / ~30 distribution rows. Verifies full supplier→brand→series→detail drill works end-to-end with real Prizma catalog data. Captures `03_admin_supplier_click_brands.png`, `04_admin_drill_complete.png`, `06_private_drill_complete.png`.

### 6.1 Admin Catalog (dark)

1. Navigate to `http://localhost:3000/inventory.html?cat=lenses&dev=1` (the new dev-mode bypass — see §3 S18). Verify console.warn "[catalog-auth] DEV MODE BYPASS — localhost only" is logged.
2. Click "🔧 קטלוג מערכת" tab
3. **Pass 1:** Capture screenshot: top-level layout with all 4 columns visible (Suppliers col with empty-data placeholder is OK) — `01_admin_4col_layout_empty.png`
4. **Pass 1:** Capture screenshot demonstrating dev=1 bypass: console panel shows the bypass warning — `02_admin_oauth_bypass_works.png`
5. **Pass 2 (after SPEC B seeds):** Click first supplier in Suppliers column
6. **Pass 2:** Capture screenshot: Brands column populated — `03_admin_supplier_click_brands.png`
7. **Pass 2:** Click first brand → series populate → click first series → variant/detail populates
8. **Pass 2:** Capture screenshot: all 4 columns populated end-to-end — `04_admin_drill_complete.png`
9. Read console — 0 errors expected (other than the deliberate dev-mode warning from #1)

### 6.2 Private Catalog (light)

10. Click "📚 הקטלוג שלי" tab on the same screen
11. **Pass 1:** Capture screenshot: top-level layout side-by-side with admin (empty data OK) — `05_private_overview_light_empty.png`
12. **Pass 2 (after SPEC B seeds):** Drill through same flow on the demo tenant private subtab
13. **Pass 2:** Capture screenshot: full drill complete — `06_private_drill_complete.png`
14. Read console — 0 errors expected

### 6.3 Mockup side-by-side comparison (Pass 2)

15. In Chrome MCP, navigate to `file:///{repo}/modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
16. Render mockup + live admin side-by-side in EXECUTION_REPORT §"Mockup Fidelity Check"
17. Classify EVERY visible element (header, suppliers col, brands col, series col, detail col, action buttons, search bar, etc.) as:
   - **INTENTIONAL** (matches mockup or is documented deviation Daniel approved)
   - **DRIFT** with severity CRITICAL / HIGH / MEDIUM / LOW
18. If ANY CRITICAL or HIGH drift exists → SPEC cannot close 🟢. STOP, document in FINDINGS.md, escalate.

### 6.4 Dev-mode bypass safety check (Pass 1)

19. Set window.location.hostname mock to `'app.opticalis.co.il'` (or test on the live production URL if convenient) and load `?dev=1` — verify the bypass does NOT trigger. Capture in EXECUTION_REPORT §"OAuth Safety Audit" as a code-trace screenshot or DOM evidence.
20. Confirm `catalog-auth.js` source contains the exact conditional `if (location.hostname === 'localhost' && ...)` (string match — not a regex that could match `*.localhost.opticalis.co.il` or similar).

## 7. Commit Plan

Revised twice. First (2026-05-18 late evening) — split Tier C into Pass 1 + Pass 2 around SPEC B execution. Second (2026-05-18 late evening, after Commit 1 shipped) — Daniel chose Path X order reversal: SPEC A Commit 2 deletes the orphan now; SPEC B runs in full BEFORE returning to SPEC A's Tier C, so every Chrome MCP capture happens with real Excel-seeded data (no empty-data screenshots wasted).

| # | Commit subject | Files | When |
|---|---|---|---|
| 1 ✅ | `feat(lens-catalog-admin): TRUE mockup rebuild — add Suppliers column + brand-filter-by-supplier drill + localhost dev-mode bypass` (`434f254`) | partial.html rewrite + catalog-suppliers-col.js + lens-catalog-admin.js orchestrator + catalog-brands-col.js filter-by-supplier + catalog-auth.js dev-mode bypass + catalog-detail-pane.js inline variants table + css/lens-catalog-admin-page.css | shipped |
| 2 | `chore(lens-catalog-admin): delete catalog-variants-col.js orphan (Rule 21 cleanup)` | DELETE modules/lens-catalog-admin/catalog-variants-col.js + this SPEC.md amendment | Now (architect-amended) |
| **GATE A** | **Execute paired SPEC `M1_LENS_CATALOG_SEED_FROM_EXCEL` end-to-end on demo only. STOP and ask Daniel before Prizma seed.** | — | — |
| 3 | `feat(catalog-private-admin): TRUE 1:1 visual clone of admin with light theme + scope=tenant` | shared/js/catalog-private-admin.js rewrite + new shared/css/catalog-private-admin.css + inventory.html CSS link | After SPEC B closes (demo seeded) |
| 4 | `feat(lens-catalog): Tier C VFV — drill flow screenshots with seeded demo data + mockup side-by-side classification` | screenshots/01-06 captured against real data (combines former Pass 1 + Pass 2 since data is now available) | After Commit 3 |
| 5 | `docs(spec): close M1_LENS_CATALOG_TRUE_REBUILD with EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW placeholder + mockup fidelity table` | EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md (placeholder) + Module 1 SESSION_CONTEXT/CHANGELOG/MODULE_MAP updates | After Commit 4 |

## 8. QA / Verification Plan

(See §6 for Tier C protocol.)

- After every commit: Iron Rule 31 integrity gate exit 0
- After Commit 1: admin partial.html has 4 `.lens-cat-admin-col` divs (or equivalent), first one is Suppliers
- After Commit 2: 4 screenshots in folder
- After Commit 3: private partial renders with light palette + same 4-col structure (Chrome MCP DOM check)
- After Commit 4: 6 total screenshots in folder
- After Commit 5: SPEC folder contains EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW + ≥ 6 screenshots

## 9. Pipeline Coordination

Sequential on develop. Lock claim:
- `modules/lens-catalog-admin/**`
- `shared/js/catalog-private-admin.js`
- `shared/css/catalog-private-admin.css`
- `css/lens-catalog-*`
- `inventory.html`
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_TRUE_REBUILD/**`

## 10. Out of Scope

- Pricing screen Console error (`TableBuilder: container #lens-ad-designs-table not found`) — captured in §3 S13 as REGRESSION CHECK only (verify this SPEC did NOT cause it). The fix lives in a separate SPEC `M1_LENS_PRICING_TABLEBUILDER_HOTFIX` to be authored after this SPEC closes.
- OAuth gate refactor for production — preserved verbatim. **Only** the localhost-only dev-mode bypass per §4 item 6 is in-scope; everything else in `catalog-auth.js` stays as-is.
- Data seeding to `lens_brand`, `lens_design`, `lens_variant`, `supplier_brand_distribution`, `supplier_catalog_offering` — paired SPEC `M1_LENS_CATALOG_SEED_FROM_EXCEL` owns the seed from `tests/קטלוג-עדשות-18.5.26.xls`. This SPEC ships the UI; that SPEC ships the data.
- Contact-lens + accessory catalog screens (different mockup; outside M1 lens scope)
- Prizma-tenant seed — explicitly OUT of scope; SPEC B handles only demo seed and STOPS to ask Daniel before Prizma. This SPEC's Tier C VFV verifies on demo only.

## 11. Expected Final State

After this SPEC closes 🟢:
- 5 commits added to develop
- Admin catalog screen visually matches `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` with 4 columns (Suppliers first), dark theme, full drill flow working
- Private catalog screen visually matches admin layout 1:1 with light theme + tenant-scoped data
- 6+ screenshots in SPEC folder documenting the live state at each drill step
- EXECUTION_REPORT.md contains mockup-vs-live side-by-side classification table with 0 CRITICAL/HIGH drift
- FOREMAN_REVIEW.md written (NOT skipped this time)
- F-1 logged: pre-existing Pricing TableBuilder error confirmed not caused by this SPEC, queued for hotfix

## 12. Rollback Plan

If any step fails:
- Each commit `git revert`-able independently
- Backups of touched files in `modules/Module 1 - Inventory Management/backups/M1F_2026_05_18_lens_catalog_true_rebuild/` (executor must create before Commit 1 per Iron Rule 9)
- DB unchanged — no rollback needed

## 13. Lessons Already Incorporated

- **Anti-pattern formalization:** "polish-by-validation" is hereby a documented anti-pattern. A SPEC that ships 0 code changes and self-certifies "existing code already meets criteria" must escalate to Foreman BEFORE closing. If the existing code already meets the criteria, the SPEC scope was wrong and needs to be reworked OR the criteria were too lax.
- **Tier C VFV must include side-by-side mockup comparison** (§6.3). Self-certified Tier C by executor without side-by-side comparison was the gap that allowed SPEC 9 + 10 to close as 🟢 while the screens were not mockup-aligned.
- **FOREMAN_REVIEW is mandatory** at SPEC close. Today (2026-05-18) the Foreman skipped 4 FOREMAN_REVIEWs (SPEC 6, 7, 9, 10). If they had been written at close time, both SPEC 9 + 10's defects would have been caught before "M1 LENS 100% COMPLETE" was declared.

---

**END SPEC**

Foreman seal: 2026-05-18 evening (Cowork session). Authorized by Daniel-Architect after live screen review revealed SPEC 9 + 10 polish-by-validation outputs.
