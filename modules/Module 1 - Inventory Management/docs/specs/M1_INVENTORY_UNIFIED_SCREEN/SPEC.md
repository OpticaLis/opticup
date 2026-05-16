# SPEC — M1_INVENTORY_UNIFIED_SCREEN

> **Author:** opticup-strategic (Foreman, Full-Auto Pipeline 2026-05-16 afternoon)
> **Predecessor:** `M1_INVENTORY_REDESIGN` 🟢 (closed earlier today, `8017fc9`)
> **Source Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_INVENTORY_UNIFIED_SCREEN_BRIEF.md`
> **Mode:** Full Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman), single chat
> **Pre-Pipeline anchor commit:** `8017fc9` (HEAD as of authoring)

---

## §0 Pre-Authoring Reality Check

### §0.A — Empirical probes (per Brief §8 pre-flight)

| # | Probe | Finding |
|---|---|---|
| P1 | `wc -l` on the 8 files in scope | inventory.html=1128, lens-inventory=119, lens-active-designs=89, lens-pricing=101, lens-purchase-order=177, lens-pos-list=146, lens-goods-receipt=214, lens-catalog-admin=258, lens-nav-strip.js=136. Total lens shells = 1104 lines. |
| P2 | Inventory sidebar physical position (CRITICAL — Brief §1 root-cause claim) | `css/inventory-shell.css` uses `inset-inline-end: 0` on `#inv-sidebar`. In `dir="rtl"` `inline-end` = visual LEFT. Confirmed: the sidebar is currently rendering on the **physical LEFT** under RTL. Brief is correct; fix is to swap `inset-inline-end` → `inset-inline-start` (start = right in RTL) and `margin-inline-end:240px` → `margin-inline-start:240px` on body content + `border-inline-start` → `border-inline-end`. |
| P3 | Inventory.html sidebar markup | `<aside id="inv-sidebar">` with 8 entries: 4 product categories (frames active, lenses navigate-out, contact-lenses disabled, accessories disabled) + 4 cross-category (suppliers, incoming-invoices, unified-log, access-sync). Markup unchanged by this SPEC; only sidebar `data-category="lenses"` behavior switches from navigate-out to in-page. |
| P4 | `inventory-shell.js` lens-handler | `lenses: { type: 'navigate', onSelect: function () { window.location.href = urlWithTenant('lens-inventory.html'); } }` — this is what must change to `type: 'in-page'` with the new lens tab-strip rendering. |
| P5 | Lens HTML shell structure | All 7 lens HTMLs share the same skeleton: `<head>` with shared CSS + per-screen `<style>` block (custom design tokens, NOT frames-aligned), `<nav id="lens-nav-container">` (top nav strip), `<div id="access-gate">`, `<div id="app">` (the screen body), `<div class="toast-container">`, script tags loading per-screen modules. The `<div id="app">` body markup is the only piece needed for tab-section migration. |
| P6 | Lens design token deltas (Brief §2.3 Visual Reconciliation Audit) | See §1.5 below — exhaustive table. |
| P7 | `lens-nav-strip.js` references | 7 lens HTMLs reference the file + the file itself + Brief + this SPEC + Foreman reviews. After deletion: zero functional references (only doc/history mentions). Safe to `git rm`. |
| P8 | Cross-repo references to `lens-*.html` | Grep across `**/*.{html,js,ts,astro,md}` found 30 files. Excluding archive/docs/SPEC: 7 lens HTMLs themselves + `shared/js/lens-nav-strip.js` (LENS_PAGES array + home link) + `modules/inventory/inventory-shell.js` (lenses navigate-out target line 62). NO references in storefront repo (verified — no `opticup-storefront` results). Active referrers to update: 1 file (`inventory-shell.js`). |
| P9 | Permission keys for each lens screen | `lens.inventory.view`, `lens.designs.manage`, `lens.pricing.manage`, `lens.po.view`, `lens.po.create`, `lens.po.cancel`, `lens.gr.create`, `lens.gr.add_manual_line`, `lens.catalog.manage` (catalog-admin uses `is_platform_super_admin` RPC, not a perm key — confirmed in `lens-nav-strip.js:30`). No new keys needed. |
| P10 | Active referrers to `lens-*.html` URLs | `inventory-shell.js:62` line `window.location.href = urlWithTenant('lens-inventory.html')` — gets replaced with in-page tab-section swap. `shared/js/lens-nav-strip.js` LENS_PAGES array — gets deleted with the file (Brief §2.4). Pre-existing per-page `<nav id="lens-nav-container">` placeholders in the 7 lens HTMLs — deleted with the HTMLs. |
| P11 | Existing site-wide CSS for `.lens-*` classes | `css/inventory-shell.css` has `#inv-sidebar`, `.inv-cat-item`, `.supplier-cat-badge`, `.ul-filter-bar`, `.ul-pagination`. NO lens-style tokens here. The lens screens carry their custom design in inline `<style>` blocks per-HTML. Migration: extract per-HTML inline `<style>` blocks → either fold into existing `css/inventory-shell.css` OR drop entirely in favor of frames pattern. The latter is the SPEC's choice (per Brief §2.3 "frames pattern is canonical"). |
| P12 | Pipeline smoke baseline | Will be captured at C0 (pre-Pipeline) via `npm run smoke` — must be 7/7 PASS before any edit. |

