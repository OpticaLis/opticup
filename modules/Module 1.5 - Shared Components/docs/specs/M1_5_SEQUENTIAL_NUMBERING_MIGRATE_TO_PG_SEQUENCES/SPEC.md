---
spec_id: M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES
title: Migrate 4 plain next_*_number RPCs to PostgreSQL SEQUENCE objects (Option E hybrid)
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1.5 - Shared Components
status: SEALED — ready for execution
parent_report: modules/Module 1.5 - Shared Components/architecture-brief/SEQUENTIAL_NUMBERING_INVESTIGATION_REPORT.md
phase: Phase 2 — structural migration (Phase 1 = investigation report)
parent_tech_debt: TECH_DEBT.md #14 (TD-SEQ-NUMBERING-STRUCTURAL)
---

# SPEC — M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Strategic design decision — Option E (HYBRID), not pure Option A

The Phase 1 investigation report named Option A (real PG SEQUENCE for all 8 fragile RPCs) as the Foreman recommendation. After re-examining demo + Prizma data, **the Foreman now recommends Option E (hybrid):** real PG SEQUENCEs for the 4 truly-plain RPCs; regex-guarded MAX (the Phase 1+2 hardening) PRESERVED for the 4 RPCs that need per-(tenant, supplier) or dynamic-prefix counter semantics. Rationale:

| RPC | Current behavior | Pure Option A behavior | Option E behavior |
|---|---|---|---|
| `next_lot_number` | LOT-NNNNNN, per-tenant via `WHERE tenant_id=` | Global counter; tenant_id stays in `stock_lot.tenant_id` but counter is global | ⇒ **MIGRATE TO SEQUENCE** (one global counter is acceptable since `lot_number` is just a unique identifier; no UI expectation of per-tenant continuity) |
| `next_transfer_number` | TRN-NNNNNN, per-tenant | Same as above | ⇒ **MIGRATE TO SEQUENCE** |
| `next_box_number` | BOX-NNNN, per-tenant | Same as above | ⇒ **MIGRATE TO SEQUENCE** |
| `next_purchase_order_number` (M1B0 lens) | PO-NNNNNN, per-tenant | Same as above | ⇒ **MIGRATE TO SEQUENCE** |
| `next_receipt_number` | RCP-{supplier}-NNNN, **per-(tenant, supplier)** counter | ⚠ Global counter; receipt numbers skip per supplier (RCP-9016-0001 → RCP-9016-0017 if 16 other-supplier rows happened in between) | ⇒ **KEEP** regex-guarded MAX (preserves current per-supplier semantics) |
| `next_po_number` (frames) | PO-{supplier}-NNNN, per-(tenant, supplier) — verified on Prizma: `PO-12-0001..0003` | ⚠ Same skip-numbers regression for Prizma | ⇒ **KEEP** regex-guarded MAX |
| `next_return_number` | RET-{supplier}-NNNN, per-(tenant, supplier) — verified on Prizma: `RET-28-0011..0013` | ⚠ Same regression | ⇒ **KEEP** regex-guarded MAX |
| `next_internal_doc_number` | {dynamic_prefix}-NNNNN, per-(tenant, prefix) counter | ⚠ Single sequence cannot serve multiple prefix scopes; dynamic prefix is the whole point | ⇒ **KEEP** regex-guarded MAX (dynamic prefix incompatible with single SEQUENCE) |

**Verdict:** Option E delivers structural sequences for 4 of 8 RPCs (50% structural win) while preserving correct per-supplier/per-prefix counter semantics for the other 4. The Phase 1+2 regex-guard hardening remains the canonical pattern for cases where sequences cannot fit.

If Daniel prefers pure Option A: a follow-up SPEC `M1_5_SEQUENTIAL_NUMBERING_PHASE_3_GLOBAL` can convert the remaining 4 to global sequences after Prizma stakeholder review. Out of scope here.

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| All 8 RPCs hardened by Phase 1 + Phase 2 (2026-05-18) | ✅ | Each has regex guard `~ '^[0-9]+$'` already applied |
| Investigation report at `architecture-brief/SEQUENTIAL_NUMBERING_INVESTIGATION_REPORT.md` | ✅ | Phase 1 commit `0c049fb` |
| TECH_DEBT.md #14 TD-SEQ-NUMBERING-STRUCTURAL | ✅ | Created during Phase 1 |

