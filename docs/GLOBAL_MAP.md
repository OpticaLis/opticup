# GLOBAL_MAP.md — Optic Up Architectural Map

> **Last reconciled:** 2026-05-06 (M4_CLOSURE_AND_INTEGRATION_CEREMONY — Module 4 CRM merged in; previous: 2026-04-11 Module 3.1 Phase 3A)
>
> This document is the **architectural map** of the Optic Up platform.
> For the data model see `docs/GLOBAL_SCHEMA.sql`.
> For the build sequence and decisions see `MASTER_ROADMAP.md`.
> For function-level code maps see each module's `MODULE_MAP.md`.

---

## 1. Platform Identity

**Optic Up** is a multi-tenant SaaS ERP + storefront platform for Israeli optical chains.

- **First tenant:** אופטיקה פריזמה (Prizma Optics) — production
- **Test tenant:** אופטיקה דמו (demo, slug `demo`) — all QA runs here, never on production data
- **Supabase project:** `tsxrrxzmdxaenlvocyit.supabase.co` — single shared instance
- **Tenant isolation:** RLS on every table using `tenant_id` column + JWT-based policies
  (see `docs/GLOBAL_SCHEMA.sql` CONVENTIONS section for the 3 RLS idioms and known debt)

---

## 2. Dual-Repo Architecture

Optic Up is split across two GitHub repositories. Both share one Supabase backend.

```
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│  opticalis/opticup               │    │  opticalis/opticup-storefront    │
│  (ERP — internal, staff)         │    │  (Storefront — public, customers)│
│                                  │    │                                  │
│  Stack: Vanilla JS + HTML        │    │  Stack: Astro 6 + TypeScript     │
│  Deploy: GitHub Pages            │    │         + Tailwind CSS 4         │
│  URL: https://app.opticalis.co.il│    │  Deploy: Vercel (auto from main) │
│                                  │    │                                  │
│  Houses: Module 1 (Inventory)    │    │  Houses: Module 3 (Storefront)   │
│          Module 1.5 (Shared)     │    │                                  │
│          Module 2 (Platform Admin)│   │  Reads ONLY via Views + RPC      │
│          Module 3.1 (Recon meta) │    │  (Iron Rules #13, #24)           │
│                                  │    │                                  │
│  🖥️ Win: C:\Users\User\opticup   │    │  🖥️ Win: C:\Users\User\          │
│  🍎 Mac: /Users/danielsmac/opticup│   │         opticup-storefront       │
└────────────────┬─────────────────┘    └───────────────┬──────────────────┘
                 │                                      │
                 └─────────► Supabase ◄─────────────────┘
                          (tenant_id + RLS)
```

**Why two repos:** The split was introduced when Module 3 (Storefront) chose Astro
as its framework. Keeping the Astro build pipeline isolated from the ERP's
static-site deployment prevents build-system coupling. The split is by deployment
target, not by tenant.

**Coordination rules:**
- Both repos use `develop` for active work. `main` is production on each side.
- Only Daniel merges to `main` — after QA on demo tenant.
- Never work on both repos simultaneously on the same machine/branch.

---

## 3. Modules at a Glance

