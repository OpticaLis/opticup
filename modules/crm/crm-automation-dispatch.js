/* =============================================================================
   crm-automation-dispatch.js — P20 fallback dispatch path for the rule engine.
   Extracted from crm-automation-engine.js (AUTOMATION_ENGINE_SPLIT, 2026-05-01)
   to keep the engine under the Iron Rule 12 cap. Body is byte-identical to the
   original — zero behavior changes.

   Used by CrmAutomation.evaluate when CrmConfirmSend is NOT loaded (the CRM UI
   normally shows the confirmation modal, but server-side / non-UI callers fall
   through to this direct dispatch path).

   Dependencies (all window globals — no engine closure state):
     - window.CrmMessaging.sendMessage
     - window.CrmAutomationRuns.stampLog (optional)
     - window.CrmAutomationPostActions.promoteWaitingLeadsToInvited (optional)

   Load order: AFTER crm-messaging-send.js + crm-automation-post-actions.js;
   BEFORE crm-automation-engine.js (the engine calls into this dispatch).
   Exports: window.CrmAutomationDispatch.dispatchPlanDirect.
   ============================================================================= */
(function () {
  'use strict';

  // P20 fallback: direct dispatch when CrmConfirmSend isn't loaded.
  async function dispatchPlanDirect(items) {
    if (!window.CrmMessaging || !CrmMessaging.sendMessage) {
      console.error('CrmAutomation: CrmMessaging.sendMessage not available');
      return { sent: 0, failed: items.length, skipped: 0 };
    }
    var calls = items.map(function (it) {
      return CrmMessaging.sendMessage({
        leadId: it.lead_id, channel: it.channel, templateSlug: it.template_slug,
        variables: it.variables, eventId: it.event_id || undefined, language: it.language, runId: it.run_id || undefined
      });
    });
    var results = await Promise.allSettled(calls);
    var sent = 0, failed = 0, rejected = 0;
    results.forEach(function (r, i) {
      var v = r.status === 'fulfilled' ? r.value : null;
      if (v && v.ok) { sent++; if (items[i].run_id && v.logId && window.CrmAutomationRuns) CrmAutomationRuns.stampLog(v.logId, items[i].run_id); }
      else if (v && v.error === 'phone_not_allowed') rejected++; else failed++;
    });
    if (window.CrmAutomationPostActions) {
      try { await CrmAutomationPostActions.promoteWaitingLeadsToInvited(items, results); }
      catch (e) { console.error('promoteWaitingLeadsToInvited:', e); }
    }
    return { sent: sent, failed: failed, rejected: rejected, skipped: 0 };
  }

  window.CrmAutomationDispatch = {
    dispatchPlanDirect: dispatchPlanDirect
  };
})();
