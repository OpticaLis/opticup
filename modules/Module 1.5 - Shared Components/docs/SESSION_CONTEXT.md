# Module 1.5 — Shared Components Refactor — SESSION_CONTEXT

## Current Status
- **Phase:** Design System initiative ACTIVE (Phases 1 + 2 + 3a closed 2026-05-11; Phase 3a is PUSH PENDING per Daniel directive — commits local, push deferred. Phases 3b + 3c authored, pending dispatch in fresh chats. Phase 4 unblocks when all 3 sub-phases close). Module 1.5 was MAINTENANCE since 2026-03-19; reopened for the Design System initiative.
- **Branch:** develop
- **Last updated:** 2026-05-11 (Design System Phase 3a: Direction 1 — Conservative — mockup tree built; PUSH PENDING).

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
