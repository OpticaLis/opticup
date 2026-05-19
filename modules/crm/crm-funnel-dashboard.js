/* =============================================================================
   crm-funnel-dashboard.js — Funnel Health Dashboard (14 tiles)
   Reads mv_funnel_health_dashboard (5-min pg_cron cache) + 2 live queries.
   Exports window.renderFunnelDashboard(host).
   Source: M4_FUNNEL_HEALTH_DASHBOARD (2026-05-19). Phase 2.5 Deliverable A.
   Iron Rules: 7 (sb helpers), 8 (escapeHtml), 12 (≤250 lines), 22 (tenant_id),
               34 (window.__funnelTrace), 35 (no Campaign Overseer surfaces).
   ============================================================================= */
(function () {
  'use strict';

  window.__funnelTrace = [];

  /* ── ORCHESTRATOR ─────────────────────────────────────────────────────── */
  async function renderFunnelDashboard(host) {
    if (!host) return;
    var tid = getTenantId();
    var t0 = Date.now();
    host.innerHTML = '<div class="fhd-loading">טוען דשבורד מצב פאנל...</div>';
    try {
      /* Single mv read — Iron Rule 22 tenant_id on every SELECT */
      var res = await sb.from('mv_funnel_health_dashboard')
        .select('*').eq('tenant_id', tid).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      var mv = res.data || {};
      var mvMs = Date.now() - t0;

      /* Tile 13 — live ROAS query (not in mv per D-AUTH-9) */
      var roasRes = await sb.from('v_crm_campaign_performance')
        .select('*').eq('tenant_id', tid).limit(5);
      var roasRows = roasRes.data || [];

      host.innerHTML = '';

      /* Weekly Brief panel — Deliverable B (M4_WEEKLY_OPTIMIZATION_BRIEF).
         Rendered at top of dashboard, spans full width. */
      var briefHost = document.createElement('div');
      briefHost.id = 'weekly-brief-host';
      briefHost.className = 'weekly-brief-panel-host';
      host.appendChild(briefHost);
      if (typeof window.renderWeeklyBriefPanel === 'function') {
        window.renderWeeklyBriefPanel(briefHost);
      }

      var grid = document.createElement('div');
      grid.className = 'fhd-grid';
      host.appendChild(grid);

      renderTile_leads(grid, mv);
      renderTile_leadAttendeeConv(grid, mv);
      renderTile_attendeeBuyerConv(grid, mv);
      renderTile_revenue(grid, mv);
      renderTile_sourceMix(grid, mv);
      renderTile_topBroadcasts(grid, mv);
      renderTile_pixelGap(grid);
      renderTile_capiQueueHealth(grid, mv);
      renderTile_latency(grid, mv);
      renderTile_eventFunnel(grid, mv);
      renderTile_unsubs(grid, mv);
      renderTile_failedBreakdown(grid, mv);
      renderTile_campaignROAS(grid, roasRows);
      renderTile_sparklines(grid, mv);

      var refreshedAt = mv.refreshed_at ? new Date(mv.refreshed_at).toLocaleTimeString('he-IL') : '—';
      var footer = document.createElement('p');
      footer.className = 'fhd-footer';
      footer.textContent = 'עדכון אחרון: ' + refreshedAt + ' | מתרענן אוטומטית כל 5 דקות';
      host.appendChild(footer);

      var tilesCount = grid.children.length;
      window.__funnelTrace.push({ at: new Date().toISOString(), mv_query_ms: mvMs, tiles_rendered: tilesCount });
    } catch (e) {
      host.innerHTML = '<div class="fhd-error">שגיאה בטעינת הדשבורד: ' + escapeHtml(e.message || String(e)) + '</div>';
      console.error('[funnelDashboard] error:', e);
    }
  }
  window.renderFunnelDashboard = renderFunnelDashboard;

  /* ── TILE RENDER FUNCTIONS ────────────────────────────────────────────── */
  function card(title, body, onDrillDown) {
    var el = document.createElement('div');
    el.className = 'fhd-tile';
    var btn = onDrillDown ? '<button class="fhd-drill" onclick="(' + onDrillDown + ')()">פירוט</button>' : '';
    el.innerHTML = '<div class="fhd-tile-title">' + escapeHtml(title) + '</div>' +
      '<div class="fhd-tile-body">' + body + '</div>' + btn;
    return el;
  }
  function stat(val, label) {
    return '<div class="fhd-stat"><span class="fhd-stat-num">' + escapeHtml(String(val)) + '</span>' +
      '<span class="fhd-stat-label">' + escapeHtml(label) + '</span></div>';
  }
  function delta(now, prev, label) {
    var pct = prev > 0 ? ((now - prev) / prev * 100).toFixed(1) : '—';
    var cls = (now >= prev) ? 'fhd-up' : 'fhd-dn';
    return stat(now, label) + '<span class="' + cls + ' fhd-delta">' + (prev > 0 ? (now >= prev ? '+' : '') + pct + '%' : '') + '</span>';
  }
  function fmt(n) { return n != null ? Number(n).toLocaleString('he-IL') : '—'; }
  function fmtMoney(n) { return n != null ? '₪' + Number(n).toLocaleString('he-IL', {maximumFractionDigits:0}) : '—'; }
  function pct(a, b) { return (b > 0) ? (a / b * 100).toFixed(1) + '%' : '—'; }

  function renderTile_leads(g, mv) {
    g.appendChild(card('לידים 30 יום', delta(mv.leads_30d || 0, (mv.leads_30d || 0) - (mv.leads_7d || 0), 'לידים'), 'window._fhd_drillLeads'));
  }
  function renderTile_leadAttendeeConv(g, mv) {
    g.appendChild(card('המרה: ליד → משתתף', stat(pct(mv.attendees_30d, mv.leads_30d), 'מהלידים נרשמו'), 'window._fhd_drillAttendees'));
  }
  function renderTile_attendeeBuyerConv(g, mv) {
    g.appendChild(card('המרה: משתתף → קונה', stat(pct(mv.buyers_30d, mv.attendees_30d), 'מהמשתתפים קנו'), null));
  }
  function renderTile_revenue(g, mv) {
    g.appendChild(card('הכנסות 30 יום', delta(mv.revenue_30d || 0, (mv.revenue_30d || 0) - (mv.revenue_7d || 0), 'ש"ח'), 'window._fhd_drillRevenue'));
  }
  function renderTile_sourceMix(g, mv) {
    var items = mv.source_mix || [];
    var rows = Array.isArray(items) ? items.map(function (s) {
      return '<div class="fhd-row"><span>' + escapeHtml(s.source || '—') + '</span><b>' + fmt(s.count) + '</b></div>';
    }).join('') : '<span class="fhd-empty">אין נתונים</span>';
    g.appendChild(card('מקורות לידים', rows, null));
  }
  function renderTile_topBroadcasts(g, mv) {
    var items = mv.top_broadcasts || [];
    var rows = Array.isArray(items) && items.length ? items.map(function (b) {
      return '<div class="fhd-row"><span>' + escapeHtml(b.name || '—') + '</span><b>' + (b.ctr_pct != null ? b.ctr_pct + '%' : '—') + '</b></div>';
    }).join('') : '<span class="fhd-empty">אין שידורים</span>';
    g.appendChild(card('Top 5 שידורים (CTR)', rows, 'window._fhd_drillBroadcasts'));
  }
  function renderTile_pixelGap(g) {
    var wrap = document.createElement('div');
    wrap.className = 'fhd-tile fhd-tile-wide';
    wrap.id = 'fhd-pixel-gap-host';
    g.appendChild(wrap);
    if (typeof window.renderPixelGapTile === 'function') {
      try { window.renderPixelGapTile(wrap); } catch (e) { console.warn('[fhd] pixel gap tile error:', e); }
    }
  }
  function renderTile_capiQueueHealth(g, mv) {
    var obj = mv.capi_queue_health || {};
    var rows = Object.keys(obj).length ? Object.keys(obj).map(function (k) {
      return '<div class="fhd-row"><span>' + escapeHtml(k) + '</span><b>' + fmt(obj[k]) + '</b></div>';
    }).join('') : '<span class="fhd-empty">אין נתוני תור</span>';
    g.appendChild(card('בריאות תור CAPI', rows, null));
  }
  function renderTile_latency(g, mv) {
    var items = mv.latency_p_by_channel || [];
    var rows = Array.isArray(items) && items.length ? items.map(function (ch) {
      return '<div class="fhd-row"><span>' + escapeHtml(ch.channel || '—') + '</span>' +
        '<small>p50:' + (ch.p50_seconds != null ? ch.p50_seconds.toFixed(1) + 'ש' : '—') + ' p95:' + (ch.p95_seconds != null ? ch.p95_seconds.toFixed(1) + 'ש' : '—') + '</small></div>';
    }).join('') : '<span class="fhd-empty">אין נתוני זמן תגובה</span>';
    g.appendChild(card('זמן שליחה (7י\')', rows, null));
  }
  function renderTile_eventFunnel(g, mv) {
    var items = mv.event_funnel || [];
    var rows = Array.isArray(items) && items.length ? items.map(function (s) {
      return '<div class="fhd-row"><span>' + escapeHtml(s.status || '—') + '</span><b>' + fmt(s.n) + '</b></div>';
    }).join('') : '<span class="fhd-empty">אין אירועים</span>';
    g.appendChild(card('פאנל אירועים', rows, null));
  }
  function renderTile_unsubs(g, mv) {
    g.appendChild(card('הסרות מרשימה', stat(mv.unsubs_7d || 0, '7 ימים') + stat(mv.unsubs_30d || 0, '30 ימים'), null));
  }
  function renderTile_failedBreakdown(g, mv) {
    var items = mv.failed_breakdown || [];
    var rows = Array.isArray(items) && items.length ? items.map(function (f) {
      return '<div class="fhd-row"><span>' + escapeHtml(f.error_kind || '—') + '</span><b>' + fmt(f.n) + '</b></div>';
    }).join('') : '<span class="fhd-empty">אין שגיאות שליחה</span>';
    g.appendChild(card('שגיאות שליחה (30י\')', rows, 'window._fhd_drillFailed'));
  }
  function renderTile_campaignROAS(g, rows) {
    var body = rows.length ? rows.map(function (r) {
      return '<div class="fhd-row"><span>' + escapeHtml(r.campaign_name || r.name || '—') + '</span><b>' + fmtMoney(r.total_revenue || r.revenue || 0) + '</b></div>';
    }).join('') : '<span class="fhd-empty">אין נתוני קמפיין</span>';
    g.appendChild(card('ROAS קמפיינים', body, null));
  }
  function renderTile_sparklines(g, mv) {
    var sp = mv.sparklines || {};
    var ld = Array.isArray(sp.leads_daily) ? sp.leads_daily : [];
    var body = ld.length ? '<div class="fhd-spark">' +
      ld.map(function (d) { return '<span class="fhd-spark-bar" style="height:' + Math.min(d.n * 6, 60) + 'px" title="' + escapeHtml(String(d.d)) + ':' + d.n + '"></span>'; }).join('') +
      '</div>' : '<span class="fhd-empty">אין נתוני טרנד</span>';
    g.appendChild(card('טרנד 28 יום (לידים)', body, null));
  }

  /* ── DRILL-DOWN MODALS (5 tiles) ──────────────────────────────────────── */
  window._fhd_drillLeads = async function () {
    var tid = getTenantId();
    var res = await sb.from('crm_leads').select('id,full_name,phone,created_at,status')
      .eq('tenant_id', tid).eq('is_deleted', false)
      .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('created_at', { ascending: false }).limit(100);
    _drillModal('לידים אחרונים (30 יום)', res.data || [], ['שם','טלפון','סטטוס','תאריך'], function (r) {
      return [r.full_name, r.phone, r.status, r.created_at ? r.created_at.slice(0,10) : '—'];
    });
  };
  window._fhd_drillAttendees = async function () {
    var tid = getTenantId();
    var res = await sb.from('crm_event_attendees').select('id,lead_id,created_at,purchase_amount')
      .eq('tenant_id', tid).eq('is_deleted', false)
      .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('created_at', { ascending: false }).limit(100);
    _drillModal('משתתפים (30 יום)', res.data || [], ['מזהה ליד','הכנסה','תאריך'], function (r) {
      return [r.lead_id, fmtMoney(r.purchase_amount), r.created_at ? r.created_at.slice(0,10) : '—'];
    });
  };
  window._fhd_drillRevenue = async function () {
    var tid = getTenantId();
    var res = await sb.from('crm_event_attendees').select('id,lead_id,purchase_amount,created_at')
      .eq('tenant_id', tid).gt('purchase_amount', 0)
      .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('purchase_amount', { ascending: false }).limit(100);
    _drillModal('הכנסות (30 יום)', res.data || [], ['מזהה ליד','סכום','תאריך'], function (r) {
      return [r.lead_id, fmtMoney(r.purchase_amount), r.created_at ? r.created_at.slice(0,10) : '—'];
    });
  };
  window._fhd_drillBroadcasts = async function () {
    var tid = getTenantId();
    var res = await sb.from('crm_broadcasts').select('id,name,channel,total_sent,total_failed,status,created_at')
      .eq('tenant_id', tid).order('created_at', { ascending: false }).limit(20);
    _drillModal('שידורים (פירוט)', res.data || [], ['שם','ערוץ','נשלחו','נכשלו','סטטוס'], function (r) {
      return [r.name, r.channel, r.total_sent, r.total_failed, r.status];
    });
  };
  window._fhd_drillFailed = async function () {
    var tid = getTenantId();
    var res = await sb.from('crm_message_log').select('id,channel,status,error_message,created_at')
      .eq('tenant_id', tid).in('status', ['failed','rejected'])
      .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('created_at', { ascending: false }).limit(100);
    _drillModal('שגיאות שליחה (30 יום)', res.data || [], ['ערוץ','סטטוס','שגיאה','תאריך'], function (r) {
      return [r.channel, r.status, r.error_message, r.created_at ? r.created_at.slice(0,10) : '—'];
    });
  };
  function _drillModal(title, rows, headers, mapper) {
    var body = rows.length
      ? '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr>' +
          headers.map(function(h){ return '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">' + escapeHtml(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          rows.map(function(r){ var cells = mapper(r); return '<tr class="border-b border-slate-100 hover:bg-indigo-50">' + cells.map(function(c){ return '<td class="px-3 py-2">' + escapeHtml(String(c == null ? '—' : c)) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div>'
      : '<div class="text-center py-6 text-slate-500">אין נתונים</div>';
    Modal.show({ title: title, content: body, size: 'lg', closeOnEscape: true, closeOnBackdrop: true });
  }
})();