| Module | Name | Status | Repo | Scope |
|--------|------|--------|------|-------|
| 1 | Inventory Management | ✅ Complete (frames era); **🟡 Lens Phase 1A complete (2026-05-14)** — 17 new tables + 9 RPCs + K3 trigger + K5 view + Platform Catalog Admin screen + lens-catalog-import EF; Phase 1B (6 customer-facing screens) pending | opticup | Full ERP: inventory, purchasing, receipts, debt, returns, shipments, AI-OCR, alerts, stock counts, Access sync. **Lens schema sealed** — see `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/` |
| 1.5 | Shared Components | ✅ Complete | opticup | Cross-module UI/JS infrastructure: activity_log, auth/permissions, Modal/Toast/TableBuilder components, PIN modal, plan helpers, tenant config |
| 2 | Platform Admin | ✅ Complete (v2.0) | opticup | Super-admin control plane: tenant provisioning, plans/limits/features, audit log, PIN reset, suspend/activate/delete |
| 3 | Storefront | 🟡 Phase B remediation | opticup-storefront | Public storefront: CMS pages, campaigns, blog, AI content, translations, media library, lead forms, brand pages, SEO |
| 3.1 | Project Reconstruction | ✅ Complete (closed April 11, 2026) | opticup | Meta-module: foundation doc rewrites, DB audit, roadmap reconciliation. Does not own code — owns documentation accuracy. |
| 4 | CRM | ✅ Complete (audit cycle closed 2026-05-06; MAINTENANCE phase) | opticup | Lead → registration → event-day flow: incoming/Tier 2 tabs, Events table, Event Day check-in, Messaging Hub (templates/rules/broadcast/log), Automation Engine (server-side EF), payment lifecycle (paid/refund/credit-pending/transfer), public form ingress (event-register EF + quick-register EF). 23 tables, 12 RPCs, 7 v_crm_* views, 5 EFs (lead-intake, send-message, automation-engine, quick-register, event-register, resolve-link), 1 _shared helper (tenant-config). All 4 audit CRITICALs CLOSED 2026-05-06. SaaS-readiness threshold crossed: tenant 2 onboarding requires only `tenants` row + ui_config JSONB. |

---

## 4. Cross-Repo Contracts

The two repos are bound by a shared Supabase instance with Views as the contract
layer. Nothing crosses the repo boundary except through these contracts.

### 4.1 Database Views (contract surface)

The storefront reads exclusively through Supabase Views granted to `anon`.
Full view definitions live in `modules/Module 3.1 - Project Reconstruction/db-audit/03-views.md`.
Summary in `docs/GLOBAL_SCHEMA.sql` VIEWS section.

**Key views consumed by the storefront:**

| View | Purpose | Consumer in storefront |
|------|---------|----------------------|
| `v_public_tenant` | Secure tenant resolution (10-column projection of tenants + storefront_config) | `src/lib/tenant.ts` |
| `v_storefront_products` | Product catalog — GOLDEN REFERENCE (images subquery, website_sync filter, resolved_mode) | `src/lib/products.ts` |
| `v_storefront_brands` | Brand index with product_count filter | `src/lib/brands.ts` |
| `v_storefront_brand_page` | Brand landing pages (brand_page_enabled + has-products check) | `src/lib/brands.ts` |
| `v_storefront_pages` | Published CMS pages only | `src/lib/pages.ts` |
| `v_storefront_blog_posts` | Published blog posts | `src/lib/blog-posts.ts` |
| `v_storefront_categories` | Product type aggregates | `src/lib/products.ts` |
| `v_storefront_components` | Active CTA/lead-form/banner/sticky-bar components | `src/lib/components.ts` |
| `v_storefront_config` | Per-tenant storefront settings (WhatsApp, analytics, hero, i18n) | `src/lib/tenant.ts` |
| `v_storefront_reviews` | Visible Google/manual reviews | (reviews component) |
| `v_storefront_media` | Media library (public shape, is_deleted filtered) | (media rendering) |
| `v_content_translations` | Approved + draft content translations | `src/lib/content-translations.ts` |
| `v_ai_content` | Active AI-generated content rows | (product descriptions) |
| `v_tenant_i18n_overrides` | Per-tenant i18n string overrides | `src/lib/tenant-i18n.ts` |

### 4.2 RPCs consumed cross-repo

| RPC | Direction | Purpose |
|-----|-----------|---------|
| `submit_storefront_lead` | Storefront → DB | Lead form submission (SECURITY DEFINER) |
| `create_translated_page` | ERP Studio → DB | Creates translated page variant |
| `mark_translations_stale` | ERP Studio → DB | Flags translations after source edit |
| `verify_campaign_page_password` | Storefront → DB | Password gate for protected campaign pages (SECURITY DEFINER, anon-callable per M4_TENANT_ISOLATION_HARDENING_PART2) |
| `register_lead_to_event` | event-register EF / quick-register EF / ERP CRM → DB | Canonical attendee registration with capacity check + dedup + waiting_list (SECURITY DEFINER, anon+auth+service per PART2) |

