# ACTIVATION_PROMPT — M1_LENS_PURCHASE_ORDER_REBUILD

**For:** opticup-executor in Claude Code session, Path X sequential authorization.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PURCHASE_ORDER_REBUILD/SPEC.md`

## Pre-flight already validated (in SPEC §0)

- 387-line mockup is the spec (Pattern P-AR-16)
- All 5 Phase 0 shared components present (paths verified)
- Brief typo caught: use `shared/css/wizard-step-indicator.css`, NOT `shared/css/wizard.css`
- 4 RPCs unchanged: place_purchase_order, mark_po_sent, cancel_purchase_order, next_purchase_order_number
- Zero external cross-module callers — safe to rewrite in place
- Zero DDL

## Bounded Autonomy

- All §3 success criteria are measurable
- §4 Destructive Operations: None (one optional file removal pre-authorized)
- §5 Autonomy Envelope is broad: 3-5 commits, end-to-end
- Stop ONLY on deviation per §6 + §10
- No Prizma writes — Tier C runs on demo tenant only

## Execution sequence

1. Claim pipeline lock per SPEC §11
2. Backup old files per Iron Rule 9 (> 5 files affected)
3. Read mockup in full (387 lines) + SPEC 4/5 Group A files as reference for shared-component patterns
4. Plan file decomposition (5-7 JS files, each ≤ 300 lines)
5. Rewrite each file 1:1 to mockup
6. Update inventory-shell-lens.js manifest + inventory.html if needed
7. Verify locally — no console errors on the PO tab; Group A screens unaffected
8. Tier C VFV per §8 — 14 steps including DB query verification
9. Write EXECUTION_REPORT + FINDINGS
10. 3-5 commits per §10. Release lock. Push to develop.

## Stop-on-deviation

- Any RPC fails on demo tenant with non-401 error → STOP
- Any file > 350 lines → STOP (Iron Rule 12 hard cap)
- Iron Rule 32 hook fires → STOP (this SPEC declares None.)
- `place_purchase_order` returns success without writing a row → STOP
- Group A regression → STOP
- Any signature change required to one of the 4 RPCs → STOP

## Constraints

- All Iron Rules enforced. No bypass.
- Mockup IS the spec.
- Tier C VFV mandatory (≥ 4 screenshots).
- No Prizma writes.
- Path X sequential — after this SPEC closes 🟢, the session moves on to SPEC 7 executor dispatch (Foreman authors+dispatches sequentially per parent Brief).

## Final report to Foreman

Standard executor final report format:
- Commits (hash + subject)
- git status post-push
- verify_integrity result
- Tier C screenshot paths
- FINDINGS count + severity breakdown
- Next: "PO rebuild closed 🟢; ready for SPEC 7 dispatch"

---

**END ACTIVATION_PROMPT**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Path X sequential per Daniel directive._
