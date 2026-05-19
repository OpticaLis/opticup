# FINDINGS — M4_STATUS_CHANGE_MODAL_GATE_FIX

## F-1 — Scope decision: deferred atomic-gate piece (intentional)
**Severity:** INFO
**Status:** RESOLVED (documented + decided in SPEC §2.2)

Brief §2.1 wanted both the preview-first gating AND the atomic-gate piece (status commit inside modal callback). The atomic-gate piece requires:
- Refactoring `changeEventStatus` in `crm-event-actions.js` to defer the DB UPDATE until the modal's confirm callback.
- Same refactor for `changeLeadStatus` + attendee equivalents.
- Differentiating interactive callers (user-clicked dropdown) from auto callers (waitlist auto-promote, coupon exhaust). Auto callers must NEVER show a modal — they're not user-driven.

Substantial work; QA Finding 1.3 ("cancel doesn't truly cancel because status committed before modal opens") is the only thing that remains broken after SPEC 4. Recommended follow-up SPEC: `M4_STATUS_CHANGE_ATOMIC_GATE`.

## F-2 — File size hit hard max during commit
**Severity:** INFO (process)
**Status:** RESOLVED (comments tightened)

Initial commit hit Iron Rule 12 — `crm-confirm-send-v2.js` was 366 lines (max 350). Tightened the new code's documentation comments. Final: 349 lines (under hard max, over 300 soft target by 49 lines). The file is approaching saturation for its V2-modal scope; future SPECs that add to this file should consider extracting the session-restore logic (`_saveSession`, `_loadSession`, `_clearSession`) to a separate `crm-confirm-send-v2-session.js` to recover headroom.

## F-3 — Demo test #2 confirmed the fix via a happy accident
**Severity:** INFO (observation)
**Status:** N/A

Demo test #2 (registration_open transition) tested the "preview returned empty even though rule exists" case — because lead 01269ab9 was promoted to `invited` status by yesterday's SPEC 3 verification dispatch (and the rule recipient filter wants `waiting`/`waitlist`). This actually exercises the BUG SCENARIO from the user's screenshot (rule fires but resolves 0 recipients). The fix handles it correctly: no modal flash.

## F-4 — Broadcast wizard untouched
**Severity:** INFO
**Status:** ACCEPTED

The broadcast wizard at `crm-messaging-broadcast.js` also uses `CrmConfirmSendV2`. It does NOT pass `suppressEmptyModal:true`. This is intentional — for explicit broadcast dispatches, the operator chose the audience filter; the amber "אין נמענים" toast tells them their filter resolved to 0 (operator learning moment). This case is correctly DIFFERENT from status-change paths.

## F-5 — Test 2 returned `channels:[]` from dispatch_preview EF
**Severity:** LOW (observability nit)
**Status:** OPEN

Network reqid=276 (the EF response for test 2) returned `rules[0].channels:[]` and `rules[1].channels:[]` — channel arrays empty despite the action_config.channels being `['sms','email']` per DB. This is a separate observation: the EF's preview response strips channels in some path. Doesn't affect SPEC 4's outcome (suppressEmptyModal correctly handled the empty `recipients_by_lead`). Worth a one-off look in a follow-up debug session.
