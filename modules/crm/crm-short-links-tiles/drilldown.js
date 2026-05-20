/* =============================================================================
   drilldown.js — Component D: Per-link drill-down (secondary view).
   Hidden by default. Expands when a broadcast row is clicked in Component B,
   or when the "show all links" button is used.
   Refactored from the original crm-short-links-stats.js renderTable + sortRows.
   5-minute browser-memory cache keyed by `${broadcastId}|${linkTypeFilter}`.
   Part of M4_SHORT_LINKS_DASHBOARD_REDESIGN (2026-05-20).
   Exports window.CrmShortLinksDrilldown.
   ============================================================================= */
(function () {
  'use strict';

  var LINK_TYPE_LABELS = {
    template_static:  'תבנית סטטית',
    registration:     'רישום לאירוע',
    unsubscribe:      'הסרה',
    registration_url: 'רישום (legacy)',
    test:             'טסט',
    other:            'אחר'
  };

  var CLS_TH = 'px-3 py-2.5 text-start text-xs font-semibold text-slate-600 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap';
  var CLS_TH_NUM = 'px-3 py-2.5 text-end text-xs font-semibold text-slate-600 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap';
  var CLS_TD  = 'px-3 py-2.5 text-sm text-slate-800 border-b border-slate-100';
  var CLS_TD_NUM = 'px-3 py-2.5 text-sm text-end text-slate-800 border-b border-slate-100 tabular-nums';

  // 5-minute cache keyed by `${broadcastId}|${linkTypeFilter}`
  var _cache = {};
  var CACHE_TTL_MS = 5 * 60 * 1000;

  var _sortKey = 'total_clicks';
  var _sortDir = 'desc';
  var _currentBroadcastId   = null;
  var _currentBroadcastName = null;
  var _currentFilterState   = null;
  var _containerEl = null;

  function formatTs(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
             ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (_) { return iso; }
  }

  /* Creates the static shell (always hidden on first render). */
  function init(container) {
    _containerEl = container;
    container.innerHTML =
      '<div id="short-links-drilldown" class="hidden bg-white rounded-lg border border-slate-200 overflow-hidden">' +
        '<div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">' +
          '<div>' +
            '<span class="text-sm font-semibold text-slate-700">פירוט קישורים</span>' +
            '<span id="sl-drilldown-title" class="text-xs text-slate-500 me-2"></span>' +
          '</div>' +
          '<button id="sl-drilldown-close" class="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>' +
        '</div>' +
        '<div class="overflow-x-auto">' +
          '<div id="sl-drilldown-inner" class="text-center text-slate-400 py-8 text-sm"></div>' +
        '</div>' +
      '</div>';

    var closeBtn = container.querySelector('#sl-drilldown-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { hide(); });
    }
  }

  function hide() {
    var el = _containerEl && _containerEl.querySelector('#short-links-drilldown');
    if (el) el.classList.add('hidden');
    _currentBroadcastId = null;
  }

  /* Opens the drill-down for a specific broadcast. */
  async function openForBroadcast(broadcastId, broadcastName, filterState) {
    _currentBroadcastId   = broadcastId;
    _currentBroadcastName = broadcastName;
    _currentFilterState   = filterState;

    var el = _containerEl && _containerEl.querySelector('#short-links-drilldown');
    if (!el) return;
    el.classList.remove('hidden');

    var titleEl = el.querySelector('#sl-drilldown-title');
    if (titleEl) titleEl.textContent = '— ' + (broadcastName || '');

    var inner = el.querySelector('#sl-drilldown-inner');
    if (inner) inner.innerHTML = '<div class="text-slate-400 py-8 text-sm text-center">טוען פירוט...</div>';

    try {
      var rows = await _loadRows(broadcastId, filterState);
      _renderRows(inner, rows);
    } catch (e) {
      console.error('drilldown load failed:', e);
      if (inner) inner.innerHTML = '<div class="text-rose-500 py-6 text-sm text-center">שגיאה: ' +
        escapeHtml(e.message || String(e)) + '</div>';
    }
  }

  async function _loadRows(broadcastId, filterState) {
    var typeFilter = (filterState || {}).linkTypeFilter || 'all';
    var cacheKey   = broadcastId + '|' + typeFilter;
    var cached     = _cache[cacheKey];
    if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) return cached.rows;

    var tid = getTenantId();
    if (!tid) return [];

    // Fetch clicks scoped to this broadcast_id (single equality — no URL ceiling risk).
    // Defense-in-depth: explicit tenant_id even though RLS enforces it.
    var clicksRes = await sb.from('short_link_clicks')
      .select('short_link_id, clicked_at, lead_id')
      .eq('tenant_id', tid)
      .eq('broadcast_id', broadcastId);
    if (clicksRes.error) throw new Error(clicksRes.error.message);
    var clicks = clicksRes.data || [];

    // Build link_id → agg map
    var byLink = {};
    clicks.forEach(function (c) {
      var slot = byLink[c.short_link_id] || (byLink[c.short_link_id] = { total: 0, last: null });
      slot.total += 1;
      if (!slot.last || c.clicked_at > slot.last) slot.last = c.clicked_at;
    });

    var linkIds = Object.keys(byLink);
    if (!linkIds.length) {
      _cache[cacheKey] = { ts: Date.now(), rows: [] };
      return [];
    }

    // Fetch the actual link metadata for those IDs.
    // INVERTED PATTERN is not needed here because we already have a small-cardinality
    // click set (broadcast-scoped) → the link IDs list is at most ~tens, not thousands.
    // However, to be safe we still avoid IN-clause by fetching all tenant links + filtering JS-side.
    var linksRes = await sb.from('short_links')
      .select('id, code, target_url, link_type')
      .eq('tenant_id', tid)
      .gt('expires_at', new Date().toISOString());
    if (linksRes.error) throw new Error(linksRes.error.message);
    var links = linksRes.data || [];

    // JS-filter to just the clicked links + apply category filter
    var perTypes  = CrmShortLinksFilterBar.getPERTypes();
    var statTypes = CrmShortLinksFilterBar.getTemplateTypes();

    var rows = links
      .filter(function (l) {
        if (!byLink[l.id]) return false; // no clicks for this link in this broadcast
        if (typeFilter === 'per_recipient'   && perTypes.indexOf(l.link_type) === -1)  return false;
        if (typeFilter === 'template_static' && statTypes.indexOf(l.link_type) === -1) return false;
        return true;
      })
      .map(function (l) {
        var agg   = byLink[l.id];
        var trunc = (l.target_url || '').length > 60
          ? l.target_url.slice(0, 57) + '…'
          : (l.target_url || '');
        return {
          id:           l.id,
          code:         l.code,
          link_type:    l.link_type || 'other',
          link_type_label: LINK_TYPE_LABELS[l.link_type] || l.link_type || '—',
          target_url:   l.target_url || '',
          target_trunc: trunc,
          total_clicks: agg.total,
          last_clicked: agg.last
        };
      });

    _cache[cacheKey] = { ts: Date.now(), rows: rows };
    return rows;
  }

  function _renderRows(inner, rows) {
    if (!inner) return;
    if (!rows.length) {
      inner.innerHTML = '<div class="text-slate-400 py-8 text-sm text-center">אין נתוני קישורים לשידור זה.</div>';
      return;
    }

    var cols = [
      { key: 'code',          cls: CLS_TH,     label: 'קוד' },
      { key: 'link_type_label',cls: CLS_TH,    label: 'סוג' },
      { key: 'target_url',    cls: CLS_TH,     label: 'יעד' },
      { key: 'total_clicks',  cls: CLS_TH_NUM, label: 'קליקים' },
      { key: 'last_clicked',  cls: CLS_TH,     label: 'קליק אחרון' }
    ];

    var sorted = _sortRows(rows.slice());

    var thead = cols.map(function (c) {
      var arrow = (_sortKey === c.key) ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="' + c.cls + '" data-sort="' + c.key + '">' + escapeHtml(c.label) + arrow + '</th>';
    }).join('');

    var tbody = sorted.map(function (r) {
      return '<tr>' +
        '<td class="' + CLS_TD + '"><code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs">' + escapeHtml(r.code) + '</code></td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.link_type_label) + '</td>' +
        '<td class="' + CLS_TD + '"><a href="' + escapeAttr(r.target_url) + '" target="_blank" rel="noopener" class="text-blue-600 hover:underline text-xs" title="' + escapeAttr(r.target_url) + '">' + escapeHtml(r.target_trunc) + '</a></td>' +
        '<td class="' + CLS_TD_NUM + ' font-semibold">' + r.total_clicks + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-500">' + escapeHtml(formatTs(r.last_clicked)) + '</td>' +
      '</tr>';
    }).join('');

    inner.innerHTML =
      '<table class="w-full text-sm">' +
        '<thead><tr>' + thead + '</tr></thead>' +
        '<tbody>' + tbody + '</tbody>' +
      '</table>';

    inner.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (_sortKey === k) _sortDir = (_sortDir === 'asc' ? 'desc' : 'asc');
        else { _sortKey = k; _sortDir = 'desc'; }
        var reRows = _cache[(_currentBroadcastId || '') + '|' + ((_currentFilterState || {}).linkTypeFilter || 'all')];
        _renderRows(inner, reRows ? reRows.rows.slice() : []);
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

  window.CrmShortLinksDrilldown = { init: init, openForBroadcast: openForBroadcast, hide: hide };
})();
