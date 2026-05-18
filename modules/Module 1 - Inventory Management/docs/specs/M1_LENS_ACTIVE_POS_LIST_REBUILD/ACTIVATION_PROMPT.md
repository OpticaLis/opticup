# ACTIVATION_PROMPT — M1_LENS_ACTIVE_POS_LIST_REBUILD

**For:** opticup-executor, Path X sequential. Runs AFTER SPEC 6 closes 🟢.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_ACTIVE_POS_LIST_REBUILD/SPEC.md`

## Pre-flight already validated (in SPEC §0)

- 509-line mockup is the spec (Pattern P-AR-16)
- All 4 Phase 0 shared components present (paths verified)
- 2 RPCs unchanged: mark_po_sent, cancel_purchase_order
- Zero external cross-module callers — safe to rewrite in place
- Zero DDL
- **5 stat cards including "⚠️ באיחור" (overdue) as a DERIVED predicate, NOT a status enum value** — Step 5.3 trap codified in §3 S4

## Bounded Autonomy

- All §3 success criteria are measurable
- §4 Destructive Operations: None
- §5 Autonomy Envelope broad
- Stop ONLY on deviation per §6 + §10
- No Prizma writes — Tier C runs on demo tenant only

## Execution sequence

1. Claim pipeline lock per SPEC §11
2. Run §0 status-column distinct-values probe FIRST (data-state-sensitive)
3. Backup old files per Iron Rule 9 (> 100 lines refactored)
4. Read mockup + current implementation + SPEC 6 deliverables (reference)
5. Rewrite each JS file
6. Update inventory-shell-lens.js manifest if file count changes
7. Verify locally — Group A + SPEC 6 PO not regressed
8. Tier C VFV per §8 — 12 steps including overdue DB-truth match
9. Write EXECUTION_REPORT + FINDINGS
10. 3-4 commits per §10. Release lock. Push to develop.

## Stop-on-deviation

- §0 probe surfaces unexpected status enum value → STOP
- S4 grep finds overdue treated as status enum → STOP
- Any RPC contract drift → STOP
- File size > 350 → STOP

## Constraints

- All Iron Rules enforced. No bypass.
- Mockup IS the spec.
- Tier C VFV mandatory (≥ 3 screenshots).
- No Prizma writes.
- Path X sequential — after this SPEC closes 🟢, the session moves on to SPEC 8 executor dispatch.

## Final report to Foreman

- Commits (hash + subject)
- git status post-push
- verify_integrity result
- Tier C screenshot paths
- FINDINGS count + severity
- Next: "POs List rebuild closed 🟢; ready for SPEC 8 dispatch"

---

**END ACTIVATION_PROMPT**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Path X sequential per Daniel directive._
