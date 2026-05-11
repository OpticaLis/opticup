# Module 1.5 — Shared Components Refactor — SESSION_CONTEXT

## Current Status
- **Phase:** Design System initiative — **Hybrid Final delivered** (`M1_5_DESIGN_SYSTEM_HYBRID_FINAL`, 2026-05-11). 7 new files under `architecture-brief/design-system-mockups/hybrid-final/` (Stripe-B structure × Linear-A sidebar × Navy `#1e3a8a` accent, sans-only). The Hybrid mockups are the platform's locked-in design language. Phase 3 v2 (3 authentic languages) remains as historical reference. Per-module migration of production HTML to Hybrid is a future SPEC chain.
- **Branch:** develop
- **Last updated:** 2026-05-11 (Design System Hybrid Final closed — single consolidating language).

## 2026-05-11 — Design System Hybrid Final (consolidates v2 into one language)

`M1_5_DESIGN_SYSTEM_HYBRID_FINAL` SPEC closed. Built **7 files** under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/`:

- `_tokens.css` (~300 lines) — Navy `#1e3a8a` accent + `#e6f1fb` soft tint, Inter + Heebo sans-only (no `--font-serif` token), 14px base for density, 12px card radius / 8px button radius / 999px pill radius, 36px tight row height (Linear-style), 240px sidebar width.
- `INDEX.html` — landing hub with header `lang-switch` linking to the 3 historical reference languages + iframe preview of the 5 module screens.
- 5 module HTMLs (`storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html`) — every screen has `class="sidebar"` (Linear-A pattern, RTL-right via `border-inline-start`), `class="hero"` with H1 + actionable context sentence, `class="metric-card"` × 4 with `metric-accent` Navy top bar, content cards / role tiles / pills / dense tables. `suppliers-debt.html` carries all 6 real supplier names (Luxottica, Safilo, Marcolin, Hoya, Carl Zeiss Vision, Optical Frame Israel).

