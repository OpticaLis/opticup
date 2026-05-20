/* =============================================================================
   crm-messaging-performance.js — Messaging Hub "ביצועי הודעות" sub-tab
   Reads v_crm_message_performance + joins to crm_events + crm_message_templates
   for display. Sortable client-side; no drill-down v1.
   Source: M4_MESSAGE_PERFORMANCE_TRACKING (2026-05-14).
   Exports window.renderMessagingPerformance.
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };

  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH    = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none hover:bg-slate-100';
  var CLS_TH_NUM = 'px-4 py-2.5 text-end font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none hover:bg-slate-100';
  var CLS_TD    = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';
  var CLS_TD_NUM = 'px-4 py-2.5 text-end text-slate-800 border-b border-slate-100 tabular-nums';

  // Row state. Each row in _rows is the merged view-row + display lookups.
  var _rows = [];
  var _sortKey = 'event_name';
  var _sortDir = 'asc';

  async function renderMessagingPerformance(host) {
    if (!host) return;
    host.innerHTML =
      '<div>' +
        '<h4 class="text-base font-bold text-slate-800 mb-1">📊 ביצועי הודעות</h4>' +
        '<p class="text-xs text-slate-500 mb-3">' +
          'נתונים מצטברים לפי אירוע + תבנית + ערוץ. הקלקה על כותרת עמודה — מיון.' +
        '</p>' +
        '<div id="msg-perf-wrap" class="bg-white rounded-lg border border-slate-200 overflow-x-auto">' +
          '<div class="text-center text-slate-400 py-8">טוען נתוני ביצועים...</div>' +
        '</div>';
    try {
      await loadPerformance();
      renderTable();
    } catch (e) {
      console.error('messaging performance load failed:', e);
      var wrap = document.getElementById('msg-perf-wrap');
      if (wrap) {
        wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' +
          escapeHtml(e.message || String(e)) + '</div>';
      }
    }
    // Pixel gap tile relocated to Funnel Health Dashboard (M4_FUNNEL_HEALTH_DASHBOARD D-AUTH-4)
  }
  window.renderMessagingPerformance = renderMessagingPerformance;

  async function loadPerformance() {
    var tid = getTenantId();
    if (!tid) { _rows = []; return; }

    // Pull the aggregated view first. tenant_isolation RLS on underlying
    // tables (via security_invoker=on) already filters to this tenant; we
    // also pass .eq for defense-in-depth (Iron Rule 22).
    var perfRes = await sb.from('v_crm_message_performance')
      .select('tenant_id, event_id, template_id, channel, messages_sent, messages_clicked, registrations_after_click')
      .eq('tenant_id', tid);
    if (perfRes.error) {
      _rows = [];
      throw new Error(perfRes.error.message);
    }
    var raw = perfRes.data || [];
    if (!raw.length) { _rows = []; return; }

    // Collect distinct event_ids + template_ids to hydrate display names.
    var eventIds = [];
    var templateIds = [];
    var seenE = {}, seenT = {};
    raw.forEach(function (r) {
      if (r.event_id && !seenE[r.event_id]) { seenE[r.event_id] = true; eventIds.push(r.event_id); }
      if (r.template_id && !seenT[r.template_id]) { seenT[r.template_id] = true; templateIds.push(r.template_id); }
    });

    var eventsP = eventIds.length
      ? sb.from('crm_events').select('id, name').eq('tenant_id', tid).in('id', eventIds)
      : Promise.resolve({ data: [] });
    var templatesP = templateIds.length
      ? sb.from('crm_message_templates').select('id, name, slug').eq('tenant_id', tid).in('id', templateIds)
      : Promise.resolve({ data: [] });

    var lookups = await Promise.all([eventsP, templatesP]);
    var eventMap = {};
    (lookups[0].data || []).forEach(function (e) { eventMap[e.id] = e.name; });
    var templateMap = {};
    (lookups[1].data || []).forEach(function (t) { templateMap[t.id] = t.slug || t.name; });

    _rows = raw.map(function (r) {
      var sent = Number(r.messages_sent) || 0;
      var clicked = Number(r.messages_clicked) || 0;
      var regd = Number(r.registrations_after_click) || 0;
      return {
        event_id: r.event_id,
        event_name: eventMap[r.event_id] || '—',
        template_id: r.template_id,
        template_slug: templateMap[r.template_id] || '—',
        channel: r.channel,
        channel_label: CHANNEL_LABELS[r.channel] || r.channel,
        messages_sent: sent,
        messages_clicked: clicked,
        registrations_after_click: regd,
        click_rate_pct: sent > 0 ? (clicked / sent * 100) : 0,
        conversion_rate_pct: clicked > 0 ? (regd / clicked * 100) : 0
      };
    });
  }

  function compareRows(a, b) {
    var av = a[_sortKey];
    var bv = b[_sortKey];
    if (typeof av === 'string' || typeof bv === 'string') {
      av = String(av || '');
      bv = String(bv || '');
      return _sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    av = Number(av) || 0;
    bv = Number(bv) || 0;
    return _sortDir === 'asc' ? av - bv : bv - av;
  }

  function fmtPct(v) {
    if (!isFinite(v)) return '—';
    return v.toFixed(1) + '%';
  }

  function renderTable() {
    var wrap = document.getElementById('msg-perf-wrap');
    if (!wrap) return;
    if (!_rows.length) {
      wrap.innerHTML = '<div class="text-center text-slate-500 py-10 text-sm">' +
        'אין נתונים להציג עדיין — לאחר שלידים יקליקו על קישורים בהודעות שנשלחו אליהם, הנתונים יופיעו כאן.' +
        '</div>';
      return;
    }
    var sorted = _rows.slice().sort(compareRows);

    var headers = [
      { key: 'event_name',                cls: CLS_TH,     label: 'אירוע' },
      { key: 'template_slug',             cls: CLS_TH,     label: 'תבנית' },
      { key: 'channel_label',             cls: CLS_TH,     label: 'ערוץ' },
      { key: 'messages_sent',             cls: CLS_TH_NUM, label: 'נשלחו' },
      { key: 'messages_clicked',          cls: CLS_TH_NUM, label: 'הוקלקו' },
      { key: 'click_rate_pct',            cls: CLS_TH_NUM, label: '% הקלקות' },
      { key: 'registrations_after_click', cls: CLS_TH_NUM, label: 'נרשמו' },
      { key: 'conversion_rate_pct',       cls: CLS_TH_NUM, label: '% המרה' }
    ];

    var html = '<table class="' + CLS_TABLE + '"><thead><tr>';
    headers.forEach(function (h) {
      var arrow = '';
      if (_sortKey === h.key) arrow = ' <span class="text-indigo-600">' + (_sortDir === 'asc' ? '▲' : '▼') + '</span>';
      html += '<th class="' + h.cls + '" data-sort-key="' + escapeHtml(h.key) + '">' + escapeHtml(h.label) + arrow + '</th>';
    });
    html += '</tr></thead><tbody>';

    sorted.forEach(function (r) {
      html += '<tr class="hover:bg-indigo-50">' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.event_name) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600">' + escapeHtml(r.template_slug) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.channel_label) + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.messages_sent + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.messages_clicked + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + fmtPct(r.click_rate_pct) + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.registrations_after_click + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + fmtPct(r.conversion_rate_pct) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('[data-sort-key]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort-key');
        if (!key) return;
        if (key === _sortKey) {
          _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _sortKey = key;
          // Numeric columns default to descending (most interesting first); text ascending.
          _sortDir = (typeof _rows[0][key] === 'number') ? 'desc' : 'asc';
        }
        renderTable();
      });
    });
  }
})();
