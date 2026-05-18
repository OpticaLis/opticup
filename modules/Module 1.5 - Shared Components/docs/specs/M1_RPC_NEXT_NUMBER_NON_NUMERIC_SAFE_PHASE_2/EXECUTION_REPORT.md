---
spec_id: M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2
executed: 2026-05-18 IDT
executor: opticup-executor (Claude Code on Windows desktop, Path X sequential)
status: 🟢 CLOSED — all 16 success criteria pass; defect class closed across all 8 next_*_number RPCs
---

# EXECUTION REPORT — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2

## 1. Summary

Extended the Phase 1 regex guard `~ '^[0-9]+$'` to 4 sibling `next_*_number` RPCs:
- `next_box_number` (shipments.box_number)
- `next_internal_doc_number` (supplier_documents.internal_number)
- `next_purchase_order_number` (purchase_order.po_number — M1B0 lens PO generator used by SPEC 6)
- `next_return_number` (supplier_returns.return_number)

All 4 RPC signatures preserved; zero JS contract changes; zero data writes outside Tier C transients. Tier C empirically verified each RPC with deliberate corrupt-suffix row injection — all 4 RPCs returned properly-formatted numeric outputs and the injected rows were cleanly soft-deleted.

**After this SPEC closes, all 8 `next_*_number` RPCs in the project are resilient to non-numeric suffix corruption — the entire defect class is foreclosed.**

## 2. Execution Timeline

| # | Step | Result |
|---|---|---|
| 1 | Foreman authored SPEC + ACTIVATION_PROMPT under Module 1.5 (`4daba86`) | ✅ |
| 2 | §0 pre-flight: 4 RPC bodies + 4 tables have `is_deleted` + 0 pre-existing corrupt rows on demo (for the 2 simple-prefix tables; complex-prefix tables will inject) | ✅ |
| 3 | Apply 4 `apply_migration` via Supabase MCP | ✅ all 4 success:true |
| 4 | S4 verify: regex pattern present in all 4 bodies | ✅ 4/4 |
| 5 | S5 verify: signatures preserved | ✅ 4/4 |
| 6 | Write 4 migration .sql files + commit DDL + push (`40a52c4`) | ✅ |
| 7 | Tier C Cycle 1: inject `BOX-PHASE2SMOKE-X`, call `next_box_number`, returns `BOX-0002`, soft-delete | ✅ S6 |
| 8 | Tier C Cycle 2: inject `DOC-PHASE2SMOKE-X`, call `next_internal_doc_number('DOC')`, returns `DOC-00028`, soft-delete | ✅ S7 |
| 9 | Tier C Cycle 3: inject `PO-PHASE2SMOKE-X` (status='draft'), call `next_purchase_order_number`, returns `PO-300007`, soft-delete | ✅ S8 |
| 10 | Tier C Cycle 4: inject `RET-9016-PHASE2SMOKE` (return_type='pending_in_store'), call `next_return_number(_, '9016')`, returns `RET-9016-0003`, soft-delete | ✅ S9 |
| 11 | S10 verify all 4 injected rows `is_deleted=true` | ✅ 4/4 |
| 12 | S11 `get_advisors(security)` — 108 lints total, all WARN, 0 ERROR/CRITICAL. 4 WARN entries on Phase 2 RPCs are the pre-existing `authenticated_security_definer_function_executable` pattern (unchanged by this SPEC) | ✅ |
| 13 | S12 integrity gate exit 0 | ✅ |
| 14 | S14 regression: SPEC 7 POs List loads with 13 rows + 5 stat cards + chip filters intact | ✅ |
| 15 | Closure commit + push (this commit) | ✅ |

## 3. What Was Done

### 3.1 DB changes (declared in §4)

4 `CREATE OR REPLACE FUNCTION` migrations applied via Supabase MCP on project `tsxrrxzmdxaenlvocyit`:

1. **`m1_next_box_number_phase_2_non_numeric_safe`** — adds `AND SUBSTRING(box_number FROM 5) ~ '^[0-9]+$'`. Preserves the pre-existing `AND is_deleted = false` filter.
2. **`m1_next_internal_doc_number_phase_2_non_numeric_safe`** — adds `AND SUBSTRING(internal_number FROM LENGTH(p_prefix) + 2) ~ '^[0-9]+$'` (the `+2` preserves the original offset that skips the dash after the prefix).
3. **`m1_next_purchase_order_number_phase_2_non_numeric_safe`** — adds `AND SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$'`.
4. **`m1_next_return_number_phase_2_non_numeric_safe`** — adds `AND SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$'`.

All 4 retain identical signatures + return types + SECURITY DEFINER attribute + `SET search_path = public`. Confirmed live via `pg_get_function_identity_arguments` (4/4 match Phase 1 pre-flight).

### 3.2 Tier C empirical proof (per RPC, cycle pattern)

Each cycle:
1. INSERT 1 row with deliberately non-numeric suffix on the target table.
2. `set_config('request.jwt.claims', '{"tenant_id":"{demo_tid}","role":"authenticated"}', true)` to satisfy the RPC's tenant guard.
3. Call the RPC.
4. Verify result matches `^<expected_prefix>\d+$`.
5. `UPDATE ... SET is_deleted = true WHERE id = {corrupt_id}` (Iron Rule 3 soft-delete; `purchase_order` also got `deleted_at = now()`).

