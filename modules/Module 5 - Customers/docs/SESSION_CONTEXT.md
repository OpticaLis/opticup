# Module 5 — Customers — Session Context

**Last updated:** 2026-05-22 overnight chain close.
**Status:** 🟢 Phase A+B (Schema + RPCs) CLOSED. Phases C (migration), D (UI customer card), E (UI customer list) deferred.

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

## What's next

Out of overnight scope, requires Daniel-in-loop:

1. **M5_MIGRATION SPEC** — import 5,028 OpticPlus customers + 1,158 `crm_leads` rollover. Discovery + Daniel-review of phone/id_number/kupa cleaning + INSERT via service_role. Drops legacy `customers.health_fund` text column after dual-write verified.
2. **M5_UI_CUSTOMER_CARD SPEC** — 5-tab customer card. Chrome MCP verification.
3. **M5_UI_CUSTOMER_LIST SPEC** — Split-workspace list + sidebar + advanced search.

## Notes

- Pre-existing dirty repo at chain start (campaign / M4 audit files) was selectively side-stepped — only M5 + GLOBAL paths committed.
- Cross-Pipeline coordination: single-session chain; no concurrent Pipeline.
