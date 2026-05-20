/* =============================================================================
   crm-short-links-stats.js — MVP "Short Link Stats" tab inside CRM
   Reads short_links + short_link_clicks for per-code totals + last-click + broadcast breakdown.
   Source: M3_SHORTGY_TO_INTERNAL_REDIRECT (P1.3, 2026-05-14). MVP — single sortable table.
   Exports window.loadCrmShortLinksStats.
   ============================================================================= */
(function () {
  'use strict';

  var LINK_TYPE_LABELS = {
    template_static: 'תבנית סטטית',
    registration: 'רישום לאירוע',
    unsubscribe: 'הסרה',
    registration_url: 'רישום (legacy)',
    other: 'אחר',
    test: 'טסט'
  };

  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none hover:bg-slate-100';
  var CLS_TH_NUM = 'px-4 py-2.5 text-end font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none hover:bg-slate-100';
  var CLS_TD = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';
  var CLS_TD_NUM = 'px-4 py-2.5 text-end text-slate-800 border-b border-slate-100 tabular-nums';

  var _rows = [];
  var _sortKey = 'total_clicks';
  var _sortDir = 'desc';

  async function loadCrmShortLinksStats(host) {
    if (!host) return;
    host.innerHTML =
      '<div>' +
        '<h4 class="text-base font-bold text-slate-800 mb-1">🔗 קישורים קצרים — סטטיסטיקה</h4>' +
        '<p class="text-xs text-slate-500 mb-3">' +
          'כל קישור /r/&lt;code&gt; פעיל של הטננט עם סך הקליקים וההפצה לפי שידור. הקלקה על כותרת — מיון.' +
        '</p>' +
        '<div id="short-links-wrap" class="bg-white rounded-lg border border-slate-200 overflow-x-auto">' +
          '<div class="text-center text-slate-400 py-8">טוען נתוני קישורים...</div>' +
        '</div>';
    try {
      await loadData();
      renderTable();
    } catch (e) {
      console.error('short-links stats load failed:', e);
      var wrap = document.getElementById('short-links-wrap');
      if (wrap) {
        wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' +
          escapeHtml(e.message || String(e)) + '</div>';
      }
    }
  }
  window.loadCrmShortLinksStats = loadCrmShortLinksStats;

  async function loadData() {
    var tid = getTenantId();
    if (!tid) { _rows = []; return; }

    // Pull all live (non-expired) short_links for this tenant. Tenant-isolation
    // RLS already filters; .eq is defense-in-depth (Iron Rule 22).
    var linksRes = await sb.from('short_links')
      .select('id, code, target_url, link_type, broadcast_id, created_at, click_count')
      .eq('tenant_id', tid)
      .gt('expires_at', new Date().toISOString());
    if (linksRes.error) { _rows = []; throw new Error(linksRes.error.message); }
    var links = linksRes.data || [];
    if (!links.length) { _rows = []; return; }

    // Aggregate clicks per link from short_link_clicks (the authoritative
    // ledger — short_links.click_count is a denormalized counter).
    // INVERTED QUERY (M4_SHORT_LINKS_400_FIX, 2026-05-20): fetch ALL clicks
    // for the tenant in a single query, then JS-map to live links downstream.
    // Reason: PostgREST rejects URLs > ~16KB; .in('short_link_id', [7K UUIDs])
    // produced ~260KB URL → 400. Click cardinality is tiny vs link cardinality,
    // so this is strictly faster + scale-proof. Index idx_short_link_clicks_
    // tenant_id_clicked_at covers it. Clicks on expired links are silently
    // dropped by the byLink[l.id] lookup below — same UI semantic as before.
    var clicksRes = await sb.from('short_link_clicks')
      .select('short_link_id, clicked_at, broadcast_id')
      .eq('tenant_id', tid);
    if (clicksRes.error) { _rows = []; throw new Error(clicksRes.error.message); }
    var clicks = clicksRes.data || [];

    // Group clicks by short_link_id → total + last + per-broadcast breakdown
    var byLink = {};
    clicks.forEach(function (c) {
      var slot = byLink[c.short_link_id] || (byLink[c.short_link_id] = {
        total: 0, last: null, broadcasts: {}
      });
      slot.total += 1;
      if (!slot.last || c.clicked_at > slot.last) slot.last = c.clicked_at;
      var bId = c.broadcast_id || '__none__';
      slot.broadcasts[bId] = (slot.broadcasts[bId] || 0) + 1;
    });

    _rows = links.map(function (l) {
      var agg = byLink[l.id] || { total: 0, last: null, broadcasts: {} };
      var bIds = Object.keys(agg.broadcasts).filter(function (k) { return k !== '__none__'; });
      return {
        id: l.id,
        code: l.code,
        link_type: l.link_type || 'other',
        link_type_label: LINK_TYPE_LABELS[l.link_type] || l.link_type || '—',
        target_url: l.target_url || '',
        total_clicks: agg.total,
        last_clicked_at: agg.last,
        broadcast_count: bIds.length,
        clicks_with_broadcast: bIds.reduce(function (s, k) { return s + agg.broadcasts[k]; }, 0),
        clicks_without_broadcast: agg.broadcasts.__none__ || 0,
        created_at: l.created_at
      };
    });
  }

  function renderTable() {
    var wrap = document.getElementById('short-links-wrap');
    if (!wrap) return;
    if (!_rows.length) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין קישורים פעילים לטננט הזה.</div>';
      return;
    }

    var sorted = sortRows(_rows.slice(), _sortKey, _sortDir);
    var cols = [
      { key: 'code',                     cls: CLS_TH,     label: 'קוד' },
      { key: 'link_type_label',          cls: CLS_TH,     label: 'סוג' },
      { key: 'target_url',               cls: CLS_TH,     label: 'יעד' },
      { key: 'total_clicks',             cls: CLS_TH_NUM, label: 'סך קליקים' },
      { key: 'clicks_with_broadcast',    cls: CLS_TH_NUM, label: 'עם שידור' },
      { key: 'clicks_without_broadcast', cls: CLS_TH_NUM, label: 'בלי שידור' },
      { key: 'broadcast_count',          cls: CLS_TH_NUM, label: '# שידורים' },
      { key: 'last_clicked_at',          cls: CLS_TH,     label: 'קליק אחרון' }
    ];

    var thHtml = cols.map(function (c) {
      var arrow = (_sortKey === c.key) ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="' + c.cls + '" data-sort="' + c.key + '">' + escapeHtml(c.label) + arrow + '</th>';
    }).join('');

    var bodyHtml = sorted.map(function (r) {
      var trunc = r.target_url.length > 60 ? r.target_url.slice(0, 57) + '…' : r.target_url;
      return '<tr>' +
        '<td class="' + CLS_TD + '"><code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs">' + escapeHtml(r.code) + '</code></td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.link_type_label) + '</td>' +
        '<td class="' + CLS_TD + '"><a href="' + escapeAttr(r.target_url) + '" target="_blank" rel="noopener" class="text-blue-600 hover:underline" title="' + escapeAttr(r.target_url) + '">' + escapeHtml(trunc) + '</a></td>' +
        '<td class="' + CLS_TD_NUM + ' font-semibold">' + r.total_clicks + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.clicks_with_broadcast + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.clicks_without_broadcast + '</td>' +
        '<td class="' + CLS_TD_NUM + '">' + r.broadcast_count + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(formatTs(r.last_clicked_at)) + '</td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML = '<table class="' + CLS_TABLE + '">' +
      '<thead><tr>' + thHtml + '</tr></thead>' +
      '<tbody>' + bodyHtml + '</tbody>' +
    '</table>';

    Array.prototype.forEach.call(wrap.querySelectorAll('th[data-sort]'), function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (_sortKey === k) _sortDir = (_sortDir === 'asc' ? 'desc' : 'asc');
        else { _sortKey = k; _sortDir = (k === 'total_clicks' || k === 'broadcast_count' || k === 'clicks_with_broadcast' || k === 'clicks_without_broadcast') ? 'desc' : 'asc'; }
        renderTable();
      });
    });
  }

  function sortRows(rows, key, dir) {
    var mult = (dir === 'asc') ? 1 : -1;
    return rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
      return String(av).localeCompare(String(bv), 'he') * mult;
    });
  }

  function formatTs(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (_) { return iso; }
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();
