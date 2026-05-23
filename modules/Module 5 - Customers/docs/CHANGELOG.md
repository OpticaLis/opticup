# Module 5 — Customers — Changelog

## 2026-05-23 — M5_LEADS_MIGRATION closed 🟢 + lifecycle trigger wired (via Track 1)

NIGHT_RUN chain Track 2: `crm_leads → customers` additive seam. Demo 4 active leads + Prizma 1,296 active leads migrated to `customers` with `lifecycle_stage='lead'`. crm_leads UNCHANGED (28+1354 totals). New column `customers.source_crm_lead_id` is the back-reference for future M4-cutover FK re-point. New enum value `'lead'` added.

Sealed under `docs/specs/M5_LEADS_MIGRATION/`.

NIGHT_RUN chain Track 1 also re-wired the lifecycle trigger (deferred from M5 Phase A+B): `compute_lifecycle_stage_on_order()` is now attached to `payments` AFTER INSERT OR UPDATE OF status WHEN paid+amount≥1 → customer auto-advances `prospect → active` on first paid payment. Closes the original M5 §1.1 promise. Sealed under `modules/Module 1.5 - Shared Components/docs/specs/M5_M8_CROSS_CONTRACT_FIXES/`.

---

## Phase A+B — Schema + RPCs + Views — closed 2026-05-22 🟢

Overnight Full-Auto Pipeline chain Half 1. Smoke 9/9 PASS on demo. Cross-contract bridge with M6 5/5 PASS. Advisors clean. No Prizma row writes.

**Tables:** 7 new (households, health_funds, tenant_languages, customer_notes, customer_documents, tenant_settings, tenant_number_counters) + 3 extended additively (tenants +tenant_code, tenant_location +deactivated_at, customers +26 cols + rename branch_id→home_branch_id).
**Views:** 7 customer-data views (v_customer_for_exam, _for_order, _for_payment, _full, _for_messaging, _for_loyalty, _for_appointment). Deferred: v_customer_prescriptions_summary (M6 owns) + v_customer_queue_position (M14).
**RPCs:** 5 customer RPCs + 1 helper (allocate_tenant_number) + 2 deferred trigger functions (compute_lifecycle_stage_on_order, compute_lifecycle_dormant_sweep — built, not wired).
**Enums:** 4 (customer_lifecycle_stage, household_status, customer_note_type, customer_document_category).
**Seed:** 8 tenant_languages (4 per tenant), 10 health_funds (5 per tenant).
**Iron Rules in sharp focus:** 1, 11, 14, 15, 18, 19, 22, 23, 32. All conform.

**Sealed under SPEC:** `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/` (SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, MIGRATION.md, REVIEW.md, FOREMAN_REVIEW.md).

Commits for this phase land at chain-close — see `git log --oneline --grep='m5'` from this date.

---

*Pre-Phase A history: legacy `customers` table (16-col stub, 0 rows, canonical RLS already present) inherited from earlier project phases. M5_SCHEMA extended this stub via additive ALTER; did not drop it.*
