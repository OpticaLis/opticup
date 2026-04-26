/* =============================================================================
   crm-queue-live.js — UI tab: Live Message Queue
   OVERNIGHT_M4_SCALE_AND_UI Phase 8. Shows rows from crm_message_queue WHERE
   status != 'sent' (i.e. queued / processing / failed / rejected) with a
   5-second auto-refresh. Operator can purge failed/rejected rows.
   Load order: after shared.js, crm-helpers.js.
   Exports: window.renderQueueLive(host).
   ============================================================================= */
(function () {
  'use strict';

  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';
  var _refreshTimer = null;

  function fmt(dt) {
    if (!dt) return '—';
    try { return new Date(dt).toLocaleTimeString('he-IL'); } catch (_) { return String(dt); }
  }
  function statusBadge(status) {
    var cls = 'bg-slate-100 text-slate-700';
    if (status === 'queued') cls = 'bg-sky-100 text-sky-700';
    else if (status === 'processing') cls = 'bg-amber-100 text-amber-700';
    else if (status === 'failed') cls = 'bg-rose-100 text-rose-700';
    else if (status === 'rejected') cls = 'bg-slate-200 text-slate-600';
    else if (status === 'sent') cls = 'bg-emerald-100 text-emerald-700';
    return '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + cls + '">' + escapeHtml(status) + '</span>';
  }

  async function load(host) {
    if (!host) return;
    var tenantId = getTenantId();
    if (!tenantId) return;
    var res = await sb.from('crm_message_queue')
      .select('id, lead_id, event_id, channel, template_slug, status, retries, scheduled_at, created_at, processed_at, error_message')
      .eq('tenant_id', tenantId)
      .neq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(200);
    if (res.error) { host.innerHTML = '<div class="text-rose-600 p-4">שגיאה: ' + escapeHtml(res.error.message) + '</div>'; return; }
    var rows = res.data || [];

    var counts = { queued: 0, processing: 0, failed: 0, rejected: 0 };
    rows.forEach(function (r) { if (counts[r.status] !== undefined) counts[r.status]++; });
    var failRejected = counts.failed + counts.rejected;

    var header = '<div class="flex items-center gap-3 mb-3 text-sm">' +
      '<span>📨 ' + counts.queued + ' בהמתנה</span>' +
      '<span>⚡ ' + counts.processing + ' בעיבוד</span>' +
      '<span class="text-rose-700">✗ ' + counts.failed + ' כשל</span>' +
      '<span class="text-slate-500">⊘ ' + counts.rejected + ' נדחה</span>' +
      (failRejected > 0 ? '<button type="button" id="queue-purge-btn" class="ms-auto px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold rounded-md">🗑 נקה נכשלים ונדחים (' + failRejected + ')</button>' : '') +
      '</div>';

    if (!rows.length) { host.innerHTML = header + '<div class="text-center text-slate-400 py-8">התור ריק — אין הודעות ממתינות</div>'; return; }

    var html = header + '<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-h-[60vh] overflow-y-auto">' +
      '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">נוצר</th>' +
      '<th class="' + CLS_TH + '">ערוץ</th>' +
      '<th class="' + CLS_TH + '">תבנית</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">ניסיונות</th>' +
      '<th class="' + CLS_TH + '">עובד ב</th>' +
      '<th class="' + CLS_TH + '">שגיאה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' +
        '<td class="' + CLS_TD + ' text-xs">' + escapeHtml(fmt(r.created_at)) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.channel) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs">' + escapeHtml(r.template_slug || '—') + '</td>' +
        '<td class="' + CLS_TD + '">' + statusBadge(r.status) + '</td>' +
        '<td class="' + CLS_TD + ' tabular-nums">' + (r.retries || 0) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs">' + escapeHtml(fmt(r.processed_at)) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-rose-600">' + escapeHtml(r.error_message || '') + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    host.innerHTML = html;

    var purgeBtn = document.getElementById('queue-purge-btn');
    if (purgeBtn) {
      purgeBtn.addEventListener('click', async function () {
        if (typeof Modal === 'undefined' || typeof Modal.confirm !== 'function') return;
        Modal.confirm({
          title: 'מחיקת שורות כושלות',
          message: 'למחוק ' + failRejected + ' שורות מהתור (status=failed או rejected)? פעולה בלתי הפיכה.',
          confirmText: 'מחק',
          confirmClass: 'btn-danger',
          onConfirm: async function () {
            var delRes = await sb.from('crm_message_queue').delete().eq('tenant_id', tenantId).in('status', ['failed', 'rejected']).select('id');
            if (delRes.error) { if (window.Toast) Toast.error('שגיאה: ' + delRes.error.message); return; }
            if (window.Toast) Toast.success('נמחקו ' + (delRes.data || []).length + ' שורות');
            load(host);
          }
        });
      });
    }
  }

  function render(host) {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
    load(host);
    _refreshTimer = setInterval(function () {
      // only tick if this tab is still visible
      var tab = document.getElementById('tab-queue-live');
      if (tab && !tab.classList.contains('hidden') && tab.offsetParent !== null) load(host);
    }, 5000);
  }

  window.renderQueueLive = render;
})();
