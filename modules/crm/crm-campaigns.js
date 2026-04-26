/* =============================================================================
   crm-campaigns.js — CRM "קמפיינים" tab (Mockup C: dashboard + drill-down)
   Reads from v_crm_campaign_performance. Computes auto-decision per row.
   Settings (Unit Economics) modal opens via gear icon (CrmUnitEconomicsModal).
   Drill-down modal opens on row click (CrmCampaignsDetail).
   Load order: after shared.js, crm-helpers.js. Exposes window.CrmCampaigns.
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }
  function fmt(n) { return Number(n || 0).toLocaleString('he-IL'); }
  function money(n) { return '₪' + fmt(Math.round(Number(n) || 0)); }

  // Decision logic per SPEC §3.24-26
  function decision(row) {
    if (String(row.status || '').toLowerCase() === 'stopped') return null;
    var leads = Number(row.leads_num || 0);
    if (leads < 30) return 'TEST';
    var cac = Number(row.cac);
    if (!isFinite(cac) || cac <= 0) return 'TEST';
    var gm = Number(row.gross_margin_pct);
    if (!isFinite(gm) || gm <= 0) return 'TEST';
    var killMult = Number(row.kill_multiplier);
    var scaleMult = Number(row.scaling_multiplier);
    var killT = killMult * (gm / 100) * 1000;
    var scaleT = scaleMult * (gm / 100) * 1000;
    if (cac > killT) return 'STOP';
    if (cac < scaleT) return 'SCALE';
    return 'TEST';
  }

  function statusGroup(s) {
    var st = String(s || '').toLowerCase();
    if (st === 'stopped') return 'stopped';
    if (st === 'paused') return 'paused';
    return 'live';
  }

  function decisionBadge(d) {
    if (d === null) return '<span class="text-slate-400">—</span>';
    var map = {
      SCALE: 'bg-emerald-600 text-white',
      TEST: 'bg-slate-500 text-white',
      STOP: 'bg-rose-600 text-white'
    };
    return '<span class="inline-block px-2 py-0.5 rounded text-xs font-bold ' + (map[d] || '') + '">' + d + '</span>';
  }

  function statusPill(s) {
    var grp = statusGroup(s);
    var map = {
      live: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', label: 'Live' },
      paused: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Paused' },
      stopped: { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500', label: 'Stopped' }
    };
    var m = map[grp];
    return '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ' + m.bg + ' ' + m.text + '">' +
           '<span class="w-1.5 h-1.5 rounded-full ' + m.dot + '"></span>' + m.label + '</span>';
  }

  async function loadRows() {
    var tenantId = tid();
    var q = sb.from('v_crm_campaign_performance').select('*');
    if (tenantId) q = q.eq('tenant_id', tenantId);
    var res = await q;
    if (res.error) throw new Error('campaigns view load failed: ' + res.error.message);
    return res.data || [];
  }

  function aggregateKpis(rows) {
    var s = { spend: 0, revenue: 0, leads: 0, buyers: 0, gp: 0 };
    rows.forEach(function (r) {
      s.spend += Number(r.total_spend || 0);
      s.revenue += Number(r.total_revenue || 0);
      s.leads += Number(r.leads_num || 0);
      s.buyers += Number(r.buyers_num || 0);
      s.gp += Number(r.gross_profit || 0);
    });
    s.cac = s.buyers > 0 ? Math.round(s.spend / s.buyers) : 0;
    return s;
  }

  function renderKpiCards(k) {
    var cards = [
      { label: 'סה"כ ספנד', val: money(k.spend), color: 'slate', icon: '💰' },
      { label: 'סה"כ הכנסות', val: money(k.revenue), color: 'emerald', icon: '📈' },
      { label: 'CAC ממוצע', val: k.buyers > 0 ? money(k.cac) : '—', color: 'indigo', icon: '👤' },
      { label: 'לידים', val: fmt(k.leads), color: 'violet', icon: '🎯' },
      { label: 'קונים', val: fmt(k.buyers), color: 'amber', icon: '🛒' },
      { label: 'רווח גולמי', val: money(k.gp), color: k.gp >= 0 ? 'emerald' : 'rose', icon: '💎' }
    ];
    return '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">' +
      cards.map(function (c) {
        return '<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">' +
          '<div class="flex items-start justify-between mb-2">' +
            '<div class="text-xs text-slate-500 font-medium">' + c.label + '</div>' +
            '<div class="w-8 h-8 rounded-lg bg-' + c.color + '-100 flex items-center justify-center text-base">' + c.icon + '</div>' +
          '</div>' +
          '<div class="text-2xl font-bold text-slate-900" style="direction:ltr;text-align:start;">' + c.val + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderGroupRows(label, color, rows) {
    if (rows.length === 0) return '';
    var sumSpend = 0, sumLeads = 0, sumBuyers = 0, sumRevenue = 0;
    rows.forEach(function (r) {
      sumSpend += Number(r.total_spend || 0);
      sumLeads += Number(r.leads_num || 0);
      sumBuyers += Number(r.buyers_num || 0);
      sumRevenue += Number(r.total_revenue || 0);
    });
    var avgCAC = sumBuyers > 0 ? Math.round(sumSpend / sumBuyers) : 0;

    var html = '<tr class="bg-' + color + '-50 border-b border-' + color + '-200">' +
      '<td colspan="8" class="px-3 py-2 text-sm font-bold text-' + color + '-800">' +
        label + ' <span class="text-' + color + '-600 font-normal">(' + rows.length + ')</span>' +
      '</td></tr>';

    rows.forEach(function (r) {
      var d = decision(r);
      var cac = Number(r.cac);
      var cacStr = isFinite(cac) && cac > 0 ? money(cac) : '—';
      html += '<tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" data-campaign-id="' + (r.campaign_id || '') + '">' +
        '<td class="px-3 py-2 max-w-[280px] truncate" title="' + escapeHtml(r.name || '') + '">' +
          '<div class="text-sm font-medium text-slate-800 truncate">' + escapeHtml(r.name || '(ללא שם)') + '</div>' +
          '<div class="text-xs text-slate-500">' + (r.event_type || '—') + '</div>' +
        '</td>' +
        '<td class="px-3 py-2">' + statusPill(r.status) + '</td>' +
        '<td class="px-3 py-2 text-end" style="direction:ltr;">' + money(r.total_spend) + '</td>' +
        '<td class="px-3 py-2 text-end">' + fmt(r.leads_num) + '</td>' +
        '<td class="px-3 py-2 text-end">' + fmt(r.buyers_num) + '</td>' +
        '<td class="px-3 py-2 text-end" style="direction:ltr;">' + money(r.total_revenue) + '</td>' +
        '<td class="px-3 py-2 text-end font-bold" style="direction:ltr;">' + cacStr + '</td>' +
        '<td class="px-3 py-2 text-center">' + decisionBadge(d) + '</td>' +
      '</tr>';
    });

    html += '<tr class="bg-slate-100 border-b-2 border-' + color + '-300 font-bold">' +
      '<td class="px-3 py-2 text-sm text-' + color + '-800">סה"כ ' + label + '</td>' +
      '<td></td>' +
      '<td class="px-3 py-2 text-end" style="direction:ltr;">' + money(sumSpend) + '</td>' +
      '<td class="px-3 py-2 text-end">' + fmt(sumLeads) + '</td>' +
      '<td class="px-3 py-2 text-end">' + fmt(sumBuyers) + '</td>' +
      '<td class="px-3 py-2 text-end" style="direction:ltr;">' + money(sumRevenue) + '</td>' +
      '<td class="px-3 py-2 text-end" style="direction:ltr;">' + (sumBuyers > 0 ? money(avgCAC) : '—') + '</td>' +
      '<td></td>' +
    '</tr>';

    return html;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderTable(rows) {
    var live = rows.filter(function (r) { return statusGroup(r.status) === 'live'; });
    var paused = rows.filter(function (r) { return statusGroup(r.status) === 'paused'; });
    var stopped = rows.filter(function (r) { return statusGroup(r.status) === 'stopped'; });

    return '<div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">' +
      '<div class="overflow-x-auto"><table class="w-full text-sm">' +
        '<thead class="bg-slate-100"><tr>' +
          '<th class="px-3 py-2.5 text-start font-semibold text-slate-700">שם הקמפיין</th>' +
          '<th class="px-3 py-2.5 text-start font-semibold text-slate-700">סטטוס</th>' +
          '<th class="px-3 py-2.5 text-end font-semibold text-slate-700">ספנד</th>' +
          '<th class="px-3 py-2.5 text-end font-semibold text-slate-700">לידים</th>' +
          '<th class="px-3 py-2.5 text-end font-semibold text-slate-700">קונים</th>' +
          '<th class="px-3 py-2.5 text-end font-semibold text-slate-700">הכנסות</th>' +
          '<th class="px-3 py-2.5 text-end font-semibold text-slate-700">CAC</th>' +
          '<th class="px-3 py-2.5 text-center font-semibold text-slate-700">החלטה</th>' +
        '</tr></thead><tbody>' +
          renderGroupRows('Live & Scaling', 'emerald', live) +
          renderGroupRows('Paused', 'amber', paused) +
          renderGroupRows('Stopped', 'rose', stopped) +
        '</tbody>' +
      '</table></div>' +
    '</div>';
  }

  function renderHeader() {
    return '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
      '<h2 class="text-lg font-semibold text-slate-700 flex items-center gap-2">📈 ביצועי קמפיינים</h2>' +
      '<div class="flex gap-2">' +
        '<button id="campaigns-settings-btn" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm flex items-center gap-1.5" title="Unit Economics">⚙️ הגדרות</button>' +
        '<button id="campaigns-refresh-btn" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">סנכרן</button>' +
      '</div>' +
    '</div>';
  }

  function renderEmpty() {
    return '<div class="bg-white border border-slate-200 rounded-xl p-12 text-center">' +
      '<div class="text-5xl mb-3">📊</div>' +
      '<h3 class="text-lg font-semibold text-slate-700 mb-1">אין קמפיינים עדיין</h3>' +
      '<p class="text-sm text-slate-500">הסנכרון מ-Facebook יתחיל בקרוב (כל 4 שעות)</p>' +
    '</div>';
  }

  async function loadCampaignsTab() {
    var panel = document.getElementById('tab-campaigns');
    if (!panel) return;
    panel.innerHTML = '<div class="text-slate-500 text-sm">טוען נתוני קמפיינים…</div>';
    try {
      var rows = await loadRows();
      var html = renderHeader();
      if (rows.length === 0) {
        html += renderEmpty();
      } else {
        var k = aggregateKpis(rows);
        html += '<div class="mb-5">' + renderKpiCards(k) + '</div>';
        html += renderTable(rows);
      }
      panel.innerHTML = html;

      // Wire interactions
      var rowEls = panel.querySelectorAll('tr[data-campaign-id]');
      rowEls.forEach(function (tr) {
        tr.addEventListener('click', function () {
          var cid = tr.getAttribute('data-campaign-id');
          var row = rows.find(function (r) { return String(r.campaign_id) === String(cid); });
          if (row && window.CrmCampaignsDetail && typeof CrmCampaignsDetail.open === 'function') {
            CrmCampaignsDetail.open(row);
          }
        });
      });
      var settingsBtn = document.getElementById('campaigns-settings-btn');
      if (settingsBtn) settingsBtn.addEventListener('click', function () {
        if (window.CrmUnitEconomicsModal && typeof CrmUnitEconomicsModal.open === 'function') {
          CrmUnitEconomicsModal.open(loadCampaignsTab);
        }
      });
      var refreshBtn = document.getElementById('campaigns-refresh-btn');
      if (refreshBtn) refreshBtn.addEventListener('click', loadCampaignsTab);
    } catch (e) {
      console.error('Campaigns tab load failed:', e);
      panel.innerHTML = '<div class="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4">' +
        'טעינת מסך הקמפיינים נכשלה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }

  window.loadCrmCampaignsTab = loadCampaignsTab;
  window.CrmCampaigns = { decision: decision, computeThresholds: function (gm, killMult, scaleMult) {
    return { kill: killMult * (gm / 100) * 1000, scale: scaleMult * (gm / 100) * 1000 };
  }};
})();
