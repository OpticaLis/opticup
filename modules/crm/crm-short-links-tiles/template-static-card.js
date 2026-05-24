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

  var _activeChannel = 'all';
  var _cachedRows = null;
  var _cachedContainer = null;

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
    _activeChannel = 'all';
    _cachedContainer = container;
    container.innerHTML =
      '<div id="short-links-template-static-card" class="bg-white rounded-lg border border-slate-200 overflow-hidden">' +
        '<div class="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">' +
          '<div class="flex items-center gap-2">' +
            '<span class="text-sm font-semibold text-slate-700">קישורים סטטיים (משותפים)</span>' +
            '<span class="text-xs text-slate-400">— תשתית שיווקית, לא פר-נמען</span>' +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            '<div id="sl-channel-chips" class="flex gap-1">' + CrmShortLinksChannelGroup.renderFilterChips(_activeChannel) + '</div>' +
            '<button id="short-links-new-static-btn" type="button" class="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition">+ קישור קצר חדש</button>' +
          '</div>' +
        '</div>' +
        '<div class="text-center text-slate-400 py-6 text-sm">טוען...</div>' +
      '</div>';
    _wireCreateBtn(container);
    _wireChannelChips(container);

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

  function _wireChannelChips(container) {
    container.querySelectorAll('[data-sl-channel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeChannel = btn.getAttribute('data-sl-channel');
        var chipsEl = container.querySelector('#sl-channel-chips');
        if (chipsEl) chipsEl.innerHTML = CrmShortLinksChannelGroup.renderFilterChips(_activeChannel);
        _wireChannelChips(container);
        if (_cachedRows) _renderRows(container, _cachedRows);
      });
    });
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
        '<label class="block text-xs font-semibold text-slate-600 mb-1">תווית (מזהה הקישור)</label>' +
        '<input id="sls-label-input" type="text" placeholder="לדוגמה: pricing_catalog" ' +
          'class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-1" />' +
        '<p class="text-xs text-slate-500 mb-3">התווית משמשת כמזהה הקבוצה. בבחירת ערוץ, הסיומת (_sms/_email) תתווסף אוטומטית.</p>' +
        '<label class="block text-xs font-semibold text-slate-600 mb-1">ערוץ</label>' +
        '<div id="sls-channel-radios" class="flex gap-3 mb-3">' +
          '<label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="sls-channel" value="both" checked class="accent-blue-600"> <span class="text-sm">שניהם (SMS + מייל)</span></label>' +
          '<label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="sls-channel" value="sms" class="accent-blue-600"> <span class="text-sm">SMS בלבד</span></label>' +
          '<label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="sls-channel" value="email" class="accent-blue-600"> <span class="text-sm">מייל בלבד</span></label>' +
        '</div>' +
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
    var labelPrefix = (labelInput && labelInput.value || '').trim();
    var channelRadio = overlay.querySelector('input[name="sls-channel"]:checked');
    var channelVal = channelRadio ? channelRadio.value : 'both';
    errEl.classList.add('hidden'); okEl.classList.add('hidden');
    if (!/^https?:\/\/\S+$/i.test(url)) { errEl.textContent = 'יש להזין כתובת תקינה (מתחילה ב-http:// או https://)'; errEl.classList.remove('hidden'); return; }
    if (!labelPrefix) { errEl.textContent = 'יש להזין תווית (מזהה קבוצה)'; errEl.classList.remove('hidden'); return; }
    createBtn.disabled = true;
    var oldText = createBtn.textContent;
    createBtn.textContent = 'יוצר...';
    try {
      var tid = getTenantId();
      var channels = channelVal === 'both' ? ['sms', 'email'] : [channelVal];
      var results = [];
      for (var i = 0; i < channels.length; i++) {
        var rpc = await sb.rpc('crm_create_channeled_short_link', { p_tenant_id: tid, p_target_url: url, p_label_prefix: labelPrefix, p_channel: channels[i] });
        if (rpc.error) throw new Error(rpc.error.message);
        var d = rpc.data || {};
        if (!d.ok) {
          var msg = d.error === 'url_invalid' ? 'כתובת לא תקינה'
                   : d.error === 'url_empty' ? 'כתובת ריקה'
                   : d.error === 'label_prefix_required' ? 'יש להזין תווית'
                   : d.error === 'invalid_channel' ? 'ערוץ לא תקין'
                   : d.error === 'code_collision_exhausted' ? 'כשל ביצירת קוד ייחודי — נסה שוב'
                   : 'שגיאה: ' + (d.error || 'unknown');
          errEl.textContent = msg;
          errEl.classList.remove('hidden');
          createBtn.disabled = false; createBtn.textContent = oldText;
          return;
        }
        results.push(d);
      }
      var html = results.map(function (d) {
        return '<div class="mb-1">' +
          '<code class="font-mono bg-emerald-100 px-1 py-0.5 rounded">' + escapeHtml(d.code) + '</code> ' +
          '<span class="text-slate-500">(' + escapeHtml(d.label) + ')</span> → ' +
          '<code class="font-mono text-xs">' + escapeHtml(d.short_path) + '</code></div>';
      }).join('');
      okEl.innerHTML = '<div class="text-slate-600 mb-1">נוצר' + (results.length > 1 ? 'ו ' + results.length + ' קישורים' : ' קישור') + ':</div>' + html +
        '<div class="text-slate-500 mt-1 text-xs">מפנה אל: <span dir="ltr">' + escapeHtml(results[0].target_url) + '</span></div>';
      okEl.classList.remove('hidden');
      createBtn.disabled = false; createBtn.textContent = oldText;
      urlInput.value = ''; labelInput.value = '';
      render(container);
      if (window.Toast) Toast.success('נוצר' + (results.length > 1 ? 'ו ' + results.length + ' קישורים' : ' קישור חדש'));
    } catch (e) {
      errEl.textContent = 'שגיאה: ' + (e.message || String(e));
      errEl.classList.remove('hidden');
      createBtn.disabled = false; createBtn.textContent = oldText;
    }
  }

  async function _loadData() {
    var tid = getTenantId();
    if (!tid) return [];

    // SPEC 3 Item 5: include label column.
    var linksRes = await sb.from('short_links')
      .select('id, code, target_url, expires_at, label')
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
      var trunc = (l.target_url || '').length > 55 ? l.target_url.slice(0, 52) + '…' : (l.target_url || '');
      return { id: l.id, code: l.code, target_url: l.target_url || '', target_trunc: trunc, label: l.label || '', total_clicks: agg.total, last_clicked: agg.last };
    }).sort(function (a, b) { return b.total_clicks - a.total_clicks; });
  }

  function _renderRows(container, rows) {
    _cachedRows = rows;
    var card = container.querySelector('#short-links-template-static-card');
    if (!card) return;
    var body = card.querySelector('table');
    if (body) body.remove();
    var loadingDiv = card.querySelector('div:last-child');
    if (loadingDiv && loadingDiv.textContent.indexOf('טוען') !== -1) loadingDiv.remove();
    if (!rows.length) { card.insertAdjacentHTML('beforeend', '<div class="text-center text-slate-400 py-4 text-sm">אין קישורים סטטיים פעילים.</div>'); return; }

    var data = CrmShortLinksChannelGroup.buildGroups(rows);
    var display = CrmShortLinksChannelGroup.getDisplayRows(data, _activeChannel);

    var tbody = display.map(function (d) {
      var codeHtml = d.codes.map(function (c) {
        return '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs">' + escapeHtml(c) + '</code>';
      }).join(' ');
      var breakdownHtml = d.breakdown ? '<div class="text-xs text-slate-400 mt-0.5">' + escapeHtml(d.breakdown) + '</div>' : '';
      var labelDisplay = d.key || '—';
      if (d.ungrouped) labelDisplay += ' <span class="text-xs text-amber-600">(אחר)</span>';
      return '<tr>' +
        '<td class="' + CLS_TD + '">' + codeHtml + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-700">' + labelDisplay + '</td>' +
        '<td class="' + CLS_TD + '"><a href="' + escapeAttr(d.target_url) + '" target="_blank" rel="noopener" class="text-blue-600 hover:underline text-xs" title="' + escapeAttr(d.target_url) + '">' + escapeHtml(d.target_trunc) + '</a></td>' +
        '<td class="' + CLS_TD_NUM + ' font-semibold">' + d.clicks + breakdownHtml + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-500">' + escapeHtml(formatTs(d.lastClicked)) + '</td>' +
      '</tr>';
    }).join('');

    var tableHtml =
      '<table class="w-full text-sm"><thead><tr>' +
        '<th class="' + CLS_TH + '">קוד</th>' +
        '<th class="' + CLS_TH + '">קבוצה</th>' +
        '<th class="' + CLS_TH + '">יעד</th>' +
        '<th class="' + CLS_TH_NUM + '">קליקים</th>' +
        '<th class="' + CLS_TH + '">קליק אחרון</th>' +
      '</tr></thead><tbody>' + tbody + '</tbody></table>';

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
