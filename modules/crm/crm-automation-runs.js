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
    // Counts are derived from message_log (authoritative). After OVERNIGHT
    // FIX (AUTOMATION_HISTORY_FIXES) the send-message EF stamps run_id on
    // every log row including rejected, so this query returns the full set.
    var counts = { sent: 0, failed: 0, rejected: 0 };
    try {
      var tnt = typeof getTenantId === 'function' ? getTenantId() : null;
      var q = sb.from('crm_message_log').select('status').eq('run_id', runId);
      if (tnt) q = q.eq('tenant_id', tnt);
      var r = await q;
      if (!r.error) (r.data || []).forEach(function (row) {
        if (row.status === 'sent') counts.sent++;
        else if (row.status === 'failed') counts.failed++;
        else if (row.status === 'rejected') counts.rejected++;
      });
    } catch (e) { console.error('CrmAutomationRuns.finishRun counts:', e); }
    try {
      await sb.from('crm_automation_runs')
        .update({ status: status || 'completed', finished_at: new Date().toISOString(),
          sent_count: counts.sent, failed_count: counts.failed, rejected_count: counts.rejected })
        .eq('id', runId);
    } catch (e) { console.error('CrmAutomationRuns.finishRun:', e); }
  }

  async function stampLog(logId, runId) {
    if (!logId || !runId) return;
    try {
      await sb.from('crm_message_log').update({ run_id: runId }).eq('id', logId);
    } catch (e) { console.error('CrmAutomationRuns.stampLog:', e); }
  }

  // OVERNIGHT_M4_SCALE_AND_UI Phase 6: bulk-insert plan items into the message
  // queue instead of dispatching directly. Returns { queued, errored }.
  // Callers: engine fallback dispatch (when no modal) + explicit "schedule for
  // later" callers. The modal's approveAndSend stays direct-dispatch for UX.
  async function enqueuePlan(items, runId) {
    if (!Array.isArray(items) || !items.length) return { queued: 0, errored: 0 };
    var tenantId = typeof getTenantId === 'function' ? getTenantId() : null;
    if (!tenantId) return { queued: 0, errored: items.length };
    var rows = items.map(function (it) {
      return {
        tenant_id: tenantId, run_id: runId || it.run_id || null,
        lead_id: it.lead_id, event_id: it.event_id || null,
        channel: it.channel, template_slug: it.template_slug || null,
        body: it.body || null, subject: it.subject || null,
        variables: it.variables || {}, language: it.language || 'he',
        status: 'queued'
      };
    });
    var res = await sb.from('crm_message_queue').insert(rows).select('id');
    if (res.error) { console.error('CrmAutomationRuns.enqueuePlan:', res.error); return { queued: 0, errored: items.length }; }
    return { queued: (res.data || []).length, errored: 0 };
  }

  window.CrmAutomationRuns = { createRun: createRun, finishRun: finishRun, stampLog: stampLog, enqueuePlan: enqueuePlan };
})();
