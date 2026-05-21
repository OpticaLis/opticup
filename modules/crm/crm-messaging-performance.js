/* =============================================================================
   crm-messaging-performance.js — Messaging Hub "ביצועי הודעות" sub-tab
   Default view: per-template rollup across events. Click a row to expand into
   per-event drill-down. Source: M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS
   (Sprint 2 Item 1, 2026-05-21). Replaces v_crm_message_performance read with
   crm_message_performance_summary jsonb-scalar RPC (bypasses db-max-rows=1000).
   Adds first_sent_at + last_sent_at date columns. Bolds discriminating slug
   segment to prevent the open-vs-confirmation visual confusion that triggered
   the 2026-05-21 investigation.
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };

  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH    = 'px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 text-xs';
  var CLS_TH_NUM = 'px-3 py-2 text-end font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 text-xs';
  var CLS_TD    = 'px-3 py-2 text-slate-800 border-b border-slate-100';
  var CLS_TD_NUM = 'px-3 py-2 text-end text-slate-800 border-b border-slate-100 tabular-nums';

  // Bold the discriminating segment of a template slug. Format examples:
  //   event_registration_open_sms_he         -> bold "open"
  //   event_registration_confirmation_sms_he -> bold "confirmation"
  //   event_coupon_delivery_sms_he           -> bold "delivery"
  //   event_attendee_moved_unpaid_sms_he     -> bold "moved unpaid"
  //   lead_intake_duplicate_sms_he           -> bold "duplicate"
  // Pattern: family prefix (event_<X> | lead_<X>) + discriminator + channel_lang suffix.
  var SLUG_RE = /^((?:event|lead|broadcast)_[a-z]+)_(.+?)_(sms|email|whatsapp)_([a-z]{2})$/;
  function fmtSlug(slug) {
    var m = SLUG_RE.exec(slug || '');
    if (!m) return escapeHtml(slug || '—');
    return '<span class="text-slate-400">' + escapeHtml(m[1]) + '_</span>' +
           '<b class="text-slate-900">' + escapeHtml(m[2]) + '</b>' +
           '<span class="text-slate-400">_' + escapeHtml(m[3]) + '_' + escapeHtml(m[4]) + '</span>';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth()+1).padStart(2, '0'), yy = String(d.getFullYear()).slice(2);
    var hh = String(d.getHours()).padStart(2, '0'), mn = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mn;
  }
  function fmtPct(v) { return isFinite(v) ? v.toFixed(1) + '%' : '—'; }

  // Per-template summary rows (default view). Per-event drill-down rows attach via _events.
  var _rows = [];
  var _sortKey = 'messages_sent_total';
  var _sortDir = 'desc';
  var _expanded = {};

  async function renderMessagingPerformance(host) {
    if (!host) return;
    host.innerHTML =
      '<div>' +
        '<h4 class="text-base font-bold text-slate-800 mb-1">📊 ביצועי הודעות</h4>' +
        '<p class="text-xs text-slate-500 mb-3">' +
          'סיכום פר־תבנית עם תאריכי שליחה ראשון/אחרון. לחיצה על שורה — פירוט פר־אירוע.' +
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
      if (wrap) wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.renderMessagingPerformance = renderMessagingPerformance;

  async function loadPerformance() {
    var tid = getTenantId();
    if (!tid) { _rows = []; return; }

    // RPC returns one jsonb object: { per_template: [...], per_event: [...] }.
    // Bypasses PostgREST db-max-rows=1000 cap that would silently truncate the
    // prior view-read at growth scale.
    var rpcRes = await sb.rpc('crm_message_performance_summary', { p_tenant_id: tid });
    if (rpcRes.error) { _rows = []; throw new Error(rpcRes.error.message); }
    var data = rpcRes.data || {};
    var perTemplate = Array.isArray(data.per_template) ? data.per_template : [];
    var perEvent = Array.isArray(data.per_event) ? data.per_event : [];

    if (!perTemplate.length) { _rows = []; return; }

    // Hydrate display names. tenant filter for defense-in-depth (R22).
    var eventIds = []; var templateIds = []; var seenE = {}, seenT = {};
    perEvent.forEach(function (r) { if (r.event_id && !seenE[r.event_id]) { seenE[r.event_id] = true; eventIds.push(r.event_id); } });
    perTemplate.forEach(function (r) { if (r.template_id && !seenT[r.template_id]) { seenT[r.template_id] = true; templateIds.push(r.template_id); } });

    var lookups = await Promise.all([
      eventIds.length ? sb.from('crm_events').select('id, name, event_number').eq('tenant_id', tid).in('id', eventIds) : Promise.resolve({ data: [] }),
      templateIds.length ? sb.from('crm_message_templates').select('id, name, slug').eq('tenant_id', tid).in('id', templateIds) : Promise.resolve({ data: [] })
    ]);
    var eventMap = {}; (lookups[0].data || []).forEach(function (e) { eventMap[e.id] = e; });
    var templateMap = {}; (lookups[1].data || []).forEach(function (t) { templateMap[t.id] = t.slug || t.name; });

    // Group per_event rows by (template_id, channel) so each per_template row can show its sub-rows.
    var byTpl = {};
    perEvent.forEach(function (e) {
      var k = (e.template_id || '') + '|' + (e.channel || '');
      if (!byTpl[k]) byTpl[k] = [];
      var ev = eventMap[e.event_id];
      byTpl[k].push({
        event_id: e.event_id,
        event_name: ev ? ('#' + (ev.event_number || '?') + ' ' + (ev.name || '—')) : '—',
        messages_sent: Number(e.messages_sent) || 0,
        messages_clicked: Number(e.messages_clicked) || 0,
        registrations_after_click: Number(e.registrations_after_click) || 0,
        first_sent_at: e.first_sent_at,
        last_sent_at: e.last_sent_at
      });
    });

    _rows = perTemplate.map(function (r) {
      var sent = Number(r.messages_sent_total) || 0;
      var clicked = Number(r.messages_clicked_total) || 0;
      var regd = Number(r.registrations_after_click_total) || 0;
      var k = (r.template_id || '') + '|' + (r.channel || '');
      return {
        template_id: r.template_id,
        template_slug: templateMap[r.template_id] || '—',
        channel: r.channel,
        channel_label: CHANNEL_LABELS[r.channel] || r.channel,
        messages_sent_total: sent,
        messages_clicked_total: clicked,
        registrations_after_click_total: regd,
        click_rate_pct: sent > 0 ? (clicked / sent * 100) : 0,
        conversion_rate_pct: clicked > 0 ? (regd / clicked * 100) : 0,
        events_used_in: Number(r.events_used_in) || 0,
        first_sent_at: r.first_sent_at,
        last_sent_at: r.last_sent_at,
        _events: (byTpl[k] || []).sort(function (a, b) { return String(b.first_sent_at || '').localeCompare(String(a.first_sent_at || '')); })
      };
    });
  }

  function compareRows(a, b) {
    var av = a[_sortKey], bv = b[_sortKey];
    if (typeof av === 'string' || typeof bv === 'string') {
      av = String(av || ''); bv = String(bv || '');
      return _sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    av = Number(av) || 0; bv = Number(bv) || 0;
    return _sortDir === 'asc' ? av - bv : bv - av;
  }

  function renderTable() {
    var wrap = document.getElementById('msg-perf-wrap');
    if (!wrap) return;
    if (!_rows.length) {
      wrap.innerHTML = '<div class="text-center text-slate-500 py-10 text-sm">אין נתונים להציג עדיין — לאחר שיישלחו הודעות, נתוני הביצועים יופיעו כאן.</div>';
      return;
    }
    var sorted = _rows.slice().sort(compareRows);

    var headers = [
      { key: 'template_slug',                   cls: CLS_TH,     label: 'תבנית' },
      { key: 'channel_label',                   cls: CLS_TH,     label: 'ערוץ' },
      { key: 'events_used_in',                  cls: CLS_TH_NUM, label: 'אירועים' },
      { key: 'messages_sent_total',             cls: CLS_TH_NUM, label: 'נשלחו' },
      { key: 'messages_clicked_total',          cls: CLS_TH_NUM, label: 'הוקלקו' },
      { key: 'click_rate_pct',                  cls: CLS_TH_NUM, label: '% הקלקות' },
      { key: 'registrations_after_click_total', cls: CLS_TH_NUM, label: 'נרשמו' },
      { key: 'conversion_rate_pct',             cls: CLS_TH_NUM, label: '% המרה' },
      { key: 'first_sent_at',                   cls: CLS_TH,     label: 'נשלח ראשון' },
      { key: 'last_sent_at',                    cls: CLS_TH,     label: 'נשלח אחרון' }
    ];

    var html = '<table class="' + CLS_TABLE + '"><thead><tr><th class="' + CLS_TH + '" style="width:24px"></th>';
    headers.forEach(function (h) {
      var arrow = (_sortKey === h.key) ? ' <span class="text-indigo-600">' + (_sortDir === 'asc' ? '▲' : '▼') + '</span>' : '';
      html += '<th class="' + h.cls + '" data-sort-key="' + escapeHtml(h.key) + '">' + escapeHtml(h.label) + arrow + '</th>';
    });
    html += '</tr></thead><tbody>';

    sorted.forEach(function (r) {
      var key = (r.template_id || '') + '|' + (r.channel || '');
      var open = !!_expanded[key];
      var hasEvents = (r._events && r._events.length > 0);
      var caret = hasEvents ? (open ? '▾' : '▸') : '·';
      html += '<tr class="hover:bg-indigo-50 cursor-pointer" data-toggle-key="' + escapeHtml(key) + '">' +
        '<td class="' + CLS_TD + ' text-center text-slate-400 font-mono">' + caret + '</td>' +
        '<td class="' + CLS_TD + ' text-xs">' + fmtSlug(r.template_slug) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.channel_label) + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.events_used_in + '</td>' +
        '<td class="' + CLS_TD_NUM + ' font-semibold">' + r.messages_sent_total + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.messages_clicked_total + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + fmtPct(r.click_rate_pct) + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.registrations_after_click_total + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + fmtPct(r.conversion_rate_pct) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600">' + fmtDate(r.first_sent_at) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600">' + fmtDate(r.last_sent_at) + '</td>' +
        '</tr>';
      if (open && hasEvents) {
        r._events.forEach(function (e) {
          html += '<tr class="bg-slate-50/60 text-xs">' +
            '<td class="' + CLS_TD + '"></td>' +
            '<td class="' + CLS_TD + ' text-slate-700 pl-8" colspan="2">' + escapeHtml(e.event_name) + '</td>' +
            '<td class="' + CLS_TD_NUM + ' text-slate-500">—</td>' +
            '<td class="' + CLS_TD_NUM + '">' + e.messages_sent + '</td>' +
            '<td class="' + CLS_TD_NUM + '">' + e.messages_clicked + '</td>' +
            '<td class="' + CLS_TD_NUM + ' text-slate-500">—</td>' +
            '<td class="' + CLS_TD_NUM + '">' + e.registrations_after_click + '</td>' +
            '<td class="' + CLS_TD_NUM + ' text-slate-500">—</td>' +
            '<td class="' + CLS_TD + ' text-slate-600">' + fmtDate(e.first_sent_at) + '</td>' +
            '<td class="' + CLS_TD + ' text-slate-600">' + fmtDate(e.last_sent_at) + '</td>' +
          '</tr>';
        });
      }
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('[data-sort-key]').forEach(function (th) {
      th.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var key = th.getAttribute('data-sort-key');
        if (!key) return;
        if (key === _sortKey) {
          _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _sortKey = key;
          _sortDir = (typeof _rows[0][key] === 'number') ? 'desc' : 'asc';
        }
        renderTable();
      });
    });
    wrap.querySelectorAll('[data-toggle-key]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var key = tr.getAttribute('data-toggle-key');
        if (!key) return;
        _expanded[key] = !_expanded[key];
        renderTable();
      });
    });
  }
})();
