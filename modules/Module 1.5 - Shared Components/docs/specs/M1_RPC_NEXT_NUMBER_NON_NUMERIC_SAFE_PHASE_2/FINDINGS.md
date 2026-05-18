---
spec_id: M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2
authored: 2026-05-18 IDT
total_findings: 0
status: 🟢 closed — clean run, defect class closed
---

# FINDINGS — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2

## Summary

**No findings.** SPEC executed cleanly end-to-end. Every §3 success criterion matched on first verification pass. No mid-run deviations. No new advisor entries. No console errors. All 4 Tier C cycles passed.

## Empirical evidence captured

The Tier C "inject corrupt row + call RPC + verify numeric + soft-delete" pattern proved each RPC's resilience to non-numeric suffix corruption. Captured results:

```
next_box_number             → BOX-0002       (after BOX-PHASE2SMOKE-X corrupt row injected + ignored)
next_internal_doc_number    → DOC-00028      (after DOC-PHASE2SMOKE-X corrupt row injected + ignored)
next_purchase_order_number  → PO-300007      (after PO-PHASE2SMOKE-X corrupt row injected + ignored)
next_return_number          → RET-9016-0003  (after RET-9016-PHASE2SMOKE corrupt row injected + ignored)
```

All match `^<expected_prefix>\d+$`. The regex guard works empirically across all 4 sibling RPCs.

## Defect class status post-SPEC

All 8 project `next_*_number` RPCs are now resilient to non-numeric suffix corruption:

| RPC | Phase | Status |
|---|---|---|
| `next_lot_number` | Phase 1 | 🟢 |
| `next_receipt_number` | Phase 1 | 🟢 |
| `next_po_number` (frames-era) | Phase 1 | 🟢 |
| `next_transfer_number` | Phase 1 | 🟢 |
| `next_box_number` | Phase 2 | 🟢 |
| `next_internal_doc_number` | Phase 2 | 🟢 |
| `next_purchase_order_number` (M1B0 lens) | Phase 2 | 🟢 |
| `next_return_number` | Phase 2 | 🟢 |

The regex-guard pattern is the canonical design for any new sequential-number generator going forward (codified in the SKILL_HARVEST_2026_05_18 follow-up SPEC).

## Lessons re-confirmed (not new findings)

1. **The Tier C "inject corrupt row + RPC + soft-delete" pattern is the right empirical proof** for sequence-number RPC hardening. It's deterministic, repeatable, and produces clean evidence in a single SQL transaction per cycle — no UI driving required.
2. **`set_config('request.jwt.claims', ...)` is the canonical way to satisfy SECURITY DEFINER + JWT-tenant-guard RPCs from MCP `execute_sql`.** This pattern unlocks any future Tier C smoke that needs to exercise a JWT-gated SECURITY DEFINER function without driving the actual UI.
3. **CREATE OR REPLACE FUNCTION is fully reversible** by re-applying the prior body. Phase 1 + Phase 2 together replaced 8 RPCs; each migration is independently revertible.
4. **Two-phase resilience SPECs work cleanly.** Phase 1 handled the critical-path RPCs unblocking SPEC 8; Phase 2 swept up the siblings. Same risk profile both times, near-identical execution pattern.

## Proposals for opticup-strategic / opticup-executor

No new SKILL proposals from this SPEC. Phase 1 already harvested the relevant ones (regex guard pattern, Tier C side-effect cleanup, `set_config` JWT injection). Those are queued in SKILL_HARVEST_2026_05_18.

---

**END FINDINGS**

_0 findings. Clean close. Defect class closed across all 8 next_*_number RPCs._
