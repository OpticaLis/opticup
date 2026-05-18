# ACTIVATION_PROMPT — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE

**For:** opticup-executor, Path X sequential.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/SPEC.md`

## Pre-flight already validated (in SPEC §0)

- 4 RPCs captured live (next_lot_number, next_receipt_number, next_po_number, next_transfer_number) with their current bodies
- Step 1.7 consumer grep: 1 direct JS consumer (legacy frames `purchase-orders.js`), 3 server-side only
- Defect class confirmed: all 4 use `CAST(SUBSTRING(...) AS INT)` without a numeric-suffix guard
- 3 corrupt demo rows confirmed (`LOT-PO300005-1/-2/-3`)
- 4 sibling RPCs (next_box_number, next_internal_doc_number, next_purchase_order_number, next_return_number) flagged for Phase 2

## Bounded Autonomy

- All §3 success criteria measurable
- §4 declares 4 CREATE OR REPLACE migrations (reversible by re-running pre-flight bodies in §0)
- §5 Autonomy Envelope broad: end-to-end execution
- Stop ONLY on deviation per §6

## Execution sequence

1. Apply 4 migrations via Supabase MCP `apply_migration` (one per RPC)
2. Verify each RPC body contains regex guard via `pg_get_functiondef`
3. Verify each RPC signature unchanged via `pg_get_function_identity_arguments`
4. Run `get_advisors(security)` — confirm clean
5. Tier C smoke per §8 (12 steps): rerun SPEC 8's blocked receipt CREATE; verify receipt + stock_lot + linkage; soft-delete cleanup
6. Regression check: SPEC 6 PO + SPEC 7 POs List tabs load clean
7. Write EXECUTION_REPORT + FINDINGS
8. Write SPEC 8 FOREMAN_REVIEW.md marking F-1 RESOLVED + verdict upgrade 🟡 → 🟢
9. Update Module 1 SESSION_CONTEXT + CHANGELOG to reflect Group B 100% COMPLETE
10. Update Module 1.5 SESSION_CONTEXT with this SPEC
11. 3 commits per §10, push to develop

## Stop-on-deviation

- Any migration fails
- RPC body post-migration missing the regex guard
- Signature drift
- Smoke RPC still fails after migrations
- 3 corrupt rows get accidentally modified (only-filter intent violated)
- Sibling RPCs touched accidentally

## Constraints

- All Iron Rules enforced. No bypass.
- Tier C VFV mandatory (≥ 2 screenshots).
- No Prizma writes.
- Path X sequential — after this SPEC closes 🟢 + SPEC 8 verdict upgrades, **Group B = 100% COMPLETE**.

## Final report to Foreman

- Commits made (hash + subject)
- git status post-push
- verify_integrity result
- Tier C screenshots
- FINDINGS count
- Confirmation that SPEC 8 verdict upgraded 🟡 → 🟢
- Final declaration: Group B 100% COMPLETE

---

**END ACTIVATION_PROMPT**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Path X sequential per Daniel directive._
