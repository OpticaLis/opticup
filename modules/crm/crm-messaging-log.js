/* =============================================================================
   crm-messaging-log.js — Message log table + click-to-expand (P8)
   Table: crm_message_log (JOIN crm_leads, crm_message_templates)
   Split from crm-messaging-broadcast.js on 2026-04-22 to satisfy Rule 12
   after the P8 enrichment (lead name/phone/template + row expansion) pushed
   the parent file over 350 lines.
   Exports window.renderMessagingLog, window.loadMessagingLog.
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var STATUS_LABELS  = { sent: 'נשלח', pending: 'בתור', failed: 'נכשל', delivered: 'הגיע', read: 'נקרא', queued: 'בתור' };
  var STATUS_CLASSES = {
    sent:      'bg-sky-100 text-sky-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    read:      'bg-indigo-100 text-indigo-800',
    failed:    'bg-rose-100 text-rose-800',
    queued:    'bg-slate-100 text-slate-700',
    pending:   'bg-slate-100 text-slate-700'
  };
  var PAGE_SIZE = 50;

  var CLS_INPUT = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';
  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH    = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD    = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';

  var _logRows = [];
  var _logPage = 1;
  var _expandedId = null;

  async function renderMessagingLog(host) {
    if (!host) return;
    host.innerHTML =
      '<div>' +
        '<h4 class="text-base font-bold text-slate-800 mb-3">היסטוריה</h4>' +
        '<div class="flex flex-wrap gap-2 mb-3">' +
          '<select id="log-channel" class="' + CLS_INPUT + ' max-w-[180px]"><option value="">כל הערוצים</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">אימייל</option></select>' +
          '<select id="log-status" class="' + CLS_INPUT + ' max-w-[180px]"><option value="">כל הסטטוסים</option><option value="sent">נשלח</option><option value="delivered">הגיע</option><option value="read">נקרא</option><option value="failed">נכשל</option></select>' +
        '</div>' +
        '<div id="log-table" class="bg-white rounded-lg border border-slate-200 overflow-hidden"></div>' +
        '<div id="log-pagination" class="flex items-center gap-2 mt-3"></div>' +
      '</div>';
    ['log-channel','log-status'].forEach(function (id) {
      var el = host.querySelector('#' + id);
      if (el) el.addEventListener('change', function () { _logPage = 1; _expandedId = null; loadLog().then(renderLogTable); });
    });
    await loadLog();
    renderLogTable();
  }
  window.renderMessagingLog = renderMessagingLog;
  window.loadMessagingLog = function () { return loadLog().then(renderLogTable); };

  async function loadLog() {
    var tid = getTenantId();
    var ch = (document.getElementById('log-channel') || {}).value || '';
    var st = (document.getElementById('log-status')  || {}).value || '';
    // P8: JOIN crm_leads (full_name, phone) + crm_message_templates (name, slug) via FK.
    var q = sb.from('crm_message_log').select(
      'id, lead_id, channel, content, status, error_message, created_at, ' +
      'crm_leads(full_name, phone), crm_message_templates(name, slug)'
    );
    if (tid) q = q.eq('tenant_id', tid);
    if (ch) q = q.eq('channel', ch);
    if (st) q = q.eq('status', st);
    q = q.order('created_at', { ascending: false }).limit(300);
    var res = await q;
    _logRows = res.error ? [] : (res.data || []);
  }

  function renderLogTable() {
    var wrap = document.getElementById('log-table');
    if (!wrap) return;
    if (!_logRows.length) { wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין הודעות</div>'; return; }
    var start = (_logPage - 1) * PAGE_SIZE;
    var rows = _logRows.slice(start, start + PAGE_SIZE);
    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">תאריך</th>' +
      '<th class="' + CLS_TH + '">ליד</th>' +
      '<th class="' + CLS_TH + '">טלפון</th>' +
      '<th class="' + CLS_TH + '">ערוץ</th>' +
      '<th class="' + CLS_TH + '">תבנית</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">תוכן</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var chipCls = STATUS_CLASSES[r.status] || 'bg-slate-100 text-slate-700';
      var lead = r.crm_leads || {};
      var tpl = r.crm_message_templates || {};
      var phone = (window.CrmHelpers && CrmHelpers.formatPhone) ? CrmHelpers.formatPhone(lead.phone) : (lead.phone || '');
      html += '<tr class="hover:bg-indigo-50 cursor-pointer" data-log-row="' + escapeHtml(r.id) + '">' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600 whitespace-nowrap">' + escapeHtml(CrmHelpers.formatDateTime(r.created_at)) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-800">' + escapeHtml(lead.full_name || '—') + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600" style="direction:ltr;text-align:end">' + escapeHtml(phone || '—') + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(CHANNEL_LABELS[r.channel] || r.channel) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600">' + escapeHtml(tpl.name || (tpl.slug || '—')) + '</td>' +
        '<td class="' + CLS_TD + '"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + chipCls + '">' + escapeHtml(STATUS_LABELS[r.status] || r.status) + '</span></td>' +
        '<td class="' + CLS_TD + ' text-slate-700 truncate max-w-xs">' + escapeHtml((r.content || '').slice(0, 60)) + '</td>' +
      '</tr>';
      if (_expandedId === r.id) html += renderExpandedRow(r);
    });
    wrap.innerHTML = html + '</tbody></table>';
    wrap.querySelectorAll('[data-log-row]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.getAttribute('data-log-row');
        _expandedId = (_expandedId === id) ? null : id;
        renderLogTable();
      });
    });
    renderLogPagination();
  }

  function renderExpandedRow(r) {
    var lead = r.crm_leads || {};
    var tpl = r.crm_message_templates || {};
    var err = r.error_message ? '<div class="text-rose-600 text-xs mt-2"><span class="font-semibold">שגיאה:</span> ' + escapeHtml(r.error_message) + '</div>' : '';
    var meta = '<div class="text-xs text-slate-500 mt-2">' +
      '<div>נשלח: ' + escapeHtml(CrmHelpers.formatDateTime(r.created_at)) + '</div>' +
      (tpl.slug ? '<div>slug: <code class="text-slate-700">' + escapeHtml(tpl.slug) + '</code></div>' : '') +
      (lead.phone ? '<div>טלפון: <span style="direction:ltr">' + escapeHtml(lead.phone) + '</span></div>' : '') +
    '</div>';
    return '<tr><td colspan="7" class="bg-slate-50 px-6 py-4 border-b border-slate-200">' +
      '<div class="text-sm font-semibold text-slate-700 mb-1">תוכן מלא:</div>' +
      '<pre class="whitespace-pre-wrap text-sm text-slate-800 bg-white border border-slate-200 rounded p-3 max-h-64 overflow-auto">' + escapeHtml(r.content || '') + '</pre>' +
      err + meta +
    '</td></tr>';
  }

  function renderLogPagination() {
    var box = document.getElementById('log-pagination');
    if (!box) return;
    var pages = Math.max(1, Math.ceil(_logRows.length / PAGE_SIZE));
    if (pages <= 1) { box.innerHTML = '<span class="text-sm text-slate-500">סה״כ ' + _logRows.length + '</span>'; return; }
    var btn = 'px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-40';
    var act = 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold';
    var html = '<button class="' + btn + '" ' + (_logPage === 1 ? 'disabled' : '') + ' data-lp="prev">›</button>';
    for (var i = 1; i <= pages; i++) html += '<button class="' + (i === _logPage ? act : btn) + '" data-lp="' + i + '">' + i + '</button>';
    html += '<button class="' + btn + '" ' + (_logPage === pages ? 'disabled' : '') + ' data-lp="next">‹</button>';
    box.innerHTML = html;
    box.querySelectorAll('[data-lp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-lp');
        if (v === 'prev') _logPage = Math.max(1, _logPage - 1);
        else if (v === 'next') _logPage = Math.min(pages, _logPage + 1);
        else _logPage = parseInt(v, 10) || 1;
        renderLogTable();
      });
    });
  }
})();
