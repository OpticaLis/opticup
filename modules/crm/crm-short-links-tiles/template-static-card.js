/* =============================================================================
   template-static-card.js — Component A: Template-static infrastructure card.
   Shows the shared (non-per-recipient) short links (link_type='template_static')
   with aggregate click counts + last-clicked timestamp.
   Part of M4_SHORT_LINKS_DASHBOARD_REDESIGN (2026-05-20).
   Exports window.CrmShortLinksTemplateStaticCard.
   ============================================================================= */
(function () {
  'use strict';

  var CLS_TH = 'px-3 py-2 text-start text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide';
  var CLS_TH_NUM = 'px-3 py-2 text-end text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide';
  var CLS_TD  = 'px-3 py-2.5 text-sm text-slate-800 border-b border-slate-100';
  var CLS_TD_NUM = 'px-3 py-2.5 text-sm text-end text-slate-800 border-b border-slate-100 tabular-nums';

  function formatTs(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
             ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (_) { return iso; }
  }

  async function render(container) {
    container.innerHTML =
      '<div id="short-links-template-static-card" class="bg-white rounded-lg border border-slate-200 overflow-hidden">' +
        '<div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">' +
          '<span class="text-sm font-semibold text-slate-700">קישורים סטטיים (משותפים)</span>' +
          '<span class="text-xs text-slate-400">— תשתית שיווקית, לא פר-נמען</span>' +
        '</div>' +
        '<div class="text-center text-slate-400 py-6 text-sm">טוען...</div>' +
      '</div>';

    try {
      var rows = await _loadData();
      _renderRows(container, rows);
    } catch (e) {
      console.error('template-static-card load failed:', e);
      var card = container.querySelector('#short-links-template-static-card');
      if (card) {
        card.innerHTML += '<div class="text-center text-rose-500 py-4 text-sm">שגיאה: ' +
          escapeHtml(e.message || String(e)) + '</div>';
      }
    }
  }

  async function _loadData() {
    var tid = getTenantId();
    if (!tid) return [];

    // Fetch template_static links. Defense-in-depth: both RLS + explicit tenant_id.
    var linksRes = await sb.from('short_links')
      .select('id, code, target_url, expires_at')
      .eq('tenant_id', tid)
      .eq('link_type', 'template_static')
      .gt('expires_at', new Date().toISOString());
    if (linksRes.error) throw new Error(linksRes.error.message);
    var links = linksRes.data || [];
    if (!links.length) return [];

    // INVERTED QUERY pattern (per M4_SHORT_LINKS_400_FIX lesson — PostgREST
    // rejects URLs > ~16KB; .in() on link IDs would regenerate the 400 problem).
    // Fetch ALL tenant clicks, then group client-side. Index:
    // idx_short_link_clicks_tenant_broadcast_clicked covers tenant_id scan.
    var clicksRes = await sb.from('short_link_clicks')
      .select('short_link_id, clicked_at')
      .eq('tenant_id', tid);
    if (clicksRes.error) throw new Error(clicksRes.error.message);
    var clicks = clicksRes.data || [];

    // Build lookup: link_id → { total, lastClicked }
    var byLink = {};
    clicks.forEach(function (c) {
      var slot = byLink[c.short_link_id] || (byLink[c.short_link_id] = { total: 0, last: null });
      slot.total += 1;
      if (!slot.last || c.clicked_at > slot.last) slot.last = c.clicked_at;
    });

    return links.map(function (l) {
      var agg = byLink[l.id] || { total: 0, last: null };
      var trunc = (l.target_url || '').length > 55
        ? l.target_url.slice(0, 52) + '…'
        : (l.target_url || '');
      return {
        code:        l.code,
        target_url:  l.target_url || '',
        target_trunc: trunc,
        total_clicks: agg.total,
        last_clicked: agg.last
      };
    }).sort(function (a, b) { return b.total_clicks - a.total_clicks; });
  }

  function _renderRows(container, rows) {
    var card = container.querySelector('#short-links-template-static-card');
    if (!card) return;

    var body = card.querySelector('div:last-child'); // the loading div
    if (!rows.length) {
      if (body) body.innerHTML = '<div class="text-center text-slate-400 py-4 text-sm">אין קישורים סטטיים פעילים.</div>';
      return;
    }

    var tbody = rows.map(function (r) {
      return '<tr>' +
        '<td class="' + CLS_TD + '">' +
          '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs">' + escapeHtml(r.code) + '</code>' +
        '</td>' +
        '<td class="' + CLS_TD + '">' +
          '<a href="' + escapeAttr(r.target_url) + '" target="_blank" rel="noopener" ' +
             'class="text-blue-600 hover:underline text-xs" title="' + escapeAttr(r.target_url) + '">' +
            escapeHtml(r.target_trunc) +
          '</a>' +
        '</td>' +
        '<td class="' + CLS_TD_NUM + ' font-semibold">' + r.total_clicks + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-500">' + escapeHtml(formatTs(r.last_clicked)) + '</td>' +
      '</tr>';
    }).join('');

    var tableHtml =
      '<table class="w-full text-sm">' +
        '<thead><tr>' +
          '<th class="' + CLS_TH + '">קוד</th>' +
          '<th class="' + CLS_TH + '">יעד</th>' +
          '<th class="' + CLS_TH_NUM + '">קליקים</th>' +
          '<th class="' + CLS_TH + '">קליק אחרון</th>' +
        '</tr></thead>' +
        '<tbody>' + tbody + '</tbody>' +
      '</table>';

    if (body) {
      body.remove();
    }
    card.insertAdjacentHTML('beforeend', tableHtml);
  }

  // escapeAttr: mirrors helper in orchestrator (avoids global dependency)
  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.CrmShortLinksTemplateStaticCard = { render: render };
})();
