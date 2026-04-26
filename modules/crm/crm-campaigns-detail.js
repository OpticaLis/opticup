/* =============================================================================
   crm-campaigns-detail.js — Drill-down modal for a single campaign row
   Opens with CrmCampaignsDetail.open(row) where row is a v_crm_campaign_performance row.
   Shows full metadata + KPIs + multiplier explanation.
   Load order: after shared.js, crm-campaigns.js. Uses Modal if available; else inline.
   ============================================================================= */
(function () {
  'use strict';

  function fmt(n) { return Number(n || 0).toLocaleString('he-IL'); }
  function money(n) { return '₪' + fmt(Math.round(Number(n) || 0)); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getDecision(row) {
    if (window.CrmCampaigns && typeof CrmCampaigns.decision === 'function') {
      return CrmCampaigns.decision(row);
    }
    return null;
  }

  function getThresholds(row) {
    var gm = Number(row.gross_margin_pct);
    var killM = Number(row.kill_multiplier);
    var scaleM = Number(row.scaling_multiplier);
    if (!isFinite(gm) || !isFinite(killM) || !isFinite(scaleM)) return null;
    return { kill: killM * (gm / 100) * 1000, scale: scaleM * (gm / 100) * 1000 };
  }

  function decisionColor(d) {
    if (d === 'SCALE') return 'emerald';
    if (d === 'STOP') return 'rose';
    if (d === 'TEST') return 'slate';
    return 'slate';
  }

  function decisionMsg(d) {
    return ({ SCALE: 'הגדל תקציב — ביצועים מצוינים', TEST: 'המשך לבדוק — לא ברור', STOP: 'עצור — שורף תקציב' })[d] || 'אין החלטה אוטומטית';
  }

  function buildHTML(row) {
    var d = getDecision(row);
    var color = decisionColor(d);
    var thresholds = getThresholds(row);
    var killStr = thresholds ? money(thresholds.kill) : '—';
    var scaleStr = thresholds ? money(thresholds.scale) : '—';
    var cac = Number(row.cac);
    var cacStr = isFinite(cac) && cac > 0 ? money(cac) : '—';
    var cpl = Number(row.cpl);
    var cplStr = isFinite(cpl) && cpl > 0 ? money(cpl) : '—';
    var conv = Number(row.leads_num) > 0 ? ((Number(row.buyers_num) / Number(row.leads_num)) * 100).toFixed(1) + '%' : '—';
    var aov = Number(row.buyers_num) > 0 ? money(Number(row.total_revenue) / Number(row.buyers_num)) : '—';

    var multExplain = thresholds ?
      '<div class="text-xs text-slate-500 mt-2 leading-relaxed">' +
        'Kill: ' + escapeHtml(row.kill_multiplier) + ' × ' + escapeHtml(row.gross_margin_pct) + '% × ₪1000 = <strong>' + killStr + '</strong>. ' +
        'Scale: ' + escapeHtml(row.scaling_multiplier) + ' × ' + escapeHtml(row.gross_margin_pct) + '% × ₪1000 = <strong>' + scaleStr + '</strong>.' +
      '</div>' : '<div class="text-xs text-slate-500 mt-2">לא הוגדרו thresholds עבור event_type זה.</div>';

    return '<div class="bg-' + color + '-600 text-white px-6 py-4 flex items-start justify-between">' +
        '<div>' +
          '<div class="text-xs uppercase tracking-wider opacity-90">' + (d || 'NO DECISION') + ' — ' + decisionMsg(d) + '</div>' +
          '<h3 class="text-lg font-bold mt-1">' + escapeHtml(row.name || '(ללא שם)') + '</h3>' +
          '<div class="text-sm opacity-90 mt-1">' + escapeHtml(row.event_type || '—') + ' · ' + escapeHtml(row.status || 'unknown') + '</div>' +
        '</div>' +
        '<button id="cce-close" class="text-white hover:bg-white/20 rounded-md p-1 text-xl leading-none w-8 h-8">×</button>' +
      '</div>' +
      '<div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">' +
        '<div class="grid grid-cols-3 gap-3">' +
          kpi('ספנד', money(row.total_spend), 'slate') +
          kpi('תקציב יומי', money(row.daily_budget), 'slate') +
          kpi('הכנסות', money(row.total_revenue), 'emerald') +
          kpi('CAC', cacStr, color) +
          kpi('CPL', cplStr, 'slate') +
          kpi('רווח גולמי', money(row.gross_profit), Number(row.gross_profit) >= 0 ? 'emerald' : 'rose') +
        '</div>' +
        '<div class="border-t pt-4">' +
          '<h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">פאנל לידים</h4>' +
          '<div class="grid grid-cols-3 gap-2 text-sm">' +
            kv('לידים', fmt(row.leads_num)) +
            kv('קונים', fmt(row.buyers_num)) +
            kv('המרה', conv) +
            kv('CPL', cplStr) +
            kv('CAC', cacStr) +
            kv('AOV', aov) +
          '</div>' +
        '</div>' +
        '<div class="border-t pt-4">' +
          '<h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Unit Economics — ' + escapeHtml(row.event_type || '—') + '</h4>' +
          '<div class="text-sm space-y-1">' +
            row3('Gross Margin', (row.gross_margin_pct ? Number(row.gross_margin_pct).toFixed(1) + '%' : '—')) +
            row3('Kill Multiplier', escapeHtml(row.kill_multiplier || '—'), '→ ' + killStr) +
            row3('Scaling Multiplier', escapeHtml(row.scaling_multiplier || '—'), '→ ' + scaleStr) +
            '<div class="flex justify-between border-t pt-1 mt-1"><span class="text-slate-700 font-medium">CAC נוכחי:</span><strong class="font-bold text-' + color + '-700">' + cacStr + '</strong></div>' +
          '</div>' +
          multExplain +
        '</div>' +
        '<div class="border-t pt-4">' +
          '<h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">מטא-דאטה מ-Facebook</h4>' +
          '<div class="text-sm space-y-1">' +
            kv('Campaign ID', escapeHtml(row.campaign_id || '—')) +
            kv('Master', escapeHtml(row.master || '—')) +
            kv('Interests', escapeHtml(row.interests || '—')) +
            kv('סנכרון אחרון', row.last_synced_at ? new Date(row.last_synced_at).toLocaleString('he-IL') : '—') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function kpi(label, val, color) {
    return '<div class="bg-' + color + '-50 rounded-lg p-3">' +
      '<div class="text-xs text-' + color + '-700">' + label + '</div>' +
      '<div class="text-xl font-bold text-' + color + '-800 mt-1" style="direction:ltr;">' + val + '</div>' +
    '</div>';
  }

  function kv(k, v) {
    return '<div><span class="text-slate-500">' + k + ':</span> <strong>' + v + '</strong></div>';
  }

  function row3(label, val, hint) {
    return '<div class="flex justify-between"><span class="text-slate-500">' + label + ':</span>' +
      '<strong>' + val + (hint ? ' <span class="text-xs text-slate-500 font-normal">' + hint + '</span>' : '') + '</strong></div>';
  }

  function open(row) {
    close();
    var modal = document.createElement('div');
    modal.id = 'cce-modal';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4';
    modal.style.background = 'rgba(15,23,42,0.6)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" id="cce-inner">' + buildHTML(row) + '</div>';
    document.body.appendChild(modal);
    document.getElementById('cce-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', escClose);
  }

  function close() {
    var m = document.getElementById('cce-modal');
    if (m) m.remove();
    document.removeEventListener('keydown', escClose);
  }

  function escClose(e) { if (e.key === 'Escape') close(); }

  window.CrmCampaignsDetail = { open: open, close: close };
})();