### Step 1.7 — Consumer grep on the 4 in-scope RPCs

```
next_lot_number, next_receipt_number, next_transfer_number      — server-side only (called inside K-RPCs: m1_create_receipt_from_box, record_transfer)
next_box_number                  — modules/shipments/shipments-create.js + shipments-lock.js (2 JS consumers)
next_purchase_order_number       — server-side only (called inside place_purchase_order)
```

**4 in-scope (migrating to SEQUENCE): 0 direct JS callers for 3 of them; 2 JS callers for next_box_number.** Both JS callers consume the returned string verbatim ("BOX-NNNN"). Format preserved = zero JS contract change.

### DB pre-flight — current MAX values (live 2026-05-18 IDT)

| Target column | Current MAX (regex-filtered) | Sequence starting value |
|---|---|---|
| `stock_lot.lot_number` (LOT-) | 18 | `seq_lot_number` START 19 |
| `stock_transfer.transfer_number` (TRN-) | 1 | `seq_transfer_number` START 2 |
| `shipments.box_number` (BOX-) | 1 | `seq_box_number` START 2 |
| `purchase_order.po_number` (M1B0 lens PO-, including soft-deleted) | 300006 | `seq_purchase_order_number` START 300007 |

### Lessons applied from today's harvest

- **P-AUTHOR-G** (canonical 3-line grant footer) — Every new RPC body using `nextval()` retains the canonical `REVOKE FROM PUBLIC + REVOKE FROM anon + GRANT TO authenticated` footer. Note: sequences themselves have separate `GRANT USAGE` semantics; SECURITY DEFINER + `nextval()` lets the function bypass sequence permissions.
- **P-STRAT-D** (Tier C K-RPC cleanup) — §8 enumerates ALL side-effect tables per Tier C cycle.
- **P-EXEC-E** (set_config JWT for MCP RPC calls) — Tier C DO blocks use `set_config('request.jwt.claims', ...)` for each RPC call.

---

## 1. Goal

Migrate 4 plain `next_*_number` RPCs to use `nextval()` against dedicated PostgreSQL SEQUENCE objects, replacing the `MAX(CAST(SUBSTRING(...) AS INT))` pattern. The remaining 4 RPCs (supplier-scoped + dynamic-prefix) retain the regex-guarded MAX pattern from Phase 1+2 as the canonical design for their use cases.

## 2. Background

