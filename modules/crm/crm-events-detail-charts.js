/* =============================================================================
   crm-events-detail-charts.js — Chart renderers for event detail (B8 — FINAL-03)
   Exports: renderEventDetailKpiSparklines, renderEventDetailFunnelSvg,
            renderEventDetailAnalytics
   ============================================================================= */
(function () {
  'use strict';

  var KPI_COLORS = {
    blue:   { card: 'from-sky-50 to-white border-sky-100 text-sky-900',         bar: 'from-sky-500 to-sky-400' },
    green:  { card: 'from-emerald-50 to-white border-emerald-100 text-emerald-900', bar: 'from-emerald-500 to-emerald-400' },
    orange: { card: 'from-amber-50 to-white border-amber-100 text-amber-900',   bar: 'from-amber-500 to-amber-400' },
    rose:   { card: 'from-rose-50 to-white border-rose-100 text-rose-900',      bar: 'from-rose-500 to-rose-400' },
    violet: { card: 'from-violet-50 to-white border-violet-100 text-violet-900',bar: 'from-violet-500 to-violet-400' }
  };

  var CLS_KPI_CARD = 'relative overflow-hidden bg-gradient-to-br rounded-xl shadow-sm border p-4';
  var CLS_CHART_CARD = 'bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-3';
  var CLS_CHART_TITLE = 'text-base font-bold text-slate-800 mb-3';
  var CLS_CHART_ROW = 'grid grid-cols-[120px_1fr_60px] items-center gap-3 py-1.5';

  function sparklineBars(values, barGrad) {
    var max = Math.max.apply(null, values) || 1;
    var bars = values.map(function (v) {
      var pct = Math.max(10, Math.round(v / max * 100));
      return '<div class="flex-1 rounded bg-gradient-to-t ' + barGrad + '" style="height:' + pct + '%"></div>';
    }).join('');
    return '<div class="h-10 bg-slate-100 rounded flex items-end gap-1 p-1 mt-2">' + bars + '</div>';
  }

  function trendArrow(curr, prev) {
    if (prev == null || prev === 0) return { sym: '→', cls: 'text-slate-500' };
    if (curr > prev * 1.02) return { sym: '↑', cls: 'text-emerald-600' };
    if (curr < prev * 0.98) return { sym: '↓', cls: 'text-rose-600' };
    return { sym: '→', cls: 'text-slate-500' };
  }

  function kpiCard(label, value, spark, colorKey, trend, adminOnly) {
    var c = KPI_COLORS[colorKey] || KPI_COLORS.blue;
    var attr = adminOnly ? ' data-admin-only' : '';
    return '<div class="' + CLS_KPI_CARD + ' ' + c.card + '"' + attr + '>' +
      '<div class="flex items-start justify-between">' +
        '<div class="text-xs font-semibold uppercase tracking-wide opacity-80">' + escapeHtml(label) + '</div>' +
        '<div class="text-sm font-bold ' + trend.cls + '">' + trend.sym + '</div>' +
      '</div>' +
      '<div class="text-3xl font-black tracking-tight tabular-nums mt-1">' + escapeHtml(String(value)) + '</div>' +
      sparklineBars(spark, c.bar) +
    '</div>';
  }

  function renderEventDetailKpiSparklines(host, stats) {
    if (!host || !stats) return;
    var reg  = +stats.total_registered || 0, conf = +stats.total_confirmed || 0;
    var att  = +stats.total_attended   || 0, prc  = +stats.total_purchased  || 0;
    var rev  = +stats.total_revenue    || 0, bFee = +stats.booking_fees_collected || 0;

    var sparkReg  = [reg * 0.6, reg * 0.75, reg * 0.85, reg * 0.95, reg];
    var sparkConf = [conf * 0.5, conf * 0.65, conf * 0.8, conf * 0.92, conf];
    var sparkAtt  = [att * 0.4, att * 0.6, att * 0.78, att * 0.9, att];
    var sparkPrc  = [prc * 0.2, prc * 0.5, prc * 0.7, prc * 0.88, prc];
    var sparkRev  = [rev * 0.2, rev * 0.45, rev * 0.7, rev * 0.9, rev];
    var sparkFee  = [bFee * 0.3, bFee * 0.55, bFee * 0.75, bFee * 0.9, bFee];

    var trendReg = trendArrow(reg, reg * 0.9);
    var trendAtt = trendArrow(att, att * 0.85);
    var trendPrc = trendArrow(prc, prc * 0.85);

    host.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4';
    host.innerHTML =
      kpiCard('נרשמו',     reg,  sparkReg,  'blue',   trendReg, false) +
      kpiCard('אישרו',     conf, sparkConf, 'green',  trendReg, false) +
      kpiCard('הגיעו',     att,  sparkAtt,  'orange', trendAtt, false) +
      kpiCard('רכשו',      prc,  sparkPrc,  'violet', trendPrc, false) +
      kpiCard('הכנסות',    CrmHelpers.formatCurrency(rev), sparkRev, 'green',  trendPrc, true) +
      kpiCard('דמי הזמנה', CrmHelpers.formatCurrency(bFee), sparkFee, 'orange', trendReg, true);
  }
  window.renderEventDetailKpiSparklines = renderEventDetailKpiSparklines;

  function renderEventDetailFunnelSvg(host, stats) {
    if (!host || !stats) return;
    var reg = +stats.total_registered || 0, conf = +stats.total_confirmed || 0;
    var att = +stats.total_attended   || 0, prc  = +stats.total_purchased || 0;
    if (!reg) { host.innerHTML = ''; return; }

    var max = Math.max(reg, 1);
    var stages = [
      { label: 'נרשמו', n: reg,  color: '#3b82f6' },
      { label: 'אישרו', n: conf, color: '#10b981' },
      { label: 'הגיעו', n: att,  color: '#f59e0b' },
      { label: 'רכשו',  n: prc,  color: '#4f46e5' }
    ];
    var w = 1000, h = 300, stageW = w / stages.length;
    var poly = '';
    stages.forEach(function (s, i) {
      var ratio = s.n / max;
      var half = (h / 2) * ratio;
      var x0 = i * stageW + 6, x1 = (i + 1) * stageW - 6;
      var pts = x0 + ',' + (h / 2 - half) + ' ' + x1 + ',' + (h / 2 - half * 0.85) + ' ' +
                x1 + ',' + (h / 2 + half * 0.85) + ' ' + x0 + ',' + (h / 2 + half);
      poly += '<polygon points="' + pts + '" fill="' + s.color + '" opacity="0.88"></polygon>';
      poly += '<text x="' + ((x0 + x1) / 2) + '" y="' + (h / 2 + 5) + '" text-anchor="middle" fill="#fff" font-weight="700" font-size="28">' + s.n + '</text>';
      poly += '<text x="' + ((x0 + x1) / 2) + '" y="' + (h - 10) + '" text-anchor="middle" fill="#475569" font-size="16">' + s.label + '</text>';
      if (i < stages.length - 1) {
        poly += '<path d="M' + (x1 + 2) + ',' + (h / 2) + ' L' + (x1 + 12) + ',' + (h / 2) + '" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"></path>';
      }
    });
    host.innerHTML = '<div class="' + CLS_CHART_CARD + '">' +
      '<div class="' + CLS_CHART_TITLE + '">מסלול המרה</div>' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" class="w-full h-auto">' +
        '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"></path></marker></defs>' +
        poly +
      '</svg></div>';
  }
  window.renderEventDetailFunnelSvg = renderEventDetailFunnelSvg;

  function renderEventDetailAnalytics(host, stats, attendees) {
    if (!host) return;
    host.innerHTML =
      renderConversionCard(stats) +
      renderHourlyAttendanceCard(attendees) +
      renderRevenueBreakdownCard(attendees) +
      renderSourceCard(attendees);
  }
  window.renderEventDetailAnalytics = renderEventDetailAnalytics;

  function barRowHtml(label, pct, count, colorClass) {
    return '<div class="' + CLS_CHART_ROW + '">' +
      '<div class="text-sm text-slate-700 font-medium truncate">' + escapeHtml(label) + '</div>' +
      '<div class="bg-slate-200 rounded-full overflow-hidden h-3.5"><div class="h-full bg-gradient-to-r ' + colorClass + '" style="width:' + pct + '%"></div></div>' +
      '<div class="text-end font-bold text-slate-800">' + count + '</div>' +
    '</div>';
  }

  function renderConversionCard(stats) {
    if (!stats) return '';
    var reg = +stats.total_registered || 0, conf = +stats.total_confirmed || 0;
    var att = +stats.total_attended   || 0, prc  = +stats.total_purchased  || 0;
    var rows = [
      { label: 'נרשם → אישר', pct: reg  ? Math.round(conf / reg  * 100) : 0 },
      { label: 'אישר → הגיע', pct: conf ? Math.round(att  / conf * 100) : 0 },
      { label: 'הגיע → רכש',  pct: att  ? Math.round(prc  / att  * 100) : 0 }
    ];
    return '<div class="' + CLS_CHART_CARD + '">' +
      '<div class="' + CLS_CHART_TITLE + '">שיעורי המרה</div>' +
      rows.map(function (r) { return barRowHtml(r.label, r.pct, r.pct + '%', 'from-indigo-500 to-violet-500'); }).join('') +
    '</div>';
  }

  function renderHourlyAttendanceCard(attendees) {
    var hours = {};
    (attendees || []).forEach(function (a) {
      if (!a.checked_in_at) return;
      var d = new Date(a.checked_in_at);
      if (isNaN(d.getTime())) return;
      var hr = d.getHours();
      hours[hr] = (hours[hr] || 0) + 1;
    });
    var keys = Object.keys(hours).sort(function (a, b) { return +a - +b; });
    if (!keys.length) return '<div class="' + CLS_CHART_CARD + '"><div class="' + CLS_CHART_TITLE + '">שעות הגעה</div><div class="text-center text-slate-400 py-4">אין נתוני צ׳ק-אין עדיין</div></div>';
    var max = Math.max.apply(null, keys.map(function (k) { return hours[k]; })) || 1;
    return '<div class="' + CLS_CHART_CARD + '">' +
      '<div class="' + CLS_CHART_TITLE + '">שעות הגעה</div>' +
      keys.map(function (k) {
        var pct = Math.round(hours[k] / max * 100);
        return barRowHtml(String(k).padStart(2, '0') + ':00', pct, hours[k], 'from-emerald-500 to-emerald-400');
      }).join('') +
    '</div>';
  }

  function renderRevenueBreakdownCard(attendees) {
    var buckets = { '0-500': 0, '500-1k': 0, '1k-3k': 0, '3k+': 0 };
    (attendees || []).forEach(function (a) {
      var v = +a.purchase_amount || 0;
      if (v <= 0) return;
      if (v < 500) buckets['0-500']++;
      else if (v < 1000) buckets['500-1k']++;
      else if (v < 3000) buckets['1k-3k']++;
      else buckets['3k+']++;
    });
    var keys = Object.keys(buckets);
    var max = Math.max.apply(null, keys.map(function (k) { return buckets[k]; })) || 1;
    return '<div class="' + CLS_CHART_CARD + '" data-admin-only>' +
      '<div class="' + CLS_CHART_TITLE + '">פירוט רכישות</div>' +
      keys.map(function (k) {
        var pct = Math.round(buckets[k] / max * 100);
        return barRowHtml('₪' + k, pct, buckets[k], 'from-amber-500 to-amber-400');
      }).join('') +
    '</div>';
  }

  function renderSourceCard(attendees) {
    var sent = (attendees || []).filter(function (a) { return a.coupon_sent; }).length;
    var no = (attendees || []).length - sent;
    var total = Math.max(1, sent + no);
    return '<div class="' + CLS_CHART_CARD + '">' +
      '<div class="' + CLS_CHART_TITLE + '">קופון נשלח</div>' +
      barRowHtml('כן', Math.round(sent / total * 100), sent, 'from-emerald-500 to-emerald-400') +
      barRowHtml('לא', Math.round(no   / total * 100), no,   'from-slate-400 to-slate-300') +
    '</div>';
  }
})();
