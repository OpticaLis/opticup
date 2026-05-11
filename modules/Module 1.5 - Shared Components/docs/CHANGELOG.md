# Module 1.5 — Shared Components Refactor — CHANGELOG

## 2026-05-11 — Migration #2: Settings + Permissions → Hybrid+Navy (2 LIVE production pages)

SPEC: `MIGRATION_2_SETTINGS_PERMISSIONS` ([folder](specs/MIGRATION_2_SETTINGS_PERMISSIONS/))

Second of 4 production-page migrations to Hybrid+Navy. Two LIVE pages re-skinned in place: `settings.html` (208→212 lines, +4) and `employees.html` (87→91 lines, +4). Per-page commits + per-page git tags enable independent rollback. **Zero functional change** — no JS edits, no DOM-structural changes (just +1 `<style>` element per page in `<head>`), no Supabase contract changes, no shared CSS mutations. Smoke 7/7 PASS on demo tenant. Full-Auto Pipeline ran end-to-end in ONE chat across 5 skills.

**Decision (Daniel 2026-05-11):** Settings + Permissions stay as TWO separate pages in this migration. Tab-consolidation (per Hybrid mockup `permissions.html` showing them merged) is deferred to a separate SPEC after all 4 visual migrations land — that consolidation is structural (routing, event handlers, link migration) and earns its own scope.

**Same vehicle as MIGRATION_1 — page-scope `body { --primary }` override.** Single 4-line block added to each page's `<head>`, immediately before `</head>`:

```
<!-- Hybrid+Navy migration (page-scoped override, MIGRATION_2 2026-05-11) -->
<style>
  body{--primary:#1e3a8a;--primary-dark:#0f172a;--primary-light:#e6f1fb;--accent:#1e40af}
</style>
```

Cascade scopes the new palette to descendants of `<body>` of these 2 pages only. Other ERP pages keep their existing palette via `:root`. Verified by `Invoke-WebRequest /inventory.html` → page-scope confirmed confined.

**Variables.css UNTOUCHED.** Migration #1 already added the 6 Navy/slate tokens (Section 12) — no additional token work needed for Migration #2.

**Module CSS UNTOUCHED.** Discovered during §0 Reality Check: `css/settings.css` ≡ `css/employees.css` byte-identical (md5 `c318c26079c5009995492cad11024484`). Both contain the full app stylesheet plus settings-specific selectors. Touching either would propagate. Logged as F1 finding → future deduplication SPEC. `css/header.css` also untouched (would propagate site-wide).

**Verification:**
- settings.html: line count 208→212 (+1.9%, within ±15%); `<script>` 20→20; `<link rel="stylesheet">` 10→10; DOM tags 137→138 (+1, within ±2%); Navy `#1e3a8a` count 0→1.
- employees.html: line count 87→91 (+4.6%, within ±15%); `<script>` 24→24; `<link rel="stylesheet">` 10→10; DOM tags 55→56 (+1, within ±2%); Navy count 0→1.
- `grep "26215c|534ab7"` → 0 / 0 (regression baseline preserved on both).
- npm run smoke → 7/7 PASS (PIN auth, CRM lead create+RLS, inventory read, storefront homepage, /supersale, cross-module read, no-5xx).
- npm run verify:integrity → exit 0 throughout.
- Iron Rule 32 destructive-ops gate accepted both commits on first attempt (heading-convention lesson from MIGRATION_1 applied: `## 4. Destructive Operations` not `## §4.`).
- Per-page tags `pre-migration-settings` (HEAD pre-C1) + `pre-migration-employees` (HEAD at C1) enable surgical revert: settings or employees individually.
- Localhost-Tester GREEN: both pages return 200, served HTML contains the override block, page-scope confirmed not leaked to inventory.html.

4 skill improvements harvested + applied (2 each to opticup-strategic + opticup-executor):
- **opticup-strategic Author #1:** new optional §3a "Shared Edit Block" in `SPEC_TEMPLATE.md` for multi-file identical-edit SPECs (Migration #3+ benefit immediately).
- **opticup-strategic Author #2:** new "Baselines" sub-table in §0 Reality Check, with `BASE_*` symbols referenced from §3 Success Criteria — pins moment-of-authorship metrics so SPEC drift is caught.
- **opticup-executor #1:** plan to build `scripts/verify-reskin-page.mjs` helper (single-line PASS/FAIL summary, exit code on any FAIL) — eliminates the Bash `&&`-chain abort-on-grep-no-match trap. Reference added to SKILL.md; script creation deferred to Migration #3.
- **opticup-executor #2:** codified `<style>` block placement rule for re-skin SPECs (after last `<link rel="stylesheet">`, immediately before `</head>`).

3 findings opened: F1 (settings.css ≡ employees.css duplication, MEDIUM, → new dedup SPEC), F2 (header.css `var(--primary, #1a237e)` fallback drift, LOW, → TECH_DEBT), F3 (skill SKILL.md user-global vs project-local copies drifted, LOW, → TECH_DEBT). C3 partially resyncs F3 by editing both copies for the 4 skill improvements above.

