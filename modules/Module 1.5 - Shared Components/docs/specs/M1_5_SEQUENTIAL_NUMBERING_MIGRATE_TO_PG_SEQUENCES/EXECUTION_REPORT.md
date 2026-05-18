---
spec_id: M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES
executor: opticup-executor (Path X)
executed: 2026-05-18 IDT
status: 🟢 CLOSED — Phase 2 hybrid structural migration complete (4 of 8 RPCs sequence-based)
---

# EXECUTION_REPORT — M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES

## 1. Outcome

**🟢 CLEAN SHIP.** 4 PostgreSQL SEQUENCE objects created + 4 SECURITY DEFINER RPC bodies rewritten to use `nextval()`. Tier C empirical verification PASSED for all 4 migrated RPCs across 3 sequential calls each (monotonic increase, format match, starting value match, corrupt-row resistance). Out-of-scope 4 RPCs untouched. Security advisor clean (0 new ERROR/HIGH). All Tier C smoke rows soft-deleted.

20 of 20 §3 success criteria met. 1 self-introduced deviation caught + reverted mid-execution (see FINDINGS F-1).

## 2. Final Sequence State (post-Tier C)

| Sequence | START | last_value after 3 calls | Expected |
|---|---|---|---|
| `seq_lot_number` | 19 | 21 | 21 ✅ |
| `seq_transfer_number` | 2 | 4 | 4 ✅ |
| `seq_box_number` | 2 | 4 | 4 ✅ |
| `seq_purchase_order_number` | 300007 | 300009 | 300009 ✅ |

## 3. What Was Done

### Step 1 — 4 CREATE SEQUENCE migrations
Applied via Supabase MCP `apply_migration` (all `{"success":true}`):
- `seq_lot_number` AS bigint START 19 + GRANT USAGE TO authenticated
- `seq_transfer_number` AS bigint START 2 + GRANT USAGE TO authenticated
- `seq_box_number` AS bigint START 2 + GRANT USAGE TO authenticated
- `seq_purchase_order_number` AS bigint START 300007 + GRANT USAGE TO authenticated

### Step 2 — 4 CREATE OR REPLACE FUNCTION migrations (with v2 fix)
Each rewrites the RPC body to `nextval('public.seq_<name>')` + `LPAD(..., N, '0')` while preserving the canonical JWT guard pattern verbatim from the pre-migration body. Signatures unchanged: `(p_tenant_id uuid) RETURNS text`. SECURITY DEFINER preserved.

**Self-introduced deviation caught + reverted mid-execution** (F-1 — see FINDINGS.md): my v1 rewrites added a `service_role` bypass branch to the JWT guard that was not in the original bodies and not authorized by the SPEC. Detected immediately after applying (before Tier C), then reverted via 4 v2 CREATE OR REPLACE FUNCTION migrations restoring the exact original 2-line JWT guard. Final state matches pre-migration behavior parity exactly except for the structural body change.

### Step 3 — Verification queries
- All 4 in-scope RPCs: `has_nextval=true`, `still_has_max_cast=false`, `has_jwt_guard=true`, `has_service_bypass=false` ✅
- All 4 out-of-scope RPCs (RCP, PO frames, RET, DOC): `still_has_max_cast=true`, `has_nextval=false` ✅ — untouched

### Step 4 — Security advisor
`get_advisors(security)` returned 109 WARN findings, 0 ERROR. The 4 in-scope RPCs surface the standard `authenticated_security_definer_function_executable` WARN (pre-existing baseline noise — every SECURITY DEFINER function callable by authenticated triggers it). No new ERROR-level findings. The 4 new SEQUENCE objects produced 0 findings. ✅

### Step 5 — Tier C empirical verification (4 cycles)

Each cycle: insert corrupt-suffix row → set JWT claim → 3× call RPC → verify format regex + monotonic + starting value + corrupt-row resistance → soft-delete corrupt row.

| RPC | Corrupt row | Call 1 | Call 2 | Call 3 | Format ✓ | Monotonic ✓ | Start matches ✓ | Soft-delete ✓ |
|---|---|---|---|---|---|---|---|---|
| `next_lot_number` | `LOT-CORRUPT99` | `LOT-000019` | `LOT-000020` | `LOT-000021` | ✅ | ✅ | ✅ | ✅ |
| `next_transfer_number` | `TRN-CORRUPT99` | `TRN-000002` | `TRN-000003` | `TRN-000004` | ✅ | ✅ | ✅ | ✅ |
| `next_box_number` | `BOX-CORRUPT9` | `BOX-0002` | `BOX-0003` | `BOX-0004` | ✅ | ✅ | ✅ | ✅ |
| `next_purchase_order_number` | `PO-CORRUPT99` | `PO-300007` | `PO-300008` | `PO-300009` | ✅ | ✅ | ✅ | ✅ |

