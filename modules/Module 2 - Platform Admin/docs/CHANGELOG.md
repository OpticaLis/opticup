# Module 2 — Platform Admin — Changelog

---

## SECURITY_HOTFIX_2026_05_13 — Cross-cutting hotfix (2026-05-13)

**Status:** 🟢 CLOSED. Full Auto Pipeline (single chat, Opus, ~3 hours).
**SPEC:** `modules/Module 2 - Platform Admin/docs/specs/SECURITY_HOTFIX_2026_05_13/`.
**Driving audit:** `docs/guardian/SECURITY_ADVISOR_AUDIT_2026_05_13.md`.
**Run summary:** `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md`.

Module-2-touched changes:
- `create_tenant(text, text, text, text, text, uuid, text, text, uuid)` — REVOKE EXECUTE FROM PUBLIC, anon, authenticated. service_role retains.
- 9 `v_admin_*` views (`v_admin_leads`, `v_admin_campaigns`, `v_admin_pages`, `v_admin_media`, `v_admin_reviews`, `v_admin_components`, `v_admin_product_picker`, `v_admin_campaign_templates`, `v_admin_component_presets`) — `ALTER VIEW … SET (security_invoker = true)` + `REVOKE SELECT FROM anon`. authenticated retains.
- `tenant-logos` storage bucket — 3 PUBLIC-role overpermissive policies dropped (`tenant-logos all`, `Authenticated upload tenant logos`, `Authenticated update tenant logos`); 3 new policies created (`tenant_logos_authenticated_insert/_update/_delete`) restricted to authenticated role with JWT-claim tenant_id check; legacy-path-compatible (`<tenant_id>/<filename>` OR `brands/<tenant_id>/…` OR `tenants/<tenant_id>/…`); `Public read tenant logos` preserved for storefront display.
- `platform_audit_log` — `audit_log_admin_insert` policy dropped (was `WITH CHECK true`). Reads still gated; writes via SECURITY DEFINER admin RPCs bypass RLS as postgres.

Module 2 commits:
- `fcd1e76` docs(spec,m2): author SECURITY_HOTFIX_2026_05_13 SPEC + 4 non-destructive migration pairs + MIGRATIONS_APPLIED runbook
- `eaf5911` chore(db,m2): apply low-risk DDL group (§6.1 + §6.2 + §6.3 + §6.9)
- `d6e5118` chore(db,m2): apply §6.8 tenant-logos policy (legacy-path-compatible)
- (storefront + §6.4 + §6.5/6/7 changes are recorded under Modules 1/3/4 respectively; this entry tracks Module-2-owned objects only.)

---

## QA Phase — Full Test (2026-03-26)

### Summary
92 tests across 13 categories. **88 PASS / 0 FAIL / 4 SKIP.**

Module 2 status: **COMPLETE ✅**

### Test Categories
| # | Category | Tests | Result |
|---|----------|-------|--------|
| 1 | Admin Auth | 1.1-1.8 | 7 PASS, 1 SKIP |
| 2 | Multi-Admin Roles | 2.1-2.6 | 6 PASS |
| 3 | Tenant Provisioning | 3.1-3.10 | 10 PASS |
| 4 | Dashboard + Management | 4.1-4.12 | 12 PASS |
| 5 | Plan Limits | 5.1-5.9 | 7 PASS, 2 SKIP |
| 6 | Feature Flags | 6.1-6.8 | 7 PASS, 1 SKIP |
| 7 | Slug Routing | 7.1-7.10 | 10 PASS |
| 8 | Activity & Audit Logs | 8.1-8.6 | 6 PASS |
| 9 | Plans CRUD | 9.1-9.5 | 5 PASS |
| 10 | last_active | 10.1-10.2 | 2 PASS |
| 11 | Backward Compatibility | 11.1-11.8 | 8 PASS |
| 12 | Mobile + RTL | 12.1-12.4 | 4 PASS |
| 13 | Tenant Isolation | 13.1-13.4 | 4 PASS |

### Skipped Tests
- 1.4: No orphan Supabase Auth user (not in platform_admins) available for testing
- 5.8/5.9: Downgrade behavior requires mass data insertion — verified via RPC structure review
- 6.8: isFeatureEnabled fail-safe tested conceptually (RPC override pattern)

### Test Artifacts
- test-store-qa tenant (basic plan, slug=test-store-qa, PIN=99999)
- test-store-v2 tenant (basic plan, created during provisioning tests)
- 2 test admin users (support, viewer)
- qa-test-plan (deactivated)

### Pre-QA Setup
- 787c2ba — QA: pre-QA setup SQL reference (phase-qa-setup.sql)

---

## Phase 5 — Slug Routing + Future Prep (2026-03-26)

