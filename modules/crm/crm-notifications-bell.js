/* crm-notifications-bell.js — credit-expiry notifications bell (M4_ATTENDEE_PAYMENT_UI).
   Public API: window.CrmNotificationsBell.{render, countExpiring, refresh}.
   Renders a bell icon with a badge counter for leads whose credit_pending
   attendees have credit_expires_at within the next 30 days. Click → modal
   listing the leads, each row clickable to open the lead card. */
(function () {
  'use strict';

  var WINDOW_DAYS = 30;
  var _hostEl = null;
  var _cachedCount = null;

  function _esc(s) { return window.escapeHtml ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }

  // Returns an array of expiring rows: [{ attendee_id, lead_id, full_name, days_left, expires_at }, ...]
  // Sorted by days_left ascending (most urgent first). Limited to 50 rows.
  async function _fetchExpiringList() {
    var tid = getTenantId();
    if (!tid) return [];
    var now = new Date();
    var horizon = new Date(now.getTime() + WINDOW_DAYS * 86400000);
    var q = sb.from('crm_event_attendees')
      .select('id, lead_id, credit_expires_at')
      .eq('tenant_id', tid)
      .eq('payment_status', 'credit_pending')
      .eq('is_deleted', false)
      .lte('credit_expires_at', horizon.toISOString())
      .order('credit_expires_at', { ascending: true })
      .limit(50);
    var res = await q;
    if (res.error || !res.data || !res.data.length) return [];
    var leadIds = Array.from(new Set(res.data.map(function (r) { return r.lead_id; })));
    var leadsRes = await sb.from('crm_leads').select('id, full_name').in('id', leadIds);
    var nameMap = {};
    (leadsRes.data || []).forEach(function (l) { nameMap[l.id] = l.full_name || '—'; });
    return res.data.map(function (r) {
      var exp = new Date(r.credit_expires_at);
      var days = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000));
      return { attendee_id: r.id, lead_id: r.lead_id, full_name: nameMap[r.lead_id] || '—', days_left: days, expires_at: r.credit_expires_at };
    });
  }

  async function countExpiring() {
    var tid = getTenantId();
    if (!tid) return 0;
    var horizon = new Date(Date.now() + WINDOW_DAYS * 86400000);
    var res = await sb.from('crm_event_attendees')
      .select('lead_id', { count: 'exact', head: false })
      .eq('tenant_id', tid)
      .eq('payment_status', 'credit_pending')
      .eq('is_deleted', false)
      .lte('credit_expires_at', horizon.toISOString());
    if (res.error || !res.data) return 0;
    var unique = {};
    res.data.forEach(function (r) { unique[r.lead_id] = true; });
    return Object.keys(unique).length;
  }

  function _renderBellHTML(count) {
    var badgeHtml = (count > 0)
      ? '<span class="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">' + _esc(String(count)) + '</span>'
      : '';
    return '<button type="button" id="crm-bell-btn" class="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition" title="התראות תוקף קרדיטים">' +
      '<span class="text-xl">🔔</span>' + badgeHtml + '</button>';
  }

  async function render(hostEl) {
    if (!hostEl) return;
    _hostEl = hostEl;
    hostEl.innerHTML = _renderBellHTML(0);
    try {
      _cachedCount = await countExpiring();
      hostEl.innerHTML = _renderBellHTML(_cachedCount);
    } catch (e) { _cachedCount = 0; }
    var btn = hostEl.querySelector('#crm-bell-btn');
    if (btn) btn.addEventListener('click', _openModal);
  }

  async function _openModal() {
    var rows = [];
    try { rows = await _fetchExpiringList(); } catch (e) { /* fall through with empty */ }
    var rowsHtml = rows.length
      ? rows.map(function (r) {
          var dayClass = r.days_left <= 7 ? 'text-rose-600 font-bold' : (r.days_left <= 14 ? 'text-amber-600 font-semibold' : 'text-slate-600');
          return '<div class="flex items-center justify-between py-2 px-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer" data-bell-lead-id="' + _esc(r.lead_id) + '">' +
            '<div class="flex-1"><div class="font-semibold text-slate-800">' + _esc(r.full_name) + '</div>' +
            '<div class="text-xs text-slate-500">פג ב-' + _esc(new Date(r.expires_at).toLocaleDateString('he-IL')) + '</div></div>' +
            '<div class="' + dayClass + ' text-sm">' + r.days_left + ' ימים</div>' +
          '</div>';
        }).join('')
      : '<div class="text-center text-slate-400 py-8 text-sm">אין קרדיטים שעומדים לפוג</div>';
    var content = '<div class="max-h-[60vh] overflow-y-auto -mx-4">' + rowsHtml + '</div>';
    if (window.Modal && Modal.show) {
      var modal = Modal.show({ title: '🔔 קרדיטים שעומדים לפוג (30 ימים)', content: content, size: 'md' });
      setTimeout(function () {
        document.querySelectorAll('[data-bell-lead-id]').forEach(function (row) {
          row.addEventListener('click', function () {
            var leadId = row.getAttribute('data-bell-lead-id');
            if (modal && modal.close) modal.close();
            if (window.openCrmLeadDetail) { window.openCrmLeadDetail(leadId); }
            else if (window.CrmLeadActions && CrmLeadActions.openDetail) { CrmLeadActions.openDetail(leadId); }
          });
        });
      }, 50);
    }
  }

  async function refresh() {
    if (!_hostEl) return;
    try {
      _cachedCount = await countExpiring();
      _hostEl.innerHTML = _renderBellHTML(_cachedCount);
      var btn = _hostEl.querySelector('#crm-bell-btn');
      if (btn) btn.addEventListener('click', _openModal);
    } catch (e) { /* silent */ }
  }

  // Auto-render when host element exists and DOM is ready.
  function _autoBoot() {
    var host = document.getElementById('crm-notifications-bell');
    if (host) render(host);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoBoot);
  } else {
    setTimeout(_autoBoot, 100);
  }

  window.CrmNotificationsBell = { render: render, countExpiring: countExpiring, refresh: refresh };
})();