### Commits

- `b79a778` — feat(settings): migrate to Hybrid+Navy design system
- `3c6618c` — feat(employees): migrate to Hybrid+Navy design system
- `<C3>` — chore(spec): close MIGRATION_2_SETTINGS_PERMISSIONS with retrospective + skill improvements

## 2026-05-11 — Migration #1: Suppliers Debt → Hybrid+Navy (LIVE production page)

SPEC: `MIGRATION_1_SUPPLIERS_DEBT` ([folder](specs/MIGRATION_1_SUPPLIERS_DEBT/))

First of 4 production-page migrations to Hybrid+Navy. The LIVE `suppliers-debt.html` (root of ERP repo) re-skinned in place to the Hybrid+Navy palette with **zero functional change** — no JS edits, no DOM structural changes, no Supabase contract changes. Smoke 7/7 PASS on demo tenant. Full-Auto Pipeline ran end-to-end in ONE chat across 5 skills (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review).

**Key technique — page-scope `body { --primary }` override.** Instead of modifying `css/styles.css :root` (which would cascade to all 17 other unmigrated ERP pages and break the staged migration plan), the page's inline `<style>` block now declares a `body { --primary: #1e3a8a; --primary-dark: #0f172a; --primary-light: #e6f1fb; --accent: #1e40af; }` override. CSS cascade scopes Navy to descendants of `<body>` of this page only. Other ERP pages continue to inherit the legacy Indigo `--primary` from `:root` until their own migration SPEC lands. This pattern is the safe migration vehicle for Migrations #2/#3/#4.

**`shared/css/variables.css` — 6 additive tokens (Section 12).** `--accent-navy`, `--accent-navy-hover`, `--accent-navy-soft`, `--accent-navy-text`, `--text-slate-primary`, `--text-slate-secondary`. Zero deletions, zero renames — Brief Locked Decision #5 honored (existing tokens remain in place until all 4 migrations close).

**4 purple hex swaps** in `suppliers-debt.html` (`.dst-linked`, `.btn-lnk`, `.btn-lnk:hover`, `.rst-shipped`) + **2 standalone blue nudges** (`.dst-open`, `.rst-ready`) + **2 inline-style gray hex → token swaps** on folder-toggle buttons. Semantic colors (success/warning/danger/info) preserved unchanged.

**Verification:**
- Line count 269 → 281 (+4.4%, within ±15% tolerance).
- `<script>` tag count 55 → 55 (exact preservation).
- `<link rel="stylesheet">` tag count 3 → 3 (exact preservation).
- Open HTML tag count 125 → 125 (0% delta).
- `grep "1e3a8a" suppliers-debt.html` → 4 hits (Navy landed).
- `grep "6f42c1|e8dff5|f3eefb"` → 0 hits (legacy purple removed).
- 17/17 DOM ids preserved (`debt-main-content`, `val-total-debt`, `val-due-week`, `val-overdue`, `val-paid-month`, `aging-buckets`, 7× `dtab-*`, `supplier-detail-panel`, `toast-c`, `loading`, `confirm-modal`).
- 3/3 inline onclick handlers preserved (`switchDebtTab`, `toggleExpenseFolders`, `toggleGeneralInvoicesView`).
- 8/8 critical JS+CSS resources return 200 on `localhost:3000`.
- Iron Rule 32 destructive-ops gate passed; Iron Rule 31 integrity gate exit 0 twice.

Pre-commit git tag `pre-migration-suppliers-debt` (at the commit before C1) enables per-page rollback if any post-merge regression surfaces. Per Daniel's batch-merge policy: all 4 production migrations land on `develop`; ONE merge to `main` after all 4 are QA-clean.

4 skill improvements harvested + applied: 2 to `opticup-strategic` (SPEC heading convention `## N.` not `## §N.`; §0 Pre-Authoring Reality Check promoted to template), 2 to `opticup-executor` (inline-hex audit helper; Full-Auto pre-existing-files-leave-alone rule).

### Commits

- `52133b8` — feat(suppliers-debt): migrate to Hybrid+Navy design system
- `<C2>` — chore(spec): close MIGRATION_1_SUPPLIERS_DEBT with retrospective + skill improvements

## 2026-05-11 — Sketch Revision Batch 3 (M5/M6/M8/M11/M12/M14/M15 → Hybrid+Navy)

SPEC: `M1_5_SKETCH_RESKIN_BATCH_3` ([folder](specs/M1_5_SKETCH_RESKIN_BATCH_3/))

Re-skins 17 architecture-brief mockup files across 7 modules from the legacy purple-deep palette to the canonical Hybrid+Navy design system. Structure-preserving: `:root` token swap only, no DOM / content / layout changes. 13 files received heavy transformation (full `:root` + dark-bg sweep + hex rewrites); 4 M12 files received light transformation (neutrals only; WhatsApp/SMS/Email semantics preserved per Brief §2.4). 17 `pre-reskin-M{N}-{stem}` git tags enable independent revert. `reskin.mjs` transformation script retained in SPEC folder as audit artifact.

