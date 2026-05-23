# M6_SCHEMA — Functional Smoke Test Report

> **Run:** 2026-05-22 overnight chain Half 2. **Tenant:** demo (8d8cfa7e-ef58-49af-9702-a862d459cccb).
> **Status:** **M6 9/9 + Cross-contract 5/5 PASS** ✅ ✅

## M6 functional smoke (9 cases)

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| M-S1 | `create_exam` happy path | Returns exam_id; status='scheduled'. | exam_id returned; status='scheduled' in eye_exams. | ✅ |
| M-S2 | `create_prescription_draft(glasses)` (cross-contract entry) | Returns prescription_id in 'draft' state; prescription_number IS NULL. | Confirmed: status='draft', prescription_number IS NULL. | ✅ |
| M-S3 | `commit_prescription` atomic + number + recall | Returns (prescription_id, prescription_number≥1, recall_axes_created≥4). Status='committed'. 2 child eye rows. | Returned number=1, recall_axes_created=4, status='committed', 2 child rows in prescription_glasses_eyes. | ✅ |
| M-S4 | `cancel_draft_prescription` Iron Rule 32 | Draft hard-deleted; counter UNCHANGED. | Counter stayed at the same value before/after cancel. Draft row gone. | ✅ |
| M-S5 | `supersede_prescription` | Old status='superseded', new still 'committed'. | Both confirmed. | ✅ |
| M-S6 | `compute_recall_due_dates` ≥4 axes for glasses | 4 rows in prescription_recall_axes | 4 axes inserted (next_exam, health_fund_validity, prescription_validity, glasses_delivery — disabled by default). | ✅ |
| M-S7 | `clone_prescription` | New draft with copied eye values, prescription_number IS NULL. | 2 eye rows in clone. status='draft', prescription_number NULL. | ✅ |
| M-S8 | Cross-tenant guard | create_exam targeting prizma from demo session raises 42501. | Caught 42501 (insufficient_privilege). | ✅ |
| M-S9 | Anon-reject all 7 RPCs | All 7 raise 42501 with anon JWT. | 7/7 caught with SQLSTATE=42501. | ✅ |

## Cross-contract smoke (M5↔M6 bridge, 5 cases)

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| X-S1 | M5 `create_customer` returns id + number | (customer_id, customer_number) | New customer #10 created on demo (after M5 smoke leftovers). | ✅ |
| X-S2 | M6 `create_prescription_draft(customer_id, 'glasses')` (cross-contract entry-point) | Returns draft prescription_id | Draft prescription_id returned. | ✅ |
| X-S3 | M6 `commit_prescription` allocates + fires recall | prescription_number ≥1; recall_axes_created ≥4 | prescription_number=3 (3rd commit on demo); recall_axes_created=4. | ✅ |
| X-S4 | M5↔M6 surface: `v_customer_prescriptions_summary` filtered to customer | ≥1 row with status='committed' | summary count ≥1, status='committed'. | ✅ |
| X-S5 | M7-facing: `v_prescription_glasses_for_order` shows the committed prescription | 1 row with R-eye values joined | count=1, r_sphere=-1.75 (matches input). | ✅ |

## Final demo state after smoke

| Metric | Value |
|---|---|
| demo `eye_exams` | 1 |
| demo `prescriptions_glasses` (all statuses) | 5 |
| demo `prescription_glasses_eyes` | 8 (4 committed/superseded × 2 eyes) |
| demo `prescription_recall_axes` | 12 (3 committed prescriptions × 4 axes each) |
| `tenant_number_counters` for entity_kind='prescription' on demo | 3 (3 prescriptions got numbers; the cancelled drafts didn't consume) |
| Prizma rows on all M6 tables | 0 ✅ |
| Prescription_types seed | 16 (8 per tenant) ✅ |
| Lens_manufacturers seed | 10 (5 per tenant) ✅ |

## Side-checks

- 8 M6 tables exist with RLS=true (verified) ✅
- 9 M6 views deployed ✅
- 7 M6 RPCs deployed + grant pattern (REVOKE anon/PUBLIC, GRANT authenticated/service_role) ✅
- 19 new enums in pg_type ✅
- Counter pattern: `cancel_draft_prescription` PROVABLY does NOT touch counter (M-S4 verifies before/after equal) — Iron Rule 32 contract preserved.
- M5↔M6 cross-contract surfaces both reachable: `v_customer_prescriptions_summary` (consumed by M5 customer card) + `create_prescription_draft` (called from M5 card "+ מרשם חדש") + `clone_prescription` (called from M6 editor).
- No Prizma writes ✅

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 — atomic RPCs | commit_prescription is atomic (single transaction; allocate + UPDATE parent + INSERT both eyes + recall computation); clone_prescription atomic. |
| 11 — sequential allocation via atomic RPC | Re-uses M5's `allocate_tenant_number(p_tenant_id, 'prescription')`. Iron Rule 11 preserved. |
| 14 — tenant_id NOT NULL on every new table | All 8 M6 tables have it. |
| 15 — canonical 2-policy RLS | Verified on 8 tables. |
| 18 — UNIQUE constraints tenant-scoped | (prescription_number, tenant_id) WHERE not NULL on both prescriptions_glasses and prescriptions_contacts. (code, tenant_id) on prescription_types + lens_manufacturers. (prescription_id, eye) on both eye tables. |
| 19 — config-tables not enums | prescription_types + lens_manufacturers are tables. State-machines + bounded property-sets are enums. |
| 22 — defense-in-depth | All RPCs filter by `tenant_id = p_tenant_id` explicitly in addition to RLS. |
| 31 — Integrity Gate | Run at commit time (verified at chain close). |
| 32 — Destructive Ops declared "None." | No DROP/TRUNCATE/DELETE-without-tenant-scope. cancel_draft_prescription deletes by id with tenant_id guard (RPC scope, not table-wide). ON DELETE CASCADE on child eyes tables is part of the schema, not a destructive op. |
