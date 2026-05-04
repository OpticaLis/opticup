/* =============================================================================
   crm-automation-client.js — Browser thin-client for the server-side
   automation-engine Edge Function (M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 2).
   Replaces CrmAutomation.evaluate(...) at 5 callsites in 4 files.
   Round-trip: POST mode='evaluate' → CrmConfirmSend modal → on approve, POST
   mode='dispatch' with the approved plan_items array (FOREMAN_REVIEW §4 §5.4
   clarification — prevents preview/dispatch race on recipient changes).
   Load order: AFTER crm-confirm-send.js (we depend on the modal).
   Returns the same shape the old engine returned so callers don't notice the swap.
   ============================================================================= */
(function () {
  'use strict';

  function ZERO() {
    return { run_id: null, fired: 0, sent: 0, failed: 0, rejected: 0, queued: 0, skipped: 0 };
  }

  async function callEf(payload) {
    if (!window.sb || !sb.functions || typeof sb.functions.invoke !== 'function') {
      console.warn('CrmAutomationClient: sb.functions.invoke not available');
      return null;
    }
    try {
      var res = await sb.functions.invoke('automation-engine', { body: payload });
      if (res && res.error) {
        console.warn('CrmAutomationClient: EF returned error', res.error.message || res.error);
        return null;
      }
      return res && res.data ? res.data : null;
    } catch (e) {
      console.warn('CrmAutomationClient: invoke threw', e && e.message);
      return null;
    }
  }

  async function evaluate(triggerType, triggerData) {
    // Iron Rule 22 defense-in-depth: explicitly send tenant_id from getTenantId().
    var _tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!_tid || !triggerType) return ZERO();

    // Step 1 — evaluate-mode call: get plan_items + run_id from EF.
    var evalRes = await callEf({
      tenant_id: _tid,
      trigger_type: triggerType,
      trigger_data: triggerData || {},
      mode: 'evaluate'
    });
    if (!evalRes) return ZERO();

    var planItems = Array.isArray(evalRes.plan_items) ? evalRes.plan_items : [];
    var runId = evalRes.run_id || null;
    var firedBase = {
      run_id: runId,
      fired: evalRes.fired || 0,
      sent: 0, failed: 0, rejected: 0,
      queued: evalRes.queued || 0,
      skipped: evalRes.skipped || 0
    };

    // Step 2 — empty plan (queue_send-only or no recipients): return evaluate-shape.
    if (!planItems.length) return firedBase;

    // Step 3 — modal loaded: render 3-button preview + delegate to onChoice.
    // ATOMIC_CONFIRMATION_FLOW Part A: callback receives `choice` with
    // { dispatch: true|false } reflecting the operator's button click.
    // - dispatch=true  → "אישור ושלח הודעות": EF runs post-actions + sends messages
    // - dispatch=false → "אישור ללא הודעות":  EF runs post-actions, no messages
    // Cancel: modal closes without calling onChoice — no EF call, no side effects.
    if (window.CrmConfirmSend && typeof CrmConfirmSend.show === 'function') {
      CrmConfirmSend.show(planItems, async function (choice, approved) {
        var dispatchRes = await callEf({
          tenant_id: _tid,
          trigger_type: triggerType,
          trigger_data: triggerData || {},
          mode: 'dispatch',
          plan_items: approved,
          run_id: runId,
          dispatch_messages: choice && choice.dispatch === true
        });
        if (!dispatchRes) {
          return choice && choice.dispatch ? { sent: 0, failed: approved.length, rejected: 0 } : { sent: 0, failed: 0, rejected: 0 };
        }
        return dispatchRes;
      });
      // Caller doesn't await dispatch — modal handles it.
      firedBase.pending_confirm = true;
      firedBase.planned = planItems.length;
      return firedBase;
    }

    // Step 4 — fallback (no modal — server-side flow / non-UI): dispatch immediately
    // with messages enabled (default behavior, equivalent to legacy auto-send).
    var dispatchRes = await callEf({
      tenant_id: _tid,
      trigger_type: triggerType,
      trigger_data: triggerData || {},
      mode: 'dispatch',
      plan_items: planItems,
      run_id: runId,
      dispatch_messages: true
    });
    if (!dispatchRes) {
      var fb = ZERO();
      fb.fired = firedBase.fired;
      fb.failed = planItems.length;
      return fb;
    }
    return dispatchRes;
  }

  window.CrmAutomationClient = { evaluate: evaluate };
})();
