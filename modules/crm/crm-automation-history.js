/* =============================================================================
   crm-automation-history.js — UI tab: Automation Execution History
   OVERNIGHT_M4_SCALE_AND_UI Phase 7.
   Renders last 50 rows of crm_automation_runs with derived counts from
   crm_message_log (GROUP BY status WHERE run_id=X). Row click → drill-down
   modal with per-recipient message-log rows + "retry failed" button that
   invokes the retry-failed EF.
   Load order: after shared.js, crm-helpers.js.
   Exports: window.renderAutomationHistory(host).
   ============================================================================= */
(function () {
  'use strict';

  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';
  var CLS_BTN_SECONDARY = 'px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-md transition';

  function fmt(dt) {
    if (!dt) return '—';
    try { return new Date(dt).toLocaleString('he-IL'); } catch (_) { return String(dt); }
  }

  async function loadRuns(tenantId) {
    var res = await sb.from('crm_automation_runs')
      .select('id, rule_name, trigger_type, event_id, total_recipients, status, started_at, finished_at, error_message')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(50);
    if (res.error) { console.error('automation-history load:', res.error); return []; }
    return res.data || [];
  }

  async function loadRunCounts(tenantId, runIds) {
    if (!runIds.length) return {};
    var res = await sb.from('crm_message_log').select('run_id, status').eq('tenant_id', tenantId).in('run_id', runIds);
    if (res.error) { console.error('history counts:', res.error); return {}; }
    var out = {};
    (res.data || []).forEach(function (r) {
      if (!out[r.run_id]) out[r.run_id] = { sent: 0, failed: 0, rejected: 0, pending: 0, total: 0 };
      out[r.run_id].total++;
      if (r.status === 'sent') out[r.run_id].sent++;
      else if (r.status === 'failed') out[r.run_id].failed++;
      else if (r.status === 'rejected') out[r.run_id].rejected++;
      else if (r.status === 'pending') out[r.run_id].pending++;
    });
    return out;
  }

  var STATUS_LABEL = { completed: 'הושלם', running: 'רץ', failed: 'נכשל', sent: 'נשלח',
    rejected: 'נדחה', pending: 'בתור', queued: 'בתור', delivered: 'הגיע', read: 'נקרא' };
  function statusBadge(status) {
    var cls = 'bg-slate-100 text-slate-700';
    if (status === 'completed' || status === 'sent') cls = 'bg-emerald-100 text-emerald-700';
    else if (status === 'running') cls = 'bg-amber-100 text-amber-700';
    else if (status === 'failed') cls = 'bg-rose-100 text-rose-700';
    else if (status === 'rejected') cls = 'bg-orange-100 text-orange-700';
    var label = STATUS_LABEL[status] || status;
    return '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  async function render(host) {
    if (!host) return;
    host.innerHTML = '<div class="text-center text-slate-400 py-8">טוען היסטוריית אוטומציות...</div>';
    var tenantId = getTenantId();
    if (!tenantId) { host.innerHTML = '<div class="text-rose-600 py-4">לא זוהה tenant</div>'; return; }
    var runs = await loadRuns(tenantId);
    if (!runs.length) { host.innerHTML = '<div class="text-center text-slate-400 py-8">אין רצי אוטומציה עדיין</div>'; return; }
    var counts = await loadRunCounts(tenantId, runs.map(function (r) { return r.id; }));

    var html = '<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">' +
      '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">זמן</th>' +
      '<th class="' + CLS_TH + '">חוק</th>' +
      '<th class="' + CLS_TH + '">טריגר</th>' +
      '<th class="' + CLS_TH + '">סה״כ</th>' +
      '<th class="' + CLS_TH + '">נשלחו</th>' +
      '<th class="' + CLS_TH + '">נכשלו</th>' +
      '<th class="' + CLS_TH + '">נדחו</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '"></th>' +
      '</tr></thead><tbody>';
    runs.forEach(function (r) {
      var c = counts[r.id] || { sent: 0, failed: 0, rejected: 0, pending: 0, total: 0 };
      html += '<tr class="hover:bg-slate-50 cursor-pointer" data-run="' + escapeHtml(r.id) + '">' +
        '<td class="' + CLS_TD + ' text-slate-600 text-xs whitespace-nowrap">' + escapeHtml(fmt(r.started_at)) + '</td>' +
        '<td class="' + CLS_TD + ' font-medium">' + escapeHtml(r.rule_name || '—') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-500 text-xs">' + escapeHtml(r.trigger_type || '') + '</td>' +
        '<td class="' + CLS_TD + ' tabular-nums">' + (r.total_recipients || 0) + '</td>' +
        '<td class="' + CLS_TD + ' tabular-nums text-emerald-700">' + c.sent + '</td>' +
        '<td class="' + CLS_TD + ' tabular-nums text-rose-700">' + c.failed + '</td>' +
        '<td class="' + CLS_TD + ' tabular-nums text-slate-500">' + c.rejected + '</td>' +
        '<td class="' + CLS_TD + '">' + statusBadge(r.status || 'pending') + '</td>' +
        '<td class="' + CLS_TD + '"><button type="button" class="' + CLS_BTN_SECONDARY + '" data-run-open="' + escapeHtml(r.id) + '">פירוט</button></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    host.innerHTML = html;

    host.querySelectorAll('[data-run-open]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrillDown(btn.getAttribute('data-run-open'), tenantId);
      });
    });
    host.querySelectorAll('tr[data-run]').forEach(function (row) {
      row.addEventListener('click', function () { openDrillDown(row.getAttribute('data-run'), tenantId); });
    });
  }

  async function openDrillDown(runId, tenantId) {
    if (typeof Modal === 'undefined') return;
    var modal = Modal.show({
      title: 'פירוט ריצת אוטומציה',
      size: 'lg',
      content: '<div class="text-center text-slate-400 py-6">טוען...</div>'
    });
    var logRes = await sb.from('crm_message_log')
      .select('id, lead_id, channel, status, error_message, created_at')
      .eq('run_id', runId).eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });
    if (logRes.error) { modal.el.querySelector('.modal-body').innerHTML = '<div class="text-rose-600">שגיאה: ' + escapeHtml(logRes.error.message) + '</div>'; return; }
    var rows = logRes.data || [];
    var failedCount = rows.filter(function (r) { return r.status === 'failed'; }).length;

    var html = '<div class="max-h-[60vh] overflow-y-auto">' +
      '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">זמן</th>' +
      '<th class="' + CLS_TH + '">ערוץ</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">שגיאה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' +
        '<td class="' + CLS_TD + ' text-xs whitespace-nowrap">' + escapeHtml(fmt(r.created_at)) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.channel) + '</td>' +
        '<td class="' + CLS_TD + '">' + statusBadge(r.status) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-rose-600">' + escapeHtml(r.error_message || '') + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    if (failedCount > 0) {
      html += '<div class="mt-4 flex gap-2">' +
        '<button type="button" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm" id="retry-failed-btn">נסה שוב את הכושלים (' + failedCount + ')</button>' +
        '<span class="text-xs text-slate-500 self-center">לידים שנדחו לא יישלחו שוב (לא מורשים).</span>' +
      '</div>';
    }
    modal.el.querySelector('.modal-body').innerHTML = html;

    var retryBtn = modal.el.querySelector('#retry-failed-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', async function () {
        retryBtn.disabled = true; retryBtn.textContent = 'שולח...';
        try {
          var res = await sb.functions.invoke('retry-failed', { body: { run_id: runId, tenant_id: tenantId } });
          if (res.error) { if (window.Toast) Toast.error('שגיאה: ' + res.error.message); retryBtn.disabled = false; retryBtn.textContent = 'נסה שוב'; return; }
          var d = res.data || {};
          if (window.Toast) Toast.success('הצליחו: ' + (d.succeeded || 0) + ' | נכשלו שוב: ' + (d.still_failed || 0) + ' | נדחו: ' + (d.still_rejected || 0));
          if (modal && modal.close) modal.close();
          setTimeout(function () { render(document.getElementById('automation-history-host')); }, 500);
        } catch (e) {
          if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
          retryBtn.disabled = false; retryBtn.textContent = 'נסה שוב';
        }
      });
    }
  }

  window.renderAutomationHistory = render;
})();
