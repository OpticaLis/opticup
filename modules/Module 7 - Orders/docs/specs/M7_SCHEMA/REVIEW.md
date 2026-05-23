# M7_SCHEMA — Reviewer Pass

> **Role:** opticup-reviewer. 2026-05-23 chain close.

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | ✅ All 6 RPCs single-transaction. `transition_sub_order_state` iterates child items + calls M1 RPCs in one tx. |
| 11 sequential | ✅ Re-uses M5 `allocate_tenant_number(p_tenant_id, 'order')`. Smoke S2 verified contiguous 3-call. |
| 13 Views | ✅ 7 views for external consumers (M5/M6 surfaces, M8 receipt, M9 lab, M11 reports, M12 messaging). |
| 14 tenant_id | ✅ All 4 tables. |
| 15 RLS canonical | ✅ service_bypass + tenant_isolation × 4 tables = 8 policies. |
| 16 contracts | ✅ FKs to M5/M6/M1; M8 will FK to orders.id. No direct cross-module table writes. |
| 17 Views for external | ✅ M9's `v_lab_queue` ready when M9 ships. |
| 18 UNIQUE tenant-scoped | ✅ (order_number, tenant_id) WHERE not NULL; (order_id, letter) tenant-implicit via FK. |
| 19 enum vs config | ✅ State-machines = enums. order_sequences superseded by tenant_number_counters config. |
| 22 defense-in-depth | ✅ All RPCs verify tenant_id explicitly. |
| 32 Destructive Ops | ✅ "None." declared and honored. |

## Security audit

- Block A header verbatim on all 7 functions. NULL-comparison loophole absent (verified §0 of SPEC).
- REVOKE EXECUTE FROM anon, PUBLIC + GRANT EXECUTE TO authenticated, service_role on all 6 user RPCs; trigger fn granted only to service_role.
- Cross-tenant guard verified S8 (42501).
- Anon-reject verified S9 (6/6).

## Smoke

- 9/9 PASS (TEST_REPORT.md).
- 0 NEW HIGH/ERROR advisors. 7 WARN match project pattern.
- 0 Prizma row writes confirmed.

## Verdict

**🟢 PASS.** No reopener-class issues. Recommend closing M7_SCHEMA as 🟢 in FOREMAN_REVIEW.
