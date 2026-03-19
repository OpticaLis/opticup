# Module 1.5 — Shared Components Refactor — SESSION_CONTEXT

## Current Status
- **Phase:** QA complete ✅. Module 1.5 DONE.
- **Branch:** develop
- **Last session:** 2026-03-19

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

## What's Next
- **Module 1.5 complete.** Next: Module 2 (Platform Admin) or feature modules per MASTER_ROADMAP.
- **Deferred:** suppliers-debt.html migration → finance module
- **Deferred:** styles.css deletion → after suppliers-debt migration
- **Deferred:** DB.* migration (supabase-ops.js → DB.*) → not Module 1.5 scope

## Open Issues
- **RLS discrepancy:** GLOBAL_SCHEMA.sql documents USING(true) on roles/permissions/role_permissions, but live DB has tenant-isolation RLS. Live DB is correct.
- **roles/permissions PK:** Now includes tenant_id. FKs updated to composite references. demo_ prefixed data still exists (workaround) — proper schema fix in fix-permissions-schema.sql (pending execution).
- **js/pin-modal.js redirect:** Cannot delete until suppliers-debt.html is migrated.
- **styles.css:** Still loaded by suppliers-debt.html. Cannot remove yet.
- **RLS permissive on 9 tables:** Deferred to Module 2.
