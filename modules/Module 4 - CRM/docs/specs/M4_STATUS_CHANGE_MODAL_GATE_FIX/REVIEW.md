# REVIEW — M4_STATUS_CHANGE_MODAL_GATE_FIX

**Reviewed commit:** `1a79116`.
**Verdict:** 🟢 APPROVED.

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 12 (file size) | ⚠️ → ✅ | crm-confirm-send-v2.js = 349 lines. Under 350 hard max. Over 300 soft target — flagged in FINDINGS F-2 for future-extraction consideration. |
| 21 (no orphans, no duplicates) | ✅ | No new duplicates introduced. |
| 22 (defense-in-depth) | N/A | No DB writes in this SPEC. |
| 23 (no secrets) | ✅ | No secrets touched. |
| 31 (integrity gate) | ✅ | pre-commit clean. |
| 32 (destructive ops) | ✅ | SPEC §4 declares None. Confirmed: only JS file edits. |

## Code observations

### O-1 — Symmetric design
`showAsync(preview, onChoice, opts)` with `opts.suppressEmptyModal` flag elegantly preserves the legacy path while adding the new path. No behavioral change for existing callers that don't set the flag.

### O-2 — Trigger-type-based dispatch
The `isStatusChange` check in `crm-automation-client.js` correctly identifies the 3 status-change types as the targets. The check is conservative (extends naturally to future status-change types if added).

### O-3 — Live demo proof
Chrome MCP captured the exact scenario from QA Finding 1.1: planning transition with no matching rule. Pre-fix: 1.4s modal flash + amber toast. Post-fix: zero modal events, just the status-update toast. This is the definitive proof.

## What's NOT in this SPEC (deferred to follow-up)

Per SPEC §2.2 + FINDINGS F-1:
- Atomic-gate restructure (Finding 1.3): status commit inside modal callback. Cancel truly cancels.
- `rule_match_probe` EF mode: optimization to avoid preview EF entirely when no rule matches. Not blocking.
- Lead + attendee callsite restructures (Brief §2.3): already covered by the client-layer flag.

Reviewer agrees with the scope decision — the user-visible flash is the immediate concern; the atomic-gate piece is a SEPARATE design problem worth its own SPEC.

## Permission to close

✅ APPROVED. Continuation chain complete (SPECs 2 → 3 → 4 all 🟢).
