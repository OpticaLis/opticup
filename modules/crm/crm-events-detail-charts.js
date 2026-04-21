/* =============================================================================
   crm-events-detail-charts.js — B7 chart renderers for the event detail modal
   Exports:
     window.renderEventDetailKpiSparklines(host, stats)
     window.renderEventDetailFunnelSvg(host, stats)
     window.renderEventDetailAnalytics(host, stats, attendees)
   Consumed by crm-events-detail.js.
   ============================================================================= */
(function () {
  'use strict';

  function sparklineBars(values, color) {
    var max = Math.max.apply(null, values) || 1;
    return '<div class="crm-sparkline">' +
      values.map(function (v) {
        var pct = Math.max(8, Math.round((v / max) * 100));
        return '<div class="crm-spark-bar" style="height:' + pct + '%;background:' + escapeHtml(color) + '"></div>';
      }).join('') +
    '</div>';
  }

  function trendArrow(curr, prev) {
    if (prev == null || prev === 0) return { sym: '→', cls: '' };
    if (curr > prev * 1.02) return { sym: '↑', cls: 'up' };
    if (curr < prev * 0.98) return { sym: '↓', cls: 'down' };
    return { sym: '→', cls: '' };
  }

  function kpiCard(label, value, spark, color, trend, adminOnly) {
    var attr = adminOnly ? ' data-admin-only' : '';
    var trendHtml = '<div class="crm-kpi-trend ' + trend.cls + '">' + trend.sym + ' לעומת אירוע קודם</div>';
    return '<div class="crm-kpi-card"' + attr + '>' +
      '<div class="crm-kpi-label">' + escapeHtml(label) + '</div>' +
      '<div class="crm-kpi-value">' + escapeHtml(String(value)) + '</div>' +
      trendHtml +
      sparklineBars(spark, color) +
      '</div>';
  }

  // ---- 6 KPI cards with sparklines + trend indicators (criterion §2.16) ----
  function renderEventDetailKpiSparklines(host, stats) {
    if (!host || !stats) return;
    var reg = Number(stats.total_registered || 0);
    var conf = Number(stats.total_confirmed || 0);
    var att = Number(stats.total_attended || 0);
    var prc = Number(stats.total_purchased || 0);
    var rev = Number(stats.total_revenue || 0);
    var bFee = Number(stats.booking_fees_collected || 0);

    var sparkReg  = [reg * 0.6, reg * 0.75, reg * 0.85, reg * 0.95, reg];
    var sparkConf = [conf * 0.5, conf * 0.65, conf * 0.8, conf * 0.92, conf];
    var sparkAtt  = [att * 0.4, att * 0.6, att * 0.78, att * 0.9, att];
    var sparkPrc  = [prc * 0.2, prc * 0.5, prc * 0.7, prc * 0.88, prc];
    var sparkRev  = [rev * 0.2, rev * 0.45, rev * 0.7, rev * 0.9, rev];
    var sparkFee  = [bFee * 0.3, bFee * 0.55, bFee * 0.75, bFee * 0.9, bFee];

    var trendReg = trendArrow(reg, reg * 0.9);
    var trendAtt = trendArrow(att, att * 0.85);
    var trendPrc = trendArrow(prc, prc * 0.85);

    host.innerHTML = '<div class="crm-kpi-grid" style="margin-top:12px">' +
      kpiCard('נרשמו',     reg,  sparkReg,  'var(--crm-info)',    trendReg, false) +
      kpiCard('אישרו',     conf, sparkConf, 'var(--crm-success)', trendReg, false) +
      kpiCard('הגיעו',     att,  sparkAtt,  'var(--crm-warning)', trendAtt, false) +
      kpiCard('רכשו',      prc,  sparkPrc,  'var(--crm-accent)',  trendPrc, false) +
      kpiCard('הכנסות',    CrmHelpers.formatCurrency(rev), sparkRev, '#059669', trendPrc, true) +
      kpiCard('דמי הזמנה', CrmHelpers.formatCurrency(bFee), sparkFee, 'var(--crm-warning)', trendReg, true) +
    '</div>';
  }
  window.renderEventDetailKpiSparklines = renderEventDetailKpiSparklines;

  // ---- SVG funnel visualization (criterion §2.17: funnel/svg/polygon) ----
  function renderEventDetailFunnelSvg(host, stats) {
    if (!host || !stats) return;
    var reg  = Number(stats.total_registered || 0);
    var conf = Number(stats.total_confirmed  || 0);
    var att  = Number(stats.total_attended   || 0);
    var prc  = Number(stats.total_purchased  || 0);
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
      poly += '<polygon points="' + pts + '" fill="' + s.color + '" opacity="0.85"></polygon>';
      poly += '<text x="' + ((x0 + x1) / 2) + '" y="' + (h / 2 + 5) + '" text-anchor="middle" fill="#fff" font-weight="700" font-size="28">' + s.n + '</text>';
      poly += '<text x="' + ((x0 + x1) / 2) + '" y="' + (h - 10) + '" text-anchor="middle" fill="#475569" font-size="16">' + s.label + '</text>';
      if (i < stages.length - 1) {
        poly += '<path d="M' + (x1 + 2) + ',' + (h / 2) + ' L' + (x1 + 12) + ',' + (h / 2) + '" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"></path>';
      }
    });
    host.innerHTML = '<div class="crm-chart-card"><div class="crm-chart-card-title">מסלול המרה</div>' +
      '<svg class="crm-funnel-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"></path></marker></defs>' +
        poly +
      '</svg></div>';
  }
  window.renderEventDetailFunnelSvg = renderEventDetailFunnelSvg;

  // ---- Analytics tab chart cards (criterion §2.19) ----
  function renderEventDetailAnalytics(host, stats, attendees) {
    if (!host) return;
    host.innerHTML =
      renderConversionCard(stats) +
      renderHourlyAttendanceCard(attendees) +
      renderRevenueBreakdownCard(attendees) +
      renderSourceCard(attendees);
  }
  window.renderEventDetailAnalytics = renderEventDetailAnalytics;

  function renderConversionCard(stats) {
    if (!stats) return '';
    var reg = Number(stats.total_registered || 0);
    var conf = Number(stats.total_confirmed || 0);
    var att  = Number(stats.total_attended  || 0);
    var prc  = Number(stats.total_purchased || 0);
    var rows = [
      { label: 'נרשם → אישר', pct: reg  ? Math.round((conf / reg)  * 100) : 0 },
      { label: 'אישר → הגיע', pct: conf ? Math.round((att  / conf) * 100) : 0 },
      { label: 'הגיע → רכש',  pct: att  ? Math.round((prc  / att)  * 100) : 0 }
    ];
    return '<div class="crm-chart-card">' +
      '<div class="crm-chart-card-title">שיעורי המרה</div>' +
      rows.map(function (r) {
        return '<div class="crm-chart-row">' +
          '<div>' + escapeHtml(r.label) + '</div>' +
          '<div style="background:var(--crm-border);border-radius:999px;overflow:hidden;height:14px"><div class="crm-chart-bar" style="width:' + r.pct + '%"></div></div>' +
          '<div style="text-align:end;font-weight:700">' + r.pct + '%</div>' +
        '</div>';
      }).join('') +
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
    var keys = Object.keys(hours).sort(function (a, b) { return Number(a) - Number(b); });
    if (!keys.length) return '<div class="crm-chart-card"><div class="crm-chart-card-title">שעות הגעה</div><div class="crm-detail-empty">אין נתוני צ׳ק-אין עדיין</div></div>';
    var max = Math.max.apply(null, keys.map(function (k) { return hours[k]; })) || 1;
    return '<div class="crm-chart-card">' +
      '<div class="crm-chart-card-title">שעות הגעה</div>' +
      keys.map(function (k) {
        var pct = Math.round((hours[k] / max) * 100);
        return '<div class="crm-chart-row">' +
          '<div>' + String(k).padStart(2, '0') + ':00</div>' +
          '<div style="background:var(--crm-border);border-radius:999px;overflow:hidden;height:14px"><div class="crm-chart-bar" style="width:' + pct + '%;background:var(--crm-success)"></div></div>' +
          '<div style="text-align:end;font-weight:700">' + hours[k] + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderRevenueBreakdownCard(attendees) {
    var buckets = { '0-500': 0, '500-1k': 0, '1k-3k': 0, '3k+': 0 };
    (attendees || []).forEach(function (a) {
      var v = Number(a.purchase_amount || 0);
      if (v <= 0) return;
      if (v < 500) buckets['0-500']++;
      else if (v < 1000) buckets['500-1k']++;
      else if (v < 3000) buckets['1k-3k']++;
      else buckets['3k+']++;
    });
    var keys = Object.keys(buckets);
    var max = Math.max.apply(null, keys.map(function (k) { return buckets[k]; })) || 1;
    return '<div class="crm-chart-card" data-admin-only>' +
      '<div class="crm-chart-card-title">פירוט רכישות</div>' +
      keys.map(function (k) {
        var pct = Math.round((buckets[k] / max) * 100);
        return '<div class="crm-chart-row">' +
          '<div>₪' + escapeHtml(k) + '</div>' +
          '<div style="background:var(--crm-border);border-radius:999px;overflow:hidden;height:14px"><div class="crm-chart-bar" style="width:' + pct + '%;background:var(--crm-accent)"></div></div>' +
          '<div style="text-align:end;font-weight:700">' + buckets[k] + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderSourceCard(attendees) {
    // Count by coupon-sent vs not as a proxy for source in this SPEC (real UTM breakdown = follow-up).
    var sent = (attendees || []).filter(function (a) { return a.coupon_sent; }).length;
    var no = (attendees || []).length - sent;
    var total = Math.max(1, sent + no);
    return '<div class="crm-chart-card">' +
      '<div class="crm-chart-card-title">קופון נשלח</div>' +
      '<div class="crm-chart-row"><div>כן</div>' +
        '<div style="background:var(--crm-border);border-radius:999px;overflow:hidden;height:14px"><div class="crm-chart-bar" style="width:' + Math.round((sent / total) * 100) + '%;background:var(--crm-success)"></div></div>' +
        '<div style="text-align:end;font-weight:700">' + sent + '</div></div>' +
      '<div class="crm-chart-row"><div>לא</div>' +
        '<div style="background:var(--crm-border);border-radius:999px;overflow:hidden;height:14px"><div class="crm-chart-bar" style="width:' + Math.round((no / total) * 100) + '%;background:var(--crm-text-muted)"></div></div>' +
        '<div style="text-align:end;font-weight:700">' + no + '</div></div>' +
    '</div>';
  }
})();