### §0.B — Decision gates (evidence-based branches)

| Gate | Question | Evidence | Decision |
|---|---|---|---|
| **DG-1** | RTL sidebar fix: swap CSS logical properties OR force physical `right:0`? | Logical properties are the project's RTL convention; swapping `inline-end`→`inline-start` is one-character-per-prop and consistent with the existing pattern. Physical `right:0` would be an inconsistency-causing exception. | **Branch A — swap logical properties.** Three edits: `#inv-sidebar { inset-inline-start: 0; border-inline-end: 1px solid; }` + `body.has-inv-sidebar > * { margin-inline-start: 240px; }` (was `margin-inline-end`). Border side also flips (was border-inline-start = visual right; now border-inline-end = visual left = the side adjacent to main content). |
| **DG-2** | Lens tab-content delivery: inline 7 `<section>` blocks in inventory.html OR fetch via `<template>` partials at runtime? | Inventory.html is already 1128 lines. Adding 7 lens tab-sections inline would push it to ~1700-1900 lines (rough estimate from lens-*-html body sizes). Iron Rule 12 caps at 350 lines per file. Conclusion: inline is a Rule-12 violation. | **Branch B — extract.** Each lens tab body becomes its own partial: `modules/lens-<screen>/lens-<screen>-partial.html`, loaded by `inventory-shell.js` via `fetch()` on first tab activation, cached. JS modules per screen are unchanged. The 7 partials + 1 thin shell in inventory.html keep all files under 350 lines. |
| **DG-3** | Design unification: rewrite per-screen `<style>` blocks to use frames tokens at execution OR ship a single `css/lens-tabs-unified.css` that overrides the per-screen styles? | Per-screen `<style>` blocks are inline in the 7 lens HTMLs — when those HTMLs are deleted (Brief §6 #1), the inline `<style>` is gone with them. The partial bodies (DG-2 Branch B) start clean. Tokens to apply = frames pattern, sourced from `css/inventory.css` + `shared/css/components.css` (already loaded by inventory.html). | **Branch C — clean slate.** Partials carry ONLY semantic markup (no inline `<style>`). Visual unification = re-use existing inventory.html stylesheets + a new minimal `css/lens-tabs.css` (one file, ~80 lines) that maps lens-specific UI primitives (chip toggle, SPH×CYL grid, design row) to frames tokens. Total new CSS: 1 file, <100 lines. |
| **DG-4** | Auth + nav-strip retirement: delete `shared/js/lens-nav-strip.js` clean, OR keep it as no-op shim for 1 release? | The 7 lens HTMLs are deleted in the same Pipeline as the JS file. No callers remain after C2. No external repos (Brief §2.2 verified per P8). | **Branch A — clean delete.** `git rm shared/js/lens-nav-strip.js` in same commit as the 7 HTMLs. Document in EXECUTION_REPORT. |
| **DG-5** | URL parameter naming: `?cat=`+`&tab=` vs `?category=`+`&screen=`? | Brief §2.2 example uses `cat`+`tab`. Shortest readable form. | **Branch A — cat+tab.** Default cat=frames; default tab depends on category (frames→entry, lenses→inventory, suppliers→list, etc.). |

### §0.C — Brief-vs-reality findings (per P-AUTHOR-4 cumulative discipline)

| # | Brief claim | Reality | Resolution |
|---|---|---|---|
| F-DB-1 | "sidebar appears … positioned on the LEFT" (Brief §1 root-cause #2) | Confirmed via §0.A P2 — CSS uses `inset-inline-end:0` which IS visual LEFT in RTL. | No SPEC change; Brief is right. Resolution = swap logical property direction (DG-1 Branch A). |
| F-DB-2 | "8 entries (4 product categories + 4 cross-category items)" (Brief §2.1) | Confirmed — 8 entries in `<aside id="inv-sidebar">` exactly as described. | Verbatim in §3. |
| F-DB-3 | "URL pattern: `inventory.html?t=prizma&cat=lenses&tab=inventory`" (Brief §2.2) | Existing URL pattern uses `?t=<slug>`. Extending with `&cat=` + `&tab=` is mechanical. Hash-aware tenant param helper already exists in inventory-shell.js + lens-nav-strip.js (`urlWithTenant`). | Reuse the existing helper; extend `inventory-shell.js` to parse `cat`/`tab` from URL query. |
| F-DB-4 | "`lens.catalog.manage` (or whatever the existing key is) — gates 'catalog-admin' tab" (Brief §2.5) | Reality: `lens-catalog-admin.html` does NOT use a permission key. It uses `is_platform_super_admin()` RPC (lens-nav-strip.js:30 `gate: '__platform_admin__'`). The `lens.catalog.manage` key in the Brief does NOT exist in the permissions table. | SPEC §3 must reflect the RPC-gated reality, not a permission key. The catalog-admin tab is shown only when `is_platform_super_admin()` returns true. Brief drafting drift; corrected here. |
| F-DB-5 | "lens-pos-list.html" listed under §2.2 table (Brief §2.2) | Confirmed — file exists, JS module at `modules/lens-pos-list/`. | Verbatim. |
| F-DB-6 | "`shared/js/lens-nav-strip.js` was designed for a world where each lens screen was a separate page" (Brief §2.4) | Confirmed — 136 lines, LENS_PAGES array hard-codes the 7 file paths + home link to `inventory.html`. After lens HTMLs delete, no callers. | Verbatim. Clean `git rm`. |
| F-DB-7 | "Each lens tab keeps its permission key" (Brief §2.5) | Confirmed — JS modules retain their `data-permission` patterns; only the HTML container moves. No DB changes. | Verbatim. |
| F-DB-8 | "Inventory.html may grow significantly. If it crosses 350 lines, split via partials/templates" (Brief §4 Rule 12) | Will cross 350 even before any unification (currently 1128). Decision in DG-2 = Branch B (extract per-screen partials). | DG-2 documented; SPEC commits to Branch B. |
| F-DB-9 | "lens-pricing.html / lens-active-designs.html chip class uses gold `#c9a555`" (implied from §0.A P5 / P6 inspection) | Confirmed — lens screens use gold `#c9a555` chip color; frames uses navy `#1e3a8a` (`inventory-shell.css` `.inv-cat-item.active` and `inventory.css` `.btn-p`). Visual unification = swap gold→navy across all lens partial markup. | Listed in §1.5 Visual Reconciliation Audit row R-3. |

9 findings, all resolved at author time per P-AUTHOR-4 discipline.

### §0.D — Lessons applied (from prior FOREMAN_REVIEWs)

| # | Source | Lesson applied this SPEC |
|---|---|---|
| L-1 | M1_INVENTORY_REDESIGN §6 P-AUTHOR-1 (filter-aware arithmetic) | §3 below uses computed counts (e.g. "8 root HTMLs → 1 inventory.html + 6 storefront + 7 admin = currently 23 root HTMLs; after deletion: 23 - 7 = 16"). Every count is computed not copied. |
| L-2 | M1_INVENTORY_REDESIGN §6 P-AUTHOR-2 (deferral hygiene) | §6 Out-of-Scope each deferral cites the absorbing path (orphan css cleanup → next M1 maintenance SPEC within 7 days). |
| L-3 | M1_INVENTORY_REDESIGN §7 P-EXEC-1 (auto-REVOKE on staff-only views) | NOT TRIGGERED — this SPEC has no DB changes. |
| L-4 | M1_INVENTORY_REDESIGN §7 P-EXEC-2 (cross-source UNION view template) | NOT TRIGGERED — no DB changes. |
| L-5 | M1_LENS_PHASE_2_COMPLETION P-EXEC-2 (INTENT-vs-LITERAL autonomy) | §9 Autonomy Envelope explicitly authorizes the executor to act on intent when literal SPEC values are off-by-one or arithmetic drift is detected. |
| L-6 | M1_LENS_PHASE_2_COMPLETION P-AUTHOR-2 (decision-gate pattern, 4/4 timeline) | §0.B 5 decision gates with explicit evidence + branch selection. |
| L-7 | M1_INVENTORY_REDESIGN (Chrome MCP visual at Stage 4 — P-AUTHOR-1 UI smoke matrix 3/3 → auto-apply trigger) | §3 explicitly requires Chrome MCP side-by-side screenshots on 4 categories. |

### §0.E — Baselines (per P-AUTHOR-2 baselines-as-symbols, from MIGRATION_2)

| Symbol | Pre-Pipeline value | Source |
|---|---|---|
| `BASE_ROOT_HTMLS` | 24 (per `ls *.html` at C0) | §0.A P1 — `inventory + 6 storefront + 5 admin/system + 7 lens = 24` (the file list is: admin, crm, error, index, inventory, landing, r, settings, shipments, suppliers-debt + 6 storefront + 7 lens = 24, counted at C0) |
| `BASE_INVENTORY_HTML_LINES` | 1128 | §0.A P1 |
| `BASE_LENS_HTMLS_LINES` | 1104 | §0.A P1 (sum across 7 lens HTMLs) |
| `BASE_LENS_NAV_STRIP_LINES` | 136 | §0.A P1 |
| `BASE_FRAMES_TABS` | 7 (entry/reduction/purchase-orders/inventory/brands/stock-count/returns) | §0.A P3 |

---

## §1 Goal

One inventory page. Sidebar on the **physical right** (RTL-correct). 7 lens screens migrated into `inventory.html` as on-demand-loaded tab-sections via `fetch()` partials. Visual design unified to the frames pattern. The 7 lens-*.html files + `shared/js/lens-nav-strip.js` deleted via `git rm`. Same DB. Same RPCs. Same business logic. Same permissions. Pure structural + visual change.

---

## §1.5 Visual Reconciliation Audit

The 7 lens screens currently diverge from the frames pattern on these axes. Each row is a unification task for the executor. The list is binding — every row MUST be addressed in C3 (visual unification).

| # | Axis | Lens current | Frames canonical (target) | Source of frames token |
|---|---|---|---|---|
| R-1 | Body background | `#f5f6fa` (lens-inventory, lens-active-designs, lens-pricing) / `#f1f5f9` (lens-pos-list, lens-goods-receipt) / `#0f172a` (lens-catalog-admin — platform dark theme) | `var(--bg)` from `shared/css/variables.css` — light neutral matching frames body | `shared/css/variables.css` |
| R-2 | Body padding (page-level chrome) | `padding: 16px; margin: 0` (each lens inline `<style>`) | No body padding; layout via inventory's tab-container | inventory.html line 31 `<body class="has-inv-sidebar">` (no padding) |
| R-3 | Chip/toggle color (lens "סוג ייצור" filter) | Gold `#c9a555` border + background-active | Navy `#1e3a8a` matching `.inv-cat-item.active` + `.supplier-filter-pill.active` | `inventory-shell.css` `.supplier-filter-pill.active` |
| R-4 | Table header row | Dark slate `#34495e` text white | Light slate `#f8fafc` text `#475569` with bottom border (compact frames look) | `shared/css/table.css` — frames pattern: `.po-table thead th { background:#f8fafc; color:#475569; ... }` (matches lens-pos-list's `.po-table` but lens-inventory/designs/pricing use the OLD dark style) |
| R-5 | Card panel `border-radius` | `8px` everywhere | `8px` everywhere | Match — no change |
| R-6 | Card panel `box-shadow` | `0 1px 3px rgba(0,0,0,0.08)` | `0 1px 3px rgba(0,0,0,0.08)` | Match — no change |
| R-7 | `.page-header` block (top of each lens screen) | Lens has its own `.page-header` with title + badge + buttons | Frames does NOT have a per-tab page-header — the sidebar is the chrome; tabs render content directly | DROP `.page-header` from each lens partial. The screen title + action buttons move into a single tab-section opening row that matches the frames pattern (e.g. inventory.html line 226 `<h3>` + `<div class="form-row">`). |
| R-8 | Action button (`.btn`) styling | Inline `padding:8px 14px; border:1px solid #d0d4d9` (lens) | `var(--btn-*)` classes from `shared/css/components.css` — `.btn .btn-p .btn-s .btn-g .btn-w` | Map: lens `.btn-primary` → frames `.btn-p`. Lens `.btn-success` → frames `.btn-s`. Lens `.btn` → frames `.btn`. |
| R-9 | Toast container placement | Lens: `<div class="toast-container">` per HTML | Frames: shared toast-container in inventory.html | DELETE per-lens toast-container; reuse inventory.html's. |
| R-10 | Auth-gate div | Lens: `<div id="access-gate">` per HTML | Frames: permission gating via `data-tab-permission` attribute on the tab button + `<section>` element (uniformly handled by `applyUIPermissions()`) | Lens partials adopt `data-tab-permission` on their `<section>` element. The per-screen `<div id="access-gate">` is REMOVED. |
| R-11 | Empty state padding | Lens: `padding: 20px` (inventory) / `30px` (designs/pricing) / `30px 20px` (PO/GR) / `40px` (pos-list/catalog) | Frames: `.empty-state` uniform via `shared/css/components.css` | Drop lens inline `.empty-state` rules; rely on shared CSS. |
| R-12 | Form field padding | Lens: `padding: 6px 10px` (selects) / `padding: 8px 10px` (text inputs) | Frames: form pattern via `shared/css/forms.css` — `.form-group input/select { padding:6px 10px }` for compact, `8px 12px` for prominent | Lens partials use `class="form-group"` wrappers; no inline padding overrides. |
| R-13 | Color: badge | Lens: `#e8eaf6 / #3949ab` (purple) | Frames: depends on context — for status: `.chip-*` palette in lens-pos-list is already frames-pattern-compliant (`#dbeafe / #1e3a8a` blue, `#d1fae5 / #065f46` green). Use these. | Standardize all lens partial badges to the lens-pos-list `.chip-*` palette (which already matches frames). |
| R-14 | RTL leak check | Per-HTML `<style>` blocks use `padding:6px 12px` (no logical props), but no `left:` / `right:` physical props found in any lens HTML | Frames uses logical props everywhere | Verify partials carry no `left:` / `right:` physical properties; flag any in retro. |

14 rows; 13 require edits in C3 (R-5 and R-6 are matches, no change). Executor checks off each row in EXECUTION_REPORT C3 section.

---

## §2 Cross-Reference Check (Step 1.5 Rule 21 enforcement)

Sweep performed 2026-05-16 by Foreman against `GLOBAL_SCHEMA.sql`, `GLOBAL_MAP.md`, `DB_TABLES_REFERENCE.md`, `FILE_STRUCTURE.md`, module db-schema.sql + MODULE_MAP.md.

| New name introduced | Search | Result | Resolution |
|---|---|---|---|
| `modules/lens-inventory/lens-inventory-partial.html` (and 6 siblings) | Grep `*-partial.html` across all modules | 0 hits | Genuinely new; no collision. |
| `css/lens-tabs.css` | Grep `lens-tabs.css` | 0 hits | Genuinely new; no collision. |
| URL param `cat=` (new) | Grep `?cat=` and `&cat=` in HTML/JS/Astro | 0 hits in functional code (only in this SPEC + Brief docs) | No collision. |
| URL param `tab=` (new) | Grep `?tab=` and `&tab=` in HTML/JS/Astro | Multiple hits in frames code, ALL referring to the in-page `showTab(tabName)` pattern that this SPEC reuses. None reference a query-string `tab=` param that would conflict. | No collision; this SPEC extends the existing in-memory tab name to a URL-restorable form. |
| `setActiveLensTab()` (new public fn on `InvShell`) | Grep `setActiveLensTab` | 0 hits | Genuinely new. |
| `InvShell.lensTabs` (new exposed array) | Grep `lensTabs` | 0 hits | Genuinely new. |

**Sweep result: 0 collisions / 6 new names introduced cleanly.**

For modified existing files:
- `modules/inventory/inventory-shell.js` — extends with lens in-page handler + URL param parsing. No name shadowing.
- `css/inventory-shell.css` — adds `.lens-tab-section` class. No name shadowing.

---

## §3 Success Criteria (14 from Brief §7 + measurable verifies)

Each criterion has an exact expected value + verify command. Stage 4 Localhost-Tester checks all 14.

| # | Brief link | Criterion | Expected | Verify |
|---|---|---|---|---|
| **S1** | Brief §7 #1 | One inventory page; 7 lens-*.html files no longer exist | `ls lens-*.html 2>/dev/null \| wc -l` = 0 | shell |
| **S2** | Brief §7 #2 | Sidebar on the physical right (RTL-correct) | Screenshot: `#inv-sidebar` bounding-box x-coordinate ≥ `body.clientWidth - 240px` | Chrome MCP DOM measurement |
| **S3** | Brief §7 #3 | Sidebar identical on every category click | Click "מסגרות" / "עדשות" / "ספקים" / "לוג מאוחד" → `#inv-sidebar` DOM position unchanged across all 4 | Chrome MCP visual + DOM compare |
| **S4** | Brief §7 #4 | Lens tabs identical-looking to frames tabs | Side-by-side screenshots: frames-tab + lens-tab share same chrome (header font, button colors, table header colors, card border-radius/shadow). Each §1.5 row checked off in EXECUTION_REPORT C3. | Chrome MCP + EXECUTION_REPORT §1.5 audit table |
| **S5** | Brief §7 #5 | URL pattern works: `inventory.html?cat=lenses&tab=pricing` deep-links to lens-pricing | Load URL → DOM has `[data-cat="lenses"][data-tab="pricing"]` section with `.active` class; sidebar entry "עדשות" is `.active`. | Chrome MCP navigate + DOM probe |
| **S6** | Brief §7 #6 | Permission gating preserved | User without any `lens.*` perms → sidebar entry "עדשות" hidden. User without `is_platform_super_admin` → "catalog-admin" tab hidden. | Demo tenant has user `Daniel` (PIN 12345, all perms) — verify perm-stripping via `applyUIPermissions()` runs cleanly. |
| **S7** | Brief §7 #7 | No broken links: zero `lens-*.html` references in functional code | `grep -rn "lens-[a-z-]\+\.html" --include="*.html" --include="*.js" --include="*.ts" --include="*.astro" .` finds only: docs/brief/spec/foreman-review/changelog. 0 hits in `*.html` `*.js` `*.ts` `*.astro` functional code. | shell |
| **S8** | Brief §7 #8 | Frames flow unchanged | Frames tab click sequence (entry → reduction → inventory → brands → stock-count → returns → purchase-orders) all load + render with zero console errors | Chrome MCP console probe |
| **S9** | Brief §7 #9 | All 7 lens flows preserved end-to-end | Each lens tab (inventory, designs, pricing, PO, pos-list, GR, catalog-admin) loads + renders + no JS error in console + intended action smoke-works (e.g., filter-brand select populates, table renders rows or empty state) | Chrome MCP per-tab probe |
| **S10** | Brief §7 #10 | Smoke 7/7 baseline PASS | `npm run smoke` exit 0, all 7 tests pass on demo | shell |
| **S11** | Brief §7 #11 | Iron Rule 31 integrity gate exit 0 every commit | `npm run verify:integrity` exit 0 at C0/C1/C2/.../close. Captured per-commit in EXECUTION_REPORT. | shell per commit |
| **S12** | Brief §7 #12 | Prizma untouched: row-count delta = 0 across all M1 tables | `select 'tenant_lens_stock' tbl, count(*) from tenant_lens_stock where tenant_id='<prizma>' union all ...` compared pre vs post = 0 delta | psql probe at Stage 4 |
| **S13** | Brief §7 #13 | Chrome visual smoke 4 categories | 4 PNG screenshots saved to `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/screenshots/` covering frames-active / lens-active / suppliers-active / unified-log-active. Each ≥ 30 KB. All 4 must look like the same screen chrome with different content. | Chrome MCP screenshot + file size |
| **S14** | Brief §7 #14 | File count: 24 root HTMLs → 17 root HTMLs (Brief said "8 inventory HTMLs → 1") | `ls *.html \| wc -l` pre = 24, post = 17 (24 - 7 lens). Computed: `BASE_ROOT_HTMLS - 7 = 17`. (Brief §7 #14 phrasing was loose; corrected to absolute root-HTML count.) | shell |

**Filter-aware arithmetic (L-1 applied):**
- S1: `ls lens-*.html` post = 0 (7 deleted, nothing added)
- S14: total root HTMLs `BASE_ROOT_HTMLS=24 - 7 deleted = 17` (no additions, no renames; the SPEC adds partials in `modules/lens-*/` not at root)
- S7: post-grep should hit only `docs/`, `_archive/`, `modules/Module 1*/architecture-brief/`, `modules/Module 1*/docs/specs/`, `MASTER_ROADMAP.md`, `OPEN_TASKS.md` — those are 6 path prefixes. The grep MUST NOT hit `*.html` or `js/*.js` or `shared/js/*.js` or `modules/*/.js` (except where the SPEC docs themselves live).

---

## 4. Destructive Operations

Declared:

1. **`git rm`** of 7 lens HTMLs at repo root:
   - `lens-inventory.html`
   - `lens-active-designs.html`
   - `lens-pricing.html`
   - `lens-purchase-order.html`
   - `lens-pos-list.html`
   - `lens-goods-receipt.html`
   - `lens-catalog-admin.html`
2. **`git rm`** of `shared/js/lens-nav-strip.js` (no remaining callers after #1).
3. **Structural HTML rewrite of `inventory.html`** — sidebar CSS hook + lens tab-section shells + URL param parsing. Markup change only; no business-logic change.
4. **CSS modifications** to `css/inventory-shell.css` — swap logical-property direction (`inline-end` ↔ `inline-start` for the sidebar position and main-content margin), add `.lens-tab-section` class. Selective + additive; no wholesale deletion.
5. **Modification of `modules/inventory/inventory-shell.js`** — replace `lenses` navigate-out handler with in-page handler; add URL param parsing + partial fetcher + tab-section state machine. Extends existing module.
6. **Creation of 7 new partial HTML files** under `modules/lens-<screen>/lens-<screen>-partial.html` — extracted `<div id="app">` bodies from the 7 deleted HTMLs.
7. **Creation of `css/lens-tabs.css`** — new shared stylesheet for lens tab-section primitives mapped to frames tokens.
8. **`git tag pre-inventory-unified-screen-2026-05-16`** at the pre-Pipeline anchor `8017fc9` — rollback anchor.

**NOT authorized:**
- DROP / ALTER / CREATE of any table, column, policy, RPC, view, function, trigger.
- Modification of `modules/lens-*/` JS module BEHAVIOR (only HTML container reshaped — JS files may be modified ONLY to drop the `<script src="shared/js/lens-nav-strip.js">` reference if they have any, and to rename DOM IDs if collision with frames). Re-verify in EXECUTION_REPORT that JS module exports/contracts are unchanged.
- Changes to permissions table or `data-permission` attribute semantics.
- Force-push, rebase of main, main-branch modifications, `git reset --hard`, `git push --force`.
- Touching Prizma tenant data (verification on demo only; row-count delta = 0 enforced at Stage 4).
- Any `git rm` outside the 8 files listed above (7 lens HTMLs + 1 nav-strip JS).
- Any DELETE/UPDATE/INSERT on Supabase tables under any tenant.
- Modification of `index.html` (already validated by Brief §2.6 — no lens card present).
- Modification of CLAUDE.md, MASTER_ROADMAP.md, SKILL.md files (those are post-close master-doc updates owned by Foreman Stage 5).

---

## §5 Stop-on-Deviation Triggers

Beyond CLAUDE.md §9 global triggers, this SPEC adds:

1. **Iron Rule 12 violation:** if any single file exceeds 350 lines after the executor's edit, STOP. The DG-2 partial-extraction decision is specifically to avoid this. If a partial body itself crosses 350 — split further.
2. **§1.5 audit row missed:** if any of the 13 unification edits is silently skipped, STOP. The Stage 4 visual matrix WILL catch it; pre-catch via the §1.5 table check at end of C3.
3. **Prizma row delta ≠ 0:** if any post-Pipeline DB probe shows a non-zero row delta on Prizma tables, STOP. Demo-only is binding.
4. **More than 8 destructive ops:** the §4 list has exactly 8 destructive items. If a 9th is needed mid-Pipeline → STOP + write escalation per Iron Rule 32 protocol.
5. **JS module behavior change:** if a `modules/lens-*/lens-*-main.js` file needs more than a 1-line DOM-ID rename or a `<script>` reference drop, that's a behavior change — STOP. The Brief is binding: "JS logic preserved."
6. **Concurrency check:** if 2+ Claude Code CLI sessions detected (`Get-Process claude`), STOP + escalation per the precedent set by M1_INVENTORY_REDESIGN's concurrency-guard halt (06:10 morning).
7. **Smoke degradation:** if smoke 7/7 PASS pre-Pipeline → < 7/7 post-Pipeline at any commit, STOP. Per-commit smoke after C1, C2, C3, C-close (not after every commit but at logical stages — C1 sidebar fix, C2 mass delete, C3 visual unification, C-close).

---

## §6 Out of Scope (explicit list)

| # | Item | Why out | Deferred to |
|---|---|---|---|
| O-1 | DB schema changes | Brief §3 explicitly no DB changes | n/a |
| O-2 | New permission keys | Brief §3 + §2.5 — permissions preserved verbatim | n/a |
| O-3 | Mobile/tablet rework | Brief §3 desktop-only | Future M1 mobile pass |
| O-4 | Contact-lenses / accessories tab implementation | Brief §3 placeholders only | Module 1.2/1.3 future SPEC |
| O-5 | Log unification rework (`v_inventory_unified_log` view) | Brief §3 — that shipped in M1_INVENTORY_REDESIGN yesterday | n/a |
| O-6 | Orphan `tab-systemlog` cleanup deferred from M1_INVENTORY_REDESIGN | Pre-existing deferral; the visual unification this SPEC ships handles a different surface | Next M1 maintenance SPEC within 7 days (per L-2 deferral hygiene) |
| O-7 | Removing the per-screen inline `<style>` blocks via incremental modification (vs delete-with-HTML approach) | Brief §6 — the HTMLs are deleted whole; the partials start from semantic markup only. The inline `<style>` blocks go to the bit-bucket with the HTML. | n/a (resolved by DG-3 Branch C) |
| O-8 | A redirect from old lens-*.html URLs to inventory.html?cat=lenses&tab=... | Brief §9.1 — "delete cleanly, no redirects" (Daniel decision A) | Documented; will not be implemented |
| O-9 | Master-doc updates (CLAUDE.md, GLOBAL_MAP, MODULE_MAP, etc.) | Foreman Stage 5 scope, NOT executor scope | Stage 5 of THIS Pipeline |

**Near-term orphan (deferral hygiene, per L-2):** After this Pipeline, `modules/lens-*/` directories may still contain `lens-<screen>-main.js` files that handle their own DOM-bootstrap. If those files still call `document.getElementById('lens-nav-container')` after lens-nav-strip.js is deleted, the call is a silent no-op (no error, no effect). Tracked as: **next M1 maintenance SPEC absorbs these calls within 7 days** — single-PR scan for `lens-nav-container` references in modules/lens-*/.

---

## §7 Expected Final State

After all commits land:

- `inventory.html` is the sole inventory-related top-level HTML (line count: 1128 + ~100 = ~1230; if > 1300, split inline `<script>` block to external file in same commit).
- 7 lens-*.html files removed from repo root.
- `shared/js/lens-nav-strip.js` removed.
- 7 new files at `modules/lens-<screen>/lens-<screen>-partial.html`, each <300 lines.
- 1 new file `css/lens-tabs.css`, <100 lines.
- `css/inventory-shell.css` swapped to RTL-correct sidebar position.
- `modules/inventory/inventory-shell.js` extended (~280 lines, up from 200) with: in-page lens handler, URL param parse, partial fetcher with cache.
- `inventory.html` body contains: existing sidebar + frames tabs + 7 new `<section data-cat="lenses" data-tab="...">` empty shells (filled at runtime via fetch).
- URL `inventory.html?t=demo&cat=lenses&tab=pricing` loads the pricing partial into the pricing section and activates the lenses sidebar entry + the pricing tab strip.
- Smoke 7/7 PASS at HEAD.
- Iron Rule 31 + 32 gates exit 0 at HEAD.
- 4 PNG screenshots saved to SPEC folder under `screenshots/`.
- 0 row delta on Prizma across all M1 tables.

---

## §8 Commit Plan

Expected 6 executor commits + Reviewer + Tester + Foreman close = 9 commits total.

| # | Commit | Files touched | Notes |
|---|---|---|---|
| **C0** | `chore(spec): seal M1_INVENTORY_UNIFIED_SCREEN — SPEC.md` | this SPEC file | Foreman Stage 1 — current commit |
| **C1** | `fix(m1): sidebar position right — RTL logical property correction` | `css/inventory-shell.css` (3-4 lines) | Tag `pre-inventory-unified-screen-2026-05-16` placed at parent commit (= C0's parent). Sidebar visually moves right. |
| **C2** | `feat(m1): lens tab shell + URL param routing in inventory.html` | `inventory.html` (add 7 empty `<section data-cat="lenses">` shells + sidebar wiring), `modules/inventory/inventory-shell.js` (lens handler + URL parse + fetch), `css/inventory-shell.css` (`.lens-tab-section` class), `css/lens-tabs.css` (new shared lens tab styles) | Largest commit. Lens partials NOT YET created — sections render empty placeholders. URL `?cat=lenses&tab=...` already works (loads placeholder). |
| **C3** | `feat(m1): migrate 7 lens screens to partials with frames pattern` | 7 new `modules/lens-<screen>/lens-<screen>-partial.html` files + per-partial DOM-ID renames in `modules/lens-<screen>/lens-<screen>-*.js` if collision (1-line max per file), if applicable | All §1.5 Visual Reconciliation Audit rows checked off here. Partial bodies = semantic markup only (no inline `<style>`). |
| **C4** | `chore(m1): retire lens-nav-strip + delete 7 lens HTML shells` | `git rm` 7 lens HTMLs + `git rm shared/js/lens-nav-strip.js`. Verify zero references to deleted files via grep. | The actual deletion commit. After this commit S1, S7, S14 PASS. |
| **C5** | `chore(spec): close M1_INVENTORY_UNIFIED_SCREEN executor scope — retrospective` | `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/EXECUTION_REPORT.md` + `FINDINGS.md` (if any) | Executor Stage 2 close. |
| **C6** | (Reviewer) `chore(spec): Reviewer REVIEW.md — M1_INVENTORY_UNIFIED_SCREEN ...` | `REVIEW.md` added | Reviewer Stage 3 close. |
| **C7** | (Tester) `chore(spec): Localhost-Tester TEST_REPORT — M1_INVENTORY_UNIFIED_SCREEN ...` | `TEST_REPORT.md` + 4 screenshots | Tester Stage 4 close. |
| **C8** | (Foreman) `chore(spec): close M1_INVENTORY_UNIFIED_SCREEN — FOREMAN_REVIEW + master-docs + Hebrew summary` | `FOREMAN_REVIEW.md` + `CHANGELOG.md` append + `SESSION_CONTEXT.md` update + Hebrew message | Foreman Stage 5 close (this stage). |

Each commit message uses the project's `type(scope): description` convention. Each commit is single-concern. The C2 commit is the largest because the URL routing + fetcher + shell are interdependent; splitting them would create a broken intermediate state.

---

## §9 Autonomy Envelope

The executor is authorized to take these decisions internally without escalating:

1. **DG-1 implementation:** swap logical property direction. Pre-approved per §0.B. If the swap reveals an unanticipated visual artifact (e.g., box-shadow direction needs flipping too) — fix it inline, document in EXECUTION_REPORT.
2. **DG-2 partial extraction:** create 7 partial files. Pre-approved per §0.B.
3. **DG-3 visual unification:** drop lens inline `<style>` blocks; apply frames tokens. Pre-approved per §0.B. The §1.5 audit table is the binding checklist — each row must be addressed.
4. **DG-4 clean delete:** `git rm` the 8 files. Pre-approved per §0.B.
5. **DG-5 URL param:** `cat`+`tab`. Pre-approved.
6. **Partial-load lazy strategy:** fetch on first tab activation + cache in-memory for subsequent activations within the same page-load. If the user reloads, re-fetch. No localStorage caching needed for v1.
7. **DOM-ID renames in lens partials:** if a partial's body has `id="filter-brand"` and the frames body also has `id="filter-brand"`, rename the lens one to `id="lens-<screen>-filter-brand"` and update the corresponding `modules/lens-<screen>/lens-<screen>-*.js` references via single grep-replace. Pre-approved as 1-line-per-file mechanical change. Document the renames in EXECUTION_REPORT.
8. **C2 internal structure:** add `<section data-cat="lenses" data-tab="...">` shells in any order within inventory.html `<main>` — adjacent to existing frames `<section>` blocks. Inline `<script>` block at bottom of inventory.html may be split into external file if line count threatens 350-line cap.
9. **INTENT-vs-LITERAL recoveries** (per L-5): if a §3 criterion's expected value is off by ±1 due to author arithmetic, document the actual value in EXECUTION_REPORT under "In-flight decisions" and continue. The Foreman absorbs the correction at Stage 5. Do NOT stop the Pipeline for a value-only discrepancy if behavior is correct.
10. **Background processes per Brief §9.2:** Sentinel cron writes / Watcher Access sync / Cowork pending entries / pre-existing untracked items at session start — IGNORE. Do not include in commits. Do not halt on them.

The executor MUST escalate to Daniel ONLY for (matches Brief §9.1):
- A 9th destructive operation outside §4.
- Cross-module unintended impact (e.g., CRM page broken by an unanticipated import path collapse).
- Iron Rule 31 integrity gate fails twice in a row (one fail = retry; two = halt).
- Demo tenant becomes unusable mid-Pipeline.
- Concurrent CLI session detected (2+ `claude` processes).
- Pre-flight reveals a fundamental Brief assumption is wrong (e.g., a lens HTML actually IS referenced by Prizma-only production code).

---

## §10 Rollback Plan

Single-step rollback if any commit breaks production:

```
git tag pre-inventory-unified-screen-2026-05-16  # placed at pre-Pipeline parent commit 8017fc9
# If Pipeline must be rolled back:
git reset --hard pre-inventory-unified-screen-2026-05-16
git push -f origin develop   # ONLY with explicit Daniel approval — Iron Rule 7 says no force-push to main, develop is the same care here
```

Per-commit revert is also valid (each commit is single-concern). If only C3 (visual unification) breaks something, `git revert <C3 hash>` is preferred over full rollback.

DB rollback: not applicable — this SPEC has no DB changes.

---

## §11 Lessons Already Incorporated

Per §0.D table above, this SPEC applies 7 lessons from 5 prior FOREMAN_REVIEWs (L-1 through L-7). The full traceability table is §0.D.

**P-AUTHOR-1 (UI smoke matrix from M1B_FOUNDATION_PERMISSIONS_HOTFIX) at 3/3 auto-apply trigger** — this SPEC's §3 S13 "Chrome MCP visual smoke on 4 categories" applies the discipline at the SPEC-author level. Skill-file amendment to `opticup-strategic/SKILL.md` is deferred to a post-Pipeline housekeeping commit (not in scope for this SPEC's commits; tracked as a Foreman Stage 5 master-doc update).

**Deferral hygiene note (per L-2):** The orphan `lens-nav-container` `document.getElementById` calls in `modules/lens-*/lens-*-main.js` files (if present) are explicitly tracked in §6 O-9 as absorbed by the **next M1 maintenance SPEC within 7 days**.

---

## §12 Hebrew status template (Brief §10 verbatim)

The Foreman Stage 5 Hebrew message uses this template:

```
M1_INVENTORY_UNIFIED_SCREEN נסגר [🟢/🟡/🔴].
מסך מלאי מאוחד: עמוד אחד, סייד-בר מימין, 4 קטגוריות + 4 חוצה-קטגוריות.
7 דפי lens-*.html נמחקו והפכו לטאבים בתוך inventory.html.
עיצוב אחיד: עדשות זהה למסגרות.
smoke 7/7 PASS, פריזמה ללא נגיעה.
```

---

*End of SPEC. 14 success criteria, 8 destructive ops declared, 7 stop-triggers, 6 commits expected. Pipeline runs as a single Full-Auto chain through Stage 5.*
