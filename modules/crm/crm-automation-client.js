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

  async function evaluate(triggerType, triggerData, onAfterConfirm) {
    // ATOMIC_CONFIRMATION_FLOW B.3: optional `onAfterConfirm` lets callers
    // defer their UI cleanup (modal.close, parent-view reload) until AFTER
    // the operator's modal choice resolves. Without this, callers that run
    // their own Modal.close() right after `await evaluate(...)` race the
    // confirmation modal off the stack before the user can click anything,
    // dropping the dispatch silently. See FINDINGS Finding 1 (M4-CRM-AUTOMATION-CLIENT-01).
    // Iron Rule 22 defense-in-depth: explicitly send tenant_id from getTenantId().
    var _tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!_tid || !triggerType) return ZERO();

    // M4_DRY_RUN_PREVIEW (2026-05-14): prefer mode='dispatch_preview' + the v2
    // modal when both are available. The v2 path is recipient-first with
    // server-authoritative bodies, search, deselection, etc. Falls through to
    // the legacy mode='evaluate' + v1 modal path if v2 is missing (preserves
    // backward compatibility during the gradual rollout).
    var useV2 = (window.CrmConfirmSendV2 && typeof CrmConfirmSendV2.showAsync === 'function');
    if (useV2) {
      // Brief §3.8 — incremental count display. Open the modal in loading
      // state IMMEDIATELY (so the operator sees "🔄 מחשב נמענים..." rather
      // than a blank screen), then hand it the preview promise; the modal
      // hydrates when the EF returns.
      var previewPromise = callEf({
        tenant_id: _tid,
        trigger_type: triggerType,
        trigger_data: triggerData || {},
        mode: 'dispatch_preview'
      });
      // SPEC 4 (M4_STATUS_CHANGE_MODAL_GATE_FIX, 2026-05-19): status-change
      // triggers should NOT show the loading modal then flash-close when
      // recipients come back empty. Those callers (event/lead/attendee status
      // changes) already issue their own "סטטוס עודכן" success toast — a
      // dispatch modal makes sense only when there are actually recipients to
      // confirm. The broadcast wizard + other explicit dispatch flows still
      // benefit from the loading-spinner UX (suppressEmptyModal=false).
      var isStatusChange = triggerType === 'event_status_change'
        || triggerType === 'lead_status_change'
        || triggerType === 'attendee_status_change';
      CrmConfirmSendV2.showAsync(previewPromise, async function (choice, ctx) {
        var dispatchRes = await callEf({
          tenant_id: _tid,
          trigger_type: triggerType,
          trigger_data: triggerData || {},
          mode: 'dispatch',
          dispatch_messages: choice && choice.dispatch === true,
          exclude_lead_ids: (ctx && Array.isArray(ctx.excludeLeadIds)) ? ctx.excludeLeadIds : [],
          recipient_subset: (ctx && Array.isArray(ctx.recipientSubset)) ? ctx.recipientSubset : []
        });
        if (typeof onAfterConfirm === 'function') {
          try { await onAfterConfirm(); }
          catch (e) { console.warn('CrmAutomationClient onAfterConfirm threw (v2):', e && e.message); }
        }
        if (!dispatchRes) {
          return choice && choice.dispatch ? { sent: 0, failed: 0, rejected: 0 } : { sent: 0, failed: 0, rejected: 0 };
        }
        return dispatchRes;
      }, { suppressEmptyModal: isStatusChange });
      // Caller doesn't await dispatch — modal handles it. Return placeholder.
      var pendingShape = { run_id: null, fired: 0, sent: 0, failed: 0, rejected: 0, queued: 0, skipped: 0, pending_confirm: true };
      return pendingShape;
    }

    // Legacy v1 path: mode='evaluate' + CrmConfirmSend.show(planItems, ...)
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
        // Run caller's deferred cleanup AFTER dispatch completes — protects
        // the confirmation modal from being closed by an unrelated Modal.close()
        // in the caller's success path (e.g. reloadDetail).
        if (typeof onAfterConfirm === 'function') {
          try { await onAfterConfirm(); }
          catch (e) { console.warn('CrmAutomationClient onAfterConfirm threw:', e && e.message); }
        }
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
    // No modal in this path, so dispatch IS the resolution — fire cleanup now.
    if (typeof onAfterConfirm === 'function') {
      try { await onAfterConfirm(); }
      catch (e) { console.warn('CrmAutomationClient onAfterConfirm threw (fallback):', e && e.message); }
    }
    if (!dispatchRes) {
      var fb = ZERO();
      fb.fired = firedBase.fired;
      fb.failed = planItems.length;
      return fb;
    }
    return dispatchRes;
  }

  // M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): probeAndCommit rewritten as
  // SEQUENTIAL await — no parallel listeners on the same promise. The prior
  // pattern (one .then() that silent-committed on recipients=0/error, plus a
  // CrmConfirmSendV2.showAsync on the same promise) caused yesterday's P0:
  // a 26 MB / 76 s preview hung the modal listener; the .then listener fired
  // on the synthetic "Fix D" timeout; silent commit dispatched 165 messages
  // before halt. Sequential flow eliminates the race entirely.
  //
  // Flow:
  //   1. await callEf({mode:'dispatch_preview'}).
  //   2. EF returns metadata-only (lazy default — no body composition).
  //      Body fields are null on every recipient. Modal materializes them on
  //      per-row expand via CrmAutomationClient.previewRecipientBody.
  //   3. If preview is null/errored → error toast, status unchanged. NO commit.
  //   4. If recipient_count_total === 0 → silent commit + Toast (ONLY remaining
  //      silent path — benign no-rules-fire transitions like → completed).
  //   5. If recipient_count_total > 0 → mandatory modal. Operator MUST click
  //      "אישור ושלח" for commit to fire. Cancel/close → no commit.
  async function probeAndCommit(triggerType, triggerData, commitCallback, opts) {
    opts = opts || {};
    var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tid || !triggerType || typeof commitCallback !== 'function') {
      // No tenant or invalid args: legitimate fallback (rare; rules can't fire without tenant).
      try { var d0 = await commitCallback({ mode: 'no_tenant_fallback' }); return { committed: true, mode: 'no_tenant_fallback', data: d0 }; }
      catch (e0) { return { committed: false, mode: 'commit_failed', error: e0 }; }
    }
    if (!window.CrmConfirmSendV2 || typeof CrmConfirmSendV2.showAsync !== 'function') {
      // M4_DISPATCH_PREVIEW_LAZY_ROWS: modal lib missing → REFUSE to commit
      // (was silent-commit pre-fix; flipped to fail-safe per Iron Rule 34 spirit).
      if (window.Toast) Toast.error('שגיאה: שלב אישור לא נטען. רענן את הדף ונסה שוב.');
      return { committed: false, mode: 'no_modal_refused' };
    }

    // Sequential await. NO race. NO concurrent listeners.
    var preview;
    try {
      preview = await callEf({
        tenant_id: tid, trigger_type: triggerType, trigger_data: triggerData || {},
        mode: 'dispatch_preview'
      });
    } catch (e) {
      if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה. נסה שוב.');
      return { committed: false, mode: 'preview_failed', error: e };
    }
    if (!preview) {
      if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה. נסה שוב.');
      return { committed: false, mode: 'preview_null' };
    }

    // M4_DISPATCH_PREVIEW_LAZY_ROWS: prefer new explicit recipient_count_total
    // field; fall back to legacy recipients_by_lead.length for forward compat
    // (e.g. if EF rolled back to v21 the client still works).
    var total = (typeof preview.recipient_count_total === 'number')
      ? preview.recipient_count_total
      : (Array.isArray(preview.recipients_by_lead) ? preview.recipients_by_lead.length : 0);

    if (total === 0) {
      // ONLY remaining silent-commit path: zero rules fired for this transition.
      try {
        var d1 = await commitCallback({ mode: 'silent_zero_recipients', preview: preview });
        if (window.Toast && !opts.suppressSilentToast) Toast.success(opts.silentToast || 'סטטוס עודכן');
        return { committed: true, mode: 'silent_zero_recipients', data: d1 };
      } catch (e1) {
        return { committed: false, mode: 'commit_failed', error: e1 };
      }
    }

    // recipients > 0 → modal MANDATORY. Operator confirm is the only commit path.
    return await new Promise(function (resolve) {
      var resolved = false;
      var settle = function (v) { if (!resolved) { resolved = true; resolve(v); } };
      // M4_DISPATCH_PREVIEW_LAZY_ROWS: stash triggerType + triggerData on the
      // preview object so the modal can pass them back through
      // CrmAutomationClient.previewRecipientBody on per-row expand click.
      preview.__triggerType = triggerType;
      preview.__triggerData = triggerData || {};
      CrmConfirmSendV2.showAsync(Promise.resolve(preview), async function (choice, ctx) {
        if (!choice || !choice.dispatch) {
          settle({ committed: false, mode: 'no_notify_choice' });
          return { sent: 0, failed: 0, rejected: 0 };
        }
        try {
          var excludeLeadIds = (ctx && Array.isArray(ctx.excludeLeadIds)) ? ctx.excludeLeadIds : [];
          var recipientSubset = (ctx && Array.isArray(ctx.recipientSubset)) ? ctx.recipientSubset : [];
          var data = await commitCallback({
            mode: 'confirmed', preview: (ctx && ctx.previewResponse) || preview,
            excludeLeadIds: excludeLeadIds, recipientSubset: recipientSubset
          });
          settle({ committed: true, mode: 'confirmed', data: data });
          var count = Math.max(0, total - excludeLeadIds.length);
          return { run_id: preview.run_id, queued: count, sent: 0, failed: 0, rejected: 0 };
        } catch (e) {
          settle({ committed: false, mode: 'commit_failed', error: e });
          return { sent: 0, failed: 0, rejected: 0 };
        }
      }, {
        suppressEmptyModal: false,
        hideCommitWithoutNotify: opts.hideCommitWithoutNotify !== false,
        onCancel: function () { settle({ committed: false, mode: 'cancelled' }); }
      });
    });
  }

  // M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): per-recipient body fetch.
  // Modal calls this on per-row expand click to materialize the personalized
  // message body for ONE (lead, channel). Returns null on tenant-missing.
  async function previewRecipientBody(triggerType, triggerData, leadId, channel) {
    var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tid || !triggerType || !leadId || !channel) return null;
    return await callEf({
      tenant_id: tid,
      trigger_type: triggerType,
      trigger_data: triggerData || {},
      mode: 'preview_recipient_body',
      lead_id: leadId,
      channel: channel
    });
  }

  window.CrmAutomationClient = { evaluate: evaluate, probeAndCommit: probeAndCommit, previewRecipientBody: previewRecipientBody };
})();
