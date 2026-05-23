# M5_M8_CROSS_CONTRACT_FIXES — Reviewer Pass

> **Role:** opticup-reviewer. 2026-05-23 chain close.

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | All modified RPCs single-tx ✅ |
| 11 sequential | allocate_tenant_number unchanged ✅ |
| 14 tenant_id | no new tables ✅ |
| 15 RLS canonical | no policy changes ✅ |
| 18 UNIQUE | partial uniques on queue tenant-implicit via FK (F-T1-3 justified) ✅ |
| 19 enum vs config | no changes ✅ |
| 22 defense-in-depth | Block A preserved on all 4 modified RPCs ✅ |
| 23 no secrets | none ✅ |
| 31 Integrity Gate | clean at commit (verified pre-Hebrew-status) ✅ |
| 32 Destructive Ops | None.; verified 11 migrations all additive ✅ |

## Security audit

- 11 migrations: 0 DROP, 0 TRUNCATE, 0 DELETE-without-tenant.
- All 4 modified RPC bodies preserve Block A header verbatim.
- Trigger WHEN clauses correctly gate execution.
- Partial unique indexes correctly prevent duplicate event emission (verified T1-S3 + T1-S4).
- CHECK constraints reject 0/negative values (verified T1-S5).

## Code quality

- Exception-trap pattern matches Track 1 Brief recommendation (option a — silent dedup).
- Race-safe UPDATE pattern in mark_check_returned (GET DIAGNOSTICS + 40001 raise on row_count=0) is canonical.
- rx_snapshot_jsonb design preferred over 12+ flat columns: single migration + future M6 schema additions don't require sub_orders schema changes.

## Smoke

7/7 PASS. Concurrent dedup verified via direct INSERT path. RPC re-entrancy proven (second mark_check_returned correctly raises 22023 before reaching UPDATE).

## Advisors

0 new HIGH/ERROR. No new project-wide pattern WARN introductions (same auth_rls_initplan baseline).

## Verdict

**🟢 PASS.** All 8 findings closed. Recommend 🟢 CLOSED in FOREMAN_REVIEW.
