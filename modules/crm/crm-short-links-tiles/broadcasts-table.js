/* =============================================================================
   broadcasts-table.js — Component B: Broadcast aggregation table.
   Columns: שידור / תאריך / ערוץ / נשלחו / קליקים גולמיים / ייחודיים שלחצו /
            CTR גולמי % / CTR אמיתי % / הסרות אמיתיות / הסרה אמיתית %.
   Row click → Component D drill-down. M4_SHORT_LINKS_DASHBOARD_REDESIGN 2026-05-20.
   F-BOT-NOISE amendment-3 same day: SMS-gateway preview bots inflate raw clicks
   ~95% in the first 6 min after send. Real metrics (crm_leads.unsubscribed_at
   within 7d of broadcast) are the marketing signal; raw stays as sanity check
   with explicit "כולל בוטים" labeling. v1 = unsubscribes only; future can add
   registrations + purchases to ctr_real. Exports window.CrmShortLinksBroadcastsTable.
   ============================================================================= */
(function () {
  'use strict';

  var CLS_TH = 'px-3 py-2.5 text-start text-xs font-semibold text-slate-600 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap';
  var CLS_TH_NUM = 'px-3 py-2.5 text-end text-xs font-semibold text-slate-600 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap';
  var CLS_TD  = 'px-3 py-2.5 text-sm text-slate-800 border-b border-slate-100 whitespace-nowrap';
  var CLS_TD_NUM = 'px-3 py-2.5 text-sm text-end text-slate-800 border-b border-slate-100 tabular-nums whitespace-nowrap';

  var CHANNEL_LABELS = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };

  var _allRows = [];
  var _sortKey = 'created_at';
  var _sortDir = 'desc';
  var _onRowClick = null; // callback(broadcastId, broadcastName)
  var _filterState = null;

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    } catch (_) { return iso; }
  }

  function pct(num, denom) {
    if (!denom || denom === 0) return '0.0%';
    return (num / denom * 100).toFixed(1) + '%';
  }

  /* Main entry: loads data + renders into container. */
  async function render(container, filterState, onRowClick) {
    _filterState  = filterState;
    _onRowClick   = onRowClick;

    container.innerHTML =
      '<div id="short-links-broadcasts-table" class="bg-white rounded-lg border border-slate-200 overflow-hidden">' +
        '<div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">' +
          '<span class="text-sm font-semibold text-slate-700">שידורים — סטטיסטיקת קישורים</span>' +
          '<span id="sl-broadcasts-count" class="text-xs text-slate-400"></span>' +
        '</div>' +
        /* Explanatory caption (F-BOT-NOISE amendment 2026-05-20): users see the
           raw numbers AND the real numbers side-by-side; this caption tells them
           which to trust for marketing decisions. */
        '<div class="px-4 py-2 border-b border-slate-100 bg-amber-50 text-xs text-slate-600">' +
          '<span class="font-semibold text-amber-800">שים לב:</span> ' +
          'המספרים הגולמיים כוללים בוטים שסורקים קישורי SMS (התראות, אבטחה, תצוגה מקדימה). ' +
          'ה-CTR האמיתי נמדד לפי פעולות שלקוחות ביצעו בפועל (כרגע: הסרה; בעתיד: גם הרשמה ורכישה).' +
        '</div>' +
        '<div class="overflow-x-auto">' +
          '<div id="sl-broadcasts-inner" class="text-center text-slate-400 py-8 text-sm">טוען נתוני שידורים...</div>' +
        '</div>' +
      '</div>';

    try {
      _allRows = await _loadData(filterState);
      _renderRows(container);
    } catch (e) {
      console.error('broadcasts-table load failed:', e);
      var inner = container.querySelector('#sl-broadcasts-inner');
      if (inner) inner.innerHTML = '<div class="text-rose-500 py-6 text-sm text-center">שגיאה: ' +
        escapeHtml(e.message || String(e)) + '</div>';
    }
  }

  /* Re-applies the filter (no DB re-fetch) then re-renders. */
  function applyFilter(filterState) {
    _filterState = filterState;
    // Re-render with new onlyWithClicks + linkType (date filter needs full reload)
    var inner = document.getElementById('sl-broadcasts-inner');
    if (!inner) return;
    var parent = inner.closest('#short-links-broadcasts-table');
    if (!parent) return;
    _renderRows(parent.parentElement);
  }

  function _isoToMs(iso) {
    var d = new Date(iso);
    return d.getTime();
  }

  async function _loadData(filterState) {
    var tid = getTenantId();
    if (!tid) return [];

    var dateFrom = CrmShortLinksFilterBar.getDateFrom();

    // Fetch broadcasts in the requested date window. Defense-in-depth: explicit tenant_id.
    var bRes = await sb.from('crm_broadcasts')
      .select('id, name, channel, total_sent, created_at')
      .eq('tenant_id', tid)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false });
    if (bRes.error) throw new Error(bRes.error.message);
    var broadcasts = bRes.data || [];
    if (!broadcasts.length) return [];

    // F-POSTGREST-1000 amendment-2: clicks embed link metadata via FK
    // (short_link_clicks.short_link_id → short_links.id) instead of fetching
    // the full short_links table separately. PostgREST defaults to a 1000-row
    // response limit; Prizma has 8,194 live short_links — a direct fetch
    // silently truncated to 1000 → broadcast-specific links missing → zero
    // metrics. Embed returns rows = click count (~473 Prizma), never link count.
    var clicksRes = await sb.from('short_link_clicks')
      .select('broadcast_id, short_link_id, short_links!inner(link_type, lead_id)')
      .eq('tenant_id', tid)
      .not('broadcast_id', 'is', null);
    if (clicksRes.error) throw new Error(clicksRes.error.message);
    var clicks = clicksRes.data || [];

    // Aggregate raw clicks per broadcast_id (bot-polluted but useful as sanity check).
    // Each `c.short_links` is the FK-joined link record.
    var byBroadcast = {};
    clicks.forEach(function (c) {
      var slot = byBroadcast[c.broadcast_id] || (byBroadcast[c.broadcast_id] = {
        rawClicks: 0, uniqueClickerSet: {}
      });
      slot.rawClicks += 1;
      var lnk = c.short_links;
      if (lnk && lnk.lead_id) slot.uniqueClickerSet[lnk.lead_id] = true;
    });

    // F-BOT-NOISE amendment-3: real-unsubscribe signal. Bots inflate raw_clicks
    // ~95% in the first 6 min after send (Prizma 2026-05-20: 267 of 425 clicks
    // were bots, 17 real unsubs attributed within 7d). Approach: fetch leads
    // with recent unsubscribed_at (small set — Prizma all-time = 54), fetch
    // their short_links broadcast attribution, JS-attribute to a broadcast if
    // lead has a short_link for it AND unsubscribed_at ∈ [bcast.created_at, +7d].
    var unsubsRes = await sb.from('crm_leads')
      .select('id, unsubscribed_at')
      .eq('tenant_id', tid)
      .not('unsubscribed_at', 'is', null)
      .gte('unsubscribed_at', dateFrom.toISOString());
    if (unsubsRes.error) throw new Error(unsubsRes.error.message);
    var unsubs = unsubsRes.data || [];

    /* Lead-id → broadcast-id set lookup. Only fetched when there are unsubs to
       attribute. URL ceiling check: max ~54 lead UUIDs × 36 chars = ~2KB, well
       under the 16KB PostgREST limit. */
    var pairsByLead = {};
    if (unsubs.length) {
      var unsubLeadIds = unsubs.map(function (u) { return u.id; });
      var pairsRes = await sb.from('short_links')
        .select('lead_id, broadcast_id')
        .eq('tenant_id', tid)
        .in('lead_id', unsubLeadIds)
        .not('broadcast_id', 'is', null);
      if (pairsRes.error) throw new Error(pairsRes.error.message);
      (pairsRes.data || []).forEach(function (p) {
        if (!pairsByLead[p.lead_id]) pairsByLead[p.lead_id] = {};
        pairsByLead[p.lead_id][p.broadcast_id] = true;
      });
    }

    /* unsubAtByLead: lead_id → unsubscribed_at-ms timestamp. */
    var unsubAtByLead = {};
    unsubs.forEach(function (u) { unsubAtByLead[u.id] = _isoToMs(u.unsubscribed_at); });

    var WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

    /* Per-broadcast real-unsub count: leads who unsubscribed within 7d AND were
       attributed to this broadcast (had a short_link tied to it). */
    var realUnsubsByBroadcast = {};
    broadcasts.forEach(function (b) {
      var bStartMs = _isoToMs(b.created_at);
      var bEndMs   = bStartMs + WINDOW_MS;
      var count = 0;
      Object.keys(unsubAtByLead).forEach(function (leadId) {
        var ts = unsubAtByLead[leadId];
        if (ts < bStartMs || ts >= bEndMs) return;
        var bMap = pairsByLead[leadId];
        if (bMap && bMap[b.id]) count += 1;
      });
      realUnsubsByBroadcast[b.id] = count;
    });

    return broadcasts.map(function (b) {
      var agg  = byBroadcast[b.id] || { rawClicks: 0, uniqueClickerSet: {} };
      var sent = b.total_sent || 0;
      var realUnsubs = realUnsubsByBroadcast[b.id] || 0;
      /* real_actions: v1 ships unsubscribe-only. Future amendment can add
         registrations (via crm_event_attendees attribution) + purchases
         (crm_event_attendees.purchase_amount > 0). */
      var realActions = realUnsubs;
      return {
        id:               b.id,
        name:             b.name || '—',
        channel:          CHANNEL_LABELS[b.channel] || b.channel || '—',
        created_at:       b.created_at,
        total_sent:       sent,
        raw_clicks:       agg.rawClicks,
        unique_clickers:  Object.keys(agg.uniqueClickerSet).length,
        ctr_raw:          pct(agg.rawClicks, sent),
        ctr_real:         pct(realActions, sent),
        real_unsubs:      realUnsubs,
        unsub_real_pct:   pct(realUnsubs, sent)
      };
    });
  }

  function _renderRows(container) {
    var countEl = container.querySelector('#sl-broadcasts-count');
    var inner   = container.querySelector('#sl-broadcasts-inner');
    if (!inner) return;

    var state = _filterState || {};
    var visible = _allRows.filter(function (r) {
      if (state.onlyWithClicks && r.raw_clicks === 0) return false;
      return true;
    });

    var sorted = _sortRows(visible.slice());

    if (countEl) {
      countEl.textContent = sorted.length + ' שידורים' +
        (state.onlyWithClicks && sorted.length < _allRows.length
          ? ' (מתוך ' + _allRows.length + ')' : '');
    }

    if (!sorted.length) {
      inner.innerHTML = '<div class="text-center text-slate-400 py-8 text-sm">' +
        (state.onlyWithClicks ? 'אין שידורים עם קליקים בתקופה זו. כבה את הסינון לצפייה בכולם.' :
         'אין שידורים בתקופה זו.') + '</div>';
      return;
    }

    /* Column classes: raw metrics use de-emphasized slate-500; real metrics
       use slate-800 + bold to draw the eye to the signal-bearing column. */
    var CLS_TH_RAW   = CLS_TH_NUM + ' text-slate-500';
    var CLS_TH_REAL  = CLS_TH_NUM;
    var CLS_TD_RAW   = CLS_TD_NUM + ' text-slate-500';
    var CLS_TD_REAL  = CLS_TD_NUM + ' font-semibold';
    var TIP_RAW      = 'כולל בוטים שסורקים את הקישור (תצוגה מקדימה / אבטחה) — אינדיקטור גס בלבד';
    var TIP_REAL     = 'נמדד לפי פעולות בפועל של נמענים (כרגע: הסרה תוך 7 ימים מהשליחה)';

    var cols = [
      { key: 'name',            cls: CLS_TH,       label: 'שידור',           title: '' },
      { key: 'created_at',      cls: CLS_TH,       label: 'תאריך',           title: '' },
      { key: 'channel',         cls: CLS_TH,       label: 'ערוץ',            title: '' },
      { key: 'total_sent',      cls: CLS_TH_NUM,   label: 'נשלחו',           title: '' },
      { key: 'raw_clicks',      cls: CLS_TH_RAW,   label: 'קליקים גולמיים',  title: TIP_RAW },
      { key: 'unique_clickers', cls: CLS_TH_RAW,   label: 'ייחודיים שלחצו',  title: TIP_RAW },
      { key: 'ctr_raw',         cls: CLS_TH_RAW,   label: 'CTR גולמי %',     title: TIP_RAW },
      { key: 'ctr_real',        cls: CLS_TH_REAL,  label: 'CTR אמיתי %',     title: TIP_REAL },
      { key: 'real_unsubs',     cls: CLS_TH_REAL,  label: 'הסרות אמיתיות',   title: TIP_REAL },
      { key: 'unsub_real_pct',  cls: CLS_TH_REAL,  label: 'הסרה אמיתית %',   title: TIP_REAL }
    ];

    var thead = cols.map(function (c) {
      var arrow = (_sortKey === c.key) ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      var titleAttr = c.title ? ' title="' + escapeAttr(c.title) + '"' : '';
      return '<th class="' + c.cls + '" data-sort="' + c.key + '"' + titleAttr + '>' + escapeHtml(c.label) + arrow + '</th>';
    }).join('');

    var tbody = sorted.map(function (r) {
      /* Color emphasis on the REAL metrics only; raw stays de-emphasized. */
      var ctrRealCls   = parseFloat(r.ctr_real) > 2  ? ' text-emerald-700' : '';
      var unsubRealCls = parseFloat(r.unsub_real_pct) > 2 ? ' text-rose-600' : '';
      return '<tr class="hover:bg-blue-50 cursor-pointer transition-colors" data-broadcast-id="' + escapeAttr(r.id) + '" data-broadcast-name="' + escapeAttr(r.name) + '">' +
        '<td class="' + CLS_TD + ' max-w-xs truncate font-medium">' + escapeHtml(r.name) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(formatDate(r.created_at)) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.channel) + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.total_sent + '</td>' +
        '<td class="' + CLS_TD_RAW + '" title="' + escapeAttr(TIP_RAW) + '">' + r.raw_clicks + '</td>' +
        '<td class="' + CLS_TD_RAW + '" title="' + escapeAttr(TIP_RAW) + '">' + r.unique_clickers + '</td>' +
        '<td class="' + CLS_TD_RAW + '" title="' + escapeAttr(TIP_RAW) + '">' + r.ctr_raw + '</td>' +
        '<td class="' + CLS_TD_REAL + ctrRealCls + '" title="' + escapeAttr(TIP_REAL) + '">' + r.ctr_real + '</td>' +
        '<td class="' + CLS_TD_REAL + '" title="' + escapeAttr(TIP_REAL) + '">' + r.real_unsubs + '</td>' +
        '<td class="' + CLS_TD_REAL + unsubRealCls + '" title="' + escapeAttr(TIP_REAL) + '">' + r.unsub_real_pct + '</td>' +
      '</tr>';
    }).join('');

    inner.innerHTML =
      '<table class="w-full text-sm">' +
        '<thead><tr>' + thead + '</tr></thead>' +
        '<tbody>' + tbody + '</tbody>' +
      '</table>';

    // Sort click handlers
    inner.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (_sortKey === k) _sortDir = (_sortDir === 'asc' ? 'desc' : 'asc');
        else { _sortKey = k; _sortDir = 'desc'; }
        _renderRows(container);
      });
    });

    // Row click → drill-down
    inner.querySelectorAll('tr[data-broadcast-id]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var bid   = tr.getAttribute('data-broadcast-id');
        var bname = tr.getAttribute('data-broadcast-name');
        if (_onRowClick) _onRowClick(bid, bname);
      });
    });
  }

  function _sortRows(rows) {
    var mult = (_sortDir === 'asc') ? 1 : -1;
    return rows.sort(function (a, b) {
      var av = a[_sortKey], bv = b[_sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // Numeric pct strings ("3.5%") — strip % and compare numerically
      if (typeof av === 'string' && av.endsWith('%')) {
        return (parseFloat(av) - parseFloat(bv)) * mult;
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
      return String(av).localeCompare(String(bv), 'he') * mult;
    });
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.CrmShortLinksBroadcastsTable = { render: render, applyFilter: applyFilter };
})();
