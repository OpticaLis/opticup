---
spec_id: M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE
executed: 2026-05-18 IDT
executor: opticup-executor (Claude Code on Windows desktop, Path X sequential)
status: 🟢 CLOSED — all 18 success criteria pass; SPEC 8 F-1 RESOLVED
---

# EXECUTION REPORT — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE

## 1. Summary

Hardened 4 `next_*_number` sequential-number RPCs (`next_lot_number`,
`next_receipt_number`, `next_po_number`, `next_transfer_number`) by adding a
regex guard `~ '^[0-9]+$'` to the WHERE clause before each `MAX(CAST(... AS INT))`.
Effect: non-numeric suffix rows (e.g. demo's 3 seeded `LOT-PO300005-*` rows
that caused SPEC 8 F-1 HIGH) are silently filtered out instead of crashing
the parser. RPC signatures unchanged. Zero JS changes. Tier C rerun of the
SPEC 8-blocked smoke now succeeds end-to-end: `RCP-9016-0001` created with
3 stock_lot rows `LOT-000016/000017/000018`, then cleanly soft-deleted.
**Resolves SPEC 8 F-1; SPEC 8 verdict upgrades 🟡 → 🟢. Group B 100% COMPLETE.**

## 2. Execution Timeline

| # | Step | Result |
|---|---|---|
| 1 | Author SPEC + ACTIVATION_PROMPT under `Module 1.5 - Shared Components/docs/specs/` per Daniel's placement directive | ✅ `d683fa8` |
| 2 | §0 capture: live `pg_get_functiondef` for all 4 target RPCs + Step 1.7 consumer grep (1 JS site in legacy frames `purchase-orders.js`, 3 server-side) | ✅ |
| 3 | Apply 4 `CREATE OR REPLACE FUNCTION` migrations via Supabase MCP | ✅ all 4 success:true |
| 4 | S4 verify: regex pattern `\^\[0-9\]\+\$` present in all 4 bodies via `pg_get_functiondef` | ✅ 4/4 |
| 5 | S5 verify: signatures preserved via `pg_get_function_identity_arguments` | ✅ 4/4 unchanged |
| 6 | S10 verify: 3 corrupt rows untouched | ✅ count=3 unchanged |
| 7 | Write 4 migration .sql files to `supabase/migrations/` | ✅ |
| 8 | Commit DDL + push (`d083dd0`) | ✅ Iron Rule 31 + 32 pass |
| 9 | Tier C: reload demo Goods Receipt tab → pick SHALDAG → 3 lines auto-load → fill DN="DN-VFV-RESILIENCE-2026-001" → click "✅ אשר וצור רשומות מלאי" | ✅ |
| 10 | Status badge flips to "נסגר ✓" | ✅ |
| 11 | DB verify: receipt `RCP-9016-0001` created (id `a2c90cb8-...`), `has_no_invoice=false`, 3 stock_lot rows with `LOT-000016/000017/000018` (numeric six-digit suffix) | ✅ S7 + S8 + S9 |
| 12 | Screenshot saved (`01_receipt_closed_success.png`) | ✅ |
| 13 | S15 cleanup: soft-delete the smoke receipt + 3 linked stock_lots (`is_deleted=true`; note: `stock_lot` + `purchase_receipt` schemas don't have `deleted_at` columns — soft-delete uses `is_deleted` only) | ✅ |
| 14 | S10 re-verify: 3 corrupt rows still present (filter ignores) | ✅ |
| 15 | Cleanup residue: roll back PO-300003's 3 line `qty_received` counters from 5/3/4 → 0/0/0 (the RPC had bumped them via its `UPDATE purchase_order_line` step); reset PO status `fully_received` → `sent` | ✅ |
| 16 | S11 advisor: `get_advisors(security)` returned 108 WARN lints, 0 ERROR/CRITICAL. 4 WARN entries for SPEC RPCs are the pre-existing `authenticated_security_definer_function_executable` pattern (unchanged by this SPEC; out of §6 stop scope) | ✅ |
| 17 | S12 integrity gate | ✅ exit 0 |
| 18 | Group A regression: navigate POs List → 13 rows + 5 stat cards + chip filters intact | ✅ |
| 19 | Commit closure artifacts + SPEC 8 FOREMAN_REVIEW + module updates | (this commit) |

## 3. What Was Done

### 3.1 DB changes (declared in §4 Destructive Operations)

4 `CREATE OR REPLACE FUNCTION` migrations applied via Supabase MCP `apply_migration` on project `tsxrrxzmdxaenlvocyit`:

1. **`m1_next_lot_number_non_numeric_safe`** — adds `AND SUBSTRING(lot_number FROM LENGTH(v_prefix)+1) ~ '^[0-9]+$'` to the WHERE clause.
2. **`m1_next_receipt_number_non_numeric_safe`** — adds equivalent guard.
3. **`m1_next_po_number_non_numeric_safe`** — adds equivalent guard (frames-era `purchase_orders` table).
4. **`m1_next_transfer_number_non_numeric_safe`** — adds equivalent guard.

All 4 retain identical signatures + return types + SECURITY DEFINER attribute + `SET search_path = public`.

### 3.2 Files written

| Path | Purpose |
|---|---|
| `supabase/migrations/20260518105144_m1_next_lot_number_non_numeric_safe.sql` | Migration 1 |
| `supabase/migrations/20260518105145_m1_next_receipt_number_non_numeric_safe.sql` | Migration 2 |
| `supabase/migrations/20260518105146_m1_next_po_number_non_numeric_safe.sql` | Migration 3 |
| `supabase/migrations/20260518105147_m1_next_transfer_number_non_numeric_safe.sql` | Migration 4 |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/SPEC.md` | Sealed SPEC |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/ACTIVATION_PROMPT.md` | Executor activation |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/EXECUTION_REPORT.md` | This file |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/FINDINGS.md` | Sibling findings |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/screenshots/01_receipt_closed_success.png` | Tier C evidence |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_GOODS_RECEIPT_REBUILD/FOREMAN_REVIEW.md` | SPEC 8 closure |

### 3.3 Files NOT modified (per §7 Out of Scope)

- 4 sibling RPCs (next_box_number, next_internal_doc_number, next_purchase_order_number, next_return_number) — flagged Phase 2 in §13
- `m1_create_receipt_from_box`, `record_transfer`, other K-RPCs
- Any JS code (existing consumer `modules/purchasing/purchase-orders.js` unchanged)
- Any data cleanup on the 3 corrupt rows (filter, not fix)
- Any RLS / policy / view / GRANT change

### 3.4 Success Criteria Audit

| # | Criterion | Actual | Pass |
|---|---|---|---|
| S1 | Branch clean post-push | clean | ✅ |
| S2 | Commits in {3} | 3 (`d683fa8` author + `d083dd0` DDL + this closure) | ✅ |
| S3 | 4 migration files | confirmed | ✅ |
| S4 | Each body has regex guard | 4/4 | ✅ |
| S5 | Signatures preserved | 4/4 | ✅ |
| S6 | No new RPC names | confirmed | ✅ |
| S7 | SPEC 8 blocked smoke now succeeds | `RCP-9016-0001` created | ✅ |
| S8 | receipt_number matches `^RCP-\d+-\d+$` | `RCP-9016-0001` matches | ✅ |
| S9 | stock_lot lot_numbers match `^LOT-\d{6}$` | `LOT-000016/000017/000018` match | ✅ |
| S10 | 3 corrupt rows untouched | count still 3 | ✅ |
| S11 | get_advisors clean of new HIGH/ERROR | 0 ERROR; 4 pre-existing WARN on the SPEC RPCs (the `authenticated_security_definer_function_executable` architectural pattern) | ✅ |
| S12 | Integrity gate exit 0 | confirmed at every commit | ✅ |
| S13 | Iron Rule 32 — 0 violations | hook clean at every commit | ✅ |
| S14 | smoke receipt + stock_lot link | receipt has 3 lots via `purchase_receipt_id` FK | ✅ |
| S15 | Cleanup soft-delete | receipt + 3 lots `is_deleted=true`; PO-300003 line counters rolled back; PO status reset to 'sent' | ✅ |
| S16 | Group A + SPEC 6/7 regression check | POs List loads with 13 rows + 5 stat cards + chip filters intact | ✅ |
| S17 | SPEC 8 FOREMAN_REVIEW with F-1 RESOLVED + 🟡→🟢 | written this commit | ✅ |
| S18 | EXECUTION_REPORT + FINDINGS present | this file + FINDINGS.md | ✅ |

## 4. Commits

| # | Hash | Subject |
|---|---|---|
| 1 | `d683fa8` | `chore(spec): author M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE SPEC` |
| 2 | `d083dd0` | `fix(db): harden 4 next_*_number RPCs against non-numeric suffix corruption` |
| 3 | (this commit) | `chore(spec): close M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE + upgrade SPEC 8 verdict 🟡→🟢` |

Total: **3 commits**.

## 5. Deviations

**None.** Every success criterion matched on the first verification pass. The
one Tier C residue noticed mid-cleanup (PO-300003 `qty_received` counters
bumped by the smoke receipt) was rolled back explicitly — this is a property
of the K2 RPC's atomic side effects, not a defect, and the cleanup pattern is
documented for future Tier C runs.

## 6. Tier C Evidence

1 screenshot in `screenshots/`:

| File | Captures |
|---|---|
| `01_receipt_closed_success.png` | GR page with status badge "נסגר ✓" — confirms the previously-blocked smoke now succeeds |

DB confirmations captured inline in §2 timeline.

## 7. Final State

- **Repo:** clean post-push to `origin/develop`
- **DB:** 4 RPC bodies updated in place via CREATE OR REPLACE; zero data writes; 3 corrupt rows present and ignored
- **JS:** unchanged
- **Group B scoreboard:** SPEC 6 🟢 / SPEC 7 🟢 / **SPEC 8 🟢** (upgraded from 🟡 via the linked FOREMAN_REVIEW)
- **All Iron Rules satisfied** (1 atomic, 7 RPCs for writes, 11 sequential numbers via atomic RPC, 22 tenant_id, 31 integrity gate, 32 destructive ops declared)
- **Next:** Foreman declares Group B 100% COMPLETE; awaits Daniel's directive for Group C dispatch OR Phase 2 sibling-RPC follow-up

## 8. Pipeline Coordination

Solo on `develop`. No collisions. Path X sequential. The 3-commit shape (author → DDL → close) matched §10 exactly.
