# FINDINGS — M4_V2_MODAL_SESSION_RESTORE_FIX

One INFO-severity finding harvested during this SPEC.

---

## F1 — `showAsync` could accept an `opts.ruleId` hint to restore during the loading frame

**Severity:** INFO
**Location:** `modules/crm/crm-confirm-send-v2.js:6-7,280-300` + `modules/crm/crm-automation-client.js:64`

**Description:**

The header comment of `crm-confirm-send-v2.js` documents an API the
controller does not implement:

```
CrmConfirmSendV2.showAsync(previewPromise, onChoice, opts) // open with
  loading state; resolves on EF return. opts = { ruleId: <hint-for-restore> }
```

The real `showAsync` signature is `(previewPromise, onChoice)` — no `opts`,
no `ruleId` hint. As a result, the modal renders the "loading" phase with
no restored selections, then after the EF promise resolves and `_hydrate`
runs, it suddenly switches to the restored state. The operator sees a
one-frame "everyone selected" → "3 unchecked" flash.

This SPEC accepted the late-restore-in-hydrate approach because the bug
fix was small, contained, and unambiguously correct. The one-frame flash
is cosmetic, not a correctness issue.

**Suggested next action:**

New SPEC `M4_V2_MODAL_EARLY_RESTORE` (small, ~1 hour) to:

1. Plumb `_wizard.ruleId` or the equivalent through
   `CrmAutomationClient.evaluate` → `CrmConfirmSendV2.showAsync` so the
   controller can restore during the loading frame.
2. Update the loading-phase `renderBody` to surface the restored notice
   even when `phase === 'loading'`.
3. Add a new smoke step to `tests/smoke/v2-modal-session-restore.test.mjs`
   that drives `showAsync` with an explicit `opts.ruleId` and asserts the
   notice is present in the FIRST captured render, not just after hydrate.

Disposition: open follow-up SPEC. Not urgent. Brief explicitly defers any
non-listed work, and this didn't surface in the 2026-05-14 E2E as
operator-blocking.

---

*End of findings. No HIGH or CRITICAL findings. No security-sensitive findings.*
