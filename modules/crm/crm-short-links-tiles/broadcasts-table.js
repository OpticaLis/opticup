/* =============================================================================
   broadcasts-table.js — Component B: Broadcast aggregation table (primary view).
   One row per broadcast in date range. Columns: שידור, תאריך, ערוץ, נשלחו,
   קליקים, ייחודיים, CTR%, הסרות, הסרה%.
   Sortable by date desc default. Row click → triggers Component D drill-down.
   Part of M4_SHORT_LINKS_DASHBOARD_REDESIGN (2026-05-20).
   Exports window.CrmShortLinksBroadcastsTable.
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

    // Fetch ALL tenant clicks once (inverted pattern — avoids IN-clause URL ceiling).
    // Index idx_short_link_clicks_tenant_broadcast_clicked covers this.
    var [clicksRes, linksRes] = await Promise.all([
      sb.from('short_link_clicks')
        .select('short_link_id, broadcast_id, lead_id')
        .eq('tenant_id', tid),
      sb.from('short_links')
        .select('id, link_type')
        .eq('tenant_id', tid)
        .gt('expires_at', new Date().toISOString())
    ]);
    if (clicksRes.error) throw new Error(clicksRes.error.message);
    if (linksRes.error) throw new Error(linksRes.error.message);

    var clicks = clicksRes.data || [];
    var links  = linksRes.data  || [];

    // Build lookup: link_id → link_type (for unsubscribe detection)
    var linkTypeById = {};
    links.forEach(function (l) { linkTypeById[l.id] = l.link_type; });

    // Aggregate per broadcast_id
    var byBroadcast = {};
    clicks.forEach(function (c) {
      if (!c.broadcast_id) return; // template_static or legacy — not counted here
      var slot = byBroadcast[c.broadcast_id] || (byBroadcast[c.broadcast_id] = {
        total: 0, leadSet: {}, unsubscribes: 0
      });
      slot.total += 1;
      if (c.lead_id) slot.leadSet[c.lead_id] = true;
      var lt = linkTypeById[c.short_link_id] || '';
      if (lt === 'unsubscribe') slot.unsubscribes += 1;
    });

    return broadcasts.map(function (b) {
      var agg  = byBroadcast[b.id] || { total: 0, leadSet: {}, unsubscribes: 0 };
      var sent = b.total_sent || 0;
      return {
        id:           b.id,
        name:         b.name || '—',
        channel:      CHANNEL_LABELS[b.channel] || b.channel || '—',
        created_at:   b.created_at,
        total_sent:   sent,
        total_clicks: agg.total,
        unique_leads: Object.keys(agg.leadSet).length,
        ctr:          pct(agg.total, sent),
        unsubscribes: agg.unsubscribes,
        unsub_pct:    pct(agg.unsubscribes, sent)
      };
    });
  }

  function _renderRows(container) {
    var countEl = container.querySelector('#sl-broadcasts-count');
    var inner   = container.querySelector('#sl-broadcasts-inner');
    if (!inner) return;

    var state = _filterState || {};
    var visible = _allRows.filter(function (r) {
      if (state.onlyWithClicks && r.total_clicks === 0) return false;
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

    var cols = [
      { key: 'name',         cls: CLS_TH,     label: 'שידור' },
      { key: 'created_at',   cls: CLS_TH,     label: 'תאריך' },
      { key: 'channel',      cls: CLS_TH,     label: 'ערוץ' },
      { key: 'total_sent',   cls: CLS_TH_NUM, label: 'נשלחו' },
      { key: 'total_clicks', cls: CLS_TH_NUM, label: 'קליקים' },
      { key: 'unique_leads', cls: CLS_TH_NUM, label: 'ייחודיים' },
      { key: 'ctr',          cls: CLS_TH_NUM, label: 'CTR%' },
      { key: 'unsubscribes', cls: CLS_TH_NUM, label: 'הסרות' },
      { key: 'unsub_pct',    cls: CLS_TH_NUM, label: 'הסרה%' }
    ];

    var thead = cols.map(function (c) {
      var arrow = (_sortKey === c.key) ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="' + c.cls + '" data-sort="' + c.key + '">' + escapeHtml(c.label) + arrow + '</th>';
    }).join('');

    var tbody = sorted.map(function (r) {
      var ctrCls = parseFloat(r.ctr) > 5 ? ' text-emerald-700 font-semibold' : '';
      var unsubCls = parseFloat(r.unsub_pct) > 2 ? ' text-rose-600 font-semibold' : '';
      return '<tr class="hover:bg-blue-50 cursor-pointer transition-colors" data-broadcast-id="' + escapeAttr(r.id) + '" data-broadcast-name="' + escapeAttr(r.name) + '">' +
        '<td class="' + CLS_TD + ' max-w-xs truncate font-medium">' + escapeHtml(r.name) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(formatDate(r.created_at)) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.channel) + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.total_sent + '</td>' +
        '<td class="' + CLS_TD_NUM + ' font-semibold">' + r.total_clicks + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.unique_leads + '</td>' +
        '<td class="' + CLS_TD_NUM + ctrCls + '">' + r.ctr + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.unsubscribes + '</td>' +
        '<td class="' + CLS_TD_NUM + unsubCls + '">' + r.unsub_pct + '</td>' +
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
