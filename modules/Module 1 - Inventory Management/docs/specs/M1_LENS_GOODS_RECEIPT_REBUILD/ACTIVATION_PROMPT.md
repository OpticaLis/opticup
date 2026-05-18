# ACTIVATION_PROMPT — M1_LENS_GOODS_RECEIPT_REBUILD

**For:** opticup-executor, Path X sequential. Runs AFTER SPEC 7 closes 🟢.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_GOODS_RECEIPT_REBUILD/SPEC.md`

## Pre-flight already validated (in SPEC §0)

- 635-line mockup is the spec (Pattern P-AR-16) — largest Group B mockup
- All Phase 0 shared components present (paths verified; group-header-row + table-builder synthetic-row pattern is the band carrier)
- `m1_create_receipt_from_box` is **9-arg signature** post-M1_FOUNDATION_CLOSE_CLEANUP (this morning) — Executor MUST call with `p_has_no_invoice` named arg
- Quick Receipt drawer (SPEC 4a) ≠ Goods Receipt screen (this SPEC) — distinct surfaces, documented in §0
- Zero external cross-module callers — safe to rewrite in place
- Zero DDL
- **Inventory module NEVER creates supplier_debt rows** — codified in §3 S6 + S15 + §7 Out of Scope

## Bounded Autonomy

- All §3 success criteria are measurable
- §4 Destructive Operations: None
- §5 Autonomy Envelope broad
- Stop ONLY on deviation per §6 + §10
- No Prizma writes — Tier C runs on demo tenant only

## Execution sequence

1. Claim pipeline lock per SPEC §11
2. Confirm `m1_create_receipt_from_box` 9-arg signature live via Supabase MCP `execute_sql` against `pg_proc`
3. Backup old files per Iron Rule 9 (> 5 files affected)
4. Read mockup + current implementation + SPEC 4a + SPEC 6 + SPEC 7 deliverables
5. Rewrite each JS file
6. Update inventory-shell-lens.js manifest if file count changes
7. Verify locally — Group A + SPEC 6 + SPEC 7 not regressed
8. Tier C VFV per §8 — 11 steps including 9-arg RPC call + stock_lot link verify + zero-supplier_debt-from-inventory verify
9. Write EXECUTION_REPORT + FINDINGS
10. 3-5 commits per §10. Release lock. Push to develop.

## Stop-on-deviation

- §0 RPC arity probe shows 8-arg signature still callable → STOP
- S6 grep finds supplier_debt INSERT/RPC from this module → STOP (debt-decoupling violation)
- File size > 350 → STOP
- Iron Rule 32 hook fires → STOP

## Constraints

- All Iron Rules enforced. No bypass.
- Mockup IS the spec.
- Tier C VFV mandatory (≥ 3 screenshots).
- No Prizma writes.
- Path X sequential — after this SPEC closes 🟢, Group B is COMPLETE. Foreman reports final summary to Daniel.

## Final report to Foreman

- Commits (hash + subject)
- git status post-push
- verify_integrity result
- Tier C screenshot paths
- FINDINGS count + severity
- supplier_debt row count delta from smoke (should be 0 from inventory module's RPC path)
- Next: "Goods Receipt rebuild closed 🟢; Group B 100% COMPLETE; ready for Group C / toggle-semantics SPEC dispatch"

---

**END ACTIVATION_PROMPT**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Path X sequential per Daniel directive._
