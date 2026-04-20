/* =============================================================================
   crm-events-tab.js — Events tab (list + status filter)
   View: v_crm_event_stats (11 rows)
   Depends on: shared.js, CrmHelpers, crm-events-detail.js
   ============================================================================= */
(function () {
  'use strict';

  var _loadPromise = null;
  var _allEvents = [];

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
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">טוען אירועים...</div>';
      _loadPromise = (async function () {
        await ensureCrmStatusCache();
        _allEvents = await loadEvents();
        populateFilter();
        wireEvents();
      })().catch(function (e) {
        _loadPromise = null;
        wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px;color:#ef4444">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
        throw e;
      });
    }
    await _loadPromise;
    renderFilteredEvents();
  }
  window.loadCrmEventsTab = loadCrmEventsTab;

  function populateFilter() {
    var sel = document.getElementById('crm-events-filter-status');
    if (!sel || sel.options.length > 1) return;
    // Build from statuses present in the data (not all event statuses have data)
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
  }

  function renderFilteredEvents() {
    var wrap = document.getElementById('crm-events-table-wrap');
    if (!wrap) return;
    var filter = (document.getElementById('crm-events-filter-status') || {}).value || '';
    var rows = filter ? _allEvents.filter(function (r) { return r.status === filter; }) : _allEvents;

    if (!rows.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין אירועים להצגה</div>';
      return;
    }

    var html = '<table class="crm-table"><thead><tr>' +
      '<th>#</th><th>שם אירוע</th><th>תאריך</th><th>סטטוס</th>' +
      '<th>נרשמו</th><th>הגיעו</th><th>רכשו</th><th>הכנסות</th><th>% רכישה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr data-event-id="' + escapeHtml(r.event_id) + '">' +
        '<td>' + escapeHtml(r.event_number == null ? '' : r.event_number) + '</td>' +
        '<td>' + escapeHtml(r.name || '') + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatDate(r.event_date)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('event', r.status) + '</td>' +
        '<td>' + escapeHtml(formatCount(r.total_registered)) + '</td>' +
        '<td>' + escapeHtml(formatCount(r.total_attended)) + '</td>' +
        '<td>' + escapeHtml(formatCount(r.total_purchased)) + '</td>' +
        '<td>' + escapeHtml(r.total_revenue ? CrmHelpers.formatCurrency(r.total_revenue) : '—') + '</td>' +
        '<td>' + escapeHtml(r.purchase_rate_pct != null ? r.purchase_rate_pct + '%' : '—') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
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

  // Expose cached rows for the detail modal
  window.getCrmEventStatsById = function (id) {
    return _allEvents.find(function (r) { return r.event_id === id; }) || null;
  };
})();
