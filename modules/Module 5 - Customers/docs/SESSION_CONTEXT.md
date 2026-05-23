# Module 5 — Customers — Session Context

**Last updated:** 2026-05-23 Phase D closed 🟢 (CLOSURE_SPEC).
**Status:** 🟢 Phase A+B (Schema + RPCs) CLOSED · 🟢 M5_LEADS_MIGRATION CLOSED · 🟢 **Phase D (UI Customer Card) CLOSED** — Iron Rule 34 closure complete (T11 ✅, F-T5-DESIGN RESOLVED, dead Locked badge removed, clean visual-fidelity set across all 5 tabs). Phase C (OpticPlus migration), Phase E (UI customer list + create-mode) deferred.

## Current state

- **Schema deployed:** 7 new tables (households, health_funds, tenant_languages, customer_notes, customer_documents, tenant_settings, tenant_number_counters) + 3 existing tables extended (`tenants.tenant_code`, `tenant_location.deactivated_at`, `customers` +26 cols + rename `branch_id`→`home_branch_id`).
- **RPCs deployed:** 5 customer RPCs (create_customer, merge_customers, assign_to_household, delete_last_unused_customer, update_customer_display_preferences) + 1 helper (allocate_tenant_number) + 2 deferred trigger functions (compute_lifecycle_stage_on_order, compute_lifecycle_dormant_sweep — built, not wired).
- **Views deployed:** 7 customer-data views (v_customer_for_exam, _for_order, _for_payment, _full, _for_messaging, _for_loyalty, _for_appointment). 2 deferred: v_customer_prescriptions_summary (M6 owns — built in M6_SCHEMA), v_customer_queue_position (M14 deferred).
- **Smoke:** 9/9 PASS on demo tenant + cross-contract bridge with M6 5/5 PASS.
- **No Prizma row writes during build/smoke** ✅.

## Cross-contract surfaces (M5 ↔ other modules)

| Surface | Type | Owner | Consumer(s) |
|---|---|---|---|
| `customers.id` PK | FK target | M5 | M6 (prescriptions_glasses + _contacts + eye_exams), M7 future (orders), M8 future (payments), M11/M12/M13/M14 future |
| `customer_number` + `tenant_code` + `branch_code (=tenant_location.short_code)` | display composite per Brief §12 | M5 | All UI surfaces |
| `v_customer_for_exam` | View | M5 | M6 eye_exams + prescription editor |
| `v_customer_for_order` | View | M5 | M7 future |
| `v_customer_for_messaging` | View | M5 | M12 future |
| `allocate_tenant_number(p_tenant_id, p_entity_kind)` | RPC | M5 | M5 (entity_kind='customer'), M6 (entity_kind='prescription'), future M7 (entity_kind='order') |
| `v_customer_prescriptions_summary` | View | M6 (owns) | M5 customer card tab-3 |
| `create_prescription_draft(p_tenant_id, p_customer_id, p_kind)` | RPC | M6 (owns) | M5 customer card "+ מרשם חדש" button |

## Where the work lives

- `MODULE_5_ROADMAP.md` — phase plan
- `docs/specs/M5_SCHEMA/` — sealed Phase A+B SPEC + retro files (SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, MIGRATION.md, REVIEW.md, FOREMAN_REVIEW.md)
- `docs/MODULE_SPEC.md` — business logic + state-machine of lifecycle_stage
- `docs/MODULE_MAP.md` — code map of functions + views
- `docs/db-schema.sql` — DDL snapshot of M5-owned tables
- `docs/CHANGELOG.md` — phase history

## Phase D state (added 2026-05-23)

**New ERP entrypoint:** `customers.html` at repo root (registered in root-allowlist + CLAUDE.md §0.5). URL: `customers.html?t=<slug>&customer_id=<uuid>`.

**New page JS (8 files):** under `modules/customers/`. Architecture anchors:
- `customer-card.js` — boot + `M5Card` global + `__cardTrace` (Iron Rule 34 surface).
- `customer-card-coming-soon.js` — Iron Rule 21 anchor: ONE `showComingSoon(featureId)` + ONE `COMING_SOON_LABEL` + ONE `COMING_SOON_REGISTRY`. Every deferred UI element routes through this.
- 5 tab files: details, vision (stub), prescriptions, orders, docs.

**New storage:** private `customer-docs` bucket + 4 tenant-gated RLS policies (path: `{tenant_id}/{customer_id}/{document_id}.{ext}`).

**Wired surfaces (verified live):**
- Tab 1 header: `v_customer_for_exam` (composite display).
- Tab 1 body: `v_customer_full` + `customer_notes`.
- Tab 1 edit-mode: per-field 500ms-debounced auto-save via `DB.update('customers', id, patch)`. PIN-gated for phone/email/id_number/consents.
- Tab 1 wired badges: Inactive ↔ `lifecycle_stage='dormant'`; Locked ↔ `is_deleted` (design finding F-T5-DESIGN — see FINDINGS.md).
- Tab 3: `v_customer_prescriptions_summary` (M6) + `create_prescription_draft(tenant, customer, kind)` RPC.
- Tab 4: `orders` + `sub_orders!sub_orders_order_id_fkey(count)` (M7).
- Tab 5: `customer_documents` + `sb.storage.from('customer-docs').upload(...)`.

**Chrome MCP smoke results (T1-T11):** 7 PASS + 2 design findings + 2 partial. See `docs/specs/M5_UI_CUSTOMER_CARD/TEST_REPORT.md`.

## What's next

Out of Phase D scope, requires Daniel-in-loop:

1. **M5_UI_CUSTOMER_LIST SPEC (Phase E)** — Split-workspace list + sidebar + advanced search + create-mode. Reuses `customers.html` entrypoint (no `?customer_id=` → list mode).
2. **Tab 2 follow-up SPEC** — M6 ships `v_customer_vision_function_history` so the card's Tab 2 stub can light up.
3. **M5_MIGRATION SPEC (Phase C)** — import 5,028 OpticPlus customers (crm_leads rollover already done by M5_LEADS_MIGRATION).
4. **Customer LOCK feature (future, NEW)** — block an ACTIVE customer from edits / order creation / payment edits without deleting. Freeze for debt / dispute / pending check. Distinct from soft-delete. Surfaced while removing the dead Locked badge in CLOSURE_SPEC. Requires an Architect cross-module pass (likely gates M7 + M8 for a locked customer) before becoming a SPEC. Logged in TECH_DEBT.md #M5_CUSTOMER_LOCK_FEATURE.
5. **See-deleted / audit mode (future, NEW — smaller)** — a future include-deleted view (in Phase E list, or a dedicated audit screen) that would make a real "deleted customer" indicator reachable through the UI (the views currently filter `is_deleted=false`). Logged in TECH_DEBT.md #M5_SEE_DELETED_AUDIT_MODE.
6. **F-8 split** — `js/shared-field-map.js` per-module split (file hit the 350-line cap during Phase D).
7. **F-2 + F-3 schema column expansions** — `customer_documents.{size_bytes,mime_type,description}` + an `orders.total_amount` aggregation view/RPC.
8. **F-6 follow-up** — extract `authReady()` helper into `auth-service.js` so each new ERP page doesn't reinvent the `loadSession()` boot.

## Notes

- Pre-existing dirty repo at chain start (campaign / M4 audit files) was selectively side-stepped — only M5 + GLOBAL paths committed.
- Cross-Pipeline coordination: single-session chain; no concurrent Pipeline.
