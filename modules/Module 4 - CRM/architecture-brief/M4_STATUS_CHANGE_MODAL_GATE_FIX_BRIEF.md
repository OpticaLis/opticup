# M4_STATUS_CHANGE_MODAL_GATE_FIX — Modal Becomes a True Gate

**Status:** Brief — sealed for execution after `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX` closes.
**Authored by:** Architect (Cowork, 2026-05-18 evening)
**Pipeline mode:** Full-Auto.
**Priority:** P2 — closes the user-visible "modal flash" bug.

---

## 1. Strategic Intent

**The bug.** From QA report Finding 1.1: the V2 modal at `crm-confirm-send-v2.js:319` auto-closes when `recipients_by_lead.length === 0`. The modal is opened **unconditionally** for every event status change (`crm-event-actions.js:215-222`), then auto-closes when preview returns empty. The user sees a 1.4-second flash. Finding 1.3: the status commit happens BEFORE the modal opens (`crm-event-actions.js:230-239`), so the modal is not actually a gate — the operator has no chance to cancel.

**The intent.** Two changes:
1. Open the modal **only after** preview confirms recipients exist.
2. Move the status commit **inside** the modal's confirm callback. Cancel truly cancels.

This makes the modal a true atomic gate (the `ATOMIC_CONFIRMATION_FLOW` intent from existing comments).

---

## 2. Deliverables

### 2.1 Restructure `changeEventStatus`

In `modules/crm/crm-event-actions.js`:
- Move the `sb.from('crm_events').update({status: newStatus})` call INSIDE the V2 modal's `onChoice` confirm branch.
- The flow becomes:
  1. Capture old + new status.
  2. Call preview EF with `mode='dispatch_preview'` (NO modal yet).
  3. If preview returns 0 recipients → silently apply the status change (no modal, no toast about messages). Just `Toast.success "סטטוס עודכן: ..."`.
  4. If preview returns >0 recipients → open V2 modal, hydrated with recipient list.
  5. On confirm: apply the status change AND enqueue dispatch.
  6. On "confirm without notify": apply the status change ONLY.
  7. On cancel: do nothing.

### 2.2 Adapt `CrmAutomationClient.evaluate`

In `modules/crm/crm-automation-client.js`:
- Add a new mode `rule_match_probe` that returns `{ has_matching_rule: bool, estimated_recipients: int }` without composing templates.
- The browser uses `rule_match_probe` FIRST (cheap), then `dispatch_preview` only if `has_matching_rule=true`.
- Skip the modal entirely when `has_matching_rule=false`.

### 2.3 Same pattern for lead + attendee callsites

`crm-lead-actions.js` + `crm-attendee-move.js` get the same restructure. Three callsites, one pattern.

### 2.4 V2 modal cleanup

`crm-confirm-send-v2.js:305-325`:
- KEEP the auto-close-on-empty branch (defensive — if somehow the modal opens with empty recipients, still close cleanly).
- The branch should no longer fire in practice after this SPEC because the modal won't be opened with empty recipients.

### 2.5 Demo smoke

- Test all 3 status-change paths (event, lead, attendee) on demo.
- Verify: modal opens ONLY when a rule matches; user can cancel; status commit only on confirm.
- Capture screenshots for the retrospective.

---

## 3. Verification Criteria

1. 3 callsite files restructured per §2.1/§2.3.
2. New `rule_match_probe` EF mode + client wrapper.
3. V2 modal `showAsync` no longer fires the auto-close branch on the happy path (verified via `window.__modalTrace` instrumentation from QA report Appendix A).
4. Cancel button truly cancels status change.
5. Smoke 7/7 PASS.
6. Chrome MCP smoke: event status change with no matching rule = no modal; with matching rule = modal stays open, user confirms, dispatch happens.
7. Iron Rules 12/31/32 enforced.

---

## 4. Destructive Operations

**None.**

---

## 5. Risk Surface

- **Risk 1: race between preview EF call and operator clicking buttons.** Mitigation: preview returns fast (~100ms); modal shows loading spinner if >300ms.
- **Risk 2: post-action behaviors (post_action_attendee_upsert) move with the dispatch.** Mitigation: post-action runs in the dispatch path; cancel-without-dispatch path skips post-action. This matches the user's expectation that "cancel" means "nothing happened."
- **Risk 3: existing comments mention `ATOMIC_CONFIRMATION_FLOW Part A/B/C`.** Mitigation: read those comments first to understand the original intent; align the fix with it instead of inventing a new shape.
- **Risk 4: regression in lead/attendee flows.** Mitigation: regression test covers all 3 flows.

---

## 6. Out of Scope

- Removing the browser-side `evaluate` fire-and-forget entirely — that's `M4_DUAL_PATH_DEPRECATION_PHASE_1`.

---

## 7. Pre-flight Checklist

- [ ] `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX` 🟢 closed (so the new behavior actually sends messages on demo).
- [ ] Read QA report Findings 1.1, 1.3 + Appendix C (file index).
- [ ] Read `ATOMIC_CONFIRMATION_FLOW` comments in `crm-confirm-send.js` + `crm-event-register.js`.
- [ ] Read `crm-attendee-move.js` — it already implements the correct pattern; mirror it.

---

## 8. Estimated wall-clock

4-6 hours.