Phase 1 (investigation, 2026-05-18) confirmed zero project-level PG SEQUENCEs exist; all 8 `next_*_number` RPCs use `MAX(CAST(...))`. The Phase 1 + 2 resilience SPECs (regex guard) made the pattern resistant to data corruption but did not change the structural design. Phase 2 (this SPEC) delivers the structural migration for the 4 RPCs where global sequences fit cleanly.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 3-4 |
| S3 | 4 new SEQUENCE objects created | `SELECT count(*) FROM information_schema.sequences WHERE sequence_schema='public' AND sequence_name LIKE 'seq_%'` | 4 |
| S4 | Each sequence seeded correctly | `SELECT last_value FROM seq_*` matches table MAX | 4/4 |
| S5 | 4 RPC bodies rewritten to use `nextval()` | `pg_get_functiondef ~ 'nextval'` for each | 4/4 |
| S6 | Signatures + return types unchanged | `pg_get_function_identity_arguments` | 4/4 match pre-flight |
| S7 | Format unchanged (LOT-NNNNNN, TRN-NNNNNN, BOX-NNNN, PO-NNNNNN) | live RPC call returns string matching expected pattern | 4/4 |
| S8 | Old `MAX(CAST(...))` pattern REMOVED from rewritten RPCs | grep `MAX\(CAST` against the 4 rewritten functions | 0 hits |
| S9 | Regex guard REMOVED from rewritten RPCs (no longer needed) | grep `~ '\^\[0-9\]\+\$'` against the 4 | 0 hits |
| S10 | The OTHER 4 RPCs (RCP, PO-frames, RET, internal-doc) UNCHANGED | `pg_get_functiondef` of each matches Phase 1/2 final | 4/4 unchanged |
| S11 | get_advisors(security) clean of new ERROR/HIGH | get_advisors | 0 new |
| S12 | Tier C: each of the 4 migrated RPCs returns monotonic-increasing values across 3 consecutive calls | DO block + 3× nextval | 3 numbers strictly increasing |
| S13 | Tier C: insert a corrupt-suffix row to one of the 4 target tables; the RPC IGNORES it (returns next sequence value, not MAX+1) | INSERT corrupt + call RPC + verify result is from sequence, not from corrupt row | confirmed |
| S14 | Tier C: each RPC's returned string matches expected format regex | output regex check | 4/4 |
| S15 | All Tier C smoke data soft-deleted | UPDATE … is_deleted=true | confirmed |
| S16 | Integrity gate exit 0 at every commit | `npm run verify:integrity` | exit 0 |
| S17 | Iron Rule 32 — §4 declares all DDL + reversible | pre-commit | 0 violations |
| S18 | TECH_DEBT.md #14 status updated to "PARTIAL — Phase 2 closed; 4 of 8 RPCs migrated. Remaining 4 stay regex-guarded as canonical pattern for their use cases" | grep | confirmed |
| S19 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |
| S20 | Module 1.5 SESSION_CONTEXT + CHANGELOG updated | grep | entries appended |

## 4. Destructive Operations

1. **4 `CREATE SEQUENCE`** (one per migrating RPC):
   - `CREATE SEQUENCE public.seq_lot_number AS bigint START 19;`
   - `CREATE SEQUENCE public.seq_transfer_number AS bigint START 2;`
   - `CREATE SEQUENCE public.seq_box_number AS bigint START 2;`
   - `CREATE SEQUENCE public.seq_purchase_order_number AS bigint START 300007;`