### New Files
- 24d8648 — error.html (48 lines): standalone error page with 3 states (not-found, suspended, deleted). Uses shared/css/variables.css only, no shared.js dependency.
- 6329aad — landing.html (62 lines): store code entry page with slug validation + redirect. Standalone, no shared.js dependency.
- 8d3554e — phase5a-storefront-config.sql: CREATE TABLE storefront_config + RLS + migration + updated create_tenant() with Step 11

### Modified Files
- 4cf8767 — js/shared.js: resolveTenant() centralized (async DB query + status check + redirects). Removed showTenantBlocked(), showTenantPicker IIFE guard, 'prizma' hardcoded default.
- dbb28a6 — js/shared.js: sync TENANT_SLUG initialization from URL/sessionStorage (IIFE at script load)
- 4cf8767 — index.html: removed local resolveTenant(), showTenantPicker(), tenant picker HTML
- dbb28a6 — index.html: module card hrefs include ?t=slug for session preservation

### DB Changes (SQL reference — not yet executed)
- storefront_config table: tenant_id (UNIQUE), enabled, domain, subdomain, theme/categories/seo/pages JSONB
- RLS: tenant reads own (JWT claims pattern), admin full access
- Migration: seed existing tenants with enabled=false
- create_tenant() updated: Step 11 inserts default storefront_config row

### Bug Fixes
- dbb28a6 — Cross-page navigation losing session: sync TENANT_SLUG + ?t= param in module card links

### Verification (Phase 5f)
8 tests on production: error pages (3 states), landing page (validation + redirect), no-slug redirect, invalid slug redirect, 6 ERP pages load, demo tenant login + navigation, admin panel intact (plans edit modal), storefront_config (deferred — SQL not yet run).

---

## Phase 4 — Plans & Limits (2026-03-26)

### RPCs (SQL — run in Supabase Dashboard)
- dde14ad — check_plan_limit(p_tenant_id, p_resource): counts usage vs plan limits, returns {allowed, current, limit, remaining, message}
- dde14ad — is_feature_enabled(p_tenant_id, p_feature): priority check tenant_config overrides → plan features → fail-safe true

### JS Files (New)
- 5f06d77 — shared/js/plan-helpers.js (107 lines): checkPlanLimit, isFeatureEnabled, getPlanLimits, getPlanFeatures, invalidatePlanCache with 30s cache
- 2c0d4e3 — admin-plans.js (261 lines): Plans CRUD in הגדרות tab, edit modal with 7 limits + 17 features + prices
- 10f9b0b — admin-feature-overrides.js (97 lines): per-tenant feature override UI (3-state selects)

### JS Files (Modified)
- 70a3743 — employee-list.js, inventory-entry.js, suppliers.js, debt-doc-new.js, ai-ocr.js: checkPlanLimit calls before creation
- 70a3743 — employees.html, inventory.html, suppliers-debt.html: plan-helpers.js script tags added
- 911d430 — index.html: data-feature attrs on 3 module cards + applyFeatureFlags() + plan-helpers.js loaded
- 911d430 — inventory.html: data-feature attrs on access-sync + stock-count tabs + applyFeatureFlags()
- 911d430 — ai-ocr.js: isFeatureEnabled('ocr') check in _injectOCRToolbarBtn
- 911d430 — inventory-images-bg.js: isFeatureEnabled('image_studio') check in _bgRemoveStart
- 2c0d4e3 — admin-app.js: settings tab routing to loadPlansTab()
- 2c0d4e3 — admin.html: admin-plans.js script tag + settings tab enabled
- 10f9b0b — admin-tenant-detail.js: feature overrides container + renderFeatureOverrides call
- 10f9b0b — admin.html: admin-feature-overrides.js script tag

### Edge Function
- 04ea518 — pin-auth/index.ts: last_active update on successful PIN verification (requires redeployment)

### Bug Fixes
- e27bebc — admin-plans.js: Modal.show body→content property fix (form was not rendering)

### Verification (Phase 4h)
6 end-to-end tests: ERP page load (4 pages, zero errors), plan-helpers functions exist on window, checkPlanLimit returns correct structure, feature flags display, plans tab + edit modal, last_active updates on login. 5/6 passed initially, 1 bug found (Modal property) and fixed.

---

## Phase 3 — Dashboard + Management (2026-03-26)

### RPCs (SQL — run in Supabase Dashboard)
- 10ce5da — get_all_tenants_overview(): JSONB array of all tenants with stats
- 10ce5da — get_tenant_stats(tenant_id): 5 resource counts
- 192b3b2 — suspend_tenant(tenant_id, reason, admin_id): set suspended + audit
- 192b3b2 — activate_tenant(tenant_id, admin_id): set active + audit
- 192b3b2 — update_tenant(tenant_id, updates, admin_id): whitelist update + audit with diff
- 011436f — get_tenant_activity_log(...): paginated with 4 optional filters
- 011436f — get_tenant_employees(tenant_id): minimal list for PIN reset
- 011436f — reset_employee_pin(...): reset + unlock + audit (PIN not logged)