Final grep `#26215c|#534ab7` returns 0 hits across all 17 files. Hebrew RTL preserved on all. DOM tag count within ±5% per file.

### Commits

- `faaa3b2` feat(m5): reskin architecture-brief sketches to Hybrid+Navy (2 files)
- `92c7f71` feat(m6): reskin architecture-brief sketch to Hybrid+Navy (1 file)
- `933a582` feat(m8): reskin architecture-brief sketches to Hybrid+Navy (4 files)
- `0ba031d` feat(m11): reskin architecture-brief sketches to Hybrid+Navy (3 files)
- `31a0f6d` feat(m12): reskin architecture-brief sketches to Hybrid+Navy (4 files — light mode)
- `28e94c1` feat(m14): reskin architecture-brief sketches to Hybrid+Navy (2 files)
- `6921c1c` feat(m15): reskin architecture-brief sketch to Hybrid+Navy (1 file)
- `<retro>` chore(spec): close M1_5_SKETCH_RESKIN_BATCH_3 with retrospective + docs + skill improvements

## 2026-05-11 — Design System Hybrid Final (consolidates v2 into one platform language)

SPEC: `M1_5_DESIGN_SYSTEM_HYBRID_FINAL` ([folder](specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/))

Consolidates the v2 exploration (Linear A / Stripe B / Notion C) into a single locked-in **Hybrid** design language: Stripe-B structural foundation (hero + metrics + content cards + pills + role tiles) wearing Linear-A sidebar navigation, Navy `#1e3a8a` accent, sans-only typography, no topbar.