2. **4 `CREATE OR REPLACE FUNCTION`** (rewrites the 4 RPC bodies to use `nextval()` instead of `MAX(CAST(...))`; regex guard removed since it's no longer needed). Reversible by re-applying the Phase 2-final bodies (captured in resilience SPECs).

**Forbidden:**
- Modifying the OTHER 4 RPCs (RCP, PO-frames, RET, DOC) — out of scope
- Dropping any RPC
- Changing any RPC's signature
- Dropping the regex guard from RPCs that keep MAX pattern
- Changing the canonical `REVOKE PUBLIC + REVOKE anon + GRANT authenticated` grant footer
- UPDATEs/DELETEs on existing data rows
- New tables, views, policies, or RLS changes

## 5. Autonomy Envelope

**Can do without asking:**
- Apply 8 migrations via Supabase MCP (4 CREATE SEQUENCE + 4 CREATE OR REPLACE FUNCTION)
- GRANT USAGE on each sequence to `authenticated` (SECURITY DEFINER's effective role bypasses this but explicit grant is the canonical M1A pattern)
- Verify each RPC body + signature post-migration
- Run `get_advisors(security)` post-migration
- Tier C per §8 (12 steps)
- TECH_DEBT.md #14 status update
- 3-4 commits per §10

**MUST stop and report:**
- Any migration fails
- Any of the 4 OTHER RPCs accidentally touched
- `nextval()` returns NULL (would indicate sequence not created)
- Format regex mismatch (would indicate LPAD logic error)
- Corrupt-row insert blocks the sequence-based path (would indicate logic error)
- get_advisors returns new ERROR/HIGH on any of the 4 rewritten RPCs

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- If sequence `last_value` after seeding doesn't match the pre-flight MAX → STOP
- If S10 verification shows one of the 4 OTHER RPCs got touched → STOP (scope creep)
- If the 4 rewritten RPCs still contain `MAX(CAST` → STOP (rewrite incomplete)

## 7. Out of Scope (explicit)

- The 4 OTHER RPCs (next_receipt_number, next_po_number frames, next_return_number, next_internal_doc_number) — these stay regex-guarded as the canonical pattern for supplier-scoped + dynamic-prefix use cases
- The 3 `*_variant_display_id` row-as-sequence RPCs — already non-fragile (separate pattern)
- Any data backfill or cleanup
- Any RLS change
- Any new JS code (existing JS consumers continue working unchanged)
- Pure Option A (global sequences for all 8) — deferred to potential `_PHASE_3_GLOBAL` SPEC after stakeholder review

## 8. QA / Tier C Verification Plan

For EACH of the 4 migrated RPCs:

1. Pre-cycle: capture sequence `last_value` via `SELECT last_value FROM seq_<name>`.
2. Insert a deliberately corrupt-suffix row on the target table (matching the pattern that broke the system before regex guard).
3. Call the RPC 3 times via DO block with `set_config('request.jwt.claims', ...)`:
   ```sql
   PERFORM set_config('request.jwt.claims', json_build_object('tenant_id', v_tid::text, 'role', 'authenticated')::text, true);
   v_n1 := my_rpc(v_tid);
   v_n2 := my_rpc(v_tid);
   v_n3 := my_rpc(v_tid);
   ```
4. Verify all 3 returns:
   - Match the format regex (e.g., `^LOT-\d{6}$`)
   - Numeric suffixes are strictly increasing (`n1 < n2 < n3`)
   - The corrupt row's suffix did NOT influence the result (RPC continued from `last_value+1`, not `MAX+1`)
5. Soft-delete the corrupt row.

After all 4 cycles complete:
- Group A regression check: navigate POs List, GR, Designs Selection — verify clean load
- Final advisor check + integrity gate

## 9. Expected Final State

### Repo
- 4 new sequences in `public` schema (visible in `information_schema.sequences`)
- 4 RPC bodies rewritten with `nextval()` pattern; regex guard removed
- 4 other RPCs unchanged (regex guard preserved as canonical for their use cases)
- 8 migration files: 4 `*_create_seq_*.sql` + 4 `*_rewrite_next_*_to_nextval.sql`
- TECH_DEBT.md #14 status updated

### DB
- 4 new sequence objects + 4 rewritten functions
- 0 persistent data writes (Tier C transients soft-deleted)
- The 3 corrupt `LOT-PO300005-*` rows from earlier in this session remain present (filtered out by the new sequence-based RPC + earlier regex guard; cleanup is a separate concern)

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES SPEC` | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `feat(db): 4 PG SEQUENCEs + rewrite 4 next_*_number RPCs to use nextval()` | 8 migration .sql files |
| 3 | `chore(spec): close M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES — Phase 2 hybrid complete; 4 of 8 RPCs sequence-based` | EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT + CHANGELOG + TECH_DEBT update |

Total: 3 commits.

## 11. Pipeline Coordination

`files_owned_globs`:
```
supabase/migrations/**
modules/Module 1.5 - Shared Components/docs/specs/M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES/**
modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md
TECH_DEBT.md
```

Branch: `develop`. Path X sequential. No worktree.

## 12. Rollback Plan

If any of the 4 RPC rewrites fail Tier C empirical verification:
- DROP each affected sequence: `DROP SEQUENCE seq_<name>;`
- Re-apply the Phase 2-final RPC body (regex-guarded MAX pattern) via CREATE OR REPLACE
- 2 commits: `revert` + `chore(spec): reopen`

If the sequence seeding (setval-equivalent via `START` clause) miscalculates and causes a duplicate-PK risk:
- ALTER SEQUENCE to advance to correct value: `SELECT setval('seq_<name>', <correct_max>+1, false);`

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] 4 Tier C cycles all pass (3 sequential calls each + corrupt-row resistance)
- [ ] All 4 OTHER RPCs verified UNCHANGED
- [ ] TECH_DEBT.md #14 status updated to PARTIAL
- [ ] get_advisors clean

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Strategic design call: Option E (hybrid) over pure Option A documented in §0. The 4 supplier-scoped + dynamic-prefix RPCs stay regex-guarded as canonical for their use cases._
