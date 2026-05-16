// unified-log.js — UI for the v_inventory_unified_log view (sidebar entry "לוג מערכת מאוחד").
// Sealed by M1_INVENTORY_REDESIGN SPEC §2.4, 2026-05-16.
//
// 5 filters + free-text search:
//   1. category (frames / lenses / cross / all)
//   2. action type (distinct values populated client-side on first load)
//   3. user (distinct values populated client-side on first load)
//   4. date from / 5. date to
//   6. free-text (client-side filter on the loaded page — entity_label match)
//
// Defense-in-depth: every SELECT carries .eq('tenant_id', getTenantId())
// even though the view's security_invoker=on already enforces RLS (Iron Rule 22).

(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var ulState = {
    page: 0,
    totalLoaded: 0,
    distinctActions: null,
    distinctUsers: null
  };

  function $(id) { return document.getElementById(id); }

  function _fmtDate(s) {
    if (!s) return '';
    try {
      var d = new Date(s);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('he-IL', {
        year: '2-digit', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return ''; }
  }

  function _categoryLabel(c) {
    if (c === 'frames') return '👓 מסגרות';
    if (c === 'lenses') return '🔬 עדשות';
    if (c === 'cross')  return '🔄 חוצה';
    return c || '';
  }

  function _sourceLabel(s) {
    if (s === 'inventory_logs')  return 'מלאי מסגרות';
    if (s === 'stock_movement')  return 'תנועות עדשות';
    if (s === 'activity_log')    return 'פעולות מערכת';
    if (s === 'sync_log')        return 'סנכרון';
    return s || '';
  }

  function _fmtQty(d) {
    if (d == null || d === 0) return '';
    if (d > 0) return '<span style="color:#047857">+' + d + '</span>';
    return '<span style="color:#b91c1c">' + d + '</span>';
  }

  function _fmtAmount(a) {
    if (a == null) return '';
    var n = Number(a);
    if (isNaN(n)) return '';
    return '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 });
  }

  // ===== Distinct-values dropdowns (one-time fetch per session) =====
  async function _populateDistincts() {
    if (ulState.distinctActions && ulState.distinctUsers) return; // already loaded
    var tid = getTenantId();
    try {
      // Note: server-side DISTINCT via .select() doesn't exist in Supabase JS;
      // pull a large sample and de-dupe client-side. Tenant-scoped so it stays
      // tight (Demo=583 / Prizma=5257 rows at SPEC seal time).
      var { data, error } = await sb.from('v_inventory_unified_log')
        .select('action_type, user_display')
        .eq('tenant_id', tid)
        .limit(5000);
      if (error) throw error;
      var aSet = new Set();
      var uSet = new Set();
      (data || []).forEach(function (r) {
        if (r.action_type)  aSet.add(r.action_type);
        if (r.user_display) uSet.add(r.user_display);
      });
      ulState.distinctActions = Array.from(aSet).sort();
      ulState.distinctUsers   = Array.from(uSet).sort();
      _renderDistinctOptions();
    } catch (e) {
      console.warn('[unified-log] distinct fetch failed:', e && e.message);
      ulState.distinctActions = [];
      ulState.distinctUsers   = [];
    }
  }

  function _renderDistinctOptions() {
    var aSel = $('ul-action');
    var uSel = $('ul-user');
    if (aSel) {
      aSel.innerHTML = '<option value="">פעולה — הכל</option>' +
        ulState.distinctActions.map(function (a) {
          return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>';
        }).join('');
    }
    if (uSel) {
      uSel.innerHTML = '<option value="">משתמש — הכל</option>' +
        ulState.distinctUsers.map(function (u) {
          return '<option value="' + escapeHtml(u) + '">' + escapeHtml(u) + '</option>';
        }).join('');
    }
  }

  // ===== Main loader =====
  async function loadUnifiedLog() {
    var tbody = document.querySelector('#ul-table tbody');
    if (!tbody) return;

    // Populate distinct dropdowns once
    await _populateDistincts();

    var tid = getTenantId();
    var cat = $('ul-cat')    ? $('ul-cat').value    : '';
    var act = $('ul-action') ? $('ul-action').value : '';
    var usr = $('ul-user')   ? $('ul-user').value   : '';
    var from = $('ul-from')  ? $('ul-from').value   : '';
    var to   = $('ul-to')    ? $('ul-to').value     : '';
    var q    = $('ul-q')     ? $('ul-q').value.trim() : '';

    var query = sb.from('v_inventory_unified_log')
      .select('created_at, source_table, source_id, category, action_type, user_display, entity_label, qty_delta, amount')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false });

    if (cat) query = query.eq('category', cat);
    if (act) query = query.eq('action_type', act);
    if (usr) query = query.eq('user_display', usr);
    if (from) query = query.gte('created_at', from + 'T00:00:00');
    if (to)   query = query.lte('created_at', to   + 'T23:59:59');

    var offset = ulState.page * PAGE_SIZE;
    query = query.range(offset, offset + PAGE_SIZE - 1);

    try {
      var { data, error } = await query;
      if (error) throw error;
      var rows = data || [];

      // Client-side free-text filter on entity_label (defer server-side ILIKE/trigram per SPEC §6 #16).
      if (q) {
        var qLower = q.toLowerCase();
        rows = rows.filter(function (r) {
          return (r.entity_label || '').toLowerCase().indexOf(qLower) >= 0;
        });
      }

      ulState.totalLoaded = rows.length;
      tbody.innerHTML = rows.map(function (r) {
        return '<tr>' +
          '<td>' + escapeHtml(_fmtDate(r.created_at)) + '</td>' +
          '<td>' + escapeHtml(_sourceLabel(r.source_table)) + '</td>' +
          '<td>' + escapeHtml(_categoryLabel(r.category)) + '</td>' +
          '<td>' + escapeHtml(r.action_type || '') + '</td>' +
          '<td>' + escapeHtml(r.user_display || '') + '</td>' +
          '<td>' + escapeHtml(r.entity_label || '') + '</td>' +
          '<td>' + _fmtQty(r.qty_delta) + '</td>' +
          '<td>' + _fmtAmount(r.amount) + '</td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px">אין רשומות תואמות</td></tr>';

      var lbl = $('ul-page-label');
      if (lbl) lbl.textContent = (ulState.page + 1) + ' (' + rows.length + ' רשומות)';
      var prev = $('ul-prev');
      var next = $('ul-next');
      if (prev) prev.disabled = ulState.page === 0;
      if (next) next.disabled = rows.length < PAGE_SIZE && !q; // q filter may legitimately yield short pages
    } catch (e) {
      console.error('[unified-log] load failed:', e);
      tbody.innerHTML = '<tr><td colspan="8" style="color:#b91c1c;padding:16px">שגיאת טעינה: ' + escapeHtml(e.message || String(e)) + '</td></tr>';
    }
  }

  function ulPage(delta) {
    ulState.page = Math.max(0, ulState.page + delta);
    loadUnifiedLog();
  }

  // Hook filter controls when DOM is ready
  function _bindFilterChanges() {
    ['ul-cat', 'ul-action', 'ul-user', 'ul-from', 'ul-to'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', function () { ulState.page = 0; loadUnifiedLog(); });
    });
    var qEl = $('ul-q');
    if (qEl) {
      qEl.addEventListener('input', function () { ulState.page = 0; loadUnifiedLog(); });
    }
  }

  function _init() {
    if (!$('tab-unified-log')) return; // section not present yet (e.g. wrong page)
    _bindFilterChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  // Expose for inventory-shell.js to invoke + onclick handlers
  window.loadUnifiedLog = loadUnifiedLog;
  window.ulPage = ulPage;
})();