DO blocks raised 0 exceptions. All assertions passed. Corrupt rows confirmed not to influence sequence values (sequence-based RPC ignores table contents by design). Post-cycle soft-delete verified: 4/4 corrupt rows have `is_deleted=true`, 0 active.

### Step 6 — Master-doc updates
- `TECH_DEBT.md` #14: status updated to PARTIAL — Phase 2 closed; 4 of 8 RPCs migrated. Remaining 4 stay regex-guarded as canonical pattern for supplier-scoped + dynamic-prefix use cases.
- Module 1.5 SESSION_CONTEXT.md + CHANGELOG.md: entries appended in closure commit.

## 4. Files Modified

### New (8 migration files)
- `supabase/migrations/20260518130000_m1_5_seq_create_lot_number.sql`
- `supabase/migrations/20260518130001_m1_5_seq_create_transfer_number.sql`
- `supabase/migrations/20260518130002_m1_5_seq_create_box_number.sql`
- `supabase/migrations/20260518130003_m1_5_seq_create_purchase_order_number.sql`
- `supabase/migrations/20260518130004_m1_5_rewrite_next_lot_number_to_nextval.sql`
- `supabase/migrations/20260518130005_m1_5_rewrite_next_transfer_number_to_nextval.sql`
- `supabase/migrations/20260518130006_m1_5_rewrite_next_box_number_to_nextval.sql`
- `supabase/migrations/20260518130007_m1_5_rewrite_next_purchase_order_number_to_nextval.sql`

### Modified
- `TECH_DEBT.md` — #14 status to PARTIAL
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — Phase 2 closure entry
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — Phase 2 entry

### Untouched (out of scope, verified)
- `next_receipt_number`, `next_po_number` (frames), `next_return_number`, `next_internal_doc_number` — all 4 RPCs UNCHANGED via `pg_get_functiondef` diff.

## 5. Commits

| # | Subject | Hash |
|---|---|---|
| 1 | `chore(spec): author M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES SPEC` | `72dfe47` (pushed prior) |
| 2 | `feat(db): 4 PG SEQUENCEs + rewrite 4 next_*_number RPCs to use nextval()` | (this commit batch) |
| 3 | `chore(spec): close M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES — Phase 2 hybrid complete` | (this commit batch) |

## 6. Success Criteria — Final Tally

| # | Criterion | Result |
|---|---|---|
| S1 | Branch clean post-push | ✅ |
| S2 | 3-4 commits | ✅ (3) |
| S3 | 4 new SEQUENCE objects | ✅ |
| S4 | Each sequence seeded correctly | ✅ |
| S5 | 4 RPC bodies rewritten with `nextval()` | ✅ |
| S6 | Signatures + return types unchanged | ✅ |
| S7 | Format unchanged | ✅ |
| S8 | `MAX(CAST` removed from rewritten RPCs | ✅ (0 hits) |
| S9 | Regex guard removed from rewritten RPCs | ✅ (0 hits) |
| S10 | OTHER 4 RPCs UNCHANGED | ✅ |
| S11 | get_advisors clean of new ERROR/HIGH | ✅ |
| S12 | Tier C monotonic increase | ✅ 4/4 |
| S13 | Tier C corrupt-row resistance | ✅ 4/4 |
| S14 | Tier C format regex match | ✅ 4/4 |
| S15 | All Tier C smoke data soft-deleted | ✅ 4/4 |
| S16 | Integrity gate exit 0 at every commit | ✅ |
| S17 | Iron Rule 32 — §4 declares all DDL + reversible | ✅ |
| S18 | TECH_DEBT.md #14 status updated to PARTIAL | ✅ |
| S19 | EXECUTION_REPORT + FINDINGS in SPEC folder | ✅ (this file + FINDINGS.md) |
| S20 | Module 1.5 SESSION_CONTEXT + CHANGELOG updated | ✅ |

**20 of 20 PASS.**

## 7. Deviations

**1 deviation:** F-1 (self-introduced + self-reverted mid-execution) — v1 RPC rewrites accidentally added a `service_role` JWT bypass branch not authorized by the SPEC. Caught immediately after applying (before Tier C), reverted via 4 v2 CREATE OR REPLACE FUNCTION migrations. Final state has zero behavior change from pre-migration JWT guard. No impact on success criteria. Details in FINDINGS.md.

## 8. Findings Count

- 1 finding (F-1 — self-introduced deviation, self-corrected, INFO severity)

## 9. Next

Awaiting Foreman review.

---

_Authored 2026-05-18 IDT by opticup-executor (Path X)._
