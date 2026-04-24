/* =============================================================================
   crm-events-tab.js — Events tab (B8 Tailwind rewrite — FINAL-03 list)
   View: v_crm_event_stats. List with status filter.
   ============================================================================= */
(function () {
  'use strict';

  var _loadPromise = null;
  var _allEvents = [];

  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH    = 'px-4 py-3 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD    = 'px-4 py-3 text-slate-800';
  var CLS_ROW   = 'hover:bg-indigo-50/40 cursor-pointer border-b border-slate-100 transition-colors';

  async function loadEvents() {
    var tid = getTenantId();
    var q = sb.from('v_crm_event_stats')
      .select('event_id, event_number, name, event_date, status, max_capacity, total_registered, total_confirmed, total_attended, total_purchased, total_revenue, spots_remaining, purchase_rate_pct');
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('event_number', { ascending: false });
    var res = await q;
    if (res.error) throw new Error('Events load failed: ' + res.error.message);
    return res.data || [];
  }

  async function loadCrmEventsTab() {
    var wrap = document.getElementById('crm-events-table-wrap');
    if (!wrap) return;
    if (!_loadPromise) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">טוען אירועים...</div>';
      _loadPromise = (async function () {
        await ensureCrmStatusCache();
        _allEvents = await loadEvents();
        populateFilter();
        wireEvents();
      })().catch(function (e) {
        _loadPromise = null;
        wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
        throw e;
      });
    }
    await _loadPromise;
    renderFilteredEvents();
  }
  window.loadCrmEventsTab = loadCrmEventsTab;

  // Invalidate cache and re-render. Called after a mutation that changes the
  // board's source-of-truth (status change, create, etc.) so the user sees
  // the updated row without needing a page refresh.
  window.reloadCrmEventsTab = async function () {
    _loadPromise = null;
    _allEvents = await loadEvents();
    renderFilteredEvents();
  };

  function populateFilter() {
    var sel = document.getElementById('crm-events-filter-status');
    if (!sel || sel.options.length > 1) return;
    var presentSlugs = CrmHelpers.distinctValues(_allEvents, 'status');
    var eventStatuses = (window.CRM_STATUSES && window.CRM_STATUSES.event) || {};
    presentSlugs.forEach(function (slug) {
      var opt = document.createElement('option');
      opt.value = slug;
      opt.textContent = (eventStatuses[slug] && eventStatuses[slug].name_he) || slug;
      sel.appendChild(opt);
    });
  }

  var _wired = false;
  function wireEvents() {
    if (_wired) return;
    _wired = true;
    var sel = document.getElementById('crm-events-filter-status');
    if (sel) sel.addEventListener('change', renderFilteredEvents);
    var createBtn = document.getElementById('crm-events-create-btn');
    if (createBtn && window.CrmEventActions) {
      createBtn.addEventListener('click', function () {
        CrmEventActions.openCreateEventModal(async function () {
          _loadPromise = null;
          _allEvents = await loadEvents();
          renderFilteredEvents();
        });
      });
    }
  }

  function renderFilteredEvents() {
    var wrap = document.getElementById('crm-events-table-wrap');
    if (!wrap) return;
    var filter = (document.getElementById('crm-events-filter-status') || {}).value || '';
    var rows = filter ? _allEvents.filter(function (r) { return r.status === filter; }) : _allEvents;

    if (!rows.length) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-10 bg-white rounded-lg border border-slate-200">אין אירועים להצגה</div>';
      return;
    }

    var html = '<div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">' +
      '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + ' w-12">#</th>' +
      '<th class="' + CLS_TH + '">שם אירוע</th>' +
      '<th class="' + CLS_TH + '">תאריך</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">נרשמו</th>' +
      '<th class="' + CLS_TH + '">הגיעו</th>' +
      '<th class="' + CLS_TH + '">רכשו</th>' +
      '<th class="' + CLS_TH + '" data-admin-only>הכנסות</th>' +
      '<th class="' + CLS_TH + '">% רכישה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr class="' + CLS_ROW + '" data-event-id="' + escapeHtml(r.event_id) + '">' +
        '<td class="' + CLS_TD + ' font-bold text-indigo-600">#' + escapeHtml(r.event_number == null ? '' : r.event_number) + '</td>' +
        '<td class="' + CLS_TD + ' font-medium text-slate-900">' + escapeHtml(r.name || '') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(CrmHelpers.formatDate(r.event_date)) + '</td>' +
        '<td class="' + CLS_TD + '">' + CrmHelpers.statusBadgeHtml('event', r.status) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-700 font-semibold">' + escapeHtml(formatCount(r.total_registered)) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-700 font-semibold">' + escapeHtml(formatCount(r.total_attended)) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-700 font-semibold">' + escapeHtml(formatCount(r.total_purchased)) + '</td>' +
        '<td class="' + CLS_TD + ' text-emerald-700 font-bold" data-admin-only>' + escapeHtml(r.total_revenue ? CrmHelpers.formatCurrency(r.total_revenue) : '—') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(r.purchase_rate_pct != null ? r.purchase_rate_pct + '%' : '—') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('tr[data-event-id]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.getAttribute('data-event-id');
        if (typeof openCrmEventDetail === 'function') openCrmEventDetail(id);
      });
    });
  }

  function formatCount(n) {
    if (n == null) return '—';
    if (n === 0) return '—';
    return String(n);
  }

  window.getCrmEventStatsById = function (id) {
    return _allEvents.find(function (r) { return r.event_id === id; }) || null;
  };
})();
