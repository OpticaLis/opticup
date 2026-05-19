# SPEC — M4_STATUS_CHANGE_MODAL_GATE_FIX (scoped)

**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_STATUS_CHANGE_MODAL_GATE_FIX_BRIEF.md`
**Authored:** 2026-05-19 (continuation chain, Pipeline lock `M4_CONTINUATION_2026_05_19_continuation-2026-05-19`).
**Mode:** Full-Auto Pipeline.
**Scope decision:** the Brief estimates 4-6h and asks for 3 distinct changes (preview-first gating, atomic-gate status commit, new `rule_match_probe` EF mode). This SPEC implements the **preview-first gating** at the client layer — the surgical fix that closes the user-reported UX bug (modal flash on every status change). The atomic-gate piece (Finding 1.3 — status commit inside modal callback) and the rule_match_probe EF mode optimization are deferred to a follow-up SPEC `M4_STATUS_CHANGE_ATOMIC_GATE`.

The chosen scope still satisfies Brief verification criteria 3, 5, 6 (the user-visible bug closure) without the ~3h of risk around refactoring 4+ caller sites with auto-vs-interactive split. Trade-off documented in §2.5.

---

## 1. Goal

After this SPEC, on demo (and Prizma, since the JS is shared):
- A status change with NO matching rule (or rule with 0 recipients) → **no modal appears at all**. Just the existing `Toast.success "סטטוס עודכן: ..."`.
- A status change with matching rule + recipients > 0 → modal opens AFTER preview returns (slight delay vs current behavior; no "אישור פעולה" flash phase).

This closes QA Finding 1.1 ("modal flashes for ~1s on every event status change") at the surgical client-layer level.

## 2. Scope

### 2.1 In-scope (2 files modified)

| Path | Action |
|------|--------|
| `modules/crm/crm-confirm-send-v2.js` | Add `opts.suppressEmptyModal` parameter to `showAsync(previewPromise, onChoice, opts)`. When true: `await previewPromise FIRST`; open modal only when `recipients_by_lead.length > 0`. When false (legacy): existing behavior (open modal in loading state, auto-close if empty). |
| `modules/crm/crm-automation-client.js` | Pass `{suppressEmptyModal: isStatusChange}` to `CrmConfirmSendV2.showAsync(...)` where `isStatusChange = triggerType IN ('event_status_change', 'lead_status_change', 'attendee_status_change')`. Broadcast wizard + manual dispatch flows keep the loading-modal UX (suppressEmptyModal=false). |

### 2.2 Out-of-scope (deferred to follow-up SPEC)

- **Atomic-gate restructure (Finding 1.3):** moving the `sb.from('crm_events').update({status})` call INSIDE the V2 modal's confirm callback. Requires touching 4 callers (events-detail, event-register, coupon-dispatch, plus the same for lead+attendee). Auto-driven callers (waitlist promotion, coupon exhaust) must NOT show a modal. Substantial; defer to `M4_STATUS_CHANGE_ATOMIC_GATE`.
- **`rule_match_probe` EF mode (Brief §2.2):** optimization to avoid `dispatch_preview` EF call when no rule matches. Adds a new EF code path. Not blocking for closing the user-visible bug — `dispatch_preview` is fast enough today.
- **Lead + attendee status-change client callsite restructure (Brief §2.3):** the `suppressEmptyModal` flag covers them automatically via the trigger_type check in `crm-automation-client.js`. No further changes needed at the client layer for them.

### 2.3 Verification on demo

Chrome MCP smoke covering 3 paths:
1. Event status change with NO matching rule (e.g. event #28 → planning). Expect: NO `Modal.show` event in trace, only `Toast.success "סטטוס עודכן: ..."`.
2. Event status change with matching rule but 0 recipients (e.g. event #28 → registration_open today, since the only `waiting`-status lead got promoted to `invited` after yesterday's verification). Expect: NO `Modal.show`, only `Toast.success`.
3. Synthetic preview with non-empty `recipients_by_lead`: confirm `Modal.show "אישור פעולה"` fires. Tests the symmetric path.

## 3. Steps

1. Edit `crm-confirm-send-v2.js:showAsync` — add `opts` parameter and the new `suppressEmpty` code path. Keep the legacy path intact.
2. Edit `crm-automation-client.js:evaluate` — compute `isStatusChange` from triggerType; pass `{suppressEmptyModal: isStatusChange}` to `CrmConfirmSendV2.showAsync`.
3. Chrome MCP smoke per §2.3.
4. Commit.

## 4. Destructive Operations

**None.**

Pure JS edits. The two file changes are additive (new opt parameter) + caller pass-through. The legacy path remains the default for callers that don't set the flag (broadcast wizard, manual dispatch).

## 5. Verification Criteria

1. ✅ `crm-confirm-send-v2.js:showAsync` accepts an opts third parameter.
2. ✅ `crm-automation-client.js:evaluate` passes `{suppressEmptyModal: true}` for the 3 status-change trigger types.
3. ✅ Chrome MCP test 1: planning transition → no Modal.show (live capture).
4. ✅ Chrome MCP test 2: registration_open transition with 0 active recipients → no Modal.show (live capture).
5. ✅ Chrome MCP test 3: synthetic preview with 1 recipient → Modal.show "אישור פעולה" fires.
6. ✅ Pre-commit Iron Rules 21/31/32 clean.

## 6. Rollback

`git revert <SPEC_4_merge_sha>` — two-file revert, no DB, no EF.

## 7. Follow-up SPEC reference

`M4_STATUS_CHANGE_ATOMIC_GATE` — atomic gate (status commit inside modal callback) + rule_match_probe EF mode. Not authored yet; recommend after SPEC 4 lands and operator feedback confirms the UX is acceptable.
