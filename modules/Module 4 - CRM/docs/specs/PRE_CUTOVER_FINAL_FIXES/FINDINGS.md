# FINDINGS — PRE_CUTOVER_FINAL_FIXES

> **Location:** `modules/Module 4 - CRM/docs/specs/PRE_CUTOVER_FINAL_FIXES/FINDINGS.md`
> **Written by:** opticup-executor (Claude Code)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §1.5 status-list count drift vs live constant

- **Code:** `M4-DOC-01`
- **Severity:** INFO
- **Discovered during:** Q2 fix pre-flight grep on `TIER2_STATUSES` (Step 1.5 cross-reference)
- **Location:** SPEC.md §1.5 ("includes `['waiting','invited','waitlist','confirmed','confirmed_verified','not_interested','unsubscribed']`") vs `modules/crm/crm-helpers.js:90-98`
- **Description:** The SPEC §1.5 narrative implies `TIER2_STATUSES` carries 8 values including `pending_terms`, `cancelled`, `removed`, `unknown_terms` (referenced in §3 criterion 5 as the excluded set). The actual constant has 7 values and does not include those 4. Q2 fix is unaffected (narrows to 3 of the 7), but the SPEC author's mental model is one revision ahead of the code.
- **Reproduction:**
  ```bash
  grep -A 9 "var TIER2_STATUSES = \[" modules/crm/crm-helpers.js
  ```
- **Expected vs Actual:**
  - Expected per SPEC §3 criterion 5: 8-value enum with `pending_terms`/`cancelled`/`removed`/`unknown_terms`
  - Actual in code: 7-value enum (`waiting`, `invited`, `waitlist`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`)
- **Suggested next action:** DISMISS
- **Rationale for action:** No user impact; the Q2 fix is correct regardless. SPEC author can correct §1.5 in their own retrospective if they want the narrative to match the code state.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `openActionModal` did not forward `opts.mode` (latent bug, fixed in this SPEC)

- **Code:** `M4-BUG-LATENT-01`
- **Severity:** INFO (resolved in Q3 commit)
- **Discovered during:** Q3 implementation pre-commit code review
- **Location:** `modules/crm/crm-payment-helpers.js:292-309` (pre-fix code)
- **Description:** The `openActionModal(attendeeId, opts)` function accepted an `opts` object but only consumed `opts.onAfterAction`. It silently dropped any other property — including `opts.mode`, even though `renderActionPanel` explicitly accepts and switches on a `mode` parameter. This made any caller passing `mode='legacy'` a no-op without warning. SPEC §8 Path A as written would have hit this latent bug had the executor not done the call-chain trace.
- **Reproduction:**
  ```js
  // Pre-fix: any of these would silently use coupon_only mode despite the explicit override
  CrmPayment.openActionModal(aid, { mode: 'legacy', onAfterAction: fn });
  ```
- **Expected vs Actual (pre-fix):**
  - Expected (per the option name): legacy panel rendered
  - Actual (pre-fix): coupon_only panel rendered (default)
- **Suggested next action:** DISMISS (resolved in commit `fd305b3`)
- **Rationale for action:** Logged here for visibility and to support Proposal 2 in EXECUTION_REPORT §8 (executor pre-flight should verify caller→renderer option propagation). Already fixed.
- **Foreman override (filled by Foreman in review):** { }