### 4.3 Image proxy

Supabase Storage bucket `frame-images` is **private** (not public).
All product images are served through the storefront's server-side proxy:
`/api/image/[...path].ts` — uses `SUPABASE_SERVICE_ROLE_KEY` (env var, never in code).
The `images` column in `v_storefront_products` outputs paths prefixed with `/api/image/`
(this is the GOLDEN REFERENCE subquery — do not modify without regression test).

### 4.4 View modification protocol

Changing any Supabase View used by the storefront requires the protocol defined in
`opticup-storefront/CLAUDE.md §5` (Iron Rule #29):
1. Read current definition from `db-audit/03-views.md`
2. Write the new CREATE OR REPLACE VIEW
3. Run the storefront safety-net scripts
4. Verify no runtime regressions

### 4.5 Lead intake — cross-repo POST contract

The storefront's SuperSale form (`/supersale/` CMS page on prizma) POSTs lead
submissions directly to the `lead-intake` Edge Function. Other shortcode-based
forms (`/multisale-brands-cat/`, `/premiummultisale/`, `/מיופיה/`) and the
`LeadFormBlock`/`ContactBlock`/`CtaBlock`/`ContactForm` components remain on
the legacy `/api/leads/submit` Astro endpoint until their own follow-up SPECs.

**Contract** (P5_7_STOREFRONT_FORM_REWIRE, 2026-05-03 — see SPEC):
- Endpoint: `POST {SUPABASE_URL}/functions/v1/lead-intake`
- Auth: legacy-format anon JWT in `Authorization: Bearer …` + `apikey` headers.
  Same constant inlined in `js/shared.js`,
  `supabase/functions/lead-intake/dispatch.ts`, and the storefront's
  `src/lib/shortcodes/lead-form-validation.ts`.
- Body: `{ tenant_slug, name, phone, email, language?, source?,
  terms_approved, marketing_consent, eye_exam?, notes?, utm_*? }` — see
  `supabase/functions/lead-intake/index.ts` for the full validator.
- Required: `tenant_slug`, `name`, `phone`, `email` (post-v16; v21 adds
  email-lowercase canonicalization). `eye_exam` must be one of 4 allow-list
  values; the storefront maps Hebrew shortcode select_options into the
  allow-list at submit time.
- Returns: `201` for new lead, `409` for duplicate (T2 fires either way).
  Both are success paths from the user's POV; the storefront treats both
  as success.

**Storefront → EF mode wiring:** the `[lead_form]` shortcode uses two
optional attributes — `submit_url` (presence triggers EF mode) and
`tenant_slug` — read in `lead-form.ts` and threaded into
`lead-form-validation.ts:buildScript`. The body transform inside the
generated script handles tenant_id→tenant_slug, Hebrew→English field
renames, and checkbox→boolean coercion.

---

## 5. ERP Internal Contracts (summary)

> Detailed per-function contracts with parameters, return types, and consumers
> are documented in each module's MODULE_MAP.md. This section is a
> category-level summary for orientation only.

### 5.1 RPC functions (Supabase — 53 project functions including Module 4)

| Category | Functions | Count |
|----------|-----------|-------|
| Tenant lifecycle | activate/create/delete/suspend/update_tenant, get_all_tenants_overview, get_tenant_* (3), validate_slug | 10 |
| Plan / feature gates | check_plan_limit, is_feature_enabled, is_platform_super_admin | 3 |
| Inventory atomics | increment/decrement/set_inventory_qty, apply_stock_count_delta, get_low_stock_brands | 5 |
| Sequential numbers (Iron Rule #13) | next_po_number, next_return_number, next_box_number, next_internal_doc_number, next_crm_event_number, **next_lens_variant_display_id, next_lot_number, next_transfer_number, next_receipt_number** (M1 Lens Phase 1A) | 9 |
| **M1 Lens atomics (Iron Rule #1)** (Phase 1A 2026-05-14) | record_stock_movement (FOR UPDATE on lot), record_transfer (parent+2 children+dest lot), record_adjustment_found (lot+movement), effective_price (overlay+VAT resolver), m1_create_receipt_from_box (K2 contract orchestrator — extended 2026-05-15 by M1B0 to call m1_create_supplier_debt_from_receipt after the line LOOP), m9_lens_received_for_sale_order_trg_fn (K3 trigger fn) | 6 |
| **M1B0 Purchase-order schema** (2026-05-15) | next_purchase_order_number (per-tenant PO-NNNNNN sequence, distinct from legacy next_po_number(uuid,text) which serves frames-era purchase_orders plural), place_purchase_order (atomic PO + line array insert), mark_po_sent (draft→sent), cancel_purchase_order (draft/sent → cancelled with status-check gate), m1_create_supplier_debt_from_receipt (idempotent debt insert at receipt-close time — D-M1-11 wiring). New tables: purchase_order, purchase_order_line, supplier_debt. | 5 |
| Shipments / debt / payments | increment_shipment_counters, increment_paid_amount, increment_prepaid_used, get_po_aggregates | 4 |
| Auth | reset_employee_pin | 1 |
| Alerts | generate_daily_alerts | 1 |
| Storefront / content / translation | submit_storefront_lead, create_translated_page, mark_translations_stale, get_translation_context, save_translation_memory_batch (×2), promote_to_platform, verify_campaign_page_password | 8 |
| **CRM (Module 4)** — public ingress | register_lead_to_event, submit_storefront_lead, verify_campaign_page_password (anon+auth+service) | 3 |
| **CRM (Module 4)** — staff actions | check_in_attendee, move_attendee_between_events, transfer_credit_to_new_attendee, restore_event_from_log, soft_delete_event_if_empty, sync_lead_status_from_attendee (auth+service only, post-PART2) | 6 |
| **CRM (Module 4)** — admin/trigger | cascade_attendee_soft_delete (DB trigger), import_leads_from_monday (one-time admin) — service_role only post-PART2 | 2 |
| OCR | update_ocr_template_stats (×2) | 2 |
| Triggers | save_previous_blocks, update_*_updated_at (×3), update_updated_at | 5 |

Full signatures: `docs/GLOBAL_SCHEMA.sql` FUNCTIONS section.
Full parameter/return detail: `modules/Module 3.1 - Project Reconstruction/db-audit/05-functions.md`.

### 5.2 Edge Functions (Supabase)

| Function | Module | Phase | Purpose |
|----------|--------|-------|---------|
| `pin-auth` | Core | — | PIN authentication — returns JWT + employee |
| `ocr-extract` | Module 1 (Inventory) | — | Claude Vision OCR for supplier documents |
| `remove-background` | Module 1 (Inventory) | — | Server-side background removal for product images |
| `lead-intake` | Module 4 (CRM) | P1, P3c+P4, P5_7 | Public lead form intake — validate, normalize phone, dedupe by tenant+phone, INSERT `crm_leads`. **[P3c+P4]** Also dispatches SMS+Email via `send-message` on new lead (`lead_intake_new`), duplicate (`lead_intake_duplicate`), and active-event branch (`event_invite_new` / T5). **[P5_7, v22]** Email is required + lowercased server-side. Storefront SuperSale form posts here directly via the shortcode's EF-mode (P5_7). `verify_jwt: true` (per config.toml; `Authorization: Bearer <legacy anon JWT>` accepted). |
| `send-message` | Module 4 (CRM) | P3c+P4, M4_UNSUB_SUPPRESSION_CRIT, M4_HARDCODED_PRIZMA_REMOVAL | Messaging pipeline — template fetch from `crm_message_templates`, `%var%` substitution, `crm_message_log` write, Make webhook dispatch. Supports template mode and raw-body broadcast mode. `verify_jwt: true`. **[M4_UNSUB v19]** Suppression gate rejects dispatch when lead is unsubscribed (`status='rejected', error_message='lead_unsubscribed'`). **[M4_HARDCODED v20]** `url-builders.ts` reads tenant-scoped `storefront_url` from `tenants.ui_config` via `_shared/tenant-config.ts` instead of hardcoded constant. |
| `event-register` | Module 4 (CRM) | P16, STOREFRONT_FORMS, M4_PUBLIC_FORM_VARIABLES_HIGH, M4_HARDCODED_PRIZMA_REMOVAL | Public event-registration EF — POST registers a lead to an event via `register_lead_to_event` RPC, fires confirmation SMS+Email. GET returns bootstrap payload (event details + lead pre-fill + tenant_ui_config subset for the form's brand colors + WhatsApp). `verify_jwt: false` (public form). **[v14]** Empty `event_*` variables in dispatch so `injectEventVariables` formatters render DD/MM/YYYY + HH:MM-HH:MM. **[v15]** Returns tenant-scoped `tenant_ui_config` to the client. |
| `quick-register` | Module 4 (CRM) | QUICK_REGISTER_QR_FLOW, M4_HARDCODED_PRIZMA_REMOVAL | WhatsApp QR walk-in registration EF. Two ops: `register` (form submit → upsert lead + register attendee + dispatch coupon-delivery / waiting-list) and `lookup_url` (Make returns storefront URL for QR wrap). `verify_jwt: true`. **[v6]** `lookup_url` reads tenant `storefront_url` per request via `loadTenantConfig`. |
| `resolve-link` | Module 4 (CRM) | SHORT_LINKS, M4_HARDCODED_PRIZMA_REMOVAL | Public 302-redirect EF for `/r/<code>` short links. Reads `short_links.target_url`. **[v3]** Per-row tenant-scoped fallback (expired-row → that tenant's `storefront_url`); no-row/no-code → `SHORT_LINK_FALLBACK_URL` env var or HTTP 404. `verify_jwt: false`. |
| `automation-engine` | Module 4 (CRM) | M4_AUTOMATION_ENGINE_SERVER_SIDE, ATOMIC_CONFIRMATION_FLOW | Server-side automation rule evaluator. Two modes: `evaluate` (no DB-mutating side effects) + `dispatch` (post-actions + queue_send + send-message). Cron callers + browser callers (via `crm-automation-client.js`). `verify_jwt: true`. v7 ACTIVE. |
| `unsubscribe` | Module 4 (CRM) | (existing) | Public unsubscribe link target — verifies HMAC token, sets `crm_leads.unsubscribed_at` + `status='unsubscribed'`. Paired with `send-message` suppression gate for end-to-end opt-out. |

### 5.3 ERP HTML Pages

| Page | File | Owner Module |
|------|------|-------------|
| Home Screen | `index.html` | Core (PIN login, module cards) |
| Inventory | `inventory.html` | Module 1 (11 tabs) |
| Supplier Debt | `suppliers-debt.html` | Module 1 — Debt (5 tabs) |
| Employees | `employees.html` | Module 1 — Permissions |
| Shipments | `shipments.html` | Module 1 — Shipments |
| Settings | `settings.html` | Module 1 — Settings |
| Platform Admin | `admin.html` | Module 2 (Supabase Auth, no shared.js) |
| Error Page | `error.html` | Module 2 (not-found/suspended/deleted) |
| Landing Page | `landing.html` | Module 2 (slug entry + redirect) |

### 5.4 Key JS globals (ERP)

| Global | File | Purpose |
|--------|------|---------|
| `sb` | shared.js | Supabase client instance |
| `T` | shared.js | Table name constants (37 entries) |
| `FIELD_MAP` / `FIELD_MAP_REV` | shared.js | Hebrew↔English column mappings |
| `getTenantId()` | shared.js | Read tenant UUID from session |
| `fetchAll()` / `batchCreate()` / `batchUpdate()` | supabase-ops.js | DB operation helpers |
| `writeLog()` | supabase-ops.js | Audit trail (async, non-blocking) |
| `verifyEmployeePIN()` / `hasPermission()` | auth-service.js | Auth contract |
| `DB.*` | shared/js/supabase-client.js | Module 1.5 DB wrapper |
| `Modal.*` | shared/js/modal-builder.js | Module 1.5 modal system |
| `Toast.*` | shared/js/toast.js | Module 1.5 toast system |
| `TableBuilder.create()` | shared/js/table-builder.js | Module 1.5 table component |
| `ActivityLog.*` | shared/js/activity-logger.js | Module 1.5 activity logging |
| `checkPlanLimit()` / `isFeatureEnabled()` | shared/js/plan-helpers.js | Module 2 plan gates |
| `renderFeatureLockedState(featureName)` | shared/js/plan-helpers.js | Show lock UI when isFeatureEnabled() returns false; used by 8 storefront-*.html gates (added 2026-04-15) |
| `CrmEventSendMessage.{open, wire}` | modules/crm/crm-event-send-message.js | Module 4 — compose-and-send modal for event-wide raw-body broadcasts (status-filter chips + channel picker + per-lead dispatch). Added 2026-04-24 (CRM_HOTFIXES). |
| `CrmAutomation.promoteWaitingLeadsToInvited(planItems, results)` | modules/crm/crm-automation-engine.js | Module 4 — atomic UPDATE of `crm_leads.status` waiting→invited after an event-invitation rule dispatches. Added 2026-04-24 (CRM_HOTFIXES). |
| `CrmEventActions.softDeleteEventIfEmpty(eventId)` | modules/crm/crm-event-delete.js | Module 4 — wraps `soft_delete_event_if_empty` RPC (server-gated on `SUM(purchase_amount)=0`). Added 2026-05-04 (DELETE_EMPTY_EVENT). |
| `CrmEventActions.restoreEventFromLog(logId, tenantId)` | modules/crm/crm-event-restore.js | Module 4 — wraps `restore_event_from_log` RPC (Approach B: replays explicit `attendee_ids` from audit row). Added 2026-05-04 (RESTORE_DELETED_EVENT_UI). |
| `loadTenantConfig(db, tenantId)` | supabase/functions/_shared/tenant-config.ts | Cross-EF helper — single SELECT against `tenants`, returns typed `TenantConfig` (storefront_url, whatsapp_phone_e164, support_phone_display, business_phone, business_address, brand{gold/_light/_hover}, ui_config). Caller-decides-fallback. Used by `quick-register`, `send-message/url-builders`, `resolve-link`, `event-register`. Added 2026-05-06 (M4_HARDCODED_PRIZMA_REMOVAL). |

---

## 6. Documentation Map

| What you need | Where to find it |
|---------------|-----------------|
| Architectural map (this file) | `opticup/docs/GLOBAL_MAP.md` |
| Data model (tables, views, RLS, functions) | `opticup/docs/GLOBAL_SCHEMA.sql` |
| Build sequence, decisions, roadmap | `opticup/MASTER_ROADMAP.md` |
| Iron Rules 1–23 (all ERP work) | `opticup/CLAUDE.md` §4–§6 |
| Iron Rules 24–30 (storefront work) | `opticup-storefront/CLAUDE.md` §5 |
| Storefront architecture (layer model, tenant resolution, image proxy) | `opticup-storefront/ARCHITECTURE.md` |
| Storefront CMS table schemas | `opticup-storefront/SCHEMAS.md` |
| Storefront view contracts | `opticup-storefront/VIEW_CONTRACTS.md` |
| DB audit baseline (live DB as of 2026-04-11) | `opticup/modules/Module 3.1 - Project Reconstruction/db-audit/01-tables.md` .. `06-sequences.md` |
| Code conventions (UI patterns, idioms) | `opticup/docs/CONVENTIONS.md` |
| File tree | `opticup/docs/FILE_STRUCTURE.md` |
| DB tables quick reference (T constants) | `opticup/docs/DB_TABLES_REFERENCE.md` |
| Known issues | `opticup/docs/TROUBLESHOOTING.md` |
| Autonomous mode protocol | `opticup/docs/AUTONOMOUS_MODE.md` |
| Per-module specs | `opticup/modules/Module N - .../docs/MODULE_SPEC.md` |
| Per-module code maps | `opticup/modules/Module N - .../docs/MODULE_MAP.md` |
| Per-module DB schema | `opticup/modules/Module N - .../docs/db-schema.sql` |
| Per-module session status | `opticup/modules/Module N - .../docs/SESSION_CONTEXT.md` |
| Original 28-module project vision (historical) | `opticup/docs/PROJECT_VISION.md` |
| Module Strategic Chat opening prompt | `opticup/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` |
| Secondary Chat operating instructions | `opticup/UNIVERSAL_SECONDARY_CHAT_PROMPT.md` |
| Documentation ownership schema (6 rules, dual-repo) | `opticup/MODULE_DOCUMENTATION_SCHEMA.md` |
| Daniel's quick reference (4-layer cheat sheet) | `opticup/DANIEL_QUICK_REFERENCE.md` |

---

## 7. Known Security Debt

Three classes of security findings are documented in `docs/GLOBAL_SCHEMA.sql`
with `SECURITY-FINDING` blocks. Do not duplicate the details here — this is a
pointer only.

1. **SECURITY-FINDING #1** — Four pre-multitenancy tables (`customers`,
   `prescriptions`, `sales`, `work_orders`) have `anon_all_*` RLS policies
   granting unrestricted public read/write. These tables also lack `tenant_id`.

2. **SECURITY-FINDING #2** — `supplier_balance_adjustments.service_bypass`
   policy is misnamed: it grants access to any connection without a session
   variable, not just `service_role`.

3. **SECURITY-FINDING #3** — Three tables (`brand_content_log`,
   `storefront_component_presets`, `storefront_page_tags`) use `auth.uid()`
   as tenant_id in their RLS policies — an architectural bug where user UUID
   is compared against tenant UUID.

All three are tracked for remediation in `MASTER_ROADMAP.md` (Module 3 Phase B
preamble checklist, pending Step 9 rewrite).

### Discipline notes

- **M1A operations RPCs (2026-05-15, `M1A_OPERATIONS_RPCS_FIX`):** the 10 M1 Phase 1A SECURITY DEFINER functions REVOKE EXECUTE from PUBLIC/anon; only `authenticated` retains EXECUTE for the 8 user-callable RPCs (`effective_price`, `m1_create_receipt_from_box`, `next_lot_number`, `next_receipt_number`, `next_transfer_number`, `record_adjustment_found`, `record_stock_movement`, `record_transfer`). `next_lens_variant_display_id` and `m9_lens_received_for_sale_order_trg_fn` are platform-admin/internal-trigger only (no `authenticated` GRANT). `next_lens_variant_display_id` has an in-body JWT-not-null guard (raises 42501). `v_suppliers_for_m9` has REVOKEd default anon/PUBLIC view grants (Iron Rule 13). `pending_lens_advancement_queue` has a UNIQUE on `stock_movement_id` + K3 trigger uses `ON CONFLICT (stock_movement_id) DO NOTHING` for idempotency under transaction retries. `supabase/config.toml` has an explicit `[functions.lens-catalog-import] verify_jwt = true` block.

---

*End of GLOBAL_MAP.md. Detailed function-level contracts live in per-module
MODULE_MAP.md files. The prior 919-line version (with function-level detail
for all ERP code) is backed up under
`modules/Module 3.1 - Project Reconstruction/backups/M3.1-3A_2026-04-11/GLOBAL_MAP.md`.*