All 7 files: RTL Hebrew (`lang="he" dir="rtl"`), light-mode only, sans-only typography, zero violet / zero `--font-serif` / zero topbar (sidebar replaces v2-B's top nav). Self-contained — Google Fonts only external dependency. Integrity gate exit 0. Smoke suite 7/7 PASS.

The 3 prior language folders (`language-{a,b,c}-*/`) are untouched and remain as historical reference per SPEC §2. v1 staying archived. Per-module migration of production HTML to the Hybrid language is a future SPEC chain.

## 2026-05-11 — Design System Phase 3 v2 (Authentic Languages — supersedes v1)

`M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES` SPEC closed. 21 HTML files + 3 `_tokens.css` written under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/`:

- **`language-a-linear/`** — Linear/Vercel: pure-white base, subtle indigo (#6366f1) accent, Inter/Heebo 14px, borders preferred over shadows, 6-12px radii, tight Linear-density rows. Sidebar nav + top breadcrumbs. _tokens.css = 54 active CSS custom properties.
- **`language-b-stripe/`** — Stripe Dashboard: warm off-white base (#f7f6f3), deep violet (#635bff) with gradient pair, Source Serif headings + Inter body 15px, soft layered shadows, 12px radii. Top-bar nav with hero + metric tiles. _tokens.css = 68 properties.
- **`language-c-notion/`** — Notion/Airy: cool off-white (#fcfcfa), pastel accent trio (lavender/teal/coral/amber), Inter 16px, near-zero shadows, 10-20px round corners + pill buttons, emoji-led navigation. Minimalist left rail (no top bar). _tokens.css = 65 properties.

Each language has the same 5 operational screens: Storefront Studio, Permissions, Shipments+Boxes, Settings, Suppliers Debt. All screens RTL Hebrew, light-background, self-contained (Google Fonts only external dep), authored from scratch — NOT staticized from production HTML (counter-measure to v1's failure root cause). Glance-test acceptance: opening `language-{a,b,c}-*/INDEX.html` side-by-side, the 3 languages differ at 2-second glance in palette, typography, density, surface treatment, decorative details.

**v1 archived (not deleted):** 45 staticized files moved via `git mv` to `_archive/design-system-mockups-v1-staticized/direction-{1-conservative,2-modern-clean,3-bold-dense-pro-tool}/` — preserved for record and blame archaeology. v1 SPEC folders remain in `docs/specs/` as historical retrospective.

Phase 4 (`M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE`) now unblocks — Daniel reviews the 3 INDEX hubs side-by-side and picks the winning language. FOREMAN_REVIEW for this SPEC is deferred to after Daniel's pick (per SPEC §14 — review captures both execution quality and the winner).

## Historical (v1 — superseded 2026-05-11)

## 2026-05-11 — Design System Phase 3c (Direction 3 — Bold dense-pro-tool)

`M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL` SPEC closed (PUSH PENDING). 15 files written under `architecture-brief/design-system-mockups/direction-3-bold-dense-pro-tool/`: 13 module HTMLs covering M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15 + `INDEX.html` (top-bar 3-direction switch + left-nav 13 buttons + iframe preview; NO Prizma toggle — Direction 1 owns the per-tenant override demo per parent §5) + `_tokens.css` overriding `--font-size-md: 0.78rem`, `--space-md: 6px`, `--radius-md: 2px`, replacing soft shadows with border-like 1px lines, and adding a `tabular-nums` helper for `[data-numeric]` / `.tb-td-currency` / `.tb-td-number` / `.tb-td-date`. INDEX chrome itself tuned to dense-pro-tool aesthetic (6-14px padding, 0.78rem body, 2px radii). Production HTMLs (M1/M3-studio/M4) staticized via `scripts/transform-mockup-d3.mjs` (sibling of `transform-mockup-d1.mjs` — same transform logic, different DEST + denser mock blocks; inventory mock has 28 rows targeting criterion #18 density ≥ 22). Mockup HTMLs (M5–M15) sketch-preserved with inline-style hex literals replaced with `transparent`. Daniel directive: commits remain LOCAL — push deferred. Phase 4 ("which direction wins?") now unblocked — awaits Daniel's pick.

## 2026-05-11 — Design System Phase 3b (Direction 2 — Modern-clean)

`M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN` SPEC closed (PUSH PENDING). 15 files written under `architecture-brief/design-system-mockups/direction-2-modern-clean/`: 13 module HTMLs covering M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15 + `INDEX.html` (top-bar 3-direction switch + left-nav 13 anchor links targeting an iframe via `target="preview-frame"` — directions 2+3 OMIT the Prizma override toggle per parent §5+§6) + `_tokens.css` overriding body font-size to 1.0rem, --space-md to 16px, --radius-md to 12px, plus softer/bigger shadows (rgba(15,23,42,0.04→0.10)) for the airy SaaS-default aesthetic. Production HTMLs (M1/M3-studio/M4) staticized (zero `<script>` refs; auth/page CSS removed; mock Hebrew rows injected into inventory + leads tables). Mockup HTMLs (M5–M15) sketch-preserved with inline-style hex declarations stripped and `<style>` blocks scrubbed of hex literals (Rule 9). Helper script `_staticize-tmp.mjs` used for bulk transformation and removed pre-commit (one-shot — Phase 3a's `transform-mockup-d1.mjs` is the canonical version retained for 3c reuse). Daniel directive: commits remain LOCAL — push deferred. Phase 3c (Bold dense-pro-tool) ready for dispatch.

## 2026-05-11 — Design System Phase 3a (Direction 1 — Conservative)

`M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE` SPEC closed (PUSH PENDING). 15 files written under `architecture-brief/design-system-mockups/direction-1-conservative/`: 13 module HTMLs covering M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15 + `INDEX.html` (top-bar 3-direction switch + left-nav 13 anchor links + iframe preview + Prizma override toggle live in this direction only) + minimal `_tokens.css` (Conservative inherits platform defaults — no active overrides). Production HTMLs (M1/M3/M4) staticized (zero `<script>` refs, zero `css/*.css` page-CSS refs, mock Hebrew content injected). Mockup HTMLs (M5–M15) sketch-preserved with inline-style hex literals stripped (replaced with `transparent`). Helper script `scripts/transform-mockup-d1.mjs` preserved for 3b/3c reuse. Daniel directive: commits remain LOCAL — push deferred. Phases 3b (Modern-clean) + 3c (Bold dense-pro-tool) ready for dispatch.

## 2026-05-11 — Design System Phase 2 (component library)

`M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` SPEC closed. All component CSS now consumes bare `var(--token)` (15 hex-fallback sites cleaned + 3 stale `--gN` references fixed). New tokens `--color-focus-ring` + `--shadow-focus`. `:focus-visible` baseline across 5 component files per WCAG 2.4.7. Mouse-click no longer shows focus ring; keyboard Tab does. JS APIs untouched. Unblocks Phase 3 (3-direction mockups for 13 modules).

## 2026-05-11 — Design System Phase 1 (neutral defaults)

`M1_5_DESIGN_TOKENS_FOUNDATION` SPEC closed. `shared/css/variables.css` defaults are now tenant-neutral (Slate-900 near-black primary, no brand color). Prizma's Indigo identity moved to `tenants.ui_config` via JSONB merge — same render, different source. Demo tenant untouched (still green via existing ui_config override). This unblocks Design System Phase 2 (component restyle), Phase 3 (3-direction mockups for 13 modules), and Phase 4 (a11y + tenant theming UI).

## 2026-05-09 — Status refresh

Module 1.5 has remained stable since 2026-03-19. Maintenance touches landed via cross-cutting SPECs (not M1.5-internal):
- `M1_5_SAAS_FORMAT_MONEY` (overnight hybrid, ~late-April) — `formatMoney()` helper added to `js/shared.js`; consumers in M1, M3 Studio adopted it. Module 1.5's `shared/js/table-builder.js currency` renderer now soft-deps on `formatMoney` (added 2026-05-09 by `OVERNIGHT_HYGIENE_SWEEP_2026_05_09` Item 4 — Sentinel M-6).
- `STRUCTURE_PROTECTIONS_SPEC` (2026-05-09) — added pre-commit `check-root-discipline.mjs` for repo-level discipline; no M1.5 internals touched.
- `MODULES_HOME_UNIFICATION_SPEC` (2026-05-09) — moved in-design module Briefs (M5–M15) into `modules/Module N - Name/architecture-brief/`. M1.5 is in `modules/`; was not affected.

No Module 1.5–internal SPEC has shipped since Phase 6 closed. The shared-components platform (Modal, Toast, TableBuilder, DB wrapper, ActivityLog, PIN modal, theme-loader) is feature-complete relative to current consumer needs. Future M1.5 work is reactive: when M5–M15 SPECs need a new shared component, they request it through Module 1.5.

---

## Original Status (pre-2026-05-09)
- **Phase:** 6 complete ✅. Module 1.5 DONE (including UI facelift).
- **Branch:** develop
- **Last session:** 2026-03-19

## What Was Done — Phase 6 (UI Facelift)

### Step 1: Indigo primary + Slate gray scale (commit 6767a2c)
- variables.css: primary colors changed from dark navy (#1a237e) to Indigo (#4f46e5/#4338ca/#eef2ff/#3730a3)
- variables.css: gray scale changed from Tailwind Gray (warm) to Tailwind Slate (cool) — 9 values updated
- Total: 12 variables changed, 0 JS/HTML changes

### Step 3b: Legacy --primary alias (commit a7a17ef)
- variables.css: added `--primary: var(--color-primary)` alias so header.css and index.html pick up Indigo
- theme-loader.js already maps --color-primary → --primary for tenants with ui_config overrides

### Step 4b: Page CSS :root fix (commit 4e9949f)
- inventory.css, shipments.css, employees.css, settings.css: replaced hardcoded `--primary:#1a237e` with `var(--color-primary)` in :root blocks
- Same for --primary-light and --primary-dark

### Verification
- ui-test.html: 15/15 component sections ✅
- All 6 pages × 2 tenants: CSS variables correct, zero console errors
- Mobile viewport (375px): no breakage
- Tenant theming: Prizma=Indigo (default), Demo=green (ui_config override) — both work
- suppliers-debt.html: backward compat OK (uses styles.css, minor header shade difference)

## What Was Done — QA Phase (Full Regression)

### Step 1: Clone Tenant (commits 9d2761d, b1e7e67, 57410ed)
- Created clone-tenant.sql (1119 lines): 39 tables cloned with FK mapping, 19 temp mapping tables
- Created cleanup-tenant.sql (316 lines): reverse FK order deletion
- Blockers fixed: inventory.barcode UNIQUE (D prefix), _verify_count() removed, employees PIN uniqueness (auto-generated 6-digit PINs), employees.created_by self-ref, shipments.packed_at, conversation_participants.joined_at
- Demo tenant created: slug=demo, PIN=12345, green theme

### Step 2: Slug-based tenant resolution (commit 85daa0d)
- shared.js: TENANT_SLUG now dynamic from URL ?t= param or sessionStorage
- index.html: tenant picker UI, slug→tenant resolution, theme loading on login screen
- header.js: added ui_config to tenant SELECT for theme loading
- auth-service.js: added name to tenant config, cached tenant_name_cache
- serve.js: strip query string for dev server routing

### Step 2b: Theme + permissions fixes (commits 4ccf86a, fd412b5)
- theme-loader.js: added legacy variable mapping (--color-primary → --primary)
- index.html: hardcoded #1a2744 → var(--primary) for header, login btn, PIN modal
- Permissions: created demo-prefixed roles/permissions (workaround for PK without tenant_id)
- auth-service.js: prefix stripping for permission IDs (later reverted for proper schema fix)
- fix-permissions-schema.sql: proper PK alteration to include tenant_id

### Steps 3-7: Automated QA tests
- Tenant isolation: 16/16 PASS (data, theme, console errors on all 6 pages)
- Visual consistency: 16 PASS, 2 WARN, 1 FAIL (fixed)
- RTL: 5/5 PASS
- Mobile: 4/4 PASS (header truncation added)
- Print: 2/3 PASS, 1 FAIL (fixed: modal/toast print-hide rules)

### Steps 8a-8b: Feature regression (commit d874b1f)
- Inventory: 12/12 PASS (table, brands, suppliers, PO, receipts, stock count, audit, entry, actions, export)
- Shipments: 5/5 PASS
- Employees: 7/7 PASS
- Settings: 5/5 PASS
- Suppliers Debt (backward compat): 8/8 PASS (legacy pin-modal redirect works)

### Fixes applied during QA
- layout.css: @media print rules for .modal-overlay, .toast-container
- header.css: @media (max-width: 600px) truncation for .header-store-name, .header-emp-name

## QA Commits
- `9d2761d` — QA Step 1: clone-tenant and cleanup-tenant SQL scripts
- `b1e7e67` — QA Step 1: fix employees PIN uniqueness in clone script
- `57410ed` — QA Step 1: generate unique PINs for cloned employees
- `85daa0d` — QA Step 2: slug-based tenant resolution on login
- `4ccf86a` — QA: fix theme loading and permissions for multi-tenant
- `fd412b5` — QA: proper multi-tenant permissions schema (no prefix hack)
- `d874b1f` — QA: fix print rules, header mobile, modal RTL positioning

## What Was Done — Phase 5 (Cleanup & Hardening)
(see backups/M1.5FQA_2026-03-19/SESSION_CONTEXT.md for Phase 5 details)

## Phase 6 Commits
- `6767a2c` — Phase 6 Step 1: Indigo primary + Slate gray palette
- `a7a17ef` — Phase 6 Step 3b: legacy --primary alias in variables.css
- `4e9949f` — Phase 6 Step 4b: remove legacy :root overrides from page CSS files

## What's Next
- **Module 1.5 complete (including Phase 6 facelift).** Next: Module 2 (Platform Admin) or feature modules per MASTER_ROADMAP.
- **Deferred:** suppliers-debt.html migration → finance module
- **Deferred:** styles.css deletion → after suppliers-debt migration
- **Deferred:** DB.* migration (supabase-ops.js → DB.*) → not Module 1.5 scope

## Open Issues
- **RLS discrepancy:** GLOBAL_SCHEMA.sql documents USING(true) on roles/permissions/role_permissions, but live DB has tenant-isolation RLS. Live DB is correct.
- **roles/permissions PK:** Now includes tenant_id. FKs updated to composite references. demo_ prefixed data still exists (workaround) — proper schema fix in fix-permissions-schema.sql (pending execution).
- **js/pin-modal.js redirect:** Cannot delete until suppliers-debt.html is migrated.
- **styles.css:** Still loaded by suppliers-debt.html. Cannot remove yet.
- **RLS permissive on 9 tables:** Deferred to Module 2.
