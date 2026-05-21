/* =============================================================================
   crm-leads-bulk-actions.js — Bulk operations on selected leads in
   "לידים נכנסים". Source: M4_LEADS_BULK_APPROVE_TO_REGISTERED
   (Sprint 2 Item 3, 2026-05-21). Sequential per-lead loop reuses the
   existing CrmLeadActions.transferLeadToTier2 path so the same
   terms-approved gate + lead-status trigger + automation-engine dispatch
   chain fires (no SCE-firing or trigger semantics change).
   Exports window.CrmLeadsBulkActions.
   ============================================================================= */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function bulkApproveToTier2(leadIds) {
    if (!window.CrmLeadActions || typeof CrmLeadActions.transferLeadToTier2 !== 'function') {
      throw new Error('CrmLeadActions.transferLeadToTier2 not available');
    }
    var stats = { ok: 0, blocked_no_terms: 0, errors: [] };
    for (var i = 0; i < leadIds.length; i++) {
      var id = leadIds[i];
      try {
        var res = await CrmLeadActions.transferLeadToTier2(id);
        if (res && res.blocked) {
          stats.blocked_no_terms += 1;
        } else if (res && res.id) {
          stats.ok += 1;
          try {
            if (window.ActivityLog) ActivityLog.write({
              action: 'crm.lead.move_to_registered_bulk',
              entity_type: 'crm_leads',
              entity_id: id,
              details: { batch_size: leadIds.length }
            });
          } catch (_) {}
        } else {
          stats.errors.push({ id: id, msg: 'unknown response shape' });
        }
      } catch (err) {
        stats.errors.push({ id: id, msg: (err && err.message) || String(err) });
      }
    }
    return stats;
  }

  function showConfirmDialog(count, onYes) {
    var existing = document.getElementById('crm-bulk-confirm');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'crm-bulk-confirm';
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" dir="rtl">' +
        '<h3 class="text-lg font-bold text-slate-800 mb-2">אישור בכמות</h3>' +
        '<p class="text-sm text-slate-600 mb-1">לעבור ' + count + ' לידים למצב <b>רשום (Tier 2)</b>?</p>' +
        '<p class="text-xs text-slate-500 mb-4">לידים שלא אישרו תקנון ידולגו אוטומטית. כל ליד שיעבור יפעיל את כללי האוטומציה (status change → automation engine dispatch).</p>' +
        '<div class="flex gap-2 justify-end">' +
          '<button id="crm-bulk-cancel" type="button" class="px-4 py-2 rounded bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300">ביטול</button>' +
          '<button id="crm-bulk-confirm-btn" type="button" class="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">אשר ' + count + ' לידים</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('crm-bulk-cancel').addEventListener('click', function () { overlay.remove(); });
    document.getElementById('crm-bulk-confirm-btn').addEventListener('click', function () {
      overlay.remove();
      onYes();
    });
  }

  function showProgressOverlay(count) {
    var existing = document.getElementById('crm-bulk-progress');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'crm-bulk-progress';
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center" dir="rtl">' +
        '<div class="text-base font-semibold text-slate-800 mb-2">מעביר ' + count + ' לידים...</div>' +
        '<div class="text-sm text-slate-500">זה עשוי להימשך מספר שניות</div>' +
        '<div class="mt-3 text-xs text-slate-400">נא לא לסגור את הטאב</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  // Public entry point. ids: string[] (lead IDs). onDone: callback({ok, blocked_no_terms, errors[]}).
  function bulkApproveWithUx(ids, onDone) {
    if (!ids || !ids.length) {
      if (window.Toast) Toast.error('לא נבחרו לידים');
      return;
    }
    showConfirmDialog(ids.length, function () {
      var overlay = showProgressOverlay(ids.length);
      bulkApproveToTier2(ids).then(function (stats) {
        overlay.remove();
        var parts = ['הועברו ' + stats.ok + ' מתוך ' + ids.length];
        if (stats.blocked_no_terms > 0) parts.push(stats.blocked_no_terms + ' ידולגו (לא אישרו תקנון)');
        if (stats.errors.length > 0) parts.push(stats.errors.length + ' שגיאות');
        var msg = parts.join(' • ');
        if (window.Toast) {
          if (stats.ok === ids.length) Toast.success(msg);
          else if (stats.ok > 0) Toast.warning(msg);
          else Toast.error(msg);
        }
        if (typeof onDone === 'function') onDone(stats);
      }).catch(function (err) {
        overlay.remove();
        if (window.Toast) Toast.error('כשל בולק: ' + ((err && err.message) || String(err)));
      });
    });
  }

  // Wire bulk-select checkboxes + sticky action bar inside a host element.
  // host must contain #crm-incoming-bulk-bar + #crm-incoming-bulk-count +
  // #crm-incoming-bulk-approve + #crm-incoming-select-all + .crm-bulk-row-cb[]
  // (see crm-incoming-tab.js renderIncomingTable for the DOM contract).
  function wireBulkSelectUI(host, onReload) {
    if (!host) return;
    var selectAll = host.querySelector('#crm-incoming-select-all');
    var rowCbs = host.querySelectorAll('.crm-bulk-row-cb');
    var bar = host.querySelector('#crm-incoming-bulk-bar');
    var countEl = host.querySelector('#crm-incoming-bulk-count');
    var approveBtn = host.querySelector('#crm-incoming-bulk-approve');
    function refreshBar() {
      var checked = host.querySelectorAll('.crm-bulk-row-cb:checked');
      if (countEl) countEl.textContent = String(checked.length);
      if (bar) bar.classList.toggle('hidden', checked.length === 0);
      if (selectAll) selectAll.checked = checked.length > 0 && checked.length === rowCbs.length;
    }
    if (selectAll) selectAll.addEventListener('change', function () {
      var v = selectAll.checked;
      rowCbs.forEach(function (cb) { cb.checked = v; });
      refreshBar();
    });
    rowCbs.forEach(function (cb) {
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', refreshBar);
    });
    if (approveBtn) approveBtn.addEventListener('click', function () {
      var ids = Array.from(host.querySelectorAll('.crm-bulk-row-cb:checked')).map(function (cb) { return cb.getAttribute('data-bulk-lead-id'); });
      bulkApproveWithUx(ids, function () { if (typeof onReload === 'function') onReload(); });
    });
    refreshBar();
  }

  window.CrmLeadsBulkActions = {
    bulkApproveToTier2: bulkApproveToTier2,
    bulkApproveWithUx: bulkApproveWithUx,
    wireBulkSelectUI: wireBulkSelectUI
  };
})();
