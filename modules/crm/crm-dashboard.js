/* =============================================================================
   crm-dashboard.js — Dashboard tab (B8 Tailwind rewrite — FINAL-01)
   6 sections: KPI cards+sparklines, alert strip, stacked bar chart,
               conversion gauges, activity feed, events timeline.
   ============================================================================= */
(function () {
  'use strict';

  // Reusable Tailwind class patterns (Rule 12 — keep render lines short)
  var CLS_CARD         = 'bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4';
  var CLS_CARD_TITLE   = 'text-lg font-bold text-slate-800 mb-4 flex items-center justify-between';
  var CLS_KPI_GRID     = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4';
  var CLS_KPI_CARD     = 'relative overflow-hidden bg-gradient-to-br rounded-xl shadow-sm border p-5';
  var CLS_KPI_LABEL    = 'text-xs font-semibold uppercase tracking-wide opacity-80';
  var CLS_KPI_VALUE    = 'text-4xl font-black tracking-tight tabular-nums mt-1';
  var CLS_ALERT_GRID   = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4';
  var CLS_ALERT_BOX    = 'flex items-start gap-3 rounded-xl border p-4';
  var CLS_BAR_LABEL    = 'text-xs font-semibold text-slate-600 w-28 shrink-0 text-end';
  var CLS_BAR_TRACK    = 'flex-1 flex h-8 rounded-lg overflow-hidden bg-slate-100';
  var CLS_GAUGE_GRID   = 'grid grid-cols-1 sm:grid-cols-3 gap-4';
  var CLS_GAUGE_WRAP   = 'flex flex-col items-center gap-2';
  var CLS_ACTIVITY_ROW = 'flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0';
  var CLS_TIMELINE_CARD= 'shrink-0 w-48 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4 flex flex-col gap-2';

  // Per-KPI gradient variants (match mockup's 4 accent colors)
  var KPI_VARIANTS = {
    indigo:  { card: 'from-indigo-50 to-white border-indigo-100 text-indigo-900',   icon: 'text-indigo-500',  bar: 'from-indigo-500 to-indigo-600',  foot: 'text-indigo-600' },
    cyan:    { card: 'from-cyan-50 to-white border-cyan-100 text-cyan-900',         icon: 'text-cyan-500',    bar: 'from-cyan-500 to-cyan-600',      foot: 'text-cyan-600' },
    emerald: { card: 'from-emerald-50 to-white border-emerald-100 text-emerald-900',icon: 'text-emerald-500', bar: 'from-emerald-500 to-emerald-600',foot: 'text-emerald-600' },
    amber:   { card: 'from-amber-50 to-white border-amber-100 text-amber-900',      icon: 'text-amber-500',   bar: 'from-amber-500 to-amber-600',    foot: 'text-amber-600' }
  };

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
    eventsEl.innerHTML   = '<div class="text-center text-slate-400 py-8">טוען...</div>';
    if (gaugesEl)   gaugesEl.innerHTML = '<div class="text-center text-slate-400 py-8">טוען...</div>';
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
      statsEl.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.loadCrmDashboard = loadCrmDashboard;

  function loadingCard() {
    return '<div class="col-span-full text-center text-slate-400 py-8">טוען נתוני דשבורד...</div>';
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

  // ---- A. KPI cards with sparklines (gradient bars per-card) ----
  function renderStatCards(el, data) {
    var sparkReg = sparkValues(trailingSparkValues(data.eventStats, 5, 'total_registered'));
    var sparkEv  = sparkValues(trailingSparkValues(data.eventStats, 5, 'total_registered'));
    var sparkRev = sparkValues(trailingSparkValues(data.eventStats, 5, 'total_revenue'));
    var sparkRet = sparkValues(trailingSparkValues(data.eventStats, 5, 'total_attended'));
    el.className = CLS_KPI_GRID;
    el.innerHTML =
      statCard(data.totalLeads,                              'לידים סה״כ',           'indigo',  sparkReg, '↑ 15% מעבר לשבוע') +
      statCard(data.totalEvents,                             'אירועים סה״כ',         'cyan',    sparkEv,  '↑ 8% מעבר לשבוע') +
      statCard(CrmHelpers.formatCurrency(data.lastRevenue),  'הכנסות אירוע אחרון',    'emerald', sparkRev, '↑ 5% מעבר לשבוע') +
      statCard(data.returningLeads,                          'לידים חוזרים',         'amber',   sparkRet, 'סיכום');
  }

  function statCard(value, label, variant, spark, footer) {
    var v = KPI_VARIANTS[variant] || KPI_VARIANTS.indigo;
    return '<div class="' + CLS_KPI_CARD + ' ' + v.card + '">' +
      '<div class="flex items-start justify-between mb-4">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="' + CLS_KPI_LABEL + '">' + escapeHtml(label) + '</p>' +
          '<p class="' + CLS_KPI_VALUE + ' truncate">' + escapeHtml(String(value == null ? 0 : value)) + '</p>' +
        '</div>' +
        '<svg class="w-6 h-6 ' + v.icon + ' shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>' +
      '</div>' +
      sparklineHtml(spark, v.bar) +
      '<p class="text-xs font-medium ' + v.foot + ' mt-2">' + escapeHtml(footer || '') + '</p>' +
      '</div>';
  }

  function sparklineHtml(values, barGrad) {
    var bars = '';
    values.forEach(function (v) {
      bars += '<div class="flex-1 rounded bg-gradient-to-t ' + barGrad + '" style="height:' + Math.max(10, v) + '%"></div>';
    });
    return '<div class="h-10 bg-slate-100 rounded flex items-end gap-1 p-1">' + bars + '</div>';
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
  var ALERT_VARIANTS = {
    info: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    ok:   'border-emerald-200 bg-emerald-50 text-emerald-900'
  };

  function renderAlertStrip(el, data) {
    if (!el) return;
    var alerts = [];
    var newCount = data.leadStatusCounts['new'] || 0;
    if (newCount > 0) alerts.push({ type: 'warn', icon: '⚠️', title: newCount + ' לידים ממתינים', desc: 'למענה בתוך 24 שעות' });
    var upcoming = (data.eventStats || []).filter(function (e) { return e.status === 'registration_open'; });
    if (upcoming.length) alerts.push({ type: 'info', icon: '📅', title: 'אירוע קרוב: #' + (upcoming[0].event_number || '?'), desc: (upcoming[0].name || '') + ' — ' + CrmHelpers.formatDate(upcoming[0].event_date) });
    if (!alerts.length) alerts.push({ type: 'ok', icon: '✅', title: 'הכול שקט', desc: 'אין התראות פעילות' });
    el.className = CLS_ALERT_GRID;
    el.innerHTML = alerts.map(function (a) {
      return '<div class="' + CLS_ALERT_BOX + ' ' + (ALERT_VARIANTS[a.type] || ALERT_VARIANTS.info) + '">' +
        '<span class="text-xl shrink-0">' + a.icon + '</span>' +
        '<div class="min-w-0 flex-1"><p class="font-semibold text-sm">' + escapeHtml(a.title) + '</p>' +
        '<p class="text-xs opacity-80 mt-0.5">' + escapeHtml(a.desc) + '</p></div>' +
        '</div>';
    }).join('');
  }

  // ---- C. Events stacked bar chart ----
  var BAR_SEG = {
    purchased:  'bg-gradient-to-t from-amber-500 to-amber-400',
    attended:   'bg-gradient-to-t from-emerald-500 to-emerald-400',
    confirmed:  'bg-gradient-to-t from-cyan-500 to-cyan-400',
    registered: 'bg-gradient-to-t from-indigo-500 to-indigo-400'
  };

  function renderEventPerformance(el, rows) {
    if (!rows || !rows.length) {
      el.innerHTML = '<div class="text-center text-slate-400 py-8">אין נתוני אירועים</div>';
      return;
    }
    var top = rows.slice(0, 8);
    var max = Math.max.apply(null, top.map(function (r) { return Number(r.total_registered || 0); })) || 1;
    var h = '<div class="flex flex-col gap-3">';
    top.forEach(function (r) {
      var reg = +r.total_registered || 0, conf = +r.total_confirmed || 0, att = +r.total_attended || 0, prc = +r.total_purchased || 0;
      var regPct = Math.round(reg / max * 100), confPct = Math.round(conf / max * 100);
      var attPct = Math.round(att / max * 100),  prcPct = Math.round(prc / max * 100);
      var label = '#' + (r.event_number || '?') + ' ' + (r.name || '').slice(0, 18);
      h += '<div class="flex items-center gap-3">' +
        '<div class="' + CLS_BAR_LABEL + '">' + escapeHtml(label) + '</div>' +
        '<div class="' + CLS_BAR_TRACK + '">' +
          segHtml('purchased',  prcPct,                           prc) +
          segHtml('attended',   Math.max(0, attPct  - prcPct),    att - prc) +
          segHtml('confirmed',  Math.max(0, confPct - attPct),    conf - att) +
          segHtml('registered', Math.max(0, regPct  - confPct),   reg - conf) +
        '</div></div>';
    });
    el.innerHTML = h + '</div>';
  }

  function segHtml(cls, pct, num) {
    if (pct <= 0) return '';
    return '<div class="' + BAR_SEG[cls] + ' flex items-center justify-center text-white text-xs font-semibold" style="width:' + pct + '%">' + (pct > 6 ? num : '') + '</div>';
  }

  // ---- D. Conversion gauges (conic-gradient via inline style — Tailwind can't do conic) ----
  function renderConversionGauges(el, rows) {
    if (!el) return;
    var tot = (rows || []).reduce(function (acc, r) {
      acc.reg += +r.total_registered || 0;  acc.conf += +r.total_confirmed || 0;
      acc.att += +r.total_attended   || 0;  acc.prc  += +r.total_purchased  || 0;
      return acc;
    }, { reg: 0, conf: 0, att: 0, prc: 0 });
    var regConf = tot.reg  ? Math.round(tot.conf / tot.reg  * 100) : 0;
    var confAtt = tot.conf ? Math.round(tot.att  / tot.conf * 100) : 0;
    var attPrc  = tot.att  ? Math.round(tot.prc  / tot.att  * 100) : 0;
    el.className = CLS_GAUGE_GRID;
    el.innerHTML =
      gaugeHtml(regConf, 'נרשם → אישר', '#6366f1') +
      gaugeHtml(confAtt, 'אישר → הגיע', '#06b6d4') +
      gaugeHtml(attPrc,  'הגיע → רכש',  '#10b981');
  }

  function gaugeHtml(pct, label, color) {
    var deg = Math.max(0, Math.min(100, pct)) * 3.6;
    return '<div class="' + CLS_GAUGE_WRAP + '">' +
      '<div class="w-28 h-28 rounded-full flex items-center justify-center shadow-inner" ' +
        'style="background:conic-gradient(' + color + ' 0deg,' + color + ' ' + deg + 'deg,#e2e8f0 ' + deg + 'deg)">' +
        '<div class="w-20 h-20 rounded-full bg-white flex items-center justify-center">' +
          '<span class="text-2xl font-black text-slate-800">' + pct + '%</span>' +
        '</div>' +
      '</div>' +
      '<span class="text-sm font-medium text-slate-600">' + escapeHtml(label) + '</span>' +
      '</div>';
  }

  // ---- E. Activity feed ----
  function renderActivityFeed(el, data) {
    if (!el) return;
    var items = buildActivityItems(data);
    if (!items.length) { el.innerHTML = '<div class="text-center text-slate-400 py-6">אין פעילות אחרונה</div>'; return; }
    el.innerHTML = items.map(function (it, idx) {
      var pulse = idx < 3 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400';
      return '<div class="' + CLS_ACTIVITY_ROW + '">' +
        '<div class="mt-1 shrink-0"><div class="w-2 h-2 rounded-full ' + pulse + '"></div></div>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-sm text-slate-800 font-medium truncate">' + escapeHtml(it.text) + '</p>' +
          '<p class="text-xs text-slate-500 mt-0.5">' + escapeHtml(it.time) + '</p>' +
        '</div></div>';
    }).join('');
  }

  function buildActivityItems(data) {
    var items = [];
    (data.eventStats || []).slice(0, 3).forEach(function (r) {
      items.push({ text: 'אירוע #' + (r.event_number || '?') + ' — ' + (r.total_attended || 0) + ' השתתפו', time: CrmHelpers.formatDate(r.event_date) || '' });
    });
    var newCount = data.leadStatusCounts['new'] || 0;
    if (newCount) items.push({ text: 'לידים חדשים ממתינים: ' + newCount, time: 'עכשיו' });
    if (data.returningLeads) items.push({ text: 'לקוחות חוזרים: ' + data.returningLeads, time: 'סיכום' });
    return items.slice(0, 5);
  }

  // ---- F. Events timeline ----
  function renderEventsTimeline(el, rows) {
    if (!el) return;
    var recent = (rows || []).slice(0, 6);
    if (!recent.length) { el.innerHTML = '<div class="text-center text-slate-400 py-6">אין ציר זמן להציג</div>'; return; }
    el.className = 'flex gap-3 overflow-x-auto pb-2';
    el.innerHTML = recent.map(function (r) {
      var reg = +r.total_registered || 0, att = +r.total_attended || 0;
      var pct = reg ? Math.round(att / reg * 100) : 0;
      return '<div class="' + CLS_TIMELINE_CARD + '">' +
        '<div class="font-bold text-slate-800 text-sm truncate">#' + escapeHtml(String(r.event_number || '?')) + ' ' + escapeHtml((r.name || '').slice(0, 22)) + '</div>' +
        '<div class="text-xs text-slate-500">' + escapeHtml(CrmHelpers.formatDate(r.event_date)) + '</div>' +
        '<div class="w-full bg-slate-200 rounded h-1.5 overflow-hidden"><div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full" style="width:' + pct + '%"></div></div>' +
        '<div class="text-xs text-slate-600 font-medium">' + att + '/' + reg + ' <span class="text-indigo-600">(' + pct + '%)</span></div>' +
        '</div>';
    }).join('');
  }
})();
