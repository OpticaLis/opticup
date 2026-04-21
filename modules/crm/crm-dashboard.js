/* =============================================================================
   crm-dashboard.js — Dashboard tab (B7 visual rewrite: FINAL-01)
   6 sections: KPI cards+sparklines, alert strip, stacked bar chart (events),
               conversion gauges (conic-gradient), activity-feed, events timeline.
   Data: v_crm_event_stats + crm_leads counts + v_crm_lead_event_history.
   ============================================================================= */
(function () {
  'use strict';

  async function loadCrmDashboard() {
    var statsEl    = document.getElementById('crm-dashboard-stats');
    var alertsEl   = document.getElementById('crm-dashboard-alerts');
    var eventsEl   = document.getElementById('crm-dashboard-events');
    var gaugesEl   = document.getElementById('crm-dashboard-status');
    var activityEl = document.getElementById('crm-dashboard-activity');
    var timelineEl = document.getElementById('crm-dashboard-timeline');
    if (!statsEl || !eventsEl) return;

    statsEl.innerHTML = loadingCard();
    if (alertsEl)   alertsEl.innerHTML = '';
    eventsEl.innerHTML   = '<div class="crm-detail-empty" style="padding:20px">טוען...</div>';
    if (gaugesEl)   gaugesEl.innerHTML = '<div class="crm-detail-empty">טוען...</div>';
    if (activityEl) activityEl.innerHTML = '';
    if (timelineEl) timelineEl.innerHTML = '';

    try {
      await ensureCrmStatusCache();
      var data = await fetchDashboardData();
      renderStatCards(statsEl, data);
      renderAlertStrip(alertsEl, data);
      renderEventPerformance(eventsEl, data.eventStats);
      renderConversionGauges(gaugesEl, data.eventStats);
      renderActivityFeed(activityEl, data);
      renderEventsTimeline(timelineEl, data.eventStats);
    } catch (e) {
      console.error('dashboard load failed:', e);
      statsEl.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">שגיאה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.loadCrmDashboard = loadCrmDashboard;

  function loadingCard() {
    return '<div class="crm-detail-empty" style="grid-column:1/-1">טוען נתוני דשבורד...</div>';
  }

  // ---- Fetch ----
  async function fetchDashboardData() {
    var tid = getTenantId();
    var evQ = sb.from('v_crm_event_stats')
      .select('event_id, event_number, name, event_date, status, total_registered, total_confirmed, total_attended, total_purchased, total_revenue, purchase_rate_pct');
    if (tid) evQ = evQ.eq('tenant_id', tid);
    evQ = evQ.order('event_number', { ascending: false });

    var leadsCountQ = sb.from('crm_leads').select('id', { count: 'exact', head: true }).eq('is_deleted', false);
    if (tid) leadsCountQ = leadsCountQ.eq('tenant_id', tid);

    var returningQ = sb.from('v_crm_lead_event_history').select('lead_id', { count: 'exact', head: true }).eq('is_returning_customer', true);
    if (tid) returningQ = returningQ.eq('tenant_id', tid);

    var statusDistQ = sb.from('crm_leads').select('status').eq('is_deleted', false);
    if (tid) statusDistQ = statusDistQ.eq('tenant_id', tid);

    var r = await Promise.all([evQ, leadsCountQ, returningQ, statusDistQ]);
    if (r[0].error) throw new Error('event_stats: ' + r[0].error.message);
    if (r[1].error) throw new Error('leads_count: ' + r[1].error.message);
    if (r[2].error) throw new Error('returning: ' + r[2].error.message);
    if (r[3].error) throw new Error('status_dist: ' + r[3].error.message);

    var eventStats = r[0].data || [];
    var statusCounts = {};
    (r[3].data || []).forEach(function (x) { statusCounts[x.status || 'unknown'] = (statusCounts[x.status || 'unknown'] || 0) + 1; });
    var completedByDate = eventStats.filter(function (e) { return (e.total_revenue || 0) > 0; })
      .sort(function (a, b) { return String(b.event_date || '').localeCompare(String(a.event_date || '')); });
    return {
      eventStats: eventStats,
      totalEvents: eventStats.length,
      totalLeads: r[1].count || 0,
      returningLeads: r[2].count || 0,
      lastRevenue: completedByDate.length ? (completedByDate[0].total_revenue || 0) : 0,
      leadStatusCounts: statusCounts
    };
  }

  // ---- A. KPI cards with sparklines ----
  function renderStatCards(el, data) {
    var spark = trailingSparkValues(data.eventStats, 5, 'total_registered');
    var sparkRev  = trailingSparkValues(data.eventStats, 5, 'total_revenue');
    var sparkRet  = trailingSparkValues(data.eventStats, 5, 'total_attended');
    el.innerHTML =
      statCard(data.totalLeads, 'לידים סה"כ', '', sparkValues(spark), 'var(--crm-accent)') +
      statCard(data.totalEvents, 'אירועים סה"כ', 'accent-info', sparkValues(spark), 'var(--crm-info)') +
      statCard(CrmHelpers.formatCurrency(data.lastRevenue), 'הכנסות אירוע אחרון', 'accent-success', sparkValues(sparkRev), 'var(--crm-success)') +
      statCard(data.returningLeads, 'לידים חוזרים', 'accent-warn', sparkValues(sparkRet), 'var(--crm-warning)');
  }

  function statCard(value, label, accentClass, spark, color) {
    return '<div class="crm-kpi-card ' + (accentClass || '') + '">' +
      '<div class="crm-kpi-label">' + escapeHtml(label) + '</div>' +
      '<div class="crm-kpi-value">' + escapeHtml(String(value == null ? 0 : value)) + '</div>' +
      sparklineHtml(spark, color) +
      '</div>';
  }

  function sparklineHtml(values, color) {
    var bars = '';
    values.forEach(function (v) {
      bars += '<div class="crm-spark-bar" style="height:' + Math.max(8, v) + '%;background:' + escapeHtml(color) + '"></div>';
    });
    return '<div class="crm-sparkline">' + bars + '</div>';
  }

  function sparkValues(arr) {
    if (!arr.length) return [20, 30, 25, 40, 35];
    var max = Math.max.apply(null, arr) || 1;
    return arr.map(function (n) { return Math.round((n / max) * 100); });
  }

  function trailingSparkValues(eventStats, n, key) {
    var rows = (eventStats || []).slice().sort(function (a, b) {
      return String(a.event_date || '').localeCompare(String(b.event_date || ''));
    }).slice(-n);
    return rows.map(function (r) { return Number(r[key] || 0); });
  }

  // ---- B. Alert strip ----
  function renderAlertStrip(el, data) {
    if (!el) return;
    var alerts = [];
    var newCount = data.leadStatusCounts['new'] || 0;
    if (newCount > 0) alerts.push({ type: 'info', icon: '💡', title: newCount + ' לידים חדשים', desc: 'ממתינים למענה ראשון' });
    var upcoming = (data.eventStats || []).filter(function (e) { return e.status === 'registration_open'; });
    if (upcoming.length) alerts.push({ type: 'warn', icon: '📅', title: 'אירוע קרוב: #' + (upcoming[0].event_number || '?'), desc: (upcoming[0].name || '') + ' — ' + CrmHelpers.formatDate(upcoming[0].event_date) });
    if (!alerts.length) alerts.push({ type: 'info', icon: '✅', title: 'הכול שקט', desc: 'אין התראות פעילות' });

    el.innerHTML = alerts.map(function (a) {
      return '<div class="crm-alert-box ' + a.type + '"><span>' + a.icon + '</span>' +
        '<div><strong>' + escapeHtml(a.title) + '</strong><div>' + escapeHtml(a.desc) + '</div></div></div>';
    }).join('');
  }

  // ---- C. Events stacked bar chart — CSS bars only, criterion §2.3 ----
  function renderEventPerformance(el, rows) {
    if (!rows || !rows.length) {
      el.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין נתוני אירועים</div>';
      return;
    }
    var top = rows.slice(0, 8);
    var max = Math.max.apply(null, top.map(function (r) { return Number(r.total_registered || 0); })) || 1;
    var h = '';
    top.forEach(function (r) {
      var reg  = Number(r.total_registered || 0);
      var conf = Number(r.total_confirmed || 0);
      var att  = Number(r.total_attended || 0);
      var prc  = Number(r.total_purchased || 0);
      var regPct  = Math.round((reg  / max) * 100);
      var confPct = Math.round((conf / max) * 100);
      var attPct  = Math.round((att  / max) * 100);
      var prcPct  = Math.round((prc  / max) * 100);
      var label = '#' + (r.event_number || '?') + ' ' + (r.name || '').slice(0, 18);
      h += '<div class="crm-stacked-bar">' +
        '<div class="crm-stacked-bar-label">' + escapeHtml(label) + '</div>' +
        '<div class="crm-stacked-bar-track">' +
          segHtml('registered', prcPct, prc) +
          segHtml('attended',   Math.max(0, attPct - prcPct), att - prc) +
          segHtml('confirmed',  Math.max(0, confPct - attPct), conf - att) +
          segHtml('registered', Math.max(0, regPct - confPct), reg - conf) +
        '</div></div>';
    });
    el.innerHTML = h;
  }

  function segHtml(cls, pct, num) {
    if (pct <= 0) return '';
    return '<div class="crm-bar-segment ' + cls + '" style="width:' + pct + '%">' + (pct > 6 ? num : '') + '</div>';
  }

  // ---- D. Conversion gauges (conic-gradient) ----
  function renderConversionGauges(el, rows) {
    if (!el) return;
    var tot = (rows || []).reduce(function (acc, r) {
      acc.reg  += Number(r.total_registered || 0);
      acc.conf += Number(r.total_confirmed || 0);
      acc.att  += Number(r.total_attended || 0);
      acc.prc  += Number(r.total_purchased || 0);
      return acc;
    }, { reg: 0, conf: 0, att: 0, prc: 0 });
    var regConf = tot.reg  ? Math.round((tot.conf / tot.reg)  * 100) : 0;
    var confAtt = tot.conf ? Math.round((tot.att  / tot.conf) * 100) : 0;
    var attPrc  = tot.att  ? Math.round((tot.prc  / tot.att)  * 100) : 0;
    el.innerHTML = '<div class="crm-gauge-grid">' +
      gaugeHtml(regConf, 'נרשם → אישר') +
      gaugeHtml(confAtt, 'אישר → הגיע') +
      gaugeHtml(attPrc,  'הגיע → רכש') +
      '</div>';
  }

  function gaugeHtml(pct, label) {
    var p = Math.max(0, Math.min(100, pct)) + '%';
    return '<div class="crm-gauge">' +
      '<div class="crm-gauge-circle" style="--gauge-pct:' + p + '">' +
        '<div class="crm-gauge-value">' + pct + '%</div>' +
      '</div>' +
      '<div class="crm-gauge-label">' + escapeHtml(label) + '</div>' +
      '</div>';
  }

  // ---- E. Activity feed (with pulse-dot animation and timestamps) ----
  function renderActivityFeed(el, data) {
    if (!el) return;
    var items = buildActivityItems(data);
    if (!items.length) { el.innerHTML = '<div class="crm-detail-empty">אין פעילות אחרונה</div>'; return; }
    el.innerHTML = items.map(function (it) {
      return '<div class="crm-activity-item">' +
        '<span class="crm-pulse-dot"></span>' +
        '<span>' + escapeHtml(it.text) + '</span>' +
        '<span class="crm-activity-time">' + escapeHtml(it.time) + '</span>' +
        '</div>';
    }).join('');
  }

  function buildActivityItems(data) {
    var items = [];
    var recent = (data.eventStats || []).slice(0, 3);
    recent.forEach(function (r) {
      items.push({
        text: 'אירוע #' + (r.event_number || '?') + ' — ' + (r.total_attended || 0) + ' השתתפו',
        time: CrmHelpers.formatDate(r.event_date) || ''
      });
    });
    var newCount = data.leadStatusCounts['new'] || 0;
    if (newCount) items.push({ text: 'לידים חדשים ממתינים: ' + newCount, time: 'עכשיו' });
    if (data.returningLeads) items.push({ text: 'לקוחות חוזרים: ' + data.returningLeads, time: 'סיכום' });
    return items.slice(0, 5);
  }

  // ---- F. Events timeline (horizontal scrollable cards with progress bars) ----
  function renderEventsTimeline(el, rows) {
    if (!el) return;
    var recent = (rows || []).slice(0, 6);
    if (!recent.length) { el.innerHTML = '<div class="crm-detail-empty">אין ציר זמן להציג</div>'; return; }
    el.innerHTML = recent.map(function (r) {
      var reg = Number(r.total_registered || 0);
      var att = Number(r.total_attended || 0);
      var pct = reg ? Math.round((att / reg) * 100) : 0;
      return '<div class="crm-timeline-card">' +
        '<div class="crm-timeline-card-title">#' + escapeHtml(String(r.event_number || '?')) + ' ' + escapeHtml((r.name || '').slice(0, 22)) + '</div>' +
        '<div class="crm-timeline-card-date">' + escapeHtml(CrmHelpers.formatDate(r.event_date)) + '</div>' +
        '<div class="crm-timeline-card-progress"><div class="crm-timeline-card-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div style="font-size:0.78rem;color:var(--crm-text-muted)">' + att + '/' + reg + ' (' + pct + '%)</div>' +
        '</div>';
    }).join('');
  }
})();
