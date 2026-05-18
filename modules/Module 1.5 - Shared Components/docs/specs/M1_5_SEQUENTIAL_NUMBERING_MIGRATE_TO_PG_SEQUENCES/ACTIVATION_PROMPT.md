# ACTIVATION_PROMPT — M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES

**For:** opticup-executor, Path X sequential. **Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1.5 - Shared Components/docs/specs/M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES/SPEC.md`

## Pre-flight (in SPEC §0)

- Strategic design decision: Option E (HYBRID) over pure Option A documented + rationale captured in §0
- 4 in-scope RPCs: `next_lot_number`, `next_transfer_number`, `next_box_number`, `next_purchase_order_number`
- 4 OUT-OF-SCOPE RPCs (keep regex-guarded MAX): `next_receipt_number`, `next_po_number` (frames), `next_return_number`, `next_internal_doc_number`
- Sequence starting values captured live: 19 / 2 / 2 / 300007
- Only 2 direct JS callers across all 4 (both for next_box_number); 3 are server-side only

## Bounded Autonomy

- §3: 20 measurable criteria
- §4 declares 4 CREATE SEQUENCE + 4 CREATE OR REPLACE FUNCTION (reversible)
- §5 broad: end-to-end execution

## Execution sequence

1. Apply 4 `CREATE SEQUENCE` migrations + `GRANT USAGE TO authenticated` per sequence
2. Apply 4 `CREATE OR REPLACE FUNCTION` migrations rewriting RPC bodies to use `nextval()`
3. Verify each new function body contains `nextval()` + signatures unchanged
4. Verify the 4 OTHER RPCs UNTOUCHED via `pg_get_functiondef` diff
5. Run `get_advisors(security)` — confirm clean
6. Tier C per §8 — 4 cycles (1 per RPC): inject corrupt row + 3× call + verify monotonic + soft-delete
7. TECH_DEBT.md #14 status update to PARTIAL
8. Group A regression check (POs List, GR tabs)
9. Write EXECUTION_REPORT + FINDINGS
10. 3 commits per §10, push to develop

## Stop-on-deviation

- Any migration fails
- Any of the 4 OUT-OF-SCOPE RPCs touched accidentally
- nextval returns NULL or wrong starting value
- Format regex mismatch
- Corrupt-row Tier C produces output influenced by the corrupt row (would mean rewrite is incomplete)

## Constraints

- All Iron Rules enforced. No bypass.
- Tier C VFV mandatory.
- No Prizma writes — demo only.
- After this SPEC closes 🟢, structural Phase 2 is complete (hybrid). Pure Option A remains as optional Phase 3 (out of scope here).

## Final report

- Commits + git status
- 4 sequence last_values post-migration
- 4 Tier C cycle results (3 sequential numbers per RPC)
- FINDINGS count
- TECH_DEBT #14 status: PARTIAL (Phase 2 closed; 4 of 8 migrated)

---

**END ACTIVATION_PROMPT**
