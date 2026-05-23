# Module 5 — Customers — Changelog

## Phase D — UI Customer Card — closed 2026-05-23 🟢 (code) · awaiting Foreman closure

First UI screen built on the M5-M9 schema spine. New ERP entrypoint `customers.html` + 8 page JS files under `modules/customers/` + `css/customers.css` + `customer-docs` storage bucket + 4 RLS policies. Tabs: 1 Details (col-3+col-2 + medical sub-tabs + queue blurred + bottom flags), 2 Vision (stub per D-T2; M6 follow-up), 3 Prescriptions (v_customer_prescriptions_summary + create_prescription_draft RPC), 4 Orders (M7 orders summary + CTAs → coming-soon), 5 Docs (customer_documents list + drag/drop upload).

**Iron Rule 34 closure (Chrome MCP smokes T1-T11):** T1-T4, T6-T10 PASS with full trace + DB-write + screenshot/a11y evidence. T5 — design finding (Locked badge unreachable because views filter is_deleted=false). T11 — partial (Chrome MCP full-page screenshot timeouts; viewport JPEGs + a11y snapshots provide structural fidelity proof).

**3 smoke-driven bug fixes (commit `7287852`):** (1) added `loadSession()` to page boot so the PIN-issued JWT injects into the sb client before any DB read; (2) Tab 4 orders query dropped non-existent `total_amount` column + added explicit FK hint for the ambiguous `sub_orders!sub_orders_order_id_fkey(count)` embed; (3) Tab 1 `DB.update` signature corrected — pass scalar uuid, not `{id: ...}` object.

**4 commits on develop:**
- `14d5d75` feat(m5d): register customers.html entrypoint + root-allowlist
- `1345aef` feat(m5d): customer card page shell + 5 tabs wired to live spine
- `a83516b` chore(m5d): FIELD_MAP entries + GLOBAL_MAP/FILE_STRUCTURE additive
- `7287852` fix(m5d): smoke-driven fixes from Chrome MCP T1-T11 (Iron Rule 34)
+ (this commit) docs(m5d): close Phase D — ROADMAP/SESSION_CONTEXT/CHANGELOG + retros

**Iron Rules in sharp focus:** 5 (FIELD_MAP), 7 (no `sb.from()` in new files), 8 (escapeHtml on every dynamic value), 12 (largest file 247 lines, target met), 21 (ONE coming-soon handler + ONE label + ONE registry), 22 (defense-in-depth via DB.* auto-tenant), 34 (Chrome MCP closure evidence in EXECUTION_REPORT + TEST_REPORT).

**Sealed under SPEC:** `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/` (SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, REVIEW.md (Reviewer), FOREMAN_REVIEW.md (Foreman)).

---

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
