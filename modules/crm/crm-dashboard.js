/* =============================================================================
   crm-dashboard.js — Dashboard tab (stat cards, event performance, status bars)
   Data: v_crm_event_stats + crm_leads counts (grouped) + v_crm_lead_event_history
   Fresh fetch on every tab activation (SPEC §9.2).
   ============================================================================= */
(function () {
  'use strict';

  async function loadCrmDashboard() {
    var statsEl = document.getElementById('crm-dashboard-stats');
    var eventsEl = document.getElementById('crm-dashboard-events');
    var statusEl = document.getElementById('crm-dashboard-status');
    if (!statsEl || !eventsEl || !statusEl) return;

    statsEl.innerHTML = loadingCard();
    eventsEl.innerHTML = '<div class="crm-detail-empty" style="padding:20px">טוען...</div>';
    statusEl.innerHTML = '<div class="crm-detail-empty">טוען...</div>';

    try {
      await ensureCrmStatusCache();
      var data = await fetchDashboardData();
      renderStatCards(statsEl, data);
      renderEventPerformance(eventsEl, data.eventStats);
      renderStatusDistribution(statusEl, data.leadStatusCounts);
    } catch (e) {
      console.error('dashboard load failed:', e);
      statsEl.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">שגיאה: ' + escapeHtml(e.message || String(e)) + '</div>';
      eventsEl.innerHTML = '';
      statusEl.innerHTML = '';
    }
  }
  window.loadCrmDashboard = loadCrmDashboard;

  function loadingCard() {
    return '<div class="crm-detail-empty" style="grid-column:1/-1">טוען נתוני דשבורד...</div>';
  }

  // ---- Fetch ----
  async function fetchDashboardData() {
    var tid = getTenantId();

    // v_crm_event_stats (11 rows)
    var evQ = sb.from('v_crm_event_stats')
      .select('event_id, event_number, name, event_date, status, total_registered, total_confirmed, total_attended, total_purchased, total_revenue, purchase_rate_pct');
    if (tid) evQ = evQ.eq('tenant_id', tid);
    evQ = evQ.order('event_number', { ascending: false });

    // Total leads count + returning customers count (from v_crm_lead_event_history)
    var leadsCountQ = sb.from('crm_leads').select('id', { count: 'exact', head: true }).eq('is_deleted', false);
    if (tid) leadsCountQ = leadsCountQ.eq('tenant_id', tid);

    var returningQ = sb.from('v_crm_lead_event_history').select('lead_id', { count: 'exact', head: true }).eq('is_returning_customer', true);
    if (tid) returningQ = returningQ.eq('tenant_id', tid);

    // Status distribution (group by status)
    var statusDistQ = sb.from('crm_leads').select('status').eq('is_deleted', false);
    if (tid) statusDistQ = statusDistQ.eq('tenant_id', tid);

    var results = await Promise.all([evQ, leadsCountQ, returningQ, statusDistQ]);
    if (results[0].error) throw new Error('event_stats: ' + results[0].error.message);
    if (results[1].error) throw new Error('leads_count: ' + results[1].error.message);
    if (results[2].error) throw new Error('returning: ' + results[2].error.message);
    if (results[3].error) throw new Error('status_dist: ' + results[3].error.message);

    var eventStats = results[0].data || [];
    var totalLeads = results[1].count || 0;
    var returningLeads = results[2].count || 0;

    var leadStatusCounts = {};
    (results[3].data || []).forEach(function (r) {
      var k = r.status || 'unknown';
      leadStatusCounts[k] = (leadStatusCounts[k] || 0) + 1;
    });

    // Last-event revenue = revenue from the most recent completed event
    var completedByDate = eventStats
      .filter(function (e) { return (e.total_revenue || 0) > 0; })
      .sort(function (a, b) { return String(b.event_date || '').localeCompare(String(a.event_date || '')); });
    var lastRevenue = completedByDate.length ? (completedByDate[0].total_revenue || 0) : 0;

    return {
      eventStats: eventStats,
      totalEvents: eventStats.length,
      totalLeads: totalLeads,
      returningLeads: returningLeads,
      lastRevenue: lastRevenue,
      leadStatusCounts: leadStatusCounts
    };
  }

  // ---- Render: stat cards ----
  function renderStatCards(el, data) {
    el.innerHTML =
      statCard(data.totalLeads, 'לידים סה"כ', '') +
      statCard(data.totalEvents, 'אירועים סה"כ', 'accent-info') +
      statCard(CrmHelpers.formatCurrency(data.lastRevenue), 'הכנסות אירוע אחרון', 'accent-success') +
      statCard(data.returningLeads, 'לידים חוזרים', 'accent-warn');
  }

  function statCard(value, label, accentClass) {
    return '<div class="crm-stat-card ' + (accentClass || '') + '">' +
      '<div class="crm-stat-value">' + escapeHtml(String(value == null ? 0 : value)) + '</div>' +
      '<div class="crm-stat-label">' + escapeHtml(label) + '</div>' +
      '</div>';
  }

  // ---- Render: event performance table ----
  function renderEventPerformance(el, rows) {
    if (!rows.length) {
      el.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין נתוני אירועים</div>';
      return;
    }
    var h = '<table class="crm-table"><thead><tr>' +
      '<th>#</th><th>שם</th><th>תאריך</th><th>סטטוס</th>' +
      '<th>נרשמו</th><th>הגיעו</th><th>רכשו</th><th>הכנסות</th><th>% רכישה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr class="readonly">' +
        '<td>' + escapeHtml(r.event_number == null ? '' : r.event_number) + '</td>' +
        '<td>' + escapeHtml(r.name || '') + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatDate(r.event_date)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('event', r.status) + '</td>' +
        '<td>' + escapeHtml(cellNum(r.total_registered)) + '</td>' +
        '<td>' + escapeHtml(cellNum(r.total_attended)) + '</td>' +
        '<td>' + escapeHtml(cellNum(r.total_purchased)) + '</td>' +
        '<td>' + escapeHtml(r.total_revenue ? CrmHelpers.formatCurrency(r.total_revenue) : '—') + '</td>' +
        '<td>' + escapeHtml(r.purchase_rate_pct != null ? r.purchase_rate_pct + '%' : '—') + '</td>' +
        '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function cellNum(n) {
    if (n == null || n === 0) return '—';
    return String(n);
  }

  // ---- Render: lead status distribution (CSS bars) ----
  function renderStatusDistribution(el, counts) {
    var entries = Object.keys(counts).map(function (slug) { return { slug: slug, count: counts[slug] }; });
    if (!entries.length) {
      el.innerHTML = '<div class="crm-detail-empty">אין לידים</div>';
      return;
    }
    var total = entries.reduce(function (sum, e) { return sum + e.count; }, 0);
    entries.sort(function (a, b) { return b.count - a.count; });

    var h = '';
    entries.forEach(function (e) {
      var info = CrmHelpers.getStatusInfo('lead', e.slug);
      var pct = total ? Math.round((e.count / total) * 1000) / 10 : 0;
      h += '<div class="crm-bar-row">' +
        '<div class="crm-bar-label">' + escapeHtml(info.label) + '</div>' +
        '<div class="crm-bar-track">' +
        '<div class="crm-bar-fill" style="width:' + pct + '%;background:' + escapeHtml(info.color) + '"></div>' +
        '</div>' +
        '<div class="crm-bar-count">' + e.count + '</div>' +
        '</div>';
    });
    el.innerHTML = h;
  }
})();
