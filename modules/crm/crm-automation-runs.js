/* =============================================================================
   crm-automation-runs.js — Per-rule-firing observability (OVERNIGHT Phase 4).
   Writes rows to crm_automation_runs so the automation history UI can list
   every rule execution with timestamp, rule name, counts, and status.
   Per-message counts (sent/failed/rejected) are DERIVED at read time from
   crm_message_log rows GROUP BY status WHERE run_id = this run.
   Load order: AFTER shared.js (for sb + tenant helpers).
   Exports: window.CrmAutomationRuns.{ createRun, finishRun, stampLog }.
   ============================================================================= */
(function () {
  'use strict';

  async function createRun(tenantId, rules, triggerType, triggerData, eventId, totalRecipients) {
    if (!tenantId || !Array.isArray(rules) || !rules.length) return null;
    var first = rules[0];
    var row = {
      tenant_id: tenantId,
      rule_id: first.id || null,
      rule_name: rules.map(function (r) { return r.name || ''; }).join(' + '),
      trigger_type: triggerType,
      trigger_data: triggerData || null,
      event_id: eventId || null,
      total_recipients: totalRecipients || 0,
      status: 'running'
    };
    var res = await sb.from('crm_automation_runs').insert(row).select('id').single();
    if (res.error) { console.error('CrmAutomationRuns.createRun:', res.error); return null; }
    return res.data.id;
  }

  async function finishRun(runId, status) {
    if (!runId) return;
    try {
      await sb.from('crm_automation_runs')
        .update({ status: status || 'completed', finished_at: new Date().toISOString() })
        .eq('id', runId);
    } catch (e) { console.error('CrmAutomationRuns.finishRun:', e); }
  }

  async function stampLog(logId, runId) {
    if (!logId || !runId) return;
    try {
      await sb.from('crm_message_log').update({ run_id: runId }).eq('id', logId);
    } catch (e) { console.error('CrmAutomationRuns.stampLog:', e); }
  }

  window.CrmAutomationRuns = { createRun: createRun, finishRun: finishRun, stampLog: stampLog };
})();
