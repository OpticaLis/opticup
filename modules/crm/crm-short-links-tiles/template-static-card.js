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
        '<div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">' +
          '<div class="flex items-center gap-2">' +
            '<span class="text-sm font-semibold text-slate-700">קישורים סטטיים (משותפים)</span>' +
            '<span class="text-xs text-slate-400">— תשתית שיווקית, לא פר-נמען</span>' +
          '</div>' +
          '<button id="short-links-new-static-btn" type="button" class="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition">+ קישור קצר חדש</button>' +
        '</div>' +
        '<div class="text-center text-slate-400 py-6 text-sm">טוען...</div>' +
      '</div>';
    _wireCreateBtn(container);

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

  // M4_STATIC_SHORT_LINK_SELF_SERVE (Sprint 2 Item 4, 2026-05-21): operator
  // creates a static short_link without SQL. URL validated client + server (RPC).
  function _wireCreateBtn(container) {
    var btn = container.querySelector('#short-links-new-static-btn');
    if (!btn) return;
    btn.addEventListener('click', function () { _openCreateModal(container); });
  }

  function _openCreateModal(container) {
    var existing = document.getElementById('short-links-new-static-modal');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'short-links-new-static-modal';
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" dir="rtl">' +
        '<h3 class="text-lg font-bold text-slate-800 mb-3">יצירת קישור קצר סטטי</h3>' +
        '<label class="block text-xs font-semibold text-slate-600 mb-1">כתובת יעד (URL)</label>' +
        '<input id="sls-url-input" type="url" placeholder="https://www.example.co.il/page" ' +
          'class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3" />' +
        '<label class="block text-xs font-semibold text-slate-600 mb-1">תווית (אופציונלי, להזכיר לעצמך)</label>' +
        '<input id="sls-label-input" type="text" placeholder="לדוגמה: דף מבצעים" ' +
          'class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-1" />' +
        '<p class="text-xs text-slate-500 mb-3">הקישור הזה ייווצר עם קוד ייחודי גלובלי. ' +
          'תוקף עד 2099 (אינסופי בפועל).</p>' +
        '<div id="sls-error" class="text-xs text-rose-600 mb-2 hidden"></div>' +
        '<div id="sls-success" class="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mb-3 hidden"></div>' +
        '<div class="flex gap-2 justify-end">' +
          '<button id="sls-cancel" type="button" class="px-4 py-2 rounded bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300">סגור</button>' +
          '<button id="sls-create" type="button" class="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">צור קישור</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('sls-cancel').addEventListener('click', function () { overlay.remove(); });
    document.getElementById('sls-create').addEventListener('click', function () { _submitCreate(container, overlay); });
    setTimeout(function () { var i = document.getElementById('sls-url-input'); if (i) i.focus(); }, 50);
  }

  async function _submitCreate(container, overlay) {
    var urlInput = document.getElementById('sls-url-input');
    var labelInput = document.getElementById('sls-label-input');
    var errEl = document.getElementById('sls-error');
    var okEl = document.getElementById('sls-success');
    var createBtn = document.getElementById('sls-create');
    var url = (urlInput && urlInput.value || '').trim();
    errEl.classList.add('hidden'); okEl.classList.add('hidden');
    if (!/^https?:\/\/\S+$/i.test(url)) {
      errEl.textContent = 'יש להזין כתובת תקינה (מתחילה ב-http:// או https://)';
      errEl.classList.remove('hidden');
      return;
    }
    createBtn.disabled = true;
    var oldText = createBtn.textContent;
    createBtn.textContent = 'יוצר...';
    try {
      var tid = getTenantId();
      var rpc = await sb.rpc('crm_create_static_short_link', { p_tenant_id: tid, p_target_url: url });
      if (rpc.error) throw new Error(rpc.error.message);
      var d = rpc.data || {};
      if (!d.ok) {
        var msg = d.error === 'url_invalid' ? 'כתובת לא תקינה'
                 : d.error === 'url_empty' ? 'כתובת ריקה'
                 : d.error === 'url_too_long' ? 'כתובת ארוכה מדי'
                 : d.error === 'code_collision_exhausted' ? 'כשל ביצירת קוד ייחודי — נסה שוב'
                 : 'שגיאה: ' + (d.error || 'unknown');
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
        createBtn.disabled = false;
        createBtn.textContent = oldText;
        return;
      }
      var label = (labelInput && labelInput.value || '').trim();
      var labelHtml = label ? ('<div class="text-slate-600 mb-1">תווית: <b>' + escapeHtml(label) + '</b></div>') : '';
      okEl.innerHTML = labelHtml +
        '<div>הקישור נוצר. קוד: <code class="font-mono bg-emerald-100 px-1 py-0.5 rounded">' + escapeHtml(d.code) + '</code></div>' +
        '<div class="mt-1">נתיב קצר: <code class="font-mono">' + escapeHtml(d.short_path) + '</code></div>' +
        '<div class="text-slate-500 mt-1">מפנה אל: <span dir="ltr">' + escapeHtml(d.target_url) + '</span></div>';
      okEl.classList.remove('hidden');
      createBtn.disabled = false;
      createBtn.textContent = oldText;
      urlInput.value = ''; if (labelInput) labelInput.value = '';
      if (typeof render === 'function') render(container);
      if (window.Toast) Toast.success('קישור קצר חדש נוצר: ' + d.short_path);
    } catch (e) {
      errEl.textContent = 'שגיאה: ' + (e.message || String(e));
      errEl.classList.remove('hidden');
      createBtn.disabled = false;
      createBtn.textContent = oldText;
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
