/* =============================================================================
   crm-status-color-settings.js — Tenant-wide event-status color customization.
   Authored 2026-05-01 by PRE_CUTOVER_QA_C B10.

   Modal opened from the ⚙️ button in the events-tab toolbar (crm.html:284).
   Lists every event status (entity_type='event') with a native <input type=
   "color"> picker. Save → batch UPDATE crm_statuses.color for the active
   tenant + invalidates the CRM_STATUSES cache + re-renders the events tab
   so badges pick up the new colors without a page reload.

   No DDL — extends the existing crm_statuses.color column.
   No external library — uses the browser-native color picker.
   Tenant-wide setting (NOT per-user) per SPEC §7.

   Load order: AFTER crm-helpers.js (needs CrmHelpers.loadStatusCache + tid +
   toast), AFTER Modal. Wired from crm-events-tab.js when the gear button is
   clicked.
   Exports: window.CrmStatusColorSettings = { open }.
   ============================================================================= */
(function () {
  'use strict';

  function _statusEsc(s) { return window.escapeHtml ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }

  function _renderRows(rows) {
    return '<div class="space-y-2 max-h-[60vh] overflow-y-auto">' +
      rows.map(function (r) {
        return '<div class="flex items-center gap-3 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg" data-status-row data-status-id="' + _statusEsc(r.id) + '">' +
          '<input type="color" class="w-10 h-10 border border-slate-300 rounded cursor-pointer shrink-0" data-status-color value="' + _statusEsc(r.color || '#9ca3af') + '">' +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-semibold text-slate-800">' + _statusEsc(r.name_he || r.slug) + '</div>' +
            '<div class="text-xs text-slate-500 font-mono">' + _statusEsc(r.slug) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  async function _fetchEventStatuses() {
    var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tid) throw new Error('לא זוהה tenant');
    var res = await sb.from('crm_statuses')
      .select('id, slug, name_he, color, sort_order')
      .eq('tenant_id', tid)
      .eq('entity_type', 'event')
      .eq('is_active', true)
      .order('sort_order');
    if (res.error) throw new Error(res.error.message);
    return res.data || [];
  }

  async function _saveChanges(modal, originalRows) {
    var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tid) { if (window.Toast) Toast.error('לא זוהה tenant'); return; }
    var changed = [];
    modal.el.querySelectorAll('[data-status-row]').forEach(function (rowEl) {
      var id = rowEl.getAttribute('data-status-id');
      var newColor = (rowEl.querySelector('[data-status-color]') || {}).value;
      var orig = originalRows.find(function (r) { return r.id === id; });
      if (orig && newColor && newColor.toLowerCase() !== String(orig.color || '').toLowerCase()) {
        changed.push({ id: id, color: newColor });
      }
    });
    if (!changed.length) {
      if (window.Toast) Toast.info('לא בוצעו שינויים');
      if (modal.close) modal.close();
      return;
    }
    var saveBtn = modal.el.querySelector('#crm-status-colors-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'שומר...'; }
    var failed = 0;
    for (var i = 0; i < changed.length; i++) {
      var c = changed[i];
      var upd = await sb.from('crm_statuses').update({ color: c.color }).eq('id', c.id).eq('tenant_id', tid);
      if (upd.error) { console.error('crm_statuses color update:', upd.error); failed++; }
    }
    if (failed) {
      if (window.Toast) Toast.error(failed + ' מתוך ' + changed.length + ' עדכונים נכשלו');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'שמור'; }
      return;
    }
    if (window.CRM_STATUSES) window.CRM_STATUSES._loaded = false;
    if (window.CrmHelpers && CrmHelpers.loadStatusCache) {
      try { await CrmHelpers.loadStatusCache(); } catch (_) {}
    }
    if (window.Toast) Toast.success('צבעים עודכנו (' + changed.length + ')');
    if (modal.close) modal.close();
    if (typeof window.reloadCrmEventsTab === 'function') window.reloadCrmEventsTab();
  }

  async function open() {
    if (typeof Modal === 'undefined' || !Modal.show) return;
    var modal = Modal.show({
      title: 'ניהול צבעי סטטוס אירועים',
      size: 'md',
      content: '<div class="text-center text-slate-400 py-8">טוען...</div>',
      footer:
        '<button type="button" id="crm-status-colors-save" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-sm">שמור</button>' +
        '<button type="button" id="crm-status-colors-cancel" class="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition">ביטול</button>'
    });
    var body = modal.el.querySelector('.modal-body');
    var footer = modal.el.querySelector('.modal-footer');
    footer.querySelector('#crm-status-colors-cancel').addEventListener('click', function () { if (modal.close) modal.close(); });

    var rows;
    try { rows = await _fetchEventStatuses(); }
    catch (e) {
      body.innerHTML = '<div class="text-rose-600 py-4">שגיאה בטעינה: ' + _statusEsc(e.message) + '</div>';
      return;
    }
    if (!rows.length) {
      body.innerHTML = '<div class="text-amber-700 py-4">לא נמצאו סטטוסי אירוע פעילים.</div>';
      return;
    }
    body.innerHTML = _renderRows(rows);
    footer.querySelector('#crm-status-colors-save').addEventListener('click', function () { _saveChanges(modal, rows); });
  }

  window.CrmStatusColorSettings = { open: open };
})();