| Cycle | RPC | Corrupt row injected | RPC output | Pattern match | Cleanup |
|---|---|---|---|---|---|
| 1 | `next_box_number(...)` | `BOX-PHASE2SMOKE-X` | `BOX-0002` | `^BOX-\d+$` ✅ | soft-deleted |
| 2 | `next_internal_doc_number(..., 'DOC')` | `DOC-PHASE2SMOKE-X` | `DOC-00028` | `^DOC-\d+$` ✅ | soft-deleted |
| 3 | `next_purchase_order_number(...)` | `PO-PHASE2SMOKE-X` | `PO-300007` | `^PO-\d+$` ✅ | soft-deleted |
| 4 | `next_return_number(..., '9016')` | `RET-9016-PHASE2SMOKE` | `RET-9016-0003` | `^RET-9016-\d+$` ✅ | soft-deleted |

### 3.3 Files written

| Path | Purpose |
|---|---|
| `supabase/migrations/20260518112325_m1_next_box_number_phase_2_non_numeric_safe.sql` | Migration 1 |
| `supabase/migrations/20260518112326_m1_next_internal_doc_number_phase_2_non_numeric_safe.sql` | Migration 2 |
| `supabase/migrations/20260518112327_m1_next_purchase_order_number_phase_2_non_numeric_safe.sql` | Migration 3 |
| `supabase/migrations/20260518112328_m1_next_return_number_phase_2_non_numeric_safe.sql` | Migration 4 |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2/SPEC.md` | Sealed SPEC |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2/ACTIVATION_PROMPT.md` | Executor activation |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2/EXECUTION_REPORT.md` | This file |
| `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2/FINDINGS.md` | Sibling findings |

### 3.4 Files NOT modified (per §7)

- Any of the 4 Phase 1 RPCs
- Any K-RPC caller (`m1_create_receipt_from_box`, `place_purchase_order`, etc.)
- Any JS code
- Any RLS / policy / view / GRANT
- Any production data (only 4 Tier C transients, all soft-deleted)

### 3.5 Success Criteria Audit

| # | Criterion | Status |
|---|---|---|
| S1 | Branch clean post-push | ✅ |
| S2 | Commits in {3} | 3 (`4daba86` + `40a52c4` + this closure) |
| S3 | 4 migration files | ✅ |
| S4 | Each body has regex guard | ✅ 4/4 |
| S5 | Signatures preserved | ✅ 4/4 |
| S6–S9 | Per-RPC Tier C empirical proof | ✅ 4/4 (see §3.2 table) |
| S10 | Cleanup soft-deletes | ✅ all 4 rows is_deleted=true |
| S11 | get_advisors clean | ✅ 0 ERROR; 4 pre-existing WARN unchanged |
| S12 | Integrity gate exit 0 | ✅ |
| S13 | Iron Rule 32 — 0 violations | ✅ |
| S14 | Group A + B regression | ✅ POs List loads cleanly |
| S15 | EXECUTION_REPORT + FINDINGS present | ✅ |
| S16 | Module 1.5 SESSION_CONTEXT + CHANGELOG updated | ✅ (this commit) |

## 4. Commits

| # | Hash | Subject |
|---|---|---|
| 1 | `4daba86` | `chore(spec): author M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 SPEC` |
| 2 | `40a52c4` | `fix(db): phase 2 — harden 4 sibling next_*_number RPCs against non-numeric suffix` |
| 3 | (this commit) | `chore(spec): close M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 — defect class closed across all 8 RPCs` |

Total: **3 commits**.

## 5. Deviations

**None.** Every success criterion matched on first verification pass. The Tier C cycle pattern (DO block with INSERT + set_config + RPC + UPDATE) is a clean replacement for the more brittle "drive 4 different UI flows" approach — same empirical coverage, ~5 minutes total vs ~30+ minutes UI work.

## 6. Tier C Evidence

No browser screenshots — Tier C was fully SQL-driven (DO blocks via Supabase MCP). Evidence is captured inline in §3.2 (per-cycle table) and verifiable via the migration files in `supabase/migrations/`.

## 7. Final State

- **Repo:** clean post-push to `origin/develop`
- **DB:** 4 RPC bodies updated in place via CREATE OR REPLACE; 4 Tier C transients all soft-deleted; zero persistent data changes
- **JS:** unchanged
- **Defect class status:** ALL 8 `next_*_number` RPCs in the project resilient — `next_lot_number` + `next_receipt_number` + `next_po_number` + `next_transfer_number` (Phase 1) + `next_box_number` + `next_internal_doc_number` + `next_purchase_order_number` + `next_return_number` (Phase 2). The regex-guard pattern is established as the canonical sequential-number generator design.
- **Next:** SKILL_HARVEST_2026_05_18 — codify the 10 SKILL proposals harvested across today's 5-SPEC arc into opticup-strategic + opticup-executor SKILL.md.

## 8. Pipeline Coordination

Solo on `develop`. No collisions. Path X sequential. The 3-commit shape matched §10 exactly.
