# ACTIVATION_PROMPT — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2

**For:** opticup-executor, Path X sequential.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2/SPEC.md`

## Pre-flight already validated (in SPEC §0)

- 4 RPC bodies captured live (next_box_number, next_internal_doc_number, next_purchase_order_number, next_return_number)
- All 4 target tables have `is_deleted` for soft-delete cleanup
- Zero JS callers — all 4 RPCs are server-side only
- Zero pre-existing corrupt rows on the 2 probable tables (shipments, purchase_order); Tier C will inject deliberate corrupt rows

## Bounded Autonomy

- §3 has 16 measurable criteria
- §4 declares 4 CREATE OR REPLACE migrations + 4 transient INSERT/soft-delete cycles
- Stop only on deviation per §6

## Execution sequence

1. Apply 4 `apply_migration` via Supabase MCP (one per RPC)
2. Verify regex guard via `pg_get_functiondef`
3. Verify signatures via `pg_get_function_identity_arguments`
4. Run `get_advisors(security)` — confirm clean
5. Tier C per §8: 4 cycles (1 per RPC) — inject corrupt row → call RPC with set_config jwt claim → verify numeric output → soft-delete
6. Regression: POs List + GR tabs load cleanly
7. Write EXECUTION_REPORT + FINDINGS
8. Update Module 1.5 SESSION_CONTEXT + CHANGELOG
9. 3 commits per §10. Push to develop.

## Stop-on-deviation

- Migration fails
- Regex guard missing post-migration
- Signature drift
- Tier C RPC returns non-numeric output
- Cleanup soft-delete fails
- New advisor entry on the 4 RPCs

## Constraints

- All Iron Rules enforced. No bypass.
- No Prizma writes — demo only.
- Path X sequential — after closure, next task is SKILL_HARVEST_2026_05_18.

## Final report

- Commits + git status
- verify_integrity result
- 4 Tier C cycle results (each: inject → call → output → cleanup)
- FINDINGS count
- Defect class status: "8 of 8 next_*_number RPCs hardened"

---

**END ACTIVATION_PROMPT**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Path X sequential per Daniel directive._
