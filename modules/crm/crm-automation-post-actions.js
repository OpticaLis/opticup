/* =============================================================================
   crm-automation-post-actions.js — Post-action hooks for CrmAutomation.
   Extracted from crm-automation-engine.js during EVENT_CLOSE_COMPLETE_STATUS_FLOW
   to keep the engine under Rule 12 cap and to treat post-actions as a first-class
   concept (some rules have no dispatch at all, e.g., event_completed).

   Two kinds of post-actions:
     (a) per-dispatch-item  — promoteWaitingLeadsToInvited: promotes waiting→invited
         for leads whose message succeeded. Called from dispatch paths.
     (b) per-rule bulk      — executePostActions: reads rule.action_config.
         post_action_status_update and applies it to all resolved recipient leads,
         regardless of dispatch success. Runs for every matched rule in evaluate().

   Load order: AFTER crm-automation-engine.js (engine calls into here at runtime;
   forward-reference via window.CrmAutomationPostActions is fine since engine
   functions are async and only resolve after document load).
   Exports: window.CrmAutomationPostActions.{ executePostActions,
   promoteWaitingLeadsToInvited }.
   ============================================================================= */
(function () {
  'use strict';

  // CRM_HOTFIXES Fix 2 (moved 2026-04-24): after a successful event-scoped
  // dispatch, promote any tier-2 lead currently in status='waiting' to 'invited'.
  // Scoped by tenant_id + explicit .eq('status','waiting') so confirmed /
  // attended / unsubscribed leads are never demoted. Called from the direct-
  // dispatch path and from CrmConfirmSend's approve-and-send path.
  async function promoteWaitingLeadsToInvited(planItems, results) {
    if (!Array.isArray(planItems) || !planItems.length) return { promoted: 0 };
    var tenantId = typeof getTenantId === 'function' ? getTenantId() : null;
    if (!tenantId) return { promoted: 0 };
    var leadIds = {};
    planItems.forEach(function (it, i) {
      // Rules that manage their own lifecycle (post_action_status_update)
      // flag their items so this generic promote does not override them.
      if (it.skip_auto_promote) return;
      if (!it.event_id || !it.lead_id) return;
      var r = results && results[i];
      var ok = r && r.status === 'fulfilled' && r.value && r.value.ok;
      if (ok) leadIds[it.lead_id] = true;
    });
    var ids = Object.keys(leadIds);
    if (!ids.length) return { promoted: 0 };
    var res = await sb.from('crm_leads')
      .update({ status: 'invited', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .in('id', ids)
      .eq('status', 'waiting')
      .select('id');
    if (res.error) { console.error('CrmAutomationPostActions.promoteWaitingLeadsToInvited:', res.error); return { promoted: 0 }; }
    var promotedIds = (res.data || []).map(function (r) { return r.id; });
    promotedIds.forEach(function (id) {
      try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.status_change', entity_type: 'crm_leads', entity_id: id, details: { from: 'waiting', to: 'invited', source: 'automation_invite' } }); } catch (_) {}
    });
    return { promoted: promotedIds.length };
  }

  // EVENT_CLOSE_COMPLETE_STATUS_FLOW: per-rule bulk post-action. Reads
  // rule.action_config.post_action_status_update (target status string) and
  // updates every resolved recipient lead to that status. Idempotent: rows
  // already in the target status are no-ops via PostgREST. No demotion guard —
  // if the SPEC author wanted a guard they'd put it in the rule config, so we
  // trust the rule. Fail-open: a DB error logs but does not block further rules.
  async function executePostActions(rule, resolvedLeadIds) {
    if (!rule || !rule.action_config) return { updated: 0 };
    var target = rule.action_config.post_action_status_update;
    if (!target || typeof target !== 'string') return { updated: 0 };
    if (!Array.isArray(resolvedLeadIds) || !resolvedLeadIds.length) return { updated: 0 };
    var tenantId = typeof getTenantId === 'function' ? getTenantId() : null;
    if (!tenantId) return { updated: 0 };

    var res = await sb.from('crm_leads')
      .update({ status: target, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .in('id', resolvedLeadIds)
      .select('id, status');
    if (res.error) {
      console.error('CrmAutomationPostActions.executePostActions:', res.error);
      return { updated: 0, error: res.error.message };
    }
    var updated = (res.data || []).length;
    (res.data || []).forEach(function (r) {
      try {
        if (window.ActivityLog) {
          ActivityLog.write({
            action: 'crm.lead.status_change',
            entity_type: 'crm_leads',
            entity_id: r.id,
            details: { to: target, source: 'automation_post_action', rule_id: rule.id, rule_name: rule.name || '' }
          });
        }
      } catch (_) {}
    });
    return { updated: updated };
  }

  window.CrmAutomationPostActions = {
    executePostActions: executePostActions,
    promoteWaitingLeadsToInvited: promoteWaitingLeadsToInvited
  };
})();