- New folder `architecture-brief/design-system-mockups/hybrid-final/` — 7 files: `_tokens.css` (Navy palette + sans-only Inter/Heebo + 14px base + 36px row height + 240px sidebar) + `INDEX.html` (hub with cross-language switch to v2 A/B/C references + iframe preview) + 5 module HTMLs (`storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html`).
- Every module HTML has `class="sidebar"` (Linear-A pattern, 240px, RTL-right via `border-inline-start`), `class="hero"` with H1 + actionable-context sentence + actions, `class="metric-card"` × 4 with Navy `metric-accent` top bar, and module-specific content sections (table density 36px Linear-tight).
- `permissions.html` carries the 4 role-tiles row (B's pattern) + permission matrix with mono permission codes.
- `suppliers-debt.html` carries all 6 real supplier names (Luxottica, Safilo, Marcolin, Hoya, Carl Zeiss Vision, Optical Frame Israel) + age-bar chart in semantic colors (success/info/warning/danger), explicitly NOT Navy.
- Zero violet (`#635bff` / `#a78bfa` / `violet` / `purple` — 0 matches), zero serif typography (no `Source Serif`, no `--font-serif` token; `serif` appears only as the absolute last fallback inside `--font-sans` system chain), zero topbar.

All 7 files: RTL Hebrew (`lang="he" dir="rtl"`), light-mode only, every file ≤350 lines (Rule 12). Integrity gate exit 0. Smoke suite 7/7 PASS.

The 3 prior language folders (`language-{a,b,c}-*/`) remain untouched as historical reference per SPEC §2. Per-module migration of production HTML to Hybrid is a future SPEC chain.

### Commits

- `d38d3c7` — feat(design): scaffold hybrid-final tokens + INDEX skeleton
- `1ba6b18` — feat(design): hybrid-final — 5 module screens (Stripe structure + Linear nav + Navy palette)
- (Commit 3 hash TBD) — chore(spec): close M1_5_DESIGN_SYSTEM_HYBRID_FINAL with retrospective

Push: incremental, one push per commit (per SPEC §9 strict rules).

## 2026-05-11 — Design System Phase 3 v2 (Authentic Languages — supersedes v1)

SPEC: `M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES` ([folder](specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/))

Replaces Phase 3 v1 entirely. v1 produced 45 HTML files that failed the design-language distinctness goal (executor staticized production HTML + near-empty `_tokens.css`). v2 authors 21 HTML files from scratch using authentic per-language design treatment.

- New folder `architecture-brief/design-system-mockups/language-a-linear/` — 7 files: `INDEX.html` (hub with 3-language switch + 5-screen left rail + iframe preview) + `_tokens.css` (54 CSS custom properties — pure-white base, indigo accent, Inter 14px, soft borders) + 5 module HTMLs (storefront-studio, permissions, shipments, settings, suppliers-debt). Linear/Vercel identity: sidebar+breadcrumb DOM.
- New folder `architecture-brief/design-system-mockups/language-b-stripe/` — 7 files (same structure). `_tokens.css` = 68 properties (warm off-white base, deep violet #635bff with gradient pair, Source Serif headings, layered shadows, 12px radii). Top-bar+hero DOM with metric tiles.
- New folder `architecture-brief/design-system-mockups/language-c-notion/` — 7 files (same structure). `_tokens.css` = 65 properties (cool off-white, pastel accent trio, Inter 16px, near-zero shadows, 10-20px round corners). Minimalist left-rail DOM with emoji glyphs.
- v1 archival: 45 files (3 directions × 15 each) moved via `git mv` to `_archive/design-system-mockups-v1-staticized/direction-*/` — full history preserved.
- Module docs synced (this CHANGELOG, MODULE_MAP §0 Phase 3 v2 section, SESSION_CONTEXT current status + Phase 3 v2 entry); MASTER_ROADMAP §6 Phase 3 v2 replacement.

All 21 HTML files: RTL Hebrew, light backgrounds (no #00-#1F page colors), zero hex literals in module `style=` attributes (var(--token) throughout), every file ≤250 lines (well under Rule 12 cap of 350). Integrity gate clean. Smoke suite 7/7 PASS.

### Commits
- `3057b15` — chore(design): archive Phase 3 v1 mockups (staticized) to _archive/
- `29c1a79` — feat(design): scaffold language-a-linear tokens + INDEX skeleton
- `0ba6df7` — feat(design): language-a-linear — 5 module screens (Linear/Vercel)
- `8c9f874` — feat(design): language-a-linear INDEX with cross-language switch + nav
- `745aece` — feat(design): scaffold language-b-stripe tokens + INDEX skeleton
- `269cd0a` — feat(design): language-b-stripe — 5 module screens (Stripe Dashboard)
- `4f37d6a` — feat(design): language-b-stripe INDEX with cross-language switch + nav
- `af06c56` — feat(design): scaffold language-c-notion tokens + INDEX skeleton
- `0502545` — feat(design): language-c-notion — 5 module screens (Notion/Airy)
- `63d1601` — feat(design): language-c-notion INDEX with cross-language switch + nav
- (Commit 11 hash TBD) — chore(spec): close M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES with retrospective

Push: at SPEC close (all 11 commits in one push to origin/develop). FOREMAN_REVIEW.md deferred until after Daniel picks a winning language (per SPEC §14).

## 2026-05-11 — Design System Phase 3b: Direction 2 (Modern-clean) mockup tree (PUSH PENDING)

SPEC: `M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN` ([folder](specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN/))

- New folder `architecture-brief/design-system-mockups/direction-2-modern-clean/` with 15 files: 13 module HTMLs (M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15) + INDEX.html (top-bar 3-direction switch + left-nav 13 anchors that navigate the iframe via `target="preview-frame"`; NO Prizma override toggle — directions 2+3 showcase platform-default rendering per parent §5+§6) + `_tokens.css` overriding body font-size to 1.0rem, --space-md to 16px, --space-lg/xl/2xl to 24/32/48px, --radius-md to 12px, --radius-lg to 16px, plus softer/bigger shadows (`rgba(15,23,42,0.04→0.10)`) and `--color-bg-page: #fafafa` for the airy Notion/Linear/modern-fintech aesthetic.
- Production-sourced HTMLs (M1/M3-studio/M4) staticized: all `<script>` removed (including Supabase CDN, ZXing, SheetJS, shared.js, auth-service, page scripts), Google Fonts external link removed, ALL local `<link rel="stylesheet">` blocks replaced with the canonical direction-2 chain (8 shared CSS + `_tokens.css` last) injected before `</head>`. Mock Hebrew rows injected into the inventory tbody (5 representative rows) and the CRM leads tbody (4 rows). Design-mockup banner appended right after `<body>` for context.
- Mockup-sourced HTMLs (M5–M15) sketch-preserved; inline `style="..."` declarations whose value contains `#XXXXXX` literals dropped; `<style>` blocks scrubbed line-by-line of hex literals (Rule 9 — no hardcoded colors in style attrs). Direction-2 stylesheet chain injected before `</head>`.
- Helper script `_staticize-tmp.mjs` used at repo root for bulk transformation and removed pre-commit (one-shot — Phase 3a's `scripts/transform-mockup-d1.mjs` is the canonical retained version).

### Commits
- `0d19300` — scaffold (_tokens.css + INDEX.html)
- `cebb7df` — M1, M3-studio, M4, M5, M6 (5 modules)
- `17cd086` — M7, M8, M9, M11, M12 (5 modules)
- (Commit 4 hash TBD) — M13, M14, M15 + docs (MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP)
- (Commit 5 hash TBD) — close SPEC with retrospective

**PUSH PENDING** — per Daniel directive 2026-05-11, commits remain local; push deferred to Daniel manual review.

## 2026-05-11 — Design System Phase 3a: Direction 1 (Conservative) mockup tree (PUSH PENDING)

SPEC: `M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE` ([folder](specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE/))

- New folder `architecture-brief/design-system-mockups/direction-1-conservative/` with 15 files: 13 module HTMLs (M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15) + INDEX.html (top-bar 3-direction switch + left-nav 13 module links + iframe preview + Prizma override toggle) + `_tokens.css` (intentionally minimal — Conservative inherits platform defaults).
- Production-sourced HTMLs (M1/M3-studio/M4) staticized: all `<script>` removed, all page CSS (`css/*.css`) removed, Google Fonts external link removed, mock Hebrew content injected into first `<main>` (~14-row inventory table for D1 anti-blandness density target). Direction stylesheet chain (8 shared CSS + `_tokens.css`) added before `</head>`.
- Mockup-sourced HTMLs (M5–M15) copied verbatim; `<script>` stripped; inline-style hex literals replaced with `transparent` (Rule 9 — no hardcoded colors in `style=""`); direction stylesheet chain appended before `</head>`. `<style>` blocks PRESERVED for sketch-preservation (custom classes the shared CSS doesn't cover).
- Helper script `scripts/transform-mockup-d1.mjs` codifies the transformation (kept in tree for 3b/3c reuse — see SPEC retro proposal #1).

### Commits
- `676608e` — scaffold (_tokens.css + INDEX.html)
- `ae4a16e` — M1, M3-studio, M4, M5, M6 (5 modules) + transform script
- `46276ce` — M7, M8, M9, M11, M12 (5 modules)
- (Commit 4 hash TBD) — M13, M14, M15 + docs (MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP)
- (Commit 5 hash TBD) — close SPEC with retrospective

**PUSH PENDING** — per Daniel directive 2026-05-11, commits remain local; push deferred to Daniel manual review.

## 2026-05-11 — Design System Phase 2: Component library token-only + focus-visible baseline

SPEC: `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` ([folder](specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/))

- All 7 component CSS files now use bare `var(--token)` references — no `, #fallback` literals left. 15 sites cleaned (12 hex fallbacks in modal.css digit-suffixed vars caught after SPEC criterion #4's regex bug fix; 3 stale `--g{100,300,400}` refs in table.css fixed to canonical `--color-gray-{100,300,400}`). variables.css is the only source of color truth.
- New tokens: `--color-focus-ring` (tracks primary), `--shadow-focus` (3px near-black ring at 35% opacity). WCAG 2.4.7 baseline.
- `:focus-visible` baseline added across components.css/forms.css/modal.css/table.css/toast.css. Existing `:focus { outline:none; border-color/box-shadow:... }` rules in components.css (.input/.select/.textarea) converted to `:focus + :focus-visible` pair pattern. Mouse-click no longer triggers a focus ring; keyboard Tab does.
- JS APIs UNCHANGED (Modal/Toast/TableBuilder/promptPin frozen per Brief Contract B).

### Commits
- d4f5f99: add --color-focus-ring + --shadow-focus tokens
- b8d7e8a: remove modal.css `var(--TOKEN, #hex)` hex-fallback literals (11 initial sites)
- a37aafe: finalize hex-fallback cleanup — modal.css digit-suffixed vars + table.css stale --gN refs (15 more sites)
- e9c555c: :focus-visible baseline across components/forms/modal/table/toast

Rationale: prep for Phase 3 (3-direction mockups) — directions override `--color-focus-ring` per-direction without touching JS or component CSS.

## 2026-05-11 — Design System Phase 1: Neutral platform defaults

SPEC: `M1_5_DESIGN_TOKENS_FOUNDATION` ([folder](specs/M1_5_DESIGN_TOKENS_FOUNDATION/))

- `shared/css/variables.css`: 4 primary color tokens swapped from Indigo to neutral (Slate-900 / Slate-800 / Slate-100 / pure black). `--font-family` unchanged (Heebo). Daniel decision 2026-05-10: "ניטרלי לגמרי — שחור-לבן בלבד".
- DB migration `2026-05-11_design_tokens_neutral_defaults.sql`: Prizma `ui_config` JSONB populated with Indigo overrides; Prizma renders unchanged after swap. Demo tenant untouched.
- M1.5 `db-schema.sql` ui_config example refreshed; `MODULE_MAP.md` §4 updated.

Rationale: Design System brief (2026-05-10) — platform default must be brand-free so future tenants don't inherit Prizma residue.

### Commits
- a89d9d9: variables.css token swap to neutral slate
- 9dc89e6: tenants.ui_config migration — Prizma Indigo override applied

## Phase 6 — UI Facelift ✅ (2026-03-19)

### Commits
- 6767a2c: Indigo primary palette (#4f46e5) + Slate gray scale in variables.css (12 variables changed)
- a7a17ef: Legacy --primary alias in variables.css (bridges header.css/index.html)
- 4e9949f: Page CSS :root blocks — replaced hardcoded --primary with var(--color-primary) in inventory.css, shipments.css, employees.css, settings.css

### What Changed
- **Primary colors:** dark navy (#1a237e) → Indigo (#4f46e5/#4338ca/#eef2ff/#3730a3)
- **Gray scale:** Tailwind Gray (warm) → Tailwind Slate (cool) — 9 values updated for harmony with Indigo
- **Legacy bridge:** `--primary: var(--color-primary)` alias ensures header.css and page CSS consume new values
- **No JS/HTML changes.** No logic changes. No DB changes. CSS values only.

### Verification
- ui-test.html: 15/15 component sections passed
- All 6 pages × 2 tenants: CSS variables correct, zero console errors
- Mobile (375px), RTL, print: no breakage
- Tenant theming: Prizma=Indigo default, Demo=green override — both work
- suppliers-debt.html: backward compat (uses styles.css, minor shade difference — deferred)

---

## QA Phase — Full Regression ✅ (2026-03-19)

### Commits
- 9d2761d: QA Step 1: clone-tenant and cleanup-tenant SQL scripts
- b1e7e67: QA Step 1: fix employees PIN uniqueness in clone script
- 57410ed: QA Step 1: generate unique PINs for cloned employees
- 85daa0d: QA Step 2: slug-based tenant resolution on login
- 4ccf86a: QA: fix theme loading and permissions for multi-tenant
- fd412b5: QA: proper multi-tenant permissions schema (no prefix hack)
- d874b1f: QA: fix print rules, header mobile, modal RTL positioning

### Changes
- Clone tenant script: 39 tables with FK mapping, barcode D prefix, 19 temp mapping tables
- Slug-based tenant resolution: ?t=demo URL param, tenant picker, dynamic TENANT_SLUG
- Theme loading: legacy variable mapping (--color-primary → --primary), ui_config in header.js
- Permissions schema: roles/permissions/role_permissions PK now includes tenant_id
- Print rules: modal-overlay + toast-container hidden in @media print
- Header mobile: truncation with ellipsis at 600px breakpoint
- auth-service.js: tenant name caching, name in tenant config query

### Test Results
- Tenant isolation: 16/16 PASS
- Visual consistency: 18/19 (1 fixed)
- RTL: 5/5 PASS
- Mobile: 4/4 PASS
- Print: 3/3 PASS (1 fixed)
- Inventory regression: 12/12 PASS
- Shipments regression: 5/5 PASS
- Employees regression: 7/7 PASS
- Settings regression: 5/5 PASS
- Suppliers debt backward compat: 8/8 PASS

---

## Phase 5 — Cleanup & Hardening ✅ (2026-03-18)

### Commits
- b8789ed: Phase 5 Step 0: migration map for all 5 pages
- 653e217: Phase 5 Step 1: zero hardcoded business values scan and fix
- b209a90: Phase 5 Step 2: custom_fields JSONB column on inventory
- a98408c: Phase 5 Step 3: PinModal namespace + promptSyncPin collision fix
- ff41a0b: Phase 5 Steps 4-5: theme hook + wrapper strategy + inventory CSS migration
- cd8862a: Phase 5 Steps 6-8: inventory manual migrations (alerts, modals, permissions)
- f7f6a56: Phase 5 Steps 9-12: inventory regression + employees/settings/index CSS migration
- 8d51bb1: Phase 5 Steps 13-15: shipments.html full migration

### New Files
- css/inventory.css, css/employees.css, css/settings.css, css/shipments.css (page-specific styles)
- PHASE_5_MIGRATION_MAP.md (140-item scan of all 5 pages)

### DB Changes
- ALTER TABLE inventory ADD COLUMN custom_fields JSONB DEFAULT '{}'

### Modified Files (15)
- js/shared.js — wrapper strategy (toast/confirmDialog/showInfoModal delegate to shared/)
- js/auth-service.js — applyUIPermissions() delegates to PermissionUI.apply()
- js/header.js — loadTenantTheme() hook
- shared/js/pin-modal.js — PinModal namespace added
- shared/js/permission-ui.js — data-tab-permission support
- modules/access-sync/sync-details.js — promptSyncPin rename
- modules/inventory/inventory-edit.js — PinModal.prompt() migration
- modules/audit/audit-log.js — PinModal.prompt() migration
- modules/shipments/shipments-lock.js — native confirm() replaced
- inventory.html, employees.html, settings.html, index.html, shipments.html — CSS + JS migration

### Phase Summary
- 5 pages migrated to shared/ CSS + JS (suppliers-debt deferred)
- Wrapper strategy covers ~200+ toast/confirm/modal call sites automatically
- 2 PIN modals replaced with PinModal.prompt(), 2 native confirm() replaced
- custom_fields JSONB ready for per-tenant dynamic fields
- Zero console errors on all 6 pages

---

## Phase 4 — Table Builder + Permissions ✅ (2026-03-18)

### Commits
- 6cdb546: Phase 4 Step 1: create shared/css/table.css — table builder styles
- 7027f98: Phase 4 Step 2: create shared/js/table-builder.js — TableBuilder API
- bd78b50: Phase 4 Step 3: create shared/tests/table-test.html — TableBuilder test page
- 9661ebb: Phase 4 Step 4: fix TableBuilder — double-escaping, sticky header, test page
- fe8dfc9: Phase 4 Step 5: create shared/js/permission-ui.js — permission-aware UI
- f06e700: Phase 4 Step 6: create shared/tests/permission-test.html — PermissionUI test page

### New Files
- shared/css/table.css (150 lines) — Table builder CSS: wrapper, header, rows, sort indicators (▲▼ via data-sort-dir), empty/loading states, zebra, sticky header, RTL logical properties, responsive
- shared/js/table-builder.js (296 lines) — TableBuilder.create → TableInstance with setData/setLoading/updateRow/removeRow/getData/destroy. 7 column types, external sort, XSS-safe
- shared/js/permission-ui.js (53 lines) — PermissionUI.apply/applyTo/check. data-permission attributes, hide/disable modes, OR logic, hasPermission wrapper
- shared/tests/table-test.html (235 lines) — 9 sections, 21 tests for Table Builder
- shared/tests/permission-test.html (190 lines) — 7 sections, 22 tests for PermissionUI

### DB Changes
- None (JS + CSS only)

### Bug Fixes
- table-builder.js: text renderer returned escaped HTML but textContent double-escaped it. Fix: renderers return plain text
- table.css: overflow-x:auto on wrapper created scroll context breaking position:sticky. Fix: .tb-wrapper-sticky sets overflow-x:visible
- table-test.html: shared.js requires Supabase lib. Fix: inline escapeHtml() standalone

### Testing
- Table Builder: 21/21 PASS (3 bugs found and fixed)
- PermissionUI: 22/22 PASS (zero fixes needed)
- Regression: 6/6 pages PASS, zero console errors

### Phase Summary
- 5 new files, ~924 lines of new code
- 0 modified existing files (zero changes to pages)
- 0 DB changes, 0 breaking changes

---

## Phase 3 — Data Layer ✅ (2026-03-18)

### Commits
- 130dec9: Phase 3 Step 1: create activity_log table with RLS and indexes
- cc52a4b: Phase 3 Step 2: create supabase-client.js with DB wrapper
- 13c98e3: Phase 3 Step 3: create db-test.html for DB wrapper testing
- a485cef: Phase 3 Step 3 fix: correct RLS policy pattern + test auth init
- b0acde3: Phase 3 Step 5: create activity-logger.js
- d221951: Phase 3 Step 6: create activity-log-test.html
- 61f810d: Phase 3 Step 7: fix activity-logger branch_id UUID validation
- e3456c0: Phase 3 Step 9a: atomic fix — po-view-import uses increment_inventory RPC
- 5f07211: Phase 3 Step 9b: atomic fix — debt-payment-alloc uses increment_paid_amount RPC
- 9ec6cdc: Phase 3 Step 9c: atomic fix — receipt-debt uses increment_prepaid_used RPC
- 44776bd: Phase 3 Step 9d: atomic fix — shipments-lock uses increment_shipment_counters RPC

### New Files
- shared/js/supabase-client.js (263 lines) — DB.select/insert/update/batchUpdate/softDelete/hardDelete/rpc, CSS-only spinner (200ms debounce), error classification, tenant_id auto-inject
- shared/js/activity-logger.js (90 lines) — ActivityLog.write/warning/error/critical, fire-and-forget, auto-inject tenant_id/user_id/branch_id
- shared/tests/db-test.html (325 lines) — 9 sections, 20 tests for DB wrapper
- shared/tests/activity-log-test.html (251 lines) — 8 sections, 15 tests for Activity Log

### DB Changes
- CREATE TABLE activity_log (id, tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details JSONB, ip_address, user_agent, created_at) + RLS + 5 indexes
- T.ACTIVITY_LOG constant added to shared.js
- 3 new RPC functions: increment_paid_amount, increment_prepaid_used, increment_shipment_counters

### Modified Files (Atomic RPC fixes)
- modules/purchasing/po-view-import.js — read→compute→write replaced with increment_inventory RPC
- modules/debt/debt-payment-alloc.js — read→compute→write replaced with increment_paid_amount RPC
- modules/goods-receipts/receipt-debt.js — read→compute→write replaced with increment_prepaid_used RPC
- modules/shipments/shipments-lock.js — read→compute→write replaced with increment_shipment_counters RPC

### Bug Fixes
- RLS policy on activity_log corrected from current_setting('app.tenant_id') to request.jwt.claims pattern
- activity-logger.js branch_id UUID validation: skip non-UUID legacy "00" string

### Phase Summary
- 4 new files, ~930 lines of new code
- 4 modified module files (atomic RPC fixes)
- 1 new DB table, 3 new RPC functions, 0 breaking changes
- Atomic RPC scan: 20 patterns checked, 0 remaining read→compute→write patterns

---

## Phase 2 — Core UI Components (2026-03-17)

### New Files
- shared/css/modal.css (233 lines) — Modal CSS: overlay, 5 sizes, 5 types, animations, stack, wizard progress
- shared/js/modal-builder.js (261 lines) — Modal.show/confirm/alert/danger/form/close/closeAll, stack, focus trap, scroll lock
- shared/js/modal-wizard.js (144 lines) — Modal.wizard() extension, multi-step progress, validate/onEnter/onLeave
- shared/css/toast.css (155 lines) — Toast CSS: 4 types, animations, progress bar, RTL
- shared/js/toast.js (131 lines) — Toast.success/error/warning/info/dismiss/clear, max 5, dedup, XSS-safe
- shared/js/pin-modal.js (123 lines) — PIN prompt migration, Modal.show() internally, identical promptPin(title, callback) API
- shared/tests/modal-test.html (251 lines) — sizes, types, stack, keyboard, XSS tests
- shared/tests/toast-test.html (155 lines) — types, duration, stack, dedup, XSS, no-close tests

### Modified Files
- js/pin-modal.js — replaced with 5-line redirect to shared/js/pin-modal.js
- inventory.html — added shared/css/modal.css and shared/js/modal-builder.js
- suppliers-debt.html — added shared/css/modal.css and shared/js/modal-builder.js
- CLAUDE.md — added Iron Rule #12 (global name collision check)

### Bug Fix
- Wizard onFinish/onCancel mutual exclusivity: _finished flag prevents onCancel on successful finish

### Testing
- Modal: 17/17 PASS, Toast: 17/17 PASS, PIN: 8/8 PASS, Regression: 8/8 PASS

### Phase Summary
- 8 new files, ~1,450 lines of new code
- 3 modified HTML files, 1 redirect file
- 0 DB changes, 0 breaking changes

---

## Phase 1 — CSS Foundation ✅ (2026-03-17)

### Commits
- bf36be1: Phase 1 Steps 1-2: Create variables.css with design tokens, init MODULE_MAP and db-schema
- 1d9ff8a: Phase 1 Step 3: Create components.css — buttons, inputs, badges, cards, tables, panels, skeleton, accordion
- c34d1ba: Phase 1 Steps 4-5: Create layout.css and forms.css
- 5ac1d66: Phase 1 Steps 6-7: Create theme-loader.js and ui-test.html test page with 3-palette theme switcher
- (this commit): Phase 1 Step 8: Integration Ceremony — backup, docs update, GLOBAL integration, tag v1.5-phase1

### Summary
- **DB:** ALTER TABLE tenants ADD COLUMN ui_config JSONB DEFAULT '{}'
- **CSS:** 5 files (variables.css 157L, components.css 254L, components-extra.css 214L, layout.css 201L, forms.css 146L) — 70 CSS variables, zero hardcoded colors/sizes/spacing
- **JS:** theme-loader.js (42L) — loadTenantTheme() injects per-tenant CSS overrides from ui_config JSONB
- **Tests:** ui-test.html (252L) — 13 component sections, 3-palette theme switcher proving theming mechanism
- **Verification:** 6 existing pages regression-tested (0 errors), all CSS integrity checks pass, theme-loader edge cases pass

---

## Phase 0 — Infrastructure Setup ✅ (2026-03-17)

### Commits
- ba841d8: Create GLOBAL_MAP.md — global project reference
- b67956e: Create GLOBAL_SCHEMA.sql — full database reference
- 751c146: Update CLAUDE.md — multi-module architecture, global docs, authority matrix
- a81c1c1: Phase 0 fixes: rename ROADMAP, remove non-existent contracts, document RLS known debt
- 7a6fe58: Add RLS permissive warnings to GLOBAL_MAP for 9 tables

### Summary
- Created docs/GLOBAL_MAP.md (full function registry, contracts, module registry, DB ownership)
- Created docs/GLOBAL_SCHEMA.sql (50 tables, full schema)
- Updated CLAUDE.md with multi-module architecture, branching, authority matrix
- Created Module 1.5 directory structure + docs
- Created shared/ directories (css, js, tests)

## 2026-05-11 — Full-Auto Pipeline bootstrap (M1_5_FULL_AUTO_PIPELINE)

- 87b888f: feat(spec): scaffold M1_5_FULL_AUTO_PIPELINE — Iron Rule 32 + backup-discipline upgrade in CLAUDE.md
- 9d3dd10: feat(scripts): add destructive-ops-declared.mjs + wire into verify.mjs (Iron Rule 32)
- 37c095e: feat(infra): scaffold escalation folders + template in M1.5 / M3 / M4
- 25f40e6: feat(skill): opticup-strategic — Pipeline Hand-off + Pipeline Closure + Mode Detection + Hebrew status line
- 6d50633: feat(skill): opticup-executor — Pipeline Hand-off + auto-backups + Hebrew status line
- 66a4bdf: feat(skill): opticup-reviewer — Pipeline Hand-off + Hebrew status line
- 8081696: feat(skill): opticup-localhost-tester — Pipeline Hand-off + Hebrew status line; update AGENT_CHAIN_PROTOCOL Full-Auto section
- ebd19f7: test(pipeline): run Test SPEC #1 (docs-only) end-to-end in one chat — M1_5_FULL_AUTO_TEST_1_DOCS_ONLY CLOSED 🟢
- 576195f: test(pipeline): run Test SPEC #2 (small code) end-to-end including smoke 7/7 — M1_5_FULL_AUTO_TEST_2_CODE_CHANGE CLOSED 🟢

### Summary
- New pipeline: Full-Auto Mode (Pipeline mode: full-auto) — every new SPEC runs end-to-end in ONE Claude Code chat via skill chaining.
- New Iron Rule 32 + enforcement script (destructive-ops-declared.mjs).
- Backups discipline upgraded: automatic auto-trigger replaces the old "before major restructuring" guidance.
- Escalation protocol: files + ≤60-char Hebrew status lines + Architect Decision block ingestion.
