# M6_SCHEMA — Reviewer Pass

> **Role:** opticup-reviewer
> **Run:** 2026-05-22 overnight chain close
> **Subject:** all DDL + RPCs + Views in `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/` + delta in `js/shared.js`

## Iron Rule conformance

| Rule | Status | Notes |
|---|---|---|
| 1 (atomicity) | ✅ | All 7 RPCs single-transaction. commit_prescription is the most complex — allocate + parent UPDATE + 2 child INSERTs + compute_recall — all in one tx. |
| 3 (soft-delete) | ✅ | All M6 parent tables have is_deleted+deleted_at. Eyes tables (Pattern 11 children) don't need soft-delete — they're slaved to parent via ON DELETE CASCADE. |
| 11 (sequential allocation) | ✅ | Re-uses M5's allocate_tenant_number with entity_kind='prescription'. Iron Rule 11 preserved by infrastructure inheritance. M-S3+X-S3 verified contiguous (3 sequential commits → numbers 1,2,3). |
| 13 (Views-only external) | ✅ | 9 views; future M7/M8/M11/M12 read prescriptions through Views. |
| 14 (tenant_id) | ✅ | 8/8 new tables. |
| 15 (canonical RLS) | ✅ | service_bypass + tenant_isolation on all 8. |
| 16 (contracts) | ✅ | M5↔M6 contract: M6 owns v_customer_prescriptions_summary + create_prescription_draft + clone_prescription. Pattern 10 (Fact-vs-Rule) honored: M6 emits v_recall_due (fact); M12 will own recall_rules (rule). |
| 17 (Views for external) | ✅ | M5 customer card reads v_customer_prescriptions_summary; M6 sidebar reads v_prescriptions_list_for_customer; M7 will read v_prescription_glasses_for_order / v_prescription_contacts_for_order. |
| 18 (UNIQUE includes tenant_id) | ✅ | (prescription_number, tenant_id) WHERE not NULL on both prescription tables. (code, tenant_id) on prescription_types + lens_manufacturers. (prescription_id, eye) on both eye tables (composite via parent FK). |
| 19 (configurable=tables) | ✅ | prescription_types + lens_manufacturers are config tables (P19). State-machines + property-sets are enums. |
| 20 (SaaS litmus) | ✅ | Adding a tenant gets the same prescription_types (8) + lens_manufacturers (5) seed. Zero code. |
| 21 (no orphans) | ⚠️ | Pre-existing orphan: `contact_lens_wearing_schedule` enum exists in DB unused. M6 chose to create distinct new enums (cl_replacement_period + cl_wear_schedule) for semantic clarity rather than reusing the orphan. F-M6-1 logs the cleanup TECH_DEBT. |
| 22 (defense-in-depth) | ✅ | All RPC body filters by `tenant_id = p_tenant_id`. |
| 23 (no secrets) | ✅ | |
| 31 (Integrity Gate) | ⏳ at commit | |
| 32 (Destructive Ops "None.") | ✅ | No DROP/TRUNCATE issued. ON DELETE CASCADE on child eye tables is part of the schema (CASCADE is a parent-child relationship spec, not a tenant-wide destructive op). |
| 35 (Campaign Overseer authority) | N/A | |

## Security audit

- **JWT validation:** All 7 M6 RPCs use Block A header verbatim. NULL-comparison loophole absent.
- **Grant pattern:** REVOKE EXECUTE FROM anon, PUBLIC + GRANT EXECUTE TO authenticated, service_role. Verified per-RPC.
- **Cross-tenant guards:** M-S8 verified create_exam rejects prizma tenant from demo session.
- **Anon-reject:** M-S9 verified all 7 RPCs raise 42501.
- **Counter atomicity:** allocate_tenant_number uses INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING (row-level lock). M-S3 verified counter advanced atomically. M-S4 verified counter UNCHANGED on cancel_draft (Iron Rule 32 preserved).

## Code quality

- **State machines correctly enforced:** commit_prescription verifies status='draft' before transitioning; cancel_draft_prescription verifies status='draft' before deleting; supersede_prescription verifies status='committed' before transitioning. Each guard raises 22023 on violation.
- **Pattern 11 (R/L child rows) correctly enforced:** UNIQUE (prescription_id, eye) on both eyes tables. ON CONFLICT (prescription_id, eye) DO UPDATE in commit_prescription handles re-commit (defensive).
- **v_recall_due window function** correctly aggregates to 1 row per prescription per ROW_NUMBER() OVER (PARTITION BY prescription_id ORDER BY due_at).
- **v_customer_prescriptions_summary** UNIONs glasses + contacts; produces 1 row per prescription per customer; M5 customer card consumes.
- **Idempotency:** All migrations re-runnable.

## Supabase advisors

- 0 new HIGH/ERROR lints. WARN lints (`authenticated_security_definer_function_executable`) match project-wide pattern.

## Smoke results

- M6 functional: 9/9 PASS
- Cross-contract M5↔M6: 5/5 PASS
- Prizma data writes: 0 ✅

## Verdict

**🟢 PASS.** No reopener-class issues. F-M6-1 (orphan enum cleanup) is TECH_DEBT, not an M6 SPEC failure. Recommend closing M6_SCHEMA as 🟢 in FOREMAN_REVIEW.