### JS Files
- 6aba3c1 — admin.html restructured: nav tabs, content areas, slide-in panel
- 86c66f3 — admin-app.js: tab routing + panel lifecycle + filter wiring
- 1c5c280 — admin-dashboard.js (NEW): tenant table, search, filters
- 09c2d56 — admin-tenant-detail.js (NEW): slide-in panel, 4 tabs, edit, actions
- b4854e9 — admin-activity-viewer.js (NEW): activity log viewer, filters, pagination
- dc75687 — admin-audit.js expanded: platform audit log tab + action filter
- 713084c — admin-auth.js: hasAdminPermission + global exports
- 252409d — shared.js + index.html: suspended tenant blocking

### Bug Fixes
- last_active column added to tenants (was missing)
- window.allTenants exposed globally (admin-dashboard.js)
- c23d73f — edit save/cancel stale closure references fixed
- c23d73f — suspend modal confirm button binding fixed (setTimeout → immediate)

### Verification (Phase 3l)
14 end-to-end tests: login, tenant table, search/filters, slide-in panel, details/edit, activity log, provisioning log, audit log, platform audit tab, suspend→block→activate, reset PIN, חנות חדשה, backward compatibility. 12/14 fully passed, 2 passed with bugs fixed in c23d73f.

---

## Phase 2 — Tenant Provisioning (2026-03-26)

### Commits
- `85b4695` — Module 2 Phase 2c: create_tenant() RPC SQL (reference)
- `22c4320` — Module 2 Phase 2e: admin-provisioning.js — tenant creation wizard
- `3624239` — Module 2 Phase 2f: must_change_pin flow after first login
- `92eb89d` — Fix credentials modal HTML rendering (Modal.alert → Modal.show)

### DB Changes
- **3 RPCs:** create_tenant (SECURITY DEFINER, 10-step atomic), validate_slug (format+reserved+unique), delete_tenant (soft delete)
- **employees.must_change_pin** BOOLEAN column added (default false)
- **tenant_provisioning_log.tenant_id** made nullable (for failure logging)
- **provisioning_log_admin_insert** RLS policy added

### Code Changes
- `modules/admin-platform/admin-provisioning.js` (320 lines) — NEW: 3-step wizard, slug auto-suggest + debounced validation, provisionTenant() with audit + provisioning logs
- `admin.html` (195 lines) — MODIFIED: added "חנות חדשה" button, modal-wizard.js + admin-provisioning.js script tags
- `modules/admin-platform/admin-app.js` (89 lines) — MODIFIED: wired btn-new-tenant click → initProvisioningWizard
- `js/auth-service.js` (341 lines) — MODIFIED: added checkMustChangePin() after initSecureSession

### What create_tenant() provisions
Per new tenant: 1 tenant row, 6 tenant_config entries, 5 roles, 57 permissions, role_permissions mapping (CEO=all 57, manager=54, senior=29, employee=8, viewer=6), 1 admin employee (must_change_pin=true), employee_roles (admin→ceo), 5 document_types, 5 payment_methods.

### Verification
All 12 tests passed: admin panel load, wizard open, slug auto-suggest, slug validation (duplicate/reserved/format/valid), step 2 plans, step 3 summary, tenant creation, DB verification, audit logs, new tenant login + PIN change, second login (no force-change), backward compatibility (Prizma/Demo).

---

## Phase 1 — DB + Admin Auth (2026-03-26)

### Commits
- `a68af24` — Module 2: fix directory structure to match project conventions
- `9fb5bdd` — Module 2 Phase 1i: admin.html + admin-auth.js
- `e6fca80` — Module 2 Phase 1j: admin-db.js + admin-audit.js
- `5374b52` — Module 2 Phase 1k: admin-app.js — login/logout flow complete

### DB Changes
- **5 new tables:** plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log
- **tenants extended:** 9 new columns (plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at)
- **10 indexes** across new tables and tenants
- **RLS** on all 5 tables, with is_platform_super_admin() SECURITY DEFINER function to avoid recursive policy evaluation
- **Seed data:** 3 plans (basic, premium, enterprise), existing tenants assigned enterprise
- **Bootstrap:** admin user dannylis669@gmail.com as super_admin

### Code Changes
- `admin.html` (192 lines) — Platform Admin page with Supabase Auth login/logout
- `modules/admin-platform/admin-auth.js` (94 lines) — adminSb client, login/logout/session management
- `modules/admin-platform/admin-db.js` (63 lines) — AdminDB wrapper (query, getById, insert, update, rpc)
- `modules/admin-platform/admin-audit.js` (20 lines) — logAdminAction fire-and-forget audit helper
- `modules/admin-platform/admin-app.js` (88 lines) — App init, login/panel toggle, event handlers

### Verification
All 8 tests passed: page load, wrong credentials, correct login, audit log, session persistence, logout, post-logout, ERP isolation.
